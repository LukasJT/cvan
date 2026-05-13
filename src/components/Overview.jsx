import React from "react";
import { fmtDeg, fmtTime, geomagneticLatitude } from "../astro.js";
import { DataCell, ScoreRow, Legend, VerdictCard, ScoreDial } from "./shared.jsx";
import { milkyWayVerdict, auroraVerdict, deepSkyVerdict, auroraVerdictShort, cloudVerdict } from "../verdicts.js";
import { moonPhaseName } from "../astro.js";

export function Overview({ sky, weather, aurora, bortle, score, curve, coords, weatherStale }) {
  if (!sky) return null;
  const cloud = weatherStale ? null : weather?.current?.cloud_cover ?? null;
  const temp = weatherStale ? null : weather?.current?.temperature_2m ?? null;
  const geomagLat = geomagneticLatitude(coords.lat, coords.lon);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="panel corner p-6 lg:col-span-1">
          <div className="mono text-xs uppercase tracking-widest mb-3 muted">Composite Visibility</div>
          <ScoreDial score={score} />
          <div className="mt-4 space-y-1 text-sm body">
            <ScoreRow label="Twilight" value={sky.tw.name} />
            <ScoreRow label="Bortle" value={bortle != null ? `Class ${bortle}` : "—"} />
            <ScoreRow label="Moon brightening" value={`+${sky.moonBrightness.toFixed(2)} mag`} />
            <ScoreRow label="Cloud cover" value={cloud != null ? `${cloud}%` : weatherStale ? "out of forecast" : "—"} />
          </div>
        </div>

        <div className="panel corner p-6 lg:col-span-2">
          <div className="mono text-xs uppercase tracking-widest mb-3 muted">Sky Right Now</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DataCell label="Sun Alt" value={fmtDeg(sky.sunHz.alt)} sub={sky.tw.name} />
            <DataCell label="Moon Alt" value={fmtDeg(sky.moonHz.alt)} sub={moonPhaseName(sky.phase.phaseFraction)} />
            <DataCell label="Moon Illum" value={`${(sky.phase.illumination * 100).toFixed(0)}%`} sub={`age ${sky.phase.ageDays.toFixed(1)}d`} />
            <DataCell label="MW Core Alt" value={fmtDeg(sky.coreHz.alt)} sub={sky.coreHz.alt > 20 ? "viewable" : "low/below"} />
            <DataCell label="Cloud Cover" value={cloud != null ? `${cloud}%` : "—"} sub={cloud != null ? cloudVerdict(cloud) : ""} />
            <DataCell label="Temp" value={temp != null ? `${temp}°C` : "—"} sub="ambient" />
            <DataCell label="Kp Index" value={aurora ? aurora.kp.toFixed(1) : "—"} sub={aurora ? auroraVerdictShort(aurora.kp, coords.lat, geomagLat) : ""} />
            <DataCell label="Geomag |Lat|" value={fmtDeg(Math.abs(geomagLat), 1)} sub={Math.abs(geomagLat) > 55 ? "auroral zone" : Math.abs(geomagLat) > 40 ? "mid-lat" : "low-lat"} />
          </div>
        </div>
      </div>

      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">Tonight's Sky · Altitude over Time</div>
        <AltitudeChart curve={curve} />
        <div className="mt-3 flex gap-4 mono text-xs flex-wrap secondary">
          <Legend color="var(--accent-warm)" label="Sun" />
          <Legend color="#e8e8e8" label="Moon" />
          <Legend color="var(--accent-purple)" label="Milky Way Core (tick = band tilt)" />
          <Legend color="var(--accent-green)" label="Astronomical night" dashed />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <VerdictCard title="Milky Way" verdict={milkyWayVerdict(sky, bortle ?? 4, cloud, curve)} icon="✦" />
        <VerdictCard title="Aurora" verdict={auroraVerdict(aurora, coords.lat, cloud, geomagLat)} icon="≋" />
        <VerdictCard title="Deep Sky" verdict={deepSkyVerdict(sky, bortle ?? 4, cloud)} icon="◉" />
      </div>
    </div>
  );
}

