/* =========================================================================
   CVAN — exotic-object catalogs: pulsars, black holes, Local Group galaxies.

   Hand-curated subsets emphasizing the historically and observationally
   important objects (firsts, brightest, closest, most massive). Positions
   are J2000.0. Pulsar periods are in milliseconds. Black-hole masses are
   in solar masses with the distance in light-years for galactic objects
   and Mly for the extragalactic supermassives. Local Group distances are
   Mly (1 Mly = 1e6 light-years).
   ========================================================================= */

/* ---- Pulsars ---- */
export const PULSAR_CLASSES = {
  rotation: { key: "rotation", label: "Rotation-powered",     color: "#9fd7f7" },
  msp:      { key: "msp",      label: "Millisecond",          color: "#ffd87a" },
  magnetar: { key: "magnetar", label: "Magnetar",             color: "#e64a4a" },
  binary:   { key: "binary",   label: "Binary / accretion",   color: "#d96a3a" },
  silent:   { key: "silent",   label: "Radio-quiet / gamma",  color: "#a0a0c0" },
};

export const PULSARS = [
  { id: "Crab",            jname: "J0534+2200", class: "rotation", ra:  83.633, dec:  22.014, periodMs:   33.39,  distLY:   6500, note: "Remnant of SN 1054 (M1). Discovered 1968." },
  { id: "Vela",            jname: "J0835-4510", class: "rotation", ra: 128.836, dec: -45.176, periodMs:   89.36,  distLY:    900, note: "Brightest gamma-ray source in the sky." },
  { id: "Geminga",         jname: "J0633+1746", class: "silent",   ra:  98.476, dec:  17.770, periodMs:  237.10,  distLY:    815, note: "Closest known pulsar; radio-quiet, gamma-bright." },
  { id: "PSR B1937+21",    jname: "J1939+2134", class: "msp",      ra: 294.911, dec:  21.583, periodMs:    1.558, distLY:  11400, note: "First millisecond pulsar discovered (1982)." },
  { id: "PSR B1257+12",    jname: "J1300+1240", class: "msp",      ra: 195.014, dec:  12.683, periodMs:    6.219, distLY:   2300, note: "Hosts the first confirmed exoplanets (1992)." },
  { id: "Hulse-Taylor",    jname: "J1915+1606", class: "binary",   ra: 288.866, dec:  16.114, periodMs:   59.03,  distLY:  21000, note: "Double-neutron-star binary; 1993 Nobel for GR test." },
  { id: "PSR J0437-4715",  jname: "J0437-4715", class: "msp",      ra:  69.317, dec: -47.253, periodMs:    5.757, distLY:    510, note: "Closest millisecond pulsar; brightest in radio." },
  { id: "PSR J0740+6620",  jname: "J0740+6620", class: "msp",      ra: 115.190, dec:  66.347, periodMs:    2.886, distLY:   4600, note: "Heaviest known NS (2.08 ± 0.07 M☉)." },
  { id: "SGR 1806-20",     jname: "J1808-2024", class: "magnetar", ra: 272.158, dec: -20.412, periodMs: 7548.10,  distLY:  28500, note: "Magnetar — 2004 giant flare detected across solar system." },
  { id: "Fast Radio Burst home (FRB 121102)", jname: "FRB 121102", class: "magnetar", ra: 82.994, dec: 33.148, periodMs: 0, distLY: 3000000000, note: "Repeating fast radio burst; associated with a young magnetar." },
  { id: "Magnetar J1745-2900", jname: "J1745-2900", class: "magnetar", ra: 266.418, dec: -29.011, periodMs: 3764.0, distLY: 26000, note: "Magnetar near Sgr A* — probes Galactic-Center magnetic field." },
  { id: "PSR J1748-2446ad", jname: "J1748-2446ad", class: "msp",     ra: 267.020, dec: -24.747, periodMs:    1.396, distLY:  18000, note: "Fastest-rotating known pulsar — 716 Hz, in globular Terzan 5." },
  { id: "PSR J1023+0038",   jname: "J1023+0038", class: "binary",   ra: 155.949, dec:   0.645, periodMs:    1.687, distLY:   4400, note: "Transitional MSP — alternates accreting and rotation-powered states." },
  { id: "PSR J0030+0451",   jname: "J0030+0451", class: "msp",      ra:   7.614, dec:   4.861, periodMs:    4.871, distLY:   1100, note: "First neutron-star radius measurement (NICER, 2019)." },
  { id: "PSR J0537-6910",   jname: "J0537-6910", class: "rotation", ra:  84.448, dec: -69.172, periodMs:   16.12,  distLY: 165000, note: "Fastest 'young' pulsar — in the LMC." },
  { id: "PSR B1620-26",     jname: "J1623-2631", class: "msp",      ra: 245.910, dec: -26.532, periodMs:   11.075, distLY:  12400, note: "'Methuselah' planet — 12.7 Gyr, in M4 globular." },
];

