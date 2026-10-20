-- ============================================================================
-- NiceThings — 013: "Ma sortie", "Suivre" and verified profiles
-- ============================================================================
-- Run once in the Supabase SQL editor (after 012). Safe to run again.
--
-- A member posts an outing: always at a real place, with up to four photos
-- or one short video, the mood, what they paid, who they were with, a line.
-- New members' outings wait for the team; from "Habitué" on they go online
-- at once. Members follow each other, and see their friends' outings.
-- A profile can be verified, like on Instagram: by the team, on request or
-- not; the founder and the team are verified by their role.
-- Read and written by the site's server only (RLS on, no policy). The files
-- go to the "spot-posts" bucket, under "outings/".
-- ============================================================================

create table if not exists nt_outings (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references nt_profiles (id) on delete cascade,
    spot_id uuid not null references nt_spots (id) on delete cascade,
    mood text,
    price_paid integer check (price_paid is null or (price_paid >= 0 and price_paid <= 1000000)),
    company text,
    body text check (body is null or char_length(body) <= 280),
    -- DRAFT while its files are on their way; PENDING when the team reads it first.
    status text not null default 'DRAFT' check (status in ('DRAFT', 'PENDING', 'PUBLISHED', 'HIDDEN')),
    likes integer not null default 0,
    comments integer not null default 0,
    goers integer not null default 0,
    reports integer not null default 0,
    created_at timestamptz not null default now(),
    published_at timestamptz
);

create index if not exists nt_outings_feed_idx on nt_outings (status, published_at desc);
create index if not exists nt_outings_profile_idx on nt_outings (profile_id, created_at desc);
create index if not exists nt_outings_spot_idx on nt_outings (spot_id, status, published_at desc);

create table if not exists nt_outing_media (
    id uuid primary key default gen_random_uuid(),
    outing_id uuid not null references nt_outings (id) on delete cascade,
    kind text not null check (kind in ('photo', 'video')),
    media_path text not null,
    poster_path text,
    width integer,
    height integer,
    duration numeric(6, 1),
    sort integer not null default 0
);

create index if not exists nt_outing_media_outing_idx on nt_outing_media (outing_id, sort);

create table if not exists nt_outing_likes (
    outing_id uuid not null references nt_outings (id) on delete cascade,
    profile_id uuid not null references nt_profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (outing_id, profile_id)
);

-- "J'y vais aussi".
create table if not exists nt_outing_goers (
    outing_id uuid not null references nt_outings (id) on delete cascade,
    profile_id uuid not null references nt_profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (outing_id, profile_id)
);

create table if not exists nt_follows (
    follower_id uuid not null references nt_profiles (id) on delete cascade,
    followed_id uuid not null references nt_profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (follower_id, followed_id),
    check (follower_id <> followed_id)
);

create index if not exists nt_follows_followed_idx on nt_follows (followed_id, created_at desc);

-- Verified profiles: who the team verified, when, and what they are known
-- as ("Créateur de contenu", "Établissement"…). The founder and the team
-- are verified by their role, whatever this says.
alter table nt_profiles add column if not exists verified boolean not null default false;
alter table nt_profiles add column if not exists verified_at timestamptz;
alter table nt_profiles add column if not exists verified_label text check (verified_label is null or char_length(verified_label) <= 40);

-- "Demander la vérification": who they are, a link that proves it, a word.
create table if not exists nt_verify_requests (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references nt_profiles (id) on delete cascade,
    kind text not null check (kind in ('creator', 'business', 'public', 'other')),
    link text check (link is null or char_length(link) <= 200),
    note text check (note is null or char_length(note) <= 300),
    status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'DECLINED')),
    created_at timestamptz not null default now(),
    decided_at timestamptz
);

create unique index if not exists nt_verify_requests_open_key on nt_verify_requests (profile_id) where status = 'PENDING';

-- Comments under an outing; Activité for follows, likes, "j'y vais", approvals.
alter table nt_comments drop constraint if exists nt_comments_target_check;
alter table nt_comments add constraint nt_comments_target_check check (target in ('article', 'wall', 'review', 'outing'));
alter table nt_notices drop constraint if exists nt_notices_kind_check;
alter table nt_notices add constraint nt_notices_kind_check check (kind in ('vote', 'reply', 'comment', 'like', 'tip_vote', 'level', 'follow', 'going', 'outing_like', 'outing_comment', 'approved', 'verified'));
alter table nt_flags drop constraint if exists nt_flags_kind_check;
alter table nt_flags add constraint nt_flags_kind_check check (kind in ('comment', 'review', 'profile', 'tip', 'outing'));

-- What a member gave, now with their outings and who follows them
-- (points: an outing 8; each like on it counts like any like).
create or replace view nt_profile_stats with (security_invoker = true) as
select
    p.id,
    (select count(*) from nt_reviews r where r.profile_id = p.id and r.status = 'PUBLISHED')::int as reviews,
    (select count(*) from nt_spot_posts s where s.profile_id = p.id and s.status = 'APPROVED')::int as photos,
    (select count(*) from nt_comments c where c.profile_id = p.id and c.status = 'PUBLISHED')::int as comments,
    (
        coalesce((select sum(s.likes) from nt_spot_posts s where s.profile_id = p.id and s.status = 'APPROVED'), 0)
        + coalesce((select sum(r.helpful) from nt_reviews r where r.profile_id = p.id and r.status = 'PUBLISHED'), 0)
        + coalesce((select sum(t.helpful) from nt_place_tips t where t.profile_id = p.id and t.status = 'PUBLISHED'), 0)
        + coalesce((select sum(o.likes) from nt_outings o where o.profile_id = p.id and o.status = 'PUBLISHED'), 0)
    )::int as cheers,
    (select count(*) from nt_place_tips t where t.profile_id = p.id and t.status = 'PUBLISHED')::int as tips,
    (select count(*) from nt_place_pulses u where u.profile_id = p.id)::int as pulses,
    (select count(*) from nt_outings o where o.profile_id = p.id and o.status = 'PUBLISHED')::int as outings,
    (select count(*) from nt_follows f where f.followed_id = p.id)::int as followers,
    (select count(*) from nt_follows f where f.follower_id = p.id)::int as following,
    (p.verified or p.role in ('team', 'founder')) as verified,
    p.verified_label
from nt_profiles p;

alter table nt_outings enable row level security;
alter table nt_outing_media enable row level security;
alter table nt_outing_likes enable row level security;
alter table nt_outing_goers enable row level security;
alter table nt_follows enable row level security;
alter table nt_verify_requests enable row level security;
