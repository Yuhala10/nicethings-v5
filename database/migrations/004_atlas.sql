-- NiceThings — Atlas, the operator that looks after the catalogue
-- Run once in the Supabase SQL editor, after 003_blog_and_claims.sql.
-- Safe to run again.
--
-- Security model (same as before): none of these tables has a public
-- policy. Only the server (service role) reads or writes them: the team
-- console through its API routes, and Atlas's own jobs.

-- ---------------------------------------------------------------------------
-- What Atlas found out about a place online, on the place itself.
-- "Verified" stays what it was: a person went there. This is separate.
-- ---------------------------------------------------------------------------

alter table nt_spots add column if not exists online_status text
    check (online_status in ('confirmed_online', 'uncertain', 'probably_closed', 'not_found'));
alter table nt_spots add column if not exists online_checked_at timestamptz;

create index if not exists nt_spots_online_checked_idx on nt_spots (online_checked_at nulls first);

-- ---------------------------------------------------------------------------
-- Settings: one row. The pause switch and the most Atlas may spend in a day.
-- ---------------------------------------------------------------------------

create table if not exists nt_atlas_settings (
    id boolean primary key default true check (id),
    paused boolean not null default false,
    daily_cap_usd numeric(8, 2) not null default 2.00,
    model text not null default 'claude-opus-5-5',
    -- How many places the Inspector may check in one night, whatever the cap.
    places_per_night integer not null default 30,
    updated_at timestamptz not null default now()
);

insert into nt_atlas_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Runs: each time Atlas works (a night shift, an order from the console).
-- The money spent is added up from here, so the daily cap is exact.
-- ---------------------------------------------------------------------------

create table if not exists nt_atlas_runs (
    id uuid primary key default gen_random_uuid(),
    kind text not null,                      -- 'night', 'order', 'trial'…
    status text not null default 'running' check (status in ('running', 'done', 'stopped', 'failed')),
    model text,
    input_tokens bigint not null default 0,
    output_tokens bigint not null default 0,
    searches integer not null default 0,
    cost_usd numeric(10, 4) not null default 0,
    -- The morning briefing, in both languages, and the figures behind it.
    briefing_fr text,
    briefing_en text,
    stats jsonb not null default '{}',
    error text,
    started_at timestamptz not null default now(),
    finished_at timestamptz
);

create index if not exists nt_atlas_runs_started_idx on nt_atlas_runs (started_at desc);

-- ---------------------------------------------------------------------------
-- Actions: everything Atlas did or proposes to do, with the proof and what
-- is needed to undo it. Nothing Atlas changes is ever lost.
-- ---------------------------------------------------------------------------

create table if not exists nt_atlas_actions (
    id uuid primary key default gen_random_uuid(),
    run_id uuid references nt_atlas_runs (id) on delete set null,
    desk text not null,                      -- 'inspector', 'scout', 'pictures', 'editor', 'publicist'…
    kind text not null,                      -- 'place.check', 'place.update', 'place.hide', 'place.add', 'post.draft'…
    spot_id uuid references nt_spots (id) on delete cascade,
    title text not null,                     -- one line a person can read
    detail text,
    -- The pages a finding rests on: [{ url, title, shows, dated }]
    evidence jsonb not null default '[]',
    -- The fields before and after, for the change itself and for undoing it.
    before jsonb,
    after jsonb,
    confidence numeric(3, 2),
    -- 'proposed' waits for a person; 'applied' was done (by Atlas when it is
    -- allowed to, or by a person approving); the rest are final.
    status text not null default 'proposed' check (status in ('proposed', 'applied', 'declined', 'undone', 'noted')),
    decided_at timestamptz,
    decided_by text,
    created_at timestamptz not null default now()
);

create index if not exists nt_atlas_actions_status_idx on nt_atlas_actions (status, created_at desc);
create index if not exists nt_atlas_actions_spot_idx on nt_atlas_actions (spot_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Issues: what is wrong or unfinished on the platform itself (a broken
-- page, a place on the wrong side of town, a duplicate…). Kept here so they
-- can be read back and fixed over time.
-- ---------------------------------------------------------------------------

create table if not exists nt_atlas_issues (
    id uuid primary key default gen_random_uuid(),
    -- The same problem found again updates its row instead of adding one.
    fingerprint text not null unique,
    area text not null,                      -- 'catalogue', 'pages', 'content', 'search', 'console'…
    severity text not null default 'minor' check (severity in ('minor', 'normal', 'serious')),
    title text not null,
    detail text,
    evidence jsonb not null default '{}',
    status text not null default 'open' check (status in ('open', 'fixed', 'dismissed')),
    times_seen integer not null default 1,
    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    resolved_at timestamptz
);

create index if not exists nt_atlas_issues_status_idx on nt_atlas_issues (status, severity, last_seen_at desc);

-- ---------------------------------------------------------------------------
-- Notes: what Atlas has learned (a correction from the team, a rule of the
-- house). Read at the start of every run.
-- ---------------------------------------------------------------------------

create table if not exists nt_atlas_notes (
    id uuid primary key default gen_random_uuid(),
    kind text not null default 'lesson' check (kind in ('lesson', 'rule', 'preference')),
    body text not null,
    source text,                             -- where it came from: 'declined action', 'team'…
    active boolean not null default true,
    created_at timestamptz not null default now()
);

alter table nt_atlas_settings enable row level security;
alter table nt_atlas_runs enable row level security;
alter table nt_atlas_actions enable row level security;
alter table nt_atlas_issues enable row level security;
alter table nt_atlas_notes enable row level security;

grant all on nt_atlas_settings, nt_atlas_runs, nt_atlas_actions, nt_atlas_issues, nt_atlas_notes to service_role;
