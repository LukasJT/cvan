import { KP_VIEW_LAT, fmtDeg, predictNextMilkyWayWindow, MOON_NEGLIGIBLE_ALT_DEG, geomagneticLatitude, fmtTime } from "./astro.js";

export function cloudVerdict(c) {
  if (c == null) return "unknown";
  if (c < 20) return "clear";
  if (c < 50) return "partly cloudy";
  if (c < 80) return "mostly cloudy";
  return "overcast";
}

export function milkyWayVerdict(sky, bortle, cloud, curve) {
  if (!Number.isFinite(bortle)) return {
    rating: "LIGHT DATA UNKNOWN",
    color: "var(--text-muted)",
    text: "The light-pollution atlas is unavailable, so CVAN cannot give a complete Milky Way verdict for this location.",
  };
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
        note: "The useful season depends on latitude and on when darkness overlaps the core's position.",
      };
    }
    return {
      rating: "BELOW HORIZON",
      color: "var(--text-muted)",
      text: "Galactic core not above the horizon in the next 12 hours. Its seasonal night-time window depends on your latitude.",
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
  return { rating: "VISIBLE", color: "var(--accent-gold)", text: "The core is above the horizon and conditions are reasonable. Its altitude and local light pollution determine how much structure you can see." };
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
      text: `At Kp=${kp.toFixed(1)}, the approximate oval boundary is near ${threshold}° geomagnetic latitude. You're at ${compareLat.toFixed(1)}°${geomagLat != null ? " geomagnetic" : " geographic"}; bright aurora can sometimes be seen beyond the oval toward the nearest magnetic pole.`,
    };
  }
  if (cloud != null && cloud > 70) {
    return { rating: "CLOUD LIMITED", color: "var(--warning)", text: `Kp=${kp.toFixed(1)} may be workable, but ${cloud}% forecast cloud cover substantially reduces the chance of a clear view.` };
  }
  if (kp >= 5) {
    return { rating: "ELEVATED ACTIVITY", color: "var(--accent-green)", text: `Estimated Kp=${kp.toFixed(1)} indicates elevated geomagnetic activity. Visibility still depends on the auroral oval, darkness, clouds, and a clear view toward the nearest magnetic pole.` };
  }
  if (compareLat >= threshold) {
    const direction = lat < 0 ? "south" : "north";
    return { rating: "POSSIBLE", color: "var(--accent-gold)", text: `Estimated Kp=${kp.toFixed(1)} places you near the approximate viewing zone. From this hemisphere, start with a clear view toward magnetic ${direction}.` };
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

/* Visibility verdict for an individual planet. `snap` is the geocentric
   snapshot (alt, az, magnitude, etc.); `sky` is the full sky context for
   sun altitude, twilight class, moon altitude. */
export function planetVerdict(snap, sky, cloud) {
  if (!snap || snap.alt == null) {
    return { rating: "NO DATA", color: "var(--text-muted)", text: "Observer location not set." };
  }

  if (snap.alt < 0) {
    return {
      rating: "BELOW HORIZON",
      color: "var(--text-muted)",
      text: `Currently ${Math.abs(snap.alt).toFixed(0)}° below the horizon — wait for it to rise.`,
    };
  }

  // Daytime — most planets washed out, but Venus and very bright Jupiter
  // can be picked up naked-eye if you know exactly where to look.
  if (sky?.tw?.code === "day") {
    if (snap.magnitude < -3.0) {
      return {
        rating: "DAYLIGHT NAKED-EYE",
        color: "var(--accent-gold)",
        text: `Mag ${snap.magnitude.toFixed(1)} — bright enough to find naked-eye in daytime if you know where to look. Use the sun for triangulation; never sweep the area with binoculars.`,
      };
    }
    return {
      rating: "DAYLIGHT",
      color: "var(--text-muted)",
      text: "Sun is up — wait for civil/nautical twilight before looking.",
    };
  }

  if (snap.alt < 10) {
    return {
      rating: "VERY LOW",
      color: "var(--warning)",
      text: `Only ${snap.alt.toFixed(0)}° above the horizon — heavy atmospheric extinction. Wait for it to climb higher.`,
    };
  }

  if (cloud != null && cloud > 70) {
    return { rating: "CLOUDED", color: "var(--warning)", text: `${cloud}% cloud cover blocking view.` };
  }

  if (snap.magnitude > 6.0) {
    return {
      rating: "TELESCOPE",
      color: "var(--accent-gold)",
      text: `Mag ${snap.magnitude.toFixed(1)} — fainter than the naked-eye limit (~6.5). Binoculars or small scope needed.`,
    };
  }

  if (snap.alt > 45) {
    return {
      rating: "EXCELLENT",
      color: "var(--accent-green)",
      text: `${snap.alt.toFixed(0)}° altitude, mag ${snap.magnitude.toFixed(1)} — well above atmospheric haze. Prime viewing.`,
    };
  }

  return {
    rating: "VISIBLE",
    color: "var(--accent-gold)",
    text: `${snap.alt.toFixed(0)}° altitude, mag ${snap.magnitude.toFixed(1)} — visible naked-eye.`,
  };
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
