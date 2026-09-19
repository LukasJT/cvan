# CVAN SEO and science baseline

Audit date: 2026-09-19. Baseline commit: `e872fe29a0560d6a4dffd552880c7fdf2a4db00c`.

## Verified baseline

- Vite 5 / React 18 static app deployed by GitHub Pages.
- Existing crawlable pages: home, About, FAQ, Milky Way, aurora, and Bortle guides.
- The app's content is client-rendered; the homepage now includes a small visible HTML introduction and guide links before React mounts.
- Existing feature navigation used React state. The app now reads allowlisted `?tab=` values and updates browser history so static guides can link to the promised tool.
- Existing desktop ads were present in hidden CSS containers on narrow screens. They now mount only when the desktop media query matches.

## Material findings addressed

- Atlas download failures, no-data pixels, and unsupported polar coordinates previously became a pristine Bortle 1 result. They now remain unknown and are excluded from scoring.
- Light-pollution language incorrectly described a direct radiance measurement. The UI and principal static pages now describe a sampled, modeled atlas estimate.
- Milky Way copy implied that the core's transit altitude changed by month. It is now separated into latitude-controlled altitude and season-controlled overlap with darkness.
- Aurora verdicts used guaranteed language and always instructed users to look north. They now explain uncertainty and use hemisphere-aware poleward direction.
- SUVI labels omitted “thousand” in 171 Å and 304 Å temperature text; labels now read approximately 600,000 K and 80,000 K.
- Static footers claimed “no tracking” while third-party advertising code is present. The unverified claim was removed.

## Remaining audit work

- Inspect Search Console, analytics, and ad-network reports when account access is supplied.
- Measure field Core Web Vitals; current validation is a production build and generated-HTML inspection, not field performance data.
- Verify all existing FAQ structured-data answers against visible copy after the next FAQ editorial pass.
- Audit every remaining feature in `content/features.json`, especially solar imagery, planets, deep-sky catalogs, constellations, and exotic/transient objects.
- Audit image weight and replace oversized logos only after confirming their rendered use and visual quality.
- Verify live HTTP status, canonical selection, robots.txt, and sitemap after an authorized deployment.

## Build observations

The production bundle is approximately 459 kB uncompressed / 145 kB gzip in this environment. Vite reports that `astro.js` is both statically and dynamically imported, so the dynamic import does not create a separate chunk. This is a performance follow-up, not a release blocker for the static-content foundation.
