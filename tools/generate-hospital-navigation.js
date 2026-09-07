#!/usr/bin/env node

// Development-time generator for the Hospital prototype navigation artifact.
// The authoring PNG is the only gameplay source; this script converts its
// exact semantic pixels into a synchronous zero-build runtime package.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "assets", "hospital", "hospital_walkable.png");
const outputPath = path.join(root, "map", "hospital-navigation.generated.js");
const EXPECTED_WIDTH = 1672;
const EXPECTED_HEIGHT = 941;
const SOURCE_NAME = "hospital_walkable.png";

function fail(message) {
  throw new Error(`[hospital-navigation] ${message}`);
}

function readPng() {
  let input;
  try {
    input = fs.readFileSync(sourcePath);
  } catch (error) {
    fail(`cannot read ${SOURCE_NAME}: ${error.message}`);
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!input.subarray(0, 8).equals(signature)) fail(`${SOURCE_NAME} is not a PNG`);
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  let offset = 8;
  while (offset + 12 <= input.length) {
    const length = input.readUInt32BE(offset);
    const type = input.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > input.length) fail(`${SOURCE_NAME} contains a truncated ${type} chunk`);
    const data = input.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      if (length !== 13) fail(`${SOURCE_NAME} has an invalid IHDR`);
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }
  if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) fail(`${SOURCE_NAME} must be exactly ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}, got ${width}x${height}`);
  if (bitDepth !== 8) fail(`${SOURCE_NAME} must use 8-bit channels, got bit depth ${bitDepth}`);
  if (colorType !== 6) fail(`${SOURCE_NAME} must use RGBA color type 6, got ${colorType}`);
  if (interlace !== 0) fail(`${SOURCE_NAME} must not be interlaced`);
  if (!idat.length) fail(`${SOURCE_NAME} has no image data`);

  const channels = 4;
  const stride = width * channels;
  const filtered = zlib.inflateSync(Buffer.concat(idat));
  const expectedLength = height * (stride + 1);
  if (filtered.length !== expectedLength) fail(`${SOURCE_NAME} has an unexpected decompressed size`);
  const rows = Buffer.alloc(height * stride);
  let inputOffset = 0;
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y += 1) {
    const filter = filtered[inputOffset++];
    if (filter > 4) fail(`${SOURCE_NAME} uses unsupported PNG filter ${filter}`);
    const rowStart = y * stride;
    const priorStart = (y - 1) * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = filtered[inputOffset++];
      const left = x >= channels ? rows[rowStart + x - channels] : 0;
      const up = y > 0 ? rows[priorStart + x] : 0;
      const upperLeft = y > 0 && x >= channels ? rows[priorStart + x - channels] : 0;
      rows[rowStart + x] = (raw + (
        filter === 0 ? 0 :
        filter === 1 ? left :
        filter === 2 ? up :
        filter === 3 ? Math.floor((left + up) / 2) :
        paeth(left, up, upperLeft)
      )) & 255;
    }
  }
  const pixels = new Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      pixels[y * width + x] = { r: rows[index], g: rows[index + 1], b: rows[index + 2], a: rows[index + 3] };
    }
  }
  return { input, width, height, pixels };
}

function classify(pixel) {
  if (pixel.a !== 255) return 0;
  if (pixel.r === 255 && pixel.g === 255 && pixel.b === 255) return 1;
  if (pixel.r === 255 && pixel.g === 0 && pixel.b === 255) return 2;
  if (pixel.r === 0 && pixel.g === 255 && pixel.b === 255) return 3;
  return 0;
}

function connectedComponents(mask, value) {
  const width = EXPECTED_WIDTH;
  const height = EXPECTED_HEIGHT;
  const seen = new Uint8Array(mask.length);
  const components = [];
  for (let index = 0; index < mask.length; index += 1) {
    if (seen[index] || mask[index] !== value) continue;
    const queue = [index];
    seen[index] = 1;
    let head = 0;
    let count = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let sumX = 0;
    let sumY = 0;
    while (head < queue.length) {
      const current = queue[head++];
      const x = current % width;
      const y = Math.floor(current / width);
      count += 1;
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const next = ny * width + nx;
        if (!seen[next] && mask[next] === value) {
          seen[next] = 1;
          queue.push(next);
        }
      }
    }
    components.push({
      count,
      bbox: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
      centroid: { x: Math.round(sumX / count), y: Math.round(sumY / count) },
      anchor: { x: Math.round((minX + maxX) / 2), y: maxY },
    });
  }
  return components.sort((left, right) => right.count - left.count);
}

function encodeRle(values) {
  const bytes = [];
  let value = values[0];
  let run = 1;
  const flush = () => {
    let count = run;
    while (count >= 128) {
      bytes.push((count & 127) | 128);
      count >>>= 7;
    }
    bytes.push(count);
    bytes.push(value);
  };
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] === value && run < 0x0fffffff) run += 1;
    else {
      flush();
      value = values[index];
      run = 1;
    }
  }
  flush();
  return Buffer.from(bytes).toString("base64");
}

