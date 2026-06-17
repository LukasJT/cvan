/* =========================================================================
   CVAN — curated Hubble + JWST iconic image overlay.

   Each entry carries the J2000 sky position of the target so the gallery
   can also act as a sky-map overlay. Thumbnails point to the official NASA
   / ESA / STScI press CDNs; the page link is the canonical press release
   for full-resolution downloads and credits.
   ========================================================================= */

export const TELESCOPE_IMAGES = [
  /* ---- Hubble Space Telescope ---- */
  {
    id: "hudf",
    target: "Hubble Ultra-Deep Field",
    telescope: "Hubble",
    instrument: "ACS + NICMOS",
    year: 2004,
    ra: 53.158, dec: -27.799,
    constellation: "Fornax",
    thumb: "https://esahubble.org/media/archives/images/screen/heic0611b.jpg",
    page: "https://esahubble.org/images/heic0611b/",
    description: "10,000 galaxies in a patch the size of a grain of sand at arm's length. The faintest objects are over 13 billion years old.",
  },
  {
    id: "pillars-hst",
    target: "Pillars of Creation (M16)",
    telescope: "Hubble",
    instrument: "WFC3",
    year: 2014,
    ra: 274.700, dec: -13.806,
    constellation: "Serpens",
    thumb: "https://esahubble.org/media/archives/images/screen/heic1501a.jpg",
    page: "https://esahubble.org/images/heic1501a/",
    description: "Star-forming pillars in the Eagle Nebula, re-imaged 20 years after the 1995 original. The largest pillar is 5 light-years tall.",
  },
  {
    id: "mystic-mountain",
    target: "Mystic Mountain (Carina Nebula)",
    telescope: "Hubble",
    instrument: "WFC3",
    year: 2010,
    ra: 161.300, dec: -59.667,
    constellation: "Carina",
    thumb: "https://esahubble.org/media/archives/images/screen/heic1007a.jpg",
    page: "https://esahubble.org/images/heic1007a/",
    description: "Three-light-year-tall pillar of gas and dust being eaten by ultraviolet radiation from nearby stars. Released for Hubble's 20th anniversary.",
  },
  {
    id: "horsehead-ir",
    target: "Horsehead Nebula (infrared)",
    telescope: "Hubble",
    instrument: "WFC3-IR",
    year: 2013,
    ra: 85.270, dec: -2.450,
    constellation: "Orion",
    thumb: "https://esahubble.org/media/archives/images/screen/heic1307a.jpg",
    page: "https://esahubble.org/images/heic1307a/",
    description: "Hubble's 23rd anniversary view. Infrared imaging peers through the dust that obscures the classic visible-light silhouette.",
  },
  {
    id: "sombrero",
    target: "Sombrero Galaxy (M104)",
    telescope: "Hubble",
    instrument: "ACS",
    year: 2003,
    ra: 189.998, dec: -11.623,
    constellation: "Virgo",
    thumb: "https://esahubble.org/media/archives/images/screen/opo0328a.jpg",
    page: "https://esahubble.org/images/opo0328a/",
    description: "Edge-on spiral 28 million light-years away. The hallmark dust lane and brilliant central bulge make it one of Hubble's most-printed photos.",
  },
  {
    id: "v838-mon",
    target: "V838 Monocerotis Light Echo",
    telescope: "Hubble",
    instrument: "ACS",
    year: 2004,
    ra: 106.000, dec:  -3.850,
    constellation: "Monoceros",
    thumb: "https://esahubble.org/media/archives/images/screen/heic0405a.jpg",
    page: "https://esahubble.org/images/heic0405a/",
    description: "Light from a 2002 stellar outburst illuminating surrounding dust shells — a true 3-D record of an old envelope of ejecta.",
  },

  /* ---- James Webb Space Telescope ---- */
  {
    id: "smacs-0723",
    target: "SMACS 0723 — Webb's First Deep Field",
    telescope: "JWST",
    instrument: "NIRCam",
    year: 2022,
    ra: 110.828, dec: -73.454,
    constellation: "Volans",
    thumb: "https://stsci-opo.org/STScI-01G7DCWB7137MYJ05CSH1Q5Z1Z.png",
    page: "https://webbtelescope.org/contents/media/images/2022/038/01G7DCWB7137MYJ05CSH1Q5Z1Z",
    description: "First science-quality JWST image, unveiled July 11 2022. Gravitational lensing by the foreground cluster magnifies background galaxies billions of light-years away.",
  },
  {
    id: "cosmic-cliffs",
    target: "Cosmic Cliffs (Carina, NGC 3324)",
    telescope: "JWST",
    instrument: "NIRCam",
    year: 2022,
    ra: 159.250, dec: -58.622,
    constellation: "Carina",
    thumb: "https://stsci-opo.org/STScI-01G7DD3FT8AS4FQDXVBT08V79V.png",
    page: "https://webbtelescope.org/contents/media/images/2022/031/01G77PKB8NKR7S8Z6HBXMYATGJ",
    description: "Star-forming edge of the Carina Nebula. The 'mountains' are gas pillars several light-years tall.",
  },
  {
    id: "pillars-jwst",
    target: "Pillars of Creation (NIRCam)",
    telescope: "JWST",
    instrument: "NIRCam",
    year: 2022,
    ra: 274.700, dec: -13.806,
    constellation: "Serpens",
    thumb: "https://stsci-opo.org/STScI-01GFNQYVN0KZD6KE5K8XJZ8MWA.png",
    page: "https://webbtelescope.org/contents/media/images/2022/052/01GF423GBQSK6ANC89NTFJW8VM",
    description: "Webb's infrared re-imaging of the 1995 / 2014 Hubble target, revealing newborn protostars hidden inside the dust.",
  },
  {
    id: "stephans-quintet",
    target: "Stephan's Quintet",
    telescope: "JWST",
    instrument: "NIRCam + MIRI",
    year: 2022,
    ra: 339.000, dec:  33.960,
    constellation: "Pegasus",
    thumb: "https://stsci-opo.org/STScI-01G7JN9JBJB1QFE0FSGGYM1AJD.png",
    page: "https://webbtelescope.org/contents/media/images/2022/034/01G7JJADTH90FR98AKKJFKSS0B",
    description: "Compact galaxy group (four physically interacting). Webb resolves star-formation knots and a clear shockwave from the head-on intruder.",
  },
  {
    id: "southern-ring",
    target: "Southern Ring Nebula (NGC 3132)",
    telescope: "JWST",
    instrument: "NIRCam",
    year: 2022,
    ra: 151.750, dec: -40.433,
    constellation: "Vela",
    thumb: "https://stsci-opo.org/STScI-01G7ETPF7DVBJAC42JM1YQTV5A.png",
    page: "https://webbtelescope.org/contents/media/images/2022/033/01G709QXZPFH83NZFAFP66WVCZ",
    description: "Planetary nebula 2,500 light-years away. Webb resolves the dust around the central white dwarf and a previously unseen companion.",
  },
  {
    id: "phantom-galaxy",
    target: "Phantom Galaxy (M74)",
    telescope: "JWST",
    instrument: "MIRI",
    year: 2022,
    ra:  24.174, dec:  15.784,
    constellation: "Pisces",
    thumb: "https://stsci-opo.org/STScI-01GA76RAGCYVNTBMS22V4P4QGZ.png",
    page: "https://webbtelescope.org/contents/media/images/2022/053/01GA76MYFN0FH1Q4PRX1F178BG",
    description: "Face-on spiral 32 million light-years away. Webb's mid-infrared view traces the cold dusty filaments outlining the spiral arms.",
  },
];

export function telescopeImageCounts() {
  let h = 0, j = 0;
  for (const t of TELESCOPE_IMAGES) {
    if (t.telescope === "Hubble") h++;
    else if (t.telescope === "JWST") j++;
  }
  return { hubble: h, jwst: j, total: TELESCOPE_IMAGES.length };
}
