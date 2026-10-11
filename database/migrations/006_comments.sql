-- ============================================================================
-- NiceThings — 006: comments under articles
-- ============================================================================
-- Run once in the Supabase SQL editor (after 001 to 005). Safe to run again.
--
-- Readers can say what they think under an article. A comment waits as
-- PENDING until someone on the team has read it; only approved ones can be
-- read by the public. Writing goes through the site's server only.
-- ============================================================================

create table if not exists nt_post_comments (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references nt_posts (id) on delete cascade,
    visitor_id uuid,
    name text,
    body text not null,
    status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
    created_at timestamptz not null default now(),
    decided_at timestamptz
);

create index if not exists nt_post_comments_post_idx on nt_post_comments (post_id, status, created_at);
create index if not exists nt_post_comments_visitor_idx on nt_post_comments (visitor_id, created_at desc);

alter table nt_post_comments enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'nt_post_comments' and policyname = 'Approved comments are public') then
        create policy "Approved comments are public"
            on nt_post_comments for select
            using (status = 'APPROVED');
    end if;
end $$;
