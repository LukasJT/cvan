import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchLightPollutionAt,
  latLonToTilePixel,
  lpiToSqm,
  rgbToZone,
  sqmToBortle,
} from "../src/lightPollution.js";

test("white atlas pixels remain unknown", () => {
  assert.equal(rgbToZone(255, 255, 255), null);
});

test("known palette colors retain their atlas zone", () => {
  assert.deepEqual(rgbToZone(20, 47, 114), {
    n: 2,
    sub: "a",
    label: "2a",
    lpi: Math.pow(3, -1.75),
  });
});

test("LPI conversion includes natural background light", () => {
  assert.equal(lpiToSqm(0), 22);
  assert.ok(Math.abs(lpiToSqm(1) - 21.2474) < 0.001);
  assert.equal(sqmToBortle(22), 1);
});

test("tile coordinates remain bounded at valid map edges", () => {
  const west = latLonToTilePixel(0, -180);
  const east = latLonToTilePixel(0, 179.999);
  assert.equal(west.tileX, 0);
  assert.equal(east.tileX, 63);
});

test("coordinates outside atlas coverage are unknown", async () => {
  await assert.rejects(() => fetchLightPollutionAt(81, 0), {
    name: "RangeError",
    message: "light-pollution-atlas-out-of-coverage",
  });
});
