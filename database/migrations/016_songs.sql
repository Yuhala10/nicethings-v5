-- ============================================================================
-- NiceThings — 016: real songs for outings
-- ============================================================================
-- Run once in the Supabase SQL editor (after 015). Safe to run again.
--
-- A library of real songs a member can put on an outing, like on TikTok,
-- each with its credit. Only songs NiceThings may use: sent by the artist
-- themselves (who confirm it is theirs), or under a free licence that
-- allows it (Creative Commons BY, Pixabay). The team listens to every song
-- before it goes in (status LIVE). Files in the public bucket "songs".
-- Before this script, outings keep NiceThings' own soundtracks only.
-- ============================================================================

create table if not exists nt_songs (
    id uuid primary key default gen_random_uuid(),
    title text not null check (char_length(title) between 1 and 120),
    artist text not null check (char_length(artist) between 1 and 160),
    genre text not null default 'afro' check (genre in ('afro', 'makossa', 'bikutsi', 'coupe_decale', 'amapiano', 'ndombolo', 'rap', 'rnb', 'gospel', 'reggae', 'dance', 'funk', 'chill', 'other')),
    file_path text not null,
    -- Where its best part starts, in seconds: an outing plays from there.
    start_at real not null default 0 check (start_at >= 0),
    duration real,
    -- artist: sent by the artist; cc_by: Creative Commons BY; pixabay: Pixabay licence.
    licence text not null check (licence in ('artist', 'cc_by', 'pixabay')),
    -- The credit's licence line, e.g. "CC BY 3.0".
    licence_note text,
    -- Where it comes from (the licence's page or the artist's own page).
    source_url text,
    -- Where to hear it whole (YouTube, Boomplay, Audiomack…), shown with it.
    link text,
    status text not null default 'PENDING' check (status in ('PENDING', 'LIVE', 'HIDDEN')),
    -- The member who sent it (an artist), and how the team reaches them.
    profile_id uuid references nt_profiles(id) on delete set null,
    contact text,
    uses integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists nt_songs_live_idx on nt_songs (status, uses desc, created_at desc);
create index if not exists nt_songs_profile_idx on nt_songs (profile_id);

-- The song on an outing (with photos; a video keeps its own sound).
alter table nt_outings add column if not exists song_id uuid references nt_songs(id) on delete set null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('songs', 'songs', true, 15728640, array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm'])
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

alter table nt_songs enable row level security;

notify pgrst, 'reload schema';
