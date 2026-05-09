import React, { useMemo, useState } from "react";
import {
  altitudeCurve, fmtTime, fmtDeg, moonPhaseName, moonPhase, toJulian,
  CONSTELLATIONS, GALACTIC_CORE, equatorialToHorizontal, lst,
  MOON_NEGLIGIBLE_ALT_DEG, parseLocationTime, dateAtLocationWallClock,
} from "../astro.js";
import { OutOfRangeNotice } from "./shared.jsx";

const TARGETS = [
  { key: "core", label: "Milky Way Core (Sgr A*)", ra: GALACTIC_CORE.ra, dec: GALACTIC_CORE.dec },
  ...CONSTELLATIONS.map((c) => ({ key: c.name, label: c.name, ra: c.ra, dec: c.dec, brightStars: c.brightStars })),
];

const WEATHER_HORIZON_DAYS = 16;

/* Five-tier verdict, shared by day cards and the detail panel.
   `tier` is an integer 0..4 (poor → excellent) so we can take the MIN
   across factor verdicts. */
const VERDICTS = [
  { tier: 0, key: "poor",      label: "Poor",      color: "var(--error)" },
  { tier: 1, key: "fair",      label: "Fair",      color: "var(--warning)" },
  { tier: 2, key: "good",      label: "Good",      color: "var(--accent-gold)" },
  { tier: 3, key: "great",     label: "Great",     color: "var(--accent-green)" },
  { tier: 4, key: "excellent", label: "Excellent", color: "var(--accent-purple)" },
];
const verdictAt = (tier) => VERDICTS[Math.max(0, Math.min(4, tier))];

