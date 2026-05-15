import React, { useMemo, useState } from "react";
import {
  fmtDeg, fmtTime, azimuthName, moonPhaseName,
  computeSky, cloudCoverAt, altitudeCurve, BORTLE,
} from "../astro.js";
import { DataCell, FactorRow, OutOfRangeNotice, TimeOffsetSlider, Legend } from "./shared.jsx";
import { milkyWayVerdict, cloudVerdict } from "../verdicts.js";
import { AltitudeChart } from "./Overview.jsx";

const MAX_HOURS = 7 * 24; // one week

export function MilkyWay({ sky, weather, bortle, bortleAuto, curve, coords, now, weatherStale }) {
  if (!sky) return null;
  // `previewTime` is null when previewing "now"; a Date when the user has
  // dragged the slider to a specific 15-min slot. Storing absolute time
  // (not an offset) means the selected slot stays fixed while the live
  // clock ticks past it.
  const [previewTime, setPreviewTime] = useState(null);
  const tzName = weather?.timezone ?? null;
  const nowDate = now ?? new Date();
  const isNowPreview = previewTime == null;
  const effectivePreview = isNowPreview ? nowDate : previewTime;
  const offsetHours = isNowPreview ? 0 : (effectivePreview.getTime() - nowDate.getTime()) / 3600000;

  const previewSky = useMemo(
    () => isNowPreview ? sky : computeSky(effectivePreview, coords),
    [sky, effectivePreview, coords, isNowPreview]
  );
  const previewCloud = useMemo(() => {
    if (isNowPreview) return weatherStale ? null : weather?.current?.cloud_cover ?? null;
    return cloudCoverAt(weather, effectivePreview.getTime());
  }, [isNowPreview, effectivePreview, weather, weatherStale]);
  const previewCloudOutOfRange = !isNowPreview && previewCloud == null;

  // The Right-Now panel and overall verdict stay anchored to the actual now,
  // so the headline assessment doesn't change as you drag the slider.
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
                MEASURED · SQM <span className="gold">{bortleAuto.sqm.toFixed(2)}</span> · LPI <span className="gold">{bortleAuto.lpi.toFixed(2)}</span>× NATURAL · ZONE <span className="gold">{bortleAuto.zone}</span>
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
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">
          Conditions Affecting {isNowPreview ? "Tonight's View" : "Previewed View"}
        </div>
        <TimeOffsetSlider
          now={nowDate}
          previewTime={previewTime}
          setPreviewTime={setPreviewTime}
          maxHours={MAX_HOURS}
          tzName={tzName}
          label="View at"
        />
        <div className="space-y-3">
          {bortleInfo ? (
            <FactorRow label="Light pollution (Bortle)" status={bortle <= 3 ? "good" : bortle <= 5 ? "fair" : "bad"} note={`Class ${bortle} — ${bortleInfo.name}. ${bortleInfo.mw}`} />
          ) : (
            <FactorRow label="Light pollution (Bortle)" status="unknown" note="Light-pollution atlas tile unavailable for this location — light pollution excluded from analysis." />
          )}
          <FactorRow label="Moon" status={previewSky.moonBrightness < 0.3 ? "good" : previewSky.moonBrightness < 1.5 ? "fair" : "bad"}
            note={`${moonPhaseName(previewSky.phase.phaseFraction)} (${(previewSky.phase.illumination * 100).toFixed(0)}% illuminated), altitude ${fmtDeg(previewSky.moonHz.alt)}. Sky brightening +${previewSky.moonBrightness.toFixed(2)} mag (Krisciunas-Schaefer model). Moon must be below horizon — and below roughly −5° to make moonlight negligible (Δ-V < 0.1 mag).`} />
          <FactorRow label="Twilight" status={previewSky.tw.code === "night" ? "good" : previewSky.tw.code === "astro" ? "fair" : "bad"}
            note={`${previewSky.tw.name} — sun at ${fmtDeg(previewSky.sunHz.alt)}. Galactic core requires astronomical night (sun < −18°) for full contrast.`} />
          <FactorRow
            label="Cloud cover"
            status={previewCloudOutOfRange || (isNowPreview && weatherStale) ? "unknown" : previewCloud == null ? "unknown" : previewCloud < 30 ? "good" : previewCloud < 60 ? "fair" : "bad"}
            note={
              previewCloudOutOfRange
                ? "Beyond 16-day Open-Meteo forecast — cloud cover not factored into score."
                : (isNowPreview && weatherStale)
                  ? "Out of weather forecast range — cloud cover not factored into score."
                  : previewCloud != null
                    ? `${previewCloud}% — ${cloudVerdict(previewCloud)}`
                    : "weather data unavailable"
            } />
          <FactorRow label="Galactic core altitude" status={previewSky.coreHz.alt > 30 ? "good" : previewSky.coreHz.alt > 10 ? "fair" : "bad"}
            note={`Core at ${fmtDeg(previewSky.coreHz.alt)} altitude, ${fmtDeg(previewSky.coreHz.az)} azimuth (${azimuthName(previewSky.coreHz.az)}). Higher altitude = thinner atmosphere = more contrast. Best viewing >30°.`} />
        </div>
        {(weatherStale && isNowPreview) && <OutOfRangeNotice what="Cloud cover forecast" horizon="16 days from today" />}
      </div>

      <MilkyWayNightChart coords={coords} now={now ?? new Date()} tzName={tzName} />
    </div>
  );
}

