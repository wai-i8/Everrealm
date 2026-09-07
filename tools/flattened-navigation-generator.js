// Shared development-time converter for flattened Everrealm scene navigation.
// Authoring PNGs are the source of truth; generated artifacts are synchronous
// runtime data for the zero-build/file:// game.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const EXPECTED_WIDTH = 1672;
const EXPECTED_HEIGHT = 941;
const SCENES = Object.freeze({
  hospital: Object.freeze({ folder: "hospital", visible: "hospital.png", authoring: "hospital_walkable.png", output: "hospital-navigation.generated.js", global: "LanternHospitalNavigationGenerated", packageId: "hospital-navigation-prototype" }),
  weapon: Object.freeze({ folder: "weapon", visible: "weapon.png", authoring: "weapon_walkable.png", output: "weapon-navigation.generated.js", global: "LanternWeaponNavigationGenerated", packageId: "weapon-navigation-flat-v1" }),
  inn: Object.freeze({ folder: "inn", visible: "inn.png", authoring: "inn_walkable.png", output: "inn-navigation.generated.js", global: "LanternInnNavigationGenerated", packageId: "inn-navigation-flat-v1" }),
  item: Object.freeze({ folder: "item", visible: "item.png", authoring: "item_walkable.png", output: "item-navigation.generated.js", global: "LanternItemNavigationGenerated", packageId: "item-navigation-flat-v1" }),
  guild: Object.freeze({ folder: "guild", visible: "guild.png", authoring: "guild_walkable.png", output: "guild-navigation.generated.js", global: "LanternGuildNavigationGenerated", packageId: "guild-navigation-flat-v1" }),
});

function fail(scene, message) {
  throw new Error(`[${scene}-navigation] ${message}`);
}

function readPng(scene, config) {
  const sourcePath = path.join(root, "assets", config.folder, config.authoring);
  let input;
  try { input = fs.readFileSync(sourcePath); } catch (error) { fail(scene, `cannot read ${config.authoring}: ${error.message}`); }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!input.subarray(0, 8).equals(signature)) fail(scene, `${config.authoring} is not a PNG`);
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
    if (dataEnd + 4 > input.length) fail(scene, `${config.authoring} contains a truncated ${type} chunk`);
    const data = input.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      if (length !== 13) fail(scene, `${config.authoring} has an invalid IHDR`);
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    offset = dataEnd + 4;
  }
  if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) fail(scene, `${config.authoring} must be exactly ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}, got ${width}x${height}`);
  if (bitDepth !== 8) fail(scene, `${config.authoring} must use 8-bit channels, got bit depth ${bitDepth}`);
  if (colorType !== 6) fail(scene, `${config.authoring} must use RGBA color type 6, got ${colorType}`);
  if (interlace !== 0) fail(scene, `${config.authoring} must not be interlaced`);
  if (!idat.length) fail(scene, `${config.authoring} has no image data`);

  const channels = 4;
  const stride = width * channels;
  const filtered = zlib.inflateSync(Buffer.concat(idat));
  if (filtered.length !== height * (stride + 1)) fail(scene, `${config.authoring} has an unexpected decompressed size`);
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
    if (filter > 4) fail(scene, `${config.authoring} uses unsupported PNG filter ${filter}`);
    const rowStart = y * stride;
    const priorStart = (y - 1) * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = filtered[inputOffset++];
      const left = x >= channels ? rows[rowStart + x - channels] : 0;
      const up = y > 0 ? rows[priorStart + x] : 0;
      const upperLeft = y > 0 && x >= channels ? rows[priorStart + x - channels] : 0;
      rows[rowStart + x] = (raw + (filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, upperLeft))) & 255;
    }
  }
  return { input, width, height, rows };
}

function classify(pixel) {
  if (pixel.a !== 255) return 0;
  if (pixel.r === 255 && pixel.g === 255 && pixel.b === 255) return 1;
  if (pixel.r === 255 && pixel.g === 0 && pixel.b === 255) return 2;
  if (pixel.r === 0 && pixel.g === 255 && pixel.b === 255) return 3;
  return 0;
}

