# SEO and revenue measurement

## Definitions

- Search CTR = organic clicks / search impressions.
- Article-to-tool rate = guide sessions with a relevant tool CTA / guide landing sessions.
- Page RPM = publisher revenue / pageviews × 1,000.
- Session RPM = publisher revenue / sessions × 1,000.
- Ad impression RPM = relevant ad revenue / ad impressions × 1,000.

Keep the denominators separate. A higher ad CTR is not a product goal; paid clicks must reflect genuine visitor interest.

## Proposed events

`guide_view`, `guide_tool_click`, `tool_tab_open`, `location_set`, `plan_created`, `related_guide_click`, and `affiliate_outbound`.

Event collection is not implemented in this change because no analytics provider, consent policy, or account configuration was supplied. Do not transmit precise coordinates or free-text location searches. Define consent and retention before enabling analytics.

## Reporting cadence

Weekly: organic clicks, indexed pages, guide landing sessions, article-to-tool rate, device split, page/session RPM, ad viewability, and field performance when available. Review content at approximately 30, 60, and 90 days. Account for aurora storms, seasonal Milky Way demand, and astronomical-event spikes before attributing change to SEO.

## Initial experiments

1. Improve a high-impression, low-CTR title/description after enough Search Console data exists.
2. Compare contextual tool CTAs with generic homepage CTAs.
3. Compare one and two article ad placements while guarding tool conversion and layout stability.
4. Compare a worked latitude table with prose-only explanation using meaningful engagement and tool use.

Predefine the primary metric, guardrails, duration, and rollback condition. Do not declare a winner from a small sample.
