/* =========================================================================
   CVAN — solar-system ephemeris.
   Heliocentric and geocentric positions for Mercury–Neptune using the JPL
   "Keplerian Elements for Approximate Positions of the Major Planets"
   tables (Standish, JPL Solar System Dynamics, valid 1800–2050, accurate
   to ~30–40 arcsec for the inner planets and ~few arcmin for the outer).
   Adds phase angle, illuminated fraction, apparent magnitude (Meeus ch.41)
   and apparent angular diameter.

   All angles are degrees on the outside; radians only inside helpers.
   ========================================================================= */
import { DEG, RAD, clamp, toJulian, gmst, lst, equatorialToHorizontal, sunPosition, moonPosition, moonPhase, MOON_NEGLIGIBLE_ALT_DEG } from "./astro.js";

/* Obliquity of the J2000 ecliptic (IAU 2006, sufficient for our accuracy). */
export const OBLIQUITY_J2000_DEG = 23.43928;

/* JPL Keplerian elements, epoch J2000, with per-Julian-century linear rates.
   Columns: a (AU), e, i (deg), L (deg), ϖ (long. of perihelion, deg),
            Ω (long. of ascending node, deg).
   Earth row is actually the Earth-Moon Barycenter — adequate for planet
   geocentric positions because the Moon-Earth offset is tiny vs Δ. */
export const PLANET_ELEMENTS = {
  mercury: {
    a:  [0.38709927,  0.00000037],
    e:  [0.20563593,  0.00001906],
    i:  [7.00497902, -0.00594749],
    L:  [252.25032350, 149472.67411175],
    w:  [77.45779628,  0.16047689],
    O:  [48.33076593, -0.12534081],
  },
  venus: {
    a:  [0.72333566,  0.00000390],
    e:  [0.00677672, -0.00004107],
    i:  [3.39467605, -0.00078890],
    L:  [181.97909950, 58517.81538729],
    w:  [131.60246718, 0.00268329],
    O:  [76.67984255, -0.27769418],
  },
  earth: {
    a:  [1.00000261,  0.00000562],
    e:  [0.01671123, -0.00004392],
    i:  [-0.00001531, -0.01294668],
    L:  [100.46457166, 35999.37244981],
    w:  [102.93768193, 0.32327364],
    O:  [0.0, 0.0],
  },
  mars: {
    a:  [1.52371034,  0.00001847],
    e:  [0.09339410,  0.00007882],
    i:  [1.84969142, -0.00813131],
    L:  [-4.55343205, 19140.30268499],
    w:  [-23.94362959, 0.44441088],
    O:  [49.55953891, -0.29257343],
  },
  jupiter: {
    a:  [5.20288700, -0.00011607],
    e:  [0.04838624, -0.00013253],
    i:  [1.30439695, -0.00183714],
    L:  [34.39644051, 3034.74612775],
    w:  [14.72847983, 0.21252668],
    O:  [100.47390909, 0.20469106],
  },
  saturn: {
    a:  [9.53667594, -0.00125060],
    e:  [0.05386179, -0.00050991],
    i:  [2.48599187,  0.00193609],
    L:  [49.95424423, 1222.49362201],
    w:  [92.59887831, -0.41897216],
    O:  [113.66242448, -0.28867794],
  },
  uranus: {
    a:  [19.18916464, -0.00196176],
    e:  [0.04725744, -0.00004397],
    i:  [0.77263783, -0.00242939],
    L:  [313.23810451, 428.48202785],
    w:  [170.95427630, 0.40805281],
    O:  [74.01692503,  0.04240589],
  },
  neptune: {
    a:  [30.06992276, 0.00026291],
    e:  [0.00859048, 0.00005105],
    i:  [1.77004347, 0.00035372],
    L:  [-55.12002969, 218.45945325],
    w:  [44.96476227, -0.32241464],
    O:  [131.78422574, -0.00508664],
  },
};

