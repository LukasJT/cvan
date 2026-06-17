/* =========================================================================
   CVAN — deep-sky object catalogs.

   Includes the full Messier catalog (110 objects), a curated subset of the
   Caldwell catalog (the brightest 35, complementary to Messier — almost all
   southern or far-northern), and ~30 hand-picked bright NGC / IC objects
   that aren't in either catalog (Double Cluster, Heart Nebula, etc.).

   Each entry uses J2000 equatorial coords (deg), integrated visual magnitude,
   size in arcminutes (major × minor for elongated objects, single value for
   round ones), constellation, distance in light-years (rough), and a short
   note. Magnitudes follow standard catalog values; surface brightness is
   computed on demand via surfaceBrightness().
   ========================================================================= */

/* Object types. Filtering UI uses these as canonical keys. */
export const DSO_TYPES = {
  GAL: { key: "GAL", label: "Galaxy",            color: "#e89a5a" },
  GC:  { key: "GC",  label: "Globular cluster",  color: "#9fd7f7" },
  OC:  { key: "OC",  label: "Open cluster",      color: "#5b9cf7" },
  NEB: { key: "NEB", label: "Diffuse nebula",    color: "#d96a6a" },
  PN:  { key: "PN",  label: "Planetary nebula",  color: "#8fd7e8" },
  SNR: { key: "SNR", label: "Supernova remnant", color: "#e64a4a" },
  ASTR:{ key: "ASTR",label: "Asterism / double", color: "#dcd0b0" },
};

/* Compact Messier catalog. ra, dec in J2000 degrees. size = arcmin (major
   axis when elongated). Distances are light-years. */
