import React, { useState, useEffect, useMemo, useRef } from "react";

/* =========================================================================
   CVAN — Celestial Visibility Analysis Network
   Single-file artifact. All astronomy is computed client-side using
   standard formulae (Meeus / NOAA algorithms). External data: Open-Meteo
   (weather/clouds), NOAA SWPC (Kp + ovation), Nominatim (geocoding).
   ========================================================================= */

/* ---------- ASTRONOMY CORE ----------
   Implementations follow Jean Meeus, "Astronomical Algorithms" (2nd ed.)
   and standard NOAA solar-position routines. Angles in radians internally.
*/
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function toJulian(date) {
  return date.getTime() / 86400000 + 2440587.5;
}
function julianCentury(jd) {
  return (jd - 2451545.0) / 36525;
}
function gmst(jd) {
  // Greenwich Mean Sidereal Time, degrees
  const T = julianCentury(jd);
  let g =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  g = ((g % 360) + 360) % 360;
  return g;
}
function lst(jd, lonDeg) {
  return ((gmst(jd) + lonDeg) % 360 + 360) % 360;
}

/* Sun position (low-precision Meeus, plenty for visibility planning) */
function sunPosition(jd) {
  const n = jd - 2451545.0;
  const L = ((280.460 + 0.9856474 * n) % 360 + 360) % 360;
  const g = (((357.528 + 0.9856003 * n) % 360 + 360) % 360) * DEG;
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG;
  const eps = (23.439 - 0.0000004 * n) * DEG;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  return { ra: ra * RAD, dec: dec * RAD, lambda: lambda * RAD };
}

/* Moon position — simplified series, accurate to ~0.3 deg, fine here */
function moonPosition(jd) {
  const T = julianCentury(jd);
  const Lp = (218.316 + 13.176396 * (jd - 2451545.0)) * DEG;
  const M = (134.963 + 13.064993 * (jd - 2451545.0)) * DEG;
  const F = (93.272 + 13.229350 * (jd - 2451545.0)) * DEG;
  const lambda = Lp + 6.289 * DEG * Math.sin(M);
  const beta = 5.128 * DEG * Math.sin(F);
  const dist = 385001 - 20905 * Math.cos(M);
  const eps = 23.439 * DEG;
  const ra = Math.atan2(
    Math.sin(lambda) * Math.cos(eps) - Math.tan(beta) * Math.sin(eps),
    Math.cos(lambda)
  );
  const dec = Math.asin(
    Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lambda)
  );
  return { ra: ra * RAD, dec: dec * RAD, dist };
}

/* Convert RA/Dec + LST + lat -> alt/az (degrees) */
function equatorialToHorizontal(raDeg, decDeg, lstDeg, latDeg) {
  const ha = ((lstDeg - raDeg) % 360 + 360) % 360;
  const haR = ha * DEG;
  const decR = decDeg * DEG;
  const latR = latDeg * DEG;
  const alt = Math.asin(
    Math.sin(decR) * Math.sin(latR) + Math.cos(decR) * Math.cos(latR) * Math.cos(haR)
  );
  const az = Math.atan2(
    -Math.sin(haR),
    Math.tan(decR) * Math.cos(latR) - Math.sin(latR) * Math.cos(haR)
  );
  return { alt: alt * RAD, az: ((az * RAD) + 360) % 360 };
}

/* Moon phase (0..1, 0=new, 0.5=full) and illumination fraction */
function moonPhase(jd) {
  // Use proper geocentric elongation between sun and moon
  const sun = sunPosition(jd);
  const moon = moonPosition(jd);
  const sR = sun.ra * DEG, sD = sun.dec * DEG;
  const mR = moon.ra * DEG, mD = moon.dec * DEG;
  // Angular separation via spherical law of cosines
  const cosElong = Math.sin(sD) * Math.sin(mD) + Math.cos(sD) * Math.cos(mD) * Math.cos(sR - mR);
  const elong = Math.acos(clamp(cosElong, -1, 1));
  const phase = (1 - Math.cos(elong)) / 2; // illumination fraction
  const synodic = 29.530588;
  const refNew = 2451550.1; // Jan 6 2000 new moon
  const age = ((jd - refNew) % synodic + synodic) % synodic;
  return { illumination: phase, ageDays: age, phaseFraction: age / synodic };
}


function moonPhaseName(frac) {
  if (frac < 0.03 || frac > 0.97) return "New Moon";
  if (frac < 0.22) return "Waxing Crescent";
  if (frac < 0.28) return "First Quarter";
  if (frac < 0.47) return "Waxing Gibbous";
  if (frac < 0.53) return "Full Moon";
  if (frac < 0.72) return "Waning Gibbous";
  if (frac < 0.78) return "Last Quarter";
  return "Waning Crescent";
}

/* Find rise/set/transit by stepping through the night and bracketing zero */
function findEvents(date, lat, lon, bodyFn, h0Deg = -0.833) {
  // Sample 5-min steps over 48h centered on local noon of `date`
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const events = { rise: null, set: null, transit: null, maxAlt: -90 };
  let prevAlt = null;
  let prevT = null;
  for (let m = -360; m <= 1800; m += 5) {
    const t = new Date(start.getTime() + m * 60000);
    const jd = toJulian(t);
    const eq = bodyFn(jd);
    const sidereal = lst(jd, lon);
    const { alt } = equatorialToHorizontal(eq.ra, eq.dec, sidereal, lat);
    if (alt > events.maxAlt) {
      events.maxAlt = alt;
      events.transit = t;
    }
    if (prevAlt !== null) {
      if (prevAlt < h0Deg && alt >= h0Deg && !events.rise) {
        events.rise = new Date(prevT.getTime() + ((h0Deg - prevAlt) / (alt - prevAlt)) * (t - prevT));
      }
      if (prevAlt > h0Deg && alt <= h0Deg && events.rise && !events.set) {
        events.set = new Date(prevT.getTime() + ((prevAlt - h0Deg) / (prevAlt - alt)) * (t - prevT));
      }
    }
    prevAlt = alt;
    prevT = t;
  }
  return events;
}

/* Twilight classification from sun altitude (degrees) */
function twilightClass(sunAlt) {
  if (sunAlt > -0.833) return { name: "Daylight", code: "day" };
  if (sunAlt > -6) return { name: "Civil Twilight", code: "civil" };
  if (sunAlt > -12) return { name: "Nautical Twilight", code: "nautical" };
  if (sunAlt > -18) return { name: "Astronomical Twilight", code: "astro" };
  return { name: "Astronomical Night", code: "night" };
}

/* Krisciunas–Schaefer (1991) moon sky brightness contribution
   Returns delta-V (mag/arcsec^2 brighter than dark sky) at zenith
   for a given moon altitude and phase angle (deg). Simplified. */
function moonSkyBrightness(moonAltDeg, phaseAngleDeg) {
  if (moonAltDeg <= 0) return 0;
  // Illuminance from moon (rough) — we collapse to a 0..1 "moon impact" score
  // Full moon at 60° altitude ≈ +3 mag/arcsec^2 brightening
  const phaseFactor = Math.pow(10, -0.4 * (0.026 * Math.abs(phaseAngleDeg) + 4e-9 * Math.pow(phaseAngleDeg, 4)));
  const altFactor = Math.sin(moonAltDeg * DEG);
  return 3.0 * phaseFactor * altFactor; // magnitudes brightening
}

/* Bortle scale official descriptions for Milky Way visibility */
const BORTLE = [
  { c: 1, name: "Excellent dark-sky site", sqm: "21.7–22.0", sqmMin: 21.7, sqmMax: 22.0, mw: "Milky Way casts visible shadows; M33 obvious to the naked eye.", color: "#0a1a3e" },
  { c: 2, name: "Typical truly dark site", sqm: "21.5–21.7", sqmMin: 21.5, sqmMax: 21.7, mw: "Milky Way highly structured; zodiacal light obvious.", color: "#11244d" },
  { c: 3, name: "Rural sky", sqm: "21.3–21.5", sqmMin: 21.3, sqmMax: 21.5, mw: "Milky Way appears complex; some light domes on horizon.", color: "#1a325c" },
  { c: 4, name: "Rural/suburban transition", sqm: "20.4–21.3", sqmMin: 20.4, sqmMax: 21.3, mw: "Milky Way shows structure overhead; washed out near horizon.", color: "#284b6b" },
  { c: 5, name: "Suburban sky", sqm: "19.1–20.4", sqmMin: 19.1, sqmMax: 20.4, mw: "Milky Way very weak or invisible near horizon; only overhead.", color: "#3b6072" },
  { c: 6, name: "Bright suburban", sqm: "18.4–19.1", sqmMin: 18.4, sqmMax: 19.1, mw: "Milky Way invisible or barely seen near zenith.", color: "#5b6b6f" },
  { c: 7, name: "Suburban/urban transition", sqm: "18.0–18.4", sqmMin: 18.0, sqmMax: 18.4, mw: "Milky Way invisible. Sky has grayish-orange glow.", color: "#7a6a5d" },
  { c: 8, name: "City sky", sqm: "<18.0", sqmMin: 17.0, sqmMax: 18.0, mw: "Milky Way invisible. Only bright Messier objects visible.", color: "#8e6749" },
  { c: 9, name: "Inner-city sky", sqm: "<17.0", sqmMin: 0, sqmMax: 17.0, mw: "Milky Way invisible. Only Moon, planets, brightest stars.", color: "#a0623a" },
];

