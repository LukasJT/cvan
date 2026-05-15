import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  fmtDeg, fmtTime, KP_VIEW_LAT, geomagneticLatitude, DEG, moonPhaseName,
  computeSky, cloudCoverAt, kpAt, parseLocationTime,
} from "../astro.js";
import { DataCell, FactorRow, OutOfRangeNotice, TimeOffsetSlider } from "./shared.jsx";
import { MapPanel } from "./MapPicker.jsx";
import { auroraVerdict, cloudVerdict } from "../verdicts.js";

const MAX_HOURS = 72; // three days

export function Aurora({
  aurora, weather, bortle, sky, coords, kpForecast, now, weatherStale,
  bortleAuto, mapOverlays, setMapOverlays,
}) {
  if (!aurora) {
    return (
      <div className="panel corner p-6 text-center">
        <div className="display gold text-lg mb-2">NOAA SWPC FEED UNAVAILABLE</div>
        <p className="body secondary">Real-time aurora data could not be fetched. Try refreshing.</p>
      </div>
    );
  }

  const [mode, setMode] = useState("forecast");

  return (
    <div className="space-y-6">
      <ModeToggle mode={mode} setMode={setMode} />
      {mode === "forecast" ? (
        <ForecastView
          aurora={aurora} weather={weather} bortle={bortle} sky={sky}
          coords={coords} kpForecast={kpForecast} now={now} weatherStale={weatherStale}
        />
      ) : (
        <LiveView
          aurora={aurora} weather={weather} bortle={bortle} sky={sky}
          coords={coords} now={now} weatherStale={weatherStale}
          bortleAuto={bortleAuto}
        />
      )}
      <Aurora3DayMap
        coords={coords}
        weather={weather}
        aurora={aurora}
        bortleAuto={bortleAuto}
        kpForecast={kpForecast}
        now={now}
        mapOverlays={mapOverlays}
        setMapOverlays={setMapOverlays}
      />
    </div>
  );
}

function ModeToggle({ mode, setMode }) {
  const tabs = [
    { key: "forecast", label: "Forecast", sub: "Plan a night" },
    { key: "live", label: "Live · Now", sub: "Aurora-watching" },
  ];
  return (
    <div className="panel corner p-2 flex gap-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setMode(t.key)}
          className="ghost"
          style={{
            flex: 1,
            padding: "0.6rem 0.8rem",
            background: mode === t.key ? "var(--strip-bg)" : "transparent",
            borderColor: mode === t.key ? "var(--accent-gold)" : "var(--frame-border)",
            color: mode === t.key ? "var(--accent-gold)" : "var(--text-muted)",
            cursor: "pointer",
            borderRadius: 2,
          }}
        >
          <div className="display" style={{ fontSize: "0.85rem", letterSpacing: "0.08em" }}>{t.label}</div>
          <div className="mono" style={{ fontSize: "0.62rem", opacity: 0.75, marginTop: 2 }}>{t.sub}</div>
        </button>
      ))}
    </div>
  );
}

/* ============================================================== FORECAST VIEW
   Long-term planning: viewing geometry, conditions panel, 3-day Kp spark. */
