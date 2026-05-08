import React from "react";
import { fmtDeg, fmtTime, azimuthName, moonPhaseName } from "../astro.js";
import { DataCell, FactorRow, OutOfRangeNotice } from "./shared.jsx";
import { milkyWayVerdict, cloudVerdict } from "../verdicts.js";
import { BORTLE } from "../astro.js";

export function MilkyWay({ sky, weather, bortle, bortleAuto, curve, coords, weatherStale }) {
  if (!sky) return null;
  const cloud = weatherStale ? null : weather?.current?.cloud_cover ?? null;
  const verdict = milkyWayVerdict(sky, bortle ?? 4, cloud, curve);
  const bortleInfo = bortle != null ? BORTLE[bortle - 1] : null;

  let bestTime = null, bestAlt = -90;
  if (curve) {
    curve.forEach((s) => {
      if (s.sunAlt < -18 && s.coreAlt > bestAlt) {
        bestAlt = s.coreAlt;
        bestTime = s.t;
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel corner p-6">
          <div className="mono text-xs uppercase tracking-widest mb-3 muted">Galactic Core · Right Now</div>
          <div className="grid grid-cols-2 gap-4">
            <DataCell label="Altitude" value={fmtDeg(sky.coreHz.alt)} sub={sky.coreHz.alt > 30 ? "well placed" : sky.coreHz.alt > 0 ? "low" : "below horizon"} />
            <DataCell label="Azimuth" value={fmtDeg(sky.coreHz.az)} sub={azimuthName(sky.coreHz.az)} />
            <DataCell label="Best Tonight" value={bestTime ? fmtTime(bestTime) : "—"} sub={bestAlt > -90 ? `at ${fmtDeg(bestAlt)}` : "core not up at night"} />
            <DataCell label="Twilight" value={sky.tw.name} sub={sky.tw.code === "night" ? "✓ dark sky" : "wait"} />
          </div>
        </div>

        <div className="panel corner p-6">
          <div className="mono text-xs uppercase tracking-widest mb-3 muted">Verdict</div>
          <div className="display text-2xl mb-2" style={{ color: verdict.color }}>{verdict.rating}</div>
          <div className="body text-base primary">{verdict.text}</div>
          {verdict.note && <div className="body text-xs mt-2 muted italic">{verdict.note}</div>}
        </div>
      </div>

      {bortleInfo && (
        <div className="panel corner p-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="mono text-xs uppercase tracking-widest muted">Bortle Scale · What You'll See at Class {bortle}</div>
            {bortleAuto && (
              <div className="mono text-xs secondary">
                MEASURED · SQM <span className="gold">{bortleAuto.sqm.toFixed(2)}</span> · VIIRS <span className="gold">{bortleAuto.radiance.toFixed(2)}</span> nW/cm²/sr · ARTIFICIAL <span className="gold">{bortleAuto.artificial.toFixed(2)}</span> mcd/m²
              </div>
            )}
          </div>
          <div className="frame p-4 mb-4" style={{ background: bortleInfo.color, color: bortle <= 4 ? "#e8d9a8" : "#0a0a0a" }}>
            <div className="display text-lg">{bortleInfo.name.toUpperCase()}</div>
            <div className="mono text-xs mt-1 opacity-80">SQM {bortleInfo.sqm} mag/arcsec²</div>
            <div className="body text-base mt-2">{bortleInfo.mw}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-1">
            {BORTLE.map((b) => (
              <div key={b.c} className={`p-2 ${b.c === bortle ? "frame" : ""}`} style={{ background: b.color, color: b.c <= 4 ? "#e8d9a8" : "#0a0a0a", opacity: b.c === bortle ? 1 : 0.55 }}>
                <div className="display text-sm">{b.c}</div>
                <div className="mono text-xs opacity-80">{b.sqm.split("–")[0]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">Conditions Affecting Tonight's View</div>
        <div className="space-y-3">
          {bortleInfo ? (
            <FactorRow label="Light pollution (Bortle)" status={bortle <= 3 ? "good" : bortle <= 5 ? "fair" : "bad"} note={`Class ${bortle} — ${bortleInfo.name}. ${bortleInfo.mw}`} />
          ) : (
            <FactorRow label="Light pollution (Bortle)" status="unknown" note="VIIRS data unavailable for this location — light pollution excluded from analysis." />
          )}
          <FactorRow label="Moon" status={sky.moonBrightness < 0.3 ? "good" : sky.moonBrightness < 1.5 ? "fair" : "bad"}
            note={`${moonPhaseName(sky.phase.phaseFraction)} (${(sky.phase.illumination * 100).toFixed(0)}% illuminated), altitude ${fmtDeg(sky.moonHz.alt)}. Sky brightening +${sky.moonBrightness.toFixed(2)} mag (Krisciunas-Schaefer model). Moon must be below horizon — and below roughly −5° to make moonlight negligible (Δ-V < 0.1 mag).`} />
          <FactorRow label="Twilight" status={sky.tw.code === "night" ? "good" : sky.tw.code === "astro" ? "fair" : "bad"}
            note={`${sky.tw.name} — sun at ${fmtDeg(sky.sunHz.alt)}. Galactic core requires astronomical night (sun < −18°) for full contrast.`} />
          <FactorRow
            label="Cloud cover"
            status={weatherStale ? "unknown" : cloud == null ? "unknown" : cloud < 30 ? "good" : cloud < 60 ? "fair" : "bad"}
            note={weatherStale ? "Out of weather forecast range — cloud cover not factored into score." : cloud != null ? `${cloud}% — ${cloudVerdict(cloud)}` : "weather data unavailable"} />
          <FactorRow label="Galactic core altitude" status={sky.coreHz.alt > 30 ? "good" : sky.coreHz.alt > 10 ? "fair" : "bad"}
            note={`Core at ${fmtDeg(sky.coreHz.alt)} altitude, ${fmtDeg(sky.coreHz.az)} azimuth (${azimuthName(sky.coreHz.az)}). Higher altitude = thinner atmosphere = more contrast. Best viewing >30°.`} />
        </div>
        {weatherStale && <OutOfRangeNotice what="Cloud cover forecast" horizon="16 days from today" />}
      </div>
    </div>
  );
}
