import React, { useEffect, useMemo, useRef, useState } from "react";
import { DataCell } from "./shared.jsx";

/* Solar tab — pulls live imagery and data from NOAA SWPC's Space
   Weather Enthusiast products. Each image card shows the latest static
   frame and offers click-to-play animation: clicking fetches a list of
   recent frames from the matching `/products/animations/<id>.json`
   endpoint and cycles through them. Refresh cadences match what NOAA
   publishes (4 min for SUVI, 12 min for LASCO and HMI, 6 hours for
   ENLIL, hourly for the ACE 24-hour summary). */

const SWPC = "https://services.swpc.noaa.gov";

// Each card: latest still image + (optional) animation feed id.
const SUVI_CHANNELS = [
  { wl: "094", label: "094 Å · Hot Plasma (~6 MK)", note: "Flares & active regions" },
  { wl: "131", label: "131 Å · Flares (~10 MK)", note: "Hottest flare plasma" },
  { wl: "171", label: "171 Å · Quiet Corona (~600 K)", note: "Coronal loops" },
  { wl: "195", label: "195 Å · Active Corona (~1.5 MK)", note: "Coronal holes" },
  { wl: "284", label: "284 Å · Active Regions (~2 MK)", note: "Magnetic regions" },
  { wl: "304", label: "304 Å · Chromosphere (~80 K)", note: "Filaments / prominences" },
];

export function Solar() {
  return (
    <div className="space-y-6">
      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-2 muted">Live Sun · NOAA SWPC + GOES SUVI / SOHO LASCO / SDO HMI</div>
        <div className="body text-sm secondary">
          Real-time solar imagery and data, refreshed at the same cadence NOAA publishes them.
          Click any image to play the most recent ~24 h as an animation; click again to pause and return to the live frame.
        </div>
      </div>

      {/* HERO: SUVI 304 — the most striking + most aurora-relevant view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SolarCard
            title="SUVI · 304 Å · Chromosphere"
            sub="GOES Solar Ultraviolet Imager — filaments, prominences, active regions"
            stillUrl={`${SWPC}/images/animations/suvi/primary/304/latest.png`}
            animationId="suvi-primary-304"
            refreshSeconds={240}
            heroSize
          />
        </div>
        <div>
          <SolarCard
            title="SDO HMI · Visible (continuum)"
            sub="Solar photosphere — sunspot positions"
            stillUrl={`${SWPC}/images/animations/sdo-hmii/latest.jpg`}
            refreshSeconds={720}
            stillKind="jpg"
          />
        </div>
      </div>

      {/* SUVI multi-wavelength gallery */}
      <div className="panel corner p-5">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">SUVI Multi-Wavelength · GOES-19 Primary</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SUVI_CHANNELS.map((c) => (
            <SolarCard
              key={c.wl}
              title={c.label}
              sub={c.note}
              stillUrl={`${SWPC}/images/animations/suvi/primary/${c.wl}/latest.png`}
              animationId={`suvi-primary-${c.wl}`}
              refreshSeconds={240}
              compact
            />
          ))}
        </div>
      </div>

      {/* LASCO + ENLIL (CME / heliospheric) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SolarCard
          title="LASCO C3 · Coronagraph"
          sub="SOHO C3 — sees CMEs erupting from the Sun out to 32 R⊙"
          stillUrl={`${SWPC}/images/animations/lasco-c3/latest.jpg`}
          animationId="lasco-c3"
          refreshSeconds={720}
          stillKind="jpg"
        />
        <SolarCard
          title="WSA-ENLIL · Solar Wind Prediction"
          sub="Heliospheric model — Earth (yellow disk) inside the predicted solar wind"
          stillUrl={`${SWPC}/images/animations/enlil/latest.jpg`}
          animationId="enlil"
          refreshSeconds={6 * 3600}
          stillKind="jpg"
        />
      </div>

      {/* ACE 24-hour magnetometer + SWEPAM combined chart from NOAA */}
      <SolarCard
        title="ACE Magnetometer + SWEPAM · Last 24 Hours"
        sub="Interplanetary magnetic field (top) and solar wind plasma (bottom) at L1"
        stillUrl={`${SWPC}/images/ace-mag-swepam-24-hour.gif`}
        refreshSeconds={300}
        stillKind="gif"
        wide
      />

      {/* OVATION aurora forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SolarCard
          title="OVATION · Aurora Forecast (North)"
          sub="30-minute aurora intensity forecast over the northern hemisphere"
          stillUrl={`${SWPC}/images/animations/ovation/north/latest.jpg`}
          refreshSeconds={300}
          stillKind="jpg"
        />
        <SolarCard
          title="OVATION · Aurora Forecast (South)"
          sub="30-minute aurora intensity forecast over the southern hemisphere"
          stillUrl={`${SWPC}/images/animations/ovation/south/latest.jpg`}
          refreshSeconds={300}
          stillKind="jpg"
        />
      </div>

      {/* Sunspot progression — drawn from NOAA's solar-cycle JSON */}
      <SunspotProgressionCard />

      <div className="panel corner p-5 mono text-xs subtle">
        Imagery © NOAA SWPC · NASA SDO · ESA/NASA SOHO LASCO. All sources are NOAA Space Weather Enthusiast Dashboard products.
      </div>
    </div>
  );
}

