-- ============================================================================
-- NiceThings — 011: profiles, reviews with a face, comments with a name
-- ============================================================================
-- Run once in the Supabase SQL editor (after 001 to 010). Safe to run again.
--
-- Anyone can make a profile: a unique @name, a face (a photo or a drawn
-- avatar), a neighbourhood, and a 6-digit PIN to come back from any phone.
-- With it they review places, comment under articles, photos and videos,
-- and like things in their own name.
--
-- Everything here is read and written by the site's server only (Row Level
-- Security on, no policy): the PIN's fingerprint, sessions and attempts never
-- leave the database, and the public key cannot write a review any more.
-- ============================================================================

create table if not exists nt_profiles (
    id uuid primary key default gen_random_uuid(),
    -- Order of arrival: member n° 1, 2, 3…
    member_no bigint generated always as identity,
    -- Their @name: unique, lower case, 3 to 20 letters, digits, "." or "_".
    handle text not null,
    name text,
    bio text,
    -- A drawn avatar ("pp.k3j9x2.1.4", lib/people/avatars.ts) or a photo.
    avatar text,
    photo_path text,
    city text,
    area text,
    -- Their three favourite places (slugs), shown on their page.
    top_places text[] not null default '{}',
    role text not null default 'member',
    -- scrypt fingerprints, never the PIN or the rescue code themselves.
    pin_hash text not null,
    recovery_hash text,
    failed_pins integer not null default 0,
    locked_until timestamptz,
    status text not null default 'ACTIVE',
    first_visitor uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    constraint nt_profiles_handle_format check (handle ~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$'),
    constraint nt_profiles_name_length check (name is null or char_length(name) <= 40),
    constraint nt_profiles_bio_length check (bio is null or char_length(bio) <= 160),
    constraint nt_profiles_role_check check (role in ('member', 'team', 'founder')),
    constraint nt_profiles_status_check check (status in ('ACTIVE', 'SUSPENDED')),
    constraint nt_profiles_top_check check (cardinality(top_places) <= 3)
);

create unique index if not exists nt_profiles_handle_key on nt_profiles (handle);
create unique index if not exists nt_profiles_member_no_key on nt_profiles (member_no);

-- One line per phone that is signed in. The cookie holds a random token;
-- only its SHA-256 is kept here.
create table if not exists nt_profile_sessions (
    token_hash text primary key,
    profile_id uuid not null references nt_profiles (id) on delete cascade,
    device text,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);

create index if not exists nt_profile_sessions_profile_idx on nt_profile_sessions (profile_id);

-- Every PIN tried, by a salted fingerprint of the connection, so nobody
-- can try PINs on many names from the same place.
create table if not exists nt_login_attempts (
    id bigint generated always as identity primary key,
    ip_hash text not null,
    handle text,
    ok boolean not null default false,
    at timestamptz not null default now()
);

create index if not exists nt_login_attempts_ip_idx on nt_login_attempts (ip_hash, at desc);

-- ---------------------------------------------------------------------------
-- Reviews: the table from 001 gets a face, words that matter here, and
-- moderation. One review per person and place; writing again edits it.
-- ---------------------------------------------------------------------------

alter table nt_reviews alter column visitor_id drop not null;
alter table nt_reviews add column if not exists profile_id uuid references nt_profiles (id) on delete cascade;
alter table nt_reviews add column if not exists tags text[] not null default '{}';
alter table nt_reviews add column if not exists price_paid integer;
alter table nt_reviews add column if not exists company text;
alter table nt_reviews add column if not exists status text not null default 'PUBLISHED';
alter table nt_reviews add column if not exists helpful integer not null default 0;
alter table nt_reviews add column if not exists replies integer not null default 0;
alter table nt_reviews add column if not exists reports integer not null default 0;
alter table nt_reviews add column if not exists updated_at timestamptz not null default now();

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'nt_reviews_status_check') then
        alter table nt_reviews add constraint nt_reviews_status_check check (status in ('PUBLISHED', 'PENDING', 'HIDDEN'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'nt_reviews_price_paid_check') then
        alter table nt_reviews add constraint nt_reviews_price_paid_check check (price_paid is null or (price_paid >= 0 and price_paid <= 1000000));
    end if;
end $$;

create unique index if not exists nt_reviews_profile_spot_key on nt_reviews (profile_id, spot_id);
create index if not exists nt_reviews_profile_idx on nt_reviews (profile_id, created_at desc);

-- A place's mark counts published reviews only.
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
        rating = coalesce((select round(avg(rating)::numeric, 1) from nt_reviews where spot_id = target and status = 'PUBLISHED'), 0),
        review_count = (select count(*) from nt_reviews where spot_id = target and status = 'PUBLISHED')
    where id = target;
    return null;
end;
$$;

-- The public key could write and erase reviews (001): reviews now go
-- through the server, signed by a profile.
drop policy if exists "Visitors write reviews" on nt_reviews;
drop policy if exists "Visitors update reviews" on nt_reviews;
drop policy if exists "Visitors delete reviews" on nt_reviews;
drop policy if exists "Reviews are public" on nt_reviews;

-- "Validé !": someone found a review useful. One per person and review.
create table if not exists nt_review_votes (
    review_id uuid not null references nt_reviews (id) on delete cascade,
    profile_id uuid not null references nt_profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (review_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- Comments with a name: under an article (and a guest's notebook), under a
-- photo or video of a wall, and in answer to a review.
-- ---------------------------------------------------------------------------

create table if not exists nt_comments (
    id uuid primary key default gen_random_uuid(),
    target text not null check (target in ('article', 'wall', 'review')),
    target_id uuid not null,
    profile_id uuid not null references nt_profiles (id) on delete cascade,
    body text not null check (char_length(body) between 1 and 600),
    -- PENDING when it carries a link or a phone number: the team reads those first.
    status text not null default 'PUBLISHED' check (status in ('PUBLISHED', 'PENDING', 'HIDDEN')),
    reports integer not null default 0,
    created_at timestamptz not null default now(),
    edited_at timestamptz
);

create index if not exists nt_comments_target_idx on nt_comments (target, target_id, status, created_at);
create index if not exists nt_comments_profile_idx on nt_comments (profile_id, created_at desc);

-- "Signaler": one flag per person and thing; three hide it until the team looks.
create table if not exists nt_flags (
    kind text not null check (kind in ('comment', 'review', 'profile')),
    item_id uuid not null,
    reporter text not null,
    reason text,
    created_at timestamptz not null default now(),
    primary key (kind, item_id, reporter)
);

-- ---------------------------------------------------------------------------
-- The walls: who sent a photo or video, who liked it, how many comments.
-- A like given while signed in is keyed on the profile, so it is one per
-- person whatever the phone.
-- ---------------------------------------------------------------------------

alter table nt_spot_posts add column if not exists profile_id uuid references nt_profiles (id) on delete set null;
alter table nt_spot_posts add column if not exists comments integer not null default 0;
alter table nt_post_likes add column if not exists profile_id uuid references nt_profiles (id) on delete cascade;
create index if not exists nt_spot_posts_profile_idx on nt_spot_posts (profile_id);
create index if not exists nt_post_likes_profile_idx on nt_post_likes (profile_id);

-- Saved places follow the profile from one phone to another.
create table if not exists nt_profile_saves (
    profile_id uuid not null references nt_profiles (id) on delete cascade,
    slug text not null,
    created_at timestamptz not null default now(),
    primary key (profile_id, slug)
);

-- What a profile has given, for its level ("Nouveau" → "Légende").
create or replace view nt_profile_stats with (security_invoker = true) as
select
    p.id,
    (select count(*) from nt_reviews r where r.profile_id = p.id and r.status = 'PUBLISHED')::int as reviews,
    (select count(*) from nt_spot_posts s where s.profile_id = p.id and s.status = 'APPROVED')::int as photos,
    (select count(*) from nt_comments c where c.profile_id = p.id and c.status = 'PUBLISHED')::int as comments,
    (
        coalesce((select sum(s.likes) from nt_spot_posts s where s.profile_id = p.id and s.status = 'APPROVED'), 0)
        + coalesce((select sum(r.helpful) from nt_reviews r where r.profile_id = p.id and r.status = 'PUBLISHED'), 0)
    )::int as cheers
from nt_profiles p;

alter table nt_profiles enable row level security;
alter table nt_profile_sessions enable row level security;
alter table nt_login_attempts enable row level security;
alter table nt_review_votes enable row level security;
alter table nt_comments enable row level security;
alter table nt_flags enable row level security;
alter table nt_profile_saves enable row level security;

-- Profile photos: public pictures, put there by the server only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profiles', 'profiles', true, 1048576, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;