/* Display metadata for each planet: order from sun, glyph, accent color
   (used by Solar System tab cards and orrery), equatorial diameter (km),
   and a base magnitude reference (Meeus ch.41 V₀ at α=0). */
export const PLANETS = [
  { key: "mercury", name: "Mercury", symbol: "☿", color: "#a89478", diamKm: 4879,    V0: -0.42 },
  { key: "venus",   name: "Venus",   symbol: "♀", color: "#e6cf8f", diamKm: 12104,   V0: -4.40 },
  { key: "earth",   name: "Earth",   symbol: "♁", color: "#5b9cf7", diamKm: 12742,   V0: null  },
  { key: "mars",    name: "Mars",    symbol: "♂", color: "#d96a3a", diamKm: 6779,    V0: -1.52 },
  { key: "jupiter", name: "Jupiter", symbol: "♃", color: "#d4b07a", diamKm: 139820,  V0: -9.40 },
  { key: "saturn",  name: "Saturn",  symbol: "♄", color: "#e9d29a", diamKm: 116460,  V0: -8.88 },
  { key: "uranus",  name: "Uranus",  symbol: "♅", color: "#8fd7e8", diamKm: 50724,   V0: -7.19 },
  { key: "neptune", name: "Neptune", symbol: "♆", color: "#4a6ff0", diamKm: 49244,   V0: -6.87 },
];

/* Normalize an angle in degrees into the range [0, 360). */
export function norm360(deg) {
  return ((deg % 360) + 360) % 360;
}

/* Normalize an angle in degrees into the range (-180, 180]. */
export function normPM180(deg) {
  const x = norm360(deg);
  return x > 180 ? x - 360 : x;
}

/* Solve Kepler's equation M = E - e·sin(E) for E (radians).
   Newton-Raphson, converges in 4–6 iterations for e < 0.3 (all major planets). */
