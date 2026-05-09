import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  sunPosition, moonPosition, computeSky, fmtTime,
  altitudeCurve, compositeScore, findEvents,
} from "./astro.js";
import { fetchLightPollutionAt } from "./lightPollution.js";
import { applyTheme, loadTheme } from "./theme.js";
import { Insignia, SettingsCog } from "./components/shared.jsx";
import { LocationBar } from "./components/LocationBar.jsx";
import { MapPanel } from "./components/MapPicker.jsx";
import { Overview } from "./components/Overview.jsx";
import { MilkyWay } from "./components/MilkyWay.jsx";
import { Aurora } from "./components/Aurora.jsx";
import { Constellations } from "./components/Constellations.jsx";
import { MoonSun } from "./components/MoonSun.jsx";
import { Planner } from "./components/Planner.jsx";
import { KpForecast } from "./components/KpForecast.jsx";
import { Sources } from "./components/Sources.jsx";
import { Solar } from "./components/Solar.jsx";

const WEATHER_HORIZON_DAYS = 16;
const LOCATION_CACHE_KEY = "cvan-last-location";

function persist(coords) {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
      lat: coords.lat, lon: coords.lon, label: coords.label,
    }));
  } catch {/* ignore — private browsing etc. */}
}

export default function CVAN() {
  const [tab, setTab] = useState("overview");
  const [coords, setCoords] = useState(null);
  const [now, setNow] = useState(new Date());
  const [bortleAuto, setBortleAuto] = useState(null);
  const [viirsState, setViirsState] = useState("idle"); // idle | loading | ok | error
  const [weather, setWeather] = useState(null);
  const [aurora, setAurora] = useState(null);
  const [kpForecast, setKpForecast] = useState(null);
  const [coordInput, setCoordInput] = useState({ lat: "", lon: "" });
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState({ weather: null, aurora: null, viirs: null, kpForecast: null });
  const [mapOpen, setMapOpen] = useState(false);
  const [mapOverlays, setMapOverlays] = useState({ clouds: false, auroralOval: false, lightPollution: false });
  const [theme, setTheme] = useState(() => loadTheme());
  const contentRef = useRef(null);

  // Switch tab + scroll the content area into view so the user can see
  // that the click registered (especially helpful for "About & sources"
  // and the FULL CITATIONS link, which are far from the new content).
  const goToTab = (next) => {
    setTab(next);
    // Wait one frame so the new tab content mounts before scrolling.
    requestAnimationFrame(() => {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // Apply theme on change
  useEffect(() => { applyTheme(theme); }, [theme]);

  // Persist any coord change to localStorage so the next visit warm-starts.
  useEffect(() => { if (coords) persist(coords); }, [coords]);

  // Tick clock every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  /* Auto-locate on mount.
     Strategy: warm-start from localStorage cache, then ask the browser GPS,
     and fall back to IP geolocation if GPS is denied or unavailable. */
  useEffect(() => {
    let cancelled = false;

    // 1) Warm start: load last known location instantly so the UI isn't blank.
    try {
      const cached = JSON.parse(localStorage.getItem("cvan-last-location") || "null");
      if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lon)) {
        setCoords({ ...cached, label: cached.label || "Last known location" });
      }
    } catch {/* ignore */}

    // 2) Try precise GPS.
    const tryGps = () => new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error("no-geolocation-api")); return; }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "Current location", source: "gps" }),
        (err) => reject(err),
        { timeout: 8000, maximumAge: 5 * 60 * 1000 }
      );
    });

    // 3) IP fallback (~city-level accuracy, no permission prompt).
    const tryIp = async () => {
      const r = await fetch("https://ipapi.co/json/");
      if (!r.ok) throw new Error("ip-lookup-failed");
      const j = await r.json();
      if (!Number.isFinite(j.latitude) || !Number.isFinite(j.longitude)) throw new Error("ip-no-coords");
      const label = [j.city, j.region, j.country_name].filter(Boolean).join(", ") || "Approx location";
      return { lat: j.latitude, lon: j.longitude, label: `${label} (IP)`, source: "ip" };
    };

    (async () => {
      try {
        const fix = await tryGps();
        if (cancelled) return;
        setCoords(fix);
        setLocError(null);
        persist(fix);
      } catch {
        try {
          const fix = await tryIp();
          if (cancelled) return;
          setCoords(fix);
          setLocError("Using approximate location from IP — grant GPS or enter coords for precision.");
          persist(fix);
        } catch {
          if (cancelled) return;
          setLocError("Couldn't auto-locate — search a city or enter coordinates.");
        }
      } finally {
        if (!cancelled) setLocating(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /* ---------- DATA FETCHERS ---------- */
  const fetchWeather = (lat, lon) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloud_cover,temperature_2m,visibility,relative_humidity_2m&current=cloud_cover,temperature_2m&timezone=auto&forecast_days=${WEATHER_HORIZON_DAYS}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setWeather(data);
        setLastUpdated((u) => ({ ...u, weather: new Date() }));
      })
      .catch(() => setWeather(null));
  };

  const fetchAurora = () => {
    fetch("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data) || !data.length) { setAurora(null); return; }
        // Walk back from the end to find the most recent entry with a numeric estimated_kp
        let kp = null, time = null;
        for (let i = data.length - 1; i >= 0; i--) {
          const v = parseFloat(data[i].estimated_kp);
          if (Number.isFinite(v)) { kp = v; time = data[i].time_tag; break; }
        }
        if (kp == null) { setAurora(null); return; }
        setAurora({ kp, time });
        setLastUpdated((u) => ({ ...u, aurora: new Date() }));
      })
      .catch(() => setAurora(null));
  };

  const fetchKpForecast = () => {
    fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data) || !data.length) { setKpForecast(null); return; }
        const parsed = data
          .map((d) => ({
            time: new Date(d.time_tag + "Z"),
            kp: parseFloat(d.kp),
            observed: d.observed,
            noaa_scale: d.noaa_scale,
          }))
          .filter((d) => Number.isFinite(d.kp));
        setKpForecast(parsed);
        setLastUpdated((u) => ({ ...u, kpForecast: new Date() }));
      })
      .catch(() => setKpForecast(null));
  };

  const fetchViirs = (lat, lon) => {
    setViirsState("loading");
    fetchLightPollutionAt(lat, lon)
      .then((res) => {
        setBortleAuto(res);
        setViirsState("ok");
        setLastUpdated((u) => ({ ...u, viirs: new Date() }));
      })
      .catch(() => setViirsState("error"));
  };

  /* On-coord-change fetches */
  useEffect(() => {
    if (!coords) return;
    setBortleAuto(null);
    setViirsState("loading");
    fetchWeather(coords.lat, coords.lon);
    fetchAurora();
    fetchKpForecast();
    fetchViirs(coords.lat, coords.lon);
  }, [coords]);

  /* Refresh cadences — picked per data source's actual update frequency.
     Open-Meteo current weather refreshes hourly; SWPC's 1-minute Kp feed
     genuinely updates each minute; the 3-day forecast refreshes every
     few hours but polling every 15 min is cheap and keeps the spark
     chart current; the LP atlas is a yearly product so once-per-day is
     plenty. */
  useEffect(() => {
    if (!coords) return;
    const id = setInterval(() => fetchWeather(coords.lat, coords.lon), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [coords]);

  useEffect(() => {
    if (!coords) return;
    const id = setInterval(() => fetchViirs(coords.lat, coords.lon), 24 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [coords]);

  useEffect(() => {
    if (!coords) return;
    const id = setInterval(fetchAurora, 60 * 1000);
    return () => clearInterval(id);
  }, [coords]);

  useEffect(() => {
    if (!coords) return;
    const id = setInterval(fetchKpForecast, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [coords]);

  /* ---------- DERIVED ASTRONOMY ---------- */
  const sky = useMemo(() => coords ? computeSky(now, coords) : null, [coords, now]);

  /* Rise/set events anchored to today's date — recomputes once per day, not per minute. */
  const dayKey = now.toDateString();
  const events = useMemo(() => {
    if (!coords) return null;
    const sunEvents = findEvents(now, coords.lat, coords.lon, sunPosition, -0.833);
    const moonEvents = findEvents(now, coords.lat, coords.lon, moonPosition, 0.125);
    const twilights = {};
    [["civil", -6], ["nautical", -12], ["astro", -18]].forEach(([name, deg]) => {
      twilights[name] = findEvents(now, coords.lat, coords.lon, sunPosition, deg);
    });
    return { sunEvents, moonEvents, twilights };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, dayKey]);

  const skyWithEvents = useMemo(() => {
    if (!sky || !events) return sky;
    return { ...sky, ...events };
  }, [sky, events]);

  /* Tonight altitude curve — anchored to date, not minute. */
  const tonightCurve = useMemo(() => {
    if (!coords) return null;
    return altitudeCurve(now, coords.lat, coords.lon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, dayKey]);

  /* Composite visibility score */
  const bortle = bortleAuto?.bortle ?? null;
  const visibilityScore = useMemo(() => {
    if (!sky) return null;
    const cloud = weather?.current?.cloud_cover ?? null;
    return compositeScore({ sky, cloud, bortle: bortle ?? 4 });
  }, [sky, weather, bortle]);

  /* Search via Nominatim (handled inside LocationBar autocomplete; we just receive coords) */
  function applyManualCoords() {
    const lat = parseFloat(coordInput.lat);
    const lon = parseFloat(coordInput.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      setCoords({ lat, lon, label: `${lat.toFixed(4)}, ${lon.toFixed(4)}` });
      setLocError(null);
    } else {
      setLocError("Invalid coordinates");
    }
  }

  function retryGeolocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "Current location" });
        setLocating(false);
        setLocError(null);
      },
      () => { setLocating(false); setLocError("Location access denied"); }
    );
  }

  return (
    <div className="min-h-screen w-full" style={{
      background: "radial-gradient(ellipse at top, var(--bg-grad-from) 0%, var(--bg-grad-mid) 60%, var(--bg-grad-to) 100%)",
      color: "var(--text-primary)",
      fontFamily: "'Cormorant Garamond', Georgia, serif",
    }}>
      <CvanGlobalStyles />

      <div className="star-bg" />

      <div className="relative max-w-6xl mx-auto px-6 py-8">

        {/* HEADER */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <SettingsCog
                  theme={theme}
                  setTheme={setTheme}
                  onOpenInfo={() => goToTab("sources")}
                />
                <Insignia />
                <div>
                  <h1 className="display text-3xl gold leading-none">CVAN</h1>
                  <div className="mono text-xs uppercase tracking-widest muted">
                    Celestial Visibility Analysis Network
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="mono text-xs muted">FIELD STATION · LOCAL</div>
              <div className="display gold text-lg">{now.toLocaleString([], { weekday: "short", month: "short", day: "numeric" })}</div>
              <div className="mono text-sm">{fmtTime(now)}</div>
            </div>
          </div>
          <div className="mt-4 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--accent-gold) 30%, var(--accent-gold) 70%, transparent)" }} />
        </header>

        {/* LOCATION BAR */}
        <LocationBar
          coords={coords}
          locating={locating}
          locError={locError}
          onSearchSubmit={(c) => { setCoords(c); setLocError(null); }}
          coordInput={coordInput} setCoordInput={setCoordInput}
          applyManualCoords={applyManualCoords}
          retryGeolocation={retryGeolocation}
          bortleAuto={bortleAuto}
          viirsState={viirsState}
          mapOpen={mapOpen} setMapOpen={setMapOpen}
        />

        {mapOpen && coords && (
          <div className="mt-4">
            <div className="panel corner p-5">
              <MapPanel
                coords={coords}
                onPick={(lat, lon) => setCoords({ lat, lon, label: `${lat.toFixed(4)}, ${lon.toFixed(4)} (map)` })}
                weather={weather}
                aurora={aurora}
                bortleAuto={bortleAuto}
                now={now}
                overlays={mapOverlays}
                setOverlays={setMapOverlays}
              />
            </div>
          </div>
        )}

        {/* DATA STATUS STRIP */}
        {coords && (
          <DataStatusStrip
            lastUpdated={lastUpdated}
            now={now}
            onRefresh={() => {
              fetchWeather(coords.lat, coords.lon);
              fetchAurora();
              fetchKpForecast();
              fetchViirs(coords.lat, coords.lon);
            }}
          />
        )}

        {/* TABS */}
        <TabNav tab={tab} setTab={goToTab} />

        {/* CONTENT */}
        <div ref={contentRef} style={{ scrollMarginTop: "12px" }} />
        {!coords && tab !== "sources" && tab !== "solar" ? (
          <div className="panel corner p-12 text-center">
            <div className="display gold text-lg mb-3">AWAITING POSITION FIX</div>
            <p className="body text-base secondary">
              Grant location access, search a city, or enter coordinates manually above.
            </p>
          </div>
        ) : (
          <>
            {tab === "overview" && coords && (
              <Overview
                sky={skyWithEvents}
                weather={weather}
                aurora={aurora}
                bortle={bortle}
                score={visibilityScore}
                curve={tonightCurve}
                coords={coords}
                weatherStale={!weather}
              />
            )}
            {tab === "milkyway" && coords && (
              <MilkyWay
                sky={skyWithEvents}
                weather={weather}
                bortle={bortle}
                bortleAuto={bortleAuto}
                curve={tonightCurve}
                coords={coords}
                now={now}
                weatherStale={!weather}
              />
            )}
            {tab === "aurora" && coords && (
              <Aurora
                aurora={aurora}
                weather={weather}
                bortle={bortle}
                sky={skyWithEvents}
                coords={coords}
                kpForecast={kpForecast}
                now={now}
                weatherStale={!weather}
                bortleAuto={bortleAuto}
                mapOverlays={mapOverlays}
                setMapOverlays={setMapOverlays}
              />
            )}
            {tab === "kpforecast" && coords && (
              <KpForecast kpForecast={kpForecast} coords={coords} />
            )}
            {tab === "solar" && <Solar />}
            {tab === "constellations" && coords && (
              <Constellations
                coords={coords}
                now={now}
                bortle={bortle}
                weather={weather}
                weatherStale={!weather}
              />
            )}
            {tab === "moonsun" && coords && skyWithEvents?.sunEvents && (
              <MoonSun sky={skyWithEvents} curve={tonightCurve} />
            )}
            {tab === "planner" && coords && (
              <Planner coords={coords} weather={weather} weatherStale={!weather} bortle={bortle} />
            )}
            {tab === "sources" && <Sources />}
          </>
        )}

        <footer className="mt-16 pt-6 text-center mono text-xs" style={{ color: "var(--text-subtle)", borderTop: "1px solid var(--panel-border)" }}>
          <div>POSITIONS · MEEUS ASTRONOMICAL ALGORITHMS · WEATHER · OPEN-METEO · AURORA · NOAA SWPC</div>
          <div className="mt-1">LIGHT POLLUTION · LORENZ VIIRS ATLAS · MOON SKY BRIGHTNESS · KRISCIUNAS-SCHAEFER (1991) · BORTLE SCALE · BORTLE (2001) · GEOMAG · IGRF-13 DIPOLE</div>
          <div className="mt-2">
            <button className="ghost" onClick={() => goToTab("sources")} style={{ padding: "0.25rem 0.6rem", fontSize: "0.65rem" }}>FULL CITATIONS →</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function DataStatusStrip({ lastUpdated, now, onRefresh }) {
  const fmtAge = (then) => {
    if (!then) return "—";
    const ms = now - then;
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  };
  const cell = (label, time, cadence, color) => (
    <div className="flex items-center gap-2 text-xs mono secondary">
      <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: time ? color : "var(--text-subtle)" }} />
      <span className="muted" style={{ letterSpacing: "0.1em" }}>{label}</span>
      <span className="gold">{fmtAge(time)}</span>
      <span className="subtle">· refresh {cadence}</span>
    </div>
  );
  return (
    <div className="mt-3 px-4 py-2 flex items-center justify-between flex-wrap gap-3" style={{ background: "var(--strip-bg)", border: "1px solid var(--panel-border)", borderRadius: 2 }}>
      <div className="flex items-center gap-5 flex-wrap">
        {cell("WEATHER", lastUpdated.weather, "24h", "var(--accent-green)")}
        {cell("Kp NOW", lastUpdated.aurora, "5m", "var(--accent-purple)")}
        {cell("Kp 3-DAY", lastUpdated.kpForecast, "30m", "var(--accent-blue)")}
        {cell("LP ATLAS", lastUpdated.viirs, "24h", "var(--accent-warm)")}
      </div>
      <button className="ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.65rem" }} onClick={onRefresh}>
        ⟳ REFRESH NOW
      </button>
    </div>
  );
}

