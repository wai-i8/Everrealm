/*
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

  const PACKAGE = {
  "source": {
    "filename": "hospital_walkable.png",
    "width": 1672,
    "height": 941,
    "sha256": "f493c6d51e78f91f6317ff5f05ca4b37c8e0c3b4191a39d6cc267b2e392ded3d"
  },
  "coordinate_system": "original image pixels; origin top-left; x right, y down; pixel regions use exact source coordinates",
  "authoring": {
    "image": "assets/hospital/hospital_walkable.png",
    "colors": {
      "white": [
        255,
        255,
        255
      ],
      "magenta": [
        255,
        0,
        255
      ],
      "cyan": [
        0,
        255,
        255
      ]
    },
    "matching": "exact opaque RGB colors only; all other pixels are non-authored"
  },
  "rendering": "hospital.png is the only player-visible Hospital environment; authoring image is never rendered",
  "movement_rule": "A feet disk must be completely inside exact white walkable pixels or the exact cyan exit region. The exact magenta NPC region is occupied and never walkable. All other pixels are blocked.",
  "feet_radius_px": 3,
  "regions": {
    "npc": [
      {
        "count": 7068,
        "bbox": {
          "x": 786,
          "y": 147,
          "width": 86,
          "height": 120
        },
        "centroid": {
          "x": 828,
          "y": 214
        },
        "anchor": {
          "x": 829,
          "y": 266
        }
      }
    ],
    "exit": [
      {
        "count": 9853,
        "bbox": {
          "x": 735,
          "y": 806,
          "width": 204,
          "height": 55
        },
        "centroid": {
          "x": 837,
          "y": 833
        },
        "anchor": {
          "x": 837,
          "y": 860
        }
      }
    ]
  }
};
  const WIDTH = 1672;
  const HEIGHT = 941;
  const MASK_RLE = {
    white:     "4e4HAAEBwfINAAEB4L0CAAEB48ABAHoBjgwAegGODAB6AY4MAHoBjgwAegGODAB6AY4MAHoBjgwAegGODAB6AY4MAHoBjgwAegGIAwCUAQHyBwB6AYgDAJQB" +
    "AfIHAHoBiAMAlAEB8gcAegGIAwCUAQHyBwB6AYgDAJQBAfIHAHoBiAMAlAEB8gcAegGIAwCUAQHyBwB6AYgDAJQBAfIHAHoBiAMAlAEB8gcAegGIAwCUAQHy" +
    "BwB6AYgDAJQBAfIHAHoBiAMAlAEB8gcAegGIAwCUAQHyBwB6AYgDAJQBAfIHAHoBiAMAlAEB8gcAegGIAwCUAQHyBwB6AYgDAJQBAfIHAHoBiAMAlAEB8gcA" +
    "egGIAwCUAQHyBwB6AYgDAJQBAfIHAHoBiAMAlAEB8gcAegGIAwCUAQHyBwB6AYgDAJQBAfIHAHoBiAMAlAEB8gcAegGIAwCUAQHyBwB6AYgDAJQBAfIHAHoB" +
    "iAMAlAEB8gcAegGIAwCUAQHyBwB6AYgDAJQBAfIHAHoBiAMAlAEB8gcAegGIAwCUAQHiBwCyAQHgAgCUAQHiBwCyAQHgAgCUAQHiBwCyAQHgAgCUAQHiBwCy" +
    "AQHgAgCUAQHiBwCyAQHgAgCUAQHiBwCyAQHgAgCUAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDN" +
    "AQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCy" +
    "AQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDN" +
    "AQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQHiBwCyAQGnAgDNAQGBBQABAeACALIBAacCAM0B" +
    "AeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIB" +
    "AacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0B" +
    "AeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIB" +
    "AacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeIHALIBAacCAM0BAeEHAKcFAeEHAKcFAeEHAKcFAeEHAKcFAeEHAKcFAeEHAKcF" +
    "AeEHAKcFAeEHAKcFAeEHAKcFAeEHAKcFAeEHAKcFAeEHAKcFAeEHAKcFAeEHAKcFAeEHAKcFAeEHAKcFAeEHAKcFAeEHAKcFAeEHAKUFAeMHAKUFAeMHAKUF" +
    "AeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUF" +
    "AeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUF" +
    "AeMHAKUFAeMHAOIHAaYFAOIHAaYFAOIHAaYFAOIHAaYFAOIHAakDAAIB+wEA4gcBswMAAQHyAQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGm" +
    "BQDiBwGmBQDiBwGjAwACAYECAOIHAaYFAOIHAaYFAOIHAaYFAOIHAaYFAOIHAaYFAOIHAaYFAOIHAaYFAOIHAaYFAOIHAaYFAOIHAaYFAOIHAaYFAOIHAaYF" +
    "AOIHAakCAAEB/AIA4gcBqQIAAQH8AgDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDi" +
    "BwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDi" +
    "BwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDi" +
    "BwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDi" +
    "BwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQDiBwGmBQCl" +
    "BQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwCl" +
    "BQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwCl" +
    "BQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwCl" +
    "BQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwCl" +
    "BQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwCl" +
    "BQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHjBwClBQHVBQABAY0CAKUF" +
    "AeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUF" +
    "AeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAeMHAKUFAbABAAEBsgYApQUB4wcApQUB4wcApQUB" +
    "4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB" +
    "4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB" +
    "4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB" +
    "4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUB4wcApQUBygkAywEBvQsAywEBvQsAywEBvQsAywEB" +
    "vQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEB" +
    "vQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEB" +
    "vQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEB" +
    "vQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEB" +
    "vQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEB" +
    "vQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEB" +
    "vQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEB" +
    "vQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEBvQsAywEB" +
    "0AoAAQFsAMsBAb0LAMsBAb0LAMsBAb0LABUBDgCoAQHaCgABAWIAEQEWAKQBAdQKAAEBaAAPARsAFAFXABEBEQAUAb0LAA0BIQAIAWQACAEZABABvQsADAGx" +
    "AQAOAb0LAAoBtQEADAG9CwAJAbgBAAoBvQsACAG6AQAJAb0LAAcBvQEABwG9CwAGAb8BAAYBvQsABgHAAQAFAb0LAAUBwgEABAG9CwAEAcQBAAMBvQsABAHE" +
    "AQADAb0LAAMBxgEAAgG9CwADAccBAAEBvQsAAgHIAQABAb0LAAIBgAwAAQEJAAEBewACAcECAAEBxAoAAgGGDQABAYcNAAEBhw0AAQGHDQABAYcNAAEBhw0A" +
    "AQGHDQABAYmKCwA=",
    magenta:     "0IYPAAoB+gwAEgH0DAAWAfAMABoB7QwAHAHqDAAgAecMACIB5QwAJAHjDAAmAeEMACgB3wwAKQHfDAAqAd0MACwB2wwALQHbDAAuAdkMAC8B2QwAMAHXDAAx" +
    "AdcMADEB1wwAMQHXDAAyAdUMADMB1QwAMwHVDAAzAdUMADMB1QwAMwHVDAAzAdUMADMB1QwAMwHVDAAzAdUMADMB1QwAMwHVDAAzAdUMADMB1QwAMwHVDAAz" +
    "AdUMADMB1QwAMwHVDAAzAdQMADMB1QwAMwHVDAAzAdUMADMB1QwAMwHVDAAzAdUMADMB1QwAMwHVDAAzAdUMADIB1gwAMgHWDAAyAdYMADIB1gwAMgHWDAAy" +
    "AdYMADIB1gwAMgHWDAAyAdYMADIB1gwAMgHVDAAzAdUMADMB1AwANAHUDAA1AdMMADYB0gwANwHQDAA5Ac8MADkBzwwAOgHODAA7AcwMAD0ByQwAQAHHDABB" +
    "AcYMAEMBxAwARgHBDABIAb8MAEoBvgwASwG8DABNAboMAE4BugwATwG4DABRAbcMAFEBtgwAUwG1DABTAbUMAFQBtAwAVAGzDABVAbMMAFUBswwAVgGyDABW" +
    "AbIMAFYBsgwAVgGyDABWAbIMAFYBsgwAVgGyDABWAbMMAFUBswwAVQGzDABVAbMMAFQBtQwAUwG1DABTAbYMAFIBtgwAUQG4DABQAbkMAE4BugwATgG7DABM" +
    "Ab0MAEoBvwwASQHADABHAcMMAEQBxQwAQgHIDAA/AcsMADsBzwwAOAHUDAAyAdkMAC0B3wwAJQHnDAAWAc/qRAA=",
    cyan:     "o6ZSAA4B9gwAFgHwDAAbARQAVwERABEB3gsAIQEIAGQBCAAZAdkLALEBAdULALUBAdILALgBAc8LALoBAc0LAL0BAcoLAL8BAckLAMABAccLAMIBAcULAMQB" +
    "AcQLAMQBAcMLAMYBAcILAMcBAcALAMgBAcALAMkBAb8LAMkBAb8LAMoBAb0LAMsBAb0LAMsBAb0LAMsBAb0LAMwBAbwLAMwBAbwLAMwBAbwLAMwBAbwLAMwB" +
    "AbwLAMwBAbwLAMwBAb0LAMsBAb0LAMsBAb0LAMsBAb0LAMsBAb4LAMkBAb8LAMkBAcALAMgBAcALAMgBAcELAMYBAcMLAMUBAcMLAMQBAcULAMMBAcYLAMEB" +
    "AcgLAL8BAcoLAL4BAcwLALsBAc4LALkBAdELALYBAdQLALMBAdkLAK0BAeALAKcBAeMLAKMBAekLACYBRgAxAe8LAB0BUAAoAfsLABEBWgAVAf6aCAA=",
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