export function solveKepler(M, e) {
  // Bring M into (-π, π] for fastest convergence
  let m = M;
  while (m > Math.PI)  m -= 2 * Math.PI;
  while (m <= -Math.PI) m += 2 * Math.PI;
  let E = m + e * Math.sin(m); // good first guess
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

/* Heliocentric J2000 ecliptic rectangular coords (AU) for a planet at JD.
   Returns {x, y, z, r, elements: {a, e, i, L, w, O, M, E, nu}} where the
   intermediates are useful for the orrery and conjunction search. */
export function heliocentric(jd, key) {
  const el = PLANET_ELEMENTS[key];
  if (!el) throw new Error(`Unknown planet: ${key}`);
  const T = (jd - 2451545.0) / 36525;

  const a = el.a[0] + el.a[1] * T;
  const e = el.e[0] + el.e[1] * T;
  const i = (el.i[0] + el.i[1] * T) * DEG;
  const L = (el.L[0] + el.L[1] * T) * DEG;
  const wbar = (el.w[0] + el.w[1] * T) * DEG;   // longitude of perihelion ϖ
  const O = (el.O[0] + el.O[1] * T) * DEG;       // longitude of ascending node Ω

  const w = wbar - O;                            // argument of perihelion ω
  let M = L - wbar;                              // mean anomaly
  // Bring M into (-π, π]
  M = Math.atan2(Math.sin(M), Math.cos(M));

  const E = solveKepler(M, e);
  // True anomaly
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
  const r = a * (1 - e * Math.cos(E));

  // Position in the orbital plane (perifocal frame)
  const xp = r * Math.cos(nu);
  const yp = r * Math.sin(nu);

  // Rotate orbital plane → J2000 ecliptic. Standard 3-1-3 Euler:
  //   R = Rz(Ω) · Rx(i) · Rz(ω)
  const cosO = Math.cos(O), sinO = Math.sin(O);
  const cosi = Math.cos(i), sini = Math.sin(i);
  const cosw = Math.cos(w), sinw = Math.sin(w);

  const x = (cosO * cosw - sinO * sinw * cosi) * xp + (-cosO * sinw - sinO * cosw * cosi) * yp;
  const y = (sinO * cosw + cosO * sinw * cosi) * xp + (-sinO * sinw + cosO * cosw * cosi) * yp;
  const z = (sinw * sini) * xp + (cosw * sini) * yp;

  return {
    x, y, z, r,
    elements: { a, e, iDeg: i * RAD, LDeg: norm360(L * RAD), wbarDeg: norm360(wbar * RAD),
                ODeg: norm360(O * RAD), MDeg: M * RAD, EDeg: E * RAD, nuDeg: nu * RAD },
  };
}

/* Ecliptic (J2000) rectangular → equatorial (J2000) rectangular. */
export function eclipticToEquatorial(x, y, z) {
  const eps = OBLIQUITY_J2000_DEG * DEG;
  return {
    x,
    y: y * Math.cos(eps) - z * Math.sin(eps),
    z: y * Math.sin(eps) + z * Math.cos(eps),
  };
}

/* Geocentric apparent position of a planet at JD.
   Returns RA/Dec (deg), geocentric distance Δ (AU), heliocentric r (AU),
   sun–planet–earth phase angle α (deg), illuminated fraction k,
   apparent magnitude V (Meeus ch.41), apparent diameter (arcsec). */
export function geocentric(jd, key) {
  if (key === "earth") return null;
  const planet = heliocentric(jd, key);
  const earth  = heliocentric(jd, "earth");

  // Geocentric ecliptic vector
  const dx = planet.x - earth.x;
  const dy = planet.y - earth.y;
  const dz = planet.z - earth.z;
  const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Light-time correction: recompute the planet's heliocentric position
  // at the retarded time (one iteration is plenty at our precision).
  const lightDays = delta * 0.005775518; // AU → light-days (1 AU = 499.0047838s)
  const planetRet = heliocentric(jd - lightDays, key);
  const rx = planetRet.x - earth.x;
  const ry = planetRet.y - earth.y;
  const rz = planetRet.z - earth.z;
  const dAU = Math.sqrt(rx * rx + ry * ry + rz * rz);

  const eq = eclipticToEquatorial(rx, ry, rz);
  let ra = Math.atan2(eq.y, eq.x) * RAD;
  if (ra < 0) ra += 360;
  const dec = Math.atan2(eq.z, Math.sqrt(eq.x * eq.x + eq.y * eq.y)) * RAD;

  // Phase angle α at the planet: angle Sun–Planet–Earth.
  // cos α = (r² + Δ² - R²) / (2 r Δ) where R = sun–earth distance.
  const r = planetRet.r;
  const R = earth.r;
  const cosA = clamp((r * r + dAU * dAU - R * R) / (2 * r * dAU), -1, 1);
  const alpha = Math.acos(cosA) * RAD;

  const illumFrac = (1 + cosA) / 2;
  const V = apparentMagnitude(key, r, dAU, alpha);
  const diamArcsec = apparentDiameterArcsec(key, dAU);

  // Ecliptic longitude of the planet as seen from Earth (used for
  // conjunction search and the orrery's geocentric view).
  let eclLon = Math.atan2(ry, rx) * RAD;
  if (eclLon < 0) eclLon += 360;
  const eclLat = Math.atan2(rz, Math.sqrt(rx * rx + ry * ry)) * RAD;

  return {
    ra, dec, delta: dAU, r,
    phaseAngleDeg: alpha, illumFrac, magnitude: V, diamArcsec,
    eclLonDeg: eclLon, eclLatDeg: eclLat,
    helio: planetRet, // for the orrery
  };
}

/* Meeus ch.41 phase functions. α in degrees. r, Δ in AU. */
export function apparentMagnitude(key, r, delta, alpha) {
  const base = 5 * Math.log10(r * delta);
  switch (key) {
    case "mercury": return -0.42 + base + 0.0380 * alpha - 0.000273 * alpha * alpha + 2e-6 * alpha * alpha * alpha;
    case "venus":   return -4.40 + base + 0.0009 * alpha + 2.39e-4 * alpha * alpha - 6.5e-7 * alpha * alpha * alpha;
    case "mars":    return -1.52 + base + 0.016  * alpha;
    case "jupiter": return -9.40 + base + 0.005  * alpha;
    /* Saturn: ring contribution requires the ring-tilt formula (Meeus ch.45).
       Phase 3 plugs in ringMagnitudeCorrection; until then use bare disk. */
    case "saturn":  return -8.88 + base;
    case "uranus":  return -7.19 + base + 0.0028 * alpha;
    case "neptune": return -6.87 + base;
    default: return NaN;
  }
}

/* Equatorial apparent diameter in arcseconds. Constants are the planet's
   diameter (arcsec) at 1 AU. Saturn here is the planet only — ring system
   is handled separately in Phase 3. */
const ARCSEC_AT_1_AU = {
  mercury:  6.74,
  venus:   16.92,
  mars:     9.36,
  jupiter: 196.94,
  saturn:  165.60,
  uranus:   65.80,
  neptune:  62.20,
};
export function apparentDiameterArcsec(key, deltaAU) {
  const k = ARCSEC_AT_1_AU[key];
  return k ? k / deltaAU : NaN;
}

/* Convenience: full sky-aware snapshot for one planet — geocentric
   equatorial + observer alt/az + a synthetic "rise/transit/set" via the
   existing astro.findEvents helper if the caller wants times.
   Returns null for Earth. */
export function planetSnapshot(jd, key, observer) {
  const geo = geocentric(jd, key);
  if (!geo) return null;
  let alt = null, az = null;
  if (observer && Number.isFinite(observer.lat) && Number.isFinite(observer.lon)) {
    const sidereal = lst(jd, observer.lon);
    const hz = equatorialToHorizontal(geo.ra, geo.dec, sidereal, observer.lat);
    alt = hz.alt; az = hz.az;
  }
  return { ...geo, alt, az };
}

/* Snapshot all planets at once. Earth is excluded from the returned list.
   Cheap enough to call every minute — ~30 µs total on a modern laptop. */
export function allPlanetSnapshots(date, observer) {
  const jd = toJulian(date);
  return PLANETS
    .filter(p => p.key !== "earth")
    .map(p => ({ ...p, snap: planetSnapshot(jd, p.key, observer) }));
}

/* Angular separation between two equatorial points (RA, Dec all in deg). */
export function angularSeparation(ra1, dec1, ra2, dec2) {
  const r1 = ra1 * DEG, d1 = dec1 * DEG;
  const r2 = ra2 * DEG, d2 = dec2 * DEG;
  const cosArc = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(r1 - r2);
  return Math.acos(clamp(cosArc, -1, 1)) * RAD;
}

/* ===== Galilean moons (Meeus ch.44, simplified — accurate to ~1 arcsec) =====
   Returns the four moons' apparent rectangular offsets from Jupiter's disc
   centre in *Jupiter radii*. +X = east on the sky, +Y = north. Edge-on view
   compressed by sin(D_E), where D_E is the planetocentric declination of
   Earth — ~0–3° for Jupiter, so moons appear nearly co-linear east-west.
   The result is for use with apparent-diameter from `geocentric()` to draw
   moons to scale next to Jupiter's disc. */
export function galileanMoons(jd) {
  const d = jd - 2443000.5;
  // Mean longitudes (deg)
  const u1 = (163.8069 + 203.4058643 * d) * DEG;
  const u2 = (358.4140 + 101.2916335 * d) * DEG;
  const u3 = (  5.7176 +  50.2345180 * d) * DEG;
  const u4 = (224.8092 +  21.4879800 * d) * DEG;

  // Semi-major axes (Jupiter radii). Meeus tables.
  const a = [5.9057, 9.3970, 14.9892, 26.3611];
  const u = [u1, u2, u3, u4];
  const names = ["Io", "Europa", "Ganymede", "Callisto"];

  // Sub-Earth latitude on Jupiter (deg). Small — slowly oscillates ±3°.
  // Approximation: D_E ≈ -1.5° * sin(2π(JD-2451545)/4332.6) (Jupiter year).
  // Sign and amplitude match Meeus tabular values to ~0.3°.
  const DE = -1.5 * Math.sin((jd - 2451545) / 4332.6 * 2 * Math.PI) * DEG;
  const sinDE = Math.sin(DE);

  return u.map((ui, i) => {
    // East-west in J_R, +east on sky
    const x = a[i] * Math.sin(ui);
    // North-south in J_R, scaled by sin(D_E)
    const y = -a[i] * Math.cos(ui) * sinDE;
    // Front/back along line of sight: -cos(u) means moon is "in front" of Jupiter
    const z = -a[i] * Math.cos(ui);
    // Behind disc when |x| < 1 AND z < 0; in front transit when |x| < 1 AND z > 0
    const behind = z < 0 && Math.abs(x) < 1 && Math.abs(y) < 1;
    const transit = z > 0 && Math.abs(x) < 1 && Math.abs(y) < 1;
    return { name: names[i], x, y, z, behind, transit };
  });
}

/* ===== Saturn ring orientation (Meeus ch.45, simplified) ==================
   Returns the saturnicentric latitudes of Earth (B) and Sun (B'), and the
   apparent flattening factor of the ring ellipse on the sky (= |sin B|).
   B sign tells which face is tilted toward us; |B| max ≈ 27° at maximum
   opening (e.g. 2017 and 2032). Edge-on ≈ 2025-03 and ~14.7 yr later. */
export const SATURN_RING_INCLINATION_DEG = 28.0744;
export const SATURN_RING_NODE_J2000_DEG = 169.531;
export const SATURN_RING_OUTER_RADII = 2.326; // outer A-ring / Saturn radius

export function saturnRingAngles(jd) {
  const eps = SATURN_RING_INCLINATION_DEG * DEG;
  const O = SATURN_RING_NODE_J2000_DEG * DEG;
  const sat = heliocentric(jd, "saturn");
  const earth = heliocentric(jd, "earth");

  // Saturn's geocentric ecliptic longitude/latitude (uncorrected, fine here).
  const dx = sat.x - earth.x, dy = sat.y - earth.y, dz = sat.z - earth.z;
  const lam = Math.atan2(dy, dx);
  const bet = Math.atan2(dz, Math.hypot(dx, dy));

  const B = Math.asin(
    Math.sin(eps) * Math.cos(bet) * Math.sin(lam - O)
    - Math.cos(eps) * Math.sin(bet)
  );

  // Sun's ecliptic position as seen from Saturn (sub-Saturn-sun direction)
  const lamS = Math.atan2(-sat.y, -sat.x);
  const betS = Math.atan2(-sat.z, Math.hypot(sat.x, sat.y));
  const Bp = Math.asin(
    Math.sin(eps) * Math.cos(betS) * Math.sin(lamS - O)
    - Math.cos(eps) * Math.sin(betS)
  );

  return {
    BDeg: B * RAD,
    BpDeg: Bp * RAD,
    flatteningFactor: Math.abs(Math.sin(B)),
    apertureDeg: Math.abs(B * RAD), // |B|: 0=edge-on, 27=max opening
    illuminatedSide: B * Bp > 0 ? "same" : "opposite",
  };
}

/* ===== Jupiter Great Red Spot transit prediction =========================
   Approximates the GRS position in Jupiter's System II rotating frame.
   The GRS drifts in longitude — the actual value is monitored by amateur
   networks (JUPOS) and changes by ~30°/yr in recent decades. We use a
   linear drift model anchored to a recent JUPOS-published value; predicted
   transit times within a few months should be accurate to ~30 minutes.

   System II rotation rate is 870.270°/day (period 9h 55m 40.632s). */
export const SYSTEM_II_RATE_DEG_PER_DAY = 870.270;
const GRS_REFERENCE_JD = 2460676.5;   // 2025-01-01 UT
const GRS_REFERENCE_LONG_II_DEG = 50; // approximate (JUPOS-style)
const GRS_DRIFT_DEG_PER_DAY = 18 / 365.25; // ~18°/yr eastward drift

export function grsSystemIILongitude(jd) {
  const driftDays = jd - GRS_REFERENCE_JD;
  return norm360(GRS_REFERENCE_LONG_II_DEG + GRS_DRIFT_DEG_PER_DAY * driftDays);
}

/* Jupiter Central Meridian longitude in System II at JD, as seen from Earth.
   Meeus-style closed form: ω_II = ω0 + 870.270° · d − 5.07033 · t (light-time
   correction). We skip the t-term (sub-degree effect) since our drift model
   is the dominant uncertainty. */
export function jupiterCMLongitudeII(jd) {
  const d = jd - 2451545.0;
  // Constant tuned so that for JD 2451545 (J2000.0), CM_II matches Meeus.
  const omega0 = 43.3;
  return norm360(omega0 + SYSTEM_II_RATE_DEG_PER_DAY * d);
}

/* Next N predicted Great Red Spot transit times after `fromJd`. A transit
   is the instant CM_II crosses L_GRS (mod 360). With slow GRS drift, the
   spacing is essentially one Jupiter System II rotation = 9.925 h. */
export function nextGRSTransits(fromJd, n = 6) {
  const out = [];
  const period = 360 / (SYSTEM_II_RATE_DEG_PER_DAY - GRS_DRIFT_DEG_PER_DAY); // days
  // Solve cm_II(jd0) = L_GRS(jd0) for jd0 ≥ fromJd
  let cm = jupiterCMLongitudeII(fromJd);
  let l  = grsSystemIILongitude(fromJd);
  // Degrees jupiter must rotate (System II) to bring GRS to CM
  let need = ((l - cm) % 360 + 360) % 360;
  const dayPerDeg = 1 / (SYSTEM_II_RATE_DEG_PER_DAY - GRS_DRIFT_DEG_PER_DAY);
  let next = fromJd + need * dayPerDeg;
  for (let i = 0; i < n; i++) {
    out.push(next);
    next += period;
  }
  return out;
}

/* JD → Date helper. */
export function jdToDate(jd) {
  return new Date((jd - 2440587.5) * 86400000);
}

/* ===== Planetary events: conjunctions, oppositions, elongations, transits ==
   All searches operate on geocentric ecliptic coordinates returned by
   `geocentric()`. Step sizes are tuned so each event is captured at least
   once before being refined. */

/* Sun's geocentric ecliptic longitude at JD (deg). Cheap — used heavily by
   event finders. */
function sunEclipticLongitude(jd) {
  const earth = heliocentric(jd, "earth");
  // Sun from Earth's perspective is opposite Earth's heliocentric vector.
  let lam = Math.atan2(-earth.y, -earth.x) * RAD;
  if (lam < 0) lam += 360;
  return lam;
}

/* Find local minima of the angular separation between two planets within
   [fromJd, fromJd+days]. Returns events {jd, sepDeg, a, b} sorted by jd.
   Coarse step 1 day, refined by parabolic interpolation near the minimum. */
export function findConjunctions(fromJd, days, opts = {}) {
  const maxSepDeg = opts.maxSepDeg ?? 5;
  const keys = (PLANETS.filter(p => p.key !== "earth")).map(p => p.key);
  const samples = Math.ceil(days);
  const out = [];

  // Pre-sample geocentric ecliptic longitudes for each planet on a 1-day grid.
  const grid = new Array(samples + 1);
  for (let i = 0; i <= samples; i++) {
    const jd = fromJd + i;
    grid[i] = {};
    for (const k of keys) {
      const g = geocentric(jd, k);
      grid[i][k] = { lon: g.eclLonDeg, lat: g.eclLatDeg, ra: g.ra, dec: g.dec };
    }
  }

  const sep = (a, b) => angularSeparation(a.ra, a.dec, b.ra, b.dec);

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i], b = keys[j];
      let prev = sep(grid[0][a], grid[0][b]);
      let prev2 = prev;
      for (let s = 1; s <= samples; s++) {
        const cur = sep(grid[s][a], grid[s][b]);
        // Detect a local minimum (prev2 > prev < cur), capture it if low enough.
        if (s >= 2 && prev < prev2 && prev < cur && prev <= maxSepDeg) {
          // Parabolic refinement around s-1
          const minJd = fromJd + (s - 1) +
            0.5 * (prev2 - cur) / (prev2 - 2 * prev + cur);
          // Recompute sep at refined instant for accuracy
          const ga = geocentric(minJd, a);
          const gb = geocentric(minJd, b);
          const refined = angularSeparation(ga.ra, ga.dec, gb.ra, gb.dec);
          out.push({ jd: minJd, sepDeg: refined, a, b });
        }
        prev2 = prev;
        prev = cur;
      }
    }
  }

  return out.sort((x, y) => x.jd - y.jd);
}

