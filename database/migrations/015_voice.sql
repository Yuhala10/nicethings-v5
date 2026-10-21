-- ============================================================================
-- NiceThings — 015: voice notes like on WhatsApp, music on outings
-- ============================================================================
-- Run once in the Supabase SQL editor (after 014). Safe to run again.
--
-- A voice note keeps the shape of the voice (its waveform, drawn while it
-- was recorded) and when the other person listened to it (the microphone
-- turns blue for the sender). Before this script, voice notes work without
-- either.
-- An outing of photos can carry one of NiceThings' own soundtracks
-- (makossa, bikutsi, afro, chill, soiree), played by the visitor's browser.
-- ============================================================================

alter table nt_messages add column if not exists waveform smallint[];
alter table nt_messages add column if not exists listened_at timestamptz;

alter table nt_outings add column if not exists sound text;
alter table nt_outings drop constraint if exists nt_outings_sound_check;
alter table nt_outings add constraint nt_outings_sound_check check (sound is null or sound in ('makossa', 'bikutsi', 'afro', 'chill', 'soiree'));
