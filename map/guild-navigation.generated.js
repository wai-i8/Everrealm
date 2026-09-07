/*
 * DO NOT EDIT MANUALLY.
 * GENERATED FROM assets/guild/guild_walkable.png.
 * This synchronous artifact exists for the zero-build/file:// runtime.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternGuildNavigationGenerated = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PACKAGE = {
  "scene": "guild",
  "package_id": "guild-navigation-flat-v1",
  "source": {
    "filename": "guild_walkable.png",
    "width": 1672,
    "height": 941,
    "sha256": "50c3c6cf53cb2fdd6138e2bc783c6650b07470cee0865655525eb981e6079f85"
  },
  "coordinate_system": "original image pixels; origin top-left; x right, y down; pixel regions use exact source coordinates",
  "authoring": {
    "image": "assets/guild/guild_walkable.png",
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
  "rendering": "guild.png is the only player-visible guild environment; the authoring image is never rendered",
  "movement_rule": "A feet disk must be completely inside exact white walkable pixels or the exact cyan exit region. The exact magenta NPC region is occupied and never walkable. All other pixels are blocked.",
  "feet_radius_px": 3,
  "regions": {
    "npc": [
      {
        "count": 1987,
        "bbox": {
          "x": 804,
          "y": 200,
          "width": 56,
          "height": 55
        },
        "centroid": {
          "x": 832,
          "y": 232
        },
        "anchor": {
          "x": 832,
          "y": 254
        }
      }
    ],
    "exit": [
      {
        "count": 6137,
        "bbox": {
          "x": 773,
          "y": 775,
          "width": 112,
          "height": 63
        },
        "centroid": {
          "x": 829,
          "y": 806
        },
        "anchor": {
          "x": 829,
          "y": 837
        }
      }
    ]
  }
};
  const WIDTH = 1672;
  const HEIGHT = 941;
  const MASK_RLE = {
    white:     "i6gOAAEBhw0AAQH3qwYAAQGorwIAKAHgDAAoAeAMACgB4AwAKAHgDAAoAekIAD8BuAMAKAHpCAA/AbgDACgB6QgAPwG4AwAoAekIAD8BuAMAKAHpCAA/AbgD" +
    "ACgB6QgAPwGmAwBzAbAIAD8BpgMAcwGwCAA/AaYDAHMBsAgAPwGmAwBzAbAIAD8BpgMAcwGwCAA/AaYDAHMBsAgAPwGmAwBzAbAIAD8BpgMAcwGwCAA/AaYD" +
    "AHMBsAgAPwGmAwBzAbAIAD8BpgMAcwGwCAA/AaYDAHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYDAHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYD" +
    "AHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYDAHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYDAHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYD" +
    "AHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYDAHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYDAHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYD" +
    "AHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYDAHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYDAHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYD" +
    "AHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYDAHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYDAHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYD" +
    "AHMBiQgAZgGmAwBzAYkIAGYBpgMAcwGJCABmAaYDAHMBiQgAZgGmAwCLAQHxBwBmAaYDAIsBAfEHAGYBpgMAiwEB8QcAZgGmAwCLAQHxBwBmAaYDAIsBAdUH" +
    "AIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYD" +
    "AIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUH" +
    "AIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYD" +
    "AIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaYDAIsBAdUHAIIBAaABAGQBogEAiwEB1QcAhgMBogEA" +
    "iwEB1QcAhgMBogEAiwEB1QcAhgMBogEAiwEB1QcAswUB1QcAswUB1QcAswUB1QcAswUB1QcAswUB8QcAwgQBNgAfAfEHAMIEATYAHwGmCACNBAE2AB8BpggA" +
    "jQQBNgAfAaYIAI0EATYAHwGmCACNBAE2AB8BpggAjQQBNgAfAaYIAI0EATYAHwGmCACNBAE2AB8BpggAjQQBNgAfAaYIAI0EAfsIAI0EAfsIAI0EAfsIAI0E" +
    "AfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0E" +
    "AfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0E" +
    "AfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0E" +
    "AfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0E" +
    "AfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0E" +
    "AfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0E" +
    "AfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0E" +
    "AfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0E" +
    "AfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAfsIAI0EAYkHAAEB" +
    "8QEAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB" +
    "+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB" +
    "+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB" +
    "+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB+wgAjQQB" +
    "+wgAjQQBiwkA/QMBiwkA/QMBiwkA/QMBiwkA/QMBiwkA/QMBiwkA/QMBiwkA/QMBiwkA/QMBiwkA/QMBiwkA/QMBiwkA/QMBiwkA/QMBiwkA8AMBmAkA8AMB" +
    "mAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMB" +
    "mAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMB" +
    "mAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMB" +
    "mAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMB" +
    "mAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBmAkA8AMBqwoAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEB" +
    "wQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEB" +
    "wQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEB" +
    "wQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEBwQsAxwEB7wsAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGk" +
    "DABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGk" +
    "DABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGk" +
    "DABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGk" +
    "DABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGk" +
    "DABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGk" +
    "DABkAaQMAGQBpAwAZAGkDABkAaQMAGQBpAwAZAGkDAASATsAFwGkDAAOAUMAEwGkDAAMAUgAEAGkDAAKAUwADgGkDAAIAVAADAGkDAAGAVQACgGkDAAFAVcA" +
    "CAGkDAAEAVkABwGkDAADAVsABgGkDAACAV0ABQGkDAABAV8ABAGFDQADAYYNAAIBhw0AAQHYxw8A",
    magenta:     "/boUAAcB/wwADQH6DAAQAfcMABIB9QwAFAHzDAAWAfIMABYB8QwAGAHwDAAYAfAMABgB8AwAGAHwDAAYAfAMABgB7wwAGAHwDAAYAe8MABoB7QwAHAHrDAAe" +
    "AeoMAB4B6QwAIAHoDAAgAecMACEB5wwAIQHnDAAhAeYMACIB5gwAIgHmDAAiAeUMACMB5QwAIwHkDAAkAeQMACQB5AwAJAHjDAAmAeIMACcB4AwAKQHdDAAs" +
    "AdsMAC4B2QwAMQHWDAAzAdQMADUB0wwANgHRDAA3AdEMADgB0AwAOAHQDAA4AdAMADgB0AwAOAHRDAA3AdEMADYB0wwANQHUDAAzAdYMADEB2QwALgHfDAAn" +
    "Ae8MABcBpIdGAA==",
    cyan:     "1pFPADsByQwAQwHDDABIAb4MAEwBugwAUAG2DABUAbMMAFcBsAwAWQGuDABbAawMAF0BqgwAXwGoDABhAaYMAGMBpAwAZQGjDABmAaEMAGcBoQwAaAGfDABp" +
    "AZ8MAGoBnQwAawGdDABsAZsMAG0BmwwAbgGaDABuAZoMAG4BmQwAbwGZDABwAZgMAHABmAwAcAGYDABwAZgMAHABmAwAcAGYDABwAZgMAHABmAwAcAGYDABw" +
    "AZgMAHABmQwAbwGZDABuAZoMAG4BmgwAbgGbDABtAZsMAGwBnQwAawGdDABqAZ8MAGkBnwwAaAGhDABnAaEMAGYBowwAZQGkDABjAaYMAGEBqAwAXwGqDABd" +
    "AawMAFsBrgwAWQGwDABXAbMMAFQBtgwAUAG6DABMAb4MAEgBxAwAQgH1DAAPAeTHCgA=",
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
        if (source >= encoded.length || shift > 28) throw new Error("Malformed guild navigation RLE");
        const byte = encoded[source++]; count |= (byte & 127) << shift; shift += 7;
        if (!(byte & 128)) break;
      } while (true);
      if (!count || source >= encoded.length || target + count > result.length) throw new Error("Invalid guild navigation RLE span");
      result.fill(encoded[source++], target, target + count); target += count;
    }
    if (target !== result.length) throw new Error("Incomplete guild navigation RLE");
    return result;
  }

  return Object.freeze({
    package: PACKAGE, width: WIDTH, height: HEIGHT,
    masks: Object.freeze({ white: decodeRle(MASK_RLE.white), magenta: decodeRle(MASK_RLE.magenta), cyan: decodeRle(MASK_RLE.cyan) }),
  });
});