/* Wrap to (-180, 180]. */
function wrap180(deg) {
  let x = ((deg % 360) + 360) % 360;
  if (x > 180) x -= 360;
  return x;
}

/* Next opposition of a superior planet (Mars, Jupiter, Saturn, Uranus,
   Neptune). Detected as a local *minimum* of geocentric distance — outer
   planets are always closest to Earth at opposition. */
export function nextOpposition(key, fromJd, maxDays = 4 * 365) {
  if (!["mars", "jupiter", "saturn", "uranus", "neptune"].includes(key)) return null;
  const step = key === "mars" ? 3 : 6;
  const delta = (jd) => geocentric(jd, key).delta;
  let prev2 = delta(fromJd), prev = delta(fromJd + step);
  for (let s = 2 * step; s <= maxDays; s += step) {
    const jd = fromJd + s;
    const cur = delta(jd);
    if (prev < prev2 && prev < cur) {
      // Local minimum — parabolic refinement at s-step
      const denom = (prev2 - 2 * prev + cur);
      const offset = Math.abs(denom) > 1e-12 ? 0.5 * (prev2 - cur) / denom : 0;
      const jdOpp = fromJd + (s - step) + offset * step;
      const g = geocentric(jdOpp, key);
      return { jd: jdOpp, dateUTC: jdToDate(jdOpp), magnitude: g.magnitude, distanceAU: g.delta };
    }
    prev2 = prev; prev = cur;
  }
  return null;
}

