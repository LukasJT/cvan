/* Light pollution lookup — reads djlorenz's per-year VIIRS-derived atlas tiles.
   Source: https://djlorenz.github.io/astronomy/lp/
   Tiles: https://djlorenz.github.io/astronomy/image_tiles/tiles{YEAR}/tile_{z}_{x}_{y}.png
   Native tile size 1024×1024 PNG, max native zoom 6, CORS-enabled.

   Each tile is paletted with up to 16 colors; an RGB→zone lookup maps each
   color to a Light Pollution Zone, and the zone to a Light Pollution Index
   (LPI = artificial/natural sky brightness). LPI is then converted to SQM
   and Bortle class. */

import { BORTLE } from "./astro.js";

export const LP_TILE_YEAR = 2024;
export const LP_TILE_BASE = `https://djlorenz.github.io/astronomy/image_tiles/tiles${LP_TILE_YEAR}`;
const NATIVE_Z = 6;
const TILE_PX = 1024;

/* Zone → LPI center. Each subzone is a factor of √3 wide in LPI; full zone
   step is ×3. Boundary 3b/4a is LPI=1. Zone-N subzone-X center =
   3^((N-4) + (X==='b' ? 0.5 : 0) + 0.25). Zones 8/9 (rare in tiles, would
   render as white) are extrapolated; zone 0 is pristine. */
function zoneCenterLPI(n, sub) {
  if (n === 0) return 0;
  const offset = sub === "b" ? 0.5 : 0;
  return Math.pow(3, n - 4 + offset + 0.25);
}

/* RGB triplets pulled directly from the published tile palettes (verified
   against the colorbar.png and a sampled NYC tile). Indexed by joined
   "r,g,b" string for O(1) lookup. */
const ZONE_TABLE = [
  { rgb: [0, 0, 0],       n: 0, sub: "" },
  { rgb: [34, 34, 34],    n: 1, sub: "a" },
  { rgb: [66, 66, 66],    n: 1, sub: "b" },
  { rgb: [20, 47, 114],   n: 2, sub: "a" },
  { rgb: [33, 84, 216],   n: 2, sub: "b" },
  { rgb: [15, 87, 20],    n: 3, sub: "a" },
  { rgb: [31, 161, 42],   n: 3, sub: "b" },
  { rgb: [110, 100, 30],  n: 4, sub: "a" },
  { rgb: [184, 166, 37],  n: 4, sub: "b" },
  { rgb: [191, 100, 30],  n: 5, sub: "a" },
  { rgb: [253, 150, 80],  n: 5, sub: "b" },
  { rgb: [251, 90, 73],   n: 6, sub: "a" },
  { rgb: [251, 153, 138], n: 6, sub: "b" },
  { rgb: [160, 160, 160], n: 7, sub: "a" },
  { rgb: [242, 242, 242], n: 7, sub: "b" },
];

const RGB_INDEX = new Map(
  ZONE_TABLE.map(({ rgb, n, sub }) => [
    rgb.join(","),
    { n, sub, label: `${n}${sub}`, lpi: zoneCenterLPI(n, sub) },
  ])
);

/* Nearest-color fallback for any RGB not exactly in the palette
   (e.g. half-pixel sampling artefacts at tile boundaries). */
function nearestZone(r, g, b) {
  let best = null;
  let bestD = Infinity;
  for (const entry of ZONE_TABLE) {
    const dr = entry.rgb[0] - r;
    const dg = entry.rgb[1] - g;
    const db = entry.rgb[2] - b;
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) {
      bestD = d;
      best = entry;
    }
  }
  return {
    n: best.n,
    sub: best.sub,
    label: `${best.n}${best.sub}`,
    lpi: zoneCenterLPI(best.n, best.sub),
  };
}

export function rgbToZone(r, g, b) {
  // Pure white = no-data marker (out-of-bounds in some tiles); treat as zone 0.
  if (r === 255 && g === 255 && b === 255) {
    return { n: 0, sub: "", label: "0", lpi: 0 };
  }
  const exact = RGB_INDEX.get(`${r},${g},${b}`);
  if (exact) return exact;
  return nearestZone(r, g, b);
}

/* Web-Mercator XYZ tile coords. Returns floating tile + pixel positions. */
export function latLonToTilePixel(lat, lon, z = NATIVE_Z, tilePx = TILE_PX) {
  const n = 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  return {
    tileX,
    tileY,
    pxX: Math.max(0, Math.min(tilePx - 1, Math.floor((x - tileX) * tilePx))),
    pxY: Math.max(0, Math.min(tilePx - 1, Math.floor((y - tileY) * tilePx))),
  };
}

/* LPI → SQM. With natural sky brightness reference 22.0 mag/arcsec², total
   brightness = (1 + LPI) × natural, so SQM_total = 22.0 − 2.5·log10(1+LPI). */
export function lpiToSqm(lpi) {
  return 22.0 - 2.5 * Math.log10(1 + Math.max(0, lpi));
}

export function sqmToBortle(sqm) {
  for (const b of BORTLE) {
    if (sqm >= b.sqmMin && sqm < b.sqmMax) return b.c;
    if (sqm >= b.sqmMax && b.c === 1) return 1;
  }
  return 9;
}

/* Loads the tile, draws it to an offscreen canvas, samples one pixel, and
   returns the resolved zone. A 404 means djlorenz published no tile for
   this region (no detected light pollution): we treat that as zone 0. */
function loadTilePixel(tileX, tileY, pxX, pxY) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const sx = Math.min(canvas.width - 1, Math.round((pxX / TILE_PX) * canvas.width));
        const sy = Math.min(canvas.height - 1, Math.round((pxY / TILE_PX) * canvas.height));
        const data = ctx.getImageData(sx, sy, 1, 1).data;
        resolve({ r: data[0], g: data[1], b: data[2], a: data[3] });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      // 404 / network error → treat as no data (pristine).
      resolve(null);
    };
    img.src = `${LP_TILE_BASE}/tile_${NATIVE_Z}_${tileX}_${tileY}.png`;
  });
}

export async function fetchLightPollutionAt(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("invalid coordinates");
  }
  if (lat > 80 || lat < -80) {
    // Outside djlorenz's coverage. Polar regions are dark; report pristine.
    const lpi = 0;
    return {
      bortle: 1,
      sqm: 22.0,
      lpi,
      zone: "0",
      year: LP_TILE_YEAR,
      outOfRange: true,
    };
  }
  const { tileX, tileY, pxX, pxY } = latLonToTilePixel(lat, lon);
  const px = await loadTilePixel(tileX, tileY, pxX, pxY);
  const zone = px ? rgbToZone(px.r, px.g, px.b) : { n: 0, sub: "", label: "0", lpi: 0 };
  const sqm = lpiToSqm(zone.lpi);
  const bortle = sqmToBortle(sqm);
  return {
    bortle,
    sqm,
    lpi: zone.lpi,
    zone: zone.label,
    year: LP_TILE_YEAR,
    tileMissing: !px,
  };
}
