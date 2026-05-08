import React from "react";
import { KP_VIEW_LAT, geomagneticLatitude, fmtDeg } from "../astro.js";

export function KpForecast({ kpForecast, coords }) {
  if (!kpForecast || kpForecast.length === 0) {
    return (
      <div className="panel corner p-6 text-center">
        <div className="display gold text-lg mb-2">FORECAST UNAVAILABLE</div>
        <p className="body secondary">NOAA SWPC 3-day Kp forecast could not be loaded.</p>
      </div>
    );
  }
  const geomagLat = Math.abs(geomagneticLatitude(coords.lat, coords.lon));
  const observed = kpForecast.filter((f) => f.observed === "observed");
  const predicted = kpForecast.filter((f) => f.observed === "predicted");

  return (
    <div className="space-y-6">
      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">3-Day Kp Outlook · NOAA SWPC</div>
        <KpForecastChart forecast={kpForecast} userGeoLat={geomagLat} />
        <div className="mt-3 mono text-xs flex flex-wrap gap-4 secondary">
          <span><span style={{ display: "inline-block", width: 12, height: 4, background: "var(--text-muted)", marginRight: 4 }} /> observed (last ~7 days)</span>
          <span><span style={{ display: "inline-block", width: 12, height: 4, background: "var(--accent-purple)", marginRight: 4 }} /> predicted (next 3 days)</span>
          <span><span style={{ display: "inline-block", width: 12, height: 0, borderTop: "1px dashed var(--warning)", marginRight: 4 }} /> Kp threshold for your geomag latitude</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KpTable title="Predicted (next ~3 days)" rows={predicted} userGeoLat={geomagLat} highlight />
        <KpTable title="Observed (recent)" rows={observed.slice(-16)} userGeoLat={geomagLat} />
      </div>
    </div>
  );
}

function KpForecastChart({ forecast, userGeoLat }) {
  if (!forecast.length) return null;
  const W = 900, H = 220, P = 30;
  const t0 = forecast[0].time.getTime();
  const t1 = forecast[forecast.length - 1].time.getTime();
  const xScale = (t) => P + ((t - t0) / (t1 - t0)) * (W - P * 2);
  const yScale = (kp) => H - P - (Math.min(kp, 9) / 9) * (H - P * 2);

  const obsPath = forecast.filter(f => f.observed === "observed").map((f, i) => `${i === 0 ? "M" : "L"} ${xScale(f.time.getTime())} ${yScale(f.kp)}`).join(" ");
  const predPath = forecast.filter(f => f.observed === "predicted").map((f, i) => `${i === 0 ? "M" : "L"} ${xScale(f.time.getTime())} ${yScale(f.kp)}`).join(" ");

  // Find user's threshold across the forecast
  const thresholdLine = (kp) => yScale(kp);

  // Determine which Kp (integer) corresponds to user's geomag lat threshold
  const requiredKp = (() => {
    for (const k of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      if (userGeoLat >= KP_VIEW_LAT[k]) return k;
    }
    return 9;
  })();

  // Day grid (UTC midnights)
  const days = [];
  let d = new Date(t0);
  d.setUTCHours(0, 0, 0, 0);
  while (d.getTime() < t1) {
    days.push(new Date(d));
    d = new Date(d.getTime() + 86400000);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {/* Day separators */}
      {days.map((dd, i) => (
        <g key={i}>
          <line x1={xScale(dd.getTime())} y1={P} x2={xScale(dd.getTime())} y2={H - P} stroke="var(--text-subtle)" strokeWidth="0.4" opacity="0.4" />
          <text x={xScale(dd.getTime()) + 4} y={H - 14} fontSize="9" fontFamily="JetBrains Mono" fill="var(--text-muted)">
            {dd.toLocaleDateString([], { month: "short", day: "numeric" })}
          </text>
        </g>
      ))}
      {/* Kp gridlines */}
      {[0, 3, 5, 7, 9].map((k) => (
        <g key={k}>
          <line x1={P} y1={yScale(k)} x2={W - P} y2={yScale(k)} stroke="var(--panel-border)" strokeDasharray="2 3" strokeWidth="0.5" />
          <text x={4} y={yScale(k) + 3} fontSize="9" fontFamily="JetBrains Mono" fill="var(--text-muted)">{k}</text>
        </g>
      ))}
      {/* User threshold line */}
      <line x1={P} y1={thresholdLine(requiredKp)} x2={W - P} y2={thresholdLine(requiredKp)} stroke="var(--warning)" strokeDasharray="4 4" strokeWidth="1" opacity="0.85" />
      <text x={W - P - 4} y={thresholdLine(requiredKp) - 4} fontSize="9" fontFamily="JetBrains Mono" fill="var(--warning)" textAnchor="end">
        Kp ≥ {requiredKp} viewable @ {userGeoLat.toFixed(1)}° geomag
      </text>
      {/* Observed */}
      <path d={obsPath} fill="none" stroke="var(--text-muted)" strokeWidth="1.5" />
      {/* Predicted */}
      <path d={predPath} fill="none" stroke="var(--accent-purple)" strokeWidth="2" />
    </svg>
  );
}

function KpTable({ title, rows, userGeoLat, highlight }) {
  return (
    <div className="panel corner p-5">
      <div className="mono text-xs uppercase tracking-widest mb-3 muted">{title}</div>
      <div className="space-y-1">
        {rows.length === 0 && <div className="mono text-xs muted">no data</div>}
        {rows.map((f, i) => {
          const threshold = KP_VIEW_LAT[Math.floor(f.kp)] ?? 50;
          const inZone = userGeoLat >= threshold;
          const stormy = f.kp >= 5;
          const color = stormy ? "var(--accent-green)" : inZone ? "var(--accent-gold)" : "var(--text-muted)";
          return (
            <div key={i} className="flex items-center justify-between mono text-xs" style={{ padding: "2px 4px", background: highlight && stormy ? "rgba(109,255,176,0.08)" : "transparent" }}>
              <span className="secondary">{f.time.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span>
              <span style={{ color, fontWeight: 600 }}>Kp {f.kp.toFixed(2)}</span>
              <span className="muted">{inZone ? "✓ in zone" : `need ≥ ${threshold}°`}</span>
              {f.noaa_scale && <span className="gold">{f.noaa_scale}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