function connectedComponents(mask) {
  const seen = new Uint8Array(mask.length);
  const components = [];
  for (let index = 0; index < mask.length; index += 1) {
    if (seen[index] || mask[index] !== 1) continue;
    const queue = [index];
    seen[index] = 1;
    let head = 0;
    let count = 0;
    let minX = EXPECTED_WIDTH;
    let minY = EXPECTED_HEIGHT;
    let maxX = -1;
    let maxY = -1;
    let sumX = 0;
    let sumY = 0;
    while (head < queue.length) {
      const current = queue[head++];
      const x = current % EXPECTED_WIDTH;
      const y = Math.floor(current / EXPECTED_WIDTH);
      count += 1;
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= EXPECTED_WIDTH || ny >= EXPECTED_HEIGHT) continue;
        const next = ny * EXPECTED_WIDTH + nx;
        if (!seen[next] && mask[next] === 1) { seen[next] = 1; queue.push(next); }
      }
    }
    components.push({ count, bbox: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }, centroid: { x: Math.round(sumX / count), y: Math.round(sumY / count) }, anchor: { x: Math.round((minX + maxX) / 2), y: maxY } });
  }
  return components.sort((left, right) => right.count - left.count);
}

function encodeRle(values) {
  const bytes = [];
  let value = values[0];
  let run = 1;
  const flush = () => {
    let count = run;
    while (count >= 128) { bytes.push((count & 127) | 128); count >>>= 7; }
    bytes.push(count, value);
  };
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] === value && run < 0x0fffffff) run += 1;
    else { flush(); value = values[index]; run = 1; }
  }
  flush();
  return Buffer.from(bytes).toString("base64");
}

function wrapBase64(value) {
  const parts = [];
  for (let index = 0; index < value.length; index += 120) parts.push(value.slice(index, index + 120));
  return parts.length ? parts.map((part) => `    "${part}"`).join(" +\n") : '    ""';
}

function render(scene, config, packageData, masks) {
  return `/*\n * DO NOT EDIT MANUALLY.\n * GENERATED FROM assets/${config.folder}/${config.authoring}.\n * This synchronous artifact exists for the zero-build/file:// runtime.\n */\n(function (root, factory) {\n  const api = factory();\n  if (typeof module === "object" && module.exports) module.exports = api;\n  root.${config.global} = api;\n})(typeof globalThis !== "undefined" ? globalThis : this, function () {\n  "use strict";\n\n  const PACKAGE = ${JSON.stringify(packageData, null, 2)};\n  const WIDTH = ${EXPECTED_WIDTH};\n  const HEIGHT = ${EXPECTED_HEIGHT};\n  const MASK_RLE = {\n    white: ${wrapBase64(encodeRle(masks.white))},\n    magenta: ${wrapBase64(encodeRle(masks.magenta))},\n    cyan: ${wrapBase64(encodeRle(masks.cyan))},\n  };\n\n  function decodeBase64(value) {\n    if (typeof atob === "function") {\n      const binary = atob(value);\n      const bytes = new Uint8Array(binary.length);\n      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);\n      return bytes;\n    }\n    if (typeof Buffer !== "undefined") return Uint8Array.from(Buffer.from(value, "base64"));\n    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";\n    const bytes = []; let buffer = 0; let bits = 0;\n    for (const character of value) {\n      if (character === "=") break;\n      const digit = alphabet.indexOf(character);\n      if (digit < 0) continue;\n      buffer = (buffer << 6) | digit; bits += 6;\n      if (bits >= 8) { bits -= 8; bytes.push((buffer >> bits) & 255); }\n    }\n    return Uint8Array.from(bytes);\n  }\n\n  function decodeRle(value) {\n    const encoded = decodeBase64(value);\n    const result = new Uint8Array(WIDTH * HEIGHT);\n    let source = 0; let target = 0;\n    while (source < encoded.length) {\n      let count = 0; let shift = 0;\n      do {\n        if (source >= encoded.length || shift > 28) throw new Error("Malformed ${scene} navigation RLE");\n        const byte = encoded[source++]; count |= (byte & 127) << shift; shift += 7;\n        if (!(byte & 128)) break;\n      } while (true);\n      if (!count || source >= encoded.length || target + count > result.length) throw new Error("Invalid ${scene} navigation RLE span");\n      result.fill(encoded[source++], target, target + count); target += count;\n    }\n    if (target !== result.length) throw new Error("Incomplete ${scene} navigation RLE");\n    return result;\n  }\n\n  return Object.freeze({\n    package: PACKAGE, width: WIDTH, height: HEIGHT,\n    masks: Object.freeze({ white: decodeRle(MASK_RLE.white), magenta: decodeRle(MASK_RLE.magenta), cyan: decodeRle(MASK_RLE.cyan) }),\n  });\n});\n`;
}

