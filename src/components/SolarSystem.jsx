import React, { useMemo, useState } from "react";
import {
  fmtDeg, fmtTime, findEvents, toJulian, azimuthName, fmtTimeTz,
  cloudCoverAt, computeSky, moonPhaseName, MOON_NEGLIGIBLE_ALT_DEG,
  equatorialToHorizontal, lst,
} from "../astro.js";
import {
  PLANETS, allPlanetSnapshots, orreryPositions, geocentric,
  galileanMoons, saturnRingAngles,
  grsSystemIILongitude, jupiterCMLongitudeII,
  nextGRSTransits, jdToDate, SATURN_RING_OUTER_RADII,
  findConjunctions, nextOpposition, nextGreatestElongation, nextSolarTransit,
  planetAltitudeCurve,
} from "../planets.js";
import { DataCell, FactorRow, TimeOffsetSlider, Legend, OutOfRangeNotice } from "./shared.jsx";
import { planetVerdict, cloudVerdict } from "../verdicts.js";

/* Solar System tab. Top-level sub-nav switches between the All-Planets
   overview (orrery + cards + events) and a per-planet detail page that
   mirrors the Milky Way tab's layout. */
export function SolarSystem({ coords, now, displayTz, sky, weather, weatherStale }) {
  const [subTab, setSubTab] = useState("all");
  return (
    <div className="space-y-6">
      <SubTabNav subTab={subTab} setSubTab={setSubTab} />
      {subTab === "all" ? (
        <AllPlanetsView coords={coords} now={now} displayTz={displayTz} />
      ) : (
        <PlanetDetail
          planetKey={subTab}
          coords={coords}
          now={now}
          displayTz={displayTz}
          sky={sky}
          weather={weather}
          weatherStale={weatherStale}
        />
      )}
    </div>
  );
}

/* Sub-tab strip: ALL | ☿ Mercury | ♀ Venus | ♂ Mars | ... in the same
   visual language as the main TabNav, but slightly smaller. */
