/* =========================================================================
   CVAN — transient-event catalog: supernovae, gravitational-wave events,
   fast radio bursts, gamma-ray bursts.

   These feeds (TNS, GraceDB, CHIME, GCN) don't have CORS-friendly JSON
   endpoints, so this is a hand-curated snapshot of recent and historic
   highlights with deep links into the canonical live trackers. The
   `liveFeeds` map at the bottom tells the UI where to send the user for
   the most up-to-date listings.
   ========================================================================= */

export const TRANSIENT_TYPES = {
  SN:  { key: "SN",  label: "Supernova",            color: "#ffd87a", description: "Stellar explosions catalogued by the Transient Name Server." },
  GW:  { key: "GW",  label: "Gravitational wave",   color: "#9fd7f7", description: "LIGO / Virgo / KAGRA merger detections logged in GraceDB." },
  FRB: { key: "FRB", label: "Fast radio burst",     color: "#d96aff", description: "Millisecond-duration radio bursts, mostly tracked by CHIME/FRB." },
  GRB: { key: "GRB", label: "Gamma-ray burst",      color: "#e64a4a", description: "Brief high-energy outbursts circulated via NASA GCN." },
};

export const TRANSIENT_EVENTS = [
  /* ---- Supernovae ---- */
  { type: "SN",  id: "SN 2023ixf",           date: "2023-05-19", ra: 210.910, dec:  54.311, peakMag:  10.8, host: "M101",                       note: "Type II in M101 (Pinwheel Galaxy) — closest core-collapse SN since 2014." },
  { type: "SN",  id: "SN 2023fyq",           date: "2023-05-22", ra: 178.940, dec:  20.580, peakMag:  16.8, host: "NGC 4388",                   note: "Pre-supernova outburst caught months before main explosion — rare progenitor study." },
  { type: "SN",  id: "SN 2024ggi",           date: "2024-04-11", ra: 174.720, dec: -32.840, peakMag:  11.0, host: "NGC 3621",                   note: "Type II within 22 Mly — extensively followed up by JWST." },
  { type: "SN",  id: "SN 2024bch",           date: "2024-01-21", ra: 192.730, dec:  13.860, peakMag:  14.5, host: "NGC 4790",                   note: "Type Ia within easy reach of amateur telescopes." },
  { type: "SN",  id: "SN 2024abfo",          date: "2024-11-04", ra: 188.020, dec:  21.490, peakMag:  15.0, host: "NGC 4274",                   note: "Type Ia in a barred spiral." },
  { type: "SN",  id: "SN 2025rbs",           date: "2025-08-15", ra:   8.140, dec:  43.030, peakMag:  16.8, host: "NGC 281 (anonymous host)",   note: "Recent unusual Type Ib-pec — heavily monitored by LCO." },

  /* ---- Gravitational waves ---- */
  { type: "GW",  id: "GW150914",             date: "2015-09-14", ra:  72.000, dec: -69.000, distMly: 1300,  source: "BBH merger (36 + 29 M☉ → 62 M☉)",     note: "First gravitational-wave detection ever. 2017 Nobel Prize." },
  { type: "GW",  id: "GW170817",             date: "2017-08-17", ra: 197.448, dec: -23.381, distMly: 130,   source: "BNS merger (kilonova in NGC 4993)",   note: "First multimessenger event: GW + GRB + kilonova." },
  { type: "GW",  id: "GW190521",             date: "2019-05-21", ra: 192.000, dec:  37.000, distMly: 17000, source: "BBH (66 + 85 → 142 M☉)",              note: "First clear intermediate-mass BH formed in a merger." },
  { type: "GW",  id: "GW230529_181500",      date: "2023-05-29", ra:  47.000, dec: -49.500, distMly: 650,   source: "NS-BH (2.5–4.5 + 1.2–2.0 M☉)",        note: "Likely first detection of a 'mass-gap' compact object merging with a NS." },
  { type: "GW",  id: "S240422ed",            date: "2024-04-22", ra: 270.000, dec:  -7.500, distMly: 220,   source: "Probable BNS — superevent in O4b",     note: "Triggered global optical / radio follow-up campaigns." },
  { type: "GW",  id: "S250220df (candidate)",date: "2025-02-20", ra: 215.000, dec:   2.000, distMly: 500,   source: "BBH candidate",                       note: "Recent O4 candidate awaiting offline analysis." },

  /* ---- Fast radio bursts ---- */
  { type: "FRB", id: "FRB 20121102A",        date: "2012-11-02", ra:  82.994, dec:  33.148, fluence: 2.0,   host: "Dwarf at z = 0.193",         note: "First repeating FRB — localized to a star-forming dwarf galaxy." },
  { type: "FRB", id: "FRB 20200120E",        date: "2020-01-20", ra: 149.480, dec:  68.820, fluence: 0.5,   host: "M81 globular cluster",       note: "Closest known FRB; in an extragalactic globular cluster." },
  { type: "FRB", id: "FRB 20220610A",        date: "2022-06-10", ra: 351.000, dec: -33.500, fluence: 45,    host: "z = 1.016 host",             note: "Brightest known FRB at the time of detection." },
  { type: "FRB", id: "FRB 20240114A",        date: "2024-01-14", ra: 322.000, dec: -26.000, fluence: 12,    host: "Dwarf host (z = 0.13)",      note: "Highly active repeater — hundreds of bursts in months following." },
  { type: "FRB", id: "FRB 20231120A",        date: "2023-11-20", ra:  45.500, dec:   1.200, fluence: 8,     host: "Unlocalized",                note: "Caught simultaneously by CHIME and KKO." },

  /* ---- Gamma-ray bursts ---- */
  { type: "GRB", id: "GRB 221009A",          date: "2022-10-09", ra: 288.270, dec:  19.770, energyErg: 1.5e55, fluence: 0.05, note: "Brightest GRB ever observed — 'BOAT' (Brightest of All Time). Possible TeV photons." },
  { type: "GRB", id: "GRB 230307A",          date: "2023-03-07", ra:  60.820, dec: -75.380, energyErg: 1.5e52, fluence: 0.06, note: "Long GRB from a NS-NS merger — kilonova detected by JWST." },
  { type: "GRB", id: "GRB 170817A",          date: "2017-08-17", ra: 197.448, dec: -23.381, energyErg: 5e46,  fluence: 2e-7,  note: "Short GRB associated with GW170817 — multimessenger gold standard." },
  { type: "GRB", id: "GRB 240625A",          date: "2024-06-25", ra: 121.500, dec:  32.000, energyErg: 4e52,  fluence: 0.002, note: "Long GRB with prompt optical detection by ULTRACAM." },
];

/* Where to send users for live, up-to-the-minute alerts. */
export const LIVE_FEEDS = {
  SN:  { name: "TNS — Transient Name Server",       url: "https://www.wis-tns.org/" },
  GW:  { name: "GraceDB — LIGO/Virgo/KAGRA",        url: "https://gracedb.ligo.org/superevents/public/O4/" },
  FRB: { name: "CHIME/FRB Public Catalog",          url: "https://www.chime-frb.ca/catalog" },
  GRB: { name: "NASA GCN — Gamma-ray Coordinates",  url: "https://gcn.nasa.gov/circulars" },
};