export function Planner({ coords, weather, weatherStale, bortle }) {
  const [days, setDays] = useState(30);
  const [pageOffset, setPageOffset] = useState(0); // in days, applied to today's anchor
  const [target, setTarget] = useState("core");
  const [expanded, setExpanded] = useState(null);

  const tgt = TARGETS.find((t) => t.key === target) || TARGETS[0];

  const tzOffsetSec = weather?.utc_offset_seconds ?? 0;
  const grid = useMemo(() => {
    const out = [];
    // Anchor each day at location-local noon (so the night straddles into the next UTC day).
    const todayAnchor = dateAtLocationWallClock(new Date(), tzOffsetSec, 12, 0);
    const cloudByHour = buildCloudLookup(weather, tzOffsetSec);
    for (let i = 0; i < days; i++) {
      const dayIndex = pageOffset + i;
      const anchor = new Date(todayAnchor.getTime() + dayIndex * 86400000);
      const sunCurve = altitudeCurve(anchor, coords.lat, coords.lon);
      const targetCurve = computeTargetCurve(anchor, coords.lat, coords.lon, tgt.ra, tgt.dec);
      const merged = sunCurve.map((s, j) => ({ ...s, targetAlt: targetCurve[j].alt }));
      const window = bestTargetWindow(merged);
      const cloudAvg = window ? avgCloud(cloudByHour, window.bestStart, window.bestEnd) : null;
      const inForecast = dayIndex < WEATHER_HORIZON_DAYS;
      const factors = scoreFactors(window, merged, inForecast ? cloudAvg : null, bortle ?? 4, inForecast);
      out.push({
        date: anchor,
        window,
        cloudAvg: inForecast ? cloudAvg : null,
        cloudInRange: inForecast,
        factors,
        verdict: verdictAt(factors.overall),
        sunCurve: merged,
        moonIllum: merged[24]?.moonIllum ?? 0,  // ≈ midnight
        moonFrac: moonPhase(toJulian(anchor)).phaseFraction,
      });
    }
    return out;
  }, [days, pageOffset, target, coords.lat, coords.lon, weather, bortle, tgt.ra, tgt.dec, tzOffsetSec]);

  const expandedDay = expanded != null ? grid[expanded] : null;
  const firstDate = grid[0]?.date;
  const lastDate = grid[grid.length - 1]?.date;
  const fmtRange = (d) => d ? d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "";
  const anyOutOfForecast = grid.some((g) => !g.cloudInRange);

  return (
    <div className="space-y-6">
      <div className="panel corner p-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div>
            <div className="mono text-xs uppercase tracking-widest mb-1 muted">Target</div>
            <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ minWidth: 220 }}>
              {TARGETS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <div className="mono text-xs uppercase tracking-widest mb-1 muted">Page size</div>
            <select
              value={days}
              onChange={(e) => { setDays(parseInt(e.target.value)); setPageOffset(0); setExpanded(null); }}
            >
              <option value={7}>7 days (within forecast)</option>
              <option value={14}>14 days (within forecast)</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          <div className="mono text-xs secondary" style={{ flex: 1 }}>
            Each day rates Excellent / Great / Good / Fair / Poor based on Bortle,
            moonlight in the window, twilight, and cloud cover (when in forecast).
            Best viewing window per night for {tgt.label}.
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <button
              className="ghost"
              onClick={() => { setPageOffset(Math.max(0, pageOffset - days)); setExpanded(null); }}
              disabled={pageOffset === 0}
              style={{ opacity: pageOffset === 0 ? 0.4 : 1, padding: "0.3rem 0.7rem" }}
              title="Previous page"
            >
              ← {days}d
            </button>
            <span className="mono text-xs gold">
              {fmtRange(firstDate)} → {fmtRange(lastDate)}
            </span>
            <button
              className="ghost"
              onClick={() => { setPageOffset(pageOffset + days); setExpanded(null); }}
              style={{ padding: "0.3rem 0.7rem" }}
              title="Next page"
            >
              {days}d →
            </button>
          </div>
          {pageOffset > 0 && (
            <button
              className="ghost"
              onClick={() => { setPageOffset(0); setExpanded(null); }}
              style={{ padding: "0.3rem 0.7rem", fontSize: "0.7rem" }}
            >
              ⟲ TODAY
            </button>
          )}
        </div>

        {anyOutOfForecast && (
          <OutOfRangeNotice what="Cloud cover" horizon={`${WEATHER_HORIZON_DAYS} days from today`} />
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 mt-4">
          {grid.map((d, i) => (
            <DayCard
              key={d.date.toISOString()}
              day={d}
              isExpanded={expanded === i}
              onClick={() => setExpanded(expanded === i ? null : i)}
            />
          ))}
        </div>
      </div>

      {expandedDay && (
        <DayDetail day={expandedDay} target={tgt} weather={weather} />
      )}
    </div>
  );
}

function DayCard({ day, isExpanded, onClick }) {
  return (
    <button
      onClick={onClick}
      className="frame p-2 text-left"
      style={{
        background: isExpanded ? "var(--strip-bg)" : "transparent",
        border: isExpanded ? "1px solid var(--accent-gold)" : "1px solid var(--frame-border)",
        cursor: "pointer",
        color: "var(--text-primary)",
      }}
    >
      <div className="display gold text-xs">
        {day.date.toLocaleDateString([], { month: "short", day: "numeric", weekday: "short" })}
      </div>
      <div className="display text-base mt-1" style={{ color: day.verdict.color, letterSpacing: "0.05em" }}>
        {day.verdict.label}
      </div>
      <div className="mono text-xs muted">
        {day.window ? `${fmtTime(day.window.bestStart)}–${fmtTime(day.window.bestEnd)}` : "no window"}
      </div>
      <div className="mono text-xs muted">
        🌙 {(day.moonIllum * 100).toFixed(0)}%
        {day.cloudInRange ? <> · ☁ {day.cloudAvg != null ? `${day.cloudAvg.toFixed(0)}%` : "—"}</> : <> · ☁ N/A</>}
      </div>
    </button>
  );
}

function DayDetail({ day, target, weather }) {
  const tzOffsetSec = weather?.utc_offset_seconds ?? 0;
  const cloudByHour = useMemo(() => buildCloudLookup(weather, tzOffsetSec), [weather, tzOffsetSec]);
  const f = day.factors;
  return (
    <div className="panel corner p-6">
      <div className="mono text-xs uppercase tracking-widest mb-3 muted">
        {day.date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · {target.label}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="frame p-4 text-center" style={{ borderColor: day.verdict.color }}>
            <div className="display text-3xl" style={{ color: day.verdict.color, letterSpacing: "0.1em" }}>
              {day.verdict.label.toUpperCase()}
            </div>
            <div className="mono text-xs muted mt-1">overall verdict</div>
          </div>
          <div className="mt-4 space-y-1 mono text-xs">
            <FactorPill label="Light pollution" v={f.bortle} />
            <FactorPill label="Moon during window" v={f.moon} />
            <FactorPill label="Window darkness" v={f.window} />
            <FactorPill label="Cloud cover" v={f.cloud} />
          </div>
          <div className="mt-3 body text-sm secondary">
            Moon: {moonPhaseName(day.moonFrac)} ({(day.moonIllum * 100).toFixed(0)}% illuminated)
          </div>
          {day.window ? (
            <div className="mt-1 body text-sm primary">
              Best window: <span className="gold">{fmtTime(day.window.bestStart)} – {fmtTime(day.window.bestEnd)}</span>,
              peak {fmtDeg(day.window.peakCoreAlt)} at {fmtTime(day.window.peakTime)}
            </div>
          ) : (
            <div className="mt-1 body text-sm" style={{ color: "var(--warning)" }}>
              No viewing window: target stays low or moon overlaps astronomical night.
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <DayCurveChart curve={day.sunCurve} cloudByHour={cloudByHour} cloudInRange={day.cloudInRange} />
        </div>
      </div>
    </div>
  );
}

function FactorPill({ label, v }) {
  if (!v) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="pill mono" style={{ background: v.verdict.color, color: "var(--bg-base)", minWidth: 70, textAlign: "center" }}>
        {v.verdict.label.toUpperCase()}
      </span>
      <span className="muted">{label}</span>
      <span className="subtle" style={{ marginLeft: "auto" }}>{v.detail}</span>
    </div>
  );
}

function DayCurveChart({ curve, cloudByHour, cloudInRange }) {
  const W = 700, H = 220, P = 30;
  const xScale = (h) => P + ((h - 0) / 36) * (W - P * 2);
  const yScale = (alt) => H - P - ((alt + 30) / 120) * (H - P * 2);
  const sunPath = curve.map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(s.h)} ${yScale(s.sunAlt)}`).join(" ");
  const moonPath = curve.map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(s.h)} ${yScale(s.moonAlt)}`).join(" ");
  const tgtPath = curve.map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(s.h)} ${yScale(s.targetAlt)}`).join(" ");

  // Shade where conditions match (sun<-18, moon below threshold, target up)
  const okBands = [];
  let s = null;
  for (const sample of curve) {
    const ok = sample.sunAlt < -18 && sample.moonAlt < MOON_NEGLIGIBLE_ALT_DEG && sample.targetAlt > 10;
    if (ok && s === null) s = sample.h;
    if (!ok && s !== null) { okBands.push([s, sample.h]); s = null; }
  }
  if (s !== null) okBands.push([s, 36]);

  // Cloud bars
  const cloudBars = curve
    .filter((sample) => cloudInRange)
    .map((sample, i) => {
      const cc = cloudByHour.get(roundHourKey(sample.t));
      if (cc == null) return null;
      const h = (cc / 100) * 16;
      return (
        <rect
          key={i}
          x={xScale(sample.h) - 3}
          y={H - P - h}
          width={6}
          height={h}
          fill="var(--text-muted)"
          opacity={0.35}
        />
      );
    });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {okBands.map(([a, b], i) => (
        <rect key={i} x={xScale(a)} y={P} width={xScale(b) - xScale(a)} height={H - P * 2} fill="rgba(109,255,176,0.12)" />
      ))}
      <line x1={P} y1={yScale(0)} x2={W - P} y2={yScale(0)} stroke="var(--accent-gold)" strokeDasharray="2 4" opacity="0.5" />
      <line x1={P} y1={yScale(-18)} x2={W - P} y2={yScale(-18)} stroke="var(--accent-green)" strokeDasharray="2 4" opacity="0.4" />
      {cloudInRange && cloudBars}
      <path d={sunPath} fill="none" stroke="var(--accent-warm)" strokeWidth="1.2" />
      <path d={moonPath} fill="none" stroke="#e8e8e8" strokeWidth="1.2" />
      <path d={tgtPath} fill="none" stroke="var(--accent-purple)" strokeWidth="2" />
      <text x={P} y={yScale(0) - 3} fontSize="8" fontFamily="JetBrains Mono" fill="var(--accent-gold)" opacity="0.7">HORIZON</text>
      <text x={P} y={yScale(-18) - 3} fontSize="8" fontFamily="JetBrains Mono" fill="var(--accent-green)" opacity="0.7">−18° ASTRO NIGHT</text>
      {[0, 6, 12, 18, 24, 30, 36].map((h) => (
        <text key={h} x={xScale(h)} y={H - 8} fontSize="8" fontFamily="JetBrains Mono" fill="var(--text-muted)" textAnchor="middle">
          {((h + 12) % 24).toString().padStart(2, "0")}
        </text>
      ))}
      <g fontFamily="JetBrains Mono" fontSize="9">
        <text x={W - 220} y={20} fill="var(--accent-warm)">— sun</text>
        <text x={W - 170} y={20} fill="#e8e8e8">— moon</text>
        <text x={W - 120} y={20} fill="var(--accent-purple)">— target</text>
        <text x={W - 60} y={20} fill="var(--text-muted)" opacity="0.7">▮ cloud</text>
      </g>
    </svg>
  );
}

function buildCloudLookup(weather, utcOffsetSec) {
  const map = new Map();
  if (weather?.hourly?.time && weather.hourly.cloud_cover) {
    weather.hourly.time.forEach((ts, i) => {
      // Open-Meteo timestamps are location-local; convert to UTC ms via offset.
      map.set(parseLocationTime(ts, utcOffsetSec), weather.hourly.cloud_cover[i]);
    });
  }
  return map;
}

function roundHourKey(d) {
  const t = new Date(d);
  t.setMinutes(0, 0, 0);
  return t.getTime();
}

function avgCloud(cloudByHour, start, end) {
  if (!start || !end || cloudByHour.size === 0) return null;
  let total = 0, n = 0;
  let cur = new Date(start);
  cur.setMinutes(0, 0, 0);
  const stop = end.getTime();
  while (cur.getTime() <= stop) {
    const v = cloudByHour.get(cur.getTime());
    if (v != null) { total += v; n++; }
    cur = new Date(cur.getTime() + 3600000);
  }
  return n > 0 ? total / n : null;
}

function bestTargetWindow(curve) {
  let s = null, e = null, peakAlt = -90, peakT = null;
  for (const sample of curve) {
    const ok = sample.sunAlt < -18 && sample.moonAlt < MOON_NEGLIGIBLE_ALT_DEG && sample.targetAlt > 10;
    if (ok) {
      if (s === null) s = sample.t;
      e = sample.t;
      if (sample.targetAlt > peakAlt) { peakAlt = sample.targetAlt; peakT = sample.t; }
    }
  }
  return s ? { bestStart: s, bestEnd: e, peakCoreAlt: peakAlt, peakTime: peakT } : null;
}

/* Five-tier verdict per factor. The day's overall verdict is the worst
   (lowest) tier across all four factors. If a factor isn't measurable
   (cloud cover beyond the 16-day forecast) it's omitted from the min.

   Factor cutoffs:
   - Bortle:           1–2 EX | 3 GR | 4–5 GO | 6–7 FA | 8–9 PO
   - Moon (Δ-V mag):   <0.10 EX | <0.50 GR | <1.5 GO | <3.0 FA | else PO
   - Window darkness:  altitude-centric — what's the target's PEAK altitude
                       during astronomical-night-with-no-moon, and is there
                       at least a usable amount of dark time? Tiers are
                       calibrated so a target that culminates at a "decent"
                       altitude for the user's latitude can still earn Good
                       — e.g. the Galactic Core peaks at ~16° from southern
                       Ontario and that's the BEST that latitude allows; it
                       shouldn't be capped at Fair on an otherwise perfect
                       night.
                       peak ≥40° & dark ≥1h EX | peak ≥25° & dark ≥1h GR
                       peak ≥15° & dark ≥0.5h GO | peak ≥5° & dark ≥0.5h FA
                       else PO
   - Cloud cover %:    <10 EX | <20 GR | <40 GO | <70 FA | else PO */
function scoreFactors(window, curve, cloudAvg, bortle, cloudInRange) {
  const bortleTier = bortle <= 2 ? 4 : bortle <= 3 ? 3 : bortle <= 5 ? 2 : bortle <= 7 ? 1 : 0;

  // Moon brightness averaged over the viewing window (or whole astro night
  // if no window), expressed as δ-V at zenith.
  let moonAvg = 0, moonN = 0;
  if (window) {
    for (const s of curve) {
      if (s.t >= window.bestStart && s.t <= window.bestEnd) { moonAvg += s.moonBrightness; moonN++; }
    }
  } else {
    for (const s of curve) {
      if (s.sunAlt < -18) { moonAvg += s.moonBrightness; moonN++; }
    }
  }
  moonAvg = moonN > 0 ? moonAvg / moonN : 0;
  const moonTier = moonAvg < 0.1 ? 4 : moonAvg < 0.5 ? 3 : moonAvg < 1.5 ? 2 : moonAvg < 3 ? 1 : 0;

  // Window darkness — drive primarily by PEAK target altitude during the
  // moon-down astro-night portion of the curve, with a minimum dark-hours
  // floor so a momentary overhead transit doesn't single-handedly score
  // Excellent. Hours below the target's peak get less weight than the
  // peak itself: the duration check is just a "this isn't a 5-minute
  // window" guard.
  let astroSamples = 0;
  let peakInDark = -90;
  for (const s of curve) {
    if (s.sunAlt < -18 && s.moonAlt < MOON_NEGLIGIBLE_ALT_DEG) {
      if (s.targetAlt > 0) astroSamples++;
      if (s.targetAlt > peakInDark) peakInDark = s.targetAlt;
    }
  }
  const astroHours = astroSamples * 0.5;
  let windowTier = 0;
  if      (peakInDark >= 40 && astroHours >= 1)   windowTier = 4;
  else if (peakInDark >= 25 && astroHours >= 1)   windowTier = 3;
  else if (peakInDark >= 15 && astroHours >= 0.5) windowTier = 2;
  else if (peakInDark >=  5 && astroHours >= 0.5) windowTier = 1;
  // else 0 (Poor) — target never climbs above 5° during dark sky.

  // Cloud cover (only if forecast is in range).
  let cloudTier = null;
  if (cloudInRange && cloudAvg != null) {
    cloudTier = cloudAvg < 10 ? 4 : cloudAvg < 20 ? 3 : cloudAvg < 40 ? 2 : cloudAvg < 70 ? 1 : 0;
  }

  const tiers = [bortleTier, moonTier, windowTier];
  if (cloudTier != null) tiers.push(cloudTier);
  const overall = Math.min(...tiers);

  const windowDetail =
    peakInDark < 0   ? "no dark window" :
    astroHours < 0.5 ? `peak ${peakInDark.toFixed(0)}° · brief` :
    `peak ${peakInDark.toFixed(0)}° · ${astroHours.toFixed(1)}h dark`;

  return {
    bortle: { verdict: verdictAt(bortleTier), detail: `Bortle ${bortle}` },
    moon:   { verdict: verdictAt(moonTier),   detail: `Δ-V ${moonAvg.toFixed(2)} mag` },
    window: { verdict: verdictAt(windowTier), detail: windowDetail },
    cloud:  cloudTier != null
      ? { verdict: verdictAt(cloudTier), detail: `${cloudAvg.toFixed(0)}%` }
      : { verdict: { tier: -1, key: "unknown", label: "Unknown", color: "var(--text-muted)" }, detail: "out of forecast" },
    overall,
  };
}

function computeTargetCurve(anchor, lat, lon, ra, dec) {
  const start = new Date(anchor);
  start.setHours(12, 0, 0, 0);
  const out = [];
  for (let h = 0; h <= 36; h += 0.5) {
    const t = new Date(start.getTime() + h * 3600000);
    const jd = toJulian(t);
    const sidereal = lst(jd, lon);
    const hz = equatorialToHorizontal(ra, dec, sidereal, lat);
    out.push({ t, h, alt: hz.alt, az: hz.az });
  }
  return out;
}
