/* =========================================================================
   CVAN — dwarf planets, centaurs, trans-Neptunian objects (TNOs), and the
   scale visualization of the Kuiper Belt + Oort Cloud, plus Sun-Earth
   Lagrange points.

   For each catalog body we store standard heliocentric Keplerian elements
   at J2000 (no rate terms — positions drift very slowly on multi-century
   timescales, so a static element set is adequate for an interactive
   ±~degrees precision visualization).
   ========================================================================= */
import { DEG, RAD, toJulian } from "./astro.js";
import { heliocentric, OBLIQUITY_J2000_DEG } from "./planets.js";

const J2000 = 2451545.0;
const GAUSS_K = 0.01720209895; // AU^1.5/day

/* Dwarf planets recognized by the IAU (Ceres, Pluto, Haumea, Makemake, Eris)
   plus orbital elements at J2000. M0 is the mean anomaly at J2000 in deg. */
export const DWARF_PLANETS = [
  {
    key: "ceres", name: "Ceres", H: 3.34, diamKm: 939, type: "Asteroid belt",
    a: 2.766, e: 0.07582, i: 10.594, O: 80.305, w: 73.597, M0: 95.989,
    color: "#a89478", discovered: "1801-01-01",
    notes: "Largest object in the asteroid belt. Visited by NASA Dawn (2015-2018).",
  },
  {
    key: "pluto", name: "Pluto", H: -0.45, diamKm: 2376, type: "Kuiper belt (plutino)",
    a: 39.482, e: 0.2488, i: 17.16, O: 110.299, w: 113.834, M0: 14.53,
    color: "#c8a890", discovered: "1930-02-18",
    notes: "In 2:3 mean-motion resonance with Neptune. Visited by New Horizons (2015).",
  },
  {
    key: "haumea", name: "Haumea", H: 0.17, diamKm: 1632, type: "Kuiper belt",
    a: 43.13, e: 0.1912, i: 28.21, O: 121.79, w: 240.20, M0: 205.42,
    color: "#d8d2c8", discovered: "2004-12-28",
    notes: "Elongated shape, fast 4-hour rotation. Has a faint ring discovered in 2017.",
  },
  {
    key: "makemake", name: "Makemake", H: -0.20, diamKm: 1430, type: "Kuiper belt",
    a: 45.43, e: 0.1559, i: 29.00, O: 79.36, w: 297.27, M0: 160.42,
    color: "#b87a5e", discovered: "2005-03-31",
    notes: "Methane-rich surface. One known moon (MK2, 2016).",
  },
  {
    key: "eris", name: "Eris", H: -1.21, diamKm: 2326, type: "Scattered disc",
    a: 67.78, e: 0.4377, i: 44.04, O: 35.95, w: 151.64, M0: 205.99,
    color: "#dcd0b0", discovered: "2005-01-05",
    notes: "Discovery in 2005 triggered the dwarf-planet category. Currently near aphelion.",
  },
];

/* Centaurs — small bodies on planet-crossing orbits between Jupiter and
   Neptune; transitional between the Kuiper belt and short-period comets. */
export const CENTAURS = [
  {
    key: "chiron", name: "2060 Chiron", H: 6.5, diamKm: 218, type: "Centaur",
    a: 13.650, e: 0.382, i: 6.93, O: 209.36, w: 339.66, M0: 109.7,
    color: "#a0a0d0", discovered: "1977-11-01",
    notes: "First centaur discovered. Shows occasional cometary activity.",
  },
  {
    key: "chariklo", name: "10199 Chariklo", H: 6.4, diamKm: 250, type: "Centaur (ringed)",
    a: 15.844, e: 0.172, i: 23.35, O: 300.40, w: 242.13, M0: 121.8,
    color: "#d0b090", discovered: "1997-02-15",
    notes: "Largest known centaur. First non-planet found with rings (2014).",
  },
  {
    key: "pholus", name: "5145 Pholus", H: 7.0, diamKm: 99, type: "Centaur",
    a: 20.270, e: 0.573, i: 24.71, O: 119.42, w: 354.96, M0: 73.7,
    color: "#c08868", discovered: "1992-01-09",
    notes: "Very red surface, suggesting primitive organic compounds.",
  },
];