function wrapBase64(value) {
  const parts = [];
  for (let index = 0; index < value.length; index += 120) parts.push(value.slice(index, index + 120));
  return parts.length ? parts.map((part) => `    "${part}"`).join(" +\n") : '    ""';
}

function createPackage(image, classes) {
  const regions = {
    npc: connectedComponents(classes, 2),
    exit: connectedComponents(classes, 3),
  };
  for (const [name, list] of Object.entries(regions)) if (!list.length) fail(`${SOURCE_NAME} must contain a ${name} authored region`);
  return {
    source: {
      filename: SOURCE_NAME,
      width: image.width,
      height: image.height,
      sha256: crypto.createHash("sha256").update(image.input).digest("hex"),
    },
    coordinate_system: "original image pixels; origin top-left; x right, y down; pixel regions use exact source coordinates",
    authoring: {
      image: "assets/hospital/hospital_walkable.png",
      colors: { white: [255, 255, 255], magenta: [255, 0, 255], cyan: [0, 255, 255] },
      matching: "exact opaque RGB colors only; all other pixels are non-authored",
    },
    rendering: "hospital.png is the only player-visible Hospital environment; authoring image is never rendered",
    movement_rule: "A feet disk must be completely inside exact white walkable pixels or the exact cyan exit region. The exact magenta NPC region is occupied and never walkable. All other pixels are blocked.",
    feet_radius_px: 3,
    regions,
  };
}

function render(packageData, masks) {
  return `/*
 * DO NOT EDIT MANUALLY.
 * GENERATED FROM assets/hospital/hospital_walkable.png.
 * This synchronous artifact exists for the zero-build/file:// runtime.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternHospitalNavigationGenerated = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PACKAGE = ${JSON.stringify(packageData, null, 2)};
  const WIDTH = ${EXPECTED_WIDTH};
  const HEIGHT = ${EXPECTED_HEIGHT};
  const MASK_RLE = {
    white: ${wrapBase64(encodeRle(masks.white))},
    magenta: ${wrapBase64(encodeRle(masks.magenta))},
    cyan: ${wrapBase64(encodeRle(masks.cyan))},
  };

  function decodeBase64(value) {
    if (typeof atob === "function") {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return bytes;
    }
    if (typeof Buffer !== "undefined") return Uint8Array.from(Buffer.from(value, "base64"));
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const bytes = [];
    let buffer = 0;
    let bits = 0;
    for (const character of value) {
      if (character === "=") break;
      const digit = alphabet.indexOf(character);
      if (digit < 0) continue;
      buffer = (buffer << 6) | digit;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((buffer >> bits) & 255);
      }
    }
    return Uint8Array.from(bytes);
  }

  function decodeRle(value) {
    const encoded = decodeBase64(value);
    const result = new Uint8Array(WIDTH * HEIGHT);
    let source = 0;
    let target = 0;
    while (source < encoded.length) {
      let count = 0;
      let shift = 0;
      do {
        if (source >= encoded.length || shift > 28) throw new Error("Malformed Hospital navigation RLE");
        const byte = encoded[source++];
        count |= (byte & 127) << shift;
        shift += 7;
        if (!(byte & 128)) break;
      } while (true);
      if (!count || source >= encoded.length || target + count > result.length) throw new Error("Invalid Hospital navigation RLE span");
      result.fill(encoded[source++], target, target + count);
      target += count;
    }
    if (target !== result.length) throw new Error("Incomplete Hospital navigation RLE");
    return result;
  }

  return Object.freeze({
    package: PACKAGE,
    width: WIDTH,
    height: HEIGHT,
    masks: Object.freeze({ white: decodeRle(MASK_RLE.white), magenta: decodeRle(MASK_RLE.magenta), cyan: decodeRle(MASK_RLE.cyan) }),
  });
});
`;
}

function main() {
  const image = readPng();
  const classes = image.pixels.map(classify);
  const masks = {
    white: classes.map((value) => value === 1 ? 1 : 0),
    magenta: classes.map((value) => value === 2 ? 1 : 0),
    cyan: classes.map((value) => value === 3 ? 1 : 0),
  };
  const packageData = createPackage(image, classes);
  const output = render(packageData, masks);
  if (process.argv.includes("--check")) {
    let committed;
    try { committed = fs.readFileSync(outputPath, "utf8"); } catch (error) { fail(`cannot read generated output for check: ${error.message}`); }
    if (committed !== output) fail("generated output is stale; run npm run generate:hospital-navigation");
    console.log(`Checked ${path.relative(root, outputPath)}`);
    return;
  }
  fs.writeFileSync(outputPath, output, "utf8");
  console.log(`Generated ${path.relative(root, outputPath)} from ${path.relative(root, sourcePath)}`);
  console.log(`Regions: white=${masks.white.reduce((sum, value) => sum + value, 0)}, magenta=${masks.magenta.reduce((sum, value) => sum + value, 0)}, cyan=${masks.cyan.reduce((sum, value) => sum + value, 0)}`);
  console.log(`NPC anchor=${JSON.stringify(packageData.regions.npc[0].anchor)}, exit anchor=${JSON.stringify(packageData.regions.exit[0].anchor)}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
