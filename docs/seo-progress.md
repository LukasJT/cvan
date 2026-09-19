# SEO implementation progress

Updated 2026-09-19 on branch `codex/seo-foundation`.

## Completed

- Corrected unknown light-pollution data handling and added focused regression tests.
- Corrected core science wording for light pollution, Milky Way geometry, aurora uncertainty/direction, and two SUVI temperature labels.
- Added allowlisted `?tab=` deep links with browser history support.
- Prevented desktop ad iframes from mounting below 1280 px and removed inaccurate “no tracking” footer claims.
- Added visible homepage introduction and crawlable guide links before React mounts.
- Added a deterministic content build, validation script, library index, four topic hubs, and generated sitemap.
- Published six initial source-backed guides: observing conditions, twilight, Milky Way latitude, Kp, light-pollution maps, and moonlight.
- Added feature coverage registry, audit, source ledger, measurement plan, and growth playbook.

## Validation

- `npm test`: 5/5 passed.
- `npm run build`: passed; 62 modules transformed; six articles and four hubs generated.
- `npm run check:content`: passed for article metadata, section fragments, generated files, topic hubs, sitemap entries, and every local link in `dist`.
- Browser inspection passed for the guide library and an article at the default narrow viewport and at 1440 × 900.
- Direct app deep links load the requested active tab; article calls to action resolve to the app correctly.
- The preview server returns real 404 responses for missing files instead of masking them with the app shell.

## Open issues

- Complete feature coverage for planets, deep sky, solar, constellations, exotica, and transients.
- Inspect every future article at a narrow and desktop viewport before publishing it.
- Decide whether to migrate the three legacy hand-authored guides into the generator after preserving their URLs and useful content.
- Verify live crawl behavior and Search Console after an authorized deployment.
- Audit real ad-network behavior, consent/privacy, and revenue data before adding article ad inventory.
- Review dependency audit findings separately; `npm ci` reported eight existing advisories (2 low, 2 moderate, 4 high).

## Next concrete step

Complete feature coverage for the highest-value remaining app panels, beginning with planet visibility, deep-sky observing, and solar activity. Publish in small source-reviewed batches and compare Search Console query impressions before expanding lower-value clusters.