/* Trans-Neptunian objects (notable individual TNOs and detached objects). */
export const TNOS = [
  {
    key: "sedna", name: "Sedna (90377)", H: 1.83, diamKm: 995, type: "Detached / inner Oort?",
    a: 525.86, e: 0.8496, i: 11.93, O: 144.31, w: 311.46, M0: 358.30,
    color: "#a8543c", discovered: "2003-11-14",
    notes: "Extreme orbit (aphelion ~937 AU). Possible inner-Oort cloud member.",
  },
  {
    key: "quaoar", name: "Quaoar (50000)", H: 2.4, diamKm: 1110, type: "TNO (cubewano)",
    a: 43.394, e: 0.0394, i: 7.99, O: 188.83, w: 159.42, M0: 273.8,
    color: "#b0a890", discovered: "2002-06-04",
    notes: "Has rings outside its Roche limit. Moon Weywot.",
  },
  {
    key: "orcus", name: "Orcus (90482)", H: 2.27, diamKm: 910, type: "TNO (plutino)",
    a: 39.358, e: 0.227, i: 20.59, O: 268.45, w: 73.20, M0: 181.4,
    color: "#9090a8", discovered: "2004-02-17",
    notes: "Plutino in 2:3 resonance with Neptune. Moon Vanth.",
  },
  {
    key: "gonggong", name: "Gonggong (225088)", H: 1.6, diamKm: 1230, type: "TNO (scattered disc)",
    a: 67.485, e: 0.500, i: 30.71, O: 336.84, w: 207.61, M0: 105.3,
    color: "#a86848", discovered: "2007-07-17",
    notes: "Methane on surface. Currently near aphelion at ~89 AU.",
  },
];

function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

/* Heliocentric J2000 ecliptic rectangular position for any catalog body. */
export function smallBodyHeliocentric(jd, body) {
  const n = GAUSS_K / Math.sqrt(body.a * body.a * body.a); // rad/day
  const dt = jd - J2000;
  let M = (body.M0 * DEG + n * dt) % (2 * Math.PI);
  if (M < 0) M += 2 * Math.PI;
  if (M > Math.PI) M -= 2 * Math.PI;
  const e = body.e;
  const E = solveKepler(M, e);
  const r = body.a * (1 - e * Math.cos(E));
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );

  const w = body.w * DEG;
  const O = body.O * DEG;
  const i = body.i * DEG;
  const u = w + nu;
  const cosO = Math.cos(O), sinO = Math.sin(O);
  const cosi = Math.cos(i), sini = Math.sin(i);
  const cosu = Math.cos(u), sinu = Math.sin(u);

  return {
    x: r * (cosO * cosu - sinO * sinu * cosi),
    y: r * (sinO * cosu + cosO * sinu * cosi),
    z: r * (sinu * sini),
    r,
  };
}

/* Geocentric RA/Dec/Δ/r + apparent magnitude. */
export function smallBodyGeocentric(jd, body) {
  const helio = smallBodyHeliocentric(jd, body);
  const earth = heliocentric(jd, "earth");
  const dx = helio.x - earth.x;
  const dy = helio.y - earth.y;
  const dz = helio.z - earth.z;
  const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const eps = OBLIQUITY_J2000_DEG * DEG;
  const xe = dx;
  const ye = dy * Math.cos(eps) - dz * Math.sin(eps);
  const ze = dy * Math.sin(eps) + dz * Math.cos(eps);
  let ra = Math.atan2(ye, xe) * RAD;
  if (ra < 0) ra += 360;
  const dec = Math.atan2(ze, Math.sqrt(xe * xe + ye * ye)) * RAD;
  const r = helio.r;
  // Distant bodies have ~zero phase angle correction; magnitude is purely
  // the inverse-square law.
  const magnitude = body.H + 5 * Math.log10(r * delta);
  return { ra, dec, delta, r, magnitude, helio };
}

/* Convenience snapshot at a given Date. Period is in years via Kepler 3. */
export function smallBodySnapshot(date, body) {
  const jd = toJulian(date);
  const g = smallBodyGeocentric(jd, body);
  return {
    ...body,
    ...g,
    periodYears: Math.pow(body.a, 1.5),
    aphelion: body.a * (1 + body.e),
    perihelion: body.a * (1 - body.e),
  };
}

/* Sun-Earth Lagrange points. L1, L2 use the Hill-sphere approximation
   r_h = (M_earth / (3 M_sun))^(1/3) ≈ 0.01001 AU. */
export const SUN_EARTH_HILL_AU = 0.01001;