/* Top tab nav. Primary tabs sit on the left; "Details ▾" on the right
   opens a popover containing the deeper-dive tabs (Kp Forecast, Moon &
   Sun) so the main row stays focused on the everyday "tonight, milky
   way, aurora, constellations, planner" decisions. */
const PRIMARY_TABS = [
  ["overview", "Tonight"],
  ["milkyway", "Milky Way"],
  ["aurora", "Aurora"],
  ["solar", "Solar"],
  ["constellations", "Constellations"],
  ["planner", "Planner"],
];
const DETAIL_TABS = [
  ["kpforecast", "Kp Forecast"],
  ["moonsun", "Moon & Sun"],
];
function TabNav({ tab, setTab }) {
  const [openDetails, setOpenDetails] = useState(false);
  const detailRef = useRef(null);
  useEffect(() => {
    if (!openDetails) return;
    const onDoc = (e) => { if (!detailRef.current?.contains(e.target)) setOpenDetails(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpenDetails(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [openDetails]);
  const isDetailTab = DETAIL_TABS.some(([k]) => k === tab);
  return (
    <nav
      className="flex gap-1 mt-8 mb-6 border-b flex-wrap items-center justify-between"
      style={{ borderColor: "var(--panel-border)" }}
    >
      <div className="flex gap-1 flex-wrap">
        {PRIMARY_TABS.map(([k, label]) => (
          <button
            key={k}
            className={`tab-btn display ${tab === k ? "active" : ""}`}
            style={{ color: tab === k ? "var(--accent-gold)" : "var(--text-muted)" }}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>
      <div ref={detailRef} style={{ position: "relative" }}>
        <button
          className={`tab-btn display ${isDetailTab ? "active" : ""}`}
          style={{ color: isDetailTab ? "var(--accent-gold)" : "var(--text-muted)" }}
          onClick={() => setOpenDetails((v) => !v)}
          aria-expanded={openDetails}
        >
          Details ▾
        </button>
        {openDetails && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              zIndex: 50,
              minWidth: 180,
              background: "linear-gradient(180deg, var(--panel-bg-from) 0%, var(--panel-bg-to) 100%)",
              border: "1px solid var(--frame-border)",
              borderRadius: 4,
              padding: "0.4rem",
              backdropFilter: "blur(6px)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            {DETAIL_TABS.map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setTab(k); setOpenDetails(false); }}
                className="ghost"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.45rem 0.7rem",
                  background: tab === k ? "var(--strip-bg)" : "transparent",
                  border: "1px solid transparent",
                  borderColor: tab === k ? "var(--accent-gold)" : "var(--frame-border)",
                  color: tab === k ? "var(--accent-gold)" : "var(--text-primary)",
                  marginBottom: 4,
                  fontSize: "0.8rem",
                  letterSpacing: "0.05em",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

function CvanGlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Cinzel:wght@500;600;700&display=swap');
      .display { font-family: 'Cinzel', serif; letter-spacing: 0.08em; }
      .mono { font-family: 'JetBrains Mono', monospace; }
      .body { font-family: 'Cormorant Garamond', serif; }
      .gold { color: var(--accent-gold); }
      .primary { color: var(--text-primary); }
      .secondary { color: var(--text-secondary); }
      .muted { color: var(--text-muted); }
      .subtle { color: var(--text-subtle); }
      .panel { background: linear-gradient(180deg, var(--panel-bg-from) 0%, var(--panel-bg-to) 100%); border: 1px solid var(--panel-border); border-radius: 4px; backdrop-filter: blur(6px); }
      .frame { border: 1px solid var(--frame-border); border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.04); }
      .corner { position: relative; }
      .corner::before, .corner::after { content: ''; position: absolute; width: 12px; height: 12px; border: 1px solid var(--accent-gold); }
      .corner::before { top: -1px; left: -1px; border-right: none; border-bottom: none; }
      .corner::after { bottom: -1px; right: -1px; border-left: none; border-top: none; }
      .star-bg::before {
        content: ''; position: fixed; inset: 0; pointer-events: none;
        background-image:
          radial-gradient(1px 1px at 20% 30%, var(--star-color), transparent),
          radial-gradient(1px 1px at 60% 70%, var(--star-color), transparent),
          radial-gradient(1px 1px at 80% 20%, var(--star-color), transparent),
          radial-gradient(1px 1px at 30% 80%, var(--star-color), transparent),
          radial-gradient(1px 1px at 90% 50%, var(--star-color), transparent),
          radial-gradient(1px 1px at 10% 60%, var(--star-color), transparent),
          radial-gradient(1px 1px at 50% 10%, var(--star-color), transparent),
          radial-gradient(1px 1px at 70% 40%, var(--star-color), transparent),
          radial-gradient(1px 1px at 40% 50%, var(--star-color), transparent),
          radial-gradient(1px 1px at 15% 15%, var(--star-color), transparent);
        opacity: 0.6;
      }
      :root[data-theme="light"] .star-bg::before { opacity: 0; }
      .tab-btn { position: relative; padding: 0.5rem 1.25rem; cursor: pointer; transition: all 0.2s; letter-spacing: 0.15em; font-size: 0.75rem; background: transparent; border: none; }
      .tab-btn.active { color: var(--accent-gold); }
      .tab-btn.active::after { content: ''; position: absolute; bottom: 0; left: 10%; right: 10%; height: 1px; background: var(--accent-gold); }
      .pill { padding: 2px 8px; border-radius: 2px; font-size: 0.7rem; letter-spacing: 0.1em; }
      input, select { background: var(--input-bg); border: 1px solid var(--frame-border); color: var(--text-primary); padding: 0.4rem 0.6rem; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; outline: none; }
      input:focus, select:focus { border-color: var(--accent-gold); }
      input[type="range"] { padding: 0; }
      input[type="checkbox"] { width: auto; }
      input[type="time"], input[type="date"] { color-scheme: light dark; }
      button.primary { background: linear-gradient(180deg, var(--accent-gold) 0%, var(--accent-gold-dim) 100%); color: var(--bg-base); border: none; padding: 0.45rem 0.9rem; font-family: 'Cinzel', serif; letter-spacing: 0.12em; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
      button.primary:hover { filter: brightness(1.1); }
      button.ghost { background: transparent; border: 1px solid var(--frame-border); color: var(--accent-gold); padding: 0.4rem 0.8rem; font-family: 'Cinzel', serif; letter-spacing: 0.1em; font-size: 0.7rem; cursor: pointer; }
      button.ghost:hover { background: var(--strip-bg); }
      a { color: var(--accent-gold); }
      @keyframes shimmer { 0%,100% { opacity: 0.3 } 50% { opacity: 0.8 } }
      .twinkle { animation: shimmer 3s ease-in-out infinite; }
      .cvan-tiles { filter: var(--map-tile-filter); }
      .leaflet-container { background: var(--bg-base) !important; outline: none; font-family: 'JetBrains Mono', monospace; }
      .leaflet-control-zoom a { background: var(--panel-bg-to) !important; color: var(--accent-gold) !important; border: 1px solid var(--frame-border) !important; }
      .leaflet-control-zoom a:hover { background: var(--strip-bg) !important; }
      .cvan-marker { background: transparent; border: none; }
    `}</style>
  );
}
