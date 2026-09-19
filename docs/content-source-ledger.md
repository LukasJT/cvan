# Content source ledger

Accessed 2026-09-19. “Reviewed” means checked against the named source and current implementation; it does not mean external expert review.

| Claim or model | Primary source | Code/content reference | Limits | Status |
|---|---|---|---|---|
| Civil, nautical, astronomical twilight use solar-center altitudes −6°, −12°, −18° | https://aa.usno.navy.mil/faq/RST_defs | `content/guides/articles.mjs`, `MoonSun.jsx` | Actual light depends on atmosphere and horizon | Reviewed |
| Kp-to-auroral-latitude relation is approximate and geomagnetic | https://www.spaceweather.gov/content/tips-viewing-aurora | `verdicts.js`, Kp guide | Global average, not personal probability | Reviewed |
| OVATION provides a short-term oval location/intensity forecast | https://www.spaceweather.gov/products/aurora-30-minute-forecast | Kp guide, Aurora view | Solar-wind availability and model assumptions limit output | Reviewed |
| Lorenz atlas models artificial zenith brightness from annual night-light input | https://djlorenz.github.io/astronomy/lp/ | `lightPollution.js`, light-pollution guide | Not live; not a visual Bortle assessment | Reviewed |
| CVAN uses `22 − 2.5 log10(1 + artificial/natural)` for SQM estimate | Local implementation | `lightPollution.js` | Assumes 22.0 mag/arcsec² natural background | Implementation documented |
| Galactic-center upper transit altitude can be approximated by `90° − |lat − dec|` | Standard spherical astronomy; verify examples with USNO altitude/azimuth methods | Milky Way latitude guide | Simplified upper transit, level horizon, no terrain/refraction | Reviewed calculation |
| Moon-brightness model is based on Krisciunas & Schaefer (1991) | https://ui.adsabs.harvard.edu/abs/1991PASP..103.1033K/abstract | `astro.js`, Moon guide | UI thresholds are heuristics; sign/terminology needs deeper code audit | Partial |
| SUVI 171 Å and 304 Å characteristic temperatures are approximately 0.6 MK and 0.08 MK | NOAA/SUVI product conventions; instrument documentation follow-up required | `Solar.jsx` | Channels have broad temperature response | Corrected; source follow-up open |

Do not add a technical reviewer field unless a named person has actually completed that review.
