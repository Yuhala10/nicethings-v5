-- ============================================================================
-- NiceThings — 007: "On se voit où ?" (a vote among friends)
-- ============================================================================
-- Run once in the Supabase SQL editor (after 001 to 006). Safe to run again.
--
-- Someone picks two to four places, gets a link, drops it in a group chat;
-- each friend opens it and votes. No account: a browser's random id (the same
-- one the site already keeps) counts for one vote per poll, and can change
-- its mind. Reading and writing go through the site's server only.
-- ============================================================================

create table if not exists nt_polls (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,                 -- the short code in the link
    slugs text[] not null,                     -- the places to choose from
    title text,                                -- "Samedi soir ?", optional
    visitor_id uuid not null,                  -- who asked
    created_at timestamptz not null default now()
);

create index if not exists nt_polls_visitor_idx on nt_polls (visitor_id, created_at desc);

create table if not exists nt_poll_votes (
    poll_id uuid not null references nt_polls (id) on delete cascade,
    visitor_id uuid not null,
    slug text not null,                        -- the place voted for
    name text,                                 -- a first name, if the voter gives one
    created_at timestamptz not null default now(),
    primary key (poll_id, visitor_id)
);

-- No public policy: nobody reads or writes these tables except the site.
alter table nt_polls enable row level security;
alter table nt_poll_votes enable row level security;
