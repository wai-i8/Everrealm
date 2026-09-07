#!/usr/bin/env node

// Development-time generator for the checked-in Main Town navigation package.
// The PNGs and JSON in assets/main-town are the authored source; the generated
// JavaScript is only a synchronous runtime artifact for the zero-build browser.

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "assets", "main-town");
const outputPath = path.join(root, "map", "main-town-navigation.generated.js");
const sourceJsonName = "main-town-navigation.json";
const WIDTH = 1536;
const HEIGHT = 1152;

function fail(message) {
  throw new Error(`[main-town-navigation] ${message}`);
}

function readPng(fileName) {
  const filePath = path.join(sourceDir, fileName);
  let input;
  try {
    input = fs.readFileSync(filePath);
  } catch (error) {
    fail(`cannot read ${fileName}: ${error.message}`);
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!input.subarray(0, 8).equals(signature)) fail(`${fileName} is not a PNG`);
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
    if (dataEnd + 4 > input.length) fail(`${fileName} contains a truncated ${type} chunk`);
    const data = input.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      if (length !== 13) fail(`${fileName} has an invalid IHDR`);
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
  if (width !== WIDTH || height !== HEIGHT) fail(`${fileName} must be exactly ${WIDTH}x${HEIGHT}, got ${width}x${height}`);
  if (bitDepth !== 8) fail(`${fileName} must use 8-bit channels, got bit depth ${bitDepth}`);
  if (![0, 2, 4, 6].includes(colorType)) fail(`${fileName} uses unsupported PNG color type ${colorType}`);
  if (interlace !== 0) fail(`${fileName} must not be interlaced`);
  if (!idat.length) fail(`${fileName} has no image data`);

  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  const stride = width * channels;
  const filtered = zlib.inflateSync(Buffer.concat(idat));
  const expectedLength = height * (stride + 1);
  if (filtered.length !== expectedLength) fail(`${fileName} has an unexpected decompressed size`);
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
    if (filter > 4) fail(`${fileName} uses unsupported PNG filter ${filter}`);
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
      const source = (y * width + x) * channels;
      const gray = rows[y * stride + x * channels];
      const r = gray;
      const g = colorType === 0 || colorType === 4 ? gray : rows[source + 1];
      const b = colorType === 0 || colorType === 4 ? gray : rows[source + 2];
      const a = colorType === 4 ? rows[y * stride + x * channels + 1] : colorType === 6 ? rows[source + 3] : 255;
      pixels[y * width + x] = { r, g, b, a };
    }
  }
  return { fileName, width, height, pixels };
}

function binaryMask(image) {
  return image.pixels.map((pixel, index) => {
    if (pixel.a !== 255 || pixel.r !== pixel.g || pixel.g !== pixel.b || ![0, 255].includes(pixel.r)) {
      fail(`${image.fileName} has a non-binary pixel at ${index % WIDTH},${Math.floor(index / WIDTH)}`);
    }
    return pixel.r === 255 ? 1 : 0;
  });
}

function triggerMask(image) {
  const values = image.pixels.map((pixel, index) => {
    if (pixel.a !== 255) fail(`${image.fileName} has a transparent pixel at ${index % WIDTH},${Math.floor(index / WIDTH)}`);
    if (pixel.r === 0 && pixel.g === 0 && pixel.b === 0) return 0;
    if (pixel.r > 200 && pixel.g > 120 && pixel.b < 120) return 1;
    if (pixel.r < 120 && pixel.g < 180 && pixel.b > 120) return 2;
    fail(`${image.fileName} has an unsupported trigger color at ${index % WIDTH},${Math.floor(index / WIDTH)}: ${pixel.r},${pixel.g},${pixel.b}`);
  });
  if (!values.includes(1) || !values.includes(2)) fail(`${image.fileName} must contain both authored trigger channels`);
  return values;
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
    if (values[index] === value && run < 0x0fffffff) {
      run += 1;
    } else {
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

function main() {
  let packageData;
  try {
    packageData = JSON.parse(fs.readFileSync(path.join(sourceDir, sourceJsonName), "utf8"));
  } catch (error) {
    fail(`cannot parse ${sourceJsonName}: ${error.message}`);
  }
  if (packageData?.source?.width !== WIDTH || packageData?.source?.height !== HEIGHT) {
    fail(`${sourceJsonName} must declare source dimensions ${WIDTH}x${HEIGHT}`);
  }
  if (!String(packageData.movement_rule || "").includes("feet disk")) fail(`${sourceJsonName} is missing its feet-disk movement contract`);
  if (packageData.connectivity?.feet_radius_px !== 3) fail(`${sourceJsonName} must declare feet_radius_px=3`);
  const walkable = binaryMask(readPng("main-town-walkable-mask.png"));
  const collision = binaryMask(readPng("main-town-collision-mask.png"));
  const triggers = triggerMask(readPng("main-town-trigger-mask.png"));
  if (walkable.some((value, index) => value && collision[index])) fail("walkable and supplemental collision masks overlap");
  const output = `/*
 * DO NOT EDIT MANUALLY.
 * GENERATED FROM THE MAIN TOWN NAVIGATION PACKAGE.
 * Source: assets/main-town/main-town-navigation.json and its three PNG masks.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMainTownNavigationGenerated = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PACKAGE = ${JSON.stringify(packageData, null, 2)};
  const WIDTH = ${WIDTH};
  const HEIGHT = ${HEIGHT};
  const MASK_RLE = {
    walkable: ${wrapBase64(encodeRle(walkable))},
    collision: ${wrapBase64(encodeRle(collision))},
    triggers: ${wrapBase64(encodeRle(triggers))},
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
        if (source >= encoded.length || shift > 28) throw new Error("Malformed Main Town navigation RLE");
        const byte = encoded[source++];
        count |= (byte & 127) << shift;
        shift += 7;
        if (!(byte & 128)) break;
      } while (true);
      if (!count || source >= encoded.length || target + count > result.length) throw new Error("Invalid Main Town navigation RLE span");
      result.fill(encoded[source++], target, target + count);
      target += count;
    }
    if (target !== result.length) throw new Error("Incomplete Main Town navigation RLE");
    return result;
  }

  return Object.freeze({
    package: PACKAGE,
    width: WIDTH,
    height: HEIGHT,
    masks: Object.freeze({ walkable: decodeRle(MASK_RLE.walkable), collision: decodeRle(MASK_RLE.collision), triggers: decodeRle(MASK_RLE.triggers) }),
  });
});
`;
  if (process.argv.includes("--check")) {
    let existing;
    try {
      existing = fs.readFileSync(outputPath, "utf8");
    } catch (error) {
      fail(`generated runtime data is missing: ${error.message}`);
    }
    if (existing !== output) fail(`${path.relative(root, outputPath)} is out of sync with the canonical package`);
    process.stdout.write(`Checked ${path.relative(root, outputPath)} against the canonical Main Town package.\n`);
    return;
  }
  fs.writeFileSync(outputPath, output, "utf8");
  process.stdout.write(`Generated ${path.relative(root, outputPath)} from the canonical Main Town package.\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
