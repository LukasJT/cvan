/* =========================================================================
   CVAN — NASA public-API wrappers (no auth beyond DEMO_KEY).

   * NeoWs — Near-Earth Object close-approach feed (PHA flag, magnitudes,
              estimated sizes, miss distance, relative velocity).
   * Mars Photos — per-rover info + latest images.

   All endpoints are CORS-friendly. DEMO_KEY allows 30 req/hour and 50/day
   shared across the caller's IP, which is plenty for our refresh cadence.
   ========================================================================= */

const NASA_API_KEY = "DEMO_KEY";
const NEO_BASE = "https://api.nasa.gov/neo/rest/v1";
const MARS_BASE = "https://api.nasa.gov/mars-photos/api/v1";

/* Format a Date as YYYY-MM-DD for NASA API params. */
function ymd(d) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* NEO close-approach feed for a 1- to 7-day window (API limit). Returns a
   flat array of NEO objects ordered by closest approach time. */
export async function fetchNeoFeed(startDate, endDate) {
  const start = ymd(startDate);
  const end = ymd(endDate);
  const url = `${NEO_BASE}/feed?start_date=${start}&end_date=${end}&api_key=${NASA_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NeoWs ${res.status}`);
  const data = await res.json();
  const out = [];
  for (const day of Object.keys(data.near_earth_objects).sort()) {
    for (const neo of data.near_earth_objects[day]) {
      const ca = neo.close_approach_data?.[0];
      if (!ca) continue;
      const dMin = neo.estimated_diameter.meters.estimated_diameter_min;
      const dMax = neo.estimated_diameter.meters.estimated_diameter_max;
      out.push({
        id: neo.id,
        name: neo.name,
        nameShort: neo.name.replace(/[()]/g, "").trim(),
        magnitudeH: neo.absolute_magnitude_h,
        diamMinM: dMin,
        diamMaxM: dMax,
        diamMidM: (dMin + dMax) / 2,
        isPHA: !!neo.is_potentially_hazardous_asteroid,
        isSentry: !!neo.is_sentry_object,
        approachTime: new Date(ca.epoch_date_close_approach),
        approachStr: ca.close_approach_date_full || ca.close_approach_date,
        missDistanceAU: parseFloat(ca.miss_distance.astronomical),
        missDistanceLunar: parseFloat(ca.miss_distance.lunar),
        missDistanceKm: parseFloat(ca.miss_distance.kilometers),
        velocityKps: parseFloat(ca.relative_velocity.kilometers_per_second),
        jplUrl: neo.nasa_jpl_url,
        orbitingBody: ca.orbiting_body,
      });
    }
  }
  return out.sort((a, b) => a.approachTime - b.approachTime);
}

/* Lookup a single NEO for richer orbit / sentry / close-approach history. */
export async function fetchNeoById(id) {
  const res = await fetch(`${NEO_BASE}/neo/${id}?api_key=${NASA_API_KEY}`);
  if (!res.ok) throw new Error(`NeoWs lookup ${res.status}`);
  return res.json();
}

/* Mars rover metadata (status, total photos, max sol, cameras). */
export async function fetchRoverInfo(rover) {
  const res = await fetch(`${MARS_BASE}/rovers/${rover}?api_key=${NASA_API_KEY}`);
  if (!res.ok) throw new Error(`Rover info ${res.status}`);
  const data = await res.json();
  return data.rover;
}

/* Latest photos posted by a rover (regardless of sol). */
export async function fetchRoverLatestPhotos(rover) {
  const res = await fetch(`${MARS_BASE}/rovers/${rover}/latest_photos?api_key=${NASA_API_KEY}`);
  if (!res.ok) throw new Error(`Mars photos ${res.status}`);
  const data = await res.json();
  return data.latest_photos ?? [];
}

/* Stable rover-by-rover catalog. Landing coordinates are areocentric
   (planetographic) in degrees. Status is current as of the last update;
   "active" rovers continue returning data. */
export const MARS_ROVERS = [
  {
    key: "perseverance",
    name: "Perseverance",
    operator: "NASA",
    status: "active",
    landingDate: "2021-02-18",
    landingSite: "Jezero Crater",
    lat: 18.4447,
    lon: 77.4509,
    color: "#e36b3a",
    missionSummary: "Astrobiology and Mars Sample Return cache. Carries the Ingenuity helicopter (now retired).",
  },
  {
    key: "curiosity",
    name: "Curiosity",
    operator: "NASA",
    status: "active",
    landingDate: "2012-08-06",
    landingSite: "Gale Crater (Bradbury Landing)",
    lat: -4.5895,
    lon: 137.4417,
    color: "#d9a25b",
    missionSummary: "Mobile geochemistry lab assessing past habitability; climbing Mt Sharp.",
  },
  {
    key: "zhurong",
    name: "Zhurong",
    operator: "CNSA",
    status: "inactive",
    landingDate: "2021-05-15",
    landingSite: "Utopia Planitia",
    lat: 25.066,
    lon: 109.926,
    color: "#e44a4a",
    missionSummary: "First Chinese Mars rover. Hibernation in May 2022; not restored. Drove ~1.9 km.",
  },
  {
    key: "opportunity",
    name: "Opportunity",
    operator: "NASA",
    status: "ended",
    landingDate: "2004-01-25",
    landingSite: "Meridiani Planum (Endeavour Crater)",
    lat: -1.9462,
    lon: 354.4734,
    color: "#a0c4ff",
    missionSummary: "Lost to global dust storm June 2018 after 14+ years and 45 km of travel.",
  },
  {
    key: "spirit",
    name: "Spirit",
    operator: "NASA",
    status: "ended",
    landingDate: "2004-01-04",
    landingSite: "Gusev Crater",
    lat: -14.5684,
    lon: 175.4729,
    color: "#8ad7d1",
    missionSummary: "Stuck in soft soil May 2009; last contact March 2010 after 6 years.",
  },
];

/* Roman number for sol display in the rover panel — small touch but the
   sol counts have gotten so large they're hard to read at a glance. */
export function shortSol(sol) {
  if (sol == null) return "—";
  if (sol >= 10000) return `${(sol / 1000).toFixed(1)}k`;
  return sol.toString();
}