/* ---- Black holes ---- */
export const BLACK_HOLE_CLASSES = {
  stellar: { key: "stellar", label: "Stellar mass",       color: "#9090ff" },
  imbh:    { key: "imbh",    label: "Intermediate mass",  color: "#d96aff" },
  smbh:    { key: "smbh",    label: "Supermassive",       color: "#ff6a6a" },
  exotic:  { key: "exotic",  label: "Notable / inferred", color: "#ffd87a" },
};

export const BLACK_HOLES = [
  /* Stellar mass — within Milky Way */
  { id: "Cygnus X-1",   class: "stellar", ra: 299.591, dec:  35.202, massMsun:        21,  distLY:    7100, note: "First confirmed BH (1971). X-ray binary with O-type star HDE 226868." },
  { id: "V404 Cygni",   class: "stellar", ra: 306.018, dec:  33.867, massMsun:         9,  distLY:    7800, note: "Low-mass X-ray binary; 2015 outburst was brightest BH event from Earth." },
  { id: "A0620-00",     class: "stellar", ra:  95.689, dec:  -0.349, massMsun:       6.6,  distLY:    3500, note: "Closest unambiguous stellar BH until Gaia BH1." },
  { id: "Gaia BH1",     class: "stellar", ra: 273.328, dec:  -0.581, massMsun:       9.6,  distLY:    1560, note: "Closest known BH (Gaia DR3, 2022). Quiescent — no accretion." },
  { id: "LMC X-1",      class: "stellar", ra:  84.911, dec: -69.743, massMsun:      10.9,  distLY:  165000, note: "Persistent X-ray binary in the Large Magellanic Cloud." },
  { id: "GRO J1655-40", class: "stellar", ra: 253.500, dec: -39.846, massMsun:       6.3,  distLY:   11000, note: "Microquasar; relativistic jets observed." },
  { id: "M33 X-7",      class: "stellar", ra:  23.456, dec:  30.595, massMsun:      15.7,  distLY: 2.73e6, note: "Heaviest known stellar BH outside the LIGO mergers; eclipsing X-ray binary." },

  /* Intermediate mass */
  { id: "HLX-1",        class: "imbh",    ra:  13.317, dec: -55.688, massMsun:     20000,  distLY:  290e6, note: "Hyper-luminous X-ray source in ESO 243-49 — strongest IMBH candidate." },
  { id: "Omega Cen IMBH",class:"imbh",    ra: 201.697, dec: -47.480, massMsun:     40000,  distLY:   17000, note: "Inferred from stellar dynamics in core of globular cluster." },
  { id: "GW190521 remnant",class:"imbh",  ra: 192.000, dec:  37.000, massMsun:       142,  distLY: 17e9, note: "LIGO 2020 — first detection of an IMBH formation from a BH merger." },

  /* Supermassive */
  { id: "Sgr A*",       class: "smbh",    ra: 266.417, dec: -29.008, massMsun:    4.297e6, distLY:   26000, note: "Milky Way central BH. Imaged by EHT in 2022." },
  { id: "M87* (Pōwehi)",class: "smbh",    ra: 187.706, dec:  12.391, massMsun:     6.5e9,  distLY: 53.5e6, note: "First-ever direct image of a black hole (EHT, 2019)." },
  { id: "M31* (Andromeda)", class:"smbh", ra:  10.685, dec:  41.269, massMsun:    1.4e8,   distLY: 2.54e6, note: "Nearest large-galaxy SMBH after Sgr A*." },
  { id: "NGC 4889",     class: "smbh",    ra: 195.034, dec:  27.977, massMsun:    2.1e10,  distLY:  308e6, note: "Coma cluster cD galaxy. Among the most massive known." },
  { id: "TON 618",      class: "smbh",    ra: 195.991, dec:  31.420, massMsun:    6.6e10,  distLY: 10.4e9, note: "Quasar with one of the largest measured BH masses." },
  { id: "Holm 15A",     class: "smbh",    ra: 109.510, dec: -25.495, massMsun:    4.0e10,  distLY:  700e6, note: "Brightest cluster galaxy in Abell 85. Recently re-measured upward." },
  { id: "NGC 1277",     class: "smbh",    ra:  49.965, dec:  41.572, massMsun:    1.7e10,  distLY:  220e6, note: "Compact lenticular hosting an outsized BH (~14% of stellar mass)." },

  /* Notable LIGO mergers (point of interest, not strictly inferred BHs in galactic catalogs) */
  { id: "GW150914 merger",class: "exotic", ra:  72.0,   dec: -69.0,   massMsun:        62, distLY: 1.4e9, note: "First gravitational-wave detection (2015). Final remnant mass 62 M☉." },
  { id: "GW170817 (NS-NS)",class:"exotic", ra: 197.45,  dec: -23.38,  massMsun:       2.8, distLY: 130e6, note: "Binary neutron-star merger (2017). First multi-messenger event." },
];