export function AltitudeChart({ curve }) {
  if (!curve) return null;
  const W = 700, H = 200, P = 30;
  const xScale = (h) => P + ((h - 0) / 36) * (W - P * 2);
  const yScale = (alt) => H - P - ((alt + 90) / 180) * (H - P * 2);

  const linePath = (key) =>
    curve.map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(s.h)} ${yScale(s[key])}`).join(" ");

  /* Tilted "tick marks" showing the actual angle of the Milky Way band
     in the sky at that moment (inspired by Travis Hance's milky-way-
     planner), with length scaled to how much of the bright band is
     actually above the horizon at that time. The bright band spans
     180° of galactic longitude (Norma → Cassiopeia); the tick reaches
     its full length only when all 180° is visible. From a mid-latitude
     northern site like the GTA the southern half stays below the
     horizon, so the tick stays short — a visual cue that only part of
     the Milky Way is up tonight. Suppressed when the core itself is
     below the horizon. */
  const TICK_PX_MAX = 28;
  const TICK_PX_MIN = 4;
  const TICK_EVERY = 2; // every other 30-min sample → one tick per hour
  const ticks = [];
  curve.forEach((s, i) => {
    if (i % TICK_EVERY !== 0) return;
    if (s.coreAlt < 0) return;
    const t = s.bandTangent;
    if (!t) return;
    let dAz = t.afterAz - t.beforeAz;
    if (dAz > 180) dAz -= 360;
    if (dAz < -180) dAz += 360;
    const dAlt = t.afterAlt - t.beforeAlt;
    const len = Math.sqrt(dAz * dAz + dAlt * dAlt) || 1;
    const ux = dAz / len;
    const uy = -dAlt / len; // SVG y inverts altitude

    // Scale length by the actual visible arc of the bright band.
    const arc = s.bandVisibleArc ?? 0;
    const tickPx = Math.max(TICK_PX_MIN, (arc / 180) * TICK_PX_MAX);

    const cx = xScale(s.h);
    const cy = yScale(s.coreAlt);
    ticks.push({
      x1: cx - (tickPx / 2) * ux,
      y1: cy - (tickPx / 2) * uy,
      x2: cx + (tickPx / 2) * ux,
      y2: cy + (tickPx / 2) * uy,
      cx, cy, arc,
    });
  });

  const nightBands = [];
  let bandStart = null;
  curve.forEach((s) => {
    if (s.sunAlt < -18 && bandStart === null) bandStart = s.h;
    if (s.sunAlt >= -18 && bandStart !== null) {
      nightBands.push([bandStart, s.h]);
      bandStart = null;
    }
  });
  if (bandStart !== null) nightBands.push([bandStart, 36]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "100%" }}>
      {nightBands.map(([a, b], i) => (
        <rect key={i} x={xScale(a)} y={P} width={xScale(b) - xScale(a)} height={H - P * 2} fill="rgba(109,255,176,0.06)" />
      ))}
      <line x1={P} y1={yScale(0)} x2={W - P} y2={yScale(0)} stroke="var(--accent-gold)" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
      <line x1={P} y1={yScale(-18)} x2={W - P} y2={yScale(-18)} stroke="var(--accent-green)" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.3" />
      <path d={linePath("sunAlt")} fill="none" stroke="var(--accent-warm)" strokeWidth="1.5" />
      <path d={linePath("moonAlt")} fill="none" stroke="#e8e8e8" strokeWidth="1.5" />
      <path d={linePath("coreAlt")} fill="none" stroke="var(--accent-purple)" strokeWidth="1.5" opacity="0.45" />
      {/* Angled MW tick marks at hourly intervals */}
      {ticks.map((tk, i) => (
        <g key={i}>
          <line x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} stroke="var(--accent-purple)" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx={tk.cx} cy={tk.cy} r="1.6" fill="var(--accent-purple)" />
        </g>
      ))}
      <text x={P} y={yScale(0) - 4} fontSize="9" fontFamily="JetBrains Mono" fill="var(--accent-gold)" opacity="0.7">HORIZON</text>
      <text x={P} y={yScale(-18) - 4} fontSize="9" fontFamily="JetBrains Mono" fill="var(--accent-green)" opacity="0.6">−18° (ASTRO NIGHT)</text>
      {[0, 6, 12, 18, 24, 30, 36].map((h) => (
        <text key={h} x={xScale(h)} y={H - 8} fontSize="9" fontFamily="JetBrains Mono" fill="var(--text-muted)" textAnchor="middle">
          {((h + 12) % 24).toString().padStart(2, "0")}
        </text>
      ))}
    </svg>
  );
}