/* Next greatest elongation for Mercury or Venus. `direction` is "east"
   (evening star, planet east of sun) or "west" (morning star, west of sun).
   Detected as a local maximum of signed elongation (positive = east). */
export function nextGreatestElongation(key, fromJd, direction = "east", maxDays = 400) {
  if (key !== "mercury" && key !== "venus") return null;
  const sign = direction === "east" ? +1 : -1;
  const signedElong = (jd) => {
    const g = geocentric(jd, key);
    // signed: positive when planet is east of sun on the ecliptic.
    return wrap180(g.eclLonDeg - sunEclipticLongitude(jd));
  };
  // Find local max of (sign * signedElong)
  const f = (jd) => sign * signedElong(jd);
  const step = 1;
  let prev2 = f(fromJd), prev = f(fromJd + step);
  for (let s = 2 * step; s <= maxDays; s += step) {
    const jd = fromJd + s;
    const cur = f(jd);
    if (prev > prev2 && prev > cur && prev > 0) {
      const denom = (prev2 - 2 * prev + cur);
      const offset = Math.abs(denom) > 1e-12 ? 0.5 * (prev2 - cur) / denom : 0;
      const jdMax = fromJd + (s - step) + offset * step;
      const g = geocentric(jdMax, key);
      return {
        jd: jdMax,
        dateUTC: jdToDate(jdMax),
        elongationDeg: f(jdMax),
        direction,
        magnitude: g.magnitude,
      };
    }
    prev2 = prev; prev = cur;
  }
  return null;
}

