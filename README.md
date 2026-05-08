# CVAN — Celestial Visibility Analysis Network

A stargazing planner that computes Milky Way, aurora, constellation, sun and moon
visibility from your location using real astronomy and live data:

- **Sun & moon positions** — Meeus astronomical algorithms (computed client-side)
- **Light pollution / Bortle** — NOAA NCEI VIIRS Day-Night Band radiance, converted via
  Falchi-style empirical fit to artificial sky brightness, then SQM, then Bortle class
- **Aurora** — NOAA SWPC planetary Kp index, refreshed every 5 minutes
- **Weather** — Open-Meteo cloud cover and visibility (24h refresh)
- **Moon sky brightness** — Krisciunas-Schaefer (1991) model
- **Geocoding** — OpenStreetMap Nominatim
- **Map** — Leaflet with OpenStreetMap tiles

## Stack

Vite + React 18 + Tailwind CSS. No backend; all data is fetched client-side from
public APIs.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # writes dist/
npm run preview    # serves the built output locally
```

## Deployment to GitHub Pages

This repo deploys automatically via GitHub Actions on every push to `main`.

**One-time setup in the GitHub UI:**

1. Repository → Settings → Pages
2. Under "Build and deployment" → Source: choose **GitHub Actions**

That's it. Subsequent pushes to `main` will trigger `.github/workflows/deploy.yml`,
which builds the site and publishes `dist/` to Pages. The deployed URL will be
`https://lukasjt.github.io/cvan/`.

## Notes

- The Vite `base` is set to `/cvan/` to match the GitHub Pages path. If the repo
  is ever renamed, update `base` in `vite.config.js` and the favicon path in
  `index.html`.
- All API calls are made directly from the browser. NOAA and Open-Meteo allow
  CORS; if either ever changes that, a serverless proxy would be needed.
- The NOAA NCEI VIIRS service publishes a rolling ~60-day window of nightly
  radiance; CVAN uses the most recent available pixel for the chosen location.