function runScene(scene) {
  const config = SCENES[scene];
  if (!config) throw new Error(`Unknown flattened navigation scene: ${scene}`);
  const image = readPng(scene, config);
  const classes = new Uint8Array(EXPECTED_WIDTH * EXPECTED_HEIGHT);
  for (let index = 0; index < classes.length; index += 1) {
    const offset = index * 4;
    classes[index] = classify({ r: image.rows[offset], g: image.rows[offset + 1], b: image.rows[offset + 2], a: image.rows[offset + 3] });
  }
  const masks = {
    white: Uint8Array.from(classes, (value) => value === 1 ? 1 : 0),
    magenta: Uint8Array.from(classes, (value) => value === 2 ? 1 : 0),
    cyan: Uint8Array.from(classes, (value) => value === 3 ? 1 : 0),
  };
  const regions = { npc: connectedComponents(masks.magenta), exit: connectedComponents(masks.cyan) };
  if (!regions.npc.length) fail(scene, `${config.authoring} must contain a magenta NPC region`);
  if (!regions.exit.length) fail(scene, `${config.authoring} must contain a cyan exit region`);
  const packageData = {
    scene,
    package_id: config.packageId,
    source: { filename: config.authoring, width: image.width, height: image.height, sha256: crypto.createHash("sha256").update(image.input).digest("hex") },
    coordinate_system: "original image pixels; origin top-left; x right, y down; pixel regions use exact source coordinates",
    authoring: { image: `assets/${config.folder}/${config.authoring}`, colors: { white: [255, 255, 255], magenta: [255, 0, 255], cyan: [0, 255, 255] }, matching: "exact opaque RGB colors only; all other pixels are non-authored" },
    rendering: `${config.visible} is the only player-visible ${scene} environment; the authoring image is never rendered`,
    movement_rule: "A feet disk must be completely inside exact white walkable pixels or the exact cyan exit region. The exact magenta NPC region is occupied and never walkable. All other pixels are blocked.",
    feet_radius_px: 3,
    regions,
  };
  const outputPath = path.join(root, "map", config.output);
  const output = render(scene, config, packageData, masks);
  if (process.argv.includes("--check")) {
    let committed;
    try { committed = fs.readFileSync(outputPath, "utf8"); } catch (error) { fail(scene, `cannot read generated output for check: ${error.message}`); }
    if (committed !== output) fail(scene, `generated output is stale; run npm run generate:flattened-navigation`);
    console.log(`Checked ${path.relative(root, outputPath)}`);
    return { packageData, masks };
  }
  fs.writeFileSync(outputPath, output, "utf8");
  console.log(`Generated ${path.relative(root, outputPath)} from assets/${config.folder}/${config.authoring}`);
  console.log(`Regions: white=${masks.white.reduce((sum, value) => sum + value, 0)}, magenta=${masks.magenta.reduce((sum, value) => sum + value, 0)}, cyan=${masks.cyan.reduce((sum, value) => sum + value, 0)}`);
  console.log(`NPC anchor=${JSON.stringify(regions.npc[0].anchor)}, exit anchor=${JSON.stringify(regions.exit[0].anchor)}`);
  return { packageData, masks };
}

module.exports = { EXPECTED_WIDTH, EXPECTED_HEIGHT, SCENES, runScene };