/* Next Mercury or Venus transit of the Sun.
   Step is half the planet's synodic period so we never skip an inferior
   conjunction, then refine by bisection. After each non-transit conjunction
   we jump straight to the next expected one to keep the loop short. */
export function nextSolarTransit(key, fromJd, maxYears = 130) {
  if (key !== "mercury" && key !== "venus") return null;
  const synodicDays = key === "mercury" ? 115.88 : 583.92;
  const maxDays = maxYears * 365.25;
  const f = (jd) => wrap180(geocentric(jd, key).eclLonDeg - sunEclipticLongitude(jd));

  let jd = fromJd;
  let prev = f(jd);
  let cur;
  const coarse = 5; // 5-day step is comfortably below half-synodic for both planets
  while (jd - fromJd < maxDays) {
    const next = Math.min(jd + coarse, fromJd + maxDays);
    cur = f(next);
    if (Math.sign(prev) !== Math.sign(cur) && Math.abs(prev) + Math.abs(cur) < 180) {
      // Bisect to find conjunction (excluding the wraparound discontinuity)
      let lo = jd, hi = next, flo = prev;
      for (let i = 0; i < 30; i++) {
        const mid = 0.5 * (lo + hi);
        const fm = f(mid);
        if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; }
        else { hi = mid; }
        if (hi - lo < 1e-4) break;
      }
      const jdConj = 0.5 * (lo + hi);
      const g = geocentric(jdConj, key);
      // Inferior conjunction (planet between sun and earth)
      if (g.delta < 1.0 && Math.abs(g.eclLatDeg) < 0.27) {
        return { jd: jdConj, dateUTC: jdToDate(jdConj), eclLatDeg: g.eclLatDeg, deltaAU: g.delta };
      }
      // Not a transit — skip ahead by less than half a synodic period so we
      // never overshoot the next (opposite-type) conjunction.
      jd = jdConj + synodicDays * 0.4;
      prev = f(jd);
      continue;
    }
    jd = next;
    prev = cur;
  }
  return null;
}

