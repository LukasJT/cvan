/* =========================================================================
   CVAN — comet catalog + Keplerian ephemeris (elliptic, parabolic,
   hyperbolic). All values are heliocentric J2000 ecliptic. Geocentric
   apparent RA / Dec is computed against Earth's heliocentric position
   from planets.js.

   The COMETS list is hand-curated: orbital elements are from JPL Small-Body
   Database snapshots taken near each comet's discovery / perihelion. Light
   curve parameters (H, n) follow the standard formula:
       V = H + 5·log10(Δ) + 2.5·n·log10(r)
   with Δ = geocentric distance, r = heliocentric distance, both in AU.
   ========================================================================= */
import { DEG, RAD, clamp, toJulian } from "./astro.js";
import { heliocentric, OBLIQUITY_J2000_DEG, jdToDate } from "./planets.js";

/* Hand-curated list of currently / recently notable comets. Update this
   table from JPL SBDB when a new bright comet is added. Each entry's
   `q, e, i, w, O, T` are the standard 6 orbital elements; magnitudes use
   the H / n light-curve model. */
export const COMETS = [
  {
    name: "3I/ATLAS",
    designation: "C/2025 N1",
    discovered: "2025-07-01",
    notes:
      "Third confirmed interstellar object after 1I/ʻOumuamua and 2I/Borisov. Strongly hyperbolic; passes the inner solar system once and leaves.",
    q: 1.357, e: 6.142, i: 175.11, w: 127.74, O: 322.16,
    T: 2461052.5, // ≈ 2025-10-29 perihelion
    H: 8.0, n: 4,
    color: "#9fd7f7",
  },
  {
    name: "C/2023 A3 (Tsuchinshan–ATLAS)",
    designation: "C/2023 A3",
    discovered: "2023-01-09",
    notes:
      "Major naked-eye comet of late 2024; perihelion 2024-09-27, then 13-Oct-2024 close pass to Earth at 70 million km. Faded fast after perihelion.",
    q: 0.391, e: 1.000027, i: 139.10, w: 308.49, O: 21.56,
    T: 2460580.94, // 2024-09-27 perihelion
    H: 7.0, n: 4,
    color: "#e8c878",
  },
  {
    name: "12P/Pons–Brooks",
    designation: "12P",
    discovered: "1812-07-21",
    notes:
      "Halley-type periodic comet with 71-year period. Reached mag ~4 around perihelion 21-Apr-2024. Next return ≈ 2095.",
    q: 0.781, e: 0.954, i: 74.19, w: 199.02, O: 255.85,
    T: 2460421.50, // 2024-04-21 perihelion
    H: 5.0, n: 4,
    color: "#d4b07a",
  },
  {
    name: "C/2024 G3 (ATLAS)",
    designation: "C/2024 G3",
    discovered: "2024-04-05",
    notes:
      "Kreutz-like sungrazer that survived its 13-Jan-2025 perihelion (0.094 AU). Briefly reached mag −3.8 from the Southern Hemisphere.",
    q: 0.094, e: 0.99987, i: 116.91, w: 109.43, O: 220.82,
    T: 2460688.50, // 2025-01-13 perihelion
    H: 7.6, n: 4,
    color: "#f0a040",
  },
];

const GAUSS_K = 0.01720209895; // Gaussian gravitational constant (AU^1.5/day)

/* Solve hyperbolic Kepler's equation: M = e·sinh(H) − H. */
function solveHyperbolicKepler(M, e) {
  let H = Math.log(2 * Math.abs(M) / e + 1.8) * Math.sign(M);
  for (let i = 0; i < 40; i++) {
    const f = e * Math.sinh(H) - H - M;
    const fp = e * Math.cosh(H) - 1;
    const dH = f / fp;
    H -= dH;
    if (Math.abs(dH) < 1e-12) break;
  }
  return H;
}