function ForecastView({ aurora, weather, bortle, sky, coords, kpForecast, now, weatherStale }) {
  const [previewTime, setPreviewTime] = useState(null);
  const tzName = weather?.timezone ?? null;
  const nowDate = now ?? new Date();
  const isNowPreview = previewTime == null;
  const effectivePreview = isNowPreview ? nowDate : previewTime;

  const previewKpBucket = useMemo(() => {
    if (isNowPreview) return null;
    return kpAt(kpForecast, effectivePreview.getTime());
  }, [kpForecast, effectivePreview, isNowPreview]);
  const kp = previewKpBucket ? previewKpBucket.kp : aurora.kp;
  const kpSource = isNowPreview
    ? "current observed"
    : previewKpBucket
      ? (previewKpBucket.observed === "predicted" ? "predicted" : "observed")
      : "current observed (forecast OOR)";

  const threshold = KP_VIEW_LAT[Math.floor(kp)] ?? 50;
  const geomagLat = geomagneticLatitude(coords.lat, coords.lon);
  const absGeoLat = Math.abs(geomagLat);

  const previewSky = useMemo(
    () => isNowPreview ? sky : computeSky(effectivePreview, coords),
    [sky, effectivePreview, coords, isNowPreview]
  );
  const previewCloud = useMemo(() => {
    if (isNowPreview) return weatherStale ? null : weather?.current?.cloud_cover ?? null;
    return cloudCoverAt(weather, effectivePreview.getTime());
  }, [isNowPreview, effectivePreview, weather, weatherStale]);
  const previewCloudOutOfRange = !isNowPreview && previewCloud == null;

  const cloud = weatherStale ? null : weather?.current?.cloud_cover ?? null;
  const verdict = auroraVerdict(aurora, coords.lat, cloud, geomagLat);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="panel corner p-6">
          <div className="mono text-xs uppercase tracking-widest mb-3 muted">NOAA Planetary Kp</div>
          <KpDial kp={aurora.kp} />
          <div className="mono text-xs text-center mt-2 muted">
            updated {new Date(aurora.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        <div className="panel corner p-6 lg:col-span-2">
          <div className="mono text-xs uppercase tracking-widest mb-3 muted">Viewing Geometry · Geomagnetic Coordinates</div>
          <ViewingLatDiagram kp={aurora.kp} userGeoLat={absGeoLat} threshold={KP_VIEW_LAT[Math.floor(aurora.kp)] ?? 50} />
          <div className="grid grid-cols-3 gap-3 mt-4">
            <DataCell label="Geographic |Lat|" value={fmtDeg(Math.abs(coords.lat), 1)} />
            <DataCell label="Geomagnetic |Lat|" value={fmtDeg(absGeoLat, 1)} sub="dipole approx" />
            <DataCell label="Threshold @ Kp" value={fmtDeg(KP_VIEW_LAT[Math.floor(aurora.kp)] ?? 50)} sub="geomag lat" />
          </div>
          <div className="mt-3 mono text-xs secondary">
            Margin: <span className="gold">{(absGeoLat - (KP_VIEW_LAT[Math.floor(aurora.kp)] ?? 50) > 0 ? "+" : "")}{(absGeoLat - (KP_VIEW_LAT[Math.floor(aurora.kp)] ?? 50)).toFixed(1)}°</span>
            {" "}{absGeoLat > (KP_VIEW_LAT[Math.floor(aurora.kp)] ?? 50) ? "above viewing threshold" : "below threshold (need higher Kp)"}
          </div>
        </div>
      </div>

      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">Verdict</div>
        <div className="display text-2xl mb-2" style={{ color: verdict.color }}>{verdict.rating}</div>
        <div className="body text-base primary">{verdict.text}</div>
      </div>

      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">
          Conditions Affecting {isNowPreview ? "Aurora Viewing" : "Previewed Aurora Viewing"}
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
          <FactorRow label="Geomagnetic activity (Kp)" status={kp >= 5 ? "good" : kp >= 4 ? "fair" : "bad"}
            note={`Kp = ${kp.toFixed(1)} (${kpSource}). Aurora visible at geomagnetic latitudes ≥ ${threshold}°. Kp ≥ 5 = G1 storm; Kp ≥ 7 = G3 strong storm reaching mid-latitudes.`} />
          <FactorRow label="Your geomagnetic latitude" status={absGeoLat >= threshold ? "good" : absGeoLat >= threshold - 5 ? "fair" : "bad"}
            note={`At ${absGeoLat.toFixed(1)}° geomag |lat| (geographic ${Math.abs(coords.lat).toFixed(1)}°), ${absGeoLat >= threshold ? "you're inside the auroral oval for this Kp." : "you'd need higher Kp or to travel poleward."}`} />
          <FactorRow label="Cloud cover"
            status={previewCloudOutOfRange || (isNowPreview && weatherStale) ? "unknown" : previewCloud == null ? "unknown" : previewCloud < 30 ? "good" : previewCloud < 60 ? "fair" : "bad"}
            note={
              previewCloudOutOfRange
                ? "Beyond 16-day Open-Meteo forecast — clouds excluded from score."
                : (isNowPreview && weatherStale)
                  ? "Out of weather forecast range — clouds excluded from score."
                  : previewCloud != null
                    ? `${previewCloud}% — aurora is in upper atmosphere (~100km) so any clouds block it entirely.`
                    : "weather data unavailable"
            } />
          <FactorRow label="Moon" status={previewSky.moonBrightness < 0.5 ? "good" : previewSky.moonBrightness < 2 ? "fair" : "bad"}
            note={`${moonPhaseName(previewSky.phase.phaseFraction)}, sky brightening +${previewSky.moonBrightness.toFixed(2)} mag. Bright aurora overpowers moonlight; faint diffuse aurora gets washed out.`} />
          <FactorRow label="City light pollution" status={bortle == null ? "unknown" : bortle <= 4 ? "good" : bortle <= 6 ? "fair" : "bad"}
            note={bortle != null ? `Bortle ${bortle}. Strong aurora visible from cities; subtle green glow needs Bortle ≤ 4. Look toward magnetic north — get away from streetlights.` : "Light-pollution atlas tile unavailable for this location."} />
          <FactorRow label="Twilight" status={previewSky.tw.code === "night" ? "good" : previewSky.tw.code === "astro" || previewSky.tw.code === "nautical" ? "fair" : "bad"}
            note={`${previewSky.tw.name}. Aurora visible during nautical twilight if strong, but full darkness gives best contrast.`} />
        </div>
        {(weatherStale && isNowPreview) && <OutOfRangeNotice what="Cloud cover forecast" horizon="16 days from today" />}
      </div>

      {kpForecast && kpForecast.length > 0 && (
        <Aurora3DayChart
          kpForecast={kpForecast}
          now={nowDate}
          previewTime={previewTime}
          setPreviewTime={setPreviewTime}
          maxHours={MAX_HOURS}
        />
      )}
    </div>
  );
}

/* ============================================================== LIVE VIEW
   Real-time conditions while you're actively aurora-watching. Pulls
   solar wind plasma + magnetic-field data from NOAA SWPC, refreshes
   every minute, and surfaces the aurora-relevant numbers (Bz, wind
   speed/density, IMF Bt). Plus tonight's viewing-conditions readout. */
function LiveView({ aurora, weather, bortle, sky, coords, now, weatherStale, bortleAuto }) {
  const plasma = useNoaaProductSeries("plasma");
  const mag = useNoaaProductSeries("mag");

  const latestP = plasma?.[plasma.length - 1];
  const latestM = mag?.[mag.length - 1];

  // Dim/dark countdown — astro night transitions for "today around now".
  const tw = sky?.tw?.code ?? "day";
  const sunAlt = sky?.sunHz?.alt ?? 0;
  const cloudPct = weatherStale ? null : weather?.current?.cloud_cover ?? null;
  const cloudTrend = useMemo(() => cloudTrendDescription(weather, now), [weather, now]);

  // Aurora vigour heuristic from Bz: highly negative Bz (southward IMF) drives
  // strong reconnection, hence aurora. Also factor wind speed > 500 km/s.
  const bz = latestM?.bz ?? null;
  const speed = latestP?.speed ?? null;
  const density = latestP?.density ?? null;
  const bt = latestM?.bt ?? null;

  const auroraOutlook = useMemo(() => {
    if (bz == null || speed == null) return { label: "—", color: "var(--text-muted)", note: "Awaiting solar wind data…" };
    if (bz <= -10 && speed >= 500) return { label: "Active", color: "var(--accent-green)", note: "Strongly southward IMF Bz with fast wind — aurora likely intensifying." };
    if (bz <= -5  && speed >= 400) return { label: "Possible", color: "var(--accent-gold)", note: "Southward Bz feeding the magnetosphere; watch for substorms." };
    if (bz <= -3) return { label: "Quiet but tilted", color: "var(--accent-blue)", note: "Slightly southward Bz; only background activity expected." };
    return { label: "Quiet", color: "var(--text-muted)", note: "Bz northward — magnetosphere closed, aurora unlikely to brighten." };
  }, [bz, speed]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="panel corner p-6 text-center">
          <div className="mono text-xs uppercase tracking-widest mb-2 muted">Live Kp · 1-min</div>
          <BigNumber value={aurora.kp.toFixed(1)} unit="Kp" color={kpColor(aurora.kp)} />
          <div className="mono text-xs mt-2 muted">
            updated {new Date(aurora.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className="panel corner p-6 text-center">
          <div className="mono text-xs uppercase tracking-widest mb-2 muted">Outlook · IMF + Wind</div>
          <div className="display text-2xl" style={{ color: auroraOutlook.color, letterSpacing: "0.1em" }}>
            {auroraOutlook.label.toUpperCase()}
          </div>
          <div className="body text-sm mt-2 secondary">{auroraOutlook.note}</div>
        </div>
        <div className="panel corner p-6 text-center">
          <div className="mono text-xs uppercase tracking-widest mb-2 muted">Sky right now</div>
          <SkySummaryBlock sunAlt={sunAlt} tw={tw} sky={sky} bortle={bortle} bortleAuto={bortleAuto} cloud={cloudPct} cloudTrend={cloudTrend} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SeriesCard
          title="Solar wind speed"
          unit="km/s"
          value={speed != null ? speed.toFixed(0) : "—"}
          accent={speed >= 500 ? "var(--accent-green)" : speed >= 400 ? "var(--accent-gold)" : "var(--text-muted)"}
          series={plasma?.map((d) => ({ t: d.t, v: d.speed }))}
          yMin={250} yMax={900}
          lines={[{ y: 500, label: "fast" }]}
        />
        <SeriesCard
          title="IMF Bz · GSM"
          unit="nT"
          value={bz != null ? bz.toFixed(1) : "—"}
          subtitle={bz != null && bz < 0 ? "southward — feeds aurora" : bz != null ? "northward — quiet" : ""}
          accent={bz != null && bz <= -5 ? "var(--accent-green)" : bz != null && bz <= -3 ? "var(--accent-gold)" : "var(--text-muted)"}
          series={mag?.map((d) => ({ t: d.t, v: d.bz }))}
          yMin={-25} yMax={25}
          zeroLine
          lines={[{ y: -5, label: "−5 nT" }]}
        />
        <SeriesCard
          title="Solar wind density"
          unit="p/cm³"
          value={density != null ? density.toFixed(1) : "—"}
          accent={density >= 10 ? "var(--accent-green)" : "var(--text-muted)"}
          series={plasma?.map((d) => ({ t: d.t, v: d.density }))}
          yMin={0} yMax={30}
        />
        <SeriesCard
          title="IMF total · Bt"
          unit="nT"
          value={bt != null ? bt.toFixed(1) : "—"}
          subtitle="vector magnitude of B"
          accent={bt >= 10 ? "var(--accent-green)" : "var(--text-muted)"}
          series={mag?.map((d) => ({ t: d.t, v: d.bt }))}
          yMin={0} yMax={30}
        />
      </div>

      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">Tonight's viewing conditions</div>
        <ConditionsStrip
          sky={sky}
          cloud={cloudPct}
          cloudTrend={cloudTrend}
          weatherStale={weatherStale}
          bortle={bortle}
          bortleAuto={bortleAuto}
          weather={weather}
          now={now}
        />
      </div>
    </div>
  );
}

/* Bottom 3-day map, embedded in both modes. The user can scroll a
   slider to see the auroral oval and day/night terminator at any time
   in the next 3 days. The user's location is pinned (clicks suppressed)
   so they can see the oval shift relative to where they actually are. */
function Aurora3DayMap({ coords, weather, aurora, bortleAuto, kpForecast, now, mapOverlays, setMapOverlays }) {
  const [previewTime, setPreviewTime] = useState(null);
  const tzName = weather?.timezone ?? null;
  const nowDate = now ?? new Date();
  const isNowPreview = previewTime == null;
  const effectivePreview = isNowPreview ? nowDate : previewTime;
  // Override Kp with the previewed-time Kp so the oval intensity colour
  // shifts with the slider.
  const previewKp = useMemo(() => {
    if (isNowPreview) return aurora?.kp;
    const b = kpAt(kpForecast, effectivePreview.getTime());
    return b ? b.kp : aurora?.kp;
  }, [aurora, kpForecast, effectivePreview, isNowPreview]);

  const syntheticAurora = useMemo(
    () => aurora ? { ...aurora, kp: previewKp } : null,
    [aurora, previewKp]
  );

  // Always force the oval and day/night on for this map; users came here
  // specifically to see the oval, and the day/night band is the most
  // useful context for whether aurora is observable at the cursor time.
  const auroraMapOverlays = useMemo(
    () => ({ ...(mapOverlays ?? {}), auroralOval: true, daynight: true }),
    [mapOverlays]
  );

  return (
    <div className="panel corner p-6">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div className="mono text-xs uppercase tracking-widest muted">3-Day Auroral Oval Map</div>
        <div className="mono text-xs subtle">Slide to see how the oval moves; pin = your location</div>
      </div>
      <TimeOffsetSlider
        now={nowDate}
        previewTime={previewTime}
        setPreviewTime={setPreviewTime}
        maxHours={MAX_HOURS}
        tzName={tzName}
        label="Map time"
      />
      <MapPanel
        coords={coords}
        onPick={() => { /* read-only — preserve user's chosen coords */ }}
        weather={weather}
        aurora={syntheticAurora}
        bortleAuto={bortleAuto}
        now={effectivePreview}
        overlays={auroraMapOverlays}
        setOverlays={setMapOverlays}
      />
    </div>
  );
}

/* ============================================================== HELPERS */

function BigNumber({ value, unit, color }) {
  return (
    <div>
      <span className="display" style={{ color, fontSize: "3.4rem", lineHeight: 1, letterSpacing: "0.04em" }}>{value}</span>
      <span className="mono text-xs muted" style={{ marginLeft: 6 }}>{unit}</span>
    </div>
  );
}

function kpColor(kp) {
  if (kp >= 7) return "var(--error)";
  if (kp >= 5) return "var(--warning)";
  if (kp >= 4) return "var(--accent-gold)";
  if (kp >= 3) return "var(--accent-green)";
  return "var(--text-muted)";
}

function SeriesCard({ title, unit, value, subtitle, accent, series, yMin, yMax, lines = [], zeroLine }) {
  return (
    <div className="panel corner p-5">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div className="mono text-xs uppercase tracking-widest muted">{title}</div>
        {subtitle && <div className="mono text-xs subtle">{subtitle}</div>}
      </div>
      <div>
        <span className="display" style={{ color: accent, fontSize: "2rem", lineHeight: 1 }}>{value}</span>
        <span className="mono text-xs muted" style={{ marginLeft: 4 }}>{unit}</span>
      </div>
      <MiniSpark series={series} yMin={yMin} yMax={yMax} accent={accent} lines={lines} zeroLine={zeroLine} />
    </div>
  );
}

function MiniSpark({ series, yMin, yMax, accent, lines = [], zeroLine }) {
  if (!series || series.length < 2) {
    return <div className="mono text-xs subtle mt-3" style={{ height: 60 }}>Awaiting data…</div>;
  }
  const W = 600, H = 60, P = 4;
  const xs = series.map((_, i) => P + (i / (series.length - 1)) * (W - P * 2));
  const yScale = (v) => {
    const t = (v - yMin) / (yMax - yMin);
    return H - P - Math.max(0, Math.min(1, t)) * (H - P * 2);
  };
  const path = series.map((d, i) =>
    Number.isFinite(d.v) ? `${i === 0 ? "M" : "L"} ${xs[i]} ${yScale(d.v)}` : ""
  ).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ marginTop: 8 }}>
      {zeroLine && (
        <line x1={P} y1={yScale(0)} x2={W - P} y2={yScale(0)} stroke="var(--text-muted)" strokeDasharray="2 4" strokeWidth="0.5" opacity="0.4" />
      )}
      {lines.map((l, i) => (
        <g key={i}>
          <line x1={P} y1={yScale(l.y)} x2={W - P} y2={yScale(l.y)} stroke="var(--text-muted)" strokeDasharray="2 4" strokeWidth="0.5" opacity="0.4" />
          {l.label && <text x={P + 2} y={yScale(l.y) - 2} fontSize="7" fontFamily="JetBrains Mono" fill="var(--text-muted)">{l.label}</text>}
        </g>
      ))}
      <path d={path} fill="none" stroke={accent} strokeWidth="1.5" />
    </svg>
  );
}

