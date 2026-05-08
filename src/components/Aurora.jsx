import React, { useMemo, useState } from "react";
import { fmtDeg, fmtTime, KP_VIEW_LAT, geomagneticLatitude, DEG, moonPhaseName, parseLocationTime } from "../astro.js";
import { DataCell, FactorRow, OutOfRangeNotice } from "./shared.jsx";
import { auroraVerdict, cloudVerdict } from "../verdicts.js";

export function Aurora({ aurora, weather, bortle, sky, coords, kpForecast, weatherStale }) {
  if (!aurora) {
    return (
      <div className="panel corner p-6 text-center">
        <div className="display gold text-lg mb-2">NOAA SWPC FEED UNAVAILABLE</div>
        <p className="body secondary">Real-time aurora data could not be fetched. Try refreshing.</p>
      </div>
    );
  }

  const kp = aurora.kp;
  const threshold = KP_VIEW_LAT[Math.floor(kp)] ?? 50;
  const geomagLat = geomagneticLatitude(coords.lat, coords.lon);
  const absGeoLat = Math.abs(geomagLat);
  const cloud = weatherStale ? null : weather?.current?.cloud_cover ?? null;
  const verdict = auroraVerdict(aurora, coords.lat, cloud, geomagLat);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="panel corner p-6">
          <div className="mono text-xs uppercase tracking-widest mb-3 muted">NOAA Planetary Kp</div>
          <KpDial kp={kp} />
          <div className="mono text-xs text-center mt-2 muted">
            updated {new Date(aurora.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        <div className="panel corner p-6 lg:col-span-2">
          <div className="mono text-xs uppercase tracking-widest mb-3 muted">Viewing Geometry · Geomagnetic Coordinates</div>
          <ViewingLatDiagram kp={kp} userGeoLat={absGeoLat} threshold={threshold} />
          <div className="grid grid-cols-3 gap-3 mt-4">
            <DataCell label="Geographic |Lat|" value={fmtDeg(Math.abs(coords.lat), 1)} />
            <DataCell label="Geomagnetic |Lat|" value={fmtDeg(absGeoLat, 1)} sub="dipole approx" />
            <DataCell label="Threshold @ Kp" value={fmtDeg(threshold)} sub="geomag lat" />
          </div>
          <div className="mt-3 mono text-xs secondary">
            Margin: <span className="gold">{(absGeoLat - threshold > 0 ? "+" : "")}{(absGeoLat - threshold).toFixed(1)}°</span>
            {" "}{absGeoLat > threshold ? "above viewing threshold" : "below threshold (need higher Kp)"}
          </div>
        </div>
      </div>

      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">Verdict</div>
        <div className="display text-2xl mb-2" style={{ color: verdict.color }}>{verdict.rating}</div>
        <div className="body text-base primary">{verdict.text}</div>
      </div>

      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">Conditions Affecting Aurora Viewing</div>
        <div className="space-y-3">
          <FactorRow label="Geomagnetic activity (Kp)" status={kp >= 5 ? "good" : kp >= 4 ? "fair" : "bad"}
            note={`Kp = ${kp.toFixed(1)}. Aurora visible at geomagnetic latitudes ≥ ${threshold}°. Kp ≥ 5 = G1 storm; Kp ≥ 7 = G3 strong storm reaching mid-latitudes.`} />
          <FactorRow label="Your geomagnetic latitude" status={absGeoLat >= threshold ? "good" : absGeoLat >= threshold - 5 ? "fair" : "bad"}
            note={`At ${absGeoLat.toFixed(1)}° geomag |lat| (geographic ${Math.abs(coords.lat).toFixed(1)}°), ${absGeoLat >= threshold ? "you're inside the auroral oval for this Kp." : "you'd need higher Kp or to travel poleward."}`} />
          <FactorRow label="Cloud cover" status={weatherStale ? "unknown" : cloud == null ? "unknown" : cloud < 30 ? "good" : cloud < 60 ? "fair" : "bad"}
            note={weatherStale ? "Out of weather forecast range — clouds excluded from score." : cloud != null ? `${cloud}% — aurora is in upper atmosphere (~100km) so any clouds block it entirely.` : "weather data unavailable"} />
          <FactorRow label="Moon" status={sky.moonBrightness < 0.5 ? "good" : sky.moonBrightness < 2 ? "fair" : "bad"}
            note={`${moonPhaseName(sky.phase.phaseFraction)}, sky brightening +${sky.moonBrightness.toFixed(2)} mag. Bright aurora overpowers moonlight; faint diffuse aurora gets washed out.`} />
          <FactorRow label="City light pollution" status={bortle == null ? "unknown" : bortle <= 4 ? "good" : bortle <= 6 ? "fair" : "bad"}
            note={bortle != null ? `Bortle ${bortle}. Strong aurora visible from cities; subtle green glow needs Bortle ≤ 4. Look toward magnetic north — get away from streetlights.` : "VIIRS data unavailable for this location."} />
          <FactorRow label="Twilight" status={sky.tw.code === "night" ? "good" : sky.tw.code === "astro" || sky.tw.code === "nautical" ? "fair" : "bad"}
            note={`${sky.tw.name}. Aurora visible during nautical twilight if strong, but full darkness gives best contrast.`} />
        </div>
        {weatherStale && <OutOfRangeNotice what="Cloud cover forecast" horizon="16 days from today" />}
      </div>

      {kpForecast && kpForecast.length > 0 && (
        <Aurora3DaySlider kpForecast={kpForecast} weather={weather} coords={coords} threshold={threshold} geomagLat={geomagLat} />
      )}
    </div>
  );
}

function KpDial({ kp }) {
  const color = kp >= 7 ? "var(--error)" : kp >= 5 ? "var(--warning)" : kp >= 4 ? "var(--accent-gold)" : kp >= 3 ? "var(--accent-green)" : "var(--text-muted)";
  return (
    <svg viewBox="0 0 200 130" width="100%" style={{ maxWidth: "240px", margin: "0 auto", display: "block" }}>
      <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="var(--panel-border)" strokeWidth="14" />
      <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke={color} strokeWidth="14"
        strokeDasharray={`${(kp / 9) * 251.2} 251.2`} strokeLinecap="round" />
      <text x="100" y="90" textAnchor="middle" fontSize="38" fontFamily="Cinzel" fill={color}>{kp.toFixed(1)}</text>
      <text x="100" y="115" textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono" fill="var(--text-muted)" letterSpacing="2">Kp · 0–9</text>
      {[0, 3, 5, 7, 9].map((k) => {
        const a = (k / 9) * 180 - 180;
        const r = 92;
        const x = 100 + r * Math.cos(a * DEG);
        const y = 110 + r * Math.sin(a * DEG);
        return <text key={k} x={x} y={y} fontSize="8" fontFamily="JetBrains Mono" fill="var(--text-muted)" textAnchor="middle">{k}</text>;
      })}
    </svg>
  );
}

function ViewingLatDiagram({ kp, userGeoLat, threshold }) {
  const W = 600, H = 160;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <line x1="40" y1="80" x2={W - 40} y2="80" stroke="var(--accent-gold)" strokeWidth="1" opacity="0.5" />
      {[30, 40, 50, 60, 70, 80, 90].map((l) => {
        const x = 40 + ((l - 30) / 60) * (W - 80);
        return (
          <g key={l}>
            <line x1={x} y1="75" x2={x} y2="85" stroke="var(--text-muted)" strokeWidth="0.5" />
            <text x={x} y="100" fontSize="9" fontFamily="JetBrains Mono" fill="var(--text-muted)" textAnchor="middle">{l}°</text>
          </g>
        );
      })}
      <rect x={40 + ((threshold - 30) / 60) * (W - 80)} y="55" width={(W - 80) - ((threshold - 30) / 60) * (W - 80)} height="20" fill="#6dffb0" opacity="0.25" />
      <text x={40 + ((threshold - 30) / 60) * (W - 80) + 4} y="50" fontSize="10" fontFamily="JetBrains Mono" fill="var(--accent-green)">VIEWING ZONE @ Kp {kp.toFixed(1)}</text>
      {userGeoLat >= 30 && userGeoLat <= 90 && (
        <g>
          <line x1={40 + ((userGeoLat - 30) / 60) * (W - 80)} y1="40" x2={40 + ((userGeoLat - 30) / 60) * (W - 80)} y2="120" stroke="var(--accent-gold)" strokeWidth="2" />
          <circle cx={40 + ((userGeoLat - 30) / 60) * (W - 80)} cy="80" r="5" fill="var(--accent-gold)" />
          <text x={40 + ((userGeoLat - 30) / 60) * (W - 80)} y="135" fontSize="11" fontFamily="Cinzel" fill="var(--accent-gold)" textAnchor="middle">YOU · {userGeoLat.toFixed(1)}° GEOMAG</text>
        </g>
      )}
      {userGeoLat < 30 && (
        <text x="40" y="135" fontSize="11" fontFamily="Cinzel" fill="var(--warning)">Below 30° geomag latitude — aurora rarely visible at any Kp.</text>
      )}
    </svg>
  );
}

