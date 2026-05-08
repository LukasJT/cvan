/* =========================================================================
   CVAN — astronomy core. All client-side, no external deps.
   References (see src/components/Sources.jsx for full citations):
   - Meeus, Astronomical Algorithms, 2nd ed., 1998
   - NOAA SPA solar position algorithm
   - Krisciunas & Schaefer 1991 (PASP 103, 1033) — moon sky brightness
   - IGRF-13 dipole approximation for geomagnetic coords
   - NOAA SWPC Kp/auroral oval model (KP_VIEW_LAT)
   - Bortle 2001 — Bortle dark-sky scale class definitions (BORTLE table)
   ========================================================================= */
export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function toJulian(date) {
  return date.getTime() / 86400000 + 2440587.5;
}
export function julianCentury(jd) {
  return (jd - 2451545.0) / 36525;
}
export function gmst(jd) {
  const T = julianCentury(jd);
  let g =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  g = ((g % 360) + 360) % 360;
  return g;
}
export function lst(jd, lonDeg) {
  return ((gmst(jd) + lonDeg) % 360 + 360) % 360;
}

export function sunPosition(jd) {
  const n = jd - 2451545.0;
  const L = ((280.460 + 0.9856474 * n) % 360 + 360) % 360;
  const g = (((357.528 + 0.9856003 * n) % 360 + 360) % 360) * DEG;
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG;
  const eps = (23.439 - 0.0000004 * n) * DEG;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  return { ra: ra * RAD, dec: dec * RAD, lambda: lambda * RAD };
}

