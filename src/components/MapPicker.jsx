import React, { useEffect, useRef, useState } from "react";
import { KP_VIEW_LAT, geomagneticToGeographic, BORTLE } from "../astro.js";

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

export function MapPanel({ coords, onPick, weather, aurora, bortleAuto, overlays, setOverlays }) {
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
      <MapPicker coords={coords} onPick={onPick} weather={weather} aurora={aurora} bortleAuto={bortleAuto} overlays={overlays} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="mono text-xs uppercase tracking-widest muted">Overlays:</span>
        <OverlayCheck label="Cloud cover" id="clouds" overlays={overlays} setOverlays={setOverlays} />
        <OverlayCheck label="Auroral oval" id="auroralOval" overlays={overlays} setOverlays={setOverlays} />
        <OverlayCheck label="Light pollution (Bortle)" id="lightPollution" overlays={overlays} setOverlays={setOverlays} />
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

function MapPicker({ coords, onPick, weather, aurora, bortleAuto, overlays }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const ovalLayerRef = useRef(null);
  const cloudLayerRef = useRef(null);
  const lpLayerRef = useRef(null);
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
        lpLayerRef.current = null;
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

  // Auroral oval overlay (computed from current Kp)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.L) return;
    if (ovalLayerRef.current) {
      map.removeLayer(ovalLayerRef.current);
      ovalLayerRef.current = null;
    }
    if (!overlays.auroralOval || !aurora) return;
    const L = window.L;
    const kp = aurora.kp;
    const threshold = KP_VIEW_LAT[Math.floor(kp)] ?? 50;
    const ringN = [];
    const ringS = [];
    for (let mlon = 0; mlon <= 360; mlon += 5) {
      const n = geomagneticToGeographic(threshold, mlon);
      ringN.push([n.lat, n.lon]);
      const s = geomagneticToGeographic(-threshold, mlon);
      ringS.push([s.lat, s.lon]);
    }
    const opts = {
      color: "#6dffb0",
      weight: 2,
      opacity: 0.85,
      fillColor: "#6dffb0",
      fillOpacity: 0.08,
      noClip: true,
    };
    const layer = L.layerGroup([
      L.polyline(ringN, opts),
      L.polyline(ringS, opts),
    ]).addTo(map);
    ovalLayerRef.current = layer;
  }, [overlays.auroralOval, aurora]);

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

  // Light-pollution Bortle marker at the user's location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.L) return;
    if (lpLayerRef.current) {
      map.removeLayer(lpLayerRef.current);
      lpLayerRef.current = null;
    }
    if (!overlays.lightPollution || !bortleAuto) return;
    const L = window.L;
    const info = BORTLE[bortleAuto.bortle - 1];
    const layer = L.circle([coords.lat, coords.lon], {
      radius: 25000,
      color: info.color,
      weight: 2,
      opacity: 0.9,
      fillColor: info.color,
      fillOpacity: 0.45,
    }).bindTooltip(`Bortle ${bortleAuto.bortle} · SQM ${bortleAuto.sqm.toFixed(2)}`, { permanent: false });
    layer.addTo(map);
    lpLayerRef.current = layer;
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