function SubTabNav({ subTab, setSubTab }) {
  const items = [
    { key: "all", label: "All", symbol: "·" },
    ...PLANETS.filter(p => p.key !== "earth").map(p => ({ key: p.key, label: p.name, symbol: p.symbol, color: p.color })),
  ];
  return (
    <nav className="flex gap-1 flex-wrap items-center border-b pb-2" style={{ borderColor: "var(--panel-border)" }}>
      {items.map(it => {
        const active = subTab === it.key;
        return (
          <button
            key={it.key}
            onClick={() => setSubTab(it.key)}
            className="ghost"
            style={{
              padding: "0.4rem 0.8rem",
              border: "1px solid",
              borderColor: active ? "var(--accent-gold)" : "var(--frame-border)",
              background: active ? "var(--strip-bg)" : "transparent",
              color: active ? "var(--accent-gold)" : "var(--text-muted)",
              cursor: "pointer",
              borderRadius: 2,
              fontFamily: "Cinzel, serif",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: "1.05rem", color: it.color || "currentColor" }}>{it.symbol}</span>
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}

/* All-planets overview: orrery + cards + events. (Was the original
   SolarSystem render body.) */
function AllPlanetsView({ coords, now, displayTz }) {
  const [mode, setMode] = useState("helio"); // "helio" | "geo"
  const [zoom, setZoom] = useState("all");   // "inner" | "all"

  const observer = coords ? { lat: coords.lat, lon: coords.lon } : null;

  const snaps = useMemo(() => allPlanetSnapshots(now, observer),
    // recompute every clock-minute and on location change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now.getTime(), coords?.lat, coords?.lon]
  );

  const orrery = useMemo(() => orreryPositions(now, mode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now.getTime(), mode]
  );

  // Brightest visible planet right now (alt > 0, lowest magnitude)
  const brightest = useMemo(() => {
    const visible = snaps.filter(p => p.snap?.alt != null && p.snap.alt > 0);
    if (!visible.length) return null;
    return visible.reduce((best, p) => (p.snap.magnitude < best.snap.magnitude ? p : best));
  }, [snaps]);

  return (
    <div className="space-y-6">
      <div className="panel corner p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="display gold text-lg">Solar System</div>
            <div className="body text-xs muted mt-1">
              Live positions for all major planets using JPL Keplerian elements (±~1 arcmin, 1800–2050).
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ZoomToggle zoom={zoom} setZoom={setZoom} />
            <ViewToggle mode={mode} setMode={setMode} />
          </div>
        </div>
        <Orrery positions={orrery} mode={mode} zoom={zoom} />
        <div className="mono text-xs muted mt-3 text-center">
          {mode === "helio"
            ? "Heliocentric — Sun at center. Orbits to scale (AU); planet sizes exaggerated for visibility."
            : "Geocentric — Earth at center. Vectors from Earth to each planet in the J2000 ecliptic plane."}
        </div>
      </div>

      {brightest && (
        <div className="panel corner p-4 flex items-center gap-4 flex-wrap">
          <span className="display gold text-3xl" style={{ color: brightest.color }}>{brightest.symbol}</span>
          <div className="flex-1 min-w-[200px]">
            <div className="display gold text-sm uppercase tracking-widest">Brightest planet up now</div>
            <div className="body primary text-lg">
              {brightest.name} at <span className="mono">{brightest.snap.magnitude.toFixed(2)}</span> mag
              {brightest.snap.alt != null && (
                <> · {fmtDeg(brightest.snap.alt)} alt {azimuthName(brightest.snap.az)}</>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {snaps.map(p => (
          <PlanetCard key={p.key} planet={p} coords={coords} now={now} displayTz={displayTz} />
        ))}
      </div>

      <PlanetaryEvents now={now} displayTz={displayTz} />
    </div>
  );
}

/* ------- Per-planet detail page ------- */

const MAX_HOURS = 7 * 24; // one week

function PlanetDetail({ planetKey, coords, now, displayTz, sky, weather, weatherStale }) {
  const meta = PLANETS.find(p => p.key === planetKey);
  const [previewTime, setPreviewTime] = useState(null);

  const tzName = weather?.timezone ?? null;
  const isNowPreview = previewTime == null;
  const effectivePreview = isNowPreview ? now : previewTime;

  const observer = coords ? { lat: coords.lat, lon: coords.lon } : null;

  // Geocentric + horizontal snapshot at the preview instant
  const snap = useMemo(() => {
    if (!observer) return null;
    const jd = toJulian(effectivePreview);
    const g = geocentric(jd, planetKey);
    const sidereal = lst(jd, observer.lon);
    const hz = equatorialToHorizontal(g.ra, g.dec, sidereal, observer.lat);
    return { ...g, alt: hz.alt, az: hz.az };
  }, [effectivePreview, observer?.lat, observer?.lon, planetKey]);

  // Current snap (for verdict — never moves while the user scrubs)
  const liveSnap = useMemo(() => {
    if (!observer) return null;
    const jd = toJulian(now);
    const g = geocentric(jd, planetKey);
    const sidereal = lst(jd, observer.lon);
    const hz = equatorialToHorizontal(g.ra, g.dec, sidereal, observer.lat);
    return { ...g, alt: hz.alt, az: hz.az };
  }, [now.getTime(), observer?.lat, observer?.lon, planetKey]);

  const previewSky = useMemo(
    () => isNowPreview ? sky : (coords ? computeSky(effectivePreview, coords) : null),
    [sky, effectivePreview, coords, isNowPreview]
  );
  const previewCloud = useMemo(() => {
    if (isNowPreview) return weatherStale ? null : weather?.current?.cloud_cover ?? null;
    return cloudCoverAt(weather, effectivePreview.getTime());
  }, [isNowPreview, effectivePreview, weather, weatherStale]);
  const previewCloudOutOfRange = !isNowPreview && previewCloud == null;
  const cloud = weatherStale ? null : weather?.current?.cloud_cover ?? null;

  const verdict = planetVerdict(liveSnap, sky, cloud);

  const events = useMemo(() => {
    if (!coords) return null;
    return findEvents(now, coords.lat, coords.lon, (jd) => {
      const g = geocentric(jd, planetKey);
      return { ra: g.ra, dec: g.dec };
    });
  }, [coords?.lat, coords?.lon, now.toDateString(), planetKey]);

  if (!observer) {
    return <div className="panel corner p-12 text-center mono muted">Location required to compute {meta.name}'s position.</div>;
  }

  const moonSep = previewSky?.moon ? angularSepDeg(snap.ra, snap.dec, previewSky.moon.ra, previewSky.moon.dec) : null;

  return (
    <div className="space-y-6">
      {/* Header: Right Now + Verdict */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel corner p-6" style={{ borderTopColor: meta.color }}>
          <div className="mono text-xs uppercase tracking-widest mb-3 muted">{meta.name} · Right Now</div>
          <div className="flex items-center gap-4 mb-4">
            <span className="display text-5xl" style={{ color: meta.color }}>{meta.symbol}</span>
            <div>
              <div className="display gold text-3xl">{meta.name}</div>
              <div className="mono text-sm secondary">
                mag <span className="gold">{liveSnap.magnitude.toFixed(2)}</span>
                · {liveSnap.diamArcsec.toFixed(1)}″ apparent
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DataCell label="Altitude" value={fmtDeg(liveSnap.alt)}
              sub={liveSnap.alt > 30 ? "well placed" : liveSnap.alt > 0 ? "low" : "below horizon"} />
            <DataCell label="Azimuth" value={fmtDeg(liveSnap.az)} sub={azimuthName(liveSnap.az)} />
            <DataCell label="Distance" value={`${liveSnap.delta.toFixed(2)} AU`} sub={`r ${liveSnap.r.toFixed(2)} AU`} />
            <DataCell label="Illuminated" value={`${(liveSnap.illumFrac * 100).toFixed(0)}%`}
              sub={`phase ${liveSnap.phaseAngleDeg.toFixed(0)}°`} />
          </div>
        </div>

        <div className="panel corner p-6">
          <div className="mono text-xs uppercase tracking-widest mb-3 muted">Verdict</div>
          <div className="display text-2xl mb-2" style={{ color: verdict.color }}>{verdict.rating}</div>
          <div className="body text-base primary">{verdict.text}</div>
        </div>
      </div>

      {/* Rise / Transit / Set */}
      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">Tonight's Window</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DataCell label="Rise" value={fmtTime(events?.rise)}
            sub={events?.rise ? `mag ${liveSnap.magnitude.toFixed(1)}` : "no rise today"} />
          <DataCell label="Transit" value={fmtTime(events?.transit)}
            sub={events?.maxAlt != null ? `max ${fmtDeg(events.maxAlt)}` : null} />
          <DataCell label="Set" value={fmtTime(events?.set)}
            sub={events?.set ? azimuthName(snap.az) : null} />
          <DataCell label="Best Viewing"
            value={events?.transit ? fmtTime(events.transit) : "—"}
            sub={events?.maxAlt != null ? `peak ${fmtDeg(events.maxAlt)}` : null} />
        </div>
      </div>

      {/* Conditions panel with time slider */}
      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">
          Conditions Affecting {isNowPreview ? "Current View" : "Previewed View"}
        </div>
        <TimeOffsetSlider
          now={now}
          previewTime={previewTime}
          setPreviewTime={setPreviewTime}
          maxHours={MAX_HOURS}
          tzName={tzName}
          label="View at"
        />
        <div className="space-y-3">
          <FactorRow
            label="Planet altitude"
            status={snap.alt > 30 ? "good" : snap.alt > 10 ? "fair" : "bad"}
            note={
              snap.alt < 0
                ? `Below horizon at ${fmtDeg(Math.abs(snap.alt))} — invisible.`
                : `${fmtDeg(snap.alt)} altitude, ${fmtDeg(snap.az)} azimuth (${azimuthName(snap.az)}). Higher is better — thinner atmosphere.`
            }
          />
          <FactorRow
            label="Twilight"
            status={previewSky?.tw?.code === "day"
              ? (meta.V0 != null && liveSnap.magnitude < -3 ? "fair" : "bad")
              : previewSky?.tw?.code === "civil"
                ? (liveSnap.magnitude < 0 ? "fair" : "bad")
                : "good"}
            note={previewSky ? `${previewSky.tw.name} — sun at ${fmtDeg(previewSky.sunHz.alt)}. ${planetTwilightNote(planetKey, liveSnap, previewSky.tw.code)}` : "no sky data"}
          />
          {moonSep != null && (
            <FactorRow
              label="Moon glare"
              status={moonSep > 30 || (previewSky?.moonHz?.alt ?? -90) < MOON_NEGLIGIBLE_ALT_DEG ? "good" : moonSep > 10 ? "fair" : "bad"}
              note={
                (previewSky?.moonHz?.alt ?? -90) < MOON_NEGLIGIBLE_ALT_DEG
                  ? `Moon ${fmtDeg(Math.abs(previewSky.moonHz.alt))} below horizon — no glare.`
                  : `Moon ${fmtDeg(moonSep)} away (${moonPhaseName(previewSky?.phase?.phaseFraction ?? 0)}, ${((previewSky?.phase?.illumination ?? 0) * 100).toFixed(0)}% illum). Close approaches wash out faint detail.`
              }
            />
          )}
          <FactorRow
            label="Cloud cover"
            status={previewCloudOutOfRange || (isNowPreview && weatherStale) ? "unknown"
              : previewCloud == null ? "unknown"
              : previewCloud < 30 ? "good" : previewCloud < 60 ? "fair" : "bad"}
            note={
              previewCloudOutOfRange ? "Beyond 16-day Open-Meteo forecast."
              : (isNowPreview && weatherStale) ? "Weather forecast out of range."
              : previewCloud != null ? `${previewCloud}% — ${cloudVerdict(previewCloud)}`
              : "weather data unavailable"
            }
          />
        </div>
        {(weatherStale && isNowPreview) && <OutOfRangeNotice what="Cloud cover forecast" horizon="16 days from today" />}
      </div>

      {/* Planet-specific extras */}
      {planetKey === "jupiter" && (
        <div className="panel corner p-6">
          <JupiterExtras now={now} displayTz={displayTz} />
        </div>
      )}
      {planetKey === "saturn" && (
        <div className="panel corner p-6">
          <SaturnExtras now={now} />
        </div>
      )}

      {/* Night-by-night altitude chart */}
      <PlanetNightChart planetKey={planetKey} coords={coords} now={now} tzName={tzName} meta={meta} />
    </div>
  );
}

function angularSepDeg(ra1, dec1, ra2, dec2) {
  const DEG = Math.PI / 180;
  const r1 = ra1 * DEG, d1 = dec1 * DEG;
  const r2 = ra2 * DEG, d2 = dec2 * DEG;
  const c = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(r1 - r2);
  return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
}

function planetTwilightNote(key, snap, twCode) {
  if (twCode === "day") {
    if (snap.magnitude < -3) return "Bright enough to find naked-eye if you know where to look.";
    return "Wait for twilight — daytime sky overwhelms it.";
  }
  if (twCode === "civil" || twCode === "nautical") {
    return "Bright planets visible already; faint surface detail needs deeper night.";
  }
  return "Full astronomical night — best contrast.";
}

/* Night-by-night chart for a planet. Same scrubber pattern as the Milky
   Way page, but renders the planet's altitude curve over 36 hours. */
function PlanetNightChart({ planetKey, coords, now, tzName, meta }) {
  const [dayOffset, setDayOffset] = useState(0);
  const anchor = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [now, dayOffset]);

  const curve = useMemo(
    () => planetAltitudeCurve(anchor, planetKey, coords.lat, coords.lon),
    [anchor, planetKey, coords.lat, coords.lon]
  );

  const fmt = (d, opts) =>
    tzName ? d.toLocaleString([], { ...opts, timeZone: tzName })
           : d.toLocaleString([], opts);

  return (
    <div className="panel corner p-6">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div className="mono text-xs uppercase tracking-widest muted">
          {meta.name} · Altitude vs Time · Night-by-Night
        </div>
        <div className="mono text-xs subtle">Drag to scrub through the next 7 nights</div>
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
          <button className="ghost" onClick={() => setDayOffset(0)} disabled={dayOffset === 0}
            style={{ opacity: dayOffset === 0 ? 0.4 : 1, padding: "0.25rem 0.6rem", fontSize: "0.65rem" }}>
            TONIGHT
          </button>
        </div>
        <input type="range" min={0} max={7} step={1} value={dayOffset}
          onChange={(e) => setDayOffset(parseInt(e.target.value))} style={{ width: "100%" }} />
        <div className="mono text-xs flex justify-between mt-1 subtle">
          <span>tonight</span><span>+3d</span><span>+7d</span>
        </div>
      </div>

      <PlanetAltitudeSvg curve={curve} meta={meta} />
      <div className="mt-3 flex gap-4 mono text-xs flex-wrap secondary">
        <Legend color={meta.color} label={meta.name} />
        <Legend color="var(--accent-warm)" label="Sun" />
        <Legend color="#e8e8e8" label="Moon" />
        <Legend color="var(--accent-green)" label="Astronomical night" dashed />
      </div>
    </div>
  );
}

function PlanetAltitudeSvg({ curve, meta }) {
  if (!curve?.length) return null;
  const W = 720, H = 220, P = 28;
  const xScale = (h) => P + (h / 36) * (W - P * 2);
  const yScale = (alt) => H - P - ((alt + 30) / 120) * (H - P * 2);
  const path = (sel) => curve.map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(s.h)} ${yScale(sel(s))}`).join(" ");
  // Twilight shading: sun < -18° = astronomical night
  const nightBands = [];
  let bandStart = null;
  for (const s of curve) {
    if (s.sunAlt < -18 && bandStart == null) bandStart = s.h;
    if (s.sunAlt >= -18 && bandStart != null) { nightBands.push([bandStart, s.h]); bandStart = null; }
  }
  if (bandStart != null) nightBands.push([bandStart, 36]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <rect x="0" y="0" width={W} height={H} fill="var(--bg-base)" />
      {/* Night shading */}
      {nightBands.map(([a, b], i) => (
        <rect key={i} x={xScale(a)} y={P} width={xScale(b) - xScale(a)} height={H - 2 * P}
          fill="var(--accent-green)" opacity="0.06" />
      ))}
      {/* Horizon line */}
      <line x1={P} y1={yScale(0)} x2={W - P} y2={yScale(0)}
        stroke="var(--accent-gold)" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.5" />
      <text x={P} y={yScale(0) - 3} fontSize="8" fontFamily="JetBrains Mono" fill="var(--accent-gold)" opacity="0.7">HORIZON 0°</text>

      {/* Sun + moon curves */}
      <path d={path(s => s.sunAlt)} fill="none" stroke="var(--accent-warm)" strokeWidth="1" opacity="0.65" />
      <path d={path(s => s.moonAlt)} fill="none" stroke="#e8e8e8" strokeWidth="1" opacity="0.55" />
      {/* Planet curve */}
      <path d={path(s => s.planetAlt)} fill="none" stroke={meta.color} strokeWidth="2" />

      {/* Hour ticks */}
      {[0, 6, 12, 18, 24, 30, 36].map((h) => (
        <text key={h} x={xScale(h)} y={H - 8} fontSize="8" fontFamily="JetBrains Mono"
          fill="var(--text-muted)" textAnchor="middle">
          {((h + 12) % 24).toString().padStart(2, "0")}:00
        </text>
      ))}
      {/* Altitude gridlines */}
      {[-30, -10, 10, 30, 60, 90].map(alt => (
        <g key={alt}>
          <line x1={P} y1={yScale(alt)} x2={W - P} y2={yScale(alt)}
            stroke="var(--frame-border)" strokeWidth="0.4" opacity="0.3" />
          <text x={6} y={yScale(alt) + 3} fontSize="7" fontFamily="JetBrains Mono"
            fill="var(--text-subtle)">{alt}°</text>
        </g>
      ))}
    </svg>
  );
}

/* Next-N oppositions / elongations / conjunctions / transits panel. */
function PlanetaryEvents({ now, displayTz }) {
  const jd = toJulian(now);

  const oppositions = useMemo(() => {
    return ["mars", "jupiter", "saturn", "uranus", "neptune"]
      .map(k => ({ key: k, ev: nextOpposition(k, jd) }))
      .filter(x => x.ev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(jd)]);

  const elongations = useMemo(() => {
    return ["mercury", "venus"].flatMap(k => [
      { key: k, dir: "east", ev: nextGreatestElongation(k, jd, "east") },
      { key: k, dir: "west", ev: nextGreatestElongation(k, jd, "west") },
    ]).filter(x => x.ev).sort((a, b) => a.ev.jd - b.ev.jd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(jd)]);

  const conjunctions = useMemo(() => {
    return findConjunctions(jd, 365, { maxSepDeg: 3 }).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(jd)]);

  const transits = useMemo(() => [
    { key: "mercury", ev: nextSolarTransit("mercury", jd) },
    { key: "venus", ev: nextSolarTransit("venus", jd) },
  ].filter(x => x.ev),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(jd)]);

  const planetName = k => PLANETS.find(p => p.key === k)?.name ?? k;
  const planetSym  = k => PLANETS.find(p => p.key === k)?.symbol ?? "·";
  const planetColor = k => PLANETS.find(p => p.key === k)?.color ?? "var(--accent-gold)";
  const fmtDate = d => d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="panel corner p-6">
      <div className="display gold text-lg mb-1">Upcoming Planetary Events</div>
      <div className="body text-xs muted mb-4">
        Oppositions, greatest elongations, close conjunctions, and rare inferior-conjunction
        transits across the solar disc. All computations geocentric.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Oppositions */}
        <div>
          <div className="mono text-xs uppercase tracking-widest muted mb-2">Next Oppositions</div>
          <div className="space-y-1.5">
            {oppositions.map(({ key, ev }) => (
              <div key={key} className="flex items-center gap-3 mono text-xs">
                <span className="display" style={{ color: planetColor(key), fontSize: "1.1rem", width: 22 }}>{planetSym(key)}</span>
                <span style={{ width: 70 }} className="body primary">{planetName(key)}</span>
                <span className="display gold">{fmtDate(ev.dateUTC)}</span>
                <span className="muted ml-auto">{ev.distanceAU.toFixed(2)} AU · mag {ev.magnitude.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Greatest Elongations */}
        <div>
          <div className="mono text-xs uppercase tracking-widest muted mb-2">Mercury &amp; Venus Elongations</div>
          <div className="space-y-1.5">
            {elongations.map(({ key, dir, ev }, i) => (
              <div key={i} className="flex items-center gap-3 mono text-xs">
                <span className="display" style={{ color: planetColor(key), fontSize: "1.1rem", width: 22 }}>{planetSym(key)}</span>
                <span style={{ width: 70 }} className="body primary">{planetName(key)}</span>
                <span className="display gold">{fmtDate(ev.dateUTC)}</span>
                <span className="muted ml-auto">
                  {dir === "east" ? "evening" : "morning"} · {ev.elongationDeg.toFixed(1)}°
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Close Conjunctions */}
        <div className="md:col-span-2">
          <div className="mono text-xs uppercase tracking-widest muted mb-2">Close Conjunctions · next 12 months · ≤3°</div>
          <div className="space-y-1.5">
            {conjunctions.length === 0 && (
              <div className="mono text-xs subtle italic">No conjunctions tighter than 3° in the search window.</div>
            )}
            {conjunctions.map((c, i) => (
              <div key={i} className="flex items-center gap-3 mono text-xs">
                <span className="display gold" style={{ width: 110 }}>{fmtDate(jdToDate(c.jd))}</span>
                <span className="display" style={{ color: planetColor(c.a), fontSize: "1.1rem" }}>{planetSym(c.a)}</span>
                <span className="body primary">{planetName(c.a)}</span>
                <span className="muted">+</span>
                <span className="display" style={{ color: planetColor(c.b), fontSize: "1.1rem" }}>{planetSym(c.b)}</span>
                <span className="body primary">{planetName(c.b)}</span>
                <span className="muted ml-auto">{c.sepDeg.toFixed(2)}°</span>
              </div>
            ))}
          </div>
        </div>

        {/* Solar Transits */}
        {transits.length > 0 && (
          <div className="md:col-span-2">
            <div className="mono text-xs uppercase tracking-widest muted mb-2">Solar Transits</div>
            <div className="space-y-1.5">
              {transits.map(({ key, ev }) => (
                <div key={key} className="flex items-center gap-3 mono text-xs">
                  <span className="display" style={{ color: planetColor(key), fontSize: "1.1rem", width: 22 }}>{planetSym(key)}</span>
                  <span style={{ width: 70 }} className="body primary">{planetName(key)}</span>
                  <span className="display gold">{fmtDate(ev.dateUTC)}</span>
                  <span className="muted ml-auto">ecl. lat {ev.eclLatDeg.toFixed(2)}°</span>
                </div>
              ))}
            </div>
            <div className="mono text-xs subtle mt-2 italic">
              Transits of Mercury or Venus across the Sun are among the rarest predictable
              celestial events — the next Venus transit pair is 2117/2125.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ViewToggle({ mode, setMode }) {
  return (
    <SegmentedToggle
      value={mode} onChange={setMode}
      options={[{ v: "helio", label: "Heliocentric" }, { v: "geo", label: "Geocentric" }]}
    />
  );
}

function ZoomToggle({ zoom, setZoom }) {
  return (
    <SegmentedToggle
      value={zoom} onChange={setZoom}
      options={[{ v: "inner", label: "Inner" }, { v: "all", label: "All planets" }]}
    />
  );
}

function SegmentedToggle({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map(({ v, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className="ghost"
          style={{
            padding: "0.35rem 0.7rem",
            border: "1px solid",
            borderColor: value === v ? "var(--accent-gold)" : "var(--frame-border)",
            background: value === v ? "var(--strip-bg)" : "transparent",
            color: value === v ? "var(--accent-gold)" : "var(--text-muted)",
            cursor: "pointer",
            borderRadius: 2,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "0.65rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* 2D orrery. The "inner" zoom clips to Mars's orbit (1.7 AU) so Mercury,
   Venus, Earth and Mars are legible; "all" linearly fits Neptune (30 AU).
   Labels are offset along their angular bearing from the centre so adjacent
   planets don't pile up. */
function Orrery({ positions, mode, zoom }) {
  const W = 720, H = 520;
  const pad = 40;
  const maxAU = zoom === "inner" ? 1.7 : 31;
  const scale = (Math.min(W, H) / 2 - pad) / maxAU;
  const cx = W / 2, cy = H / 2;

  // Project (x, y) AU → screen pixels. Flip y so north-ecliptic-up is up.
  const proj = (x, y) => [cx + x * scale, cy - y * scale];

  // Ring radii for context (AU): orbit indicators for the 8 planets.
  const ringAU = zoom === "inner"
    ? [0.39, 0.72, 1.00, 1.52]
    : [0.39, 0.72, 1.00, 1.52, 5.20, 9.54, 19.19, 30.07];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: "60vh", background: "var(--bg-base)" }}>
      <defs>
        <radialGradient id="orrery-bg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="var(--panel-bg-from)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--bg-base)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe48a" stopOpacity="1" />
          <stop offset="60%" stopColor="#f0a040" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f0a040" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#orrery-bg)" />

      {/* Orbit rings */}
      {ringAU.map((au, i) => (
        <circle key={i}
          cx={cx} cy={cy} r={au * scale}
          fill="none"
          stroke="var(--frame-border)"
          strokeWidth="0.5"
          strokeDasharray="2 4"
          opacity="0.4"
        />
      ))}

      {/* AU scale tick (1 AU bar bottom-left) */}
      <g transform={`translate(20, ${H - 22})`}>
        <line x1="0" y1="0" x2={scale} y2="0" stroke="var(--accent-gold)" strokeWidth="1.2" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--accent-gold)" strokeWidth="1.2" />
        <line x1={scale} y1="-4" x2={scale} y2="4" stroke="var(--accent-gold)" strokeWidth="1.2" />
        <text x={scale / 2} y="-6" fontSize="10" fontFamily="JetBrains Mono" fill="var(--accent-gold)" textAnchor="middle">1 AU</text>
      </g>

      {/* Center body — Sun in helio, Earth in geo */}
      {mode === "helio" ? (
        <>
          <circle cx={cx} cy={cy} r="22" fill="url(#sun-glow)" />
          <circle cx={cx} cy={cy} r="6" fill="#ffe48a" />
          <text x={cx} y={cy + 38} fontSize="10" fontFamily="JetBrains Mono" fill="var(--accent-gold)" textAnchor="middle" letterSpacing="2">SUN</text>
        </>
      ) : (
        <>
          <circle cx={cx} cy={cy} r="5" fill="#5b9cf7" stroke="var(--accent-gold)" strokeWidth="0.8" />
          <text x={cx} y={cy + 18} fontSize="10" fontFamily="JetBrains Mono" fill="var(--accent-gold)" textAnchor="middle" letterSpacing="2">EARTH</text>
        </>
      )}

      {/* Planets (skip ones outside the current zoom window so they don't
          smear labels off the edge). */}
      {positions.map(p => {
        if (mode === "geo" && p.key === "earth") return null;
        const dAU = Math.hypot(p.x, p.y);
        if (dAU > maxAU) return null;
        const [px, py] = proj(p.x, p.y);
        const dot = Math.max(3, Math.log2(Math.max(1, dAU)) * 1.4);
        // Label offset along the planet's position angle from centre — pushes
        // it radially outward, so neighbouring inner planets fan out instead
        // of overprinting each other.
        const ang = Math.atan2(-p.y, p.x); // screen y is flipped
        const off = dot + 6;
        const lx = px + Math.cos(ang) * off;
        const ly = py + Math.sin(ang) * off;
        const anchor = Math.cos(ang) < -0.3 ? "end" : Math.cos(ang) > 0.3 ? "start" : "middle";
        return (
          <g key={p.key}>
            {mode === "geo" && (
              <line x1={cx} y1={cy} x2={px} y2={py}
                stroke={p.color} strokeWidth="0.6" opacity="0.5" strokeDasharray="2 3" />
            )}
            <circle cx={px} cy={py} r={dot + 3} fill={p.color} opacity="0.18" />
            <circle cx={px} cy={py} r={dot} fill={p.color} stroke="var(--bg-base)" strokeWidth="0.5" />
            <text x={lx} y={ly + 3} fontSize="10" fontFamily="JetBrains Mono"
              fill="var(--text-primary)" textAnchor={anchor} letterSpacing="1">
              {p.symbol} {p.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* Wrap a planet's geocentric function in the signature findEvents expects:
   bodyFn(jd) → {ra, dec}. Memoized via useMemo on the planet key. */
function makeBodyFn(key) {
  return (jd) => {
    const g = geocentric(jd, key);
    return { ra: g.ra, dec: g.dec };
  };
}

function PlanetCard({ planet, coords, now, displayTz }) {
  const { name, symbol, color, snap, key } = planet;

  // Rise / transit / set for the planet at the observer (today's local day).
  const events = useMemo(() => {
    if (!coords) return null;
    return findEvents(now, coords.lat, coords.lon, makeBodyFn(key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lon, now.toDateString(), key]);

  if (!snap) return null;

  const upNow = snap.alt != null && snap.alt > 0;
  const showPhase = key === "mercury" || key === "venus";

  return (
    <div className="panel corner p-5" style={{ borderTopColor: color }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="display text-3xl" style={{ color }}>{symbol}</span>
        <div className="flex-1">
          <div className="display gold text-base">{name}</div>
          <div className="mono text-xs muted">
            mag <span style={{ color: "var(--accent-gold)" }}>{snap.magnitude.toFixed(2)}</span>
            {" · "}
            {snap.diamArcsec.toFixed(1)}″
          </div>
        </div>
        {showPhase && <PhaseGlyph illumFrac={snap.illumFrac} />}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DataCell
          label="Alt"
          value={fmtDeg(snap.alt ?? 0)}
          sub={snap.alt != null
            ? `${azimuthName(snap.az)} ${snap.az.toFixed(0)}°`
            : "no observer"}
        />
        <DataCell
          label="Distance"
          value={`${snap.delta.toFixed(2)} AU`}
          sub={`r ${snap.r.toFixed(2)} AU`}
        />
        <DataCell
          label="Rise"
          value={fmtTime(events?.rise)}
          sub={events?.rise && events?.maxAlt != null ? `max ${fmtDeg(events.maxAlt)}` : null}
        />
        <DataCell
          label="Set"
          value={fmtTime(events?.set)}
          sub={fmtTime(events?.transit) === "—" ? null : `transit ${fmtTime(events?.transit)}`}
        />
      </div>

      <div className="mono text-xs muted mt-3">
        phase angle {snap.phaseAngleDeg.toFixed(1)}° · illuminated {(snap.illumFrac * 100).toFixed(1)}%
        {upNow ? " · UP NOW" : " · below horizon"}
      </div>

      {key === "jupiter" && <JupiterExtras now={now} displayTz={displayTz} />}
      {key === "saturn"  && <SaturnExtras now={now} />}
    </div>
  );
}

/* Jupiter-specific extras: Galilean moon configuration + Great Red Spot
   transit times. */
function JupiterExtras({ now, displayTz }) {
  const jd = toJulian(now);
  const moons = useMemo(() => galileanMoons(jd), [jd]);
  const grsLong = grsSystemIILongitude(jd);
  const cmII = jupiterCMLongitudeII(jd);
  const transits = useMemo(() => nextGRSTransits(jd, 4).map(jdToDate), [jd]);

  return (
    <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--frame-border)" }}>
      <div className="mono text-xs uppercase tracking-widest muted mb-2">Galilean Moons</div>
      <GalileanMoonView moons={moons} />

      <div className="mono text-xs uppercase tracking-widest muted mt-4 mb-2">Great Red Spot</div>
      <div className="mono text-xs muted mb-2">
        System II: GRS at <span style={{ color: "var(--accent-gold)" }}>{grsLong.toFixed(1)}°</span>
        · CM <span style={{ color: "var(--accent-gold)" }}>{cmII.toFixed(1)}°</span>
      </div>
      <div className="space-y-1">
        {transits.map((t, i) => (
          <div key={i} className="mono text-xs flex items-center gap-2">
            <span className="muted">→</span>
            <span className="display gold">{fmtTimeTz(t, displayTz)}</span>
            <span className="muted">{t.toLocaleDateString([], { month: "short", day: "numeric" })}</span>
          </div>
        ))}
      </div>
      <div className="mono text-xs subtle mt-2 italic">
        GRS longitude drifts ~18°/yr; predictions accurate to ±30 min.
      </div>
    </div>
  );
}

/* Render the 4 Galilean moons relative to Jupiter's disc, scaled in
   Jupiter radii. Mid-line is Jupiter's equator. */
function GalileanMoonView({ moons }) {
  // Layout in Jupiter radii (J_R). Map to SVG pixels.
  const W = 320, H = 50;
  const pxPerJR = 5.5;
  const cx = W / 2, cy = H / 2;
  const colors = { Io: "#e8c878", Europa: "#dcdac0", Ganymede: "#b8a880", Callisto: "#7c6e58" };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: "var(--bg-base)" }}>
      {/* East/west tick */}
      <line x1="6" y1={cy} x2={W - 6} y2={cy} stroke="var(--frame-border)" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.4" />
      <text x="8" y={cy - 4} fontSize="8" fontFamily="JetBrains Mono" fill="var(--text-subtle)">W</text>
      <text x={W - 14} y={cy - 4} fontSize="8" fontFamily="JetBrains Mono" fill="var(--text-subtle)">E</text>

      {/* Jupiter disc */}
      <circle cx={cx} cy={cy} r={pxPerJR} fill="#d4b07a" stroke="#a08560" strokeWidth="0.5" />
      <text x={cx} y={cy + pxPerJR + 9} fontSize="7" fontFamily="JetBrains Mono"
        fill="var(--text-muted)" textAnchor="middle">JUPITER</text>

      {moons.map((m, i) => {
        const x = cx + m.x * pxPerJR;
        const y = cy - m.y * pxPerJR; // SVG y flipped
        const visible = !m.behind;
        return (
          <g key={i} opacity={visible ? 1 : 0.35}>
            <circle cx={x} cy={y} r="1.8" fill={colors[m.name]} />
            <text x={x} y={y - 4} fontSize="7" fontFamily="JetBrains Mono"
              fill={colors[m.name]} textAnchor="middle">{m.name[0]}</text>
            {m.transit && (
              <text x={x} y={y + 9} fontSize="6" fontFamily="JetBrains Mono"
                fill="var(--accent-gold)" textAnchor="middle">TR</text>
            )}
            {m.behind && (
              <text x={x} y={y + 9} fontSize="6" fontFamily="JetBrains Mono"
                fill="var(--text-subtle)" textAnchor="middle">OCC</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* Saturn-specific extras: ring tilt visualization. */
function SaturnExtras({ now }) {
  const jd = toJulian(now);
  const ring = useMemo(() => saturnRingAngles(jd), [jd]);
  const aperture = ring.apertureDeg;
  const phase = aperture < 2 ? "edge-on" : aperture < 10 ? "narrow" : aperture < 20 ? "open" : "wide open";

  return (
    <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--frame-border)" }}>
      <div className="mono text-xs uppercase tracking-widest muted mb-2">Ring Tilt</div>
      <div className="flex items-center gap-4">
        <SaturnRingView B={ring.BDeg} Bp={ring.BpDeg} />
        <div className="flex-1">
          <div className="mono text-sm">
            <span className="muted">B</span> <span className="display gold">{ring.BDeg.toFixed(2)}°</span>
            <span className="muted ml-2 text-xs">({phase})</span>
          </div>
          <div className="mono text-xs muted mt-1">
            sub-earth ring latitude · 0° = edge-on · ±26.7° max
          </div>
          <div className="mono text-xs subtle mt-1">
            illuminated face is {ring.illuminatedSide === "same" ? "toward Earth" : "away from Earth"} (B′ {ring.BpDeg.toFixed(1)}°)
          </div>
        </div>
      </div>
    </div>
  );
}

function SaturnRingView({ B, Bp }) {
  // Saturn disc radius 18px; ring outer extends to SATURN_RING_OUTER_RADII × disc.
  const W = 110, H = 70, cx = W / 2, cy = H / 2;
  const rs = 14;
  const ringR = rs * SATURN_RING_OUTER_RADII;
  const ringInner = rs * 1.24;     // C ring inner
  const ringMid = rs * 1.95;       // Cassini gap
  const sinB = Math.abs(Math.sin(B * Math.PI / 180));
  // Major axis = ringR; minor axis = ringR * |sin B|.
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ flexShrink: 0 }}>
      {/* Back half of rings (behind planet disc) */}
      <ellipse cx={cx} cy={cy} rx={ringR} ry={Math.max(0.3, ringR * sinB)}
        fill="none" stroke="#e9d29a" strokeWidth="1.4" opacity="0.55"
        clipPath="url(#saturn-back)" />
      <defs>
        <clipPath id="saturn-back">
          <rect x="0" y="0" width={W} height={cy} />
        </clipPath>
        <clipPath id="saturn-front">
          <rect x="0" y={cy} width={W} height={H - cy} />
        </clipPath>
      </defs>
      {/* Planet disc */}
      <circle cx={cx} cy={cy} r={rs} fill="#e9d29a" stroke="#b89860" strokeWidth="0.5" />
      <ellipse cx={cx} cy={cy - rs * 0.15} rx={rs * 0.9} ry={rs * 0.08} fill="#c2a070" opacity="0.4" />
      <ellipse cx={cx} cy={cy + rs * 0.25} rx={rs * 0.85} ry={rs * 0.08} fill="#c2a070" opacity="0.4" />
      {/* Front half of rings (in front of planet) */}
      <ellipse cx={cx} cy={cy} rx={ringR} ry={Math.max(0.3, ringR * sinB)}
        fill="none" stroke="#f0d8a0" strokeWidth="1.4" opacity="0.9"
        clipPath="url(#saturn-front)" />
      <ellipse cx={cx} cy={cy} rx={ringMid} ry={Math.max(0.2, ringMid * sinB)}
        fill="none" stroke="#0a0e1a" strokeWidth="0.6" opacity="0.7" />
      <ellipse cx={cx} cy={cy} rx={ringInner} ry={Math.max(0.2, ringInner * sinB)}
        fill="none" stroke="#a08560" strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}

/* Lit / dark crescent for inner planets. Same geometry as the moon glyph
   in MoonSun.jsx — the lit side is computed from the phase angle. */
function PhaseGlyph({ illumFrac }) {
  const r = 16;
  const k = 1 - 2 * illumFrac;
  const waxing = true; // direction is degenerate visually; we just show the lit fraction
  return (
    <svg viewBox="-20 -20 40 40" width="40" height="40">
      <circle cx="0" cy="0" r={r} fill="#0d1422" stroke="var(--accent-gold)" strokeWidth="0.4" />
      <path
        d={`M 0 ${-r} A ${r} ${r} 0 0 ${waxing ? 1 : 0} 0 ${r} A ${Math.abs(k) * r} ${r} 0 0 ${k > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0)} 0 ${-r} Z`}
        fill="#e9d29a"
      />
    </svg>
  );
}
