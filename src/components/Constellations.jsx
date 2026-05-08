import React, { useMemo, useState } from "react";
import {
  CONSTELLATIONS, DEG, equatorialToHorizontal, fmtDeg, fmtTime, lst, toJulian,
  sunPosition, moonPosition, moonPhase, twilightClass, moonSkyBrightness, RAD,
  parseLocationTime,
} from "../astro.js";
import { constellationVerdict } from "../verdicts.js";
import { azimuthName } from "../astro.js";

export function Constellations({ coords, now, bortle, weather, weatherStale }) {
  const [offsetDays, setOffsetDays] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState(""); // "" means use now's time
  const tzOffsetSec = weather?.utc_offset_seconds ?? null;
  const tzName = weather?.timezone ?? null;

  const queryTime = useMemo(() => {
    if (timeOfDay && tzOffsetSec != null) {
      // Interpret the entered hh:mm as wall-clock at the QUERIED LOCATION,
      // anchored to (now + offsetDays) translated into that location's calendar date.
      const [hh, mm] = timeOfDay.split(":").map(Number);
      if (!Number.isFinite(hh)) return new Date(now);
      const anchorUtcMs = now.getTime() + offsetDays * 86400000;
      const locAnchor = new Date(anchorUtcMs + tzOffsetSec * 1000);
      const yy = locAnchor.getUTCFullYear();
      const mo = locAnchor.getUTCMonth();
      const dd = locAnchor.getUTCDate();
      return new Date(Date.UTC(yy, mo, dd, hh, Number.isFinite(mm) ? mm : 0, 0) - tzOffsetSec * 1000);
    }
    // Default: just shift the current moment by offsetDays
    const t = new Date(now);
    t.setDate(t.getDate() + offsetDays);
    if (timeOfDay) {
      const [hh, mm] = timeOfDay.split(":").map(Number);
      if (Number.isFinite(hh)) t.setHours(hh, Number.isFinite(mm) ? mm : 0, 0, 0);
    }
    return t;
  }, [now, offsetDays, timeOfDay, tzOffsetSec]);

  const fmtAtLoc = (d, opts) =>
    tzName
      ? d.toLocaleString([], { ...opts, timeZone: tzName })
      : d.toLocaleString([], opts);

  // Cloud cover at queryTime — pull from Open-Meteo hourly when in range, else null.
  const cloudAtQueryTime = useMemo(() => {
    if (!weather?.hourly?.time || !weather.hourly.cloud_cover) return null;
    const tz = tzOffsetSec ?? 0;
    const target = queryTime.getTime();
    let bestIdx = -1, bestDelta = Infinity;
    weather.hourly.time.forEach((ts, i) => {
      const t = parseLocationTime(ts, tz);
      const delta = Math.abs(t - target);
      if (delta < bestDelta) { bestDelta = delta; bestIdx = i; }
    });
    if (bestIdx < 0 || bestDelta > 90 * 60 * 1000) return null; // > 90 min from any forecast hour → out of range
    return weather.hourly.cloud_cover[bestIdx];
  }, [weather, queryTime, tzOffsetSec]);
  const cloud = cloudAtQueryTime;
  const cloudOutOfRange = cloud == null && (offsetDays !== 0 || timeOfDay !== "");

  const skyAt = useMemo(() => {
    const jd = toJulian(queryTime);
    const sun = sunPosition(jd);
    const moon = moonPosition(jd);
    const sidereal = lst(jd, coords.lon);
    const sunHz = equatorialToHorizontal(sun.ra, sun.dec, sidereal, coords.lat);
    const moonHz = equatorialToHorizontal(moon.ra, moon.dec, sidereal, coords.lat);
    const phase = moonPhase(jd);
    const phaseAngle = Math.acos(2 * phase.illumination - 1) * RAD;
    const moonBrightness = moonSkyBrightness(moonHz.alt, phaseAngle);
    const tw = twilightClass(sunHz.alt);
    return { sunHz, moonHz, phase, phaseAngle, moonBrightness, tw };
  }, [queryTime, coords.lat, coords.lon]);

  const data = useMemo(() => {
    const jd = toJulian(queryTime);
    const sidereal = lst(jd, coords.lon);
    return CONSTELLATIONS.map((c) => {
      const hz = equatorialToHorizontal(c.ra, c.dec, sidereal, coords.lat);
      return { ...c, alt: hz.alt, az: hz.az };
    }).sort((a, b) => b.alt - a.alt);
  }, [queryTime, coords.lat, coords.lon]);

  const isFuture = offsetDays !== 0 || timeOfDay !== "";

  return (
    <div className="space-y-6">
      <div className="panel corner p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="mono text-xs uppercase tracking-widest muted">
            Constellations Above Horizon · {fmtAtLoc(queryTime, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            {tzName && <span className="muted" style={{ textTransform: "none", marginLeft: 6 }}>({tzName})</span>}
          </div>
          <div className="mono text-xs secondary">
            {skyAt.tw.name} · Moon {(skyAt.phase.illumination * 100).toFixed(0)}% · Bortle {bortle ?? "—"}
            {cloud != null ? <> · ☁ {cloud}%</> : cloudOutOfRange ? <> · ☁ N/A (beyond 16-day forecast)</> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="mono text-xs uppercase tracking-widest muted">View at:</span>
          <button className="ghost" onClick={() => { setOffsetDays(0); setTimeOfDay(""); }}>NOW</button>
          <DayShifter offsetDays={offsetDays} setOffsetDays={setOffsetDays} />
          <label className="mono text-xs flex items-center gap-1 secondary">
            time {tzName ? <span className="muted">(at location)</span> : <span className="muted">(your local)</span>}
            <input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} style={{ width: 110 }} />
          </label>
          {timeOfDay && <button className="ghost" onClick={() => setTimeOfDay("")}>clear time</button>}
        </div>

        <SkyDome data={data} />
      </div>

      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">Detailed Visibility {isFuture && <span className="gold">· FUTURE</span>}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((c) => {
            const visible = c.alt > 10;
            const verdict = constellationVerdict(c, skyAt, bortle ?? 4, cloud);
            return (
              <div key={c.name} className={`frame p-3 ${!visible ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="display gold text-base">{c.name}</span>
                  <span className="pill mono" style={{ background: verdict.color, color: "var(--bg-base)" }}>{verdict.rating}</span>
                </div>
                <div className="mono text-xs flex gap-3 mb-1 secondary">
                  <span>ALT {fmtDeg(c.alt)}</span>
                  <span>AZ {fmtDeg(c.az)}</span>
                  <span>{azimuthName(c.az)}</span>
                </div>
                <div className="body text-sm italic primary">{c.brightStars}</div>
                {verdict.note && <div className="body text-xs mt-1 muted">{verdict.note}</div>}
              </div>
            );
          })}
        </div>
        {(weatherStale || cloudOutOfRange) && isFuture && (
          <div className="mono text-xs mt-3" style={{ color: "var(--warning)" }}>
            Note: cloud cover for this date is past the 16-day Open-Meteo forecast — verdicts are based on astronomy only.
          </div>
        )}
      </div>
    </div>
  );
}

function DayShifter({ offsetDays, setOffsetDays }) {
  return (
    <div className="flex items-center gap-1">
      <button className="ghost" onClick={() => setOffsetDays(offsetDays - 1)}>−1d</button>
      <span className="mono text-xs gold" style={{ minWidth: 60, textAlign: "center" }}>
        {offsetDays === 0 ? "today" : (offsetDays > 0 ? "+" : "") + offsetDays + " day" + (Math.abs(offsetDays) === 1 ? "" : "s")}
      </span>
      <button className="ghost" onClick={() => setOffsetDays(offsetDays + 1)}>+1d</button>
      <input
        type="range" min={-30} max={365} step={1}
        value={offsetDays}
        onChange={(e) => setOffsetDays(parseInt(e.target.value))}
        style={{ width: 200 }}
      />
    </div>
  );
}

function SkyDome({ data }) {
  const W = 520, H = 520, CX = W / 2, CY = H / 2, R = 240;
  const project = (alt, az) => {
    if (alt < 0) return null;
    const r = R * (90 - alt) / 90;
    const a = (az - 90) * DEG;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "560px", margin: "0 auto", display: "block" }}>
      <circle cx={CX} cy={CY} r={R} fill="rgba(10,20,45,0.6)" stroke="var(--accent-gold)" strokeWidth="1.5" />
      {[30, 60].map((alt) => (
        <circle key={alt} cx={CX} cy={CY} r={R * (90 - alt) / 90} fill="none" stroke="var(--accent-gold)" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.4" />
      ))}
      <circle cx={CX} cy={CY} r="3" fill="var(--accent-gold)" />
      <text x={CX} y={CY - 8} fontSize="9" fontFamily="JetBrains Mono" fill="var(--accent-gold)" textAnchor="middle">ZENITH</text>
      {[["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([dir, az]) => {
        const a = (az - 90) * DEG;
        const x = CX + (R + 14) * Math.cos(a);
        const y = CY + (R + 14) * Math.sin(a) + 4;
        return <text key={dir} x={x} y={y} fontSize="14" fontFamily="Cinzel" fill="var(--accent-gold)" textAnchor="middle">{dir}</text>;
      })}
      {data.map((c) => {
        const p = project(c.alt, c.az);
        if (!p) return null;
        return (
          <g key={c.name}>
            <circle cx={p[0]} cy={p[1]} r="3" fill="var(--accent-purple)" />
            <text x={p[0] + 6} y={p[1] + 3} fontSize="9" fontFamily="Cinzel" fill="var(--text-primary)" letterSpacing="1">{c.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