/* 36-hour altitude curve for a single planet at half-hour steps. Returns
   samples carrying sun + moon + planet altitudes so the chart can shade
   twilight bands and show the planet against night. */
export function planetAltitudeCurve(anchor, planetKey, lat, lon) {
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
    const planet = geocentric(jd, planetKey);
    const planetHz = equatorialToHorizontal(planet.ra, planet.dec, sidereal, lat);
    samples.push({
      t, h,
      sunAlt: sunHz.alt,
      moonAlt: moonHz.alt,
      planetAlt: planetHz.alt,
      planetAz: planetHz.az,
      magnitude: planet.magnitude,
    });
  }
  return samples;
}

/* For the helio/geo orrery: ecliptic-plane (x, y) in AU. The geocentric
   view subtracts Earth's position so the chart is observer-centered. */
export function orreryPositions(date, mode = "helio") {
  const jd = toJulian(date);
  const earth = heliocentric(jd, "earth");
  return PLANETS.map(p => {
    if (p.key === "earth") {
      if (mode === "helio") return { ...p, x: earth.x, y: earth.y, z: earth.z, r: earth.r };
      return { ...p, x: 0, y: 0, z: 0, r: 0 };
    }
    const h = heliocentric(jd, p.key);
    if (mode === "helio") return { ...p, x: h.x, y: h.y, z: h.z, r: h.r };
    return { ...p, x: h.x - earth.x, y: h.y - earth.y, z: h.z - earth.z, r: Math.hypot(h.x - earth.x, h.y - earth.y, h.z - earth.z) };
  });
}
