import { KP_VIEW_LAT, fmtDeg, predictNextMilkyWayWindow, MOON_NEGLIGIBLE_ALT_DEG, geomagneticLatitude, fmtTime } from "./astro.js";

export function cloudVerdict(c) {
  if (c == null) return "unknown";
  if (c < 20) return "clear";
  if (c < 50) return "partly cloudy";
  if (c < 80) return "mostly cloudy";
  return "overcast";
}

export function milkyWayVerdict(sky, bortle, cloud, curve) {
  if (bortle >= 7) return {
    rating: "INVISIBLE",
    color: "var(--error)",
    text: `Bortle ${bortle} sky overwhelms the Milky Way entirely. Travel to darker sky required.`,
  };

  // If currently below horizon — predict next 12h window.
  if (sky.coreHz.alt < 0) {
    const next = predictNextMilkyWayWindow(curve, bortle, 12);
    if (next) {
      return {
        rating: "BELOW HORIZON",
        color: "var(--text-muted)",
        text: `Galactic core not above horizon now. Next viewable window: ${fmtTime(next.start)} (core reaches ${fmtDeg(next.coreAlt)}).`,
        note: "Best from May–September in the N. hemisphere; summer months in the S.",
      };
    }
    return {
      rating: "BELOW HORIZON",
      color: "var(--text-muted)",
      text: "Galactic core not above horizon in the next 12 hours. Check seasonal availability — best from May–September in the N. hemisphere.",
    };
  }

  if (sky.tw.code !== "night") {
    const next = predictNextMilkyWayWindow(curve, bortle, 12);
    if (next) {
      return {
        rating: "WAIT",
        color: "var(--warning)",
        text: `Currently ${sky.tw.name}. Viewing window opens around ${fmtTime(next.start)} (core at ${fmtDeg(next.coreAlt)}).`,
      };
    }
    return {
      rating: "WAIT",
      color: "var(--warning)",
      text: `Currently ${sky.tw.name}. Galactic core needs astronomical night for best contrast.`,
    };
  }
  if (sky.moonBrightness > 1.5) {
    return {
      rating: "WASHED OUT",
      color: "var(--warning)",
      text: "Moon is too bright. Wait for moonset or a darker phase.",
    };
  }
  if (cloud != null && cloud > 60) {
    return { rating: "CLOUDED", color: "var(--warning)", text: `${cloud}% cloud cover blocking view.` };
  }
  if (bortle <= 3) {
    return { rating: "EXCELLENT", color: "var(--accent-green)", text: "Dark sky + core up + clear: structured Milky Way visible naked-eye." };
  }
  return { rating: "VISIBLE", color: "var(--accent-gold)", text: "Core overhead and conditions reasonable. Suburbs see only the brightest sections." };
}

export function auroraVerdict(aurora, lat, cloud, geomagLat) {
  if (!aurora) return { rating: "NO DATA", color: "var(--text-muted)", text: "NOAA SWPC feed unavailable." };
  const kp = aurora.kp;
  const threshold = KP_VIEW_LAT[Math.floor(kp)] ?? 50;
  // Use geomagnetic latitude when provided (more accurate than geographic).
  const compareLat = Math.abs(geomagLat ?? lat);
  if (compareLat < threshold - 3) {
    return {
      rating: "TOO FAR FROM POLE",
      color: "var(--text-muted)",
      text: `Kp=${kp.toFixed(1)} requires ~${threshold}° geomagnetic latitude. You're at ${compareLat.toFixed(1)}° geomag${geomagLat != null ? "" : " (using geographic)"}.`,
    };
  }
  if (cloud != null && cloud > 70) {
    return { rating: "CLOUDED OUT", color: "var(--warning)", text: `Kp=${kp.toFixed(1)} is workable but ${cloud}% clouds will block view.` };
  }
  if (kp >= 5) {
    return { rating: "STORM IN PROGRESS", color: "var(--accent-green)", text: `Kp=${kp.toFixed(1)} — geomagnetic storm. Aurora likely visible from your latitude.` };
  }
  if (compareLat >= threshold) {
    return { rating: "POSSIBLE", color: "var(--accent-gold)", text: `Kp=${kp.toFixed(1)} and you're at viewing latitude. Look toward magnetic north.` };
  }
  return { rating: "QUIET", color: "var(--text-muted)", text: `Kp=${kp.toFixed(1)} — no significant aurora activity expected.` };
}

export function auroraVerdictShort(kp, lat, geomagLat) {
  const threshold = KP_VIEW_LAT[Math.floor(kp)] ?? 50;
  const compareLat = Math.abs(geomagLat ?? lat);
  if (compareLat >= threshold) return "viewable";
  if (kp >= 5) return "elevated";
  return "quiet";
}

export function deepSkyVerdict(sky, bortle, cloud) {
  if (sky.tw.code !== "night" && sky.tw.code !== "astro") {
    return { rating: "WAIT FOR NIGHT", color: "var(--text-muted)", text: `${sky.tw.name} — DSO observation needs astronomical night.` };
  }
  if (cloud != null && cloud > 60) return { rating: "CLOUDED", color: "var(--warning)", text: `${cloud}% cloud cover.` };
  if (bortle <= 3) return { rating: "EXCELLENT", color: "var(--accent-green)", text: "All Messier objects accessible; faint nebulae visible in modest scopes." };
  if (bortle <= 5) return { rating: "GOOD", color: "var(--accent-gold)", text: "Bright Messier targets, galaxies, and clusters visible. Faint nebulae harder." };
  if (bortle <= 7) return { rating: "LIMITED", color: "var(--warning)", text: "Only the brightest globulars, M31, and open clusters. Galaxies challenging." };
  return { rating: "POOR", color: "var(--error)", text: "Severe light pollution; only Moon, planets, brightest stars/clusters." };
}

export function constellationVerdict(c, sky, bortle, cloud) {
  if (c.alt < 0) return { rating: "DOWN", color: "var(--text-subtle)", note: "Below horizon — wait for it to rise or check seasonal availability." };
  if (c.alt < 10) return { rating: "LOW", color: "var(--text-muted)", note: "Very low altitude — atmospheric extinction will make it difficult." };
  if (sky.tw.code === "day") return { rating: "DAYTIME", color: "var(--text-subtle)", note: "" };
  if (sky.tw.code === "civil") return { rating: "TWILIGHT", color: "var(--warning)", note: "Only the very brightest stars visible." };
  if (cloud != null && cloud > 70) return { rating: "CLOUDED", color: "var(--warning)", note: `${cloud}% cloud cover.` };
  if (bortle >= 8 && c.brightStars && !c.brightStars.match(/Sirius|Vega|Arcturus|Capella|Betelgeuse|Rigel|Aldebaran|Antares|Altair|Procyon|Deneb/)) {
    return { rating: "WASHED OUT", color: "var(--warning)", note: "Inner-city sky — only the very brightest stars in this constellation will be visible." };
  }
  if (sky.moonBrightness > 2 && c.alt < 30) return { rating: "MOON-WASHED", color: "var(--warning)", note: "Bright moon overwhelms low-altitude stars." };
  if (c.alt > 60) return { rating: "EXCELLENT", color: "var(--accent-green)", note: "High overhead — best position for viewing." };
  return { rating: "VISIBLE", color: "var(--accent-gold)", note: "" };
}