/* VIIRS DNB radiance → Bortle conversion.
   Uses the standard chain documented by lightpollutionmap.info:
     artificial brightness (mcd/m²) ≈ 0.263 * R^1.092  (Falchi/Simoneau-style empirical fit)
     total = artificial + 0.171168465  (mcd/m², natural sky)
     SQM (mag/arcsec²) = log10(total / 108e6) / -0.4
     Bortle from SQM via Bortle (2001) class brackets.
   R is the VIIRS upward radiance in nW/cm²/sr. */
function viirsRadianceToBortle(radiance) {
  const r = Math.max(0, radiance);
  // Empirical conversion from upward-looking VIIRS to artificial sky brightness
  const artificial = 0.263 * Math.pow(r, 1.092); // mcd/m²
  const total = artificial + 0.171168465;
  const sqm = Math.log10(total / 1.08e8) / -0.4;
  // Map SQM → Bortle using the brackets above
  let bortle = 9;
  for (const b of BORTLE) {
    if (sqm >= b.sqmMin && sqm < b.sqmMax) { bortle = b.c; break; }
    if (sqm >= b.sqmMax && b.c === 1) { bortle = 1; break; }
  }
  return { bortle, sqm, radiance: r, artificial };
}


/* Aurora visibility threshold (geomagnetic latitude) per Kp.
   Standard NOAA SWPC reference. */
const KP_VIEW_LAT = {
  0: 67, 1: 66, 2: 65, 3: 63, 4: 60, 5: 56, 6: 54, 7: 52, 8: 50, 9: 48,
};

/* Major constellations with central RA/Dec for "is it up tonight" */
const CONSTELLATIONS = [
  { name: "Orion", ra: 82.5, dec: -1.2, season: "winter", brightStars: "Betelgeuse, Rigel" },
  { name: "Ursa Major", ra: 165, dec: 56, season: "spring", brightStars: "Dubhe, Merak (Big Dipper)" },
  { name: "Cassiopeia", ra: 15, dec: 60, season: "autumn", brightStars: "Schedar, Caph" },
  { name: "Cygnus", ra: 305, dec: 40, season: "summer", brightStars: "Deneb (Summer Triangle)" },
  { name: "Lyra", ra: 285, dec: 38, season: "summer", brightStars: "Vega" },
  { name: "Scorpius", ra: 245, dec: -26, season: "summer", brightStars: "Antares" },
  { name: "Sagittarius", ra: 285, dec: -25, season: "summer", brightStars: "Galactic Core direction" },
  { name: "Leo", ra: 152, dec: 12, season: "spring", brightStars: "Regulus, Denebola" },
  { name: "Taurus", ra: 68, dec: 17, season: "winter", brightStars: "Aldebaran, Pleiades" },
  { name: "Gemini", ra: 113, dec: 23, season: "winter", brightStars: "Castor, Pollux" },
  { name: "Canis Major", ra: 105, dec: -22, season: "winter", brightStars: "Sirius (brightest star)" },
  { name: "Auriga", ra: 90, dec: 42, season: "winter", brightStars: "Capella" },
  { name: "Boötes", ra: 215, dec: 30, season: "spring", brightStars: "Arcturus" },
  { name: "Andromeda", ra: 10, dec: 38, season: "autumn", brightStars: "M31 Andromeda Galaxy" },
  { name: "Perseus", ra: 50, dec: 42, season: "autumn", brightStars: "Algol, Mirfak" },
  { name: "Pegasus", ra: 345, dec: 20, season: "autumn", brightStars: "Great Square" },
  { name: "Aquila", ra: 297, dec: 9, season: "summer", brightStars: "Altair (Summer Triangle)" },
  { name: "Draco", ra: 270, dec: 65, season: "circumpolar (N)", brightStars: "Thuban, Eltanin" },
];

/* Galactic core (Sagittarius A*) — fixed celestial coords */
const GALACTIC_CORE = { ra: 266.4, dec: -29.0 };