function SkySummaryBlock({ sunAlt, tw, sky, bortle, bortleAuto, cloud, cloudTrend }) {
  return (
    <div className="text-left mt-2 mono text-xs space-y-1">
      <div>
        <span className="muted">Twilight: </span>
        <span className="gold">{sky?.tw?.name ?? "—"}</span>
        <span className="subtle"> · sun {sunAlt.toFixed(0)}°</span>
      </div>
      <div>
        <span className="muted">Moon: </span>
        <span className="gold">{moonPhaseName(sky?.phase?.phaseFraction ?? 0)}</span>
        <span className="subtle"> · brightening +{(sky?.moonBrightness ?? 0).toFixed(2)} mag</span>
      </div>
      <div>
        <span className="muted">Bortle: </span>
        <span className="gold">{bortle != null ? `Class ${bortle}` : "—"}</span>
        {bortleAuto && <span className="subtle"> · SQM {bortleAuto.sqm.toFixed(2)}</span>}
      </div>
      <div>
        <span className="muted">Cloud: </span>
        <span className="gold">{cloud != null ? `${cloud}%` : "—"}</span>
        {cloudTrend && <span className="subtle"> · {cloudTrend}</span>}
      </div>
    </div>
  );
}

function ConditionsStrip({ sky, cloud, cloudTrend, weatherStale, bortle, bortleAuto, weather, now }) {
  const tzOffsetSec = weather?.utc_offset_seconds ?? 0;
  const tw = sky?.tw?.code ?? "day";
  const darknessLeft = useMemo(() => {
    if (!weather || !sky || !sky.twilights?.astro) return null;
    const t = sky.twilights.astro;
    return darknessCountdown(now ?? new Date(), t, tw);
  }, [weather, sky, now, tw]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <DataCell
        label="Darkness"
        value={darknessLeft?.value ?? "—"}
        sub={darknessLeft?.sub ?? sky?.tw?.name ?? ""}
      />
      <DataCell
        label="Clouds (now)"
        value={cloud != null ? `${cloud}%` : "—"}
        sub={cloudTrend ?? (weatherStale ? "out of forecast" : "")}
      />
      <DataCell
        label="Moon"
        value={sky ? `+${sky.moonBrightness.toFixed(1)} mag` : "—"}
        sub={sky ? `${moonPhaseName(sky.phase.phaseFraction)} · alt ${fmtDeg(sky.moonHz.alt)}` : ""}
      />
      <DataCell
        label="Light pollution"
        value={bortle != null ? `Bortle ${bortle}` : "—"}
        sub={bortleAuto ? `SQM ${bortleAuto.sqm.toFixed(2)} · zone ${bortleAuto.zone}` : ""}
      />
    </div>
  );
}

