-- NiceThings — initial schema
-- Run this once in the Supabase SQL editor of a fresh project.
--
-- Security model:
--   * The browser uses the public "anon" key. It may READ approved places and
--     WRITE only visitor-generated content (saves, submissions, reviews,
--     reports). It can never approve, edit or delete places.
--   * All admin writes go through Next.js API routes that check the admin
--     session and use the server-only SUPABASE_SERVICE_ROLE_KEY, which
--     bypasses RLS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function nt_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Visitors (anonymous, identified by a random UUID kept in localStorage)
-- ---------------------------------------------------------------------------

create table if not exists nt_visitors (
    id uuid primary key,
    preferred_language text not null default 'fr'
        check (preferred_language in ('en', 'fr')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger nt_visitors_touch
    before update on nt_visitors
    for each row execute function nt_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Places
-- ---------------------------------------------------------------------------

create table if not exists nt_spots (
    id uuid primary key default gen_random_uuid(),
    slug text unique,
    name text not null,
    description text,

    -- What it is
    category text not null default 'Other',
    cuisine text,

    -- Where it is. "landmark" is how people in Yaoundé actually give
    -- directions: "Derrière Total Bastos, en face de la pharmacie".
    city text not null default 'Yaoundé',
    neighborhood text,
    address text,
    landmark text,
    latitude double precision,
    longitude double precision,

    -- How to reach them
    phone text,
    whatsapp text,
    website text,
    instagram text,

    -- What it costs, per person, in FCFA
    currency text not null default 'XAF',
    average_price integer check (average_price is null or average_price >= 0),
    minimum_price integer check (minimum_price is null or minimum_price >= 0),
    maximum_price integer check (maximum_price is null or maximum_price >= 0),

    -- When it is open
    opening_time time,
    closing_time time,
    monday_open boolean not null default true,
    tuesday_open boolean not null default true,
    wednesday_open boolean not null default true,
    thursday_open boolean not null default true,
    friday_open boolean not null default true,
    saturday_open boolean not null default true,
    sunday_open boolean not null default true,

    -- What it feels like and what it is good for. Values come from the
    -- fixed vocabularies in lib/tags; kept as text[] so they are easy to
    -- filter with the && (overlap) operator.
    vibes text[] not null default '{}',
    good_for text[] not null default '{}',
    amenities text[] not null default '{}',

    -- Reputation (maintained by the nt_reviews trigger below)
    rating numeric(2, 1) not null default 0,
    review_count integer not null default 0,

    -- Moderation
    status text not null default 'DRAFT'
        check (status in ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CLOSED')),
    verified boolean not null default false,
    featured boolean not null default false,
    last_verified_at timestamptz,

    -- Provenance: 'field' (added in person), 'osm' (OpenStreetMap import),
    -- 'submission' (sent by a visitor)
    source text not null default 'field',
    source_ref text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists nt_spots_status_idx on nt_spots (status);
create index if not exists nt_spots_neighborhood_idx on nt_spots (neighborhood);
create index if not exists nt_spots_category_idx on nt_spots (category);
create index if not exists nt_spots_vibes_idx on nt_spots using gin (vibes);
create index if not exists nt_spots_good_for_idx on nt_spots using gin (good_for);
create unique index if not exists nt_spots_source_ref_idx
    on nt_spots (source, source_ref) where source_ref is not null;

create trigger nt_spots_touch
    before update on nt_spots
    for each row execute function nt_touch_updated_at();

create table if not exists nt_spot_photos (
    id uuid primary key default gen_random_uuid(),
    spot_id uuid not null references nt_spots (id) on delete cascade,
    image_url text not null,
    alt_text text,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists nt_spot_photos_spot_idx on nt_spot_photos (spot_id, sort_order);

create table if not exists nt_spot_menu (
    id uuid primary key default gen_random_uuid(),
    spot_id uuid not null references nt_spots (id) on delete cascade,
    name text not null,
    description text,
    price integer not null check (price >= 0),
    currency text not null default 'XAF',
    popular boolean not null default false,
    available boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists nt_spot_menu_spot_idx on nt_spot_menu (spot_id);

-- ---------------------------------------------------------------------------
-- Visitor activity
-- ---------------------------------------------------------------------------

create table if not exists nt_saved_spots (
    id uuid primary key default gen_random_uuid(),
    visitor_id uuid not null references nt_visitors (id) on delete cascade,
    spot_id uuid not null references nt_spots (id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (visitor_id, spot_id)
);

create table if not exists nt_arrivals (
    id uuid primary key default gen_random_uuid(),
    visitor_id uuid not null references nt_visitors (id) on delete cascade,
    spot_id uuid not null references nt_spots (id) on delete cascade,
    created_at timestamptz not null default now()
);

create table if not exists nt_reviews (
    id uuid primary key default gen_random_uuid(),
    visitor_id uuid not null references nt_visitors (id) on delete cascade,
    spot_id uuid not null references nt_spots (id) on delete cascade,
    arrival_id uuid references nt_arrivals (id) on delete set null,
    rating integer not null check (rating between 1 and 5),
    comment text check (comment is null or char_length(comment) <= 1000),
    price_accurate boolean,
    location_accurate boolean,
    created_at timestamptz not null default now(),
    -- One review per visitor per place; a new one replaces the old one.
    unique (visitor_id, spot_id)
);

create index if not exists nt_reviews_spot_idx on nt_reviews (spot_id, created_at desc);

create or replace function nt_refresh_spot_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    target uuid := coalesce(new.spot_id, old.spot_id);
begin
    update nt_spots
    set
        rating = coalesce(
            (select round(avg(rating)::numeric, 1) from nt_reviews where spot_id = target),
            0
        ),
        review_count = (select count(*) from nt_reviews where spot_id = target)
    where id = target;
    return null;
end;
$$;

create trigger nt_reviews_refresh_rating
    after insert or update or delete on nt_reviews
    for each row execute function nt_refresh_spot_rating();

create table if not exists nt_reports (
    id uuid primary key default gen_random_uuid(),
    visitor_id uuid references nt_visitors (id) on delete set null,
    spot_id uuid references nt_spots (id) on delete cascade,
    reason text not null,
    description text check (description is null or char_length(description) <= 1000),
    status text not null default 'PENDING'
        check (status in ('PENDING', 'RESOLVED', 'REJECTED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger nt_reports_touch
    before update on nt_reports
    for each row execute function nt_touch_updated_at();

create table if not exists nt_spot_submissions (
    id uuid primary key default gen_random_uuid(),
    visitor_id uuid references nt_visitors (id) on delete set null,
    name text not null,
    description text,
    category text,
    cuisine text,
    city text default 'Yaoundé',
    neighborhood text,
    address text,
    landmark text,
    latitude double precision,
    longitude double precision,
    phone text,
    whatsapp text,
    website text,
    status text not null default 'PENDING'
        check (status in ('PENDING', 'APPROVED', 'REJECTED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger nt_spot_submissions_touch
    before update on nt_spot_submissions
    for each row execute function nt_touch_updated_at();

create table if not exists nt_consents (
    id uuid primary key default gen_random_uuid(),
    visitor_id uuid references nt_visitors (id) on delete cascade,
    privacy boolean not null default false,
    location boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists nt_searches (
    id uuid primary key default gen_random_uuid(),
    visitor_id uuid references nt_visitors (id) on delete set null,
    query text,
    filters jsonb not null default '{}',
    result_count integer,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table nt_visitors enable row level security;
alter table nt_spots enable row level security;
alter table nt_spot_photos enable row level security;
alter table nt_spot_menu enable row level security;
alter table nt_saved_spots enable row level security;
alter table nt_arrivals enable row level security;
alter table nt_reviews enable row level security;
alter table nt_reports enable row level security;
alter table nt_spot_submissions enable row level security;
alter table nt_consents enable row level security;
alter table nt_searches enable row level security;

-- Public catalogue: only approved places and their photos/menus are visible.
create policy "Approved spots are public"
    on nt_spots for select
    using (status = 'APPROVED');

create policy "Photos of approved spots are public"
    on nt_spot_photos for select
    using (exists (select 1 from nt_spots s where s.id = spot_id and s.status = 'APPROVED'));

create policy "Menus of approved spots are public"
    on nt_spot_menu for select
    using (exists (select 1 from nt_spots s where s.id = spot_id and s.status = 'APPROVED'));

create policy "Reviews are public"
    on nt_reviews for select
    using (true);

-- Visitors. Identity is an unguessable UUID held by the device; there is no
-- login, so these policies cannot prove ownership. They are limited to
-- low-value, visitor-owned rows and never touch the catalogue.
create policy "Visitors can register"
    on nt_visitors for insert
    with check (true);

create policy "Visitors can read their row"
    on nt_visitors for select
    using (true);

create policy "Visitors can update their language"
    on nt_visitors for update
    using (true)
    with check (true);

create policy "Visitors manage saved spots"
    on nt_saved_spots for all
    using (true)
    with check (true);

create policy "Visitors record arrivals"
    on nt_arrivals for all
    using (true)
    with check (true);

create policy "Visitors write reviews"
    on nt_reviews for insert
    with check (true);

create policy "Visitors update reviews"
    on nt_reviews for update
    using (true)
    with check (true);

create policy "Visitors delete reviews"
    on nt_reviews for delete
    using (true);

-- Write-only inboxes: visitors can send, only the admin (service role) reads.
create policy "Anyone can submit a place"
    on nt_spot_submissions for insert
    with check (status = 'PENDING');

create policy "Anyone can report a problem"
    on nt_reports for insert
    with check (status = 'PENDING');

create policy "Anyone can record consent"
    on nt_consents for insert
    with check (true);

create policy "Anyone can log a search"
    on nt_searches for insert
    with check (true);

-- ---------------------------------------------------------------------------
-- Storage: public bucket for place photos. Uploads go through the admin API.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('spot-photos', 'spot-photos', true)
on conflict (id) do nothing;