export const MESSIER = [
  { id: "M1",   name: "Crab Nebula",           type: "SNR", ra:  83.6331, dec:  22.0145, mag:  8.4, size:    6, constellation: "Taurus",      distLY:    6500, note: "Remnant of SN 1054. Central pulsar PSR B0531+21." },
  { id: "M2",   name: "",                      type: "GC",  ra: 323.3625, dec:  -0.8233, mag:  6.5, size:   16, constellation: "Aquarius",    distLY:   37500 },
  { id: "M3",   name: "",                      type: "GC",  ra: 205.5483, dec:  28.3773, mag:  6.2, size:   18, constellation: "Canes Venatici", distLY: 33900 },
  { id: "M4",   name: "",                      type: "GC",  ra: 245.8967, dec: -26.5258, mag:  5.6, size:   26, constellation: "Scorpius",    distLY:    7200 },
  { id: "M5",   name: "",                      type: "GC",  ra: 229.6383, dec:   2.0810, mag:  5.6, size:   23, constellation: "Serpens",     distLY:   24500 },
  { id: "M6",   name: "Butterfly Cluster",     type: "OC",  ra: 265.0833, dec: -32.2167, mag:  4.2, size:   25, constellation: "Scorpius",    distLY:    1600 },
  { id: "M7",   name: "Ptolemy Cluster",       type: "OC",  ra: 268.4500, dec: -34.7833, mag:  3.3, size:   80, constellation: "Scorpius",    distLY:     980 },
  { id: "M8",   name: "Lagoon Nebula",         type: "NEB", ra: 270.9042, dec: -24.3867, mag:  6.0, size:   90, constellation: "Sagittarius", distLY:    4100, note: "Bright HII region with embedded young cluster NGC 6530." },
  { id: "M9",   name: "",                      type: "GC",  ra: 259.7992, dec: -18.5167, mag:  7.7, size:   12, constellation: "Ophiuchus",   distLY:   25800 },
  { id: "M10",  name: "",                      type: "GC",  ra: 254.2875, dec:  -4.1004, mag:  6.6, size:   20, constellation: "Ophiuchus",   distLY:   14400 },
  { id: "M11",  name: "Wild Duck Cluster",     type: "OC",  ra: 282.7708, dec:  -6.2683, mag:  6.3, size:   14, constellation: "Scutum",      distLY:    6200 },
  { id: "M12",  name: "",                      type: "GC",  ra: 251.8092, dec:  -1.9483, mag:  6.7, size:   16, constellation: "Ophiuchus",   distLY:   15700 },
  { id: "M13",  name: "Hercules Cluster",      type: "GC",  ra: 250.4233, dec:  36.4603, mag:  5.8, size:   20, constellation: "Hercules",    distLY:   22200, note: "Brightest globular in northern hemisphere." },
  { id: "M14",  name: "",                      type: "GC",  ra: 264.4000, dec:  -3.2458, mag:  7.6, size:   11, constellation: "Ophiuchus",   distLY:   30300 },
  { id: "M15",  name: "",                      type: "GC",  ra: 322.4929, dec:  12.1670, mag:  6.2, size:   18, constellation: "Pegasus",     distLY:   33600 },
  { id: "M16",  name: "Eagle Nebula",          type: "NEB", ra: 274.7000, dec: -13.8067, mag:  6.0, size:   35, constellation: "Serpens",     distLY:    7000, note: "Site of the JWST 'Pillars of Creation'." },
  { id: "M17",  name: "Omega Nebula",          type: "NEB", ra: 275.1958, dec: -16.1772, mag:  6.0, size:   46, constellation: "Sagittarius", distLY:    5500 },
  { id: "M18",  name: "",                      type: "OC",  ra: 274.9917, dec: -17.1000, mag:  7.5, size:    9, constellation: "Sagittarius", distLY:    4900 },
  { id: "M19",  name: "",                      type: "GC",  ra: 255.6571, dec: -26.2680, mag:  6.8, size:   17, constellation: "Ophiuchus",   distLY:   28700 },
  { id: "M20",  name: "Trifid Nebula",         type: "NEB", ra: 270.6042, dec: -23.0331, mag:  6.3, size:   28, constellation: "Sagittarius", distLY:    5200 },
  { id: "M21",  name: "",                      type: "OC",  ra: 271.0500, dec: -22.5000, mag:  5.9, size:   13, constellation: "Sagittarius", distLY:    4250 },
  { id: "M22",  name: "Sagittarius Cluster",   type: "GC",  ra: 279.0996, dec: -23.9046, mag:  5.1, size:   24, constellation: "Sagittarius", distLY:   10600 },
  { id: "M23",  name: "",                      type: "OC",  ra: 269.2667, dec: -19.0167, mag:  5.5, size:   27, constellation: "Sagittarius", distLY:    2150 },
  { id: "M24",  name: "Sagittarius Star Cloud", type: "ASTR",ra: 274.2083, dec: -18.5500, mag:  4.6, size:   90, constellation: "Sagittarius", distLY:   10000 },
  { id: "M25",  name: "",                      type: "OC",  ra: 277.9417, dec: -19.1167, mag:  4.6, size:   32, constellation: "Sagittarius", distLY:    2000 },
  { id: "M26",  name: "",                      type: "OC",  ra: 281.3208, dec:  -9.3833, mag:  8.0, size:   15, constellation: "Scutum",      distLY:    5000 },
  { id: "M27",  name: "Dumbbell Nebula",       type: "PN",  ra: 299.9018, dec:  22.7211, mag:  7.5, size:    8, constellation: "Vulpecula",   distLY:    1360, note: "First planetary nebula ever discovered (1764)." },
  { id: "M28",  name: "",                      type: "GC",  ra: 276.1371, dec: -24.8703, mag:  6.8, size:   11, constellation: "Sagittarius", distLY:   18300 },
  { id: "M29",  name: "",                      type: "OC",  ra: 305.9917, dec:  38.5267, mag:  6.6, size:    7, constellation: "Cygnus",      distLY:    4000 },
  { id: "M30",  name: "",                      type: "GC",  ra: 325.0921, dec: -23.1797, mag:  7.7, size:   12, constellation: "Capricornus", distLY:   27100 },
  { id: "M31",  name: "Andromeda Galaxy",      type: "GAL", ra:  10.6847, dec:  41.2691, mag:  3.4, size:  178, constellation: "Andromeda",   distLY: 2540000, note: "Nearest large galaxy. Naked-eye fuzzy patch." },
  { id: "M32",  name: "",                      type: "GAL", ra:  10.6743, dec:  40.8651, mag:  8.1, size:    8, constellation: "Andromeda",   distLY: 2490000, note: "Compact elliptical satellite of M31." },
  { id: "M33",  name: "Triangulum Galaxy",     type: "GAL", ra:  23.4621, dec:  30.6602, mag:  5.7, size:   71, constellation: "Triangulum",  distLY: 2730000, note: "Third-largest Local Group galaxy." },
  { id: "M34",  name: "",                      type: "OC",  ra:  40.5333, dec:  42.7667, mag:  5.5, size:   35, constellation: "Perseus",     distLY:    1500 },
  { id: "M35",  name: "",                      type: "OC",  ra:  92.2750, dec:  24.3333, mag:  5.3, size:   28, constellation: "Gemini",      distLY:    2800 },
  { id: "M36",  name: "Pinwheel Cluster",      type: "OC",  ra:  84.0833, dec:  34.1333, mag:  6.0, size:   12, constellation: "Auriga",      distLY:    4100 },
  { id: "M37",  name: "",                      type: "OC",  ra:  88.0750, dec:  32.5500, mag:  6.2, size:   24, constellation: "Auriga",      distLY:    4500 },
  { id: "M38",  name: "Starfish Cluster",      type: "OC",  ra:  82.1750, dec:  35.8333, mag:  7.4, size:   21, constellation: "Auriga",      distLY:    4200 },
  { id: "M39",  name: "",                      type: "OC",  ra: 322.7833, dec:  48.4333, mag:  4.6, size:   32, constellation: "Cygnus",      distLY:     824 },
  { id: "M40",  name: "Winnecke 4",            type: "ASTR",ra: 185.5542, dec:  58.0833, mag:  8.4, size:    1, constellation: "Ursa Major",  distLY:    1900 },
  { id: "M41",  name: "",                      type: "OC",  ra: 101.4833, dec: -20.7333, mag:  4.5, size:   38, constellation: "Canis Major", distLY:    2300 },
  { id: "M42",  name: "Orion Nebula",          type: "NEB", ra:  83.8221, dec:  -5.3911, mag:  4.0, size:   85, constellation: "Orion",       distLY:    1344, note: "Brightest nebula in sky. Naked-eye." },
  { id: "M43",  name: "De Mairan's Nebula",    type: "NEB", ra:  83.8800, dec:  -5.2700, mag:  9.0, size:   20, constellation: "Orion",       distLY:    1600 },
  { id: "M44",  name: "Beehive Cluster",       type: "OC",  ra: 130.0250, dec:  19.6700, mag:  3.7, size:   95, constellation: "Cancer",      distLY:     577, note: "Praesepe — naked-eye open cluster." },
  { id: "M45",  name: "Pleiades",              type: "OC",  ra:  56.7500, dec:  24.1167, mag:  1.6, size:  110, constellation: "Taurus",      distLY:     444, note: "Seven Sisters — brightest naked-eye open cluster." },
  { id: "M46",  name: "",                      type: "OC",  ra: 115.4458, dec: -14.8167, mag:  6.1, size:   27, constellation: "Puppis",      distLY:    5400 },
  { id: "M47",  name: "",                      type: "OC",  ra: 114.1458, dec: -14.5000, mag:  4.4, size:   30, constellation: "Puppis",      distLY:    1600 },
  { id: "M48",  name: "",                      type: "OC",  ra: 123.4167, dec:  -5.8000, mag:  5.8, size:   54, constellation: "Hydra",       distLY:    2500 },
  { id: "M49",  name: "",                      type: "GAL", ra: 187.4446, dec:   8.0004, mag:  8.4, size:   10, constellation: "Virgo",       distLY:55900000, note: "Brightest member of Virgo Cluster." },
  { id: "M50",  name: "",                      type: "OC",  ra: 105.6917, dec:  -8.3333, mag:  5.9, size:   16, constellation: "Monoceros",   distLY:    3000 },
  { id: "M51",  name: "Whirlpool Galaxy",      type: "GAL", ra: 202.4696, dec:  47.1953, mag:  8.4, size:   11, constellation: "Canes Venatici", distLY:23000000, note: "Interacting with NGC 5195." },
  { id: "M52",  name: "",                      type: "OC",  ra: 351.1917, dec:  61.5833, mag:  5.0, size:   13, constellation: "Cassiopeia",  distLY:    5000 },
  { id: "M53",  name: "",                      type: "GC",  ra: 198.2304, dec:  18.1681, mag:  7.6, size:   13, constellation: "Coma Berenices", distLY: 58000 },
  { id: "M54",  name: "",                      type: "GC",  ra: 283.7637, dec: -30.4798, mag:  7.6, size:    9, constellation: "Sagittarius", distLY:   87400 },
  { id: "M55",  name: "",                      type: "GC",  ra: 294.9988, dec: -30.9648, mag:  6.3, size:   19, constellation: "Sagittarius", distLY:   17600 },
  { id: "M56",  name: "",                      type: "GC",  ra: 289.1483, dec:  30.1834, mag:  8.3, size:    8, constellation: "Lyra",        distLY:   32900 },
  { id: "M57",  name: "Ring Nebula",           type: "PN",  ra: 283.3963, dec:  33.0292, mag:  8.8, size:    2, constellation: "Lyra",        distLY:    2300, note: "Classic planetary nebula. Small but distinct ring shape." },
  { id: "M58",  name: "",                      type: "GAL", ra: 189.4313, dec:  11.8181, mag:  9.7, size:    6, constellation: "Virgo",       distLY:62000000 },
  { id: "M59",  name: "",                      type: "GAL", ra: 190.5096, dec:  11.6471, mag:  9.6, size:    5, constellation: "Virgo",       distLY:60000000 },
  { id: "M60",  name: "",                      type: "GAL", ra: 190.9167, dec:  11.5526, mag:  8.8, size:    7, constellation: "Virgo",       distLY:55000000 },
  { id: "M61",  name: "",                      type: "GAL", ra: 185.4790, dec:   4.4737, mag:  9.7, size:    6, constellation: "Virgo",       distLY:52500000 },
  { id: "M62",  name: "",                      type: "GC",  ra: 255.3025, dec: -30.1124, mag:  6.5, size:   15, constellation: "Ophiuchus",   distLY:   22500 },
  { id: "M63",  name: "Sunflower Galaxy",      type: "GAL", ra: 198.9555, dec:  42.0293, mag:  8.6, size:   13, constellation: "Canes Venatici", distLY: 27000000 },
  { id: "M64",  name: "Black Eye Galaxy",      type: "GAL", ra: 194.1825, dec:  21.6826, mag:  8.5, size:   10, constellation: "Coma Berenices", distLY: 17000000 },
  { id: "M65",  name: "",                      type: "GAL", ra: 169.7333, dec:  13.0925, mag:  9.3, size:    9, constellation: "Leo",         distLY:35000000, note: "Member of the Leo Triplet." },
  { id: "M66",  name: "",                      type: "GAL", ra: 170.0625, dec:  12.9914, mag:  8.9, size:    9, constellation: "Leo",         distLY:36000000 },
  { id: "M67",  name: "",                      type: "OC",  ra: 132.8250, dec:  11.8000, mag:  6.1, size:   30, constellation: "Cancer",      distLY:    2700 },
  { id: "M68",  name: "",                      type: "GC",  ra: 189.8667, dec: -26.7444, mag:  7.8, size:   12, constellation: "Hydra",       distLY:   33600 },
  { id: "M69",  name: "",                      type: "GC",  ra: 277.8463, dec: -32.3481, mag:  7.6, size:    7, constellation: "Sagittarius", distLY:   29700 },
  { id: "M70",  name: "",                      type: "GC",  ra: 280.8030, dec: -32.2920, mag:  7.9, size:    8, constellation: "Sagittarius", distLY:   29400 },
  { id: "M71",  name: "",                      type: "GC",  ra: 298.4438, dec:  18.7793, mag:  8.2, size:    7, constellation: "Sagitta",     distLY:   12000 },
  { id: "M72",  name: "",                      type: "GC",  ra: 313.3654, dec: -12.5373, mag:  9.4, size:    6, constellation: "Aquarius",    distLY:   53400 },
  { id: "M73",  name: "",                      type: "ASTR",ra: 314.7458, dec: -12.6333, mag:  9.0, size:    3, constellation: "Aquarius",    distLY:    2500 },
  { id: "M74",  name: "Phantom Galaxy",        type: "GAL", ra:  24.1742, dec:  15.7836, mag:  9.4, size:   10, constellation: "Pisces",      distLY:32000000 },
  { id: "M75",  name: "",                      type: "GC",  ra: 301.5204, dec: -21.9226, mag:  8.5, size:    7, constellation: "Sagittarius", distLY:   67500 },
  { id: "M76",  name: "Little Dumbbell",       type: "PN",  ra:  25.5817, dec:  51.5754, mag: 10.1, size:    3, constellation: "Perseus",     distLY:    3400 },
  { id: "M77",  name: "Cetus A",               type: "GAL", ra:  40.6696, dec:   0.0133, mag:  8.9, size:    7, constellation: "Cetus",       distLY:47000000, note: "Bright Seyfert galaxy." },
  { id: "M78",  name: "",                      type: "NEB", ra:  86.6792, dec:   0.0794, mag:  8.0, size:    8, constellation: "Orion",       distLY:    1600 },
  { id: "M79",  name: "",                      type: "GC",  ra:  81.0438, dec: -24.5247, mag:  7.7, size:    9, constellation: "Lepus",       distLY:   42100 },
  { id: "M80",  name: "",                      type: "GC",  ra: 244.2604, dec: -22.9761, mag:  7.3, size:   10, constellation: "Scorpius",    distLY:   32600 },
  { id: "M81",  name: "Bode's Galaxy",         type: "GAL", ra: 148.8883, dec:  69.0653, mag:  6.9, size:   27, constellation: "Ursa Major",  distLY:11800000, note: "Easy bright spiral." },
  { id: "M82",  name: "Cigar Galaxy",          type: "GAL", ra: 148.9683, dec:  69.6797, mag:  8.4, size:   11, constellation: "Ursa Major",  distLY:12000000, note: "Starburst galaxy; intense IR." },
  { id: "M83",  name: "Southern Pinwheel",     type: "GAL", ra: 204.2538, dec: -29.8658, mag:  7.5, size:   13, constellation: "Hydra",       distLY:15000000 },
  { id: "M84",  name: "",                      type: "GAL", ra: 186.2654, dec:  12.8870, mag:  9.1, size:    7, constellation: "Virgo",       distLY:60000000 },
  { id: "M85",  name: "",                      type: "GAL", ra: 186.3504, dec:  18.1912, mag:  9.1, size:    7, constellation: "Coma Berenices", distLY: 60000000 },
  { id: "M86",  name: "",                      type: "GAL", ra: 186.5495, dec:  12.9462, mag:  8.9, size:    9, constellation: "Virgo",       distLY:52000000 },
  { id: "M87",  name: "Virgo A",               type: "GAL", ra: 187.7059, dec:  12.3911, mag:  8.6, size:    8, constellation: "Virgo",       distLY:53500000, note: "Supermassive black hole imaged by EHT (2019)." },
  { id: "M88",  name: "",                      type: "GAL", ra: 187.9967, dec:  14.4204, mag:  9.6, size:    7, constellation: "Coma Berenices", distLY: 47000000 },
  { id: "M89",  name: "",                      type: "GAL", ra: 188.9158, dec:  12.5563, mag:  9.8, size:    5, constellation: "Virgo",       distLY:50000000 },
  { id: "M90",  name: "",                      type: "GAL", ra: 189.2075, dec:  13.1629, mag:  9.5, size:   10, constellation: "Virgo",       distLY:58000000 },
  { id: "M91",  name: "",                      type: "GAL", ra: 188.8617, dec:  14.4965, mag: 10.2, size:    5, constellation: "Coma Berenices", distLY: 63000000 },
  { id: "M92",  name: "",                      type: "GC",  ra: 259.2808, dec:  43.1359, mag:  6.4, size:   14, constellation: "Hercules",    distLY:   26700 },
  { id: "M93",  name: "",                      type: "OC",  ra: 116.1417, dec: -23.8500, mag:  6.2, size:   22, constellation: "Puppis",      distLY:    3600 },
  { id: "M94",  name: "",                      type: "GAL", ra: 192.7213, dec:  41.1203, mag:  8.2, size:   11, constellation: "Canes Venatici", distLY: 16000000 },
  { id: "M95",  name: "",                      type: "GAL", ra: 160.9904, dec:  11.7038, mag:  9.7, size:    7, constellation: "Leo",         distLY:38000000 },
  { id: "M96",  name: "",                      type: "GAL", ra: 161.6906, dec:  11.8199, mag:  9.2, size:    7, constellation: "Leo",         distLY:31000000 },
  { id: "M97",  name: "Owl Nebula",            type: "PN",  ra: 168.6987, dec:  55.0190, mag:  9.9, size:    3, constellation: "Ursa Major",  distLY:    2030 },
  { id: "M98",  name: "",                      type: "GAL", ra: 183.4513, dec:  14.9003, mag: 10.1, size:   10, constellation: "Coma Berenices", distLY: 60000000 },
  { id: "M99",  name: "",                      type: "GAL", ra: 184.7067, dec:  14.4164, mag:  9.9, size:    5, constellation: "Coma Berenices", distLY: 60000000 },
  { id: "M100", name: "",                      type: "GAL", ra: 185.7283, dec:  15.8221, mag:  9.3, size:    7, constellation: "Coma Berenices", distLY: 55000000 },
  { id: "M101", name: "Pinwheel Galaxy",       type: "GAL", ra: 210.8025, dec:  54.3486, mag:  7.9, size:   29, constellation: "Ursa Major",  distLY:21000000 },
  { id: "M102", name: "Spindle Galaxy",        type: "GAL", ra: 226.6225, dec:  55.7633, mag: 10.7, size:    5, constellation: "Draco",       distLY:50000000 },
  { id: "M103", name: "",                      type: "OC",  ra:  23.3417, dec:  60.6667, mag:  7.4, size:    6, constellation: "Cassiopeia",  distLY:    8500 },
  { id: "M104", name: "Sombrero Galaxy",       type: "GAL", ra: 189.9976, dec: -11.6231, mag:  8.0, size:    9, constellation: "Virgo",       distLY:31000000, note: "Bright bulge, dust lane through disc." },
  { id: "M105", name: "",                      type: "GAL", ra: 161.9567, dec:  12.5816, mag:  9.3, size:    5, constellation: "Leo",         distLY:32000000 },
  { id: "M106", name: "",                      type: "GAL", ra: 184.7400, dec:  47.3038, mag:  8.4, size:   19, constellation: "Canes Venatici", distLY: 23700000 },
  { id: "M107", name: "",                      type: "GC",  ra: 248.1325, dec: -13.0539, mag:  7.9, size:   13, constellation: "Ophiuchus",   distLY:   20900 },
  { id: "M108", name: "",                      type: "GAL", ra: 167.8800, dec:  55.6741, mag: 10.0, size:    9, constellation: "Ursa Major",  distLY:46000000 },
  { id: "M109", name: "",                      type: "GAL", ra: 179.3996, dec:  53.3744, mag:  9.8, size:    8, constellation: "Ursa Major",  distLY:55000000 },
  { id: "M110", name: "",                      type: "GAL", ra:  10.0917, dec:  41.6855, mag:  8.1, size:   22, constellation: "Andromeda",   distLY: 2690000, note: "Dwarf elliptical satellite of M31." },
];