/* Estimate how long the current cloud-cover bucket persists in Open-Meteo's
   hourly forecast. "Bucket" = same coarse category as the current value
   (clear / partly / mostly / overcast). Returns a short status string. */
function cloudTrendDescription(weather, now) {
  if (!weather?.hourly?.time || !weather?.hourly?.cloud_cover) return null;
  const cur = weather.current?.cloud_cover;
  if (cur == null) return null;
  const tz = weather.utc_offset_seconds ?? 0;
  const nowMs = (now ?? new Date()).getTime();
  const bucket = (c) => c < 30 ? 0 : c < 60 ? 1 : c < 85 ? 2 : 3;
  const curB = bucket(cur);
  let lastSameMs = nowMs;
  for (let i = 0; i < weather.hourly.time.length; i++) {
    const t = parseLocationTime(weather.hourly.time[i], tz);
    if (t < nowMs) continue;
    const c = weather.hourly.cloud_cover[i];
    if (bucket(c) === curB) lastSameMs = t;
    else break;
  }
  const dh = (lastSameMs - nowMs) / 3600000;
  if (dh < 0.5) return "changing soon";
  if (dh < 2)   return `holds ~${dh.toFixed(0)}h`;
  return `holds ${dh.toFixed(0)}h+`;
}

function darknessCountdown(now, twilightEvents, currentCode) {
  const nowMs = now.getTime();
  // Find the next astronomical-night transition after now.
  const events = [twilightEvents.rise, twilightEvents.set]
    .filter(Boolean)
    .map((t) => ({ t, after: t.getTime() - nowMs }))
    .filter((e) => e.after > 0)
    .sort((a, b) => a.after - b.after);
  if (currentCode === "night") {
    // Find when astro night ends (= sun rises above -18°)
    const next = events.find((e) => e.t === twilightEvents.rise);
    if (!next) return { value: "—", sub: "ends after horizon" };
    return { value: hoursMins(next.after), sub: `dark until ${fmtTime(next.t)}` };
  }
  // Otherwise: time till astro night begins
  const next = events.find((e) => e.t === twilightEvents.set);
  if (!next) return { value: "—", sub: "no astro night tonight" };
  return { value: hoursMins(next.after), sub: `dark from ${fmtTime(next.t)}` };
}