/* "Night by night" chart at the bottom of the Milky Way tab. Same visual
   as Tonight's altitude chart, but with its own day-resolution slider so
   the user can scrub forward through the next week and see how the
   Milky Way band rises/sets vs. the moon and sun on each future night. */
function MilkyWayNightChart({ coords, now, tzName }) {
  const [dayOffset, setDayOffset] = useState(0);
  const anchor = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [now, dayOffset]);

  const curve = useMemo(() => altitudeCurve(anchor, coords.lat, coords.lon), [anchor, coords.lat, coords.lon]);

  const fmt = (d, opts) =>
    tzName ? d.toLocaleString([], { ...opts, timeZone: tzName })
           : d.toLocaleString([], opts);

  return (
    <div className="panel corner p-6">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div className="mono text-xs uppercase tracking-widest muted">Milky Way · Altitude vs Time · Night-by-Night</div>
        <div className="mono text-xs subtle">Drag the slider to scrub through the next 7 nights</div>
      </div>

      <div className="frame p-3 mb-3">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono text-xs uppercase tracking-widest muted">Night of</span>
            <span className="display gold text-sm">
              {fmt(anchor, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
            {dayOffset > 0 && <span className="mono text-xs subtle">+{dayOffset} day{dayOffset === 1 ? "" : "s"}</span>}
          </div>
          <button
            className="ghost"
            onClick={() => setDayOffset(0)}
            disabled={dayOffset === 0}
            style={{ opacity: dayOffset === 0 ? 0.4 : 1, padding: "0.25rem 0.6rem", fontSize: "0.65rem" }}
          >
            TONIGHT
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={7}
          step={1}
          value={dayOffset}
          onChange={(e) => setDayOffset(parseInt(e.target.value))}
          style={{ width: "100%" }}
        />
        <div className="mono text-xs flex justify-between mt-1 subtle">
          <span>tonight</span>
          <span>+3d</span>
          <span>+7d</span>
        </div>
      </div>

      <AltitudeChart curve={curve} />
      <div className="mt-3 flex gap-4 mono text-xs flex-wrap secondary">
        <Legend color="var(--accent-warm)" label="Sun" />
        <Legend color="#e8e8e8" label="Moon" />
        <Legend color="var(--accent-purple)" label="Milky Way Core (tick = band tilt in sky)" />
        <Legend color="var(--accent-green)" label="Astronomical night" dashed />
      </div>
      <div className="mono text-xs mt-2 subtle">
        The purple curve is the Galactic Core's altitude. At each hour, a short tick is
        drawn through the core: its tilt matches how the Milky Way is angled in the sky
        at that moment, and its length is scaled to how much of the bright band (Norma →
        bulge → Cygnus → Cassiopeia) is above the horizon. From a mid-latitude northern
        site only the half running from the bulge toward Cygnus is visible, so the tick
        stays short — far from a horizon-to-horizon arc.
      </div>
    </div>
  );
}
