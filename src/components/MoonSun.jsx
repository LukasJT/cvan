import React from "react";
import { fmtDeg, fmtTime, moonPhaseName, MOON_NEGLIGIBLE_ALT_DEG } from "../astro.js";
import { DataCell } from "./shared.jsx";

export function MoonSun({ sky, curve }) {
  if (!sky) return null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel corner p-6">
          <div className="mono text-xs uppercase tracking-widest mb-3 muted">Sun</div>
          <div className="grid grid-cols-2 gap-3">
            <DataCell label="Rise" value={fmtTime(sky.sunEvents.rise)} />
            <DataCell label="Set" value={fmtTime(sky.sunEvents.set)} />
            <DataCell label="Solar Noon" value={fmtTime(sky.sunEvents.transit)} sub={`alt ${fmtDeg(sky.sunEvents.maxAlt)}`} />
            <DataCell label="Current Alt" value={fmtDeg(sky.sunHz.alt)} sub={sky.tw.name} />
          </div>

          <div className="mt-4">
            <div className="mono text-xs uppercase tracking-widest mb-2 muted">Twilight Phases</div>
            <TwilightTimeline twilights={sky.twilights} sunEvents={sky.sunEvents} />
          </div>
        </div>

        <div className="panel corner p-6">
          <div className="mono text-xs uppercase tracking-widest mb-3 muted">Moon</div>
          <div className="flex items-center gap-6 mb-4">
            <MoonGlyph illumination={sky.phase.illumination} phaseFraction={sky.phase.phaseFraction} />
            <div>
              <div className="display gold text-xl">{moonPhaseName(sky.phase.phaseFraction)}</div>
              <div className="mono text-sm mt-1 secondary">
                {(sky.phase.illumination * 100).toFixed(0)}% illuminated
              </div>
              <div className="mono text-xs muted">
                age {sky.phase.ageDays.toFixed(1)} days · synodic
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DataCell label="Rise" value={fmtTime(sky.moonEvents.rise)} />
            <DataCell label="Set" value={fmtTime(sky.moonEvents.set)} />
            <DataCell label="Transit" value={fmtTime(sky.moonEvents.transit)} sub={`alt ${fmtDeg(sky.moonEvents.maxAlt)}`} />
            <DataCell label="Current Alt" value={fmtDeg(sky.moonHz.alt)} sub={sky.moonHz.alt > 0 ? "above horizon" : "below horizon"} />
          </div>
        </div>
      </div>

      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">Moon Light Pollution Analysis</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="body text-sm primary">
              Current sky brightening from moon: <span className="display gold text-lg">+{sky.moonBrightness.toFixed(2)} mag/arcsec²</span>
            </div>
            <div className="body text-sm mt-2 secondary">
              Calculated using the Krisciunas-Schaefer (1991) sky brightness model, factoring moon altitude ({fmtDeg(sky.moonHz.alt)}) and phase angle ({fmtDeg(sky.phaseAngle)}).
            </div>
            <div className="mt-3 body text-sm secondary">
              <div className="mono text-xs uppercase tracking-widest mb-1 gold">Negligible-light threshold</div>
              For deep-sky and Milky Way work, the moon should be:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Below altitude {MOON_NEGLIGIBLE_ALT_DEG}° (atmospheric refraction makes geometric horizon ≈ −0.6°, but Δ-V drops below 0.1 mag once the moon is ~5° below)</li>
                <li>OR illumination &lt; 25% (waxing/waning crescent)</li>
                <li>Sky brightening should be &lt; 0.3 mag/arcsec² for serious deep-sky work</li>
              </ul>
            </div>
          </div>
          <div>
            <MoonAltCurve curve={curve} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MoonGlyph({ illumination, phaseFraction }) {
  const r = 30;
  const waxing = phaseFraction < 0.5;
  const k = 1 - 2 * illumination;
  return (
    <svg viewBox="-40 -40 80 80" width="80" height="80">
      <circle cx="0" cy="0" r={r} fill="var(--bg-grad-from)" stroke="var(--accent-gold)" strokeWidth="0.5" />
      <path
        d={`M 0 ${-r} A ${r} ${r} 0 0 ${waxing ? 1 : 0} 0 ${r} A ${Math.abs(k) * r} ${r} 0 0 ${k > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0)} 0 ${-r} Z`}
        fill="var(--moon-fill)"
      />
      <circle cx="-8" cy="-6" r="2" fill="var(--bg-base)" opacity="0.3" />
      <circle cx="6" cy="4" r="1.5" fill="var(--bg-base)" opacity="0.3" />
      <circle cx="2" cy="-12" r="1" fill="var(--bg-base)" opacity="0.3" />
    </svg>
  );
}

function TwilightTimeline({ twilights, sunEvents }) {
  const events = [
    { label: "Sunset", t: sunEvents.set, code: "set" },
    { label: "Civil End (−6°)", t: twilights.civil?.set, code: "civil" },
    { label: "Nautical End (−12°)", t: twilights.nautical?.set, code: "nautical" },
    { label: "Astro Night Begins (−18°)", t: twilights.astro?.set, code: "astro" },
    { label: "Astro Night Ends (−18°)", t: twilights.astro?.rise, code: "astro" },
    { label: "Nautical Begins (−12°)", t: twilights.nautical?.rise, code: "nautical" },
    { label: "Civil Begins (−6°)", t: twilights.civil?.rise, code: "civil" },
    { label: "Sunrise", t: sunEvents.rise, code: "rise" },
  ].filter(e => e.t).sort((a, b) => a.t - b.t);

  const colors = {
    set: "var(--accent-warm)",
    civil: "var(--warning)",
    nautical: "var(--accent-blue)",
    astro: "var(--accent-purple)",
    rise: "var(--accent-warm)",
  };

  return (
    <div className="space-y-1.5">
      {events.map((e, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className="mono text-xs" style={{ width: "60px", color: "var(--text-secondary)" }}>{fmtTime(e.t)}</span>
          <span style={{ width: "8px", height: "8px", background: colors[e.code], borderRadius: "50%" }} />
          <span className="body primary">{e.label}</span>
        </div>
      ))}
    </div>
  );
}

function MoonAltCurve({ curve }) {
  if (!curve) return null;
  const W = 350, H = 140, P = 25;
  const xScale = (h) => P + ((h - 0) / 36) * (W - P * 2);
  const yScale = (alt) => H - P - ((alt + 30) / 120) * (H - P * 2);
  const path = curve.map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(s.h)} ${yScale(s.moonAlt)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <line x1={P} y1={yScale(0)} x2={W - P} y2={yScale(0)} stroke="var(--accent-gold)" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.5" />
      <line x1={P} y1={yScale(MOON_NEGLIGIBLE_ALT_DEG)} x2={W - P} y2={yScale(MOON_NEGLIGIBLE_ALT_DEG)} stroke="var(--accent-green)" strokeWidth="0.5" strokeDasharray="1 3" opacity="0.4" />
      <text x={P} y={yScale(0) - 3} fontSize="8" fontFamily="JetBrains Mono" fill="var(--accent-gold)" opacity="0.7">HORIZON</text>
      <text x={P} y={yScale(MOON_NEGLIGIBLE_ALT_DEG) + 9} fontSize="8" fontFamily="JetBrains Mono" fill="var(--accent-green)" opacity="0.6">{MOON_NEGLIGIBLE_ALT_DEG}° (NEGLIGIBLE LIGHT)</text>
      <path d={path} fill="none" stroke="#e8e8e8" strokeWidth="1.5" />
      {[0, 12, 24, 36].map((h) => (
        <text key={h} x={xScale(h)} y={H - 6} fontSize="8" fontFamily="JetBrains Mono" fill="var(--text-muted)" textAnchor="middle">
          {((h + 12) % 24).toString().padStart(2, "0")}:00
        </text>
      ))}
      <text x={W / 2} y={12} fontSize="9" fontFamily="JetBrains Mono" fill="var(--text-muted)" textAnchor="middle" letterSpacing="2">MOON ALTITUDE · NEXT 36H</text>
    </svg>
  );
}