function hoursMins(ms) {
  if (ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/* React hook: fetch a NOAA SWPC product (plasma or mag), parse, and
   refresh every 60 seconds. Returns the parsed series of objects with
   numeric fields and a Date `t`, or null while loading. */
function useNoaaProductSeries(kind) {
  const [series, setSeries] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const url = kind === "plasma"
      ? "https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json"
      : "https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json";
    const fetchOnce = async () => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) return;
        const rows = await r.json();
        if (cancelled || !Array.isArray(rows) || rows.length < 2) return;
        const headers = rows[0];
        const idx = (k) => headers.indexOf(k);
        const ti = idx("time_tag");
        if (kind === "plasma") {
          const di = idx("density"), si = idx("speed"), tpi = idx("temperature");
          setSeries(rows.slice(1).slice(-180).map((r) => ({
            t: parseSwpcTime(r[ti]),
            density: parseFloat(r[di]),
            speed: parseFloat(r[si]),
            temp: parseFloat(r[tpi]),
          })));
        } else {
          const bxi = idx("bx_gsm"), byi = idx("by_gsm"), bzi = idx("bz_gsm"), bti = idx("bt");
          setSeries(rows.slice(1).slice(-180).map((r) => ({
            t: parseSwpcTime(r[ti]),
            bx: parseFloat(r[bxi]),
            by: parseFloat(r[byi]),
            bz: parseFloat(r[bzi]),
            bt: parseFloat(r[bti]),
          })));
        }
      } catch {/* network blip — keep showing the last value */}
    };
    fetchOnce();
    const id = setInterval(fetchOnce, 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [kind]);
  return series;
}

