import React, { useMemo, useState } from "react";
import {
  fmtDeg, fmtTime, azimuthName, toJulian, lst, equatorialToHorizontal,
  findEvents, MOON_NEGLIGIBLE_ALT_DEG,
} from "../astro.js";
import { DataCell, FactorRow } from "./shared.jsx";
import {
  MESSIER, CALDWELL, NGC_IC, ALL_DSO, DSO_TYPES,
  surfaceBrightness, surfaceBrightnessTier, magnitudeLimitForAperture,
} from "../deepSky.js";
import { TELESCOPE_IMAGES, telescopeImageCounts } from "../telescopeImages.js";

const CATALOGS = [
  { key: "best",   label: "Best tonight" },
  { key: "all",    label: "All" },
  { key: "Messier",label: "Messier" },
  { key: "Caldwell",label: "Caldwell" },
  { key: "ngcic",  label: "NGC / IC" },
  { key: "telescope", label: "Hubble / JWST" },
];

/* Default type filters — start with everything on. */
const DEFAULT_TYPE_FILTER = Object.fromEntries(
  Object.keys(DSO_TYPES).map(k => [k, true])
);

export function DeepSky({ coords, now, sky, bortle, weather, weatherStale }) {
  const [subTab, setSubTab] = useState("best");
  const [typeFilter, setTypeFilter] = useState(DEFAULT_TYPE_FILTER);
  const [magLimit, setMagLimit] = useState(10.0);
  const [minSize, setMinSize] = useState(0); // arcmin
  const [scopeMm, setScopeMm] = useState(0); // 0 = naked eye

  const cloud = weatherStale ? null : weather?.current?.cloud_cover ?? null;

  const observer = coords ? { lat: coords.lat, lon: coords.lon } : null;

  const baseRows = useMemo(() => {
    if (subTab === "Messier") return MESSIER;
    if (subTab === "Caldwell") return CALDWELL;
    if (subTab === "ngcic") return NGC_IC;
    if (subTab === "all" || subTab === "best") return ALL_DSO;
    return ALL_DSO;
  }, [subTab]);

  const filtered = useMemo(() => {
    return baseRows.filter(r => {
      if (!typeFilter[r.type]) return false;
      if (r.mag > magLimit) return false;
      if (r.size < minSize) return false;
      return true;
    });
  }, [baseRows, typeFilter, magLimit, minSize]);

  return (
    <div className="space-y-6">
      <SubTabNav subTab={subTab} setSubTab={setSubTab} />

      <FilterBar
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        magLimit={magLimit} setMagLimit={setMagLimit}
        minSize={minSize} setMinSize={setMinSize}
        scopeMm={scopeMm} setScopeMm={setScopeMm}
      />

      {subTab === "best" ? (
        <BestTonight rows={filtered} observer={observer} now={now} sky={sky} bortle={bortle} cloud={cloud} scopeMm={scopeMm} />
      ) : subTab === "telescope" ? (
        <TelescopeGallery observer={observer} now={now} />
      ) : (
        <ObjectTable rows={filtered} observer={observer} now={now} scopeMm={scopeMm} />
      )}
    </div>
  );
}

/* Iconic Hubble + JWST imagery, click-through to the official press pages.
   Filterable by telescope; sortable optionally — kept compact since the
   curated set is small. */
