import React, { useMemo } from "react";
import {
  DEG, RAD, toJulian, lst, equatorialToHorizontal,
  galacticToEquatorial, fmtDeg, GALACTIC_CORE,
} from "../astro.js";

/* Notable named points on the Milky Way band, given as galactic longitude
   (b = 0 along the bright band). Used to label the arch render. */
const NAMED_LANDMARKS = [
  { l:   0, label: "Galactic Center", color: "#ffd87a" },
  { l:  30, label: "Scutum",          color: "#d4b07a" },
  { l:  60, label: "Aquila Rift",     color: "#8090a0" },
  { l:  80, label: "Cygnus",          color: "#e8c878" },
  { l: 110, label: "Cassiopeia",      color: "#dcd0b0" },
  { l: 135, label: "Perseus",         color: "#c8a890" },
  { l: 180, label: "Anticenter",      color: "#a0a0c0" },
  { l: 230, label: "Vela",            color: "#90c8b0" },
  { l: 270, label: "Carina",          color: "#d8b070" },
  { l: 300, label: "Coalsack",        color: "#404050" },
  { l: 330, label: "Norma",           color: "#b89870" },
];

/* MilkyWayArch — a planetarium-style azimuthal-equidistant sky chart with
   the local horizon at the outer ring and the zenith at the centre. The
   Milky Way band is sampled along its bright equator (galactic latitude
   b = 0) and projected into the observer's local frame. */
