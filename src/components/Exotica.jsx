import React, { useMemo, useState } from "react";
import { fmtDeg, toJulian, lst, equatorialToHorizontal, azimuthName } from "../astro.js";
import { DataCell } from "./shared.jsx";
import {
  PULSARS, PULSAR_CLASSES,
  BLACK_HOLES, BLACK_HOLE_CLASSES,
  LOCAL_GROUP, LOCAL_GROUP_CLASSES,
  raDecDistanceToCartesian,
} from "../exotica.js";
import { TRANSIENT_EVENTS, TRANSIENT_TYPES, LIVE_FEEDS } from "../transients.js";

const SUB_TABS = [
  { key: "pulsars", label: "Pulsars" },
  { key: "bh",      label: "Black Holes" },
  { key: "lg",      label: "Local Group" },
  { key: "trans",   label: "Transients" },
];

export function Exotica({ coords, now }) {
  const [subTab, setSubTab] = useState("pulsars");
  return (
    <div className="space-y-6">
      <nav className="flex gap-1 flex-wrap items-center border-b pb-2" style={{ borderColor: "var(--panel-border)" }}>
        {SUB_TABS.map(it => {
          const active = subTab === it.key;
          return (
            <button key={it.key} onClick={() => setSubTab(it.key)} className="ghost"
              style={{
                padding: "0.4rem 0.8rem",
                border: "1px solid",
                borderColor: active ? "var(--accent-gold)" : "var(--frame-border)",
                background: active ? "var(--strip-bg)" : "transparent",
                color: active ? "var(--accent-gold)" : "var(--text-muted)",
                cursor: "pointer", borderRadius: 2,
                fontFamily: "Cinzel, serif", fontSize: "0.75rem",
                letterSpacing: "0.08em", textTransform: "uppercase",
              }}>
              {it.label}
            </button>
          );
        })}
      </nav>

      {subTab === "pulsars" && <PulsarsView coords={coords} now={now} />}
      {subTab === "bh"      && <BlackHolesView coords={coords} now={now} />}
      {subTab === "lg"      && <LocalGroupView />}
      {subTab === "trans"   && <TransientsView />}
    </div>
  );
}