export const LAGRANGE_POINTS = [
  {
    key: "L1", name: "Sun-Earth L1", distanceFromEarthAU: SUN_EARTH_HILL_AU,
    description: "Between Sun and Earth, ~1.5 million km sunward. Continuous solar view.",
    spacecraft: ["SOHO (1995-)", "ACE (1997-)", "DSCOVR (2015-)", "Wind (1994-, halo)", "Aditya-L1 (2024-)"],
    color: "#ffd87a",
  },
  {
    key: "L2", name: "Sun-Earth L2", distanceFromEarthAU: SUN_EARTH_HILL_AU,
    description: "Anti-sun side of Earth, ~1.5 million km out. Stable cold environment for IR.",
    spacecraft: ["JWST (2022-)", "Gaia (2014-)", "Euclid (2023-)", "Spektr-RG (2019-)", "Planck †", "Herschel †", "WMAP †"],
    color: "#8fd7e8",
  },
  {
    key: "L3", name: "Sun-Earth L3", distanceFromEarthAU: 2.0,
    description: "Opposite side of the Sun from Earth. Permanently hidden — no active missions.",
    spacecraft: [],
    color: "#888899",
  },
  {
    key: "L4", name: "Sun-Earth L4", distanceFromEarthAU: 1.0,
    description: "Leads Earth by 60° in orbit. Hosts Earth trojan asteroids (2010 TK7, 2020 XL5).",
    spacecraft: ["STEREO-A (passed through)", "Asteroid 2010 TK7", "Asteroid 2020 XL5"],
    color: "#a0d49a",
  },
  {
    key: "L5", name: "Sun-Earth L5", distanceFromEarthAU: 1.0,
    description: "Trails Earth by 60°. Symmetric counterpart of L4.",
    spacecraft: ["STEREO-B (lost 2014)", "Spektr-UF (planned)"],
    color: "#d4a0d0",
  },
];

/* Heliocentric L1-L5 position in AU (Earth-centered Sun-Earth rotating frame
   projected to J2000 ecliptic). Earth's instantaneous position drives the
   orientation, so the points rotate with Earth around the Sun. */
export function lagrangePositions(jd) {
  const earth = heliocentric(jd, "earth");
  // Unit vector from Sun to Earth (ecliptic plane only — z near zero).
  const eR = Math.hypot(earth.x, earth.y);
  const ux = earth.x / eR;
  const uy = earth.y / eR;
  // Perpendicular in-plane unit vector (90° CCW)
  const vx = -uy;
  const vy = ux;

  const L1Dist = eR - SUN_EARTH_HILL_AU;
  const L2Dist = eR + SUN_EARTH_HILL_AU;
  const L3Dist = eR; // opposite side
  const L4_5R = eR; // same orbital radius

  // L4 leads Earth by 60° (cos 60 along u, sin 60 along v)
  const cos60 = 0.5, sin60 = Math.sqrt(3) / 2;

  return {
    L1: { x: ux * L1Dist, y: uy * L1Dist, z: 0 },
    L2: { x: ux * L2Dist, y: uy * L2Dist, z: 0 },
    L3: { x: -ux * L3Dist, y: -uy * L3Dist, z: 0 },
    L4: { x: L4_5R * (cos60 * ux - sin60 * vx), y: L4_5R * (cos60 * uy - sin60 * vy), z: 0 },
    L5: { x: L4_5R * (cos60 * ux + sin60 * vx), y: L4_5R * (cos60 * uy + sin60 * vy), z: 0 },
  };
}

/* Log-scale annotations for the Kuiper / Oort scale visualization, in AU.
   Used by the Outer Solar System tab to lay out a horizontal radial axis. */
export const SOLAR_SYSTEM_SCALE_AU = [
  { value: 0.39,    label: "Mercury",                        kind: "planet" },
  { value: 1.0,     label: "Earth",                          kind: "planet" },
  { value: 5.20,    label: "Jupiter",                        kind: "planet" },
  { value: 30.07,   label: "Neptune",                        kind: "planet" },
  { value: 30,      label: "Kuiper belt inner edge",         kind: "boundary" },
  { value: 50,      label: "Kuiper belt outer edge",         kind: "boundary" },
  { value: 100,     label: "Heliopause (Voyager 1, 2012)",   kind: "boundary" },
  { value: 525,     label: "Sedna (mean distance)",          kind: "object" },
  { value: 1000,    label: "Sedna aphelion ≈ 937 AU",        kind: "object" },
  { value: 2000,    label: "Hills (inner Oort) cloud begins", kind: "boundary" },
  { value: 20000,   label: "Hills cloud outer edge",         kind: "boundary" },
  { value: 100000,  label: "Outer Oort cloud · gravitational influence ends", kind: "boundary" },
  { value: 268770,  label: "Proxima Centauri (4.246 ly)",    kind: "interstellar" },
];
