import React, { useMemo, useState } from "react";
import {
  altitudeCurve, fmtTime, fmtDeg, moonPhaseName, moonPhase, toJulian,
  CONSTELLATIONS, GALACTIC_CORE, equatorialToHorizontal, lst,
  MOON_NEGLIGIBLE_ALT_DEG, parseLocationTime, dateAtLocationWallClock,
} from "../astro.js";
import { OutOfRangeNotice, ScoreDial } from "./shared.jsx";

const TARGETS = [
  { key: "core", label: "Milky Way Core (Sgr A*)", ra: GALACTIC_CORE.ra, dec: GALACTIC_CORE.dec },
  ...CONSTELLATIONS.map((c) => ({ key: c.name, label: c.name, ra: c.ra, dec: c.dec, brightStars: c.brightStars })),
];

const WEATHER_HORIZON_DAYS = 16;

export function Planner({ coords, weather, weatherStale, bortle }) {
  const [days, setDays] = useState(30);
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
      const anchor = new Date(todayAnchor.getTime() + i * 86400000);
      const sunCurve = altitudeCurve(anchor, coords.lat, coords.lon);
      const targetCurve = computeTargetCurve(anchor, coords.lat, coords.lon, tgt.ra, tgt.dec);
      const merged = sunCurve.map((s, j) => ({ ...s, targetAlt: targetCurve[j].alt }));
      const window = bestTargetWindow(merged);
      const cloudAvg = window ? avgCloud(cloudByHour, window.bestStart, window.bestEnd) : null;
      const score = window ? scoreWindow(window, merged, cloudAvg, bortle ?? 4) : 0;
      const inForecast = i < WEATHER_HORIZON_DAYS;
      out.push({
        date: anchor,
        window,
        cloudAvg: inForecast ? cloudAvg : null,
        cloudInRange: inForecast,
        score,
        sunCurve: merged,
        moonIllum: merged[24]?.moonIllum ?? 0,  // ≈ midnight
        moonFrac: moonPhase(toJulian(anchor)).phaseFraction,
      });
    }
    return out;
  }, [days, target, coords.lat, coords.lon, weather, bortle, tgt.ra, tgt.dec, tzOffsetSec]);

  const expandedDay = expanded != null ? grid[expanded] : null;

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
            <div className="mono text-xs uppercase tracking-widest mb-1 muted">Range</div>
            <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
              <option value={14}>14 days (within forecast)</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>
          <div className="mono text-xs secondary" style={{ flex: 1 }}>
            Showing best viewing window per night for {tgt.label}.
            Score factors: target altitude during night, moonlight (Krisciunas-Schaefer), Bortle, cloud cover (Open-Meteo, when in range).
          </div>
        </div>

        {days > WEATHER_HORIZON_DAYS && <OutOfRangeNotice what="Cloud cover" horizon={`${WEATHER_HORIZON_DAYS} days`} />}

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
        <DayDetail day={expandedDay} target={tgt} bortle={bortle ?? 4} weather={weather} />
      )}
    </div>
  );
}

function DayCard({ day, isExpanded, onClick }) {
  const scoreColor =
    day.score > 70 ? "var(--accent-green)" :
    day.score > 40 ? "var(--accent-gold)" :
    day.score > 15 ? "var(--warning)" :
    "var(--error)";
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
      <div className="mono text-base mt-1" style={{ color: scoreColor }}>{day.score}</div>
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

function DayDetail({ day, target, bortle, weather }) {
  const tzOffsetSec = weather?.utc_offset_seconds ?? 0;
  const cloudByHour = useMemo(() => buildCloudLookup(weather, tzOffsetSec), [weather, tzOffsetSec]);
  return (
    <div className="panel corner p-6">
      <div className="mono text-xs uppercase tracking-widest mb-3 muted">
        {day.date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · {target.label}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <ScoreDial score={day.score} label={`/ 100 · ${day.score > 70 ? "EXCELLENT" : day.score > 40 ? "GOOD" : day.score > 15 ? "POOR" : "BAD"}`} />
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

function scoreWindow(window, curve, cloudAvg, bortle) {
  if (!window) return 0;
  let score = 100;
  // altitude — peak altitude maps to (0..1)
  score *= Math.max(0.2, Math.min(1, window.peakCoreAlt / 60));
  // moon brightness: average over the window
  let moonAvg = 0, n = 0;
  for (const s of curve) {
    if (s.t >= window.bestStart && s.t <= window.bestEnd) { moonAvg += s.moonBrightness; n++; }
  }
  moonAvg = n > 0 ? moonAvg / n : 0;
  score -= moonAvg * 12;
  // bortle
  score -= (bortle - 1) * 6;
  // cloud cover (if available)
  if (cloudAvg != null) score -= cloudAvg * 0.4;
  return Math.max(0, Math.min(100, Math.round(score)));
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
