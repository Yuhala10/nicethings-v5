# NiceThings Map Stability Fix

Leaflet is now dynamically imported with `ssr: false` in both `/nearby` and `/search`, preventing browser-only `window` access during Next.js prerendering. A lightweight loading surface is shown while the map bundle loads.