/* ---- Local Group galaxies ---- */
export const LOCAL_GROUP_CLASSES = {
  spiral: { key: "spiral",   label: "Spiral",          color: "#5b9cf7" },
  irreg:  { key: "irreg",    label: "Irregular",       color: "#d96a3a" },
  dwarf:  { key: "dwarf",    label: "Dwarf",           color: "#a89478" },
  ell:    { key: "ell",      label: "Elliptical",      color: "#e8c878" },
};

export const LOCAL_GROUP = [
  { id: "Milky Way",        class: "spiral", ra:   0,    dec:   0,    distMly: 0,      magV: -20.8, diamKpc:  30, note: "Our home — central reference for the catalog." },
  { id: "Andromeda (M31)",  class: "spiral", ra:  10.685,dec:  41.269, distMly: 2.54,   magV:  3.4,  diamKpc:  67, note: "Nearest large galaxy; biggest in the Local Group." },
  { id: "Triangulum (M33)", class: "spiral", ra:  23.462,dec:  30.660, distMly: 2.73,   magV:  5.7,  diamKpc:  19, note: "Third-largest Local Group member." },
  { id: "LMC",              class: "irreg",  ra:  80.894,dec: -69.756, distMly: 0.163,  magV:  0.13, diamKpc:   4.3,note: "Large Magellanic Cloud — major Milky Way satellite." },
  { id: "SMC",              class: "irreg",  ra:  13.158,dec: -72.800, distMly: 0.197,  magV:  2.7,  diamKpc:   2.7,note: "Small Magellanic Cloud — second-most-luminous MW satellite." },
  { id: "Sagittarius Dwarf",class: "dwarf",  ra: 283.833,dec: -30.546, distMly: 0.07,   magV:  4.5,  diamKpc:  2.6, note: "Currently being tidally disrupted by the Milky Way." },
  { id: "Sculptor Dwarf",   class: "dwarf",  ra:  15.039,dec: -33.709, distMly: 0.29,   magV:  9.0,  diamKpc:   1.5,note: "Small, faint dwarf spheroidal MW satellite." },
  { id: "Fornax Dwarf",     class: "dwarf",  ra:  39.962,dec: -34.450, distMly: 0.46,   magV:  9.3,  diamKpc:   3.4,note: "Hosts several globular clusters of its own." },
  { id: "Leo I",            class: "dwarf",  ra: 152.117,dec:  12.306, distMly: 0.83,   magV: 11.2,  diamKpc:   1.0,note: "Just NE of Regulus; tricky telescope target." },
  { id: "Leo II",           class: "dwarf",  ra: 168.370,dec:  22.152, distMly: 0.69,   magV: 12.6,  diamKpc:   0.7 },
  { id: "Draco Dwarf",      class: "dwarf",  ra: 260.060,dec:  57.915, distMly: 0.26,   magV: 10.9,  diamKpc:   0.7 },
  { id: "Ursa Minor Dwarf", class: "dwarf",  ra: 227.286,dec:  67.213, distMly: 0.22,   magV: 11.9,  diamKpc:   0.5 },
  { id: "Carina Dwarf",     class: "dwarf",  ra: 100.402,dec: -50.966, distMly: 0.33,   magV: 11.3,  diamKpc:   0.7 },
  { id: "Sextans Dwarf",    class: "dwarf",  ra: 153.269,dec:  -1.615, distMly: 0.32,   magV: 10.4,  diamKpc:   3.5 },
  { id: "M32 (NGC 221)",    class: "ell",    ra:  10.674,dec:  40.865, distMly: 2.49,   magV:  8.1,  diamKpc:   2.5,note: "Compact elliptical satellite of M31." },
  { id: "M110 (NGC 205)",   class: "ell",    ra:  10.092,dec:  41.685, distMly: 2.69,   magV:  8.5,  diamKpc:  17,  note: "Dwarf elliptical M31 satellite, the further of two visible by Andromeda." },
  { id: "NGC 147",          class: "ell",    ra:   8.301,dec:  48.508, distMly: 2.53,   magV: 10.4,  diamKpc:   4.0,note: "M31 satellite — pair with NGC 185." },
  { id: "NGC 185",          class: "ell",    ra:   9.742,dec:  48.337, distMly: 2.05,   magV: 10.1,  diamKpc:   2.5 },
  { id: "IC 10",            class: "irreg",  ra:   5.072,dec:  59.293, distMly: 2.2,    magV: 11.8,  diamKpc:   4.5,note: "Closest known starburst galaxy." },
  { id: "IC 1613",          class: "irreg",  ra:  16.199,dec:   2.118, distMly: 2.4,    magV:  9.9,  diamKpc:   5.5 },
  { id: "WLM",              class: "irreg",  ra:   0.493,dec: -15.461, distMly: 3.04,   magV: 11.0,  diamKpc:   4.0,note: "Wolf-Lundmark-Melotte. Edge of the Local Group." },
  { id: "Pegasus Dwarf",    class: "irreg",  ra:  23.969,dec:  14.737, distMly: 3.0,    magV: 12.4,  diamKpc:   2.0 },
  { id: "Pisces Dwarf",     class: "dwarf",  ra:   3.389,dec:  12.848, distMly: 2.4,    magV: 13.6,  diamKpc:   0.5 },
];

/* Convert (RA, Dec, distance) → heliocentric Cartesian (Mly).
   Right-handed: x toward vernal equinox, y toward 6h RA, z toward NCP. */
export function raDecDistanceToCartesian(raDeg, decDeg, distMly) {
  const ra  = raDeg * Math.PI / 180;
  const dec = decDeg * Math.PI / 180;
  return {
    x: distMly * Math.cos(dec) * Math.cos(ra),
    y: distMly * Math.cos(dec) * Math.sin(ra),
    z: distMly * Math.sin(dec),
  };
}
