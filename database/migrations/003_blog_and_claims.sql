-- NiceThings — blog, place claims and owner accounts
-- Run once in the Supabase SQL editor, after 002_analytics.sql.
-- Safe to run again.
--
-- Security model (same as before): every write goes through Next.js API
-- routes that check who is asking, then use the server-only service role.
-- The public key may only READ published articles. Claims, owners, proofs
-- and the change log have no public policy at all: nobody but the server
-- can read or write them.

-- ---------------------------------------------------------------------------
-- Blog
-- ---------------------------------------------------------------------------

create table if not exists nt_posts (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED')),

    -- French first; the English version is optional.
    title_fr text not null,
    title_en text,
    excerpt_fr text,
    excerpt_en text,
    -- The article as a list of blocks (paragraph, heading, image, place…),
    -- see lib/blog/blocks.ts. Never raw HTML.
    body_fr jsonb not null default '[]',
    body_en jsonb not null default '[]',

    cover_url text,
    cover_alt text,
    topic text not null default 'guide',
    city text,                       -- city slug, when the article is about one city
    tags text[] not null default '{}',
    places text[] not null default '{}', -- slugs of the places shown in the article
    author text not null default 'L''équipe NiceThings',
    reading_minutes integer not null default 1,
    featured boolean not null default false,

    -- A future date means "scheduled": hidden until then.
    published_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists nt_posts_published_idx on nt_posts (status, published_at desc);
create index if not exists nt_posts_places_idx on nt_posts using gin (places);

drop trigger if exists nt_posts_touch on nt_posts;
create trigger nt_posts_touch
    before update on nt_posts
    for each row execute function nt_touch_updated_at();

alter table nt_posts enable row level security;

drop policy if exists "Published posts are public" on nt_posts;
create policy "Published posts are public"
    on nt_posts for select
    using (status = 'PUBLISHED' and published_at is not null and published_at <= now());

grant select on nt_posts to anon, authenticated;
grant all on nt_posts to service_role;

-- ---------------------------------------------------------------------------
-- Claims: someone (signed in with Google) says "this place is mine" and
-- brings proofs. The team decides; every step is written to nt_claim_events.
-- ---------------------------------------------------------------------------

create table if not exists nt_claims (
    id uuid primary key default gen_random_uuid(),
    spot_id uuid not null references nt_spots (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    user_email text,
    status text not null default 'DRAFT'
        check (status in ('DRAFT', 'PENDING', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'WITHDRAWN')),

    -- Who is claiming
    full_name text not null,
    role text not null default 'OWNER' check (role in ('OWNER', 'MANAGER')),
    phone text not null,
    statement_accepted_at timestamptz,

    -- Short public code (NT-7KQ4…) written on the storefront photo and put
    -- on the official page, so old photos and borrowed accounts don't work.
    code text not null,

    -- Proof 1: a code sent to the phone number already on the listing.
    listing_phone text,
    phone_code_secret text,  -- the code, encrypted: only the team console can read it
    phone_code_requested_at timestamptz,
    phone_code_sent_at timestamptz,
    phone_code_attempts integer not null default 0,
    phone_verified_at timestamptz,

    -- Proof 2: standing at the place when asked.
    onsite_lat double precision,
    onsite_lng double precision,
    onsite_accuracy integer,
    onsite_distance_m integer,
    onsite_at timestamptz,

    -- Proof 3: private files (storefront photo with the code, business
    -- papers, ID) in the private "claim-proofs" bucket:
    -- [{ "kind": "storefront" | "business" | "id" | "other", "path": "...", "type": "image/jpeg", "at": "..." }]
    documents jsonb not null default '[]',
    documents_checked_at timestamptz,
    documents_purged_at timestamptz,

    -- Proof 4: the business's official page showing the code.
    social_url text,
    social_verified_at timestamptz,

    -- Proof 5: a NiceThings team member checked in person.
    field_visit_at timestamptz,
    field_visit_note text,

    -- Automatic assessment, refreshed at each step (lib/claims/score.ts).
    trust_score integer not null default 0,
    risk_flags jsonb not null default '[]',
    client_hash text, -- salted hash of IP + browser, to spot one person claiming many places

    message_to_owner text,
    review_note text,
    decided_at timestamptz,
    decided_by text,
    submitted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists nt_claims_status_idx on nt_claims (status, created_at desc);
create index if not exists nt_claims_spot_idx on nt_claims (spot_id);
create index if not exists nt_claims_user_idx on nt_claims (user_id);
create index if not exists nt_claims_client_idx on nt_claims (client_hash);
-- One open claim per person and place.
create unique index if not exists nt_claims_one_open_idx
    on nt_claims (spot_id, user_id)
    where status in ('DRAFT', 'PENDING', 'NEEDS_INFO');

drop trigger if exists nt_claims_touch on nt_claims;
create trigger nt_claims_touch
    before update on nt_claims
    for each row execute function nt_touch_updated_at();

create table if not exists nt_claim_events (
    id bigint generated always as identity primary key,
    claim_id uuid not null references nt_claims (id) on delete cascade,
    actor text not null check (actor in ('owner', 'team', 'system')),
    action text not null,
    detail jsonb not null default '{}',
    created_at timestamptz not null default now()
);

create index if not exists nt_claim_events_claim_idx on nt_claim_events (claim_id, created_at);

-- ---------------------------------------------------------------------------
-- Owners: who may manage which place, after an approved claim.
-- ---------------------------------------------------------------------------

create table if not exists nt_place_owners (
    id uuid primary key default gen_random_uuid(),
    spot_id uuid not null references nt_spots (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    role text not null default 'OWNER' check (role in ('OWNER', 'MANAGER')),
    claim_id uuid references nt_claims (id) on delete set null,
    created_at timestamptz not null default now(),
    revoked_at timestamptz,
    revoked_reason text
);

create unique index if not exists nt_place_owners_active_idx
    on nt_place_owners (spot_id, user_id)
    where revoked_at is null;
create index if not exists nt_place_owners_user_idx on nt_place_owners (user_id) where revoked_at is null;

-- Every change an owner makes, with the value before and after, so the
-- team can see and undo anything.
create table if not exists nt_spot_changes (
    id bigint generated always as identity primary key,
    spot_id uuid not null references nt_spots (id) on delete cascade,
    user_id uuid references auth.users (id) on delete set null,
    field text not null,
    old_value jsonb,
    new_value jsonb,
    status text not null default 'APPLIED' check (status in ('APPLIED', 'PENDING', 'REJECTED', 'REVERTED')),
    created_at timestamptz not null default now()
);

create index if not exists nt_spot_changes_spot_idx on nt_spot_changes (spot_id, created_at desc);
create index if not exists nt_spot_changes_pending_idx on nt_spot_changes (status) where status = 'PENDING';

alter table nt_spots add column if not exists claimed boolean not null default false;

-- Server only: row level security on, and no policy for the public key.
alter table nt_claims enable row level security;
alter table nt_claim_events enable row level security;
alter table nt_place_owners enable row level security;
alter table nt_spot_changes enable row level security;

grant all on nt_claims, nt_claim_events, nt_place_owners, nt_spot_changes to service_role;

-- ---------------------------------------------------------------------------
-- Storage: public bucket for article images, PRIVATE bucket for proofs.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('claim-proofs', 'claim-proofs', false, 10485760)
on conflict (id) do update set public = false;

notify pgrst, 'reload schema';
