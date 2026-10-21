-- ============================================================================
-- NiceThings — 015: voice notes like on WhatsApp
-- ============================================================================
-- Run once in the Supabase SQL editor (after 014). Safe to run again.
--
-- A voice note keeps the shape of the voice (its waveform, drawn while it
-- was recorded) and when the other person listened to it (the microphone
-- turns blue for the sender). Before this script, voice notes work without
-- either.
-- ============================================================================

alter table nt_messages add column if not exists waveform smallint[];
alter table nt_messages add column if not exists listened_at timestamptz;
