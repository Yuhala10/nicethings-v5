-- ============================================================================
-- NiceThings — 008: weather notices ("Il pleut sur Douala : trois adresses")
-- ============================================================================
-- Run once in the Supabase SQL editor (after 001 to 007). Safe to run again.
--
-- A visitor may ask to be told when the weather changes in their city: when
-- the rain starts, or on a very hot afternoon, their phone shows a notice
-- with a few places open at that moment. No account. What is kept is what a
-- browser hands over so it can be sent a notice (an address at the phone
-- maker's notification service and two keys), the city and the language.
-- Reading and writing go through the site's server only.
--
-- The notices stay switched off until the two keys they are signed with are
-- set on the host (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY).
-- ============================================================================

create table if not exists nt_push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    endpoint text not null unique,             -- where the browser receives notices
    p256dh text not null,                      -- the browser's keys, to write to it only
    auth text not null,
    city text not null,                        -- city slug: "douala"
    lang text not null default 'fr',
    created_at timestamptz not null default now(),
    last_sent_at timestamptz,                  -- never more than one notice a day each
    failures integer not null default 0
);

create index if not exists nt_push_subscriptions_city_idx on nt_push_subscriptions (city);

-- What was sent, city by city: a city is not told twice about the same sky.
create table if not exists nt_push_notices (
    id uuid primary key default gen_random_uuid(),
    city text not null,
    sky text not null,                         -- "rain" or "heat"
    sent integer not null default 0,           -- how many phones it reached
    created_at timestamptz not null default now()
);

create index if not exists nt_push_notices_city_idx on nt_push_notices (city, created_at desc);

-- No policies: nothing is readable or writable with the public key.
alter table nt_push_subscriptions enable row level security;
alter table nt_push_notices enable row level security;
