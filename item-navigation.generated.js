/*
 * DO NOT EDIT MANUALLY.
 * GENERATED FROM assets/item/item_walkable.png.
 * This synchronous artifact exists for the zero-build/file:// runtime.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternItemNavigationGenerated = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PACKAGE = {
  "scene": "item",
  "package_id": "item-navigation-flat-v1",
  "source": {
    "filename": "item_walkable.png",
    "width": 1672,
    "height": 941,
    "sha256": "bea3a34ce263f4b513c6f7ebc0bff639e6876e1648d0fd564a4b8a3a48071eab"
  },
  "coordinate_system": "original image pixels; origin top-left; x right, y down; pixel regions use exact source coordinates",
  "authoring": {
    "image": "assets/item/item_walkable.png",
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
  "rendering": "item.png is the only player-visible item environment; the authoring image is never rendered",
  "movement_rule": "A feet disk must be completely inside exact white walkable pixels or the exact cyan exit region. The exact magenta NPC region is occupied and never walkable. All other pixels are blocked.",
  "feet_radius_px": 3,
  "regions": {
    "npc": [
      {
        "count": 2721,
        "bbox": {
          "x": 818,
          "y": 212,
          "width": 49,
          "height": 68
        },
        "centroid": {
          "x": 842,
          "y": 246
        },
        "anchor": {
          "x": 842,
          "y": 279
        }
      }
    ],
    "exit": [
      {
        "count": 18379,
        "bbox": {
          "x": 702,
          "y": 779,
          "width": 273,
          "height": 80
        },
        "centroid": {
          "x": 838,
          "y": 820
        },
        "anchor": {
          "x": 838,
          "y": 858
        }
      }
    ]
  }
};
  const WIDTH = 1672;
  const HEIGHT = 941;
  const MASK_RLE = {
    white:     "y94FAAEB7pwBAAEBhQ0AAQGTNAABAQMAAQGJDQABAZQnAAEBjhoAAQH+DAABAZEaAAEBgA0AAgHrggEAAQHpDAABAR4ABAGFDQABAQEAAQGOGgABAf8MAAEB" +
    "iA0AAQGjNAABAYYaAAEBiA0AAQGIDQABAQYAAQGBDQABAYgNAAEBiA0AAQH4DAABAYYNAAEBkQ0AAQH7DAABAQoAAQEBAAEB8AwAAQEUAAEB8QwAAQGMvwoA" +
    "AQEBAAEBhQ0AAQEBAAEBjBoAAQGiGgABAYcNAAEBnYYBAAMBk3wAAgGNGgABAQQAAQHSFAABAcUkABAB8wwAGgHrDAAgAeUMACYB4AwAKgHcDAAuAdgMADIB" +
    "1QwANQHRDAA5Ac4MADsBzAwAPgHJDABAAcYMAEMBxAwARQHCCgABAf8BAEgBwAwASQG+DABLAbwMAE0BugwATgHICgABAfABAFABuAwAUQG2DABTAbQMAFUB" +
    "swwAVQGyDABXAbEMAFgBrwwAWQGvDABaAdYFAAEB1gYAWwGtDABcAVYAAQExAAEBogsAXQGrDABeAaoMAF8BqAwAYAGoDABhAacMAG0BmgwAcwGVDAB2AZIM" +
    "AHkBjgwAfAGMDAB+AYkMAIEBAYcMAIIBAYUMAIUBAYMMAIYBAYEMAIgBAYAMAIoBAf0LAIwBAfwLAI0BAfsLAI4BAfkLAI8BAfkLAJABAfcLAJIBAfYLAJMB" +
    "AfQLAJUBAYYGAC4BvgUAlgEB3gUAWwG5BQCcAQHQBQBnAbQFAKIBAbgFAH0BsAUAqgEBrAUAhgEBqwUAsAEBpAUAjAEBpwUAtQEBnQUAkgEBowUAuwEBlQUA" +
    "mAEBnwUAzgEBgAUAnQEBnAUA2AEBwAQADgEnAKEBAZkFAOYBAa4EABgBIAClAQGXBQDtAQGkBAAjARYAqQEBlAUA8wEBnAQAKwEPAK0BAZEFAPcBAZcEADAB" +
    "CwCvAQGPBQCLAgGCBAA1AQYAswEBjAUAkQIB+wMAOQEDALUBAYoFAJUCAfcDAPMBAYkFAJgCAfIDAPYBAYcFAJsCAe8DAPkBAYQFAJ4CAewDAPsBAYIFAKEC" +
    "AekDAP0BAYAFAKMCAeYDAIACAf8EAKUCAeMDAIoCAfUEAKcCAeEDAJACAe8EAKkCAd8DAJQCAewEAKoCAd4DAJcCAegEAK0CAdsDAJoCAeUEAK8CAdkDAJ0C" +
    "AeIEALECAdcDAKACAeAEALECAdYDAKICAd4EALMCAdUDAKQCAdsEALUCAdMDAKYCAdoEALYCAdEDAKkCAdcEALgCAdADAKoCAdUEALkCAc8DAKwCAdQEALoC" +
    "Ac4DAK0CAdIEALwCAcwDALACAdAEALwCAcwDALECAc4EAL4CAcoDALMCAc0EAL8CAckDALQCAcsEAMACAckDALUCAcoEAMECAccDALcCAcgEAMICAccDALgC" +
    "AcYEAMQCAcYDALkCAcUEAMQCAcUDALsCAcMEAMYCAcQDALwCAcIEAMYCAcQDALwCAcEEAMcCAcQDAL0CAcAEAMgCAcIDAMACAb0EAMkCAcIDAMECAbwEAMkC" +
    "AcIDAMICAboEAMsCAcEDAMICAboEAMsCAcEDAMMCAbgEAMwCAcADAMUCAbcEAMwCAcADAMYCAbYEAMwCAcADAMcCAbQEAM4CAb8DAMgCAbMEAM4CAb8DAMkC" +
    "AbEEAM8CAb8DAMoCAbAEAM8CAb4DAMwCAa4EANACAb4DAM0CAYUDAAEBpgEA0QIBvgMAzgIBqgQA0gIBvgMAzwIBqQQA0gIBvgMA0AIBpwQA0wIBvgMA0QIB" +
    "pQQA1AIBvgMA0gIBowQA1QIBvgMA0wIBoQQA1gIBvgMA0wIBoQQA1gIBvgMA1AIBnwQA1wIBvQMA1gIBnQQA2AIBvQMA1wIBmwQA2QIBvQMA2AIBmgQA2AIB" +
    "vgMA2AIBmQQA2QIBvgMA2QIBlwQA2gIBvgMA2gIBlgQA2gIBvgMA2wIBlAQA2wIBvgMA3AIBkgQA2wIBvwMA3AIBkQQA3AIBvwMA3QIBkAQA3AIBvwMA3gIB" +
    "jgQA3AIBwAMA3wIBjAQA3QIBwAMA3wIBjAQA3QIBwAMA4AIBigQA3QIBwQMA4QIBiQQA3QIBwQMA4gIBhwQA3QIBwgMA4wIBhgQA3QIBwgMA4wIBhQQA3QIB" +
    "wwMA5AIBgwQA3gIBwwMA5QIBgQQA3gIBxAMA5gIBgAQA3QIBxQMA5gIB/wMA3gIBxQMA5wIB/QMA3gIBxgMA6AIB+wMA3gIBxwMA6QIB+QMA3gIByAMA6gIB" +
    "+AMA3QIBYwCGAgFgAOsCAacBAAEBzgIA3gIBYwCGAgFgAOwCAfQDAN4CAWQAhgIBYADtAgGlAQABAcwCAN8CAWQAhgIBYQDtAgHxAwDfAgFkAIYCAWEA7QIB" +
    "8AMA3wIBZQCGAgFhAO4CAe4DAOACAWUAhgIBYQDvAgHsAwDzAgFTAIYCAWEA8AIB6gMA+QIBTgCGAgFhAPECAegDAIADAUgAiAIBXgD0AgHlAwCGAwFDAIsC" +
    "AVsA9QIB4wMAiwMBPwCOAgFYAPYCAeIDAI4DAS8AnQIBVgD3AgHgAwCSAwEnAKQCAVQA+AIB3gMAmAMBHwCpAgFSAPkCAdwDAJ4DARcArgIBUAD6AgHaAwCk" +
    "AwEQALICAU0A/QIB1wMAqAMBCwD/BQHWAwCrAwEGAIIGAdQDAK8DAQIAgwYB0wMAtgkB0QMAuAkBzwMAugkBzQMAvAkBzAMAvQkBygMAvgkByQMAwAkBxwMA" +
    "wgkBxQMAxAkBxAMAxQkBwgMAxgkBwQMAyAkBwAMAyQkBnQEAAQGgAgDLCQGcAQABAaACAMwJAZoBAAIBnwIAzwkBmAEAAQGfAgDRCQG2AwDTCQG1AwDUCQGz" +
    "AwDWCQGxAwDYCQGvAwDaCQGtAwDcCQGrAwDeCQGpAwDgCQGnAwDhCQGlAwDkCQGjAwDmCQGhAwDoCQGgAwDpCQGeAwDqCQGcAwDtCQGaAwDvCQGYAwDxCQGW" +
    "AwDyCQGVAwD0CQGTAwD2CQGRAwD3CQGQAwD5CQGPAwD6CQGMAwD8CQGLAwD+CQGJAwD/CQGIAwCBCgGFAwCDCgGEAwCFCgGCAwCGCgGBAwCHCgGAAwCJCgH+" +
    "AgCKCgH9AgCLCgH8AgCNCgH6AgCOCgH5AgCQCgH3AgCRCgH2AgCTCgH0AgCVCgHyAgCXCgHwAgCZCgHuAgCaCgHtAgCcCgHrAgCeCgHqAgCfCgHoAgChCgHm" +
    "AgCiCgHlAgCkCgHjAgCmCgHiAgCmCgHhAgCoCgHfAgCqCgHdAgCrCgHdAgCsCgHbAgCuCgHZAgCvCgHYAgCxCgHXAgCxCgHWAgCzCgHUAgC0CgHTAgC2CgHS" +
    "AgC3CgHQAgC5CgHOAgC7CgHMAgC8CgHMAgC9CgHKAgC/CgHIAgDACgHIAgDBCgHGAgDDCgHEAgDFCgHDAgDFCgHCAgDHCgHBAgDICgG/AgDJCgG+AgDLCgG9" +
    "AgDLCgG8AgDNCgG7AgDNCgG6AgDPCgG4AgDQCgG3AgDRCgG2AgDTCgG1AgDTCgG0AgDUCgGzAgDWCgGxAgDXCgGwAgDYCgGwAgDYCgGvAgDZCgGuAgDbCgGs" +
    "AgDcCgGsAgDcCgGrAgDdCgGqAgDeCgGpAgDfCgGpAgDfCgGoAgDgCgGnAgDhCgGmAgDiCgGlAgDjCgGlAgDjCgGkAgDkCgGjAgDlCgGjAgDmCgGhAgDoCgGf" +
    "AgDpCgGfAgDqCgGdAgDsCgGcAgDtCgGaAgDvCgGZAgDvCgGYAgDxCgGXAgDyCgGWAgDzCgGUAgD0CgGUAgD1CgGTAgD2CgGRAgD3CgGRAgD4CgGQAgD4CgGQ" +
    "AgD5CgGPAgD5CgGOAgD7CgGNAgD7CgGNAgD7CgGNAgD8CgGMAgD8CgGMAgD8CgGMAgD9CgGLAgD9CgGLAgD9CgGLAgD9CgGLAgD9CgGLAgD+CgGKAgD+CgGK" +
    "AgD+CgGLAgD9CgGLAgD9CgGLAgD9CgGLAgD9CgGLAgD9CgGMAgD8CgGMAgD8CgGMAgD8CgGNAgD7CgGNAgD7CgGNAgD7CgGOAgD6CgGOAgD6CgGPAgD4CgGQ" +
    "AgD4CgGRAgD3CgGRAgD3CgGSAgD2CgGTAgD0CgGUAgD0CgGVAgDzCgGWAgDxCgGYAgDwCgGZAgDvCgGZAgDuCgGbAgDtCgGcAgDrCgGfAgDpCgGgAgDnCgGi" +
    "AgDmCgGjAgDkCgGmAgDhCgGoAgDgCgGqAgDdCgGtAgDaCgGwAgDXCgGzAgDUCgG2AgDSCgG4AgDPCgG7AgDMCgG+AgDICgHDAgDECgHHAgDACgHLAgC8CgHO" +
    "AgC4CgHSAgC1CgHWAgCwCgHbAgCrCgHiAgCkCgHrAgCbCgH+AgCICgGBAwCGCgGDAwCECgGFAwCBCgGJAwD+CQGLAwD8CQGNAwD5CQGQAwD3CQGTAwD0CQGV" +
    "AwDxCQGZAwDuCQGbAwDrCQGeAwDoCQGiAwC8AgEmAIIHAaUDALYCAS0A/wYBqAMAsAIBMgD8BgGsAwCrAgE2APkGAbADAKYCAToA9wYBtAMAngIBQQDzBgG4" +
    "AwCbAgFDAPAGAb0DAJcCAUYA7AYBwgMAkwIBSQDoBgHIAwCOAgFMAOMGAc4DAIsCAU8A3gYB1QMAhQIBUwC5AwEjAEMBBQC1AgHaAwCBAgFZALIDASsAMgEQ" +
    "ALICAeIDAPsBAWgAowMBNQAjARcArgIB6gMA9QEBeACSAwFxAPsBAQoAJAHxAwDzAQF9AA8BAQD8AgFyANUBAQIAHAGoBADxAQGPAQD5AgF1ANQBAccEAO8B" +
    "AZEBAPcCAXYA1AEByAQA7QEBkwEA9QIBdwDUAQHKBADqAQGUAQDzAgF6ANMBAcsEAOgBAZYBAL0CAQEAMwF7ANMBAcwEAOcBAZcBALoCAQUALwF+ANIBAc4E" +
    "AOQBAZkBALcCAQkAKwGAAQDSAQHPBADiAQGbAQCzAgEOACcBgwEA0QEB0QQA3wEBngEArgIBFAAhAYYBANEBAdIEAN0BAaABAKgCARwAGwGKAQDQAQHUBADa" +
    "AQGiAQCmAgEiABEBkAEAzwEB1QQA2AEBpAEApQIBwwEAzwEB1QQA2AEBpgEAowIBxAEAzgEB1gQA1gEBqAEAogIBxQEAzAEB1wQA1QEBqwEAoAIBxgEAywEB" +
    "2AQA1AEBrQEAngIBxwEAygEB2QQA0gEBsAEAnAIBxwEAygEB2QQA0gEBswEAmQIByAEAyQEB2gQA0AEBtwEAlgIByQEAxwEB2wQAzwEBvQEAkQIByQEAxwEB" +
    "3AQAzgEByAEAhgIByQEAxwEB3QQAzAEByQEAhgIBygEAxQEB3gQAywEBygEAhgIBygEAxQEB3wQAygEBygEAhgIBywEAxAEB4AQAyAEBywEAhgIBywEAwwEB" +
    "4gQAxgEBzAEAhgIBzAEAwgEB4wQAxAEBzQEAhgIBzAEAwQEB5AQAwwEBzgEAhgIBzQEAwAEB5QQAwgEBzgEAhgIBzgEAvgEB5wQAwAEBzwEAhgIBzgEAvgEB" +
    "6AQAvgEB0AEAhgIBzwEAvAEB6gQAvAEB0QEAhgIB0AEAugEB7QQAuQEB0gEAhgIB0QEAuQEB7gQAtwEB0wEAhgIB0gEAtwEB8AQAtgEB0wEAhgIB0gEAtgEB" +
    "8gQAtAEB1AEAhgIB0wEAtAEB9QQAsQEB1QEAhgIB1AEAsgEB9wQArwEB1gEAhgIB1gEAsAEB+QQAqwEB2AEAhgIB1wEArgEB/AQAqAEB2QEAhgIB2AEArAEB" +
    "/gQApgEB2gEAhgIB2QEAqgEBgQUAowEB2wEAhgIB2wEApwEBhAUAnwEB3QEAhgIB3AEApAEBiAUAnAEB3gEAhgIB3gEAoQEBjAUAlwEB4AEAhgIB4AEAngEB" +
    "jwUAkwEB4gEAhgIB4gEAmwEBkwUAjgEB5AEAhgIB5QEAlgEBmAUAiAEB5wEAhgIB6AEAkgEBnAUARgEdAB8B6gEAhgIB7QEAiwEBoQUAQQEkABUB7wEAhgIB" +
    "9AEAgwEBpQUAPAGqAgCGAgH3AQB/AasFADQBrQIAhgIB+wEAeQGyBQAsAbACAIYCAYACAHMBuAUAIgG1AgCGAgGFAgBsAZEIAIYCAbsCADQBkwgAhgIBvQIA" +
    "MAGVCACGAgG/AgAsAZcIAIYCAcICACYBmggAhgIBxQIAIAGdCACGAgHKAgAWAaIIAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYIL" +
    "AIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYIL" +
    "AIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYIL" +
    "AIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYIL" +
    "AIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIYCAYILAIUBAR4AYwGCCwCB" +
    "AQEnAF4BggsAeAE0AFoBggsAdAE8AFYBggsARAFwAFIBggsAOQF+AE8BggsANQGEAQBNAYILADEBjgEARwGCCwAoAZwBAA0BFgAfAYILABcBtAEAAgEfABoB" +
    "ggsAEwHdAQAWAYILABAB4wEAEwGCCwAOAecBABEBggsADAHrAQAPAYILAAoB7wEADQGCCwAJAfIBAAsBggsABwH1AQAKAYILAAYB+AEACAGCCwAFAfoBAAcB" +
    "ggsABAH8AQAGAYILAAMB/gEABQGCCwACAYACAAQBggsAAQGCAgADAYILAAEBgwIAAgGGDQACAYcNAAEB/vUNAA==",
    magenta:     "5tcVAAoB+wwAEAH2DAAUAfIMABgB7gwAGwHsDAAdAeoMAB8B6AwAIQHmDAAjAeQMACQB4wwAJgHhDAAnAeEMACgB3wwAKQHfDAApAd4MACsB3QwAKwHdDAAr" +
    "AdwMACwB3AwALAHcDAAsAdwMACwB3AwALAHcDAArAd0MACsB3QwAKwHeDAApAd8MACoB3gwAKgHdDAAsAdwMACwB3AwALQHaDAAuAdoMAC4B2gwALwHZDAAv" +
    "AdkMAC8B2QwALwHZDAAvAdkMAC8B2QwAMAHYDAAwAdgMADAB2AwAMQHXDAAxAdcMADEB1wwAMQHXDAAxAdcMADEB1wwAMQHYDAAwAdgMADAB2AwAMAHZDAAu" +
    "AdoMAC4B2wwALQHbDAAsAd0MACsB3gwAKQHgDAAoAeEMACYB4wwAJAHmDAAhAekMAB4B7AwAGwHvDAAXAfQMABIB+wwACgHcwEMA",
    cyan:     "ocZPAB4B5gwAJwHYDAA0AdAMADwBnAwAcAGNDAB+AYYMAIQBAYAMAI4BAfELAJwBAQ0AFgG4CwC0AQECAB8BrwsA3QEBqAsA4wEBowsA5wEBnwsA6wEBmwsA" +
    "7wEBmAsA8gEBlAsA9QEBkgsA+AEBjwsA+gEBjQsA/AEBiwsA/gEBiQsAgAIBhwsAggIBhgsAgwIBhAsAhAIBgwsAhgIBggsAhwIBgAsAiAIBgAsAiQIB/goA" +
    "igIB/goAiwIB/AoAjAIB/AoAjQIB+woAjQIB+goAjgIB+goAjwIB+QoAjwIB+QoAjwIB+AoAkAIB+AoAkQIB9woAkQIB9woAkQIB9woAkQIB9woAkQIB9woA" +
    "kQIB9woAkQIB9woAkQIB9woAkQIB9woAkQIB9woAkQIB9woAkQIB+AoAjwIB+QoAjwIB+QoAjwIB+QoAjwIB+goAjQIB+woAjQIB+woAjQIB/AoAiwIB/QoA" +
    "iwIB/goAiQIB/woAiQIBgAsAhwIBgQsAhwIBggsAhQIBhAsAgwIBhQsAgwIBhgsAgQIBiAsA/wEBigsA/QEBjAsAjAEBCABnAY4LAIcBARAAYgGQCwB+ARsA" +
    "XgGTCwB4ASEAWgGWCwBEAVYAVwGZCwA3AWQAUgGdCwAxAWwATAGhCwArAXkAQQGmCwAgAYYBADkBrQsADAGdAQAZAQcADgHmtAgA",
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
        if (source >= encoded.length || shift > 28) throw new Error("Malformed item navigation RLE");
        const byte = encoded[source++]; count |= (byte & 127) << shift; shift += 7;
        if (!(byte & 128)) break;
      } while (true);
      if (!count || source >= encoded.length || target + count > result.length) throw new Error("Invalid item navigation RLE span");
      result.fill(encoded[source++], target, target + count); target += count;
    }
    if (target !== result.length) throw new Error("Incomplete item navigation RLE");
    return result;
  }

  return Object.freeze({
    package: PACKAGE, width: WIDTH, height: HEIGHT,
    masks: Object.freeze({ white: decodeRle(MASK_RLE.white), magenta: decodeRle(MASK_RLE.magenta), cyan: decodeRle(MASK_RLE.cyan) }),
  });
});
