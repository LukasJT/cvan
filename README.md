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

This repo deploys automatically via GitHub Actions on every push to `main`,
serving from the custom domain **celestialvisibility.com**.

**One-time setup in the GitHub UI:**

1. Repository → Settings → Pages
2. Under "Build and deployment" → Source: choose **GitHub Actions**
3. Under "Custom domain", enter `celestialvisibility.com` and save
4. Once GitHub provisions a TLS certificate (5–15 min), tick **Enforce HTTPS**

**DNS at your registrar (apex `celestialvisibility.com`):**

Add four `A` records on the root (`@`) pointing to GitHub Pages:

```
@   A   185.199.108.153
@   A   185.199.109.153
@   A   185.199.110.153
@   A   185.199.111.153
```

For the `www` subdomain, add a `CNAME`:

```
www CNAME lukasjt.github.io.
```

The `public/CNAME` file in this repo declares the custom domain to GitHub
Pages. Subsequent pushes to `main` trigger `.github/workflows/deploy.yml`,
which builds and publishes `dist/`.

## Notes

- The Vite `base` is `/` because the app lives at the apex of the custom
  domain. If you ever revert to project-pages hosting (lukasjt.github.io/cvan/),
  flip `base` back to `/cvan/` and update the asset paths in `index.html`,
  `public/manifest.webmanifest`, and `public/sw.js`.
- All API calls are made directly from the browser. NOAA and Open-Meteo allow
  CORS; if either ever changes that, a serverless proxy would be needed.
- The NOAA NCEI VIIRS service publishes a rolling ~60-day window of nightly
  radiance; CVAN uses the most recent available pixel for the chosen location.
