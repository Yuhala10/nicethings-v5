-- ============================================================================
-- NiceThings — 005: places that tell a story
-- ============================================================================
-- Run once in the Supabase SQL editor (after 001 to 004). Safe to run again:
-- it only adds what is missing.
--
-- Until now every place was an address. Some places deserve more: a market,
-- a lake, a street everyone knows, a cultural site. This script lets a place
-- carry:
--   * how much it matters (an address, a place worth the trip, a place with a
--     story), which decides the size of its tile and the shape of its page;
--   * its story, how to get there in words, what it costs, who to go with,
--     the best time and what to bring, in French and in English;
--   * whether the pin on the map is exact (when it is not, the page leads
--     with the directions in words);
--   * photos sent by visitors who were there, shown only once the team has
--     approved them.
-- ============================================================================

alter table nt_spots
    add column if not exists standing smallint not null default 0,
    add column if not exists position_exact boolean not null default true,
    add column if not exists story_fr text,
    add column if not exists story_en text,
    add column if not exists access_fr text,
    add column if not exists access_en text,
    add column if not exists fees_fr text,
    add column if not exists fees_en text,
    add column if not exists company_fr text,
    add column if not exists company_en text,
    add column if not exists best_time_fr text,
    add column if not exists best_time_en text,
    add column if not exists bring_fr text,
    add column if not exists bring_en text;

-- 0 an address, 1 a place worth the trip, 2 a place with a story.
do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'nt_spots_standing_range') then
        alter table nt_spots add constraint nt_spots_standing_range check (standing between 0 and 2);
    end if;
end $$;

create index if not exists nt_spots_standing_idx on nt_spots (standing) where standing > 0;

-- Photos visitors send for a place. They wait as PENDING until someone on
-- the team approves them; only approved ones can be read by the public.
-- Writing goes through the site's server only (no public write policy).
create table if not exists nt_spot_posts (
    id uuid primary key default gen_random_uuid(),
    spot_id uuid not null references nt_spots (id) on delete cascade,
    visitor_id uuid,
    image_url text not null,
    caption text,
    status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
    created_at timestamptz not null default now(),
    decided_at timestamptz
);

create index if not exists nt_spot_posts_spot_idx on nt_spot_posts (spot_id, status, created_at desc);

alter table nt_spot_posts enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'nt_spot_posts' and policyname = 'Approved visitor photos are public') then
        create policy "Approved visitor photos are public"
            on nt_spot_posts for select
            using (status = 'APPROVED');
    end if;
end $$;

-- Where those photos are kept.
insert into storage.buckets (id, name, public)
values ('spot-posts', 'spot-posts', true)
on conflict (id) do nothing;
