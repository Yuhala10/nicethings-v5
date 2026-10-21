-- ============================================================================
-- NiceThings — 014: messages, "la flamme" and "la série"
-- ============================================================================
-- Run once in the Supabase SQL editor (after 013). Safe to run again.
--
-- Two members write to each other, like on WhatsApp: text, photos, voice
-- notes, a place, a "on y va ?" (a place and a time, each one answers),
-- replies, reactions, read ticks, "en train d'écrire", "en ligne".
-- Someone who is not followed by the person they write to lands in their
-- "Demandes" until it is accepted. Anyone can be blocked and reported.
-- La flamme: the days in a row two members both wrote to each other.
-- La série: the weeks in a row a member gave something to the city (a
-- review, a photo, an outing, a way, a live news); worked out by the site
-- from what already exists, only the best one is kept here.
-- Read and written by the site's server only (RLS on, no policy). Photos and
-- voice notes go to the private "chats" bucket, read through links that
-- expire.
-- ============================================================================

-- One conversation per pair: a_id is always the smaller id.
create table if not exists nt_chats (
    id uuid primary key default gen_random_uuid(),
    a_id uuid not null references nt_profiles (id) on delete cascade,
    b_id uuid not null references nt_profiles (id) on delete cascade,
    started_by uuid not null references nt_profiles (id) on delete cascade,
    -- False while it is a request to someone who does not follow the starter.
    accepted boolean not null default false,
    created_at timestamptz not null default now(),
    last_at timestamptz not null default now(),
    last_message_id uuid,
    -- Each side's own view of it.
    a_read_at timestamptz,
    b_read_at timestamptz,
    a_cleared_at timestamptz,
    b_cleared_at timestamptz,
    a_archived boolean not null default false,
    b_archived boolean not null default false,
    a_muted boolean not null default false,
    b_muted boolean not null default false,
    a_pinned boolean not null default false,
    b_pinned boolean not null default false,
    a_typing_until timestamptz,
    b_typing_until timestamptz,
    -- La flamme (days in Douala time).
    a_day date,
    b_day date,
    flame integer not null default 0,
    flame_day date,
    flame_best integer not null default 0,
    check (a_id < b_id),
    unique (a_id, b_id)
);

create index if not exists nt_chats_a_idx on nt_chats (a_id, last_at desc);
create index if not exists nt_chats_b_idx on nt_chats (b_id, last_at desc);

create table if not exists nt_messages (
    id uuid primary key default gen_random_uuid(),
    chat_id uuid not null references nt_chats (id) on delete cascade,
    sender_id uuid not null references nt_profiles (id) on delete cascade,
    kind text not null check (kind in ('text', 'photo', 'voice', 'place', 'plan')),
    body text check (body is null or char_length(body) <= 2000),
    media_path text,
    media_width integer,
    media_height integer,
    duration numeric(6, 1),
    spot_id uuid references nt_spots (id) on delete set null,
    -- "On y va ?": when, and each one's answer ({ "<profile id>": "yes" | "no" }).
    plan_at timestamptz,
    plan_answers jsonb not null default '{}'::jsonb,
    reply_to uuid references nt_messages (id) on delete set null,
    -- One reaction per person: { "<profile id>": "😂" }.
    reactions jsonb not null default '{}'::jsonb,
    -- DRAFT while its file is on its way; DELETED when taken back for everyone.
    status text not null default 'SENT' check (status in ('DRAFT', 'SENT', 'DELETED')),
    created_at timestamptz not null default now(),
    -- Moves with every change (a reaction, an answer, taken back), so phones
    -- ask only for what changed since they last looked.
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists nt_messages_chat_idx on nt_messages (chat_id, created_at desc);
create index if not exists nt_messages_changed_idx on nt_messages (chat_id, updated_at);
create index if not exists nt_messages_sender_idx on nt_messages (sender_id, created_at desc);

create table if not exists nt_blocks (
    blocker_id uuid not null references nt_profiles (id) on delete cascade,
    blocked_id uuid not null references nt_profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (blocker_id, blocked_id),
    check (blocker_id <> blocked_id)
);

create index if not exists nt_blocks_blocked_idx on nt_blocks (blocked_id);

-- Privacy, like on WhatsApp: who may write, the "vu à", the blue ticks.
-- Hiding one's own also hides the others' (it goes both ways).
alter table nt_profiles add column if not exists messages_from text not null default 'everyone';
alter table nt_profiles drop constraint if exists nt_profiles_messages_from_check;
alter table nt_profiles add constraint nt_profiles_messages_from_check check (messages_from in ('everyone', 'following', 'nobody'));
alter table nt_profiles add column if not exists hide_last_seen boolean not null default false;
alter table nt_profiles add column if not exists hide_read boolean not null default false;
-- "En ligne": noted at most every 20 seconds while messages are open.
alter table nt_profiles add column if not exists active_at timestamptz;
-- La série: the best one ever reached, in weeks.
alter table nt_profiles add column if not exists series_best integer not null default 0;

-- A message can be reported; Activité tells a flame's milestones.
alter table nt_flags drop constraint if exists nt_flags_kind_check;
alter table nt_flags add constraint nt_flags_kind_check check (kind in ('comment', 'review', 'profile', 'tip', 'outing', 'message'));
alter table nt_notices drop constraint if exists nt_notices_kind_check;
alter table nt_notices add constraint nt_notices_kind_check check (kind in ('vote', 'reply', 'comment', 'like', 'tip_vote', 'level', 'follow', 'going', 'outing_like', 'outing_comment', 'approved', 'verified', 'flame'));

-- The private bucket for photos and voice notes (15 MB at most each).
insert into storage.buckets (id, name, public, file_size_limit)
values ('chats', 'chats', false, 15728640)
on conflict (id) do update set public = false, file_size_limit = 15728640;

alter table nt_chats enable row level security;
alter table nt_messages enable row level security;
alter table nt_blocks enable row level security;
