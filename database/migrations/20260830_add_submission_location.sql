-- NiceThings: store the GPS position captured when a visitor recommends a place.
-- Run this migration in Supabase SQL Editor before enabling production submissions.

alter table if exists public.nt_spot_submissions
    add column if not exists latitude double precision;

alter table if exists public.nt_spot_submissions
    add column if not exists longitude double precision;

alter table if exists public.nt_spot_submissions
    add column if not exists location_accuracy double precision;

alter table if exists public.nt_spot_submissions
    add column if not exists location_captured_at timestamptz;

create index if not exists nt_spot_submissions_location_idx
on public.nt_spot_submissions (latitude, longitude);
