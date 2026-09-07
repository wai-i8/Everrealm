/*
 * DO NOT EDIT MANUALLY.
 * GENERATED FROM assets/inn/inn_walkable.png.
 * This synchronous artifact exists for the zero-build/file:// runtime.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternInnNavigationGenerated = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PACKAGE = {
  "scene": "inn",
  "package_id": "inn-navigation-flat-v1",
  "source": {
    "filename": "inn_walkable.png",
    "width": 1672,
    "height": 941,
    "sha256": "63435fe76eb03c4560c68882cecb38f9291ddd45a008e4e8ad94be0ead0a16f9"
  },
  "coordinate_system": "original image pixels; origin top-left; x right, y down; pixel regions use exact source coordinates",
  "authoring": {
    "image": "assets/inn/inn_walkable.png",
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
  "rendering": "inn.png is the only player-visible inn environment; the authoring image is never rendered",
  "movement_rule": "A feet disk must be completely inside exact white walkable pixels or the exact cyan exit region. The exact magenta NPC region is occupied and never walkable. All other pixels are blocked.",
  "feet_radius_px": 3,
  "regions": {
    "npc": [
      {
        "count": 2059,
        "bbox": {
          "x": 751,
          "y": 229,
          "width": 43,
          "height": 57
        },
        "centroid": {
          "x": 772,
          "y": 257
        },
        "anchor": {
          "x": 772,
          "y": 285
        }
      }
    ],
    "exit": [
      {
        "count": 5682,
        "bbox": {
          "x": 709,
          "y": 748,
          "width": 142,
          "height": 49
        },
        "centroid": {
          "x": 779,
          "y": 772
        },
        "anchor": {
          "x": 780,
          "y": 796
        }
      }
    ]
  }
};
  const WIDTH = 1672;
  const HEIGHT = 941;
  const MASK_RLE = {
    white:     "jd4YAAEB/tABAAEBoScAAQGTJwABAY8aAAIB1AEAAQH2lAEAAQHdrwUAPAHMDAA8AcwMADwBzAwAPAHMDAA8AcwMADwBzAwAPAHMDAA8AcwMADwBzAwAPAHM" +
    "DAA8AcwMADwBzAwAPAHMDAA8AcwMADwBzAwAPAHMDAA8AcwMADwBzAwAPAHMDAA8AcwMADwBzAwAPAHMDAA8AcwMADwBzAwAPAHMDAA8AdsIAAEB8AMAPAHM" +
    "DAA8AcwMADwBzAwAPAHMDAA8AcwMADwBzAwAPAHMDAA8AcwMADwBzAwAPAHMDAA8Ad0EAAEB7gcAPAHnCgCIAQFdADwB5woAiAEBXQA8AecKAIgBAV0APAHn" +
    "CgCIAQFdADwB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkA" +
    "kwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkA" +
    "kwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkA" +
    "kwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkA" +
    "kwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkA" +
    "kwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkAkwMB9QkA" +
    "kwMB9QkAkwMB9QkAmAMB8AkAmAMB8AkAmAMB8AkAmAMB8AkAmAMB8AkAmAMB8AkAmAMB8AkAmAMB8AkAmAMB8AkAmAMB8AkAmAMB8AkAmAMB8AkAmAMB8AkA" +
    "mAMB8AkAmAMB8AkAmAMB8AkAmAMB8AkAmAMB8AkAmAMB8AkAmAMBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA" +
    "3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA" +
    "3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA" +
    "3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA" +
    "3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIB0wkAAQFWAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4C" +
    "AaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAaoKAN4CAbwBAAEB" +
    "7QgA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIB" +
    "qgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBqgoA3gIBywEAAQHeCADeAgGqCgDeAgGqCgDeAgGqCgDeAgGq" +
    "CgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGq" +
    "CgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGq" +
    "CgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDeAgGqCgDAAQE8AGEBqwoAwAEBPABhAasKAMABATwAYQHj" +
    "CgCIAQE8AGEB4woAiAEBPABhAeMKAIgBATwAYQHjCgCIAQE8AGEBmAMAGQGyBwCIAQE8AGEBlQMAIAGuBwCIAQE8AGEBkwMAJwGpBwCIAQE8AGEBkQMAMQFI" +
    "AAsBzgYAiAEBPABhAZADADgBPQATAcsGAIgBATwAYgGOAwA+ASkAJAHJBgCIAQE8AGMBjAMAQwEdAC4BxwYAiAEBPABkAYoDAEoBEwAzAcYGAIgBATwAZQGI" +
    "AwBOAQ0ANwHFBgCIAQE8AGYBhwMAUQEGADwBxAYAiAEBPABnAYUDAJUBAcMGAIgBATwAaAGEAwCWAQHCBgCIAQE8AGkBggMAlwEBwgYAiAEBPABqAYEDAJgB" +
    "AcEGAIgBATwAawGAAwCYAQHBBgCIAQE8AGwB/gIAmgEBwAYAiAEBPABtAf0CAJoBAcAGAIgBATwAbgH8AgCaAQHABgCIAQE8AG8B+wIAmwEBvwYAiAEBPABv" +
    "AfsCAJsBAb8GAIgBATwAcAH6AgCbAQG/BgCIAQE8AHEB+QIAmwEBvwYAiAEBPABxAfkCAJsBAb8GAIgBATwAcgH4AgCbAQG/BgCIAQE8AHIB+AIAmwEBvwYA" +
    "iAEBPABzAfcCAJsBAb8GAIgBATwAcwH3AgCbAQG/BgCIAQE8AHMB9QIAnQEBvwYAiAEBeAA4AfICAKEBAb0GAIgBAXoANgHxAgCjAQG8BgCIAQF8ADQB8AIA" +
    "pQEBuwYAiAEBfgAyAe4CAKgBAboGAIgBAYEBAC8B7QIAqgEBuQYAiAEBhAEALAHsAgCsAQG4BgCIAQGFAQArAesCAK0BAbgGAIgBAYYBACoB6gIArwEBtwYA" +
    "iAEBhwEAKQHpAgCwAQG3BgCIAQGIAQAoAegCALIBAbYGAIgBAYkBACcB5wIAswEBtgYAiAEBigEAJwHlAgC0AQG2BgCIAQGKAQAnAeUCALUBAbUGAIgBAYoB" +
    "ACgB4wIAtgEBtQYAiAEBigEAKAHiAgC3AQG1BgCIAQGKAQApAeECALcBAbUGAIgBAYoBACwB3QIAuAEBtQYAiAEBigEALwHZAgC5AQG1BgCIAQGKAQAyAdUC" +
    "ALoBAbUGAIgBAYoBADUB0QIAuwEBtQYAiAEBiwEANgHPAgC7AQG1BgCIAQFfAAEBKwA+AcYCALsBAcsFAAEBagCIAQGLAQBBAcMCALsBAbYGAIgBAYwBAEIB" +
    "vwIAvQEBtgYAiAEBjAEARAG7AgC+AQG3BgCIAQGNAQBEAbkCAL8BAbcGAIgBAY0BAEUBtgIAwAEBuAYAiAEBjgEARQGtAgDIAQG4BgCIAQGOAQBGAakCAMoB" +
    "AbkGAIgBAY8BAFIBGAAvAT0AIgF0AMwBAbkGAIgBAY8BAFsBCQA4AS4AMgEOABMBJgAaAQ0AzQEBugYAiAEBkAEApAEBHgCdAQEJAM4BAboGAIgBAZABALUE" +
    "AbsGAIgBAZABALQEAbwGAIgBAZEBALIEAb0GAIgBAZEBALEEAb4GAIgBAZEBALAEAb8GAIgBAZIBAK4EAcAGAIgBAZIBAK0EAcEGAIgBAZMBAKsEAcIGAIgB" +
    "AZMBAKkEAcQGAIgBAZQBAKYEAcYGAIgBAZUBAKIEAckGAIgBAZUBAJ8EAcwGAIgBAZYBAJsEAc8GAIgBAZcBAJgEAdEGAIgBAZgBAJUEAdMGAIgBAZkBAJEE" +
    "AdYGAIgBAZoBAI4EAdgGAIgBAZsBAIsEAdoGAIgBAZ0BAIYEAd0GAIgBAZ8BAIMEAd4GAIgBAaIBAP4DAeAGAIgBAakBAPUDAeIGAIgBAaoBAPMDAeMGAIgB" +
    "AaoBAPIDAeQGAIgBAasBAPADAeUGAIgBAawBAO0DAecGAIgBAa0BAOoDAekGAIgBAa4BAOcDAesGAIgBAa8BAOQDAe0GAIgBAbABAOEDAe8GAIgBAbIBAN0D" +
    "AfEGAIgBAbQBANoDAfIGAIgBAbcBANYDAfMGAIgBAcEBAMoDAfUGAIgBAccBAOUCARkARAH3BgCIAQHZAQAnASAATQEUAKQBASYAOwH6BgCIAQHjAQAXASoA" +
    "PAElABwBBQAzAQsAOQHjBwCIAQGtAgAsAY4BACwB7QcAiAEBgAwAiAEBgAwAiAEBgAwAiAEBgAwAiAEBgAwAiAEBgAwAiAEBgAwAiAEBgAwAiAEBgAwAiAEB" +
    "gAwAiAEBgAwADQETAGgBgAwACgEeAGABgAwACAEkAFwBgAwABgEtAFUBgAwABQEzAFABgAwABAFqABoBgAwAAwF0ABEBgAwAAgF5AA0BgAwAAQF9AAoBgA0A" +
    "CAGCDQAGAYMNAAUBhA0ABAGFDQADAYYNAAIBhw0AAQGlyAIAAgHNnAEAAQHpIgABAdBSAAEBhw0AAQG/ZAABAY8aAAEBnEEAAQGQGgABAYARAAEBuScAAQEK" +
    "AAEBkzAAAQGdWwABAY0NAAEBiicAAQH51AkA",
    magenta:     "pLUXAAoB/AwAFAHyDAAYAe8MABsB7AwAHQHqDAAfAegMACEB5wwAIgHlDAAjAeUMACQB4wwAJQHjDAAmAeIMACYB4gwAJgHiDAAmAeIMACYB4gwAJgHhDAAn" +
    "AeEMACcB4AwAJwHhDAAnAeEMACYB4gwAJgHiDAAnAeEMACgB4AwAKAHgDAApAeAMACgB4AwAKQHfDAApAd4MACoB3gwAKgHdDAArAd0MACsB3QwAKwHdDAAr" +
    "Ad0MACsB3QwAKwHdDAArAd0MACsB3QwAKwHdDAArAd0MACsB3gwAKgHeDAAqAd8MACkB3wwAKQHgDAAnAeIMACYB4wwAJAHlDAAjAecMACAB6gwAHQHvDAAY" +
    "AfIMABUB9wwADwH9DAAJAfDyQgA=",
    cyan:     "tbBMABMB8gwAHgHoDAAkAeIMAC0B2gwAMwHUDABqAZ0MAHQBkwwAeQGODAB9AYoMAIABAYgMAIIBAYUMAIQBAYQMAIUBAYIMAIcBAYEMAIgBAYAMAIkBAf4L" +
    "AIsBAf0LAIsBAf0LAIwBAfwLAIwBAfwLAI0BAfsLAI0BAfsLAI0BAfsLAI4BAfoLAI4BAfoLAI4BAfoLAI4BAfsLAI0BAfsLAI0BAfsLAI0BAfwLAIwBAfwL" +
    "AIwBAf0LAIsBAf0LAIoBAf8LAIkBAYAMAIgBAYEMAIYBAYMMAIUBAYQMAIMBAYYMAIIBAYgMAH8BiwwAfAGPDAAKAQEAbQGjDABkAacMAGABrwwAWAG2DABQ" +
    "Ae4MABgB9wwADgHF3w4A",
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
    const bytes = []; let buffer = 0; let bits = 0;
    for (const character of value) {
      if (character === "=") break;
      const digit = alphabet.indexOf(character);
      if (digit < 0) continue;
      buffer = (buffer << 6) | digit; bits += 6;
      if (bits >= 8) { bits -= 8; bytes.push((buffer >> bits) & 255); }
    }
    return Uint8Array.from(bytes);
  }

  function decodeRle(value) {
    const encoded = decodeBase64(value);
    const result = new Uint8Array(WIDTH * HEIGHT);
    let source = 0; let target = 0;
    while (source < encoded.length) {
      let count = 0; let shift = 0;
      do {
        if (source >= encoded.length || shift > 28) throw new Error("Malformed inn navigation RLE");
        const byte = encoded[source++]; count |= (byte & 127) << shift; shift += 7;
        if (!(byte & 128)) break;
      } while (true);
      if (!count || source >= encoded.length || target + count > result.length) throw new Error("Invalid inn navigation RLE span");
      result.fill(encoded[source++], target, target + count); target += count;
    }
    if (target !== result.length) throw new Error("Incomplete inn navigation RLE");
    return result;
  }

  return Object.freeze({
    package: PACKAGE, width: WIDTH, height: HEIGHT,
    masks: Object.freeze({ white: decodeRle(MASK_RLE.white), magenta: decodeRle(MASK_RLE.magenta), cyan: decodeRle(MASK_RLE.cyan) }),
  });
});
