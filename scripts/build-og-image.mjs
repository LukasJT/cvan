/* Render public/og-image.svg → public/og-image.png at 1200 × 630.
   One-shot script — run with `node scripts/build-og-image.mjs` whenever the
   SVG source changes. The output PNG is committed to the repo so the OG
   image is served directly from the static site. */
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const svg = readFileSync("public/og-image.svg", "utf8");
const resvg = new Resvg(svg, {
  background: "#050914",
  font: {
    loadSystemFonts: true,
  },
});
const png = resvg.render().asPng();
writeFileSync("public/og-image.png", png);
console.log(`og-image.png written — ${(png.length / 1024).toFixed(1)} KB`);
