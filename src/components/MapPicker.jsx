import React, { useEffect, useRef } from "react";
import { auroralOvalRings, BORTLE } from "../astro.js";
import { LP_TILE_BASE } from "../lightPollution.js";

let leafletPromise = null;
function loadLeaflet() {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (window.L) { resolve(window.L); return; }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    css.crossOrigin = "";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    s.crossOrigin = "";
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return leafletPromise;
}

export function MapPanel({ coords, onPick, weather, aurora, bortleAuto, now, overlays, setOverlays }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="mono text-xs uppercase tracking-widest muted">
          Map · click anywhere to set coordinates
        </div>
        <div className="mono text-xs secondary">
          Tiles © OpenStreetMap contributors
        </div>
      </div>
      <MapPicker
        coords={coords}
        onPick={onPick}
        weather={weather}
        aurora={aurora}
        bortleAuto={bortleAuto}
        now={now}
        overlays={overlays}
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="mono text-xs uppercase tracking-widest muted">Overlays:</span>
        <OverlayCheck label="Cloud cover" id="clouds" overlays={overlays} setOverlays={setOverlays} />
        <OverlayCheck label="Auroral oval" id="auroralOval" overlays={overlays} setOverlays={setOverlays} />
        <OverlayCheck label="Light pollution (Lorenz atlas)" id="lightPollution" overlays={overlays} setOverlays={setOverlays} />
      </div>
    </div>
  );
}

function OverlayCheck({ label, id, overlays, setOverlays }) {
  const checked = !!overlays[id];
  return (
    <label className="mono text-xs flex items-center gap-1 cursor-pointer secondary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setOverlays({ ...overlays, [id]: e.target.checked })}
        style={{ width: "auto", padding: 0, margin: 0 }}
      />
      <span>{label}</span>
    </label>
  );
}