/* ---------- HELPERS ---------- */
const fmtTime = (d) => {
  if (!d) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const fmtDeg = (n, p = 1) => `${n.toFixed(p)}°`;

/* ---------- MAIN COMPONENT ---------- */
export default function CVAN() {
  const [tab, setTab] = useState("overview");
  const [coords, setCoords] = useState(null); // {lat, lon, label}
  const [now, setNow] = useState(new Date());
  const [bortle, setBortle] = useState(4); // user-adjustable estimate
  const [bortleAuto, setBortleAuto] = useState(null); // {value, sqm, radiance, source} when auto-pulled
  const [bortleManual, setBortleManual] = useState(false); // user has overridden auto
  const [weather, setWeather] = useState(null);
  const [aurora, setAurora] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [coordInput, setCoordInput] = useState({ lat: "", lon: "" });
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState({ weather: null, aurora: null, viirs: null });
  const [mapOpen, setMapOpen] = useState(false);

  // Mirror bortleManual into a ref so 24h-interval callbacks see the latest value
  const bortleManualRef = useRef(bortleManual);
  useEffect(() => { bortleManualRef.current = bortleManual; }, [bortleManual]);

  /* tick clock every minute */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  /* request geolocation on mount */
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError("Geolocation not available");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: "Current location",
        });
        setLocating(false);
      },
      (err) => {
        setLocError("Location access denied — enter manually below");
        setLocating(false);
      },
      { timeout: 8000 }
    );
  }, []);

  /* ---------- DATA FETCHERS ----------
     Refresh cadences:
       - Weather + VIIRS: every 24 hours (per user request)
       - Aurora Kp: every 5 minutes (the NOAA feed updates at ~1 min cadence;
         a fixed 24h refresh would defeat the purpose since geomagnetic storms
         can develop in minutes)
  */
  const fetchWeather = (lat, lon) => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloud_cover,temperature_2m,visibility,relative_humidity_2m&current=cloud_cover,temperature_2m&timezone=auto&forecast_days=2`)
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
        const latest = data[data.length - 1];
        setAurora({ kp: parseFloat(latest.kp_index), time: latest.time_tag });
        setLastUpdated((u) => ({ ...u, aurora: new Date() }));
      })
      .catch(() => setAurora(null));
  };

  const fetchViirs = (lat, lon) => {
    const px = 0.0042; // one VIIRS pixel (~460m at equator)
    const env = {
      xmin: lon - px, ymin: lat - px,
      xmax: lon + px, ymax: lat + px,
      spatialReference: { wkid: 4326 },
    };
    const url =
      `https://gis.ngdc.noaa.gov/arcgis/rest/services/NPP_VIIRS_DNB/Nightly_Radiance/ImageServer/getSamples?` +
      `geometry=${encodeURIComponent(JSON.stringify(env))}` +
      `&geometryType=esriGeometryEnvelope&sampleCount=9&returnFirstValueOnly=false&f=json`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!data.samples || !data.samples.length) return;
        const vals = data.samples
          .map((s) => parseFloat(s.value))
          .filter((v) => Number.isFinite(v) && v >= 0)
          .sort((a, b) => a - b);
        if (!vals.length) return;
        const median = vals[Math.floor(vals.length / 2)];
        const computed = viirsRadianceToBortle(median);
        setBortleAuto(computed);
        if (!bortleManualRef.current) setBortle(computed.bortle);
        setLastUpdated((u) => ({ ...u, viirs: new Date() }));
      })
      .catch(() => {/* leave existing */});
  };

  /* Initial + on-coord-change fetch */
  useEffect(() => {
    if (!coords) return;
    // Reset auto-bortle state for new location
    setBortleAuto(null);
    setBortleManual(false);
    fetchWeather(coords.lat, coords.lon);
    fetchAurora();
    fetchViirs(coords.lat, coords.lon);
  }, [coords]);

  /* 24-hour refresh for weather + VIIRS (independent of location changes) */
  useEffect(() => {
    if (!coords) return;
    const id = setInterval(() => {
      fetchWeather(coords.lat, coords.lon);
      fetchViirs(coords.lat, coords.lon);
    }, 24 * 60 * 60 * 1000); // 24 hours
    return () => clearInterval(id);
  }, [coords]);

  /* 5-minute refresh for aurora — Kp can change quickly during storms */
  useEffect(() => {
    if (!coords) return;
    const id = setInterval(fetchAurora, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(id);
  }, [coords]);

  /* ---------- DERIVED ASTRONOMY ---------- */
  const sky = useMemo(() => {
    if (!coords) return null;
    const jd = toJulian(now);
    const sun = sunPosition(jd);
    const moon = moonPosition(jd);
    const sidereal = lst(jd, coords.lon);
    const sunHz = equatorialToHorizontal(sun.ra, sun.dec, sidereal, coords.lat);
    const moonHz = equatorialToHorizontal(moon.ra, moon.dec, sidereal, coords.lat);
    const coreHz = equatorialToHorizontal(GALACTIC_CORE.ra, GALACTIC_CORE.dec, sidereal, coords.lat);
    const phase = moonPhase(jd);
    const phaseAngle = Math.acos(2 * phase.illumination - 1) * RAD;
    const moonBrightness = moonSkyBrightness(moonHz.alt, phaseAngle);
    const tw = twilightClass(sunHz.alt);

    const sunEvents = findEvents(now, coords.lat, coords.lon, sunPosition, -0.833);
    const moonEvents = findEvents(now, coords.lat, coords.lon, moonPosition, 0.125);
    const coreEvents = findEvents(now, coords.lat, coords.lon, () => GALACTIC_CORE, 0);

    // Twilight times (sun at -6, -12, -18)
    const twilights = {};
    [["civil", -6], ["nautical", -12], ["astro", -18]].forEach(([name, deg]) => {
      twilights[name] = findEvents(now, coords.lat, coords.lon, sunPosition, deg);
    });

    return {
      jd, sun, moon, sunHz, moonHz, coreHz,
      phase, phaseAngle, moonBrightness, tw,
      sunEvents, moonEvents, coreEvents, twilights,
    };
  }, [coords, now]);

  /* Hourly altitude curves for tonight */
  const tonightCurve = useMemo(() => {
    if (!coords) return null;
    const start = new Date(now);
    start.setHours(12, 0, 0, 0); // noon today
    const samples = [];
    for (let h = 0; h <= 36; h += 0.5) {
      const t = new Date(start.getTime() + h * 3600000);
      const jd = toJulian(t);
      const sun = sunPosition(jd);
      const moon = moonPosition(jd);
      const sidereal = lst(jd, coords.lon);
      const sunHz = equatorialToHorizontal(sun.ra, sun.dec, sidereal, coords.lat);
      const moonHz = equatorialToHorizontal(moon.ra, moon.dec, sidereal, coords.lat);
      const coreHz = equatorialToHorizontal(GALACTIC_CORE.ra, GALACTIC_CORE.dec, sidereal, coords.lat);
      samples.push({
        t, h,
        sunAlt: sunHz.alt,
        moonAlt: moonHz.alt,
        coreAlt: coreHz.alt,
      });
    }
    return samples;
  }, [coords, now]);

  /* Composite darkness/visibility score (0–100) */
  const visibilityScore = useMemo(() => {
    if (!sky || !weather) return null;
    const cloud = weather.current?.cloud_cover ?? 50;
    let s = 100;
    // Twilight penalty
    if (sky.tw.code === "day") s -= 100;
    else if (sky.tw.code === "civil") s -= 50;
    else if (sky.tw.code === "nautical") s -= 25;
    else if (sky.tw.code === "astro") s -= 10;
    // Bortle penalty
    s -= (bortle - 1) * 7;
    // Moon penalty
    s -= sky.moonBrightness * 8;
    // Cloud penalty
    s -= cloud * 0.4;
    return clamp(Math.round(s), 0, 100);
  }, [sky, weather, bortle]);

  /* Search city via Nominatim */
  async function searchCity() {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQ)}`
      );
      const data = await r.json();
      if (data[0]) {
        setCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), label: data[0].display_name });
        setLocError(null);
      } else {
        setLocError("City not found");
      }
    } catch {
      setLocError("Search failed");
    }
    setSearching(false);
  }

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
      background: "radial-gradient(ellipse at top, #0d1b3d 0%, #050914 60%, #02040a 100%)",
      color: "#e8d9a8",
      fontFamily: "'Cormorant Garamond', Georgia, serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Cinzel:wght@500;600;700&display=swap');
        .display { font-family: 'Cinzel', serif; letter-spacing: 0.08em; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .body { font-family: 'Cormorant Garamond', serif; }
        .gold { color: #d4b86a; }
        .aurora-g { color: #6dffb0; }
        .aurora-v { color: #c39bff; }
        .panel { background: linear-gradient(180deg, rgba(20,30,60,0.55) 0%, rgba(10,15,35,0.7) 100%); border: 1px solid rgba(212,184,106,0.25); border-radius: 4px; backdrop-filter: blur(6px); }
        .frame { border: 1px solid rgba(212,184,106,0.4); border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(212,184,106,0.08); }
        .corner { position: relative; }
        .corner::before, .corner::after { content: ''; position: absolute; width: 12px; height: 12px; border: 1px solid #d4b86a; }
        .corner::before { top: -1px; left: -1px; border-right: none; border-bottom: none; }
        .corner::after { bottom: -1px; right: -1px; border-left: none; border-top: none; }
        .star-bg::before {
          content: ''; position: fixed; inset: 0; pointer-events: none;
          background-image:
            radial-gradient(1px 1px at 20% 30%, white, transparent),
            radial-gradient(1px 1px at 60% 70%, #ffe, transparent),
            radial-gradient(1px 1px at 80% 20%, white, transparent),
            radial-gradient(1px 1px at 30% 80%, #ddf, transparent),
            radial-gradient(1px 1px at 90% 50%, white, transparent),
            radial-gradient(1px 1px at 10% 60%, #fff, transparent),
            radial-gradient(1px 1px at 50% 10%, white, transparent),
            radial-gradient(1px 1px at 70% 40%, #fff, transparent),
            radial-gradient(1px 1px at 40% 50%, #ddf, transparent),
            radial-gradient(1px 1px at 15% 15%, white, transparent);
          opacity: 0.6;
        }
        .tab-btn { position: relative; padding: 0.5rem 1.25rem; cursor: pointer; transition: all 0.2s; letter-spacing: 0.15em; font-size: 0.75rem; }
        .tab-btn.active { color: #d4b86a; }
        .tab-btn.active::after { content: ''; position: absolute; bottom: 0; left: 10%; right: 10%; height: 1px; background: #d4b86a; }
        .pill { padding: 2px 8px; border-radius: 2px; font-size: 0.7rem; letter-spacing: 0.1em; }
        input, select { background: rgba(0,0,0,0.3); border: 1px solid rgba(212,184,106,0.3); color: #e8d9a8; padding: 0.4rem 0.6rem; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; outline: none; }
        input:focus, select:focus { border-color: #d4b86a; }
        button.primary { background: linear-gradient(180deg, #d4b86a 0%, #a8924f 100%); color: #0a1428; border: none; padding: 0.45rem 0.9rem; font-family: 'Cinzel', serif; letter-spacing: 0.12em; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
        button.primary:hover { filter: brightness(1.1); }
        button.ghost { background: transparent; border: 1px solid rgba(212,184,106,0.4); color: #d4b86a; padding: 0.4rem 0.8rem; font-family: 'Cinzel', serif; letter-spacing: 0.1em; font-size: 0.7rem; cursor: pointer; }
        button.ghost:hover { background: rgba(212,184,106,0.1); }
        @keyframes shimmer { 0%,100% { opacity: 0.3 } 50% { opacity: 0.8 } }
        .twinkle { animation: shimmer 3s ease-in-out infinite; }
        .cvan-tiles { filter: invert(0.92) hue-rotate(180deg) brightness(0.85) contrast(0.95) saturate(0.6); }
        .leaflet-container { background: #0a1428 !important; outline: none; font-family: 'JetBrains Mono', monospace; }
        .leaflet-control-zoom a { background: rgba(20,30,60,0.9) !important; color: #d4b86a !important; border: 1px solid rgba(212,184,106,0.4) !important; }
        .leaflet-control-zoom a:hover { background: rgba(212,184,106,0.2) !important; }
        .cvan-marker { background: transparent; border: none; }
      `}</style>

      <div className="star-bg" />

      <div className="relative max-w-6xl mx-auto px-6 py-8">

        {/* HEADER */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Insignia />
                <div>
                  <h1 className="display text-3xl gold leading-none">CVAN</h1>
                  <div className="mono text-xs uppercase tracking-widest" style={{ color: "#8a9bb8" }}>
                    Celestial Visibility Analysis Network
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="mono text-xs" style={{ color: "#8a9bb8" }}>FIELD STATION · LOCAL</div>
              <div className="display gold text-lg">{now.toLocaleString([], { weekday: "short", month: "short", day: "numeric" })}</div>
              <div className="mono text-sm">{fmtTime(now)}</div>
            </div>
          </div>
          <div className="mt-4 h-px" style={{ background: "linear-gradient(90deg, transparent, #d4b86a 30%, #d4b86a 70%, transparent)" }} />
        </header>

        {/* LOCATION CONTROL BAR */}
        <LocationBar
          coords={coords}
          locating={locating}
          locError={locError}
          searchQ={searchQ} setSearchQ={setSearchQ}
          searchCity={searchCity} searching={searching}
          coordInput={coordInput} setCoordInput={setCoordInput}
          applyManualCoords={applyManualCoords}
          retryGeolocation={retryGeolocation}
          bortle={bortle} setBortle={setBortle}
          bortleAuto={bortleAuto}
          bortleManual={bortleManual} setBortleManual={setBortleManual}
          mapOpen={mapOpen} setMapOpen={setMapOpen}
          onMapPick={(lat, lon) => setCoords({ lat, lon, label: `${lat.toFixed(4)}, ${lon.toFixed(4)} (map)` })}
        />

        {/* DATA STATUS STRIP */}
        {coords && (
          <DataStatusStrip
            lastUpdated={lastUpdated}
            now={now}
            onRefresh={() => {
              fetchWeather(coords.lat, coords.lon);
              fetchAurora();
              fetchViirs(coords.lat, coords.lon);
            }}
          />
        )}

        {/* TABS */}
        <nav className="flex gap-1 mt-8 mb-6 border-b" style={{ borderColor: "rgba(212,184,106,0.2)" }}>
          {[
            ["overview", "Tonight"],
            ["milkyway", "Milky Way"],
            ["aurora", "Aurora"],
            ["constellations", "Constellations"],
            ["moonsun", "Moon & Sun"],
          ].map(([k, label]) => (
            <button key={k} className={`tab-btn display ${tab === k ? "active" : ""}`} style={{ color: tab === k ? "#d4b86a" : "#8a9bb8" }} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </nav>

        {/* CONTENT */}
        {!coords ? (
          <div className="panel corner p-12 text-center">
            <div className="display gold text-lg mb-3">AWAITING POSITION FIX</div>
            <p className="body text-base" style={{ color: "#a8b5cd" }}>
              Grant location access, search a city, or enter coordinates manually above.
            </p>
          </div>
        ) : (
          <>
            {tab === "overview" && <Overview sky={sky} weather={weather} aurora={aurora} bortle={bortle} score={visibilityScore} curve={tonightCurve} coords={coords} />}
            {tab === "milkyway" && <MilkyWay sky={sky} weather={weather} bortle={bortle} bortleAuto={bortleAuto} curve={tonightCurve} coords={coords} />}
            {tab === "aurora" && <Aurora aurora={aurora} weather={weather} bortle={bortle} sky={sky} coords={coords} />}
            {tab === "constellations" && <Constellations coords={coords} now={now} sky={sky} bortle={bortle} weather={weather} />}
            {tab === "moonsun" && <MoonSun sky={sky} curve={tonightCurve} />}
          </>
        )}

        <footer className="mt-16 pt-6 text-center mono text-xs" style={{ color: "#5a6a85", borderTop: "1px solid rgba(212,184,106,0.15)" }}>
          <div>POSITIONS · MEEUS ASTRONOMICAL ALGORITHMS · WEATHER · OPEN-METEO · AURORA · NOAA SWPC</div>
          <div className="mt-1">LIGHT POLLUTION · NOAA NCEI VIIRS DNB NIGHTLY RADIANCE · MOON SKY BRIGHTNESS · KRISCIUNAS-SCHAEFER (1991) · BORTLE SCALE · BORTLE (2001)</div>
        </footer>
      </div>
    </div>
  );
}

/* ---------- INSIGNIA (small CVAN-style emblem) ---------- */
function Insignia() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <defs>
        <radialGradient id="sky" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1a2a5c" />
          <stop offset="100%" stopColor="#050914" />
        </radialGradient>
      </defs>
      <circle cx="28" cy="28" r="26" fill="url(#sky)" stroke="#d4b86a" strokeWidth="1.5" />
      <circle cx="28" cy="28" r="22" fill="none" stroke="#1a2a5c" strokeWidth="2" />
      <path d="M 8 32 Q 14 18 20 30 Q 26 14 32 28 Q 40 12 48 30" fill="none" stroke="#6dffb0" strokeWidth="1.2" opacity="0.7" />
      <path d="M 10 36 Q 18 24 24 34 Q 32 20 40 32 Q 46 22 50 34" fill="none" stroke="#c39bff" strokeWidth="1" opacity="0.5" />
      <circle cx="28" cy="22" r="1.4" fill="#fff" />
      <circle cx="20" cy="18" r="0.8" fill="#fff" />
      <circle cx="36" cy="20" r="0.8" fill="#fff" />
      <circle cx="42" cy="26" r="0.6" fill="#fff" />
      <path d="M 8 42 L 20 38 L 28 42 L 36 38 L 48 42 L 48 50 L 8 50 Z" fill="#0a1428" stroke="#1a2a5c" />
    </svg>
  );
}