function parseSwpcTime(s) {
  // SWPC format: "YYYY-MM-DD HH:MM:SS.sss" — interpret as UTC.
  if (!s) return null;
  const [date, time] = s.split(" ");
  const [Y, M, D] = date.split("-").map(Number);
  const [h, m, sec] = time.split(":");
  return new Date(Date.UTC(Y, M - 1, D, +h, +m, Math.floor(parseFloat(sec))));
}

/* ============================================================== STATIC SVGs */
function KpDial({ kp }) {
  const color = kpColor(kp);
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

/* 72-hour Kp forecast spark with a draggable cursor. Click or drag
   anywhere on the chart to set the slider. */
function Aurora3DayChart({ kpForecast, now, previewTime, setPreviewTime, maxHours }) {
  const hourly = useMemo(() => {
    if (!kpForecast || !kpForecast.length) return [];
    const out = [];
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    const horizonMs = Math.min(maxHours * 3600000, kpForecast[kpForecast.length - 1].time.getTime() - start.getTime());
    const steps = Math.max(1, Math.floor(horizonMs / 3600000));
    for (let i = 0; i <= steps; i++) {
      const t = new Date(start.getTime() + i * 3600000);
      let bucket = kpForecast[0];
      for (const f of kpForecast) {
        if (f.time.getTime() <= t.getTime()) bucket = f;
        else break;
      }
      out.push({ t, kp: bucket.kp });
    }
    return out;
  }, [kpForecast, now, maxHours]);

  if (!hourly.length) return null;
  // Find the hourly bucket nearest to the current previewTime; if no preview,
  // point the cursor at "now" (which sits between bucket 0 and 1).
  const target = (previewTime ?? now).getTime();
  let cursorIdx = 0, bestD = Infinity;
  for (let i = 0; i < hourly.length; i++) {
    const d = Math.abs(hourly[i].t.getTime() - target);
    if (d < bestD) { bestD = d; cursorIdx = i; }
  }

  const onScrub = (idx) => {
    if (!setPreviewTime) return;
    const i = Math.max(0, Math.min(hourly.length - 1, idx));
    // Idx 0 corresponds to "this hour" — close enough to NOW that we route
    // through the null sentinel so the live clock advances naturally.
    setPreviewTime(i === 0 ? null : hourly[i].t);
  };

  return (
    <div className="panel corner p-6">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div className="mono text-xs uppercase tracking-widest muted">3-Day Kp Forecast</div>
        <div className="mono text-xs subtle">Drag the cursor or move the slider above</div>
      </div>
      <KpForecastSpark
        forecast={hourly}
        idx={cursorIdx}
        onScrub={onScrub}
        maxHours={maxHours}
      />
      <div className="mono text-xs flex justify-between mt-1 secondary">
        <span>{hourly[0].t.toLocaleString([], { weekday: "short", hour: "2-digit" })}</span>
        <span>
          {hourly[cursorIdx].t.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}
          {" · +"}{Math.floor((hourly[cursorIdx].t - hourly[0].t) / 3600000)}h
          {" · Kp "}{hourly[cursorIdx].kp.toFixed(2)}
        </span>
        <span>{hourly[hourly.length - 1].t.toLocaleString([], { weekday: "short", hour: "2-digit" })}</span>
      </div>
    </div>
  );
}

function KpForecastSpark({ forecast, idx, onScrub, maxHours }) {
  const W = 700, H = 80, P = 20;
  const xScale = (i) => P + (i / Math.max(1, forecast.length - 1)) * (W - P * 2);
  const yScale = (kp) => H - P - (Math.min(kp, 9) / 9) * (H - P * 2);
  const path = forecast.map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(s.kp)}`).join(" ");
  const svgRef = useRef(null);
  const dragRef = useRef(false);

  const xToOffsetHours = (clientX) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const fx = (clientX - rect.left) / rect.width;
    const xViewBox = fx * W;
    const i = Math.round(((xViewBox - P) / (W - P * 2)) * (forecast.length - 1));
    return Math.max(0, Math.min(maxHours ?? forecast.length - 1, i));
  };

  const begin = (e) => {
    if (!onScrub) return;
    dragRef.current = true;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const i = xToOffsetHours(cx);
    if (i != null) onScrub(i);
    e.preventDefault();
  };

  useEffect(() => {
    if (!onScrub) return;
    const move = (e) => {
      if (!dragRef.current) return;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const i = xToOffsetHours(cx);
      if (i != null) onScrub(i);
    };
    const onUp = () => { dragRef.current = false; };
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: false });
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onScrub, forecast.length, maxHours]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ marginTop: 6, cursor: onScrub ? "ew-resize" : "default", touchAction: "none", userSelect: "none" }}
      onMouseDown={begin}
      onTouchStart={begin}
    >
      {[3, 5, 7].map((k) => (
        <line key={k} x1={P} y1={yScale(k)} x2={W - P} y2={yScale(k)} stroke="var(--text-muted)" strokeDasharray="2 4" strokeWidth="0.5" opacity="0.4" />
      ))}
      <path d={path} fill="none" stroke="var(--accent-purple)" strokeWidth="1.5" />
      <line x1={xScale(idx)} y1={P} x2={xScale(idx)} y2={H - P} stroke="var(--accent-gold)" strokeWidth="2" />
      <circle cx={xScale(idx)} cy={yScale(forecast[idx]?.kp ?? 0)} r="4" fill="var(--accent-gold)" stroke="var(--bg-base)" strokeWidth="1.5" />
      <text x={P} y={yScale(5) - 2} fontSize="8" fontFamily="JetBrains Mono" fill="var(--warning)" opacity="0.7">Kp 5 (G1)</text>
    </svg>
  );
}