/* A single image card with click-to-play animation. */
function SolarCard({ title, sub, stillUrl, animationId, refreshSeconds, stillKind = "png", compact, hero, heroSize, wide }) {
  // bust = appended to the still URL so the browser refetches; bumped on a
  // refresh interval matching NOAA's cadence for that product.
  const [bust, setBust] = useState(0);
  useEffect(() => {
    if (!refreshSeconds) return;
    const id = setInterval(() => setBust((b) => b + 1), refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [refreshSeconds]);

  const [playing, setPlaying] = useState(false);
  const [frames, setFrames] = useState(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const playerRef = useRef(null);

  // Fetch animation frames the first time the user hits play.
  useEffect(() => {
    if (!playing || frames || !animationId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`${SWPC}/products/animations/${animationId}.json`)
      .then((r) => r.json())
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return;
        // Prefetch each frame so playback is smooth.
        const urls = rows.map((r) => `${SWPC}${r.url}`);
        urls.forEach((u) => { const im = new Image(); im.src = u; });
        setFrames(urls);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [playing, animationId, frames]);

  // Animation frame ticker.
  useEffect(() => {
    if (!playing || !frames || frames.length === 0) return;
    const id = setInterval(() => {
      setFrameIdx((i) => (i + 1) % frames.length);
    }, 90);
    playerRef.current = id;
    return () => clearInterval(id);
  }, [playing, frames]);

  const onClick = () => {
    if (!animationId) return; // no animation feed; image is non-interactive
    if (playing) {
      setPlaying(false);
      setFrameIdx(0);
    } else {
      setPlaying(true);
    }
  };

  const src = playing && frames && frames.length > 0
    ? frames[frameIdx]
    : `${stillUrl}?cb=${bust}`;

  const aspectClass = wide ? "aspect-[2/1]" : heroSize ? "aspect-square" : "aspect-square";

  return (
    <div className={`frame ${compact ? "p-2" : "p-3"} ${animationId ? "cursor-pointer" : ""}`} onClick={onClick}
      title={animationId ? (playing ? "Click to stop and return to live" : "Click to play recent animation") : ""}
      style={{ position: "relative", overflow: "hidden" }}>
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-1">
        <div className={`display gold ${compact ? "text-xs" : "text-sm"}`}>{title}</div>
        {animationId && (
          <div className="mono subtle" style={{ fontSize: "0.6rem" }}>
            {playing ? (
              <span style={{ color: "var(--accent-green)" }}>● PLAYING {frames ? `${frameIdx + 1}/${frames.length}` : "…"}</span>
            ) : (
              <span>▶ click to play</span>
            )}
          </div>
        )}
      </div>
      {sub && !compact && <div className="body text-xs muted mb-2">{sub}</div>}
      <div className={`${aspectClass}`} style={{ background: "#000", borderRadius: 2, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          src={src}
          alt={title}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000" }}
        />
      </div>
      {loading && (
        <div className="mono subtle text-xs mt-1" style={{ color: "var(--accent-gold)" }}>loading frames…</div>
      )}
    </div>
  );
}

/* Sunspot number progression — observed monthly SSN since 1749 plus the
   smoothed curve and SWPC's predicted Cycle 25 path. */
function SunspotProgressionCard() {
  const [observed, setObserved] = useState(null);
  const [predicted, setPredicted] = useState(null);
  useEffect(() => {
    Promise.all([
      fetch(`${SWPC}/json/solar-cycle/observed-solar-cycle-indices.json`).then((r) => r.json()),
      fetch(`${SWPC}/json/solar-cycle/predicted-solar-cycle.json`).then((r) => r.json()),
    ]).then(([o, p]) => { setObserved(o); setPredicted(p); }).catch(() => {});
  }, []);

  const view = useMemo(() => {
    if (!observed) return null;
    // Limit to the modern era so cycles 21-25+ are legible.
    const cutoff = "1986-01";
    const obs = observed.filter((d) => d["time-tag"] >= cutoff);
    return { obs, pred: predicted ?? [] };
  }, [observed, predicted]);

  return (
    <div className="panel corner p-5">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div className="mono text-xs uppercase tracking-widest muted">Sunspot Number Progression · Solar Cycles 22 – 25</div>
        <div className="mono text-xs subtle">SILSO observed · SWPC smoothed · NOAA predicted</div>
      </div>
      {!view ? (
        <div className="mono text-xs subtle">Loading SILSO record…</div>
      ) : (
        <SunspotChart obs={view.obs} pred={view.pred} />
      )}
      {observed && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <DataCell label="Latest month" value={observed[observed.length - 1]["time-tag"]} />
          <DataCell label="Observed SSN" value={observed[observed.length - 1].ssn?.toFixed(1) ?? "—"} sub="raw monthly mean" />
          <DataCell label="Smoothed SSN" value={fmtMaybe(observed[observed.length - 1].smoothed_swpc_ssn)} sub="13-month running mean" />
          <DataCell label="F10.7 cm flux" value={fmtMaybe(observed[observed.length - 1]["f10.7"])} sub="solar radio flux" />
        </div>
      )}
    </div>
  );
}

function fmtMaybe(v) { return (v == null || v < 0) ? "—" : v.toFixed(1); }

function SunspotChart({ obs, pred }) {
  const W = 800, H = 240, P = 36;
  const allTimes = [...obs.map((d) => d["time-tag"]), ...pred.map((d) => d["time-tag"])];
  const xMin = allTimes[0];
  const xMax = allTimes[allTimes.length - 1];
  const tToFloat = (t) => {
    const [y, m] = t.split("-").map(Number);
    return y + (m - 1) / 12;
  };
  const xMinF = tToFloat(xMin);
  const xMaxF = tToFloat(xMax);
  const yMax = 250;
  const xScale = (t) => P + ((tToFloat(t) - xMinF) / (xMaxF - xMinF)) * (W - P * 2);
  const yScale = (v) => H - P - (Math.max(0, v) / yMax) * (H - P * 2);

  const obsPath = obs.map((d, i) =>
    Number.isFinite(d.ssn) && d.ssn >= 0
      ? `${i === 0 ? "M" : "L"} ${xScale(d["time-tag"])} ${yScale(d.ssn)}`
      : ""
  ).join(" ");

  const smoothedSeries = obs.filter((d) => d.smoothed_swpc_ssn != null && d.smoothed_swpc_ssn >= 0);
  const smoothedPath = smoothedSeries.map((d, i) =>
    `${i === 0 ? "M" : "L"} ${xScale(d["time-tag"])} ${yScale(d.smoothed_swpc_ssn)}`
  ).join(" ");

  const predPath = pred.map((d, i) =>
    `${i === 0 ? "M" : "L"} ${xScale(d["time-tag"])} ${yScale(d.predicted_ssn)}`
  ).join(" ");

  // Confidence band: high to low, reversed
  const bandPoints = [
    ...pred.map((d) => `${xScale(d["time-tag"])},${yScale(d.high_ssn)}`),
    ...[...pred].reverse().map((d) => `${xScale(d["time-tag"])},${yScale(d.low_ssn)}`),
  ].join(" ");

  // Year axis ticks every 5 years
  const ticks = [];
  for (let y = Math.ceil(xMinF / 5) * 5; y <= xMaxF; y += 5) {
    ticks.push(y);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {/* y axis grid */}
      {[0, 50, 100, 150, 200, 250].map((y) => (
        <g key={y}>
          <line x1={P} y1={yScale(y)} x2={W - P} y2={yScale(y)} stroke="var(--text-muted)" strokeDasharray="2 4" strokeWidth="0.5" opacity="0.3" />
          <text x={P - 4} y={yScale(y) + 3} fontSize="9" fontFamily="JetBrains Mono" fill="var(--text-muted)" textAnchor="end">{y}</text>
        </g>
      ))}
      {/* x axis ticks (years) */}
      {ticks.map((y) => {
        const x = P + ((y - xMinF) / (xMaxF - xMinF)) * (W - P * 2);
        return (
          <g key={y}>
            <line x1={x} y1={H - P} x2={x} y2={H - P + 4} stroke="var(--text-muted)" strokeWidth="0.5" />
            <text x={x} y={H - P + 14} fontSize="9" fontFamily="JetBrains Mono" fill="var(--text-muted)" textAnchor="middle">{y}</text>
          </g>
        );
      })}
      {/* Predicted band */}
      {pred.length > 0 && (
        <polygon points={bandPoints} fill="var(--accent-purple)" opacity="0.15" />
      )}
      {/* Raw monthly observed */}
      <path d={obsPath} fill="none" stroke="var(--text-muted)" strokeWidth="1" opacity="0.55" />
      {/* SWPC smoothed */}
      <path d={smoothedPath} fill="none" stroke="var(--accent-gold)" strokeWidth="2" />
      {/* Predicted curve */}
      {pred.length > 0 && (
        <path d={predPath} fill="none" stroke="var(--accent-purple)" strokeWidth="2" strokeDasharray="4 3" />
      )}
      {/* Legend */}
      <g fontFamily="JetBrains Mono" fontSize="9">
        <text x={W - P - 220} y={20} fill="var(--text-muted)">— monthly observed</text>
        <text x={W - P - 110} y={20} fill="var(--accent-gold)">— smoothed</text>
        <text x={W - P - 40} y={20} fill="var(--accent-purple)">--- predicted</text>
      </g>
    </svg>
  );
}