/* 3-day hourly slider over the SWPC forecast.
   The forecast is at 3-hour resolution; we step in hourly increments and
   pick the nearest 3h Kp bucket. Cloud cover is interpolated from Open-Meteo
   when the chosen hour is in range. */
function Aurora3DaySlider({ kpForecast, weather, coords, geomagLat }) {
  // Build an hourly array starting from "now" out to the end of the forecast (or +72h).
  const hourly = useMemo(() => {
    if (!kpForecast || kpForecast.length === 0) return [];
    const out = [];
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const horizonMs = Math.min(72 * 3600000, kpForecast[kpForecast.length - 1].time.getTime() - now.getTime());
    const steps = Math.max(1, Math.floor(horizonMs / 3600000));
    for (let i = 0; i <= steps; i++) {
      const t = new Date(now.getTime() + i * 3600000);
      // pick nearest forecast bucket (≤ t)
      let bucket = kpForecast[0];
      for (const f of kpForecast) {
        if (f.time.getTime() <= t.getTime()) bucket = f;
        else break;
      }
      out.push({ t, kp: bucket.kp, observed: bucket.observed });
    }
    return out;
  }, [kpForecast]);

  const [idx, setIdx] = useState(0);
  if (hourly.length === 0) return null;
  const sample = hourly[Math.min(idx, hourly.length - 1)];
  const threshold = KP_VIEW_LAT[Math.floor(sample.kp)] ?? 50;
  const absGeo = Math.abs(geomagLat);

  // Cloud at this hour (Open-Meteo hourly is in location-local time; convert to UTC ms)
  let cloudAt = null;
  let cloudInRange = false;
  if (weather?.hourly?.time && weather.hourly.cloud_cover) {
    const tzOffsetSec = weather.utc_offset_seconds ?? 0;
    const idxH = weather.hourly.time.findIndex((ts) => parseLocationTime(ts, tzOffsetSec) >= sample.t.getTime());
    if (idxH >= 0) {
      cloudAt = weather.hourly.cloud_cover[idxH];
      cloudInRange = true;
    }
  }

  const status =
    absGeo < threshold ? { rating: "TOO FAR", color: "var(--text-muted)" }
    : cloudInRange && cloudAt > 70 ? { rating: "CLOUDED", color: "var(--warning)" }
    : sample.kp >= 5 ? { rating: "STORM", color: "var(--accent-green)" }
    : { rating: "POSSIBLE", color: "var(--accent-gold)" };

  return (
    <div className="panel corner p-6">
      <div className="mono text-xs uppercase tracking-widest mb-3 muted">3-Day Aurora Outlook · Hour-by-Hour</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <DataCell label="Time" value={sample.t.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })} sub={sample.observed === "predicted" ? "predicted" : "observed"} />
        <DataCell label="Kp" value={sample.kp.toFixed(2)} sub={`threshold ${threshold}°`} />
        <DataCell label="Cloud" value={cloudInRange ? `${cloudAt}%` : "—"} sub={cloudInRange ? "" : "out of forecast"} />
        <DataCell label="Status" value={status.rating} sub={absGeo >= threshold ? "in zone" : `need +${(threshold - absGeo).toFixed(1)}° geomag`} />
      </div>
      <input
        type="range"
        min="0"
        max={hourly.length - 1}
        step="1"
        value={idx}
        onChange={(e) => setIdx(parseInt(e.target.value))}
        style={{ width: "100%" }}
      />
      <div className="mono text-xs flex justify-between mt-1 secondary">
        <span>{hourly[0].t.toLocaleString([], { weekday: "short", hour: "2-digit" })}</span>
        <span>+{Math.floor((sample.t - hourly[0].t) / 3600000)}h</span>
        <span>{hourly[hourly.length - 1].t.toLocaleString([], { weekday: "short", hour: "2-digit" })}</span>
      </div>
      <KpForecastSpark forecast={hourly} idx={idx} threshold={threshold} />
    </div>
  );
}

function KpForecastSpark({ forecast, idx, threshold }) {
  const W = 700, H = 80, P = 20;
  const xScale = (i) => P + (i / Math.max(1, forecast.length - 1)) * (W - P * 2);
  const yScale = (kp) => H - P - (Math.min(kp, 9) / 9) * (H - P * 2);
  const path = forecast.map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(s.kp)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ marginTop: 6 }}>
      {[3, 5, 7].map((k) => (
        <line key={k} x1={P} y1={yScale(k)} x2={W - P} y2={yScale(k)} stroke="var(--text-muted)" strokeDasharray="2 4" strokeWidth="0.5" opacity="0.4" />
      ))}
      <path d={path} fill="none" stroke="var(--accent-purple)" strokeWidth="1.5" />
      <line x1={xScale(idx)} y1={P} x2={xScale(idx)} y2={H - P} stroke="var(--accent-gold)" strokeWidth="1.5" />
      <text x={P} y={yScale(5) - 2} fontSize="8" fontFamily="JetBrains Mono" fill="var(--warning)" opacity="0.7">Kp 5 (G1)</text>
    </svg>
  );
}