/* Solve elliptic Kepler's equation: M = E − e·sin(E). */
function solveEllipticKepler(M, e) {
  let E = M;
  for (let i = 0; i < 40; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

/* Heliocentric J2000 ecliptic position of a comet at JD. Returns
   {x, y, z, r, nu} (AU, AU, AU, AU, radians). Supports elliptic,
   parabolic and hyperbolic orbits. */
export function cometHeliocentric(jd, c) {
  const t = jd - c.T; // days from perihelion
  const e = c.e;
  let r, nu;

  if (Math.abs(e - 1) < 1e-3) {
    // Parabolic — solve Barker's equation:
    //   tan(ν/2)/2 + tan(ν/2)^3 / 6 = M_b,
    //   where M_b = (k/(q^1.5·√2)) · t · (3/2)
    const Mb = (GAUSS_K / Math.sqrt(2) / Math.pow(c.q, 1.5)) * t * 1.5;
    // Solve cubic ξ^3/6 + ξ/2 = M_b for ξ = tan(ν/2)
    // Closed form: ξ = ( (3M + √(9M² + 1)) )^(1/3) − (...)^(-1/3)
    const A = 3 * Mb + Math.sqrt(9 * Mb * Mb + 1);
    const B = Math.cbrt(A) - Math.cbrt(1 / A);
    nu = 2 * Math.atan(B);
    r = c.q * (1 + B * B);
  } else if (e > 1) {
    // Hyperbolic
    const a = c.q / (e - 1); // |a|
    const n = GAUSS_K / Math.sqrt(a * a * a);
    const M = n * t;
    const H = solveHyperbolicKepler(M, e);
    r = a * (e * Math.cosh(H) - 1);
    nu = 2 * Math.atan2(
      Math.sqrt(e + 1) * Math.sinh(H / 2),
      Math.sqrt(e - 1) * Math.cosh(H / 2)
    );
  } else {
    // Elliptic
    const a = c.q / (1 - e);
    const n = GAUSS_K / Math.sqrt(a * a * a);
    const M = n * t;
    const E = solveEllipticKepler(M, e);
    r = a * (1 - e * Math.cos(E));
    nu = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );
  }

  // Rotate orbital plane → J2000 ecliptic
  const w = c.w * DEG;
  const O = c.O * DEG;
  const i = c.i * DEG;
  const u = w + nu;
  const cosO = Math.cos(O), sinO = Math.sin(O);
  const cosi = Math.cos(i), sini = Math.sin(i);
  const cosu = Math.cos(u), sinu = Math.sin(u);

  const x = r * (cosO * cosu - sinO * sinu * cosi);
  const y = r * (sinO * cosu + cosO * sinu * cosi);
  const z = r * (sinu * sini);

  return { x, y, z, r, nu };
}

/* Geocentric apparent ephemeris for a comet at JD: RA / Dec, geocentric
   distance Δ, heliocentric distance r, predicted apparent magnitude. */
export function cometGeocentric(jd, c) {
  const helio = cometHeliocentric(jd, c);
  const earth = heliocentric(jd, "earth");
  const dx = helio.x - earth.x;
  const dy = helio.y - earth.y;
  const dz = helio.z - earth.z;
  const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Ecliptic → equatorial
  const eps = OBLIQUITY_J2000_DEG * DEG;
  const xe = dx;
  const ye = dy * Math.cos(eps) - dz * Math.sin(eps);
  const ze = dy * Math.sin(eps) + dz * Math.cos(eps);
  let ra = Math.atan2(ye, xe) * RAD;
  if (ra < 0) ra += 360;
  const dec = Math.atan2(ze, Math.sqrt(xe * xe + ye * ye)) * RAD;

  const r = helio.r;
  const magnitude = c.H + 5 * Math.log10(delta) + 2.5 * c.n * Math.log10(r);

  return { ra, dec, delta, r, magnitude, helio };
}

/* Days from perihelion (negative = before, positive = after). */
export function daysFromPerihelion(jd, c) {
  return jd - c.T;
}

/* Convenience snapshot for the comets list at a given Date. */
export function cometSnapshot(date, c) {
  const jd = toJulian(date);
  const g = cometGeocentric(jd, c);
  return {
    ...c,
    ...g,
    perihelionDate: jdToDate(c.T),
    daysFromPerihelion: daysFromPerihelion(jd, c),
  };
}