/* ---- Transient events ---- */
function TransientsView() {
  const [filterType, setFilterType] = useState("all");

  const sorted = useMemo(() => {
    const rows = filterType === "all"
      ? TRANSIENT_EVENTS
      : TRANSIENT_EVENTS.filter(e => e.type === filterType);
    return [...rows].sort((a, b) => b.date.localeCompare(a.date));
  }, [filterType]);

  return (
    <div className="space-y-4">
      <div className="panel corner p-4">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <div className="display gold text-base">Transient Events</div>
            <div className="body text-xs muted mt-1" style={{ maxWidth: 720 }}>
              Curated highlights from the four major transient feeds. Each row links
              to its live catalog for up-to-the-minute alerts — TNS for supernovae,
              GraceDB for gravitational waves, CHIME/FRB for fast radio bursts,
              and NASA GCN for gamma-ray bursts.
            </div>
          </div>
          <TypeFilter activeType={filterType} setActiveType={setFilterType} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          {Object.values(TRANSIENT_TYPES).map(t => (
            <a key={t.key} href={LIVE_FEEDS[t.key].url} target="_blank" rel="noopener noreferrer"
              className="frame p-3" style={{
                borderLeft: `3px solid ${t.color}`,
                textDecoration: "none",
              }}>
              <div className="mono text-xs uppercase muted">{t.label}</div>
              <div className="display gold text-sm">{LIVE_FEEDS[t.key].name}</div>
              <div className="mono text-xs subtle mt-1">live feed →</div>
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map(ev => <TransientRow key={ev.id} ev={ev} />)}
      </div>
    </div>
  );
}

function TransientRow({ ev }) {
  const meta = TRANSIENT_TYPES[ev.type];
  const detail = ev.type === "SN" ? `peak mag ${ev.peakMag} · host ${ev.host}`
    : ev.type === "GW" ? `${ev.distMly} Mly · ${ev.source}`
    : ev.type === "FRB" ? `fluence ${ev.fluence} Jy ms · host ${ev.host}`
    : ev.type === "GRB" ? `E_iso ≈ ${ev.energyErg.toExponential(1)} erg`
    : "";
  return (
    <div className="frame p-3" style={{ borderLeft: `3px solid ${meta.color}` }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <div className="flex items-baseline gap-2">
          <span className="pill mono" style={{
            background: meta.color, color: "var(--bg-base)",
            fontSize: "0.55rem", padding: "1px 5px",
          }}>{meta.label}</span>
          <span className="display gold text-base">{ev.id}</span>
        </div>
        <div className="mono text-xs muted">
          {ev.date} · RA {(ev.ra / 15).toFixed(2)}h, Dec {ev.dec >= 0 ? "+" : ""}{ev.dec.toFixed(1)}°
        </div>
      </div>
      <div className="mono text-xs primary mb-1">{detail}</div>
      <div className="body text-xs subtle italic">{ev.note}</div>
    </div>
  );
}

function TypeFilter({ activeType, setActiveType }) {
  const opts = [{ key: "all", label: "All", color: "var(--accent-gold)" },
    ...Object.values(TRANSIENT_TYPES)];
  return (
    <div className="flex gap-1 flex-wrap">
      {opts.map(opt => (
        <button key={opt.key} onClick={() => setActiveType(opt.key)} className="ghost"
          style={{
            padding: "0.3rem 0.6rem",
            border: "1px solid",
            borderColor: activeType === opt.key ? opt.color : "var(--frame-border)",
            background: activeType === opt.key ? "var(--strip-bg)" : "transparent",
            color: activeType === opt.key ? opt.color : "var(--text-muted)",
            cursor: "pointer", borderRadius: 2,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ---- Pulsars ---- */
function PulsarsView({ coords, now }) {
  const [activeClass, setActiveClass] = useState("all");
  const observer = coords ? { lat: coords.lat, lon: coords.lon } : null;
  const sidereal = observer ? lst(toJulian(now), observer.lon) : null;

  const rows = useMemo(() => {
    return PULSARS.filter(p => activeClass === "all" || p.class === activeClass).map(p => {
      let alt = null, az = null;
      if (observer && sidereal != null) {
        const hz = equatorialToHorizontal(p.ra, p.dec, sidereal, observer.lat);
        alt = hz.alt; az = hz.az;
      }
      return { ...p, alt, az };
    });
  }, [activeClass, observer?.lat, observer?.lon, sidereal]);

  return (
    <div className="space-y-4">
      <div className="panel corner p-4">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <div className="display gold text-base">Notable Pulsars</div>
            <div className="body text-xs muted mt-1" style={{ maxWidth: 720 }}>
              Curated subset of rotation-powered pulsars, millisecond pulsars, magnetars,
              and binary / accretion-powered systems — the firsts, brightest, and most-
              cited records from the ATNF Pulsar Catalogue.
            </div>
          </div>
          <ClassFilter classes={PULSAR_CLASSES} activeClass={activeClass} setActiveClass={setActiveClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map(p => <PulsarCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}

function PulsarCard({ p }) {
  const meta = PULSAR_CLASSES[p.class];
  const freq = p.periodMs > 0 ? (1000 / p.periodMs) : null;
  const distStr = p.distLY < 100000 ? `${p.distLY.toLocaleString()} ly`
    : p.distLY < 1e9 ? `${(p.distLY / 1e6).toFixed(1)} Mly`
    : `${(p.distLY / 1e9).toFixed(1)} Gly`;
  return (
    <div className="panel corner p-5" style={{ borderTopColor: meta.color, borderTopWidth: 2 }}>
      <div className="flex items-baseline justify-between gap-2 mb-2 flex-wrap">
        <div>
          <span className="display gold text-base">{p.id}</span>
          <span className="mono text-xs muted ml-2">{p.jname}</span>
        </div>
        <span className="pill mono" style={{
          background: meta.color, color: "var(--bg-base)",
          fontSize: "0.55rem", padding: "1px 5px",
        }}>{meta.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <DataCell label="Period" value={p.periodMs > 0 ? `${p.periodMs.toFixed(2)} ms` : "—"}
          sub={freq ? `${freq.toFixed(2)} Hz` : null} />
        <DataCell label="Distance" value={distStr}
          sub={`RA ${(p.ra / 15).toFixed(2)}h  Dec ${p.dec >= 0 ? "+" : ""}${p.dec.toFixed(1)}°`} />
      </div>
      <div className="body text-xs secondary">{p.note}</div>
    </div>
  );
}

/* ---- Black Holes ---- */
function BlackHolesView({ coords, now }) {
  const [activeClass, setActiveClass] = useState("all");
  const rows = useMemo(() =>
    BLACK_HOLES.filter(b => activeClass === "all" || b.class === activeClass),
    [activeClass]
  );

  // Mass span across the catalog for the inline log bar
  const maxLogMass = Math.log10(Math.max(...BLACK_HOLES.map(b => b.massMsun)));
  const minLogMass = Math.log10(Math.min(...BLACK_HOLES.map(b => b.massMsun)));

  return (
    <div className="space-y-4">
      <div className="panel corner p-4">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <div className="display gold text-base">Black Hole Catalog</div>
            <div className="body text-xs muted mt-1" style={{ maxWidth: 720 }}>
              Spans 9+ orders of magnitude in mass — from stellar BHs in nearby
              X-ray binaries to TON 618's hypermassive 66-billion-solar-mass core.
              Each row's bar is the log of mass relative to the full catalog.
            </div>
          </div>
          <ClassFilter classes={BLACK_HOLE_CLASSES} activeClass={activeClass} setActiveClass={setActiveClass} />
        </div>
      </div>

      <div className="space-y-2">
        {rows.map(b => <BlackHoleRow key={b.id} bh={b} minLog={minLogMass} maxLog={maxLogMass} />)}
      </div>
    </div>
  );
}

function BlackHoleRow({ bh, minLog, maxLog }) {
  const meta = BLACK_HOLE_CLASSES[bh.class];
  const logMass = Math.log10(bh.massMsun);
  const fillPct = ((logMass - minLog) / (maxLog - minLog)) * 100;
  const massStr = bh.massMsun >= 1e9 ? `${(bh.massMsun / 1e9).toFixed(1)} × 10⁹ M☉`
    : bh.massMsun >= 1e6 ? `${(bh.massMsun / 1e6).toFixed(2)} × 10⁶ M☉`
    : bh.massMsun >= 1e3 ? `${(bh.massMsun / 1e3).toFixed(1)} × 10³ M☉`
    : `${bh.massMsun.toFixed(1)} M☉`;
  const distStr = bh.distLY < 100000 ? `${bh.distLY.toLocaleString()} ly`
    : bh.distLY < 1e9 ? `${(bh.distLY / 1e6).toFixed(1)} Mly`
    : `${(bh.distLY / 1e9).toFixed(1)} Gly`;

  return (
    <div className="frame p-3" style={{ borderLeft: `3px solid ${meta.color}` }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-baseline gap-2">
          <span className="display gold text-base">{bh.id}</span>
          <span className="pill mono" style={{
            background: meta.color, color: "var(--bg-base)",
            fontSize: "0.55rem", padding: "1px 5px",
          }}>{meta.label}</span>
        </div>
        <div className="mono text-xs">
          <span className="gold">{massStr}</span>
          <span className="muted ml-3">{distStr}</span>
        </div>
      </div>
      <div style={{
        height: 6, background: "var(--frame-border)", borderRadius: 1, overflow: "hidden",
      }}>
        <div style={{
          width: `${fillPct}%`, height: "100%",
          background: meta.color, opacity: 0.6,
        }} />
      </div>
      <div className="mono text-xs subtle italic mt-2">{bh.note}</div>
    </div>
  );
}

/* ---- Local Group 3D ---- */
function LocalGroupView() {
  const [yaw, setYaw] = useState(0);   // rotate around z
  const [pitch, setPitch] = useState(20); // rotate around x (tilt)

  const points = useMemo(() => {
    return LOCAL_GROUP.map(g => {
      const c = raDecDistanceToCartesian(g.ra, g.dec, g.distMly);
      return { ...g, x: c.x, y: c.y, z: c.z };
    });
  }, []);

  // Apply yaw (around z) then pitch (around x)
  const projected = useMemo(() => {
    const y = yaw * Math.PI / 180;
    const p = pitch * Math.PI / 180;
    const cosY = Math.cos(y), sinY = Math.sin(y);
    const cosP = Math.cos(p), sinP = Math.sin(p);
    return points.map(g => {
      const xr = g.x * cosY - g.y * sinY;
      const yr = g.x * sinY + g.y * cosY;
      const zr = g.z;
      // Pitch around x
      const yy = yr * cosP - zr * sinP;
      const zz = yr * sinP + zr * cosP;
      return { ...g, px: xr, py: yy, depth: zz };
    });
  }, [points, yaw, pitch]);

  // Find extent for scaling
  const maxDist = Math.max(...projected.map(g => Math.hypot(g.px, g.py)));
  const W = 720, H = 460;
  const scale = (Math.min(W, H) / 2 - 50) / Math.max(maxDist, 1);
  const cx = W / 2, cy = H / 2;
  const proj = (x, y) => [cx + x * scale, cy - y * scale];

  // Depth-sort: back to front (z farthest from viewer first)
  const sorted = [...projected].sort((a, b) => b.depth - a.depth);

  return (
    <div className="space-y-4">
      <div className="panel corner p-4">
        <div className="display gold text-base">Local Group · 3D View</div>
        <div className="body text-xs muted mt-1" style={{ maxWidth: 720 }}>
          {LOCAL_GROUP.length} galaxies plotted in heliocentric Cartesian Mly. Drag the
          sliders to rotate the view. The Milky Way sits at the origin; Andromeda and
          Triangulum dominate the far cluster ~2.5 Mly away.
        </div>
      </div>

      <div className="panel corner p-4">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: "var(--bg-base)", maxHeight: "60vh" }}>
          <defs>
            <radialGradient id="lg-bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0a1428" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#050914" stopOpacity="1" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#lg-bg)" />

          {/* Distance rings (1 Mly increments) */}
          {[1, 2, 3].map(d => (
            <circle key={d} cx={cx} cy={cy} r={d * scale}
              fill="none" stroke="var(--frame-border)" strokeWidth="0.4"
              strokeDasharray="2 4" opacity="0.4" />
          ))}
          {[1, 2, 3].map(d => (
            <text key={"lab" + d} x={cx + d * scale + 3} y={cy - 3}
              fontSize="8" fontFamily="JetBrains Mono"
              fill="var(--text-subtle)">{d} Mly</text>
          ))}

          {/* Galaxies */}
          {sorted.map(g => {
            const meta = LOCAL_GROUP_CLASSES[g.class];
            const [x, y] = proj(g.px, g.py);
            // Size by log of luminosity proxy (diameter)
            const r = 2 + Math.log10(Math.max(g.diamKpc, 0.5)) * 2.5;
            // Depth shading
            const isMW = g.distMly === 0;
            const opacity = isMW ? 1 : 0.4 + (1 - (g.depth / 4)) * 0.5;
            return (
              <g key={g.id}>
                <circle cx={x} cy={y} r={r + 3} fill={meta.color} opacity={Math.max(0.15, opacity * 0.3)} />
                <circle cx={x} cy={y} r={r} fill={meta.color}
                  stroke={isMW ? "var(--accent-gold)" : "var(--bg-base)"}
                  strokeWidth={isMW ? 1.5 : 0.4}
                  opacity={Math.max(0.5, opacity)} />
                <text x={x + r + 4} y={y + 3} fontSize="9" fontFamily="JetBrains Mono"
                  fill={meta.color} opacity={Math.max(0.6, opacity)}>{g.id}</text>
              </g>
            );
          })}
        </svg>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <div className="mono text-xs muted mb-1">Yaw <span className="gold">{yaw}°</span></div>
            <input type="range" min={-180} max={180} step={5}
              value={yaw} onChange={(e) => setYaw(parseInt(e.target.value))}
              style={{ width: "100%" }} />
          </div>
          <div>
            <div className="mono text-xs muted mb-1">Pitch <span className="gold">{pitch}°</span></div>
            <input type="range" min={-90} max={90} step={5}
              value={pitch} onChange={(e) => setPitch(parseInt(e.target.value))}
              style={{ width: "100%" }} />
          </div>
        </div>

        <div className="flex gap-3 flex-wrap mt-3 mono text-xs">
          {Object.values(LOCAL_GROUP_CLASSES).map(c => (
            <span key={c.key} className="flex items-center gap-1">
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: c.color }} />
              <span className="secondary">{c.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Shared class filter strip. */
function ClassFilter({ classes, activeClass, setActiveClass }) {
  const opts = [{ key: "all", label: "All", color: "var(--accent-gold)" }, ...Object.values(classes)];
  return (
    <div className="flex gap-1 flex-wrap">
      {opts.map(opt => (
        <button key={opt.key} onClick={() => setActiveClass(opt.key)} className="ghost"
          style={{
            padding: "0.3rem 0.6rem",
            border: "1px solid",
            borderColor: activeClass === opt.key ? opt.color : "var(--frame-border)",
            background: activeClass === opt.key ? "var(--strip-bg)" : "transparent",
            color: activeClass === opt.key ? opt.color : "var(--text-muted)",
            cursor: "pointer", borderRadius: 2,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "0.65rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
