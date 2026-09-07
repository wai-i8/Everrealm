#!/usr/bin/env node

const { SCENES, runScene } = require("./flattened-navigation-generator.js");

const requested = process.argv.find((value) => value.startsWith("--scene="));
const scenes = requested ? [requested.slice("--scene=".length)] : Object.keys(SCENES);
try {
  for (const scene of scenes) runScene(scene);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