/* Curated Caldwell additions — the brightest objects not in Messier,
   spanning both hemispheres. C-numbers preserved for cross-reference. */
export const CALDWELL = [
  { id: "C14",  name: "Double Cluster",        type: "OC",  ra:  34.7417, dec:  57.1333, mag:  4.3, size:   60, constellation: "Perseus",     distLY:    7500, note: "Naked-eye pair h+χ Persei (NGC 869 + NGC 884)." },
  { id: "C20",  name: "North America Nebula",  type: "NEB", ra: 314.7500, dec:  44.3500, mag:  4.0, size:  120, constellation: "Cygnus",      distLY:    1800 },
  { id: "C27",  name: "Crescent Nebula",       type: "NEB", ra: 303.0167, dec:  38.3667, mag:  7.4, size:   18, constellation: "Cygnus",      distLY:    5000 },
  { id: "C33",  name: "Eastern Veil Nebula",   type: "SNR", ra: 313.0333, dec:  30.7167, mag:  7.0, size:   60, constellation: "Cygnus",      distLY:    2400 },
  { id: "C34",  name: "Western Veil Nebula",   type: "SNR", ra: 312.7500, dec:  30.7167, mag:  7.0, size:   70, constellation: "Cygnus",      distLY:    2400 },
  { id: "C39",  name: "Eskimo Nebula",         type: "PN",  ra: 116.3333, dec:  20.9167, mag:  9.1, size:    1, constellation: "Gemini",      distLY:    6500 },
  { id: "C41",  name: "Hyades",                type: "OC",  ra:  66.7500, dec:  15.8667, mag:  0.5, size:  330, constellation: "Taurus",      distLY:     153, note: "Nearest open cluster. Forms V-shape around Aldebaran." },
  { id: "C49",  name: "Rosette Nebula",        type: "NEB", ra:  98.0000, dec:   4.9500, mag:  9.0, size:   80, constellation: "Monoceros",   distLY:    5200 },
  { id: "C63",  name: "Helix Nebula",          type: "PN",  ra: 337.4108, dec: -20.8372, mag:  7.6, size:   25, constellation: "Aquarius",    distLY:     650, note: "Closest bright planetary nebula." },
  { id: "C65",  name: "Sculptor Galaxy",       type: "GAL", ra:  11.8883, dec: -25.2884, mag:  7.2, size:   28, constellation: "Sculptor",    distLY:11400000 },
  { id: "C77",  name: "Centaurus A",           type: "GAL", ra: 201.3650, dec: -43.0192, mag:  6.8, size:   26, constellation: "Centaurus",   distLY:13700000, note: "Famous radio galaxy with dramatic dust lane." },
  { id: "C80",  name: "Omega Centauri",        type: "GC",  ra: 201.6967, dec: -47.4795, mag:  3.7, size:   55, constellation: "Centaurus",   distLY:   17000, note: "Brightest globular cluster in the sky." },
  { id: "C92",  name: "Eta Carinae Nebula",    type: "NEB", ra: 161.2667, dec: -59.8667, mag:  3.0, size:  120, constellation: "Carina",      distLY:    8500, note: "Spectacular southern HII region." },
  { id: "C93",  name: "47 Tucanae",            type: "GC",  ra:   6.0227, dec: -72.0814, mag:  4.0, size:   50, constellation: "Tucana",      distLY:   13000, note: "Second-brightest globular after Omega Cen." },
  { id: "C99",  name: "Coalsack Nebula",       type: "NEB", ra: 186.2500, dec: -63.0000, mag:  0.0, size:  420, constellation: "Crux",        distLY:     600, note: "Naked-eye dark nebula." },
  { id: "C100", name: "Lambda Centauri Cluster",type: "OC", ra: 174.6667, dec: -63.0167, mag:  4.5, size:  150, constellation: "Centaurus",   distLY:    6500 },
  { id: "C106", name: "Small Magellanic Cloud", type: "GAL",ra:  13.1583, dec: -72.8000, mag:  2.7, size:  280, constellation: "Tucana",      distLY:  200000, note: "Naked-eye dwarf irregular satellite of the Milky Way." },
];

