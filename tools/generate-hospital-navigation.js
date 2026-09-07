#!/usr/bin/env node

// Compatibility entry point for the original Hospital prototype command.
const { runScene } = require("./flattened-navigation-generator.js");

try {
  runScene("hospital");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
