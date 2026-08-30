# NiceThings — Final Release Checklist

## Product
- [x] Premium brand system
- [x] Supplied NiceThings location-mark asset used as canonical app icon
- [x] Responsive mobile/desktop layout
- [x] Home discovery experience
- [x] Search and filters
- [x] GPS-first Nearby experience
- [x] Geographic distance calculation
- [x] Map/list discovery relationship
- [x] Spot detail experience
- [x] Saved places
- [x] Arrivals
- [x] Reviews
- [x] Reports
- [x] Place contributions
- [x] Admin moderation areas
- [x] Privacy consent modal
- [x] Privacy page
- [x] Terms page
- [x] PWA manifest and icons
- [x] Global footer and legal navigation

## Engineering
- [x] TypeScript validation passes
- [x] ESLint validation passes with zero reported errors/warnings
- [x] Stable visitor bootstrap added
- [x] Location API contract consistent
- [x] Search location typing corrected
- [x] Admin route protected by server-side session
- [x] Admin PIN checked only on the server
- [x] Admin session stored in HTTP-only signed cookie
- [x] Admin logout implemented
- [x] Admin PIN is not a NEXT_PUBLIC variable
- [x] Environment example included

## External production checks
- [ ] Run `npm run build` on the deployment machine after installing dependencies
- [ ] Confirm Supabase RLS policies prevent unauthorized administrative writes
- [ ] Confirm Supabase anonymous/visitor policies match the intended product rules
- [ ] Confirm deployed HTTPS origin allows browser geolocation
- [ ] Test real device GPS in Cameroon
- [ ] Test Supabase production data with real credentials

The source validation environment could not run the Next production build because the required Linux SWC package was unavailable from the npm registry. This is an environment/network limitation, not a TypeScript or ESLint failure.