export function MilkyWayArch({ coords, now }) {
  if (!coords) return null;
  const observer = { lat: coords.lat, lon: coords.lon };
  const jd = toJulian(now);
  const sidereal = lst(jd, observer.lon);

  // Sample the bright band continuously around the galactic equator.
  const band = useMemo(() => {
    const out = [];
    for (let l = 0; l <= 360; l += 2) {
      const eq = galacticToEquatorial(l, 0);
      const hz = equatorialToHorizontal(eq.ra, eq.dec, sidereal, observer.lat);
      out.push({ l, ra: eq.ra, dec: eq.dec, alt: hz.alt, az: hz.az });
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidereal, observer.lat]);

  // Galactic Center position
  const coreHz = useMemo(() => equatorialToHorizontal(
    GALACTIC_CORE.ra, GALACTIC_CORE.dec, sidereal, observer.lat),
    [sidereal, observer.lat]
  );

  // Position angle of the band where it crosses the local meridian (S=180°
  // or N=0°). Used by the panorama planner — knowing the tilt lets the
  // photographer align their pano rotation axis with the band.
  const panoAngle = useMemo(() => computeBandPositionAngle(band), [band]);

  // SVG planetarium projection — azimuthal equidistant, zenith at centre,
  // horizon at radius R. North is up by default.
  const W = 720, H = 720;
  const R = (Math.min(W, H) / 2) - 28;
  const cx = W / 2, cy = H / 2;
  const proj = (alt, az) => {
    const r = R * (1 - alt / 90);
    const a = az * DEG;
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  };

  // Split band into segments that are above-horizon (avoids the path
  // diving below 0° altitude and coming back).
  const segments = useMemo(() => {
    const segs = [];
    let cur = [];
    for (const p of band) {
      if (p.alt > 0) cur.push(p);
      else if (cur.length) { segs.push(cur); cur = []; }
    }
    if (cur.length) segs.push(cur);
    return segs;
  }, [band]);

  const visibleArcDeg = segments.reduce((sum, s) => sum + (s.length - 1) * 2, 0);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: "var(--bg-base)", maxHeight: "75vh" }}>
        <defs>
          <radialGradient id="sky-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a1428" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0a0a16" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="mw-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a0a8c8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#5060a0" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky disc */}
        <circle cx={cx} cy={cy} r={R} fill="url(#sky-bg)" />

        {/* Altitude circles every 30° */}
        {[30, 60].map(alt => (
          <circle key={alt} cx={cx} cy={cy} r={R * (1 - alt / 90)}
            fill="none" stroke="var(--frame-border)" strokeWidth="0.5"
            strokeDasharray="2 4" opacity="0.4" />
        ))}
        {/* Altitude labels */}
        {[30, 60].map(alt => (
          <text key={alt} x={cx + 4} y={cy - R * (1 - alt / 90) + 3}
            fontSize="8" fontFamily="JetBrains Mono"
            fill="var(--text-subtle)">{alt}°</text>
        ))}
        {/* Zenith marker */}
        <circle cx={cx} cy={cy} r="2" fill="var(--accent-gold)" />
        <text x={cx + 5} y={cy + 3} fontSize="8" fontFamily="JetBrains Mono"
          fill="var(--accent-gold)">zenith</text>

        {/* Cardinal directions */}
        {[
          ["N",   0], ["E",  90], ["S", 180], ["W", 270],
        ].map(([label, az]) => {
          const a = az * DEG;
          const x = cx + (R + 16) * Math.sin(a);
          const y = cy - (R + 16) * Math.cos(a);
          return (
            <text key={label} x={x} y={y + 4} fontSize="14"
              fontFamily="Cinzel, serif" fill="var(--accent-gold)"
              textAnchor="middle">{label}</text>
          );
        })}
        {/* Horizon ring */}
        <circle cx={cx} cy={cy} r={R} fill="none"
          stroke="var(--accent-gold)" strokeWidth="1" opacity="0.7" />

        {/* Milky Way band — glow */}
        {segments.map((seg, i) => {
          const path = seg.map((p, j) => {
            const [x, y] = proj(p.alt, p.az);
            return `${j === 0 ? "M" : "L"} ${x} ${y}`;
          }).join(" ");
          return (
            <g key={"glow" + i}>
              <path d={path} fill="none" stroke="url(#mw-glow)" strokeWidth="42" opacity="0.7" strokeLinecap="round" />
              <path d={path} fill="none" stroke="#d0d4e8" strokeWidth="2.4" opacity="0.85" />
              <path d={path} fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
            </g>
          );
        })}

        {/* Named landmarks along the band */}
        {NAMED_LANDMARKS.map(L => {
          const eq = galacticToEquatorial(L.l, 0);
          const hz = equatorialToHorizontal(eq.ra, eq.dec, sidereal, observer.lat);
          if (hz.alt <= 0) return null;
          const [x, y] = proj(hz.alt, hz.az);
          return (
            <g key={L.l}>
              <circle cx={x} cy={y} r="3" fill={L.color} stroke="#0a0a16" strokeWidth="0.5" />
              <text x={x + 6} y={y + 3} fontSize="9" fontFamily="JetBrains Mono"
                fill={L.color}>{L.label}</text>
            </g>
          );
        })}

        {/* Galactic Center highlight */}
        {coreHz.alt > 0 && (() => {
          const [x, y] = proj(coreHz.alt, coreHz.az);
          return (
            <g>
              <circle cx={x} cy={y} r="9" fill="none" stroke="#ffd87a" strokeWidth="1.2" opacity="0.85">
                <animate attributeName="r" values="7;13;7" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.85;0.2;0.85" dur="2.6s" repeatCount="indefinite" />
              </circle>
              <circle cx={x} cy={y} r="3.5" fill="#ffd87a" />
            </g>
          );
        })()}
      </svg>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <div className="frame p-3">
          <div className="mono text-xs uppercase tracking-widest muted">Galactic Core</div>
          <div className="display gold text-lg">
            {coreHz.alt > 0 ? `${fmtDeg(coreHz.alt)}` : "below horizon"}
          </div>
          <div className="mono text-xs subtle">
            {coreHz.alt > 0
              ? `az ${fmtDeg(coreHz.az)} · ${coreHz.alt > 30 ? "well placed" : "low"}`
              : "wait for it to rise"}
          </div>
        </div>
        <div className="frame p-3">
          <div className="mono text-xs uppercase tracking-widest muted">Band visible arc</div>
          <div className="display gold text-lg">{visibleArcDeg}°</div>
          <div className="mono text-xs subtle">
            of 360° galactic longitude · {(visibleArcDeg / 360 * 100).toFixed(0)}% above horizon
          </div>
        </div>
        <div className="frame p-3">
          <div className="mono text-xs uppercase tracking-widest muted">Panorama tilt</div>
          <div className="display gold text-lg">
            {panoAngle != null ? `${panoAngle.toFixed(0)}°` : "—"}
          </div>
          <div className="mono text-xs subtle">
            band position angle near meridian — rotate camera to match for level pano
          </div>
        </div>
      </div>
    </div>
  );
}

/* Compute the position angle (PA, in degrees from local zenith toward east)
   of the Milky Way band where it crosses the local meridian. Returns null
   if no segment crosses the meridian. */
function computeBandPositionAngle(band) {
  // Find consecutive samples that bracket az = 180 (or az ~ 0 / 360 for the
  // other meridian half). Then compute the (alt, az) tangent direction.
  for (let i = 0; i < band.length - 1; i++) {
    const a = band[i], b = band[i + 1];
    if (a.alt < 0 && b.alt < 0) continue;
    // Detect transit through azimuth 180° (south meridian)
    const crossesSouth = (a.az < 180 && b.az >= 180) || (a.az > 180 && b.az <= 180);
    if (!crossesSouth) continue;
    // Tangent vector in local (alt, az) coords
    const dAlt = b.alt - a.alt;
    const dAz = b.az - a.az;
    // Position angle: 0 = up (zenith), 90 = east. Project to (north, east)
    // using small-angle approximation around the local point.
    const east = dAz * Math.cos((a.alt + b.alt) / 2 * DEG);
    const up = dAlt;
    const pa = Math.atan2(east, up) * RAD;
    return ((pa + 360) % 180);
  }
  return null;
}
