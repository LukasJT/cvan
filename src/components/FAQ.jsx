import React, { useState } from "react";

/* CVAN FAQ — uses semantic <details>/<summary> so anchors, search, and
   keyboard navigation Just Work. Each section is a panel; each Q is a
   collapsible row. The final section is a placeholder for the planned
   accounts + forums feature so users know it's on the roadmap. */
export function FAQ() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const sections = ENTRIES.map((sec) => ({
    ...sec,
    items: sec.items.filter((it) => {
      if (!q) return true;
      return (
        it.q.toLowerCase().includes(q) ||
        it.a.toLowerCase().includes(q) ||
        sec.title.toLowerCase().includes(q)
      );
    }),
  })).filter((sec) => sec.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="panel corner p-6">
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-3">
          <div>
            <div className="mono text-xs uppercase tracking-widest muted">Help · Common Questions</div>
            <h1 className="display gold text-2xl mt-1">FAQ</h1>
          </div>
          <input
            type="search"
            placeholder="Search questions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 240, maxWidth: "100%" }}
          />
        </div>
        <p className="body text-base primary">
          Quick answers about how CVAN works, what the readings mean, and how to
          interpret the forecasts. Use the search to filter, or expand any row
          below. If you don't see your question, the citations on the Sources
          page have the underlying methodology.
        </p>
      </div>

      {sections.length === 0 ? (
        <div className="panel corner p-6 text-center">
          <div className="display gold text-lg mb-2">No matches</div>
          <p className="body secondary">Try a broader keyword, or clear the search to browse all entries.</p>
        </div>
      ) : (
        sections.map((sec) => (
          <Section key={sec.title} title={sec.title} blurb={sec.blurb}>
            {sec.items.map((it, i) => (
              <QA key={i} q={it.q} a={it.a} />
            ))}
          </Section>
        ))
      )}

      <Community />
    </div>
  );
}

