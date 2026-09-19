export const existingGuides = [
  {
    slug: "milky-way",
    title: "How to see the Milky Way",
    description: "When and where the Milky Way is visible, and how darkness, moonlight, clouds, and latitude shape the view.",
    topic: "milky-way",
  },
  {
    slug: "aurora",
    title: "How to see the aurora",
    description: "How geomagnetic activity, location, darkness, and clouds affect an aurora watch.",
    topic: "aurora",
  },
  {
    slug: "bortle-scale",
    title: "The Bortle Scale explained",
    description: "What Bortle classes describe, what they do not measure, and how to interpret a modeled sky-brightness estimate.",
    topic: "observing-conditions",
  },
];

export const articles = [
  {
    slug: "stargazing-conditions",
    title: "Is tonight good for stargazing?",
    description: "Judge tonight's stargazing conditions using darkness, clouds, moonlight, light pollution, target altitude, and atmospheric clarity.",
    summary: "A good observing night depends on what you want to see. Learn how CVAN combines sky conditions and why a poor Milky Way night can still be excellent for the Moon or planets.",
    topic: "observing-conditions",
    published: "2026-09-19",
    modified: "2026-09-19",
    toolTab: "overview",
    toolLabel: "Check tonight's sky at your location",
    featureIds: ["composite-visibility", "tonight-altitude-chart", "weather", "moon-brightness"],
    sources: [
      ["U.S. Naval Observatory — rise, set, and twilight definitions", "https://aa.usno.navy.mil/faq/RST_defs"],
      ["Open-Meteo — weather forecast API documentation", "https://open-meteo.com/en/docs"],
      ["Google Search Central — helpful, reliable content", "https://developers.google.com/search/docs/fundamentals/creating-helpful-content"],
    ],
    related: ["twilight", "moonlight-stargazing", "light-pollution-maps"],
    sections: [
      {
        id: "short-answer",
        title: "The short answer",
        paragraphs: [
          "Tonight is good for stargazing when your target is above the horizon, the sky is dark enough for that target, clouds leave a usable clear window, and glare from the Moon or nearby lights does not overwhelm it. There is no single perfect score for every kind of observing.",
          "A bright Moon can spoil a faint-galaxy session while making the lunar surface the best target in the sky. Thin haze can hide the Milky Way yet leave Jupiter easy to see. Use a forecast to choose the right target, not only to decide whether to stay indoors.",
        ],
      },
      {
        id: "five-factors",
        title: "Five factors that change the answer",
        paragraphs: [
          "<strong>Darkness:</strong> faint objects need the Sun well below the horizon. Civil, nautical, and astronomical twilight end when the Sun's center is 6°, 12°, and 18° below a level horizon. These are conventions; haze, snow, and artificial light can make the real sky brighter.",
          "<strong>Clouds:</strong> total cloud cover is a useful first check, but cloud type and timing matter. A 40% forecast might mean scattered openings or a solid cloudy hour followed by a clear one. Read the hourly curve around the time your target is highest.",
          "<strong>Moonlight:</strong> phase alone is incomplete. The Moon's altitude, its angular distance from your target, and whether it sets during your session all matter. A bright Moon below the horizon contributes far less glare than the same phase overhead.",
          "<strong>Light pollution:</strong> artificial skyglow reduces contrast for diffuse objects. A satellite-derived atlas estimates typical zenith brightness; it cannot know about a nearby lamp, stadium, snow cover, smoke, or your horizon.",
          "<strong>Target position:</strong> an object near the horizon is viewed through more atmosphere and may be hidden by terrain. It is usually clearer and steadier when higher in the sky.",
        ],
      },
      {
        id: "target-table",
        title: "Choose a target that fits the conditions",
        html: `<div class="table-wrap"><table><thead><tr><th>Condition</th><th>Good choices</th><th>Harder choices</th></tr></thead><tbody>
          <tr><td>Bright Moon, clear sky</td><td>Moon, bright planets, double stars</td><td>Milky Way, faint galaxies, nebulae</td></tr>
          <tr><td>Urban sky</td><td>Moon, planets, bright clusters</td><td>Low-surface-brightness galaxies</td></tr>
          <tr><td>Patchy clouds</td><td>Short binocular sessions, bright targets</td><td>Long-exposure imaging</td></tr>
          <tr><td>Dark, clear, moonless</td><td>Milky Way, nebulae, galaxies, meteor watching</td><td>None because of sky brightness; seeing may still limit high magnification</td></tr>
        </tbody></table></div>`,
      },
      {
        id: "use-cvan",
        title: "How to use CVAN's Tonight view",
        paragraphs: [
          "Set your location, then start with the altitude chart. Look for an interval when the Sun is below the required twilight line and your target is above the horizon. Compare that interval with Moon altitude and hourly cloud cover. Treat the composite score as a summary of documented heuristics, then inspect the factors before making a travel decision.",
          "Forecast confidence normally falls with lead time. Recheck weather near departure, keep a safe backup site, and expect local terrain and lighting to differ from a global model.",
        ],
      },
    ],
  },
  {
    slug: "twilight",
    title: "Civil, nautical, and astronomical twilight explained",
    description: "Understand sunset, civil twilight, nautical twilight, astronomical twilight, and why latitude changes how long darkness takes to arrive.",
    summary: "Sunset is the start of twilight, not the start of full darkness. The three twilight boundaries describe the Sun at 6°, 12°, and 18° below the horizon.",
    topic: "sun-moon",
    published: "2026-09-19",
    modified: "2026-09-19",
    toolTab: "moonsun",
    toolLabel: "See today's twilight times",
    featureIds: ["twilight-timeline", "sun-altitude", "astronomical-night"],
    sources: [
      ["U.S. Naval Observatory — rise, set, and twilight definitions", "https://aa.usno.navy.mil/faq/RST_defs"],
      ["U.S. Naval Observatory — computing rise, set, and twilight", "https://aa.usno.navy.mil/faq/rs_algor"],
    ],
    related: ["stargazing-conditions", "milky-way-latitude", "moonlight-stargazing"],
    sections: [
      {
        id: "sunset-is-not-darkness",
        title: "Sunset is not full darkness",
        paragraphs: [
          "Sunset is conventionally calculated when the Sun's upper edge appears to meet a level horizon under average refraction. The Sun's center is already about 0.833° below the geometric horizon in that calculation. Scattered sunlight remains after sunset, producing twilight.",
          "Astronomers describe twilight by the geometric altitude of the Sun's center. Evening twilight ends as the Sun moves downward through each boundary; morning twilight begins as it moves upward through the same boundaries.",
        ],
      },
      {
        id: "three-stages",
        title: "The three twilight stages",
        html: `<div class="table-wrap"><table><thead><tr><th>Stage ends</th><th>Sun altitude</th><th>What the sky is like</th></tr></thead><tbody>
          <tr><td>Civil twilight</td><td>−6°</td><td>Outdoor detail remains visible; only bright celestial objects stand out.</td></tr>
          <tr><td>Nautical twilight</td><td>−12°</td><td>The horizon becomes difficult to distinguish; many stars are visible.</td></tr>
          <tr><td>Astronomical twilight</td><td>−18°</td><td>Scattered sunlight is generally below other natural night-sky sources.</td></tr>
        </tbody></table></div>`,
        paragraphs: [
          "These definitions describe solar geometry, not a promise about visual conditions. Clouds, aerosols, snow, the Moon, artificial light, elevation, and horizon obstructions all change what you actually see.",
        ],
      },
      {
        id: "latitude",
        title: "Why twilight lasts longer at higher latitudes",
        paragraphs: [
          "Near the equator, the Sun usually crosses the horizon at a relatively steep angle, so it moves through the twilight bands quickly. At higher latitudes its path can be shallow, stretching twilight for hours. Near a summer solstice the Sun may never reach −18°, so astronomical night does not occur even though the Sun sets.",
          "There is no single latitude north of which this happens all summer. The result changes through the year and has a southern-hemisphere counterpart. Use the date and location together rather than relying on a broad rule such as “north of 49°.”",
        ],
      },
      {
        id: "observing",
        title: "Which boundary matters for observing?",
        paragraphs: [
          "Bright planets and the Moon can be visible in daylight or civil twilight. Many constellations become useful during nautical twilight. Faint galaxies and the Milky Way benefit from astronomical darkness, but light pollution or moonlight can remain the limiting factor after astronomical twilight ends.",
          "CVAN's Moon & Sun timeline lists the relevant transitions for the selected location. If an event is absent, the Sun may not cross that altitude on that date; the app should report that state rather than inventing a time.",
        ],
      },
    ],
  },
  {
    slug: "milky-way-latitude",
    title: "How latitude changes Milky Way visibility",
    description: "Learn how latitude changes the Milky Way core's maximum altitude, direction, seasonal dark-sky window, and visibility in each hemisphere.",
    summary: "Latitude fixes how high the galactic center can climb. Season determines when that position overlaps darkness; it does not change the maximum transit altitude for a fixed location.",
    topic: "milky-way",
    published: "2026-09-19",
    modified: "2026-09-19",
    toolTab: "milkyway",
    toolLabel: "Calculate the Milky Way for your latitude",
    featureIds: ["milky-way-core-altitude", "milky-way-arch", "altitude-curve"],
    sources: [
      ["NASA — Milky Way overview", "https://science.nasa.gov/universe/galaxies/milky-way/"],
      ["IAU — Sagittarius A* and the Galactic Centre", "https://www.iau.org/public/themes/black_holes/"],
      ["U.S. Naval Observatory — altitude and azimuth", "https://aa.usno.navy.mil/faq/alt_az"],
    ],
    related: ["milky-way", "twilight", "light-pollution-maps"],
    sections: [
      {
        id: "two-constraints",
        title: "Latitude and season control different things",
        paragraphs: [
          "The photogenic Milky Way core lies toward Sagittarius at a declination close to −29°. For a fixed observing latitude, that declination fixes the core's idealized altitude when it crosses the local meridian. The calendar changes the time of day at which the crossing occurs, so season controls whether the core is up during darkness.",
          "This distinction prevents a common mistake: the core does not reach a different maximum altitude in July than in May from the same site. It reaches the same geometric transit altitude, but the amount of darkness and the clock time differ.",
        ],
      },
      {
        id: "calculation",
        title: "A useful altitude calculation",
        paragraphs: [
          "For an upper meridian transit, a simplified maximum-altitude calculation is <code>90° − |latitude − declination|</code>. Using −29° for the galactic center gives the illustrative values below. Terrain, refraction near the horizon, and the width of the Milky Way band are excluded.",
        ],
        html: `<div class="table-wrap"><table><thead><tr><th>Observer latitude</th><th>Approximate core altitude at upper transit</th><th>Interpretation</th></tr></thead><tbody>
          <tr><td>30° South</td><td>89°</td><td>Nearly overhead</td></tr>
          <tr><td>Equator</td><td>61°</td><td>High in the sky</td></tr>
          <tr><td>30° North</td><td>31°</td><td>Moderate southern altitude</td></tr>
          <tr><td>45° North</td><td>16°</td><td>Low in the south; horizon and extinction matter</td></tr>
          <tr><td>60° North</td><td>1°</td><td>Geometrically grazes a level horizon</td></tr>
        </tbody></table></div>`,
      },
      {
        id: "hemispheres",
        title: "What changes between hemispheres",
        paragraphs: [
          "Mid-southern latitudes can place the galactic center very high, while mid-northern observers look toward the south and see it lower. That does not mean the whole Southern Hemisphere sees it overhead, or that northern observers cannot see the Milky Way. The fainter band spans the sky far beyond the core region.",
          "At high latitudes the practical constraint can be darkness. Around the local summer solstice, astronomical twilight may last all night. Farther from the solstice, a low core may overlap a short dark window. Both the altitude curve and the twilight curve are needed.",
        ],
      },
      {
        id: "plan",
        title: "Plan from your actual horizon",
        paragraphs: [
          "Use CVAN to find when the core is above your local horizon and the Sun is below −18°. Then check moon altitude and clouds. At northern latitudes, prioritize an unobstructed southern horizon; at southern latitudes the direction changes through the night and the core may pass close to zenith.",
          "A computed altitude assumes a level astronomical horizon. Mountains, trees, buildings, haze, and light domes can remove a low-altitude opportunity entirely.",
        ],
      },
    ],
  },
  {
    slug: "kp-index",
    title: "Kp index explained: what it means for aurora",
    description: "Understand the 0–9 Kp index, observed and forecast values, approximate auroral latitude, and why Kp cannot guarantee a sighting.",
    summary: "Kp summarizes global geomagnetic activity on a 0–9 scale. It helps describe how far the auroral oval may expand, but it is not a personal aurora probability.",
    topic: "aurora",
    published: "2026-09-19",
    modified: "2026-09-19",
    toolTab: "aurora",
    toolLabel: "Compare current Kp with your location",
    featureIds: ["estimated-kp", "kp-forecast", "auroral-oval", "geomagnetic-latitude"],
    sources: [
      ["NOAA SWPC — tips on viewing the aurora", "https://www.spaceweather.gov/content/tips-viewing-aurora"],
      ["NOAA SWPC — planetary K-index", "https://www.swpc.noaa.gov/products/planetary-k-index"],
      ["NOAA SWPC — aurora 30-minute forecast", "https://www.spaceweather.gov/products/aurora-30-minute-forecast"],
    ],
    related: ["aurora", "twilight", "stargazing-conditions"],
    sections: [
      {
        id: "what-kp-is",
        title: "What Kp measures",
        paragraphs: [
          "Kp is a planetary index of disturbance in Earth's magnetic field. It combines standardized measurements from multiple ground magnetometers into a quasi-logarithmic scale from 0 to 9. Low values describe quiet conditions; higher values describe stronger global geomagnetic disturbance.",
          "A near-real-time estimated Kp value, a finalized observed value, and a forecast Kp value are different products. Always show the product type and timestamp. A forecast can change when the arriving solar wind differs from what models expected.",
        ],
      },
      {
        id: "latitude",
        title: "Kp and auroral latitude",
        paragraphs: [
          "NOAA gives a useful approximation: the equatorward edge of the auroral oval is near 66° geomagnetic latitude at Kp 0 and moves about 2° equatorward for each Kp level, reaching roughly 48° at Kp 9. NOAA also warns that this relationship represents averages and does not always hold exactly.",
          "The visible horizon extends beyond your location. During a bright display, an observer can sometimes see aurora hundreds of kilometers poleward of them. That is why a boundary map and a clear poleward horizon can be more useful than a single city threshold.",
        ],
      },
      {
        id: "not-probability",
        title: "Why Kp is not a sighting probability",
        paragraphs: [
          "Kp is global and three-hourly; aurora is structured, local, and fast-changing. A high Kp does not guarantee that the oval is over your longitude at the right moment. Daylight, twilight, clouds, moonlight, artificial light, and obstructions can hide an active display.",
          "NOAA's OVATION product estimates the oval's location and intensity from solar-wind inputs and normally provides roughly 30–90 minutes of lead time. Its map is a better short-term spatial guide, but it still should not be presented as a calibrated personal probability without the other observing factors.",
        ],
      },
      {
        id: "read-cvan",
        title: "How to read Kp in CVAN",
        paragraphs: [
          "Use the timestamp first. Compare estimated Kp with your geomagnetic latitude, then inspect the oval and day-night boundary. In the Northern Hemisphere, seek a clear view toward magnetic north when the oval is poleward; in the Southern Hemisphere, look toward magnetic south. If activity is overhead, aurora may appear in several directions.",
          "Recheck close to observing time. Treat the result as situational guidance, not a guarantee, and never drive or stop in an unsafe place for a forecast.",
        ],
      },
    ],
  },
  {
    slug: "light-pollution-maps",
    title: "How light-pollution maps estimate sky brightness",
    description: "Learn how VIIRS-based atlas tiles model artificial zenith brightness, how CVAN estimates SQM and Bortle class, and why missing data is not dark sky.",
    summary: "A light-pollution map is a model built from satellite-observed upward light and atmospheric scattering. It is not a live Sky Quality Meter reading or a visual Bortle assessment.",
    topic: "observing-conditions",
    published: "2026-09-19",
    modified: "2026-09-19",
    toolTab: "overview",
    toolLabel: "Estimate sky brightness for your location",
    featureIds: ["light-pollution-atlas", "sqm-estimate", "bortle-estimate"],
    sources: [
      ["David Lorenz — Light Pollution Atlas methodology", "https://djlorenz.github.io/astronomy/lp/"],
      ["Earth Observation Group — annual VIIRS nighttime lights", "https://eogdata.mines.edu/products/vnl/"],
      ["Sky & Telescope — introducing the Bortle dark-sky scale", "https://skyandtelescope.org/astronomy-resources/light-pollution-and-astronomy-the-bortle-dark-sky-scale/"],
    ],
    related: ["bortle-scale", "stargazing-conditions", "milky-way-latitude"],
    sections: [
      {
        id: "what-map-shows",
        title: "What the atlas actually shows",
        paragraphs: [
          "The Lorenz Light Pollution Atlas uses annual cloud-free nighttime light data derived from NOAA's VIIRS instrument as an input to an atmospheric light-transfer model. The model estimates how artificial ground light is scattered back toward an observer. The map represents modeled artificial sky brightness at the zenith under its assumptions.",
          "It is not a direct measurement at your observing site and it is not a live weather layer. The annual input smooths short-term changes; the model cannot see the lamp beside your tripod, a temporary event, wildfire smoke, fresh snow, or a blocked horizon.",
        ],
      },
      {
        id: "cvan-pipeline",
        title: "How CVAN turns a map pixel into an estimate",
        paragraphs: [
          "CVAN converts latitude and longitude to the atlas' Web Mercator tile and samples the corresponding pixel. The palette color maps to an atlas zone and an estimated ratio of artificial to natural background brightness. It then combines the components using <code>SQM = 22.0 − 2.5 × log10(1 + ratio)</code> and bins the result into an approximate Bortle class.",
          "Example: if artificial brightness equals the assumed natural background, the ratio is 1. Total brightness is twice the natural background, so the estimate is about 21.25 mag/arcsec². Because astronomical magnitudes run backward, a smaller SQM number means a brighter sky.",
        ],
      },
      {
        id: "bortle-difference",
        title: "Why a modeled class is only approximate",
        paragraphs: [
          "The Bortle scale is a visual classification based on the appearance of the whole sky and celestial features. A zenith-brightness model covers only part of that experience. The atlas author explicitly warns against treating map colors as the Bortle scale itself.",
          "CVAN labels the class as an estimate so readers can compare locations in familiar terms. For serious site evaluation, make repeat measurements with a calibrated meter and record transparency, weather, nearby lighting, direction, and time.",
        ],
      },
      {
        id: "unknown-data",
        title: "Missing data must stay unknown",
        paragraphs: [
          "A failed tile request, an unsupported latitude, or a no-data pixel does not demonstrate pristine conditions. CVAN now reports the atlas as unavailable and excludes light pollution from its score instead of converting an error into Bortle 1.",
          "When the atlas is available, use it to compare broad areas, then verify the exact site safely in person. A dark pixel does not establish public access, road safety, legal nighttime entry, or a clear horizon.",
        ],
      },
    ],
  },
  {
    slug: "moonlight-stargazing",
    title: "How moonlight affects stargazing",
    description: "See how lunar phase, altitude, angular separation, atmospheric scattering, and moonrise or moonset affect the night sky.",
    summary: "Moon phase is only one part of lunar skyglow. The Moon's altitude and timing often decide whether a night has a useful dark window.",
    topic: "sun-moon",
    published: "2026-09-19",
    modified: "2026-09-19",
    toolTab: "moonsun",
    toolLabel: "Check the Moon's altitude and timing",
    featureIds: ["moon-phase", "moon-altitude", "moon-brightness", "moonrise-moonset"],
    sources: [
      ["U.S. Naval Observatory — phases of the Moon", "https://aa.usno.navy.mil/faq/moon_phases"],
      ["U.S. Naval Observatory — rise, set, and twilight definitions", "https://aa.usno.navy.mil/faq/RST_defs"],
      ["Krisciunas & Schaefer (1991) — model of moonlight", "https://ui.adsabs.harvard.edu/abs/1991PASP..103.1033K/abstract"],
    ],
    related: ["twilight", "stargazing-conditions", "milky-way"],
    sections: [
      {
        id: "phase-is-not-enough",
        title: "Phase is not enough",
        paragraphs: [
          "Illumination tells you how much of the Moon's visible disk is sunlit, but it does not tell you whether the Moon is above your horizon. A nearly full Moon that rises after your planned session may not interfere. A quarter Moon high beside a faint target can matter more than its percentage suggests.",
          "The Moon's angular separation from the target also changes scattered light in the line of sight. Haze and thin cloud spread moonlight across more of the sky, sometimes making a moderately illuminated Moon surprisingly damaging.",
        ],
      },
      {
        id: "targets",
        title: "Different targets respond differently",
        paragraphs: [
          "Low-contrast extended objects such as the Milky Way, faint galaxies, and nebulae lose detail quickly as the background brightens. Stars, compact clusters, the Moon itself, and bright planets retain more contrast. A moonlit night can therefore remain productive with a revised target list.",
          "For photography, moonlight can be a problem or a lighting tool. It may reduce faint dust detail while illuminating a landscape foreground. Composition, direction, and the desired result decide whether that is helpful.",
        ],
      },
      {
        id: "timing",
        title: "Find the dark interval",
        paragraphs: [
          "Compare four timelines: astronomical darkness, Moon altitude, target altitude, and clouds. The useful interval is their overlap. Around new Moon the dark interval is often long, but a crescent can also leave hours of moonless darkness before moonrise or after moonset.",
          "Rise and set times assume a level horizon and average refraction. Hills, buildings, elevation, and unusual atmospheric conditions can shift the observed moment. CVAN's times are planning estimates rather than field guarantees.",
        ],
      },
      {
        id: "cvan-model",
        title: "What CVAN's moon-brightness number means",
        paragraphs: [
          "CVAN uses a model based on the Moon's phase and altitude to estimate its contribution to sky brightness. Treat thresholds in the interface as observing heuristics. A single number cannot incorporate every aerosol, cloud, snow, or target-separation condition at your site.",
          "Use the 36-hour altitude curve to find when the Moon is well below the horizon. Then confirm its rise or set time and compare that window with the target and weather forecast.",
        ],
      },
    ],
  },
];

export const topics = {
  "observing-conditions": {
    title: "Observing conditions",
    description: "Darkness, clouds, moonlight, sky brightness, and the practical limits of forecasts.",
  },
  "milky-way": {
    title: "Milky Way",
    description: "The geometry, timing, darkness, and location choices behind a successful Milky Way session.",
  },
  aurora: {
    title: "Aurora and space weather",
    description: "The science and forecast signals behind northern and southern lights.",
  },
  "sun-moon": {
    title: "Sun, Moon, and twilight",
    description: "How solar and lunar geometry changes light, darkness, and observing windows.",
  },
};