export function moonPosition(jd) {
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

export function equatorialToHorizontal(raDeg, decDeg, lstDeg, latDeg) {
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

export function moonPhase(jd) {
  const sun = sunPosition(jd);
  const moon = moonPosition(jd);
  const sR = sun.ra * DEG, sD = sun.dec * DEG;
  const mR = moon.ra * DEG, mD = moon.dec * DEG;
  const cosElong = Math.sin(sD) * Math.sin(mD) + Math.cos(sD) * Math.cos(mD) * Math.cos(sR - mR);
  const elong = Math.acos(clamp(cosElong, -1, 1));
  const phase = (1 - Math.cos(elong)) / 2;
  const synodic = 29.530588;
  const refNew = 2451550.1; // Jan 6 2000 new moon (Meeus §49)
  const age = ((jd - refNew) % synodic + synodic) % synodic;
  return { illumination: phase, ageDays: age, phaseFraction: age / synodic };
}

export function moonPhaseName(frac) {
  if (frac < 0.03 || frac > 0.97) return "New Moon";
  if (frac < 0.22) return "Waxing Crescent";
  if (frac < 0.28) return "First Quarter";
  if (frac < 0.47) return "Waxing Gibbous";
  if (frac < 0.53) return "Full Moon";
  if (frac < 0.72) return "Waning Gibbous";
  if (frac < 0.78) return "Last Quarter";
  return "Waning Crescent";
}

export function findEvents(date, lat, lon, bodyFn, h0Deg = -0.833) {
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

export function twilightClass(sunAlt) {
  if (sunAlt > -0.833) return { name: "Daylight", code: "day" };
  if (sunAlt > -6) return { name: "Civil Twilight", code: "civil" };
  if (sunAlt > -12) return { name: "Nautical Twilight", code: "nautical" };
  if (sunAlt > -18) return { name: "Astronomical Twilight", code: "astro" };
  return { name: "Astronomical Night", code: "night" };
}

/* Krisciunas–Schaefer (1991) moon sky brightness, simplified.
   Returns delta-V (mag/arcsec²) sky brightening at zenith. Threshold for
   "negligible moonlight" is delta-V < ~0.1 mag, which corresponds to the
   moon being below roughly −5° altitude (refraction-corrected). */
export const MOON_NEGLIGIBLE_ALT_DEG = -5;

export function moonSkyBrightness(moonAltDeg, phaseAngleDeg) {
  if (moonAltDeg <= MOON_NEGLIGIBLE_ALT_DEG) return 0;
  const phaseFactor = Math.pow(10, -0.4 * (0.026 * Math.abs(phaseAngleDeg) + 4e-9 * Math.pow(phaseAngleDeg, 4)));
  const altFactor = Math.sin(Math.max(0, moonAltDeg) * DEG);
  return 3.0 * phaseFactor * altFactor;
}

export const BORTLE = [
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

/* NOAA SWPC: equatorward extent of auroral oval vs Kp (geomagnetic latitude). */
export const KP_VIEW_LAT = {
  0: 67, 1: 66, 2: 65, 3: 63, 4: 60, 5: 56, 6: 54, 7: 52, 8: 50, 9: 48,
};

export const CONSTELLATIONS = [
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

export const GALACTIC_CORE = { ra: 266.4, dec: -29.0 };

/* IGRF-13 geomagnetic north pole, epoch 2025 (NCEI). Drifts ~10 km/yr;
   the dipole approximation is good to ~3° magnetic latitude — adequate
   for aurora visibility, where the equatorward boundary shifts ~3° per Kp. */
export const GEOMAG_POLE = { lat: 80.65, lon: -72.68 };

export function geomagneticLatitude(latDeg, lonDeg) {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const pLat = GEOMAG_POLE.lat * DEG;
  const pLon = GEOMAG_POLE.lon * DEG;
  const sinMagLat =
    Math.sin(lat) * Math.sin(pLat) +
    Math.cos(lat) * Math.cos(pLat) * Math.cos(lon - pLon);
  return Math.asin(clamp(sinMagLat, -1, 1)) * RAD;
}

/* Convert (geomag lat, geomag lon) → (geographic lat, geographic lon).
   Inverse of geomagneticLatitude using the dipole spherical rotation. */
export function geomagneticToGeographic(magLatDeg, magLonDeg) {
  const mLat = magLatDeg * DEG;
  const mLon = magLonDeg * DEG;
  const pLat = GEOMAG_POLE.lat * DEG;
  const pLon = GEOMAG_POLE.lon * DEG;
  // Treat the geomagnetic pole as the "north pole" of a rotated sphere.
  const sinLat =
    Math.sin(mLat) * Math.sin(pLat) +
    Math.cos(mLat) * Math.cos(pLat) * Math.cos(mLon);
  const lat = Math.asin(clamp(sinLat, -1, 1));
  const y = Math.cos(mLat) * Math.sin(mLon);
  const x = Math.sin(mLat) * Math.cos(pLat) - Math.cos(mLat) * Math.sin(pLat) * Math.cos(mLon);
  const lonOffset = Math.atan2(y, x);
  let lon = pLon + lonOffset;
  lon = ((lon * RAD + 540) % 360) - 180;
  return { lat: lat * RAD, lon };
}

/* Open-Meteo returns hourly timestamps as "YYYY-MM-DDTHH:MM" with no TZ marker;
   they represent the LOCATION's local wall-clock (when fetched with timezone=auto).
   Parse them as a UTC instant by reversing the location's UTC offset. */
export function parseLocationTime(ts, utcOffsetSec) {
  const [datePart, timePart] = ts.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = (timePart || "00:00").split(":").map(Number);
  return Date.UTC(y, mo - 1, d, h, mi || 0, 0) - (utcOffsetSec || 0) * 1000;
}

/* Construct a Date for "wall-clock at location" given an anchor instant. */
export function dateAtLocationWallClock(anchor, utcOffsetSec, hh, mm = 0) {
  const offsetMs = (utcOffsetSec || 0) * 1000;
  const locAnchor = new Date(anchor.getTime() + offsetMs);
  const yy = locAnchor.getUTCFullYear();
  const mo = locAnchor.getUTCMonth();
  const dd = locAnchor.getUTCDate();
  return new Date(Date.UTC(yy, mo, dd, hh, mm, 0) - offsetMs);
}

export const fmtTime = (d) => {
  if (!d) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
export const fmtDeg = (n, p = 1) => `${n.toFixed(p)}°`;

export function azimuthName(az) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(az / 22.5) % 16];
}

/* Compute a 36-hour altitude curve (sun, moon, MW core) at half-hour steps.
   `start` defaults to noon of `anchor` (so the night is centered in the window). */
export function altitudeCurve(anchor, lat, lon) {
  const start = new Date(anchor);
  start.setHours(12, 0, 0, 0);
  const samples = [];
  for (let h = 0; h <= 36; h += 0.5) {
    const t = new Date(start.getTime() + h * 3600000);
    const jd = toJulian(t);
    const sun = sunPosition(jd);
    const moon = moonPosition(jd);
    const sidereal = lst(jd, lon);
    const sunHz = equatorialToHorizontal(sun.ra, sun.dec, sidereal, lat);
    const moonHz = equatorialToHorizontal(moon.ra, moon.dec, sidereal, lat);
    const coreHz = equatorialToHorizontal(GALACTIC_CORE.ra, GALACTIC_CORE.dec, sidereal, lat);
    const phase = moonPhase(jd);
    const phaseAngle = Math.acos(2 * phase.illumination - 1) * RAD;
    samples.push({
      t, h,
      sunAlt: sunHz.alt,
      moonAlt: moonHz.alt,
      coreAlt: coreHz.alt,
      moonIllum: phase.illumination,
      moonBrightness: moonSkyBrightness(moonHz.alt, phaseAngle),
    });
  }
  return samples;
}

/* Compute a per-day "best window" from a 36h altitude curve.
   Returns { bestStart, bestEnd, peakCoreAlt, peakTime } for the window where
   sun < -18°, moon below the negligible threshold, core above 10°. */
export function bestNightWindow(curve) {
  if (!curve) return null;
  let bestStart = null, bestEnd = null, peakCoreAlt = -90, peakTime = null;
  let inWindow = false;
  for (const s of curve) {
    const ok = s.sunAlt < -18 && s.moonAlt < MOON_NEGLIGIBLE_ALT_DEG && s.coreAlt > 10;
    if (ok) {
      if (!inWindow) { bestStart = s.t; inWindow = true; }
      bestEnd = s.t;
      if (s.coreAlt > peakCoreAlt) { peakCoreAlt = s.coreAlt; peakTime = s.t; }
    } else if (inWindow) {
      inWindow = false;
    }
  }
  return bestStart ? { bestStart, bestEnd, peakCoreAlt, peakTime } : null;
}

/* Composite visibility score 0-100 — agrees with original heuristic but
   takes explicit cloud cover (or null) so callers can score forecast hours. */
export function compositeScore({ sky, cloud, bortle }) {
  let s = 100;
  if (sky.tw.code === "day") s -= 100;
  else if (sky.tw.code === "civil") s -= 50;
  else if (sky.tw.code === "nautical") s -= 25;
  else if (sky.tw.code === "astro") s -= 10;
  s -= (bortle - 1) * 7;
  s -= sky.moonBrightness * 8;
  if (cloud != null) s -= cloud * 0.4;
  return clamp(Math.round(s), 0, 100);
}

/* Predict the next time the Milky Way core will be observable within a
   given horizon (hours). Returns the first sample where conditions align. */
export function predictNextMilkyWayWindow(curve, bortle, hourHorizon = 12) {
  if (!curve || bortle >= 7) return null;
  const cutoff = new Date(curve[0].t.getTime() + hourHorizon * 3600000);
  for (const s of curve) {
    if (s.t > cutoff) break;
    if (
      s.sunAlt < -12 &&
      s.coreAlt > 10 &&
      s.moonAlt < MOON_NEGLIGIBLE_ALT_DEG
    ) {
      return { start: s.t, coreAlt: s.coreAlt };
    }
  }
  return null;
}