function TelescopeGallery({ observer, now }) {
  const [filterTel, setFilterTel] = useState("all");
  const counts = telescopeImageCounts();
  const jd = toJulian(now);
  const sidereal = observer ? lst(jd, observer.lon) : null;

  const items = useMemo(() => {
    return TELESCOPE_IMAGES.filter(t => filterTel === "all" || t.telescope.toLowerCase() === filterTel)
      .map(t => {
        let altNow = null, azNow = null;
        if (observer && sidereal != null) {
          const hz = equatorialToHorizontal(t.ra, t.dec, sidereal, observer.lat);
          altNow = hz.alt;
          azNow = hz.az;
        }
        return { ...t, altNow, azNow };
      });
  }, [filterTel, observer?.lat, observer?.lon, sidereal]);

  return (
    <div className="space-y-4">
      <div className="panel corner p-4">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <div className="display gold text-base">Hubble &amp; JWST iconic imagery</div>
            <div className="body text-xs muted mt-1">
              {counts.hubble} Hubble + {counts.jwst} JWST press releases, with the sky
              position of each target. Click any tile for the full-resolution release page.
            </div>
          </div>
          <div className="flex gap-1">
            {[
              { v: "all",    label: `All (${counts.total})` },
              { v: "hubble", label: `Hubble (${counts.hubble})` },
              { v: "jwst",   label: `JWST (${counts.jwst})` },
            ].map(opt => (
              <button key={opt.v}
                onClick={() => setFilterTel(opt.v)}
                className="ghost"
                style={{
                  padding: "0.3rem 0.6rem",
                  border: "1px solid",
                  borderColor: filterTel === opt.v ? "var(--accent-gold)" : "var(--frame-border)",
                  background: filterTel === opt.v ? "var(--strip-bg)" : "transparent",
                  color: filterTel === opt.v ? "var(--accent-gold)" : "var(--text-muted)",
                  cursor: "pointer",
                  borderRadius: 2,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "0.65rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(img => <TelescopeCard key={img.id} img={img} />)}
      </div>
    </div>
  );
}

function TelescopeCard({ img }) {
  const teleColor = img.telescope === "JWST" ? "#e89a5a" : "#5b9cf7";
  return (
    <a href={img.page} target="_blank" rel="noopener noreferrer"
      className="panel corner p-0"
      style={{
        textDecoration: "none",
        borderTop: `2px solid ${teleColor}`,
        display: "block",
        overflow: "hidden",
      }}>
      <div style={{
        width: "100%",
        aspectRatio: "16 / 10",
        background: "linear-gradient(135deg, #0a0e1a, #1a2030)",
        overflow: "hidden",
        position: "relative",
      }}>
        <img src={img.thumb} alt={img.target}
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            display: "block",
          }}
          onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <span style={{
          position: "absolute", top: 8, right: 8,
          padding: "2px 6px",
          background: teleColor, color: "var(--bg-base)",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "0.55rem", letterSpacing: "0.08em",
          textTransform: "uppercase", borderRadius: 2,
        }}>{img.telescope} · {img.year}</span>
      </div>
      <div className="p-4">
        <div className="display gold text-base">{img.target}</div>
        <div className="mono text-xs muted mb-2">{img.constellation} · {img.instrument}</div>
        <div className="body text-xs primary" style={{ lineHeight: 1.5 }}>{img.description}</div>
        {img.altNow != null && (
          <div className="mono text-xs subtle mt-3">
            sky right now: {img.altNow > 0
              ? <span style={{ color: img.altNow > 30 ? "var(--accent-green)" : "var(--accent-gold)" }}>
                  {fmtDeg(img.altNow)} alt · {azimuthName(img.azNow)} {fmtDeg(img.azNow)}
                </span>
              : <span className="muted">below horizon</span>}
          </div>
        )}
      </div>
    </a>
  );
}

function SubTabNav({ subTab, setSubTab }) {
  return (
    <nav className="flex gap-1 flex-wrap items-center border-b pb-2" style={{ borderColor: "var(--panel-border)" }}>
      {CATALOGS.map(it => {
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
            }}
          >
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}

function FilterBar({ typeFilter, setTypeFilter, magLimit, setMagLimit, minSize, setMinSize, scopeMm, setScopeMm }) {
  const toggleType = (k) => setTypeFilter(prev => ({ ...prev, [k]: !prev[k] }));
  return (
    <div className="panel corner p-4">
      <div className="mono text-xs uppercase tracking-widest muted mb-3">Filter</div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2">
          <div className="mono text-xs muted mb-2">Object type</div>
          <div className="flex flex-wrap gap-2">
            {Object.values(DSO_TYPES).map(t => (
              <button key={t.key} onClick={() => toggleType(t.key)}
                className="ghost"
                style={{
                  padding: "0.3rem 0.6rem",
                  border: "1px solid",
                  borderColor: typeFilter[t.key] ? t.color : "var(--frame-border)",
                  background: typeFilter[t.key] ? "var(--strip-bg)" : "transparent",
                  color: typeFilter[t.key] ? t.color : "var(--text-muted)",
                  cursor: "pointer",
                  borderRadius: 2,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "0.65rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mono text-xs muted mb-1">
            Magnitude limit: <span className="gold">{magLimit.toFixed(1)}</span>
          </div>
          <input type="range" min={3} max={13} step={0.5}
            value={magLimit} onChange={(e) => setMagLimit(parseFloat(e.target.value))}
            style={{ width: "100%" }} />
          <div className="mono text-xs subtle">Higher = fainter objects shown.</div>
        </div>

        <div>
          <div className="mono text-xs muted mb-1">
            Min size: <span className="gold">{minSize}′</span>
          </div>
          <input type="range" min={0} max={60} step={1}
            value={minSize} onChange={(e) => setMinSize(parseInt(e.target.value))}
            style={{ width: "100%" }} />
          <div className="mono text-xs subtle">Hides tiny telescope-only targets.</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mono text-xs muted mb-1">
          Scope aperture: <span className="gold">{scopeMm === 0 ? "Naked eye" : `${scopeMm} mm`}</span>
          <span className="ml-2 subtle">limiting mag ≈ {magnitudeLimitForAperture(scopeMm).toFixed(1)}</span>
        </div>
        <input type="range" min={0} max={400} step={10}
          value={scopeMm} onChange={(e) => setScopeMm(parseInt(e.target.value))}
          style={{ width: "100%" }} />
        <div className="mono text-xs flex justify-between subtle">
          <span>naked eye</span><span>50mm binos</span><span>8" Dob</span><span>16" SCT</span>
        </div>
      </div>
    </div>
  );
}

function ObjectTable({ rows, observer, now, scopeMm }) {
  const jd = toJulian(now);
  const sidereal = observer ? lst(jd, observer.lon) : null;
  const magLim = magnitudeLimitForAperture(scopeMm);

  return (
    <div className="panel corner p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="mono text-xs uppercase tracking-widest muted">
          {rows.length} object{rows.length === 1 ? "" : "s"} match filters
        </div>
        <div className="mono text-xs subtle">
          {scopeMm === 0 ? "Naked-eye limit ~6.5" : `${scopeMm}mm limit ~${magLim.toFixed(1)} mag`}
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-2 pb-2 mono text-xs uppercase muted"
        style={{ borderBottom: "1px solid var(--frame-border)" }}>
        <div className="col-span-2">ID</div>
        <div className="col-span-3">Name</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-1 text-right">Mag</div>
        <div className="col-span-1 text-right">Size</div>
        <div className="col-span-1 text-right">SB</div>
        <div className="col-span-2 text-right">Alt now</div>
      </div>

      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {rows.map(r => {
          const sb = surfaceBrightness(r.mag, r.size);
          const sbTier = surfaceBrightnessTier(sb);
          let altNow = null, azNow = null;
          if (observer) {
            const hz = equatorialToHorizontal(r.ra, r.dec, sidereal, observer.lat);
            altNow = hz.alt; azNow = hz.az;
          }
          const reachable = r.mag <= magLim;
          return (
            <div key={r.id + r.catalog} className="grid grid-cols-12 gap-2 px-2 py-2 mono text-xs items-center"
              style={{ borderBottom: "1px solid var(--frame-border)", opacity: reachable ? 1 : 0.45 }}>
              <div className="col-span-2 display gold">{r.id}</div>
              <div className="col-span-3 primary">
                <div>{r.name || <span className="muted italic">(no common name)</span>}</div>
                <div className="subtle text-xs">{r.constellation}</div>
              </div>
              <div className="col-span-2">
                <span className="pill mono" style={{
                  background: DSO_TYPES[r.type]?.color || "var(--accent-gold)",
                  color: "var(--bg-base)",
                  fontSize: "0.55rem",
                  padding: "1px 5px",
                }}>{DSO_TYPES[r.type]?.label || r.type}</span>
              </div>
              <div className="col-span-1 text-right gold">{r.mag.toFixed(1)}</div>
              <div className="col-span-1 text-right secondary">{r.size}′</div>
              <div className="col-span-1 text-right" style={{ color: sbTier.color }}>
                {sb != null ? sb.toFixed(1) : "—"}
              </div>
              <div className="col-span-2 text-right">
                {altNow != null ? (
                  <div>
                    <div style={{ color: altNow > 30 ? "var(--accent-green)" : altNow > 0 ? "var(--accent-gold)" : "var(--text-muted)" }}>
                      {fmtDeg(altNow)}
                    </div>
                    <div className="subtle text-xs">{altNow > 0 ? azimuthName(azNow) : "below horizon"}</div>
                  </div>
                ) : (
                  <span className="subtle">no fix</span>
                )}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="mono text-sm subtle italic text-center py-6">
            No objects match the current filters. Loosen magnitude or size limits.
          </div>
        )}
      </div>
    </div>
  );
}

/* "Best tonight" — score each object by altitude integrated over astronomical
   night (sun < -18°), penalize bright objects below scope/eye limit, prefer
   higher surface brightness in light-polluted skies. */
function BestTonight({ rows, observer, now, sky, bortle, cloud, scopeMm }) {
  const magLim = magnitudeLimitForAperture(scopeMm);

  const ranked = useMemo(() => {
    if (!observer) return [];
    const jd = toJulian(now);

    return rows
      .filter(r => r.mag <= magLim + 0.5)
      .map(r => {
        const events = findEvents(now, observer.lat, observer.lon, () => ({ ra: r.ra, dec: r.dec }));
        const maxAlt = events.maxAlt;
        const sb = surfaceBrightness(r.mag, r.size);

        // Composite score
        let score = 0;
        score += Math.max(0, maxAlt) * 1.2;         // higher is better
        score += Math.max(0, magLim + 0.5 - r.mag) * 3; // headroom over your limit
        if (sb != null) score -= Math.max(0, sb - 21) * 1.5; // penalize low SB under LP
        if (bortle >= 6 && sb != null && sb > 22) score -= 8;
        if (maxAlt < 15) score -= 15;
        return { ...r, events, maxAlt, sb };
      })
      .sort((a, b) => /* score-sort by max altitude then mag */
        (b.maxAlt - a.maxAlt) + (a.mag - b.mag) * 1.5
      )
      .slice(0, 12);
  }, [rows, observer?.lat, observer?.lon, now.toDateString(), magLim, bortle]);

  if (!observer) {
    return (
      <div className="panel corner p-8 text-center mono muted">
        Location required to recommend tonight's targets.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="panel corner p-4">
        <div className="display gold text-base mb-1">Tonight's recommended targets</div>
        <div className="body text-xs muted">
          Ranked by maximum altitude during the night and your filter settings.
          Surface brightness tier reflects difficulty under your sky — under Bortle {bortle},
          low-SB targets {bortle >= 6 ? "are challenging" : "are achievable"}.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ranked.map(r => (
          <BestObjectCard key={r.id + r.catalog} obj={r} bortle={bortle} cloud={cloud} sky={sky} />
        ))}
        {ranked.length === 0 && (
          <div className="panel corner p-6 text-center mono muted">
            No targets within your magnitude limit pass overhead tonight. Try a larger scope or loosen the type filter.
          </div>
        )}
      </div>
    </div>
  );
}

function BestObjectCard({ obj, bortle, cloud, sky }) {
  const sbTier = surfaceBrightnessTier(obj.sb);
  const typeColor = DSO_TYPES[obj.type]?.color || "var(--accent-gold)";
  return (
    <div className="panel corner p-5" style={{ borderTopColor: typeColor, borderTopWidth: 2 }}>
      <div className="flex items-baseline justify-between mb-2 gap-2 flex-wrap">
        <div>
          <span className="display gold text-base">{obj.id}</span>
          {obj.name && <span className="body primary ml-2">{obj.name}</span>}
        </div>
        <span className="pill mono" style={{
          background: typeColor, color: "var(--bg-base)",
          fontSize: "0.55rem", padding: "1px 5px",
        }}>{DSO_TYPES[obj.type]?.label}</span>
      </div>
      <div className="mono text-xs muted mb-3">{obj.constellation} · {obj.catalog}</div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <DataCell label="Magnitude" value={obj.mag.toFixed(1)} sub={obj.size + "′ across"} />
        <DataCell label="Max altitude tonight" value={fmtDeg(obj.maxAlt)}
          sub={obj.events?.transit ? `transit ${fmtTime(obj.events.transit)}` : "—"} />
        <DataCell label="Rise" value={fmtTime(obj.events?.rise)} />
        <DataCell label="Set"  value={fmtTime(obj.events?.set)} />
      </div>

      <div className="mono text-xs space-y-1">
        <div className="flex justify-between">
          <span className="muted">Surface brightness</span>
          <span style={{ color: sbTier.color }}>
            {obj.sb != null ? `${obj.sb.toFixed(1)} mag/arcmin² · ${sbTier.tier}` : "—"}
          </span>
        </div>
        {obj.note && (
          <div className="body text-xs subtle italic mt-2">{obj.note}</div>
        )}
      </div>
    </div>
  );
}