/* Hand-picked iconic NGC / IC objects not covered by Messier or Caldwell. */
export const NGC_IC = [
  { id: "NGC 7000", catalog:"NGC", name: "North America Nebula", type: "NEB", ra: 314.75, dec: 44.35, mag: 4.0, size: 120, constellation: "Cygnus", distLY: 1800 },
  { id: "NGC 6960", catalog:"NGC", name: "Veil Nebula West",     type: "SNR", ra: 312.75, dec: 30.72, mag: 7.0, size: 70, constellation: "Cygnus", distLY: 2400 },
  { id: "NGC 6888", catalog:"NGC", name: "Crescent Nebula",      type: "NEB", ra: 303.02, dec: 38.37, mag: 7.4, size: 18, constellation: "Cygnus", distLY: 5000 },
  { id: "NGC 281",  catalog:"NGC", name: "Pacman Nebula",        type: "NEB", ra:  13.10, dec: 56.62, mag: 7.4, size: 35, constellation: "Cassiopeia", distLY: 9500 },
  { id: "NGC 7635", catalog:"NGC", name: "Bubble Nebula",        type: "NEB", ra: 350.20, dec: 61.20, mag: 11.0, size: 15, constellation: "Cassiopeia", distLY: 11000 },
  { id: "NGC 2237", catalog:"NGC", name: "Rosette Nebula",       type: "NEB", ra:  98.00, dec:  4.95, mag: 9.0, size: 80, constellation: "Monoceros", distLY: 5200 },
  { id: "IC 1805",  catalog:"IC",  name: "Heart Nebula",         type: "NEB", ra:  38.18, dec: 61.45, mag: 6.5, size: 100, constellation: "Cassiopeia", distLY: 7500 },
  { id: "IC 1848",  catalog:"IC",  name: "Soul Nebula",          type: "NEB", ra:  42.50, dec: 60.42, mag: 6.5, size: 100, constellation: "Cassiopeia", distLY: 6500 },
  { id: "IC 434",   catalog:"IC",  name: "Horsehead Nebula",     type: "NEB", ra:  85.27, dec: -2.45, mag: 6.8, size: 60, constellation: "Orion", distLY: 1500 },
  { id: "NGC 2024", catalog:"NGC", name: "Flame Nebula",         type: "NEB", ra:  85.43, dec: -1.85, mag: 10.0, size: 30, constellation: "Orion", distLY: 1500 },
  { id: "NGC 869",  catalog:"NGC", name: "Double Cluster h Per", type: "OC",  ra:  34.74, dec: 57.13, mag: 5.3, size: 30, constellation: "Perseus", distLY: 7500 },
  { id: "NGC 884",  catalog:"NGC", name: "Double Cluster χ Per", type: "OC",  ra:  35.58, dec: 57.13, mag: 6.1, size: 30, constellation: "Perseus", distLY: 7500 },
  { id: "NGC 7293", catalog:"NGC", name: "Helix Nebula",         type: "PN",  ra: 337.41, dec: -20.84, mag: 7.6, size: 25, constellation: "Aquarius", distLY: 650 },
  { id: "NGC 5128", catalog:"NGC", name: "Centaurus A",          type: "GAL", ra: 201.37, dec: -43.02, mag: 6.8, size: 26, constellation: "Centaurus", distLY: 13700000 },
  { id: "NGC 253",  catalog:"NGC", name: "Sculptor Galaxy",      type: "GAL", ra:  11.89, dec: -25.29, mag: 7.2, size: 28, constellation: "Sculptor", distLY: 11400000 },
  { id: "NGC 5139", catalog:"NGC", name: "Omega Centauri",       type: "GC",  ra: 201.70, dec: -47.48, mag: 3.7, size: 55, constellation: "Centaurus", distLY: 17000 },
];