/* ---------- DATA STATUS STRIP ---------- */
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
    <div className="flex items-center gap-2 text-xs mono" style={{ color: "#a8b5cd" }}>
      <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: time ? color : "#5a6a85" }} />
      <span style={{ color: "#8a9bb8", letterSpacing: "0.1em" }}>{label}</span>
      <span className="gold">{fmtAge(time)}</span>
      <span style={{ color: "#5a6a85" }}>· refresh {cadence}</span>
    </div>
  );
  return (
    <div className="mt-3 px-4 py-2 flex items-center justify-between flex-wrap gap-3" style={{ background: "rgba(20,30,60,0.3)", border: "1px solid rgba(212,184,106,0.15)", borderRadius: 2 }}>
      <div className="flex items-center gap-5 flex-wrap">
        {cell("WEATHER", lastUpdated.weather, "24h", "#6dffb0")}
        {cell("AURORA Kp", lastUpdated.aurora, "5m", "#c39bff")}
        {cell("VIIRS BORTLE", lastUpdated.viirs, "24h", "#ffd56a")}
      </div>
      <button className="ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.65rem" }} onClick={onRefresh}>
        ⟳ REFRESH NOW
      </button>
    </div>
  );
}

/* ---------- MAP PICKER ----------
   Leaflet via CDN, loaded once and shared across mounts.
   Click anywhere → coords flow back to the parent. Marker tracks `coords` prop.
*/
let leafletPromise = null;
function loadLeaflet() {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (window.L) { resolve(window.L); return; }
    // CSS
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    css.crossOrigin = "";
    document.head.appendChild(css);
    // JS
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

function MapPicker({ coords, onPick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onPickRef = useRef(onPick);
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  // Initialize map once
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        center: [coords.lat, coords.lon],
        zoom: 8,
        scrollWheelZoom: true,
        attributionControl: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        className: "cvan-tiles",
      }).addTo(map);

      // Custom gold marker (small SVG icon)
      const icon = L.divIcon({
        className: "cvan-marker",
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:radial-gradient(circle,#d4b86a 0%,#a8924f 70%,transparent 100%);
          border:2px solid #0a1428;
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

      // Force resize tick — Leaflet sometimes mis-measures inside flex containers
      setTimeout(() => map.invalidateSize(), 100);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-once; coords syncs separately below

  // When coords change externally, move marker + recenter
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([coords.lat, coords.lon]);
      mapRef.current.setView([coords.lat, coords.lon], mapRef.current.getZoom(), { animate: true });
    }
  }, [coords.lat, coords.lon]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "320px",
        width: "100%",
        borderRadius: 2,
        border: "1px solid rgba(212,184,106,0.4)",
        background: "#0a1428",
        cursor: "crosshair",
      }}
    />
  );
}

