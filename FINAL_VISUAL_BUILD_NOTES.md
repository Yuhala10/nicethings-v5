# NiceThings — Final Visual & Location Pass

This batch is the complete project baseline for the next test/deployment cycle.

## Included

- Premium visual treatment carried across Home, Search, Nearby, Saved, Profile, Submit, Spot Details and Admin.
- Shared premium cards, buttons, forms, states and responsive spacing.
- Mobile header quick actions for language and Admin access.
- Language switcher available on desktop and mobile, with persistent EN/FR preference.
- Browser-safe Leaflet loading for `/nearby` and `/search` (`ssr: false`).
- GPS capture in “I know a place” / Submit flow. A submission must have a usable current GPS position before it can be sent.
- Captured latitude/longitude stored on `nt_spot_submissions`.
- Admin submission review displays captured GPS coordinates and an external map action.

## Supabase migration

Run:

`database/migrations/20260830_add_submission_location.sql`

in the Supabase SQL Editor before using production submissions. The migration adds location fields/indexes to `nt_spot_submissions`.

## Environment

Keep `.env.local` out of GitHub. Configure these separately in local/Vercel environments:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NICE_THINGS_ADMIN_PIN`
- `NICE_THINGS_ADMIN_SESSION_SECRET`

## Validation

Run locally:

`npm install`

`npm run build`

`npm run dev`

Then test all routes on desktop and a real phone, especially GPS permission, the mobile menu, language switching, Admin PIN login and submission location capture.