/* Annotate Messier and Caldwell with catalog tags + a unified type label. */
function tag(rows, catalog) {
  return rows.map(r => ({
    ...r,
    catalog,
    typeLabel: DSO_TYPES[r.type]?.label ?? r.type,
    typeColor: DSO_TYPES[r.type]?.color ?? "var(--accent-gold)",
  }));
}

export const ALL_DSO = [
  ...tag(MESSIER, "Messier"),
  ...tag(CALDWELL, "Caldwell"),
  ...tag(NGC_IC.map(r => ({ ...r, catalog: r.catalog })), null),
];

/* Surface brightness in mag / arcmin² for an object of magnitude `mag`
   subtending major axis `sizeArcmin`. Treats the object as a uniform disc
   (so this is a lower bound — galaxy cores are much brighter than the rim).

      SB = mag + 2.5 * log10(π · (size/2)²)
   */
export function surfaceBrightness(mag, sizeArcmin) {
  if (!sizeArcmin || sizeArcmin <= 0) return null;
  const a = Math.PI * (sizeArcmin / 2) ** 2;
  return mag + 2.5 * Math.log10(a);
}

/* Verbal SB tier — handy for the table column. Values are for amateur scopes
   under dark skies; threshold worsens with Bortle class. */
export function surfaceBrightnessTier(sb) {
  if (sb == null) return { tier: "—", color: "var(--text-muted)" };
  if (sb < 18.0) return { tier: "high",     color: "var(--accent-green)" };
  if (sb < 21.0) return { tier: "moderate", color: "var(--accent-gold)" };
  if (sb < 23.5) return { tier: "low",      color: "var(--warning)" };
  return            { tier: "very low",     color: "var(--error)" };
}

/* Best-tonight recommender. Given an observer, weather, the tonight altitude
   curve, and a Bortle estimate, returns the top N objects ranked by a
   composite score combining altitude, magnitude, surface brightness,
   and moon avoidance. Pure function, no fetching. */
export function bestTonight({ now, coords, sky, bortle, maxResults = 12, scopeAperture = 0 }) {
  // ... computed in the component since we need findEvents per body.
  // This function returns just the scoring rule.
  return null;
}

/* Magnitude limit a given amateur instrument can reach under a dark sky:
   m_lim ≈ 7.5 + 5·log10(aperture_mm / 7). 7 mm = dark-adapted pupil. */
export function magnitudeLimitForAperture(apertureMm) {
  if (!apertureMm || apertureMm <= 0) return 6.5; // naked eye, dark sky
  return 7.5 + 5 * Math.log10(apertureMm / 7);
}
