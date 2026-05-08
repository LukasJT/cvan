import React, { useEffect, useRef, useState } from "react";
import { BORTLE } from "../astro.js";

export function LocationBar({
  coords, locating, locError,
  onSearchSubmit,
  coordInput, setCoordInput, applyManualCoords,
  retryGeolocation,
  bortleAuto, viirsState,
  mapOpen, setMapOpen,
}) {
  return (
    <div className="panel corner p-5">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-4">
          <div className="mono text-xs uppercase tracking-widest mb-1 muted">Position Fix</div>
          {coords ? (
            <div>
              <div className="display gold text-sm truncate">{coords.label}</div>
              <div className="mono text-xs mt-0.5 secondary">
                {coords.lat.toFixed(4)}°, {coords.lon.toFixed(4)}°
              </div>
            </div>
          ) : (
            <div className="body italic muted">{locating ? "Acquiring..." : "No fix"}</div>
          )}
          {locError && <div className="mono text-xs mt-1" style={{ color: "var(--error)" }}>{locError}</div>}
        </div>

        <div className="md:col-span-4">
          <div className="mono text-xs uppercase tracking-widest mb-1 muted">Search City / Place</div>
          <CityAutocomplete onSubmit={onSearchSubmit} />
        </div>

        <div className="md:col-span-3">
          <div className="mono text-xs uppercase tracking-widest mb-1 muted">Manual Coords</div>
          <div className="flex gap-1">
            <input style={{ width: "70px" }} placeholder="lat" value={coordInput.lat} onChange={(e) => setCoordInput({ ...coordInput, lat: e.target.value })} />
            <input style={{ width: "70px" }} placeholder="lon" value={coordInput.lon} onChange={(e) => setCoordInput({ ...coordInput, lon: e.target.value })} />
            <button className="ghost" onClick={applyManualCoords}>SET</button>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="flex flex-col gap-1">
            <button className="ghost" onClick={retryGeolocation} title="Use my GPS">GPS</button>
            <button className="ghost" onClick={() => setMapOpen(!mapOpen)} title="Pick on map" style={mapOpen ? { color: "var(--bg-base)", background: "var(--accent-gold)" } : undefined}>MAP</button>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--panel-border)" }}>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <div className="mono text-xs uppercase tracking-widest muted">
            Light Pollution · Bortle Class
          </div>
          {viirsState === "loading" && (
            <span className="pill mono" style={{ background: "var(--text-muted)", color: "var(--bg-base)" }}>FETCHING NOAA VIIRS…</span>
          )}
          {viirsState === "error" && (
            <span className="pill mono" style={{ background: "var(--error)", color: "var(--bg-base)" }}>VIIRS UNAVAILABLE</span>
          )}
          {viirsState === "ok" && (
            <span className="pill mono" style={{ background: "var(--accent-green)", color: "var(--bg-base)" }}>AUTO · NOAA VIIRS</span>
          )}
        </div>
        {bortleAuto ? (
          <BortleDisplay bortleAuto={bortleAuto} />
        ) : viirsState === "error" ? (
          <div className="body text-sm secondary">
            Could not retrieve VIIRS radiance for this location. The NOAA NCEI service may be temporarily unavailable, or this location is outside the VIIRS rolling-window coverage. Light pollution will be excluded from the score.
          </div>
        ) : (
          <div className="body text-sm muted italic">Awaiting VIIRS data…</div>
        )}
      </div>
    </div>
  );
}

function BortleDisplay({ bortleAuto }) {
  const info = BORTLE[bortleAuto.bortle - 1];
  return (
    <div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <div className="display gold" style={{ fontSize: "2rem", lineHeight: 1 }}>Class {bortleAuto.bortle}</div>
        <div className="display gold text-base">{info.name}</div>
      </div>
      <div className="mono text-xs mt-1 secondary">
        SQM <span className="gold">{bortleAuto.sqm.toFixed(2)}</span> mag/arcsec²
        · VIIRS radiance <span className="gold">{bortleAuto.radiance.toFixed(2)}</span> nW/cm²/sr
        · artificial <span className="gold">{bortleAuto.artificial.toFixed(2)}</span> mcd/m²
      </div>
      <div className="body text-sm mt-2 primary">{info.mw}</div>
    </div>
  );
}

/* Debounced Nominatim autocomplete (5 suggestions). */
function CityAutocomplete({ onSubmit }) {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const debounceRef = useRef(null);
  const blurTimerRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setSuggestions([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await r.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setHighlight(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setBusy(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  const pick = (s) => {
    setQ(s.display_name);
    setOpen(false);
    setSuggestions([]);
    onSubmit({
      lat: parseFloat(s.lat),
      lon: parseFloat(s.lon),
      label: s.display_name,
    });
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter") {
      if (highlight >= 0 && suggestions[highlight]) pick(suggestions[highlight]);
      else if (suggestions[0]) pick(suggestions[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        className="w-full"
        style={{ width: "100%" }}
        placeholder="e.g. Springfield"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimerRef.current = setTimeout(() => setOpen(false), 150); }}
        onKeyDown={onKeyDown}
      />
      {open && (suggestions.length > 0 || busy) && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: 2,
            background: "var(--panel-bg-to)",
            border: "1px solid var(--frame-border)",
            borderRadius: 2,
            backdropFilter: "blur(6px)",
          }}
        >
          {busy && <div className="mono text-xs px-3 py-2 muted">Searching…</div>}
          {suggestions.map((s, i) => (
            <div
              key={`${s.place_id}-${i}`}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(s)}
              style={{
                padding: "0.4rem 0.6rem",
                cursor: "pointer",
                background: highlight === i ? "var(--strip-bg)" : "transparent",
                borderBottom: i < suggestions.length - 1 ? "1px solid var(--panel-border)" : "none",
                fontSize: "0.85rem",
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-primary)",
              }}
            >
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.display_name}
              </div>
              <div className="mono text-xs muted">
                {parseFloat(s.lat).toFixed(3)}°, {parseFloat(s.lon).toFixed(3)}°
                {s.type ? ` · ${s.type}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
