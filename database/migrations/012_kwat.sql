-- ============================================================================
-- NiceThings — 012: "Dis au taxi", live status, contacts, Activité
-- ============================================================================
-- Run once in the Supabase SQL editor (after 011). Safe to run again.
--
-- What members add to a place besides reviews: the sentence to tell the
-- taxi driver and the way in words; what is happening there right now
-- (open, closed, lively, a power cut…). The messages and calls a place gets
-- through NiceThings, counted for its owner. And each member's Activité:
-- who validated, answered, liked, and the levels they reach.
-- Read and written by the site's server only (RLS on, no policy).
-- ============================================================================

-- The way to a place, by those who went: "taxi" is the sentence for the
-- driver, "way" the path in words. One of each per member and place.
create table if not exists nt_place_tips (
    id uuid primary key default gen_random_uuid(),
    spot_id uuid not null references nt_spots (id) on delete cascade,
    profile_id uuid not null references nt_profiles (id) on delete cascade,
    kind text not null check (kind in ('taxi', 'way')),
    body text not null check (char_length(body) between 4 and 400),
    helpful integer not null default 0,
    status text not null default 'PUBLISHED' check (status in ('PUBLISHED', 'PENDING', 'HIDDEN')),
    reports integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists nt_place_tips_one_key on nt_place_tips (spot_id, profile_id, kind);
create index if not exists nt_place_tips_spot_idx on nt_place_tips (spot_id, status, helpful desc);

create table if not exists nt_tip_votes (
    tip_id uuid not null references nt_place_tips (id) on delete cascade,
    profile_id uuid not null references nt_profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (tip_id, profile_id)
);

-- Right now at a place: one tap from someone there.
create table if not exists nt_place_pulses (
    id uuid primary key default gen_random_uuid(),
    spot_id uuid not null references nt_spots (id) on delete cascade,
    profile_id uuid not null references nt_profiles (id) on delete cascade,
    kind text not null check (kind in ('open', 'closed', 'lively', 'calm', 'full', 'power_cut')),
    created_at timestamptz not null default now()
);

create index if not exists nt_place_pulses_spot_idx on nt_place_pulses (spot_id, created_at desc);
create index if not exists nt_place_pulses_profile_idx on nt_place_pulses (profile_id, created_at desc);
create index if not exists nt_place_pulses_time_idx on nt_place_pulses (created_at desc);

-- A WhatsApp message or a call started from a place's page: the proof, for
-- its owner, of the customers NiceThings sends.
create table if not exists nt_place_contacts (
    id bigint generated always as identity primary key,
    spot_id uuid not null references nt_spots (id) on delete cascade,
    channel text not null check (channel in ('whatsapp', 'call')),
    visitor_id uuid,
    profile_id uuid references nt_profiles (id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists nt_place_contacts_spot_idx on nt_place_contacts (spot_id, created_at desc);

-- Activité: what happened to a member's reviews, photos and words.
create table if not exists nt_notices (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references nt_profiles (id) on delete cascade,
    kind text not null check (kind in ('vote', 'reply', 'comment', 'like', 'tip_vote', 'level')),
    actor_id uuid references nt_profiles (id) on delete cascade,
    data jsonb not null default '{}',
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists nt_notices_profile_idx on nt_notices (profile_id, created_at desc);

-- The highest level a member was told about, so a level is celebrated once.
alter table nt_profiles add column if not exists last_level integer not null default 0;

-- The phones on which a member wants their Activité as notifications.
create table if not exists nt_profile_phones (
    endpoint text primary key,
    profile_id uuid not null references nt_profiles (id) on delete cascade,
    p256dh text not null,
    auth text not null,
    lang text not null default 'fr',
    failures integer not null default 0,
    created_at timestamptz not null default now(),
    last_sent_at timestamptz
);

create index if not exists nt_profile_phones_profile_idx on nt_profile_phones (profile_id);

-- A "Dis au taxi" can be reported like a comment.
alter table nt_flags drop constraint if exists nt_flags_kind_check;
alter table nt_flags add constraint nt_flags_kind_check check (kind in ('comment', 'review', 'profile', 'tip'));

-- What a member gave, now with their ways and live news (points: a way 5,
-- a live news 1; "useful" on a way counts like a like).
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
    )::int as cheers,
    (select count(*) from nt_place_tips t where t.profile_id = p.id and t.status = 'PUBLISHED')::int as tips,
    (select count(*) from nt_place_pulses u where u.profile_id = p.id)::int as pulses
from nt_profiles p;

alter table nt_place_tips enable row level security;
alter table nt_tip_votes enable row level security;
alter table nt_place_pulses enable row level security;
alter table nt_place_contacts enable row level security;
alter table nt_notices enable row level security;
alter table nt_profile_phones enable row level security;
