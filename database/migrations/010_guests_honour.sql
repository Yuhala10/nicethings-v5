-- ============================================================================
-- NiceThings — 010: guests of honour (after 009)
-- ============================================================================
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- Guests now have two ranks. A guest ("invité") is what script 009 made. A
-- guest of honour ("invité d'honneur") is invited by the team with a green
-- and gold invitation: their page leads the guests, they get their own short
-- address (nicethings.site/@theirname), and three invitations of their own to
-- give to people they choose. The rank travels inside the invitation link
-- itself (lib/invitations.ts); this keeps it with the guest's card.
-- ============================================================================

alter table nt_guests
    add column if not exists tier text not null default 'guest',   -- 'guest' or 'honour'
    add column if not exists invited_by text,                      -- the ref of the guest of honour who invited them
    add column if not exists gifts_given integer not null default 0; -- invitations a guest of honour has given (three at most)

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'nt_guests_tier_check') then
        alter table nt_guests add constraint nt_guests_tier_check check (tier in ('guest', 'honour'));
    end if;
end $$;

create index if not exists nt_guests_invited_by_idx on nt_guests (invited_by) where invited_by is not null;