/* ---------- LOCATION BAR ---------- */
function LocationBar({ coords, locating, locError, searchQ, setSearchQ, searchCity, searching, coordInput, setCoordInput, applyManualCoords, retryGeolocation, bortle, setBortle, bortleAuto, bortleManual, setBortleManual, mapOpen, setMapOpen, onMapPick }) {
  const onSliderChange = (v) => {
    setBortle(v);
    setBortleManual(true);
  };
  const resetToAuto = () => {
    if (bortleAuto) {
      setBortle(bortleAuto.bortle);
      setBortleManual(false);
    }
  };

  return (
    <div className="panel corner p-5">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-4">
          <div className="mono text-xs uppercase tracking-widest mb-1" style={{ color: "#8a9bb8" }}>Position Fix</div>
          {coords ? (
            <div>
              <div className="display gold text-sm truncate">{coords.label}</div>
              <div className="mono text-xs mt-0.5" style={{ color: "#a8b5cd" }}>
                {coords.lat.toFixed(4)}°, {coords.lon.toFixed(4)}°
              </div>
            </div>
          ) : (
            <div className="body italic" style={{ color: "#8a9bb8" }}>{locating ? "Acquiring..." : "No fix"}</div>
          )}
          {locError && <div className="mono text-xs mt-1" style={{ color: "#ff9b8a" }}>{locError}</div>}
        </div>

        <div className="md:col-span-4">
          <div className="mono text-xs uppercase tracking-widest mb-1" style={{ color: "#8a9bb8" }}>Search City / Place</div>
          <div className="flex gap-1">
            <input className="flex-1" placeholder="e.g. Algonquin Park" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchCity()} />
            <button className="primary" onClick={searchCity} disabled={searching}>{searching ? "..." : "GO"}</button>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="mono text-xs uppercase tracking-widest mb-1" style={{ color: "#8a9bb8" }}>Manual Coords</div>
          <div className="flex gap-1">
            <input style={{ width: "70px" }} placeholder="lat" value={coordInput.lat} onChange={(e) => setCoordInput({ ...coordInput, lat: e.target.value })} />
            <input style={{ width: "70px" }} placeholder="lon" value={coordInput.lon} onChange={(e) => setCoordInput({ ...coordInput, lon: e.target.value })} />
            <button className="ghost" onClick={applyManualCoords}>SET</button>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="flex flex-col gap-1">
            <button className="ghost" onClick={retryGeolocation} title="Use my GPS">GPS</button>
            <button className="ghost" onClick={() => setMapOpen(!mapOpen)} title="Pick on map" style={{ color: mapOpen ? "#0a1428" : undefined, background: mapOpen ? "#d4b86a" : undefined }}>MAP</button>
          </div>
        </div>
      </div>

      {/* MAP PICKER (collapsible) */}
      {mapOpen && coords && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(212,184,106,0.15)" }}>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="mono text-xs uppercase tracking-widest" style={{ color: "#8a9bb8" }}>
              Map · click anywhere to set coordinates
            </div>
            <div className="mono text-xs" style={{ color: "#a8b5cd" }}>
              Tiles © OpenStreetMap contributors
            </div>
          </div>
          <MapPicker coords={coords} onPick={onMapPick} />
        </div>
      )}

      <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(212,184,106,0.15)" }}>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <div className="mono text-xs uppercase tracking-widest" style={{ color: "#8a9bb8" }}>
            Light Pollution · Bortle Class
          </div>
          {bortleAuto ? (
            <span className="pill mono" style={{
              background: bortleManual ? "rgba(212,184,106,0.15)" : "#6dffb0",
              color: bortleManual ? "#d4b86a" : "#0a1428",
              border: bortleManual ? "1px solid rgba(212,184,106,0.4)" : "none",
            }}>
              {bortleManual ? "MANUAL OVERRIDE" : "AUTO · NOAA VIIRS"}
            </span>
          ) : coords ? (
            <span className="pill mono" style={{ background: "rgba(138,155,184,0.2)", color: "#8a9bb8" }}>FETCHING VIIRS...</span>
          ) : null}
          {bortleManual && bortleAuto && (
            <button className="ghost" style={{ padding: "2px 8px", fontSize: "0.65rem" }} onClick={resetToAuto}>
              RESTORE AUTO ({bortleAuto.bortle})
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <input type="range" min="1" max="9" step="1" value={bortle} onChange={(e) => onSliderChange(parseInt(e.target.value))} style={{ flex: 1, minWidth: "200px" }} />
          <div className="display gold text-sm" style={{ minWidth: "30px", textAlign: "center" }}>{bortle}</div>
        </div>
        <div className="body text-sm mt-2" style={{ color: "#e8d9a8" }}>
          <span className="gold">{BORTLE[bortle - 1].name}</span>
          {bortleAuto && !bortleManual && (
            <span className="mono text-xs ml-2" style={{ color: "#a8b5cd" }}>
              · SQM {bortleAuto.sqm.toFixed(2)} · VIIRS radiance {bortleAuto.radiance.toFixed(2)} nW/cm²/sr
            </span>
          )}
          <div className="mt-1" style={{ color: "#a8b5cd" }}>{BORTLE[bortle - 1].mw}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- OVERVIEW TAB ---------- */
function Overview({ sky, weather, aurora, bortle, score, curve, coords }) {
  if (!sky) return null;
  const cloud = weather?.current?.cloud_cover ?? null;
  const temp = weather?.current?.temperature_2m ?? null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SCORE PANEL */}
        <div className="panel corner p-6 lg:col-span-1">
          <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>Composite Visibility</div>
          <ScoreDial score={score} />
          <div className="mt-4 space-y-1 text-sm body">
            <ScoreRow label="Twilight" value={sky.tw.name} />
            <ScoreRow label="Bortle" value={`Class ${bortle}`} />
            <ScoreRow label="Moon brightening" value={`+${sky.moonBrightness.toFixed(2)} mag`} />
            <ScoreRow label="Cloud cover" value={cloud !== null ? `${cloud}%` : "—"} />
          </div>
        </div>

        {/* CURRENT SKY */}
        <div className="panel corner p-6 lg:col-span-2">
          <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>Sky Right Now</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DataCell label="Sun Alt" value={fmtDeg(sky.sunHz.alt)} sub={sky.tw.name} />
            <DataCell label="Moon Alt" value={fmtDeg(sky.moonHz.alt)} sub={moonPhaseName(sky.phase.phaseFraction)} />
            <DataCell label="Moon Illum" value={`${(sky.phase.illumination * 100).toFixed(0)}%`} sub={`age ${sky.phase.ageDays.toFixed(1)}d`} />
            <DataCell label="MW Core Alt" value={fmtDeg(sky.coreHz.alt)} sub={sky.coreHz.alt > 20 ? "viewable" : "low/below"} />
            <DataCell label="Cloud Cover" value={cloud !== null ? `${cloud}%` : "—"} sub={cloud !== null ? cloudVerdict(cloud) : ""} />
            <DataCell label="Temp" value={temp !== null ? `${temp}°C` : "—"} sub="ambient" />
            <DataCell label="Kp Index" value={aurora ? aurora.kp.toFixed(1) : "—"} sub={aurora ? auroraVerdictShort(aurora.kp, coords.lat) : ""} />
            <DataCell label="Latitude" value={fmtDeg(coords.lat, 2)} sub={coords.lat > 50 ? "high-lat" : coords.lat > 35 ? "mid-lat" : "low-lat"} />
          </div>
        </div>
      </div>

      {/* TONIGHT CURVE */}
      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>Tonight's Sky · Altitude over Time</div>
        <AltitudeChart curve={curve} />
        <div className="mt-3 flex gap-4 mono text-xs flex-wrap" style={{ color: "#a8b5cd" }}>
          <Legend color="#ffd56a" label="Sun" />
          <Legend color="#e8e8e8" label="Moon" />
          <Legend color="#c39bff" label="Milky Way Core" />
          <Legend color="#6dffb0" label="Astronomical night" dashed />
        </div>
      </div>

      {/* QUICK VERDICTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <VerdictCard title="Milky Way" verdict={milkyWayVerdict(sky, bortle, cloud)} icon="✦" />
        <VerdictCard title="Aurora" verdict={auroraVerdict(aurora, coords.lat, cloud)} icon="≋" />
        <VerdictCard title="Deep Sky" verdict={deepSkyVerdict(sky, bortle, cloud)} icon="◉" />
      </div>
    </div>
  );
}

function ScoreRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "#8a9bb8" }}>{label}</span>
      <span className="gold mono text-xs">{value}</span>
    </div>
  );
}

function ScoreDial({ score }) {
  const v = score ?? 0;
  const angle = (v / 100) * 270 - 135;
  const color = v > 70 ? "#6dffb0" : v > 40 ? "#d4b86a" : v > 15 ? "#ff9b6d" : "#ff5b5b";
  return (
    <div className="relative" style={{ width: "180px", height: "180px", margin: "0 auto" }}>
      <svg viewBox="0 0 200 200" width="180" height="180">
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(212,184,106,0.15)" strokeWidth="8" />
        <circle cx="100" cy="100" r="80" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${(v / 100) * 376} 376`}
          transform="rotate(-90 100 100)" strokeLinecap="round" />
        <text x="100" y="105" textAnchor="middle" fontSize="42" fontFamily="Cinzel" fill={color}>{v}</text>
        <text x="100" y="130" textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono" fill="#8a9bb8" letterSpacing="2">/ 100</text>
      </svg>
    </div>
  );
}

function DataCell({ label, value, sub }) {
  return (
    <div className="frame p-3">
      <div className="mono text-xs" style={{ color: "#8a9bb8" }}>{label}</div>
      <div className="display gold text-xl mt-1">{value}</div>
      {sub && <div className="body text-xs italic" style={{ color: "#a8b5cd" }}>{sub}</div>}
    </div>
  );
}

function Legend({ color, label, dashed }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ display: "inline-block", width: 20, height: 2, background: dashed ? "transparent" : color, borderTop: dashed ? `2px dashed ${color}` : "none" }} />
      <span>{label}</span>
    </div>
  );
}

function VerdictCard({ title, verdict, icon }) {
  return (
    <div className="panel corner p-5">
      <div className="flex items-center gap-3 mb-2">
        <span className="display gold text-2xl">{icon}</span>
        <span className="display gold text-sm uppercase tracking-widest">{title}</span>
      </div>
      <div className="mono text-xs uppercase mb-1" style={{ color: verdict.color }}>{verdict.rating}</div>
      <div className="body text-sm" style={{ color: "#d8c89c" }}>{verdict.text}</div>
    </div>
  );
}

/* ---------- ALTITUDE CHART ---------- */
function AltitudeChart({ curve }) {
  if (!curve) return null;
  const W = 700, H = 200, P = 30;
  const xScale = (h) => P + ((h - 0) / 36) * (W - P * 2);
  const yScale = (alt) => H - P - ((alt + 90) / 180) * (H - P * 2);

  const linePath = (key, color) => {
    return curve.map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(s.h)} ${yScale(s[key])}`).join(" ");
  };

  // Night band: where sunAlt < -18
  const nightBands = [];
  let bandStart = null;
  curve.forEach((s, i) => {
    if (s.sunAlt < -18 && bandStart === null) bandStart = s.h;
    if (s.sunAlt >= -18 && bandStart !== null) {
      nightBands.push([bandStart, s.h]);
      bandStart = null;
    }
  });
  if (bandStart !== null) nightBands.push([bandStart, 36]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "100%" }}>
      {/* night bands */}
      {nightBands.map(([a, b], i) => (
        <rect key={i} x={xScale(a)} y={P} width={xScale(b) - xScale(a)} height={H - P * 2} fill="rgba(109,255,176,0.06)" />
      ))}
      {/* horizon line */}
      <line x1={P} y1={yScale(0)} x2={W - P} y2={yScale(0)} stroke="#d4b86a" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
      {/* -18 twilight */}
      <line x1={P} y1={yScale(-18)} x2={W - P} y2={yScale(-18)} stroke="#6dffb0" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.3" />
      {/* curves */}
      <path d={linePath("sunAlt", "#ffd56a")} fill="none" stroke="#ffd56a" strokeWidth="1.5" />
      <path d={linePath("moonAlt", "#e8e8e8")} fill="none" stroke="#e8e8e8" strokeWidth="1.5" />
      <path d={linePath("coreAlt", "#c39bff")} fill="none" stroke="#c39bff" strokeWidth="1.5" />
      {/* labels */}
      <text x={P} y={yScale(0) - 4} fontSize="9" fontFamily="JetBrains Mono" fill="#d4b86a" opacity="0.7">HORIZON</text>
      <text x={P} y={yScale(-18) - 4} fontSize="9" fontFamily="JetBrains Mono" fill="#6dffb0" opacity="0.6">−18° (ASTRO NIGHT)</text>
      {/* hour labels */}
      {[0, 6, 12, 18, 24, 30, 36].map((h) => (
        <text key={h} x={xScale(h)} y={H - 8} fontSize="9" fontFamily="JetBrains Mono" fill="#8a9bb8" textAnchor="middle">
          {((h + 12) % 24).toString().padStart(2, "0")}
        </text>
      ))}
    </svg>
  );
}

/* ---------- VERDICT HELPERS ---------- */
function cloudVerdict(c) {
  if (c < 20) return "clear";
  if (c < 50) return "partly cloudy";
  if (c < 80) return "mostly cloudy";
  return "overcast";
}
function milkyWayVerdict(sky, bortle, cloud) {
  if (sky.coreHz.alt < 0) return { rating: "BELOW HORIZON", color: "#8a9bb8", text: "Galactic core is not above horizon. Check seasonal availability — best from May–September in N. hemisphere." };
  if (bortle >= 7) return { rating: "INVISIBLE", color: "#ff5b5b", text: `Bortle ${bortle} sky overwhelms the Milky Way entirely. Travel to darker sky required.` };
  if (sky.tw.code !== "night") return { rating: "WAIT", color: "#ff9b6d", text: `Currently ${sky.tw.name}. Galactic core needs astronomical night for best contrast.` };
  if (sky.moonBrightness > 1.5) return { rating: "WASHED OUT", color: "#ff9b6d", text: "Moon is too bright. Wait for moonset or a darker phase." };
  if (cloud !== null && cloud > 60) return { rating: "CLOUDED", color: "#ff9b6d", text: `${cloud}% cloud cover blocking view.` };
  if (bortle <= 3) return { rating: "EXCELLENT", color: "#6dffb0", text: "Dark sky + core up + clear: structured Milky Way visible naked-eye." };
  return { rating: "VISIBLE", color: "#d4b86a", text: "Core overhead and conditions reasonable. Suburbs see only the brightest sections." };
}
function auroraVerdict(aurora, lat, cloud) {
  if (!aurora) return { rating: "NO DATA", color: "#8a9bb8", text: "NOAA SWPC feed unavailable." };
  const kp = aurora.kp;
  const threshold = KP_VIEW_LAT[Math.floor(kp)] ?? 50;
  const absLat = Math.abs(lat);
  if (absLat < threshold - 3) return { rating: "TOO FAR SOUTH", color: "#8a9bb8", text: `Kp=${kp.toFixed(1)} requires ~${threshold}° latitude. You're at ${absLat.toFixed(1)}°.` };
  if (cloud !== null && cloud > 70) return { rating: "CLOUDED OUT", color: "#ff9b6d", text: `Kp=${kp.toFixed(1)} is workable but ${cloud}% clouds will block view.` };
  if (kp >= 5) return { rating: "STORM IN PROGRESS", color: "#6dffb0", text: `Kp=${kp.toFixed(1)} — geomagnetic storm. Aurora likely visible from your latitude.` };
  if (absLat >= threshold) return { rating: "POSSIBLE", color: "#d4b86a", text: `Kp=${kp.toFixed(1)} and you're at viewing latitude. Look toward magnetic north.` };
  return { rating: "QUIET", color: "#8a9bb8", text: `Kp=${kp.toFixed(1)} — no significant aurora activity expected.` };
}
function auroraVerdictShort(kp, lat) {
  const threshold = KP_VIEW_LAT[Math.floor(kp)] ?? 50;
  if (Math.abs(lat) >= threshold) return "viewable";
  if (kp >= 5) return "elevated";
  return "quiet";
}
function deepSkyVerdict(sky, bortle, cloud) {
  if (sky.tw.code !== "night" && sky.tw.code !== "astro") return { rating: "WAIT FOR NIGHT", color: "#8a9bb8", text: `${sky.tw.name} — DSO observation needs astronomical night.` };
  if (cloud !== null && cloud > 60) return { rating: "CLOUDED", color: "#ff9b6d", text: `${cloud}% cloud cover.` };
  if (bortle <= 3) return { rating: "EXCELLENT", color: "#6dffb0", text: "All Messier objects accessible; faint nebulae visible in modest scopes." };
  if (bortle <= 5) return { rating: "GOOD", color: "#d4b86a", text: "Bright Messier targets, galaxies, and clusters visible. Faint nebulae harder." };
  if (bortle <= 7) return { rating: "LIMITED", color: "#ff9b6d", text: "Only the brightest globulars, M31, and open clusters. Galaxies challenging." };
  return { rating: "POOR", color: "#ff5b5b", text: "Severe light pollution; only Moon, planets, brightest stars/clusters." };
}

/* ---------- MILKY WAY TAB ---------- */
function MilkyWay({ sky, weather, bortle, bortleAuto, curve, coords }) {
  if (!sky) return null;
  const cloud = weather?.current?.cloud_cover;
  const verdict = milkyWayVerdict(sky, bortle, cloud);
  const bortleInfo = BORTLE[bortle - 1];

  // Find when core is highest tonight
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
          <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>Galactic Core · Right Now</div>
          <div className="grid grid-cols-2 gap-4">
            <DataCell label="Altitude" value={fmtDeg(sky.coreHz.alt)} sub={sky.coreHz.alt > 30 ? "well placed" : sky.coreHz.alt > 0 ? "low" : "below horizon"} />
            <DataCell label="Azimuth" value={fmtDeg(sky.coreHz.az)} sub={azimuthName(sky.coreHz.az)} />
            <DataCell label="Best Tonight" value={bestTime ? fmtTime(bestTime) : "—"} sub={bestAlt > -90 ? `at ${fmtDeg(bestAlt)}` : "core not up at night"} />
            <DataCell label="Twilight" value={sky.tw.name} sub={sky.tw.code === "night" ? "✓ dark sky" : "wait"} />
          </div>
        </div>

        <div className="panel corner p-6">
          <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>Verdict</div>
          <div className="display text-2xl mb-2" style={{ color: verdict.color }}>{verdict.rating}</div>
          <div className="body text-base" style={{ color: "#d8c89c" }}>{verdict.text}</div>
        </div>
      </div>

      {/* BORTLE BREAKDOWN */}
      <div className="panel corner p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="mono text-xs uppercase tracking-widest" style={{ color: "#8a9bb8" }}>Bortle Scale · What You'll See at Class {bortle}</div>
          {bortleAuto && (
            <div className="mono text-xs" style={{ color: "#a8b5cd" }}>
              MEASURED: SQM <span className="gold">{bortleAuto.sqm.toFixed(2)}</span> · VIIRS <span className="gold">{bortleAuto.radiance.toFixed(2)}</span> nW/cm²/sr · ARTIFICIAL <span className="gold">{bortleAuto.artificial.toFixed(2)}</span> mcd/m²
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

      {/* FACTORS BREAKDOWN */}
      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>Conditions Affecting Tonight's View</div>
        <div className="space-y-3">
          <FactorRow label="Light pollution (Bortle)" status={bortle <= 3 ? "good" : bortle <= 5 ? "fair" : "bad"} note={`Class ${bortle} — ${bortleInfo.name}. ${bortleInfo.mw}`} />
          <FactorRow label="Moon" status={sky.moonBrightness < 0.3 ? "good" : sky.moonBrightness < 1.5 ? "fair" : "bad"}
            note={`${moonPhaseName(sky.phase.phaseFraction)} (${(sky.phase.illumination * 100).toFixed(0)}% illuminated), altitude ${fmtDeg(sky.moonHz.alt)}. Sky brightening +${sky.moonBrightness.toFixed(2)} mag (Krisciunas-Schaefer model). Moon must be below horizon — or below ~−5° to make light pollution negligible.`} />
          <FactorRow label="Twilight" status={sky.tw.code === "night" ? "good" : sky.tw.code === "astro" ? "fair" : "bad"}
            note={`${sky.tw.name} — sun at ${fmtDeg(sky.sunHz.alt)}. Galactic core requires astronomical night (sun < −18°) for full contrast.`} />
          <FactorRow label="Cloud cover" status={cloud === undefined || cloud === null ? "unknown" : cloud < 30 ? "good" : cloud < 60 ? "fair" : "bad"}
            note={cloud !== null && cloud !== undefined ? `${cloud}% — ${cloudVerdict(cloud)}` : "weather data unavailable"} />
          <FactorRow label="Galactic core altitude" status={sky.coreHz.alt > 30 ? "good" : sky.coreHz.alt > 10 ? "fair" : "bad"}
            note={`Core at ${fmtDeg(sky.coreHz.alt)} altitude, ${fmtDeg(sky.coreHz.az)} azimuth (${azimuthName(sky.coreHz.az)}). Higher altitude = thinner atmosphere = more contrast. Best viewing >30°.`} />
        </div>
      </div>
    </div>
  );
}

function FactorRow({ label, status, note }) {
  const colors = { good: "#6dffb0", fair: "#d4b86a", bad: "#ff5b5b", unknown: "#8a9bb8" };
  return (
    <div className="frame p-3">
      <div className="flex items-center gap-3 mb-1">
        <span className="pill mono" style={{ background: colors[status], color: "#0a1428" }}>{status.toUpperCase()}</span>
        <span className="display gold text-sm">{label}</span>
      </div>
      <div className="body text-sm" style={{ color: "#a8b5cd" }}>{note}</div>
    </div>
  );
}

/* ---------- AURORA TAB ---------- */
function Aurora({ aurora, weather, bortle, sky, coords }) {
  if (!aurora) return (
    <div className="panel corner p-6 text-center">
      <div className="display gold text-lg mb-2">NOAA SWPC FEED UNAVAILABLE</div>
      <p className="body" style={{ color: "#a8b5cd" }}>Real-time aurora data could not be fetched. Try refreshing.</p>
    </div>
  );

  const kp = aurora.kp;
  const threshold = KP_VIEW_LAT[Math.floor(kp)] ?? 50;
  const absLat = Math.abs(coords.lat);
  const cloud = weather?.current?.cloud_cover;
  const verdict = auroraVerdict(aurora, coords.lat, cloud);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="panel corner p-6">
          <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>NOAA Planetary Kp</div>
          <KpDial kp={kp} />
          <div className="mono text-xs text-center mt-2" style={{ color: "#8a9bb8" }}>
            updated {new Date(aurora.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        <div className="panel corner p-6 lg:col-span-2">
          <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>Viewing Geometry</div>
          <ViewingLatDiagram kp={kp} userLat={absLat} threshold={threshold} />
          <div className="grid grid-cols-3 gap-3 mt-4">
            <DataCell label="Your |Lat|" value={fmtDeg(absLat, 1)} />
            <DataCell label="Threshold @ Kp" value={fmtDeg(threshold)} sub="approx geo lat" />
            <DataCell label="Margin" value={`${absLat - threshold > 0 ? "+" : ""}${(absLat - threshold).toFixed(1)}°`} sub={absLat > threshold ? "above line" : "below line"} />
          </div>
        </div>
      </div>

      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>Verdict</div>
        <div className="display text-2xl mb-2" style={{ color: verdict.color }}>{verdict.rating}</div>
        <div className="body text-base" style={{ color: "#d8c89c" }}>{verdict.text}</div>
      </div>

      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>Conditions Affecting Aurora Viewing</div>
        <div className="space-y-3">
          <FactorRow label="Geomagnetic activity (Kp)" status={kp >= 5 ? "good" : kp >= 4 ? "fair" : "bad"}
            note={`Kp = ${kp.toFixed(1)}. Aurora typically visible at geomagnetic latitudes ≥ ${threshold}°. Kp ≥ 5 = G1 storm; Kp ≥ 7 = G3 strong storm reaching mid-latitudes.`} />
          <FactorRow label="Your latitude" status={absLat >= threshold ? "good" : absLat >= threshold - 5 ? "fair" : "bad"}
            note={`At ${absLat.toFixed(1)}° |lat|, ${absLat >= threshold ? "you're inside the auroral oval for this Kp." : "you'd need higher Kp or to travel north."}`} />
          <FactorRow label="Cloud cover" status={cloud === undefined || cloud === null ? "unknown" : cloud < 30 ? "good" : cloud < 60 ? "fair" : "bad"}
            note={cloud !== null && cloud !== undefined ? `${cloud}% — aurora is in upper atmosphere (~100km) so any clouds block it entirely.` : "weather data unavailable"} />
          <FactorRow label="Moon" status={sky.moonBrightness < 0.5 ? "good" : sky.moonBrightness < 2 ? "fair" : "bad"}
            note={`${moonPhaseName(sky.phase.phaseFraction)}, sky brightening +${sky.moonBrightness.toFixed(2)} mag. Bright aurora overpowers moonlight; faint diffuse aurora gets washed out.`} />
          <FactorRow label="City light pollution" status={bortle <= 4 ? "good" : bortle <= 6 ? "fair" : "bad"}
            note={`Bortle ${bortle}. Strong aurora visible from cities; subtle green glow needs Bortle ≤ 4. Look toward magnetic north — get away from streetlights.`} />
          <FactorRow label="Twilight" status={sky.tw.code === "night" ? "good" : sky.tw.code === "astro" || sky.tw.code === "nautical" ? "fair" : "bad"}
            note={`${sky.tw.name}. Aurora visible during nautical twilight if strong, but full darkness gives best contrast.`} />
        </div>
      </div>
    </div>
  );
}

function KpDial({ kp }) {
  const angle = (kp / 9) * 180 - 90;
  const color = kp >= 7 ? "#ff5b5b" : kp >= 5 ? "#ff9b6d" : kp >= 4 ? "#d4b86a" : kp >= 3 ? "#6dffb0" : "#8a9bb8";
  return (
    <svg viewBox="0 0 200 130" width="100%" style={{ maxWidth: "240px", margin: "0 auto", display: "block" }}>
      <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="rgba(212,184,106,0.2)" strokeWidth="14" />
      <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke={color} strokeWidth="14"
        strokeDasharray={`${(kp / 9) * 251} 251`} strokeLinecap="round" />
      <text x="100" y="90" textAnchor="middle" fontSize="38" fontFamily="Cinzel" fill={color}>{kp.toFixed(1)}</text>
      <text x="100" y="115" textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono" fill="#8a9bb8" letterSpacing="2">Kp · 0–9</text>
      {[0, 3, 5, 7, 9].map((k) => {
        const a = (k / 9) * 180 - 180;
        const r = 92;
        const x = 100 + r * Math.cos(a * DEG);
        const y = 110 + r * Math.sin(a * DEG);
        return <text key={k} x={x} y={y} fontSize="8" fontFamily="JetBrains Mono" fill="#8a9bb8" textAnchor="middle">{k}</text>;
      })}
    </svg>
  );
}

function ViewingLatDiagram({ kp, userLat, threshold }) {
  const W = 600, H = 160;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {/* latitude scale */}
      <line x1="40" y1="80" x2={W - 40} y2="80" stroke="#d4b86a" strokeWidth="1" opacity="0.5" />
      {[30, 40, 50, 60, 70, 80, 90].map((l) => {
        const x = 40 + ((l - 30) / 60) * (W - 80);
        return (
          <g key={l}>
            <line x1={x} y1="75" x2={x} y2="85" stroke="#8a9bb8" strokeWidth="0.5" />
            <text x={x} y="100" fontSize="9" fontFamily="JetBrains Mono" fill="#8a9bb8" textAnchor="middle">{l}°</text>
          </g>
        );
      })}
      {/* aurora oval region */}
      <rect x={40 + ((threshold - 30) / 60) * (W - 80)} y="55" width={(W - 80) - ((threshold - 30) / 60) * (W - 80)} height="20" fill="#6dffb0" opacity="0.25" />
      <text x={40 + ((threshold - 30) / 60) * (W - 80) + 4} y="50" fontSize="10" fontFamily="JetBrains Mono" fill="#6dffb0">VIEWING ZONE @ Kp {kp.toFixed(1)}</text>
      {/* user position */}
      {userLat >= 30 && userLat <= 90 && (
        <g>
          <line x1={40 + ((userLat - 30) / 60) * (W - 80)} y1="40" x2={40 + ((userLat - 30) / 60) * (W - 80)} y2="120" stroke="#d4b86a" strokeWidth="2" />
          <circle cx={40 + ((userLat - 30) / 60) * (W - 80)} cy="80" r="5" fill="#d4b86a" />
          <text x={40 + ((userLat - 30) / 60) * (W - 80)} y="135" fontSize="11" fontFamily="Cinzel" fill="#d4b86a" textAnchor="middle">YOU · {userLat.toFixed(1)}°</text>
        </g>
      )}
      {userLat < 30 && (
        <text x="40" y="135" fontSize="11" fontFamily="Cinzel" fill="#ff9b6d">Below 30° latitude — aurora rarely visible at any Kp.</text>
      )}
    </svg>
  );
}

/* ---------- CONSTELLATIONS TAB ---------- */
function Constellations({ coords, now, sky, bortle, weather }) {
  const cloud = weather?.current?.cloud_cover;
  const jd = toJulian(now);
  const sidereal = lst(jd, coords.lon);

  const data = CONSTELLATIONS.map((c) => {
    const hz = equatorialToHorizontal(c.ra, c.dec, sidereal, coords.lat);
    return { ...c, alt: hz.alt, az: hz.az };
  }).sort((a, b) => b.alt - a.alt);

  return (
    <div className="space-y-6">
      <div className="panel corner p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="mono text-xs uppercase tracking-widest" style={{ color: "#8a9bb8" }}>Constellations Above Horizon · {fmtTime(now)} Local</div>
          <div className="mono text-xs" style={{ color: "#a8b5cd" }}>{sky.tw.name} · Moon {(sky.phase.illumination * 100).toFixed(0)}% · Bortle {bortle}</div>
        </div>

        {/* Sky dome SVG */}
        <SkyDome data={data} />
      </div>

      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>Detailed Visibility</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((c) => {
            const visible = c.alt > 10;
            const verdict = constellationVerdict(c, sky, bortle, cloud);
            return (
              <div key={c.name} className={`frame p-3 ${!visible ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="display gold text-base">{c.name}</span>
                  <span className="pill mono" style={{ background: verdict.color, color: "#0a1428" }}>{verdict.rating}</span>
                </div>
                <div className="mono text-xs flex gap-3 mb-1" style={{ color: "#a8b5cd" }}>
                  <span>ALT {fmtDeg(c.alt)}</span>
                  <span>AZ {fmtDeg(c.az)}</span>
                  <span>{azimuthName(c.az)}</span>
                </div>
                <div className="body text-sm italic" style={{ color: "#d8c89c" }}>{c.brightStars}</div>
                {verdict.note && <div className="body text-xs mt-1" style={{ color: "#8a9bb8" }}>{verdict.note}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SkyDome({ data }) {
  const W = 520, H = 520, CX = W / 2, CY = H / 2, R = 240;
  // Stereographic-ish projection: r = R * (90 - alt) / 90
  const project = (alt, az) => {
    if (alt < 0) return null;
    const r = R * (90 - alt) / 90;
    const a = (az - 90) * DEG;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "560px", margin: "0 auto", display: "block" }}>
      {/* horizon */}
      <circle cx={CX} cy={CY} r={R} fill="rgba(10,20,45,0.6)" stroke="#d4b86a" strokeWidth="1.5" />
      {/* altitude rings */}
      {[30, 60].map((alt) => (
        <circle key={alt} cx={CX} cy={CY} r={R * (90 - alt) / 90} fill="none" stroke="#d4b86a" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.4" />
      ))}
      {/* zenith */}
      <circle cx={CX} cy={CY} r="3" fill="#d4b86a" />
      <text x={CX} y={CY - 8} fontSize="9" fontFamily="JetBrains Mono" fill="#d4b86a" textAnchor="middle">ZENITH</text>
      {/* cardinal directions */}
      {[["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([dir, az]) => {
        const a = (az - 90) * DEG;
        const x = CX + (R + 14) * Math.cos(a);
        const y = CY + (R + 14) * Math.sin(a) + 4;
        return <text key={dir} x={x} y={y} fontSize="14" fontFamily="Cinzel" fill="#d4b86a" textAnchor="middle">{dir}</text>;
      })}
      {/* constellations */}
      {data.map((c) => {
        const p = project(c.alt, c.az);
        if (!p) return null;
        return (
          <g key={c.name}>
            <circle cx={p[0]} cy={p[1]} r="3" fill="#c39bff" />
            <text x={p[0] + 6} y={p[1] + 3} fontSize="9" fontFamily="Cinzel" fill="#e8d9a8" letterSpacing="1">{c.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

function constellationVerdict(c, sky, bortle, cloud) {
  if (c.alt < 0) return { rating: "DOWN", color: "#5a6a85", note: "Below horizon — wait for it to rise or check seasonal availability." };
  if (c.alt < 10) return { rating: "LOW", color: "#8a9bb8", note: "Very low altitude — atmospheric extinction will make it difficult." };
  if (sky.tw.code === "day") return { rating: "DAYTIME", color: "#5a6a85", note: "" };
  if (sky.tw.code === "civil") return { rating: "TWILIGHT", color: "#ff9b6d", note: "Only the very brightest stars visible." };
  if (cloud !== null && cloud !== undefined && cloud > 70) return { rating: "CLOUDED", color: "#ff9b6d", note: `${cloud}% cloud cover.` };
  if (bortle >= 8 && c.brightStars && !c.brightStars.match(/Sirius|Vega|Arcturus|Capella|Betelgeuse|Rigel|Aldebaran|Antares|Altair|Procyon|Deneb/)) {
    return { rating: "WASHED OUT", color: "#ff9b6d", note: "Inner-city sky — only the very brightest stars in this constellation will be visible." };
  }
  if (sky.moonBrightness > 2 && c.alt < 30) return { rating: "MOON-WASHED", color: "#ff9b6d", note: "Bright moon overwhelms low-altitude stars." };
  if (c.alt > 60) return { rating: "EXCELLENT", color: "#6dffb0", note: "High overhead — best position for viewing." };
  return { rating: "VISIBLE", color: "#d4b86a", note: "" };
}

function azimuthName(az) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(az / 22.5) % 16];
}

/* ---------- MOON & SUN TAB ---------- */
function MoonSun({ sky, curve }) {
  if (!sky) return null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel corner p-6">
          <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>Sun</div>
          <div className="grid grid-cols-2 gap-3">
            <DataCell label="Rise" value={fmtTime(sky.sunEvents.rise)} />
            <DataCell label="Set" value={fmtTime(sky.sunEvents.set)} />
            <DataCell label="Solar Noon" value={fmtTime(sky.sunEvents.transit)} sub={`alt ${fmtDeg(sky.sunEvents.maxAlt)}`} />
            <DataCell label="Current Alt" value={fmtDeg(sky.sunHz.alt)} sub={sky.tw.name} />
          </div>

          <div className="mt-4">
            <div className="mono text-xs uppercase tracking-widest mb-2" style={{ color: "#8a9bb8" }}>Twilight Phases</div>
            <TwilightTimeline twilights={sky.twilights} sunEvents={sky.sunEvents} />
          </div>
        </div>

        <div className="panel corner p-6">
          <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>Moon</div>
          <div className="flex items-center gap-6 mb-4">
            <MoonGlyph illumination={sky.phase.illumination} phaseFraction={sky.phase.phaseFraction} />
            <div>
              <div className="display gold text-xl">{moonPhaseName(sky.phase.phaseFraction)}</div>
              <div className="mono text-sm mt-1" style={{ color: "#a8b5cd" }}>
                {(sky.phase.illumination * 100).toFixed(0)}% illuminated
              </div>
              <div className="mono text-xs" style={{ color: "#8a9bb8" }}>
                age {sky.phase.ageDays.toFixed(1)} days · synodic
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DataCell label="Rise" value={fmtTime(sky.moonEvents.rise)} />
            <DataCell label="Set" value={fmtTime(sky.moonEvents.set)} />
            <DataCell label="Transit" value={fmtTime(sky.moonEvents.transit)} sub={`alt ${fmtDeg(sky.moonEvents.maxAlt)}`} />
            <DataCell label="Current Alt" value={fmtDeg(sky.moonHz.alt)} sub={sky.moonHz.alt > 0 ? "above horizon" : "below horizon"} />
          </div>
        </div>
      </div>

      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3" style={{ color: "#8a9bb8" }}>Moon Light Pollution Analysis</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="body text-sm" style={{ color: "#d8c89c" }}>
              Current sky brightening from moon: <span className="display gold text-lg">+{sky.moonBrightness.toFixed(2)} mag/arcsec²</span>
            </div>
            <div className="body text-sm mt-2" style={{ color: "#a8b5cd" }}>
              Calculated using the Krisciunas-Schaefer (1991) sky brightness model, factoring moon altitude ({fmtDeg(sky.moonHz.alt)}) and phase angle ({fmtDeg(sky.phaseAngle)}).
            </div>
            <div className="mt-3 body text-sm" style={{ color: "#a8b5cd" }}>
              <div className="mono text-xs uppercase tracking-widest mb-1 gold">Negligible-light threshold</div>
              For deep-sky and Milky Way work, the moon should be:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Below horizon (alt &lt; 0°), ideally below −5° for full darkness</li>
                <li>OR illumination &lt; 25% (waxing/waning crescent)</li>
                <li>Sky brightening should be &lt; 0.3 mag/arcsec² for serious work</li>
              </ul>
            </div>
          </div>
          <div>
            <MoonAltCurve curve={curve} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MoonGlyph({ illumination, phaseFraction }) {
  const r = 30;
  const waxing = phaseFraction < 0.5;
  // Two-arc moon illustration
  const k = 1 - 2 * illumination; // -1 (full) to +1 (new)
  return (
    <svg viewBox="-40 -40 80 80" width="80" height="80">
      <circle cx="0" cy="0" r={r} fill="#1a2a4a" stroke="#d4b86a" strokeWidth="0.5" />
      <path
        d={`M 0 ${-r} A ${r} ${r} 0 0 ${waxing ? 1 : 0} 0 ${r} A ${Math.abs(k) * r} ${r} 0 0 ${k > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0)} 0 ${-r} Z`}
        fill="#e8d9a8"
      />
      <circle cx="-8" cy="-6" r="2" fill="#0a1428" opacity="0.3" />
      <circle cx="6" cy="4" r="1.5" fill="#0a1428" opacity="0.3" />
      <circle cx="2" cy="-12" r="1" fill="#0a1428" opacity="0.3" />
    </svg>
  );
}

function TwilightTimeline({ twilights, sunEvents }) {
  const events = [
    { label: "Sunset", t: sunEvents.set, code: "set" },
    { label: "Civil End (−6°)", t: twilights.civil?.set, code: "civil" },
    { label: "Nautical End (−12°)", t: twilights.nautical?.set, code: "nautical" },
    { label: "Astro Night Begins (−18°)", t: twilights.astro?.set, code: "astro" },
    { label: "Astro Night Ends (−18°)", t: twilights.astro?.rise, code: "astro" },
    { label: "Nautical Begins (−12°)", t: twilights.nautical?.rise, code: "nautical" },
    { label: "Civil Begins (−6°)", t: twilights.civil?.rise, code: "civil" },
    { label: "Sunrise", t: sunEvents.rise, code: "rise" },
  ].filter(e => e.t).sort((a, b) => a.t - b.t);

  const colors = { set: "#ffd56a", civil: "#ff9b6d", nautical: "#6d9bff", astro: "#c39bff", rise: "#ffd56a" };

  return (
    <div className="space-y-1.5">
      {events.map((e, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className="mono text-xs" style={{ width: "60px", color: "#a8b5cd" }}>{fmtTime(e.t)}</span>
          <span style={{ width: "8px", height: "8px", background: colors[e.code], borderRadius: "50%" }} />
          <span className="body" style={{ color: "#d8c89c" }}>{e.label}</span>
        </div>
      ))}
    </div>
  );
}

function MoonAltCurve({ curve }) {
  if (!curve) return null;
  const W = 350, H = 140, P = 25;
  const xScale = (h) => P + ((h - 0) / 36) * (W - P * 2);
  const yScale = (alt) => H - P - ((alt + 30) / 120) * (H - P * 2);
  const path = curve.map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(s.h)} ${yScale(s.moonAlt)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <line x1={P} y1={yScale(0)} x2={W - P} y2={yScale(0)} stroke="#d4b86a" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.5" />
      <line x1={P} y1={yScale(-5)} x2={W - P} y2={yScale(-5)} stroke="#6dffb0" strokeWidth="0.5" strokeDasharray="1 3" opacity="0.4" />
      <text x={P} y={yScale(0) - 3} fontSize="8" fontFamily="JetBrains Mono" fill="#d4b86a" opacity="0.7">HORIZON</text>
      <text x={P} y={yScale(-5) + 9} fontSize="8" fontFamily="JetBrains Mono" fill="#6dffb0" opacity="0.6">−5° (NEGLIGIBLE LIGHT)</text>
      <path d={path} fill="none" stroke="#e8e8e8" strokeWidth="1.5" />
      {[0, 12, 24, 36].map((h) => (
        <text key={h} x={xScale(h)} y={H - 6} fontSize="8" fontFamily="JetBrains Mono" fill="#8a9bb8" textAnchor="middle">
          {((h + 12) % 24).toString().padStart(2, "0")}:00
        </text>
      ))}
      <text x={W / 2} y={12} fontSize="9" fontFamily="JetBrains Mono" fill="#8a9bb8" textAnchor="middle" letterSpacing="2">MOON ALTITUDE · NEXT 36H</text>
    </svg>
  );
}