function Section({ title, blurb, children }) {
  return (
    <div className="panel corner p-6">
      <h2 className="display gold text-lg mb-1">{title}</h2>
      {blurb && <p className="body text-sm secondary mb-3">{blurb}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function QA({ q, a }) {
  return (
    <details
      className="frame"
      style={{
        padding: "0.6rem 0.9rem",
        background: "var(--strip-bg)",
        borderColor: "var(--panel-border)",
      }}
    >
      <summary
        className="display gold"
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "baseline",
          gap: "0.5rem",
          fontSize: "0.95rem",
        }}
      >
        <span style={{ color: "var(--accent-gold)", marginRight: 4 }}>▸</span>
        {q}
      </summary>
      <div className="body text-sm primary mt-2" style={{ lineHeight: 1.55 }}>{a}</div>
    </details>
  );
}

function Community() {
  return (
    <div className="panel corner p-6">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-2">
        <h2 className="display gold text-lg">Community &amp; Forums</h2>
        <span className="pill mono" style={{ background: "var(--accent-warm)", color: "var(--bg-base)" }}>PLANNED</span>
      </div>
      <p className="body text-base primary">
        CVAN today is a pure-frontend planner — no backend, no accounts, no
        tracking. Your coordinates and theme preference stay in your browser's
        local storage and are never sent anywhere.
      </p>
      <p className="body text-base primary mt-2">
        On the roadmap: optional sign-in so you can save trip plans, share
        observation reports, and discuss conditions with other observers.
        Until that lands, the spots below are where active aurora &amp;
        dark-sky communities already gather.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <ExternalLink
          href="https://www.swpc.noaa.gov/communities/aurora-dashboard-experimental"
          title="NOAA SWPC Aurora Dashboard"
          desc="Real-time storm alerts and viewing forecasts straight from the source."
        />
        <ExternalLink
          href="https://www.reddit.com/r/astrophotography/"
          title="r/astrophotography"
          desc="Active community for sharing captures, equipment advice, and conditions."
        />
        <ExternalLink
          href="https://www.reddit.com/r/Astronomy/"
          title="r/Astronomy"
          desc="Broader astronomy discussion — observing tips, news, identification help."
        />
        <ExternalLink
          href="https://darksky.org/get-involved/"
          title="DarkSky International"
          desc="Find local dark-sky chapters, observing sites, and conservation efforts."
        />
        <ExternalLink
          href="https://spaceweather.com/"
          title="SpaceWeather.com"
          desc="Daily updates on auroras, sunspots, and near-Earth space conditions."
        />
        <ExternalLink
          href="https://www.cloudynights.com/"
          title="Cloudy Nights Forums"
          desc="Long-running observer community: equipment, technique, dark-sky travel."
        />
      </div>
      <div className="frame mt-4 p-3" style={{ background: "var(--strip-bg)" }}>
        <div className="mono text-xs uppercase tracking-widest muted mb-1">Want CVAN forums sooner?</div>
        <p className="body text-sm secondary">
          The discussion feature would require a backend (auth, moderation,
          rate-limits) and ongoing hosting, so it's a deliberate step beyond
          the current static-site model. If you have strong feelings on what
          it should look like — federated comments? threaded forum? per-trip
          discussion attached to a saved plan? — let the maintainer know on
          the project repo.
        </p>
      </div>
    </div>
  );
}

function ExternalLink({ href, title, desc }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="frame"
      style={{
        display: "block",
        padding: "0.7rem 0.9rem",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div className="display gold" style={{ fontSize: "0.9rem" }}>{title} ↗</div>
      <div className="body text-sm secondary mt-1">{desc}</div>
    </a>
  );
}

/* ============================== content ============================== */
const ENTRIES = [
  {
    title: "Getting Started",
    blurb: "Basics of using CVAN to plan an observation.",
    items: [
      {
        q: "How do I set my location?",
        a: "CVAN tries three things in order: (1) your last saved location from local storage, (2) browser GPS (asks permission), and (3) IP-based geolocation as a fallback. You can override any of these by searching a city in the top-bar autocomplete, typing exact coordinates, or clicking on the map (open the MAP panel).",
      },
      {
        q: "Why is my GPS denied / approximate?",
        a: "Some browsers block geolocation on http:// or after a previous denial. In Chrome/Edge: click the lock icon in the address bar → Site settings → Location → Allow. If GPS stays blocked, CVAN falls back to IP geolocation, which is accurate to ~city level. You can always enter coordinates manually for precision.",
      },
      {
        q: "What does the composite visibility score mean?",
        a: "It's a 0–100 rating that combines twilight (sun altitude), light pollution (Bortle class), moon brightening (Krisciunas–Schaefer model), and cloud cover. 70+ is a strong night, 40–70 is workable, under 15 is don't-bother. It's a heuristic — the per-factor breakdown on each tab is more useful than the single number.",
      },
      {
        q: "Does CVAN save my data anywhere?",
        a: "Only in your browser's localStorage: your last location and your theme preference. Nothing leaves your device except the API calls to weather, Kp, light-pollution, and geocoding services (each goes directly from your browser to the respective public service). There's no CVAN backend.",
      },
    ],
  },
  {
    title: "Milky Way Viewing",
    blurb: "Reading the Milky Way tab and planning a core-season shoot.",
    items: [
      {
        q: "When is the Milky Way core visible?",
        a: "The galactic core (Sgr A*, near Sagittarius) is overhead in the northern hemisphere from roughly May through September. From late summer it dips back below the horizon around midnight. The Planner tab lets you pick a specific date and shows whether the core rises above 10° during astronomical night.",
      },
      {
        q: "What altitude does the core need to be?",
        a: "Above 10° is the practical minimum (atmospheric extinction near the horizon kills contrast). 20–30° is where it starts looking really good. 30°+ is ideal. The 'Altitude over Time' chart on the Tonight tab shows this directly with tick marks indicating the band's tilt.",
      },
      {
        q: "Bortle says I'm class 5 — can I still see the Milky Way?",
        a: "Yes, but only the brightest parts: the core through Sagittarius and Aquila, the Cygnus rift. Structure is washed out near the horizon and only really emerges overhead. For naked-eye 'wow' you want Bortle ≤ 3. For a long-exposure photo, Bortle 5 is workable.",
      },
      {
        q: "Why does the verdict say 'WAIT' when it's already dark out?",
        a: "Astronomical night requires the sun to be below −18° altitude. Even in deep summer at high latitudes, the sun may stay between −12° and −18° all night (nautical/astronomical twilight). The core needs full astro night for full contrast.",
      },
    ],
  },
  {
    title: "Aurora & Kp",
    blurb: "Geomagnetic activity, viewing latitude, and the 3-day forecast.",
    items: [
      {
        q: "What's the difference between Kp and the auroral oval?",
        a: "Kp is a single number (0–9) summarizing geomagnetic disturbance globally over 3-hour windows. The auroral oval is the actual ring of activity around each magnetic pole — its equatorward boundary (the lowest latitude where aurora can be seen) drops as Kp rises. CVAN's map overlay draws this boundary live for both hemispheres.",
      },
      {
        q: "Why does the Aurora tab use geomagnetic latitude, not geographic?",
        a: "The auroral oval is centered on the geomagnetic pole (currently in Arctic Canada, not the geographic pole), so 'latitude' for aurora visibility means geomagnetic latitude. The geographic threshold can be 10°+ different from the geomag one at the same location. CVAN computes geomag latitude via the IGRF-13 dipole approximation.",
      },
      {
        q: "How accurate is the 3-day Kp forecast?",
        a: "NOAA SWPC's forecast is generally reliable for the overall trend (quiet vs. unsettled vs. storm), but specific Kp values within the next ~24h are more uncertain than further-out ones because the model can't see CMEs that haven't hit yet. Always cross-reference SpaceWeather.com or SWPC's solar-wind page during active periods.",
      },
      {
        q: "Kp says 5 but I see nothing — why?",
        a: "Common reasons: (a) your geomagnetic latitude is below the viewing threshold even at Kp 5, (b) the activity is happening on the dayside (oval visible only on the nightside), (c) clouds, (d) bright moon, or (e) you're looking the wrong direction (always toward magnetic north, low on the horizon at mid-latitudes). The Aurora tab's factor breakdown should pinpoint which one.",
      },
      {
        q: "What does the time slider in the Aurora tab do?",
        a: "It previews a future moment using NOAA's 3-day Kp forecast plus the Open-Meteo cloud forecast. The first slot is right now; subsequent slots step in 15-minute increments aligned to clock hours (so the next stop is the upcoming :00, then :15, :30, :45, …). Useful for picking a viewing window without doing the math manually.",
      },
    ],
  },
  {
    title: "Light Pollution & Bortle",
    blurb: "How CVAN measures sky brightness for your exact location.",
    items: [
      {
        q: "Where does the Bortle reading come from?",
        a: "CVAN samples a pixel from David Lorenz's VIIRS-derived light-pollution atlas tile that covers your coordinates, decodes the color to a Light Pollution Index (artificial / natural sky brightness ratio), converts that to SQM (mag/arcsec²), and looks up the Bortle class. It's NOAA/NASA VIIRS satellite data under the hood, the same product used by lightpollutionmap.info.",
      },
      {
        q: "What's SQM vs. LPI vs. Bortle?",
        a: "SQM (Sky Quality Meter, mag/arcsec²) measures absolute sky brightness — higher is darker. 22.0 is pristine; 17.8 is downtown Manhattan. LPI = artificial brightness ÷ natural brightness; LPI 0 is pristine, LPI 1 means artificial = natural, LPI 30+ is a major city. Bortle is a 1–9 categorical scale tied to qualitative descriptions of what you can see. All three describe the same thing at different resolutions.",
      },
      {
        q: "Why can't I change the Bortle value?",
        a: "Because CVAN now pulls it from satellite data automatically — every location has a real measured value, so a manual slider would just let you ignore reality. If the atlas tile is unavailable (rare; out-of-coverage near poles), CVAN reports the data as unavailable and excludes light pollution from the score rather than using a fake default.",
      },
      {
        q: "The Bortle for my location seems wrong. What's happening?",
        a: "The Lorenz atlas is annual VIIRS imagery, so it averages over many nights and won't reflect: temporary outages, new construction since the year's data, or transient sources. It also averages over each tile pixel (~460m square at the equator), so a single dark park inside a city will read as the surrounding city's class. For precision pixel-level data, see lightpollutionmap.info.",
      },
    ],
  },
  {
    title: "Moon, Sun & Twilight",
    blurb: "What 'astronomical night' means and why it matters.",
    items: [
      {
        q: "What are civil / nautical / astronomical twilight?",
        a: "They're sun-altitude thresholds: civil (−6°), nautical (−12°), astronomical (−18°). Civil twilight is bright enough to read outside; nautical is when the brightest stars appear; astronomical is when even faint stars are unaffected by residual scattering. Deep-sky and Milky Way work needs astro night.",
      },
      {
        q: "Why does the moon need to be below −5° for 'negligible light pollution'?",
        a: "Atmospheric scattering keeps the moon contributing light to the sky even after it's geometrically set (refraction makes the horizon ~0.6°). The Krisciunas–Schaefer (1991) model shows the brightening contribution drops below 0.1 mag/arcsec² (negligible for serious work) only once the moon is roughly 5° below the horizon.",
      },
      {
        q: "What's the moon phase fraction the app shows?",
        a: "It's the position in the synodic month: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter. The 'illumination %' is what fraction of the visible disk is lit — those two aren't the same number (illumination follows a cosine curve while phase is linear).",
      },
    ],
  },
  {
    title: "Planning & Forecasts",
    blurb: "Calendar, time slider, forecast horizons.",
    items: [
      {
        q: "How far ahead is the weather forecast valid?",
        a: "Open-Meteo provides hourly cloud cover, visibility, and temperature out to 16 days. Beyond that, the Planner falls back to pure astronomy (moon phase, sun/moon events, target altitude) and shows 'N/A' for clouds. The Planner card explicitly marks days beyond the forecast horizon.",
      },
      {
        q: "Why does the slider jump from 'now' straight to a clock time?",
        a: "The first slot is literally the current minute; every subsequent slot snaps to a 15-minute boundary (4:00, 4:15, 4:30, …). It's easier to discuss with other observers and matches how you'd say 'meet at 9:15' rather than 'meet at 9:13'. The 'NOW' button always returns to the live current time.",
      },
      {
        q: "Can I plan a stargazing trip months in advance?",
        a: "Yes — the Planner tab supports ranges up to 1 year. Beyond the 16-day weather window, the score is based purely on astronomy (sun, moon, target altitude). A new moon weekend with the core overhead is a strong signal even without clouds data.",
      },
    ],
  },
  {
    title: "Maps & Overlays",
    blurb: "Auroral oval, cloud cover, light pollution layers.",
    items: [
      {
        q: "What do the auroral-oval colors mean?",
        a: "Green = quiet, yellow = unsettled (Kp ≥ 4), orange = G1–G2 storm (Kp ≥ 5), red = G3+ strong storm (Kp ≥ 7). The solid bright segments are on the nightside (visible); dim dashed segments are on the dayside (oval exists but you can't see it).",
      },
      {
        q: "Why does the oval shift over time?",
        a: "Because the magnetic-midnight meridian rotates with Earth's spin. The equatorward dip of the oval always faces away from the sun, so the same observer on the ground sees the oval shift overhead through the night. The 3-Day Map slider on the Aurora tab lets you scrub through this.",
      },
      {
        q: "Cloud-cover map shows yesterday's clouds?",
        a: "NASA GIBS publishes daily VIIRS true-color mosaics, so the freshest tiles are usually 1–2 days behind real-time. For now-casting clouds, the per-location Open-Meteo 'current' value used on the Tonight tab is much faster — usually under an hour stale.",
      },
    ],
  },
  {
    title: "Accuracy & Data Sources",
    blurb: "Where every number comes from.",
    items: [
      {
        q: "How accurate are the sun/moon positions?",
        a: "CVAN uses low-precision Meeus formulas (Astronomical Algorithms, 2nd ed.). Sun positions are accurate to ~0.01°; moon positions to ~0.3°. That's well within the visual / observational precision the app needs. For arc-second precision (occultations, eclipses), use a dedicated ephemeris like JPL Horizons.",
      },
      {
        q: "Why does the Sources page list specific papers?",
        a: "Every formula or threshold in CVAN traces to a published source: Meeus for ephemerides, Krisciunas–Schaefer for moonlight, Falchi/Cinzano for sky brightness, NOAA SWPC for Kp/ovation. Click any citation in the Sources page for the DOI or service URL.",
      },
      {
        q: "What's the refresh cadence?",
        a: "Kp now: 5 minutes. Kp 3-day forecast: 30 minutes. Weather: 24 hours. VIIRS atlas: 24 hours (annual data, so doesn't really change). The header strip shows the age of every feed; click 'Refresh now' to force-update.",
      },
    ],
  },
  {
    title: "Privacy & Accounts",
    blurb: "What CVAN stores, and what's coming with forums.",
    items: [
      {
        q: "Do I need an account?",
        a: "No — CVAN today has no account system. The site is fully usable anonymously, and your data stays in your browser. Sign-in is on the roadmap, but only as an opt-in for features that need it (saved trip plans, forum participation).",
      },
      {
        q: "When will forums / discussion arrive?",
        a: "No fixed date. Adding forums means standing up auth, moderation, and ongoing hosting — a meaningful step beyond the current static-site model. The Community section below has links to active spaces where observers already discuss conditions.",
      },
      {
        q: "Will my location be shared if I sign in?",
        a: "Even after sign-in lands, location will continue to stay client-side by default. Sharing would only happen if you explicitly attached a coordinate to a public trip plan or forum post — and that'd be a deliberate per-post choice, not a global setting.",
      },
    ],
  },
];
