#!/usr/bin/env node

// Development-time compiler for the supplied Main Town JPG pair.
// The browser consumes only the generated synchronous RLE artifact; the JPGs
// remain the canonical display and navigation authoring sources.

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const childProcess = require("node:child_process");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "assets", "main-town");
const packagePath = path.join(sourceDir, "main-town-navigation.json");
const outputPath = path.join(root, "map", "main-town-navigation.generated.js");
const compilerPath = path.join(root, "tools", "compile-main-town-navigation.py");
const WIDTH = 7680;
const HEIGHT = 4320;

function fail(message) {
  throw new Error(`[main-town-navigation] ${message}`);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`cannot parse ${path.relative(root, filePath)}: ${error.message}`);
  }
}

function hashFile(fileName) {
  const filePath = path.join(sourceDir, fileName);
  try {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  } catch (error) {
    fail(`cannot read ${fileName}: ${error.message}`);
  }
}

function runCompiler() {
  const executable = process.platform === "win32" ? "python" : "python3";
  const result = childProcess.spawnSync(executable, [compilerPath, "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error) fail(`could not start the JPG compiler: ${result.error.message}`);
  if (result.status !== 0) fail((result.stderr || result.stdout || "JPG compiler failed").trim());
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    fail(`JPG compiler returned invalid JSON: ${error.message}`);
  }
}

function wrapBase64(value) {
  const parts = [];
  for (let index = 0; index < value.length; index += 120) parts.push(value.slice(index, index + 120));
  return parts.length ? parts.map((part) => `    "${part}"`).join(" +\n") : '    ""';
}

function renderRuntime(packageData, masks) {
  return `/*
 * DO NOT EDIT MANUALLY.
 * GENERATED FROM the supplied Main Town display and authoring JPG pair.
 * Source: assets/main-town/maintown.jpg and assets/main-town/maintown_walkable.jpg.
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
    walkable: ${wrapBase64(masks.walkable)},
    collision: ${wrapBase64(masks.collision)},
    triggers: ${wrapBase64(masks.triggers)},
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

  function decodeRle(value, maximum, label) {
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
      const maskValue = encoded[source++];
      if (maskValue > maximum) throw new Error("Invalid Main Town " + label + " mask value");
      result.fill(maskValue, target, target + count);
      target += count;
    }
    if (target !== result.length) throw new Error("Incomplete Main Town navigation RLE");
    return result;
  }

  return Object.freeze({
    package: PACKAGE,
    width: WIDTH,
    height: HEIGHT,
    maskValuesValidated: true,
    masks: Object.freeze({
      walkable: decodeRle(MASK_RLE.walkable, 1, "walkable"),
      collision: decodeRle(MASK_RLE.collision, 1, "collision"),
      triggers: decodeRle(MASK_RLE.triggers, 7, "triggers"),
    }),
  });
});
`;
}

function validatePackage(packageData) {
  const displayHash = hashFile("maintown.jpg");
  const authoringHash = hashFile("maintown_walkable.jpg");
  if (packageData?.source?.filename !== "maintown.jpg" || packageData.source.width !== WIDTH || packageData.source.height !== HEIGHT || packageData.source.sha256 !== displayHash) {
    fail("main-town-navigation.json display source metadata is out of sync with maintown.jpg");
  }
  if (packageData?.authoring?.filename !== "maintown_walkable.jpg" || packageData.authoring.image !== "assets/main-town/maintown_walkable.jpg" || packageData.authoring.width !== WIDTH || packageData.authoring.height !== HEIGHT || packageData.authoring.sha256 !== authoringHash) {
    fail("main-town-navigation.json authoring source metadata is out of sync with maintown_walkable.jpg");
  }
  if (packageData.building_triggers?.length !== 5 || !packageData.east_exit || !packageData.deck_interaction) fail("Main Town package is missing the five building regions, East Exit, or deck region");
}

function check() {
  const packageData = readJson(packagePath);
  validatePackage(packageData);
  let generated;
  try {
    generated = fs.readFileSync(outputPath, "utf8");
  } catch (error) {
    fail(`generated runtime data is missing: ${error.message}`);
  }
  if (!generated.includes("DO NOT EDIT MANUALLY") || !generated.includes(JSON.stringify(packageData, null, 2))) {
    fail("map/main-town-navigation.generated.js is out of sync with the canonical package metadata");
  }
  process.stdout.write("Checked map/main-town-navigation.generated.js against the canonical Main Town JPG package.\n");
}

function generate() {
  const compiled = runCompiler();
  validatePackage(compiled.package);
  fs.writeFileSync(packagePath, `${JSON.stringify(compiled.package, null, 2)}\n`, "utf8");
  fs.writeFileSync(outputPath, renderRuntime(compiled.package, compiled.masks), "utf8");
  process.stdout.write("Generated map/main-town-navigation.generated.js from maintown_walkable.jpg.\n");
}

try {
  if (process.argv.includes("--check")) check();
  else generate();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
