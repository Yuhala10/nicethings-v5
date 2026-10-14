-- ============================================================================
-- NiceThings — 009: guests' pages ("Yaoundé, vu par …")
-- ============================================================================
-- Run once in the Supabase SQL editor (after 001 to 008). Safe to run again.
--
-- A person invited by the team (lib/invitations.ts) writes a notebook of the
-- places they love. With it, they now give their guest's card: a photo of
-- themselves, their account, one sentence about who they are. Once the team
-- publishes their notebook, that card becomes their page on the site, with
-- the hearts of the people who liked their places.
--
-- And anyone may ask for an invitation (the form on /fr/invites): a name, an
-- account, what they like. The team reads each one and invites, or not.
--
-- Reading and writing go through the site's server only.
-- ============================================================================

-- A guest's card, as they sent it. One per invitation.
create table if not exists nt_guests (
    ref text primary key,                      -- the invitation's short name (its notebooks carry "carnet-<ref>")
    slug text not null unique,                 -- their page: /fr/invites/<slug>
    name text not null,
    handle text,                               -- "@renafidolly"
    link text,                                 -- https address of their account
    portrait_url text,                         -- a photo of them, sent by them
    intro text,                                -- one sentence, in their words
    hearts integer not null default 0,         -- recounted from nt_guest_hearts on each heart
    consent_at timestamptz not null default now(), -- when they agreed to be published
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- One heart per browser (its random id) and per guest.
create table if not exists nt_guest_hearts (
    guest_ref text not null references nt_guests (ref) on delete cascade,
    visitor_id uuid not null,
    created_at timestamptz not null default now(),
    primary key (guest_ref, visitor_id)
);

-- Someone asking to be invited.
create table if not exists nt_guest_requests (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    handle text not null,                      -- their account, as typed: "@renafidolly"
    platform text not null default 'instagram' check (platform in ('instagram', 'tiktok', 'facebook', 'youtube', 'other')),
    link text,                                 -- one of their posts (https), if they gave one
    city text,                                 -- city slug
    likes text[] not null default '{}',        -- the kinds of places they love
    why text,
    visitor_id uuid,                           -- to stop one browser sending many
    status text not null default 'PENDING' check (status in ('PENDING', 'INVITED', 'DECLINED')),
    created_at timestamptz not null default now(),
    decided_at timestamptz
);

create index if not exists nt_guest_requests_status_idx on nt_guest_requests (status, created_at desc);
create index if not exists nt_guest_requests_visitor_idx on nt_guest_requests (visitor_id, created_at desc);

-- No policies: nothing is readable or writable with the public key.
alter table nt_guests enable row level security;
alter table nt_guest_hearts enable row level security;
alter table nt_guest_requests enable row level security;
