-- NiceThings — audience analytics
-- Run once in the Supabase SQL editor, after 001_initial_schema.sql.
-- Safe to run again.
--
-- One row per page seen on the public site. The visitor id is a random
-- UUID kept in the browser: it tells a first visit from a return visit,
-- never who the person is. No IP address, no position, no name.

create table if not exists nt_events (
    id bigint generated always as identity primary key,
    visitor_id uuid not null,

    -- Kind of page: landing, city, guide, search, map, place, directions,
    -- saved, submit, other (see lib/analytics.ts)
    page text not null,
    path text not null,
    city text,   -- city slug, when the page belongs to a city
    place text,  -- place slug, on place and directions pages
    lang text not null default 'fr' check (lang in ('fr', 'en')),

    -- Where the visit came from. Set on the first page of a visit only:
    -- 'direct', 'app' (installed on the phone), 'google', 'facebook'…
    source text,
    device text not null default 'mobile' check (device in ('mobile', 'desktop')),

    created_at timestamptz not null default now()
);

create index if not exists nt_events_created_idx on nt_events (created_at);
create index if not exists nt_events_visitor_idx on nt_events (visitor_id, created_at);

-- Write-only, like the search log: visitors can add rows, only the admin
-- (service role) reads them.
alter table nt_events enable row level security;

drop policy if exists "Anyone can log a visit" on nt_events;
create policy "Anyone can log a visit"
    on nt_events for insert
    with check (true);

grant insert on nt_events to anon, authenticated;
grant all on nt_events to service_role;

-- ---------------------------------------------------------------------------
-- Everything the admin "Audience" page shows, in one call.
-- Days are counted in Cameroon time. A visitor has "returned" once they
-- have been seen on two different days.
-- ---------------------------------------------------------------------------

create or replace function nt_audience(since timestamptz)
returns jsonb
language sql
stable
set search_path = public
as $$
    with period as (
        select
            visitor_id, page, city, place, lang, source, device,
            (created_at at time zone 'Africa/Douala')::date as day
        from nt_events
        where created_at >= since
    ),
    -- For each visitor of the period: their first day ever and on how
    -- many different days they came.
    history as (
        select
            visitor_id,
            min((created_at at time zone 'Africa/Douala')::date) as first_day,
            count(distinct (created_at at time zone 'Africa/Douala')::date) as days
        from nt_events
        where visitor_id in (select visitor_id from period)
        group by visitor_id
    ),
    visits as (
        select p.*, h.first_day, h.days
        from period p
        join history h using (visitor_id)
    )
    select jsonb_build_object(
        'views', (select count(*) from visits),
        'visitors', (select count(*) from history),
        'returned', (select count(*) from history where days > 1),
        'fresh', (
            select count(*) from history
            where first_day >= (since at time zone 'Africa/Douala')::date
        ),
        'perDay', coalesce((
            select jsonb_agg(to_jsonb(d) order by d.day)
            from (
                select
                    day,
                    count(*) as views,
                    count(distinct visitor_id) as visitors,
                    count(distinct visitor_id) filter (where first_day < day) as returned
                from visits
                group by day
            ) d
        ), '[]'::jsonb),
        'cities', coalesce((
            select jsonb_agg(to_jsonb(c) order by c.visitors desc, c.city)
            from (
                select
                    city,
                    count(*) as views,
                    count(distinct visitor_id) as visitors,
                    count(distinct visitor_id) filter (where days > 1) as returned
                from visits
                where city is not null
                group by city
            ) c
        ), '[]'::jsonb),
        'pages', coalesce((
            select jsonb_agg(to_jsonb(k) order by k.views desc, k.page)
            from (
                select page, count(*) as views, count(distinct visitor_id) as visitors
                from visits
                group by page
            ) k
        ), '[]'::jsonb),
        'places', coalesce((
            select jsonb_agg(to_jsonb(t) order by t.views desc, t.slug)
            from (
                select
                    v.place as slug,
                    s.id,
                    s.name,
                    s.city,
                    count(*) as views,
                    count(distinct v.visitor_id) as visitors
                from visits v
                left join nt_spots s on s.slug = v.place
                where v.page = 'place' and v.place is not null
                group by v.place, s.id, s.name, s.city
                order by count(*) desc, v.place
                limit 20
            ) t
        ), '[]'::jsonb),
        'sources', coalesce((
            select jsonb_agg(to_jsonb(o) order by o.visits desc, o.source)
            from (
                select source, count(*) as visits
                from visits
                where source is not null
                group by source
                order by count(*) desc, source
                limit 12
            ) o
        ), '[]'::jsonb),
        'langs', coalesce((
            select jsonb_agg(to_jsonb(l) order by l.visitors desc, l.lang)
            from (
                select lang, count(distinct visitor_id) as visitors
                from visits
                group by lang
            ) l
        ), '[]'::jsonb),
        'devices', coalesce((
            select jsonb_agg(to_jsonb(e) order by e.visitors desc, e.device)
            from (
                select device, count(distinct visitor_id) as visitors
                from visits
                group by device
            ) e
        ), '[]'::jsonb)
    );
$$;

-- Admin only: the API route calls it with the service role.
revoke all on function nt_audience(timestamptz) from public, anon, authenticated;
grant execute on function nt_audience(timestamptz) to service_role;

notify pgrst, 'reload schema';