function MapPicker({ coords, onPick, weather, aurora, bortleAuto, now, overlays }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const ovalLayerRef = useRef(null);
  const cloudLayerRef = useRef(null);
  const lpTileLayerRef = useRef(null);
  const lpMarkerLayerRef = useRef(null);
  const onPickRef = useRef(onPick);
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        center: [coords.lat, coords.lon],
        zoom: 4,
        scrollWheelZoom: true,
        attributionControl: false,
        worldCopyJump: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        className: "cvan-tiles",
      }).addTo(map);

      const icon = L.divIcon({
        className: "cvan-marker",
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:radial-gradient(circle,var(--accent-gold) 0%,var(--accent-gold-dim) 70%,transparent 100%);
          border:2px solid var(--bg-base);
          box-shadow:0 0 12px rgba(212,184,106,0.9);
          transform:translate(-9px,-9px);"></div>`,
        iconSize: [0, 0],
      });
      const marker = L.marker([coords.lat, coords.lon], { icon }).addTo(map);

      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        if (onPickRef.current) onPickRef.current(lat, lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      setTimeout(() => map.invalidateSize(), 100);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        ovalLayerRef.current = null;
        cloudLayerRef.current = null;
        lpTileLayerRef.current = null;
        lpMarkerLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track marker
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([coords.lat, coords.lon]);
    }
  }, [coords.lat, coords.lon]);

  /* Auroral oval — asymmetric oval centered on the geomagnetic pole, dipped
     equatorward at magnetic midnight. Recomputed whenever Kp or `now`
     changes. Each boundary is split into night-side (solid, bright) and
     day-side (dashed, dim) segments since aurora is invisible in daylight. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.L) return;
    if (ovalLayerRef.current) {
      map.removeLayer(ovalLayerRef.current);
      ovalLayerRef.current = null;
    }
    if (!overlays.auroralOval || !aurora || !now) return;
    const L = window.L;
    const rings = auroralOvalRings(aurora.kp, now);

    const layers = [];
    const drawHemisphere = (h, isNorth) => {
      // Pair night-side and day-side rendering for both equatorward and
      // poleward boundaries. Closed rings are split into runs of consecutive
      // night/day samples and rendered as separate polylines.
      [["eq", h.eq, isNorth ? "Equatorward edge" : "Equatorward edge (S)"],
       ["pole", h.pole, isNorth ? "Poleward edge" : "Poleward edge (S)"]]
        .forEach(([_kind, ring]) => {
          const runs = splitRuns(ring);
          for (const r of runs) {
            const path = r.points.map((p) => [p.lat, p.lon]);
            const opts = r.day
              ? { color: "#6dffb0", weight: 1.2, opacity: 0.35, dashArray: "4 6", noClip: true }
              : { color: "#6dffb0", weight: 2,   opacity: 0.95, noClip: true };
            layers.push(L.polyline(path, opts));
          }
        });

      // (No fill polygon — it wraps badly across the antimeridian for some
      // subsolar geometries. The two boundary polylines already convey the
      // oval band visually.)
    };
    drawHemisphere(rings.north, true);
    drawHemisphere(rings.south, false);

    const group = L.layerGroup(layers).addTo(map);
    group.eachLayer((l) => {
      if (l.bindTooltip) {
        l.bindTooltip(`Auroral oval · Kp ${aurora.kp.toFixed(1)} · base ${rings.baseEq}° geomag`, { sticky: true });
      }
    });
    ovalLayerRef.current = group;
  }, [overlays.auroralOval, aurora, now]);

  // Cloud cover indicator at the user's location (current observation)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.L) return;
    if (cloudLayerRef.current) {
      map.removeLayer(cloudLayerRef.current);
      cloudLayerRef.current = null;
    }
    if (!overlays.clouds || !weather?.current) return;
    const cc = weather.current.cloud_cover;
    if (cc == null) return;
    const L = window.L;
    const color = cc > 80 ? "#5a6a85" : cc > 50 ? "#9aa5b8" : cc > 20 ? "#d4d4d4" : "#ffffff";
    const layer = L.circle([coords.lat, coords.lon], {
      radius: 80000,
      color,
      weight: 1,
      opacity: 0.6,
      fillColor: color,
      fillOpacity: 0.25,
    }).bindTooltip(`Current cloud cover: ${cc}%`, { permanent: false });
    layer.addTo(map);
    cloudLayerRef.current = layer;
  }, [overlays.clouds, weather, coords.lat, coords.lon]);

  /* Light pollution: overlay the actual Lorenz atlas tiles on the map so
     the entire viewport shows the per-pixel atlas. The tiles are 1024px
     paletted PNGs at native zoom 6 (zoomOffset −2 makes leaflet treat them
     as 4× larger so coverage matches a standard z=8 grid). A small
     Bortle-colored marker on the user's location keeps the at-a-glance
     "your sky here" indicator. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.L) return;
    if (lpTileLayerRef.current) {
      map.removeLayer(lpTileLayerRef.current);
      lpTileLayerRef.current = null;
    }
    if (lpMarkerLayerRef.current) {
      map.removeLayer(lpMarkerLayerRef.current);
      lpMarkerLayerRef.current = null;
    }
    if (!overlays.lightPollution) return;
    const L = window.L;
    const tiles = L.tileLayer(`${LP_TILE_BASE}/tile_{z}_{x}_{y}.png`, {
      minZoom: 2,
      maxNativeZoom: 6,
      maxZoom: 12,
      tileSize: 1024,
      zoomOffset: -2,
      opacity: 0.55,
      errorTileUrl: `${LP_TILE_BASE}/black.png`,
    }).addTo(map);
    lpTileLayerRef.current = tiles;

    if (bortleAuto) {
      const info = BORTLE[bortleAuto.bortle - 1];
      const marker = L.circle([coords.lat, coords.lon], {
        radius: 12000,
        color: info.color,
        weight: 2,
        opacity: 1,
        fillColor: info.color,
        fillOpacity: 0.6,
      }).bindTooltip(
        `You · Bortle ${bortleAuto.bortle} · SQM ${bortleAuto.sqm.toFixed(2)} · zone ${bortleAuto.zone}`,
        { permanent: false }
      );
      marker.addTo(map);
      lpMarkerLayerRef.current = marker;
    }
  }, [overlays.lightPollution, bortleAuto, coords.lat, coords.lon]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "360px",
        width: "100%",
        borderRadius: 2,
        border: "1px solid var(--frame-border)",
        background: "var(--bg-base)",
        cursor: "crosshair",
      }}
    />
  );
}

/* Walk a closed ring of {day:bool} samples and emit consecutive runs of
   identical day/night flag, with each run carrying one extra boundary
   sample so adjacent runs visually meet. Also splits any run whose
   consecutive samples span more than 180° of longitude (antimeridian
   crossing) so Leaflet doesn't draw a horizontal line all the way across
   the world. Returns an array of { day:bool, points:[…] }. */
function splitRuns(ring) {
  if (!ring.length) return [];
  // Step 1 — split by day/night flag, joining each run with the boundary
  // sample so adjacent runs visually meet.
  const byFlag = [];
  let cur = { day: ring[0].day, points: [ring[0]] };
  for (let i = 1; i < ring.length; i++) {
    if (ring[i].day === cur.day) {
      cur.points.push(ring[i]);
    } else {
      cur.points.push(ring[i]);
      byFlag.push(cur);
      cur = { day: ring[i].day, points: [ring[i]] };
    }
  }
  // Stitch the wrap-around: if first and last runs share day flag, merge.
  if (byFlag.length && cur.day === byFlag[0].day) {
    byFlag[0].points = [...cur.points, ...byFlag[0].points];
  } else {
    byFlag.push(cur);
  }
  // Step 2 — within each flag-run, split anywhere consecutive samples jump
  // by more than 180° longitude (the polyline would otherwise wrap the map).
  const out = [];
  for (const run of byFlag) {
    let chunk = [run.points[0]];
    for (let i = 1; i < run.points.length; i++) {
      const a = run.points[i - 1].lon;
      const b = run.points[i].lon;
      if (Math.abs(b - a) > 180) {
        out.push({ day: run.day, points: chunk });
        chunk = [run.points[i]];
      } else {
        chunk.push(run.points[i]);
      }
    }
    if (chunk.length > 1) out.push({ day: run.day, points: chunk });
  }
  return out;
}
