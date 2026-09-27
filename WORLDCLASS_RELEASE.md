# NiceThings — World-Class Release

## What is included

- Premium NiceThings visual system with the supplied orange location-mark brand asset.
- GPS-first nearby discovery and distance calculation.
- Search, filters, map/list discovery and spot details.
- Saved places, arrivals, reviews, reports and contributions.
- Admin console protected by a server-checked secret PIN.
- First-visit privacy/location consent modal with Privacy Policy and Terms links.
- Visitor bootstrap for a stable local visitor ID.
- PWA manifest and installable icon assets.
- Mobile and desktop responsive styling.

## Admin access

Set these in your local/deployment environment:

```env
NICE_THINGS_ADMIN_PIN=your-secret-pin
NICE_THINGS_ADMIN_SESSION_SECRET=your-long-random-session-secret
```

The PIN is server-only. Do **not** use a `NEXT_PUBLIC_` prefix.

Open `/admin` and the application redirects unauthenticated users to `/admin-login`. A successful PIN check creates an HTTP-only, same-site signed session cookie.

## Important Supabase production requirement

The admin UI is route-protected, but Supabase Row Level Security (RLS) remains the final database security boundary. Before production, verify that public/anonymous policies do not allow arbitrary users to update or delete administrative data. If the current database policies are permissive, tighten them in Supabase before launch.

## Validation performed on the supplied source

- TypeScript: PASS (`tsc --noEmit`)
- ESLint: PASS (0 errors / 0 warnings)
- Next production build: not runnable in this Linux validation environment because Next.js attempted to download its Linux SWC binary and npm registry DNS was unavailable (`EAI_AGAIN`). Run `npm install` and `npm run build` locally before deployment.
