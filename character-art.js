(function (root, factory) {
  "use strict";

  const api = factory(typeof module === "object" && module.exports ? require("./locomotion.js") : root.LanternLocomotion);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LanternArt = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Locomotion) {
  "use strict";

  const TAU = Math.PI * 2;
  const actorPresets = Object.freeze({
    player: Object.freeze({
      skin: "#f3c9a5", skinShade: "#d99d7c", hair: "#17253f", hairLight: "#294568",
      outfit: "#286a70", outfitDark: "#17444d", accent: "#ffc857", scarf: "#ef6f6c",
      shoe: "#172238", eye: "#172238", outline: "#101827", accessory: "lantern",
    }),
    keeper: Object.freeze({
      skin: "#f0c29d", skinShade: "#d89475", hair: "#3d2635", hairLight: "#724052",
      outfit: "#d89a36", outfitDark: "#86582d", accent: "#ffe198", scarf: "#4ca69d",
      shoe: "#3a2a31", eye: "#322039", outline: "#171523", accessory: "hairpin",
    }),
    smith: Object.freeze({
      skin: "#dca47f", skinShade: "#b97861", hair: "#343849", hairLight: "#65697b",
      outfit: "#b94f42", outfitDark: "#693438", accent: "#ffb260", scarf: "#283047",
      shoe: "#282738", eye: "#2c1b22", outline: "#151522", accessory: "hammer",
    }),
    healer: Object.freeze({
      skin: "#f5cba8", skinShade: "#d99c7a", hair: "#433248", hairLight: "#775b70",
      outfit: "#68ad75", outfitDark: "#356649", accent: "#d9f29c", scarf: "#f4d08b",
      shoe: "#2c3b3a", eye: "#26342f", outline: "#111d20", accessory: "leaf",
    }),
    villager: Object.freeze({
      skin: "#efc19f", skinShade: "#d49374", hair: "#3d3541", hairLight: "#66536a",
      outfit: "#596b91", outfitDark: "#354260", accent: "#f0ce78", scarf: "#8bcfc3",
      shoe: "#283047", eye: "#242237", outline: "#121827", accessory: "none",
    }),
  });

  const enemyPresets = Object.freeze({
    slime: Object.freeze({ body: "#7c75c9", shade: "#514b91", light: "#c3bdf5", eye: "#25203b", accent: "#8ce4c5", outline: "#292643" }),
    wisp: Object.freeze({ body: "#b59bf0", shade: "#715aa8", light: "#fff4ff", eye: "#40335e", accent: "#70e7dc", outline: "#493b69" }),
    hound: Object.freeze({ body: "#59677d", shade: "#354052", light: "#9ba9b7", eye: "#ffcf65", accent: "#e66b75", outline: "#202838" }),
    boss: Object.freeze({ body: "#683f72", shade: "#3b294b", light: "#a871a7", eye: "#ffc857", accent: "#ff6b91", outline: "#251b36" }),
    chick: Object.freeze({ body: "#d89d42", shade: "#9d632e", light: "#ffe0a0", eye: "#28202a", accent: "#fff0b2", outline: "#493020" }),
    fox: Object.freeze({ body: "#c9783e", shade: "#7d412b", light: "#ffe0ac", eye: "#2b2023", accent: "#f7a64f", outline: "#4b2c24" }),
    raccoon: Object.freeze({ body: "#7c6656", shade: "#443b3b", light: "#c8b49d", eye: "#242031", accent: "#a8d2c0", outline: "#302737" }),
    wild_boar: Object.freeze({ body: "#9a684c", shade: "#5a3b34", light: "#d6a47d", eye: "#2a2020", accent: "#f2c084", outline: "#442c2a" }),
    bear: Object.freeze({ body: "#a66f45", shade: "#67402f", light: "#e1b28c", eye: "#2a2020", accent: "#f0b75c", outline: "#4d302a" }),
    turtle: Object.freeze({ body: "#817548", shade: "#4f4a31", light: "#d1bb72", eye: "#26221e", accent: "#a8d56e", outline: "#373625" }),
    coyote: Object.freeze({ body: "#87786f", shade: "#4d4647", light: "#c6b8ae", eye: "#26212d", accent: "#d9a95e", outline: "#37313a" }),
    frog: Object.freeze({ body: "#7ba15a", shade: "#4d653c", light: "#d2d67d", eye: "#20201d", accent: "#e8ad47", outline: "#35432d" }),
    snake: Object.freeze({ body: "#d09535", shade: "#7d4c26", light: "#ffe2a0", eye: "#241b18", accent: "#f26f55", outline: "#4c2c22" }),
  });

  // Monster labels are anchored to authored body space, never to the top of
  // an atlas cell.  The facing atlases intentionally include transparent
  // breathing room, so a cell edge is not a reliable visual anchor.
  const monsterVisualProfiles = Object.freeze({
    slime: Object.freeze({ nameLift: 56, nameOffsetX: 0 }),
    wisp: Object.freeze({ nameLift: 58, nameOffsetX: 0 }),
    hound: Object.freeze({ nameLift: 58, nameOffsetX: 0 }),
    boss: Object.freeze({ nameLift: 80, nameOffsetX: 0 }),
    mossbun: Object.freeze({ nameLift: 56, nameOffsetX: 0 }),
    mistwing: Object.freeze({ nameLift: 62, nameOffsetX: 0 }),
    cragboar: Object.freeze({ nameLift: 60, nameOffsetX: 0 }),
    hollowmage: Object.freeze({ nameLift: 64, nameOffsetX: 0 }),
    "lantern-golem": Object.freeze({ nameLift: 72, nameOffsetX: 0 }),
    deepwarden: Object.freeze({ nameLift: 82, nameOffsetX: 0 }),
    chick: Object.freeze({ nameLift: 58, nameOffsetX: 0 }),
    fox: Object.freeze({ nameLift: 62, nameOffsetX: 0 }),
    raccoon: Object.freeze({ nameLift: 60, nameOffsetX: 0 }),
    wild_boar: Object.freeze({ nameLift: 68, nameOffsetX: 0 }),
    bear: Object.freeze({ nameLift: 84, nameOffsetX: 0 }),
    turtle: Object.freeze({ nameLift: 72, nameOffsetX: 0 }),
    coyote: Object.freeze({ nameLift: 64, nameOffsetX: 0 }),
    frog: Object.freeze({ nameLift: 62, nameOffsetX: 0 }),
    snake: Object.freeze({ nameLift: 78, nameOffsetX: 0 }),
  });

  // Every named NPC owns one stable frame in both the map and portrait
  // atlases.  The generic villager intentionally reuses the glasses-free
  // adventurer frame: frame 11 contains eyewear and is excluded from every
  // runtime actor by policy.
  const npcArtIndices = Object.freeze({
    keeper: 0,
    smith: 1,
    healer: 2,
    guildmaster: 3,
    clerk: 4,
    adventurer: 5,
    duelist: 6,
    merchant: 7,
    armorer: 8,
    tailor: 9,
    explorer: 10,
    villager: 5,
  });

  const npcArtPolicy = Object.freeze({
    fallbackActor: "villager",
    excludedFrameIndices: Object.freeze([11]),
    eyewearAllowed: false,
    keeperMapStyle: "chibi-head-crop",
  });

  // Semantic anchors are authored in source-cell coordinates. They describe
  // the character rather than the full transparent cut-out, so a staff,
  // hammer, familiar or serving tray can never drag the world pivot and name
  // away from the actor's body. Sprite, name and quest mark all resolve these
  // same anchors after the alpha crop has been fitted.
  const npcMapProfiles = Object.freeze({
    keeper: Object.freeze({
      bodyWidthScale: 1,
      foot: Object.freeze({ x: .641, y: .978 }),
      name: Object.freeze({ x: .633 }),
      marker: Object.freeze({ x: .633 }),
      head: Object.freeze({ x: 0.42, y: 0.025, w: 0.34, h: 0.39, scale: 1.5 }),
    }),
    smith: Object.freeze({
      foot: Object.freeze({ x: .521, y: .978 }),
      name: Object.freeze({ x: .55 }),
      marker: Object.freeze({ x: .55 }),
    }),
    healer: Object.freeze({
      foot: Object.freeze({ x: .449, y: .978 }),
      name: Object.freeze({ x: .456 }),
      marker: Object.freeze({ x: .456 }),
    }),
  });

  const heroAnimationStates = Object.freeze({
    idle: Object.freeze({ row: 0, frames: Object.freeze([0, 1, 2, 3, 4, 5]), fps: 3, loop: true }),
    walk: Object.freeze({ row: 1, frames: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]), fps: 10, loop: true }),
    run: Object.freeze({ row: 2, frames: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]), fps: 18, loop: true }),
    attack: Object.freeze({ row: 3, frames: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), fps: 20, loop: false }),
    death: Object.freeze({ row: 4, frames: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]), fps: 8, loop: false }),
  });

  const environmentSpriteIndices = Object.freeze({
    guildHouse: 0,
    forgeHouse: 1,
    teaHouse: 2,
    cottage: 3,
    broadleafTree: 4,
    pineTree: 5,
    autumnTree: 6,
    blossomTree: 7,
    rock: 8,
    lamp: 9,
    sign: 10,
    chest: 11,
    shrine: 12,
    questBoard: 13,
    barrelCrate: 14,
    well: 15,
    guildCounter: 16,
    indoorBookshelf: 17,
    equipmentDisplay: 18,
    indoorForge: 19,
  });

  // Scale is applied on top of the caller's world-space size.  The atlas cells
  // contain generous transparent padding, so a nominal 88px tree previously
  // looked barely taller than a 76px NPC.  These authored multipliers restore
  // a readable RPG hierarchy: props < characters < trees < buildings.
  const environmentSpriteMetrics = Object.freeze({
    guildHouse: Object.freeze({
      category: "building",
      scale: 1.24,
      anchors: Object.freeze({ door: Object.freeze({ x: 254 / 384, y: 354 / 384 }) }),
    }),
    forgeHouse: Object.freeze({
      category: "building",
      scale: 1.28,
      anchors: Object.freeze({ door: Object.freeze({ x: 264 / 384, y: 320 / 384 }) }),
    }),
    teaHouse: Object.freeze({ category: "building", scale: 1.24 }),
    cottage: Object.freeze({ category: "building", scale: 1.22 }),
    broadleafTree: Object.freeze({ category: "tree", scale: 2.1, minCharacterHeights: 2 }),
    pineTree: Object.freeze({ category: "tree", scale: 2.1, minCharacterHeights: 2 }),
    autumnTree: Object.freeze({ category: "tree", scale: 2.1, minCharacterHeights: 2 }),
    blossomTree: Object.freeze({ category: "tree", scale: 2.1, minCharacterHeights: 2 }),
    rock: Object.freeze({ category: "ground-prop", scale: 1 }),
    lamp: Object.freeze({ category: "human-height-prop", scale: 1.32 }),
    sign: Object.freeze({ category: "waist-height-prop", scale: 1 }),
    chest: Object.freeze({ category: "waist-height-prop", scale: 1 }),
    shrine: Object.freeze({ category: "large-prop", scale: 1.28 }),
    questBoard: Object.freeze({ category: "human-height-prop", scale: 1.12 }),
    barrelCrate: Object.freeze({ category: "waist-height-prop", scale: 1 }),
    well: Object.freeze({ category: "large-prop", scale: 1.12 }),
    guildCounter: Object.freeze({ category: "furniture", scale: 1 }),
    indoorBookshelf: Object.freeze({ category: "furniture", scale: 1 }),
    equipmentDisplay: Object.freeze({ category: "furniture", scale: 1 }),
    indoorForge: Object.freeze({ category: "furniture", scale: 1 }),
  });

  const terrainSpriteIndices = Object.freeze({
    grass: 0,
    path: 1,
    water: 2,
    stone: 3,
    guildWood: 4,
    interiorWall: 5,
    shopWood: 6,
    dungeonStone: 7,
    guildRug: 8,
    shopRug: 9,
    riverBank: 10,
    bridge: 11,
  });

  const interiorSpriteIndices = Object.freeze({
    indoorQuestBoard: 0,
    guildTable: 1,
    fittingScreen: 2,
    mannequin: 3,
    guildBanner: 4,
    fireplace: 5,
    wallSconce: 6,
    ancientLamp: 7,
    glowMushroom: 8,
    rubble: 9,
    crackedTile: 10,
    pillar: 11,
  });

  const monsterSpriteIndices = Object.freeze({
    slime: Object.freeze({ atlas: "monstersCore", row: 0 }),
    wisp: Object.freeze({ atlas: "monstersCore", row: 1 }),
    hound: Object.freeze({ atlas: "monstersCore", row: 2 }),
    boss: Object.freeze({ atlas: "monstersCore", row: 3 }),
    mossbun: Object.freeze({ atlas: "monstersCore", row: 4 }),
    mistwing: Object.freeze({ atlas: "monstersDepths", row: 0 }),
    cragboar: Object.freeze({ atlas: "monstersDepths", row: 1 }),
    hollowmage: Object.freeze({ atlas: "monstersDepths", row: 2 }),
    "lantern-golem": Object.freeze({ atlas: "monstersDepths", row: 3 }),
    deepwarden: Object.freeze({ atlas: "monstersDepths", row: 4 }),
    // Canonical ordinary monsters resolve through the shared 28-frame
    // locomotion atlases registered from Locomotion.assets above. These
    // entries intentionally carry no static four-facing fallback metadata.
    chick: Object.freeze({ locomotion: true }),
    fox: Object.freeze({ locomotion: true }),
    raccoon: Object.freeze({ locomotion: true }),
    wild_boar: Object.freeze({ locomotion: true }),
    bear: Object.freeze({ locomotion: true }),
    turtle: Object.freeze({ locomotion: true }),
    coyote: Object.freeze({ locomotion: true }),
    frog: Object.freeze({ locomotion: true }),
    snake: Object.freeze({ locomotion: true }),
  });

  const markerSpriteIndices = Object.freeze({ question: 0, exclamation: 1, interact: 2, portal: 3 });
  const markerDisplayPolicy = Object.freeze({
    question: "quest-state-only",
    exclamation: "quest-state-only",
    interact: "nearby-interaction-only",
    portal: "caller-controlled-map-marker",
  });

  const spriteAtlases = {
    heroLegacy: { src: "assets/hero-sprites-v3.png", columns: 4, rows: 2, image: null, ready: false, failed: false },
    heroDown: { src: "assets/hero-anim-down-v3.png", columns: 10, rows: 5, image: null, ready: false, failed: false },
    heroUp: { src: "assets/hero-anim-up-v3.png", columns: 10, rows: 5, image: null, ready: false, failed: false },
    heroRight: { src: "assets/hero-anim-right-v3.png", columns: 10, rows: 5, image: null, ready: false, failed: false },
    fighter: { src: "assets/fighter-atlas-v2.png", columns: 4, rows: 5, image: null, ready: false, failed: false },
    fighterWalk: { src: "assets/fighter-walk-atlas-v4.png", columns: 4, rows: 4, rowCuts: [0, 292 / 1199, 585 / 1199, 869 / 1199, 1], image: null, ready: false, failed: false },
    // Only the smith's left gutter contains the previous actor's pale cloak.
    // Scope the legacy crop to that frame so other NPCs retain their full art.
    npcMap: { src: "assets/npc-map-chibi-v4.png", columns: 4, rows: 3, cellInsets: { 1: { left: 24 } }, image: null, ready: false, failed: false },
    npcPortraits: { src: "assets/npc-dialogue-portraits-v4.png", columns: 4, rows: 3, cellGutterX: 16, cellInsets: { 2: { right: 32 } }, image: null, ready: false, failed: false },
    environment: { src: "assets/environment-atlas-v5.png", columns: 4, rows: 5, image: null, ready: false, failed: false },
    terrain: { src: "assets/terrain-atlas-v1.png", columns: 4, rows: 3, image: null, ready: false, failed: false },
    battleMountainBackground: { src: "assets/battle/mountain/mountain-battle-background-v1.png", columns: 1, rows: 1, image: null, ready: false, failed: false },
    battleMountainGround: { src: "assets/battle/mountain/mountain-battle-ground-v2.png", columns: 1, rows: 1, image: null, ready: false, failed: false },
    interior: { src: "assets/interior-props-v2.png", columns: 4, rows: 3, image: null, ready: false, failed: false },
    monstersCore: { src: "assets/monster-facing-core-v1.png", columns: 4, rows: 5, image: null, ready: false, failed: false },
    monstersDepths: { src: "assets/monster-facing-depths-v1.png", columns: 4, rows: 5, image: null, ready: false, failed: false },
    markers: { src: "assets/marker-atlas-v1.png", columns: 2, rows: 2, image: null, ready: false, failed: false },
    guildBuilding: { src: "assets/guild-building-v1.png", standalone: true, image: null, ready: false, failed: false },
    equipmentShopBuilding: { src: "assets/equipment-shop-v2.png", standalone: true, image: null, ready: false, failed: false },
    clinicBuilding: { src: "assets/clinic-building-v1.png", standalone: true, image: null, ready: false, failed: false },
    generalStoreBuilding: { src: "assets/general-store-building-v1.png", standalone: true, image: null, ready: false, failed: false },
    innBuilding: { src: "assets/inn-building-v1.png", standalone: true, image: null, ready: false, failed: false },
    innBed: { src: "assets/inn-bed-v1.png", standalone: true, image: null, ready: false, failed: false },
  };

  for (const [id, src] of Object.entries(Locomotion.assets)) {
    spriteAtlases[`locomotion_${id}`] = { src, standard: true, image: null, ready: false, failed: false };
  }

  function loadSpriteAtlases() {
    if (typeof Image !== "function") return;
    for (const atlas of Object.values(spriteAtlases)) {
      if (atlas.image) continue;
      const image = new Image();
      atlas.image = image;
      image.decoding = "async";
      image.addEventListener("load", () => {
        const m = Locomotion.STANDARD_MOBILE_UNIT_SPRITE;
        atlas.ready = !atlas.standard || (image.naturalWidth === m.columns * m.cellWidth && image.naturalHeight === m.rows * m.cellHeight);
        atlas.failed = !atlas.ready;
        if (!atlas.standard) atlas.alphaBounds = scanAtlasAlphaBounds(atlas);
        if (typeof globalThis.dispatchEvent === "function" && typeof CustomEvent === "function") {
          globalThis.dispatchEvent(new CustomEvent("lantern-art-ready", { detail: { src: atlas.src } }));
        }
      });
      image.addEventListener("error", () => { atlas.failed = true; });
      image.src = atlas.src;
    }
  }

  loadSpriteAtlases();

  function atlasFrame(atlas, index) {
    const width = atlas.image.naturalWidth || atlas.image.width;
    const height = atlas.image.naturalHeight || atlas.image.height;
    const column = index % atlas.columns;
    const row = Math.floor(index / atlas.columns);
    const left = Math.floor(column * width / atlas.columns);
    const right = Math.floor((column + 1) * width / atlas.columns);
    const top = Math.round((atlas.rowCuts?.[row] ?? row / atlas.rows) * height);
    const bottom = Math.round((atlas.rowCuts?.[row + 1] ?? (row + 1) / atlas.rows) * height);
    return {
      sx: left,
      sy: top,
      sw: right - left,
      sh: bottom - top,
    };
  }

  function safeAtlasFrame(atlas, index) {
    const frame = atlasFrame(atlas, index);
    const insets = atlas.cellInsets?.[index] || {};
    const gutterX = Math.max(0, Math.min(frame.sw * .12, Number(atlas.cellGutterX) || 0));
    const gutterY = Math.max(0, Math.min(frame.sh * .12, Number(atlas.cellGutterY) || 0));
    const left = Math.floor(insets.left ?? gutterX);
    const right = Math.floor(insets.right ?? gutterX);
    const top = Math.floor(insets.top ?? gutterY);
    const bottom = Math.floor(insets.bottom ?? gutterY);
    return {
      sx: frame.sx + left,
      sy: frame.sy + top,
      sw: Math.max(1, frame.sw - left - right),
      sh: Math.max(1, frame.sh - top - bottom),
    };
  }

  function scanAtlasAlphaBounds(atlas) {
    if (!atlas?.image) return null;
    const width = atlas.image.naturalWidth || atlas.image.width;
    const height = atlas.image.naturalHeight || atlas.image.height;
    if (!width || !height) return null;
    let surface = null;
    try {
      if (typeof OffscreenCanvas === "function") surface = new OffscreenCanvas(width, height);
      else if (typeof document !== "undefined" && document.createElement) {
        surface = document.createElement("canvas");
        surface.width = width;
        surface.height = height;
      }
      const scan = surface?.getContext?.("2d", { willReadFrequently: true });
      if (!scan) return null;
      scan.clearRect(0, 0, width, height);
      scan.drawImage(atlas.image, 0, 0);
      const pixels = scan.getImageData(0, 0, width, height).data;
      const result = [];
      for (let index = 0; index < atlas.columns * atlas.rows; index += 1) {
        const frame = safeAtlasFrame(atlas, index);
        let minX = frame.sx + frame.sw;
        let minY = frame.sy + frame.sh;
        let maxX = frame.sx - 1;
        let maxY = frame.sy - 1;
        for (let y = frame.sy; y < frame.sy + frame.sh; y += 1) {
          for (let x = frame.sx; x < frame.sx + frame.sw; x += 1) {
            if (pixels[(y * width + x) * 4 + 3] <= 8) continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
        result[index] = maxX >= minX && maxY >= minY
          ? { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 }
          : frame;
      }
      return result;
    } catch (_) {
      // Same-origin game assets are readable.  Keep the complete cell as a
      // safe fallback for file previews or locked-down canvas environments.
      return null;
    }
  }

  function opaqueAtlasFrame(atlas, index) {
    return atlas.alphaBounds?.[index] || safeAtlasFrame(atlas, index);
  }

  function fitFrameToBaseline(bounds, options = {}) {
    const height = Math.max(1, Number(options.height) || Number(bounds?.sh) || 1);
    const sourceWidth = Math.max(1, Number(bounds?.sw) || 1);
    const sourceHeight = Math.max(1, Number(bounds?.sh) || 1);
    const widthScale = Math.max(.1, Number(options.widthScale) || 1);
    const width = height * sourceWidth / sourceHeight * widthScale;
    const centerX = Number(options.x) || 0;
    const baselineY = Number(options.y) || 0;
    const anchorXRatio = Math.max(0, Math.min(1, Number.isFinite(options.anchorXRatio) ? options.anchorXRatio : .5));
    const anchorYRatio = Math.max(0, Math.min(1, Number.isFinite(options.anchorYRatio) ? options.anchorYRatio : 1));
    const left = centerX - width * anchorXRatio;
    const top = baselineY - height * anchorYRatio;
    return {
      x: left,
      y: top,
      width,
      height,
      left,
      right: left + width,
      top,
      bottom: top + height,
      centerX,
      baselineY,
      nameAnchorX: centerX,
      nameAnchorY: baselineY - height,
    };
  }

  function sourceCellRatioToOpaque(frame, opaque, ratio, axis) {
    const sourceStart = axis === "y" ? frame.sy : frame.sx;
    const sourceSize = axis === "y" ? frame.sh : frame.sw;
    const opaqueStart = axis === "y" ? opaque.sy : opaque.sx;
    const opaqueSize = Math.max(1, axis === "y" ? opaque.sh : opaque.sw);
    return (sourceStart + sourceSize * ratio - opaqueStart) / opaqueSize;
  }

  function heroAnimationFrame(settings) {
    const requestedState = settings.state || "idle";
    const state = heroAnimationStates[requestedState] ? requestedState : "idle";
    const animation = heroAnimationStates[state];
    const facing = settings.facing || "down";
    const atlas = facing === "up"
      ? spriteAtlases.heroUp
      : ["left", "right"].includes(facing)
        ? spriteAtlases.heroRight
        : spriteAtlases.heroDown;
    let step;
    if (Number.isFinite(settings.progress)) {
      step = Math.min(animation.frames.length - 1, Math.floor(Math.max(0, Math.min(1, settings.progress)) * animation.frames.length));
    } else if (animation.loop) {
      step = Math.floor(Math.max(0, Number(settings.phase) || 0) * animation.fps) % animation.frames.length;
    } else {
      step = 0;
    }
    return {
      atlas,
      index: animation.row * 10 + animation.frames[step],
      mirror: facing === "left",
      animation: state,
    };
  }

  function fighterAnimationFrame(settings) {
    const facingColumns = { down: 0, right: 1, up: 2, left: 3 };
    const walkingRows = { down: 0, right: 1, up: 2, left: 3 };
    const facing = Object.hasOwn(facingColumns, settings.facing) ? settings.facing : "down";
    const state = settings.state || "idle";
    const phase = Math.max(0, Number(settings.phase) || 0);
    if (["walk", "run"].includes(state) && spriteAtlases.fighterWalk.ready) {
      const frame = Math.floor(phase * (state === "run" ? 12 : 8)) % 4;
      return {
        atlas: spriteAtlases.fighterWalk,
        index: walkingRows[facing] * 4 + frame,
        mirror: false,
        animation: state,
      };
    }
    let row = 0;
    if (["walk", "run"].includes(state)) row = 1 + (Math.floor(phase * (state === "run" ? 12 : 8)) % 2);
    else if (state === "attack") {
      const progress = Number.isFinite(settings.progress) ? Math.max(0, Math.min(1, settings.progress)) : 0;
      row = progress >= .48 ? 4 : 3;
    }
    return { atlas: spriteAtlases.fighter, index: row * 4 + facingColumns[facing], mirror: false, animation: state };
  }

  function bitmapFrameFor(settings) {
    const actor = settings.actor || settings.kind || "villager";
    if (actor !== "player") {
      return { atlas: spriteAtlases.npcMap, index: npcArtIndices[actor] ?? npcArtIndices.villager, mirror: false };
    }
    return settings.classId === "fighter" ? fighterAnimationFrame(settings) : heroAnimationFrame(settings);
  }

  function portraitFrameFor(actor, classId) {
    if (actor === "player" && classId === "fighter") return { atlas: spriteAtlases.fighter, index: 0 };
    if (actor === "player") return { atlas: spriteAtlases.heroLegacy, index: 0 };
    return { atlas: spriteAtlases.npcPortraits, index: npcArtIndices[actor] ?? npcArtIndices.villager };
  }

  function drawLocomotion(ctx, settings, id) {
    if (![undefined, "idle", "walk", "hurt"].includes(settings.state)) return false;
    const atlas = spriteAtlases[`locomotion_${id}`];
    if (!atlas?.ready || !atlas.image) return false;
    const animation = settings.locomotion || { state: settings.state, facing: settings.facing, time: settings.phase || 0 };
    const selected = Locomotion.frame(settings.state === "hurt" ? Locomotion.create(settings.facing) : animation);
    const x = Number(settings.x) || 0;
    const y = Number(settings.y) || 0;
    const scale = Math.max(.08, Number(settings.scale) || 1);
    const profile = monsterVisualProfiles[id] || null;
    const box = Locomotion.layout(x, y, scale);
    ctx.save();
    try {
      drawGroundShadow(ctx, x, y, scale, 15, .34);
      if (settings.selected) {
        ctx.strokeStyle = settings.selectionColor || "#ffc857";
        ctx.lineWidth = 1.4 * scale;
        ctx.beginPath(); ctx.ellipse(x, y, 20 * scale, 6 * scale, 0, 0, TAU); ctx.stroke();
      }
      if (settings.state === "hurt") ctx.globalAlpha *= .64;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(atlas.image, selected.sx, selected.sy, selected.sw, selected.sh, box.x, box.y, box.width, box.height);
    } finally { ctx.restore(); }
    const nameAnchorX = x + (profile?.nameOffsetX || 0) * scale;
    const nameAnchorY = profile ? y - profile.nameLift * scale : box.y - 4 * scale;
    return { ...box, left: box.x, right: box.x + box.width, top: box.y, bottom: y,
      nameAnchorX, nameAnchorY,
      markerAnchorX: nameAnchorX,
      markerAnchorY: profile ? nameAnchorY - 20 * scale : box.y - 23 * scale,
      atlas: atlas.src, frame: selected.index, facing: selected.facing };
  }

  function drawBitmapCharacter(ctx, settings) {
    if ((settings.actor || settings.kind) === "player") {
      const standard = drawLocomotion(ctx, settings, settings.classId || "warrior");
      if (standard) return standard;
    }
    const selected = bitmapFrameFor(settings);
    if (!selected.atlas.ready || !selected.atlas.image) return false;
    const frame = atlasFrame(selected.atlas, selected.index);
    const opaque = opaqueAtlasFrame(selected.atlas, selected.index);
    const x = Number(settings.x) || 0;
    const y = Number(settings.y) || 0;
    const scale = Math.max(.08, Number(settings.scale) || 1);
    const actor = settings.actor || settings.kind || "villager";
    const isHero = actor === "player";
    const isDetailedNpc = selected.atlas === spriteAtlases.npcMap;
    const mapProfile = isDetailedNpc ? npcMapProfiles[actor] : null;
    const height = (isHero ? 82 : 76) * scale;
    const hurt = settings.state === "hurt" || Boolean(settings.hurt);
    const moving = ["walk", "run"].includes(settings.state);
    const phase = Number(settings.phase) || 0;
    const bob = moving
      ? Math.abs(Math.sin(phase * (settings.state === "run" ? 14 : 8))) * -1.15 * scale
      : isDetailedNpc
        ? Math.sin(phase * 2.25 + selected.index * .73) * .72 * scale
        : 0;
    const footAnchorX = mapProfile?.foot
      ? sourceCellRatioToOpaque(frame, opaque, mapProfile.foot.x, "x")
      : .5;
    const footAnchorY = mapProfile?.foot
      ? sourceCellRatioToOpaque(frame, opaque, mapProfile.foot.y, "y")
      : 1;
    const box = fitFrameToBaseline(opaque, {
      x,
      y: y + bob,
      height,
      widthScale: mapProfile?.bodyWidthScale || 1,
      anchorXRatio: footAnchorX,
      anchorYRatio: footAnchorY,
    });
    let visualTop = box.top;
    ctx.save();
    try {
      drawGroundShadow(ctx, x, y, scale, isHero ? 15 : actor === "smith" ? 17 : 14, hurt ? .24 : .4);
      if (settings.selected) {
        ctx.strokeStyle = settings.selectionColor || "#ffc857";
        ctx.lineWidth = Math.max(1.2, 1.35 * scale);
        ctx.setLineDash([3 * scale, 2 * scale]);
        ctx.beginPath(); ctx.ellipse(x, y + 1.5 * scale, box.width * .32, height * .09, 0, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      let hurtOffset = 0;
      if (hurt) {
        ctx.globalAlpha = .63;
        hurtOffset = Math.sin((Number(settings.phase) || 0) * 35) * 1.4 * scale;
      }
      ctx.translate(x + hurtOffset, 0);
      if (selected.mirror) ctx.scale(-1, 1);
      const localX = box.x - x;
      const drawY = box.y;
      ctx.drawImage(selected.atlas.image, opaque.sx, opaque.sy, opaque.sw, opaque.sh, localX, drawY, box.width, box.height);
      if (mapProfile?.head) {
        const crop = mapProfile.head;
        const sourceX = frame.sx + frame.sw * crop.x;
        const sourceY = frame.sy + frame.sh * crop.y;
        const sourceWidth = frame.sw * crop.w;
        const sourceHeight = frame.sh * crop.h;
        const scaleX = box.width / opaque.sw;
        const scaleY = box.height / opaque.sh;
        const originalX = localX + (sourceX - opaque.sx) * scaleX;
        const originalY = drawY + (sourceY - opaque.sy) * scaleY;
        const originalWidth = sourceWidth * scaleX;
        const originalHeight = sourceHeight * scaleY;
        const enlargedWidth = originalWidth * crop.scale;
        const enlargedHeight = originalHeight * crop.scale;
        visualTop = Math.min(visualTop, originalY + originalHeight - enlargedHeight);
        ctx.drawImage(
          selected.atlas.image,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          originalX + (originalWidth - enlargedWidth) / 2,
          originalY + originalHeight - enlargedHeight,
          enlargedWidth,
          enlargedHeight,
        );
      }
    } finally {
      ctx.restore();
    }
    const semanticAnchorX = (anchor, fallback) => {
      if (!Number.isFinite(anchor?.x)) return fallback;
      const ratio = sourceCellRatioToOpaque(frame, opaque, anchor.x, "x");
      return box.x + box.width * ratio;
    };
    const nameAnchorX = semanticAnchorX(mapProfile?.name, x);
    const markerAnchorX = semanticAnchorX(mapProfile?.marker, nameAnchorX);
    return {
      ...box,
      top: visualTop,
      bottom: box.bottom,
      nameAnchorX,
      nameAnchorY: visualTop - 4 * scale,
      markerAnchorX,
      markerAnchorY: visualTop - 23 * scale,
      interactAnchorX: nameAnchorX + 23 * scale,
    };
  }

  function drawBitmapPortrait(ctx, settings) {
    const actor = settings.actor || settings.kind || "player";
    const selected = portraitFrameFor(actor, settings.classId);
    if (!selected.atlas.ready || !selected.atlas.image) return false;
    const frame = selected.atlas === spriteAtlases.npcPortraits
      ? safeAtlasFrame(selected.atlas, selected.index)
      : atlasFrame(selected.atlas, selected.index);
    const opaque = opaqueAtlasFrame(selected.atlas, selected.index);
    const x = Number(settings.x) || 0;
    const y = Number(settings.y) || 0;
    const width = Math.max(24, Number(settings.width) || 144);
    const height = Math.max(24, Number(settings.height) || width);
    const crop = actor === "player" && settings.classId === "fighter"
      ? { x: .04, y: 0, w: .92, h: .56, opaque: true }
      : actor === "player"
      ? { x: .12, y: .035, w: .76, h: .59 }
      : { x: 0, y: 0, w: 1, h: 1 };
    const cropFrame = crop.opaque ? opaque : frame;
    let sourceX = cropFrame.sx + cropFrame.sw * crop.x;
    let sourceY = cropFrame.sy + cropFrame.sh * crop.y;
    let sourceWidth = cropFrame.sw * crop.w;
    let sourceHeight = cropFrame.sh * crop.h;
    const targetAspect = width / height;
    const sourceAspect = sourceWidth / sourceHeight;

    // Use a centred "cover" crop so rectangular portrait slots never stretch faces.
    if (sourceAspect > targetAspect) {
      const fittedWidth = sourceHeight * targetAspect;
      sourceX += (sourceWidth - fittedWidth) / 2;
      sourceWidth = fittedWidth;
    } else if (sourceAspect < targetAspect) {
      const fittedHeight = sourceWidth / targetAspect;
      sourceY += (sourceHeight - fittedHeight) / 2;
      sourceHeight = fittedHeight;
    }
    ctx.save();
    try {
      roundedRect(ctx, x, y, width, height, Math.min(width, height) * .12);
      ctx.clip();
      const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
      gradient.addColorStop(0, settings.background || "#315d66");
      gradient.addColorStop(1, settings.backgroundEnd || "#111a31");
      ctx.fillStyle = gradient; ctx.fillRect(x, y, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        selected.atlas.image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        x,
        y,
        width,
        height,
      );
    } finally {
      ctx.restore();
    }
    if (settings.frame !== false) {
      ctx.save();
      roundedRect(ctx, x + .75, y + .75, width - 1.5, height - 1.5, Math.min(width, height) * .12);
      ctx.strokeStyle = settings.frameColor || "#ffc857";
      ctx.lineWidth = Math.max(1.5, Math.min(width, height) * .018);
      ctx.stroke();
      ctx.restore();
    }
    return true;
  }

  function environmentSpriteLayout(options = {}, sourceAspect = 1) {
    const requested = options.sprite;
    const metrics = typeof requested === "string" ? environmentSpriteMetrics[requested] : null;
    const authoredScale = metrics?.scale || 1;
    const width = Math.max(4, Number(options.width) || 1) * authoredScale;
    const height = Math.max(4, Number(options.height) || 1) * authoredScale;
    const anchorX = Number.isFinite(options.anchorX) ? options.anchorX : .5;
    const anchorY = Number.isFinite(options.anchorY) ? options.anchorY : 1;
    const safeAspect = Math.max(.01, Number(sourceAspect) || 1);
    const targetAspect = width / height;
    const drawWidth = safeAspect > targetAspect ? width : height * safeAspect;
    const drawHeight = safeAspect > targetAspect ? width / safeAspect : height;
    const x = Number(options.x) || 0;
    const y = Number(options.y) || 0;
    return {
      left: x - drawWidth * anchorX,
      top: y - drawHeight * anchorY,
      width: drawWidth,
      height: drawHeight,
    };
  }

  function environmentSpriteAnchor(options = {}, anchorName) {
    const metrics = typeof options.sprite === "string" ? environmentSpriteMetrics[options.sprite] : null;
    const anchor = metrics?.anchors?.[anchorName];
    if (!anchor) return null;
    const layout = environmentSpriteLayout(options, metrics.sourceAspect || 1);
    return {
      x: layout.left + layout.width * anchor.x,
      y: layout.top + layout.height * anchor.y,
    };
  }

  function drawEnvironmentSprite(ctx, options) {
    const settings = options || {};
    const atlas = spriteAtlases.environment;
    if (!atlas.ready || !atlas.image) return false;
    const requested = settings.sprite;
    const index = Number.isInteger(requested)
      ? requested
      : environmentSpriteIndices[requested];
    if (!Number.isInteger(index) || index < 0 || index >= atlas.columns * atlas.rows) return false;
    const frame = atlasFrame(atlas, index);
    // A one-pixel source inset prevents neighbouring atlas cells bleeding into
    // scaled sprites while retaining all authored transparent padding.
    const inset = Math.min(1, frame.sw * .004, frame.sh * .004);
    const layout = environmentSpriteLayout(
      { ...settings, width: Number(settings.width) || frame.sw, height: Number(settings.height) || frame.sh },
      frame.sw / frame.sh,
    );
    ctx.save();
    try {
      ctx.globalAlpha *= Number.isFinite(settings.alpha) ? settings.alpha : 1;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        atlas.image,
        frame.sx + inset,
        frame.sy + inset,
        frame.sw - inset * 2,
        frame.sh - inset * 2,
        layout.left,
        layout.top,
        layout.width,
        layout.height,
      );
    } finally {
      ctx.restore();
    }
    return true;
  }

  function drawNamedAtlasSprite(ctx, atlas, indices, options) {
    const settings = options || {};
    if (!atlas.ready || !atlas.image) return false;
    const requested = settings.sprite;
    const index = Number.isInteger(requested) ? requested : indices[requested];
    if (!Number.isInteger(index) || index < 0 || index >= atlas.columns * atlas.rows) return false;
    const frame = atlasFrame(atlas, index);
    const width = Math.max(2, Number(settings.width) || frame.sw);
    const height = Math.max(2, Number(settings.height) || frame.sh);
    const anchorX = Number.isFinite(settings.anchorX) ? settings.anchorX : .5;
    const anchorY = Number.isFinite(settings.anchorY) ? settings.anchorY : 1;
    const x = Number(settings.x) || 0;
    const y = Number(settings.y) || 0;
    const inset = Math.min(1.25, frame.sw * .004, frame.sh * .004);
    ctx.save();
    try {
      ctx.globalAlpha *= Number.isFinite(settings.alpha) ? settings.alpha : 1;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.translate(x, y);
      ctx.scale(settings.flipX ? -1 : 1, settings.flipY ? -1 : 1);
      ctx.drawImage(
        atlas.image,
        frame.sx + inset,
        frame.sy + inset,
        frame.sw - inset * 2,
        frame.sh - inset * 2,
        -width * anchorX,
        -height * anchorY,
        width,
        height,
      );
    } finally {
      ctx.restore();
    }
    return true;
  }

  function drawStandaloneSprite(ctx, options) {
    const settings = options || {};
    const atlas = spriteAtlases[settings.sprite];
    if (!atlas?.standalone || !atlas.ready || !atlas.image) return false;
    const sourceWidth = atlas.image.naturalWidth || atlas.image.width;
    const sourceHeight = atlas.image.naturalHeight || atlas.image.height;
    if (!sourceWidth || !sourceHeight) return false;
    const width = Math.max(2, Number(settings.width) || sourceWidth);
    const height = Math.max(2, Number(settings.height) || width * sourceHeight / sourceWidth);
    const anchorX = Number.isFinite(settings.anchorX) ? settings.anchorX : .5;
    const anchorY = Number.isFinite(settings.anchorY) ? settings.anchorY : 1;
    const x = Number(settings.x) || 0;
    const y = Number(settings.y) || 0;
    ctx.save();
    try {
      ctx.globalAlpha *= Number.isFinite(settings.alpha) ? settings.alpha : 1;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.translate(x, y);
      ctx.scale(settings.flipX ? -1 : 1, settings.flipY ? -1 : 1);
      ctx.drawImage(atlas.image, 0, 0, sourceWidth, sourceHeight, -width * anchorX, -height * anchorY, width, height);
    } finally {
      ctx.restore();
    }
    return true;
  }

  function drawTerrainTile(ctx, options) {
    const settings = options || {};
    const atlas = spriteAtlases.terrain;
    if (!atlas.ready || !atlas.image) return false;
    const index = Number.isInteger(settings.sprite) ? settings.sprite : terrainSpriteIndices[settings.sprite];
    if (!Number.isInteger(index)) return false;
    const frame = atlasFrame(atlas, index);
    const x = Number(settings.x) || 0;
    const y = Number(settings.y) || 0;
    const width = Math.max(2, Number(settings.width) || frame.sw);
    const height = Math.max(2, Number(settings.height) || frame.sh);
    const inset = Math.min(1.5, frame.sw * .006, frame.sh * .006);
    ctx.save();
    try {
      ctx.globalAlpha *= Number.isFinite(settings.alpha) ? settings.alpha : 1;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.translate(x + width / 2, y + height / 2);
      ctx.scale(settings.flipX ? -1 : 1, settings.flipY ? -1 : 1);
      ctx.drawImage(atlas.image, frame.sx + inset, frame.sy + inset, frame.sw - inset * 2, frame.sh - inset * 2, -width / 2, -height / 2, width, height);
    } finally {
      ctx.restore();
    }
    return true;
  }

  function drawBattleBackground(ctx, options) {
    const settings = options || {};
    const atlas = settings.theme === "mountain" ? spriteAtlases.battleMountainBackground : null;
    return drawBattleBitmap(ctx, atlas, settings, true);
  }

  function drawBattleGround(ctx, options) {
    const settings = options || {};
    const atlas = settings.theme === "mountain" ? spriteAtlases.battleMountainGround : null;
    return drawBattleBitmap(ctx, atlas, settings, true);
  }

  function drawBattleBitmap(ctx, atlas, settings, cover) {
    if (!atlas?.ready || !atlas.image) return false;
    const width = Math.max(1, Number(settings.width) || ctx.canvas.width || 1);
    const height = Math.max(1, Number(settings.height) || ctx.canvas.height || 1);
    const x = Number(settings.x) || 0;
    const y = Number(settings.y) || 0;
    const sourceWidth = atlas.image.naturalWidth || atlas.image.width;
    const sourceHeight = atlas.image.naturalHeight || atlas.image.height;
    if (!sourceWidth || !sourceHeight) return false;
    const scale = cover
      ? Math.max(width / sourceWidth, height / sourceHeight)
      : Math.min(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    ctx.save();
    try {
      ctx.globalAlpha *= Number.isFinite(settings.alpha) ? settings.alpha : 1;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        atlas.image,
        0,
        0,
        sourceWidth,
        sourceHeight,
        x + (width - drawWidth) / 2,
        y + (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    } finally {
      ctx.restore();
    }
    return true;
  }

  function drawInteriorSprite(ctx, options) {
    return drawNamedAtlasSprite(ctx, spriteAtlases.interior, interiorSpriteIndices, options);
  }

  function drawMarker(ctx, options) {
    const settings = options || {};
    // Portal visibility belongs to map semantics. Named building entrances
    // can opt in permanently while remote portals stay proximity gated.
    if (settings.sprite === "portal" && settings.mapPortal !== true) return false;
    const size = Math.max(8, Number(settings.size) || 36);
    return drawNamedAtlasSprite(ctx, spriteAtlases.markers, markerSpriteIndices, {
      ...settings,
      width: size,
      height: size,
      anchorY: Number.isFinite(settings.anchorY) ? settings.anchorY : .5,
    });
  }

  function drawBitmapEnemy(ctx, settings) {
    const standard = drawLocomotion(ctx, settings, settings.type);
    if (standard) return standard;
    const type = settings.type || (settings.boss ? "boss" : "slime");
    const profile = monsterVisualProfiles[type] || monsterVisualProfiles.slime;
    const monsterFrame = monsterSpriteIndices[type];
    if (!monsterFrame) return false;
    const atlas = spriteAtlases[monsterFrame.atlas];
    const facingColumns = { down: 0, right: 1, up: 2, left: 3 };
    const direction = Object.hasOwn(facingColumns, settings.facing) ? settings.facing : "down";
    const index = monsterFrame.row * 4 + facingColumns[direction];
    if (!atlas?.ready || !atlas.image) return false;
    const frame = atlasFrame(atlas, index);
    const x = Number(settings.x) || 0;
    const y = Number(settings.y) || 0;
    const scale = Math.max(.08, Number(settings.scale) || 1);
    const boss = type === "boss" || type === "deepwarden" || Boolean(settings.boss);
    const height = (boss ? 104 : type === "lantern-golem" ? 88 : 76) * scale;
    const width = height * (frame.sw / frame.sh);
    const phase = Number(settings.phase) || 0;
    const hurt = settings.state === "hurt" || Boolean(settings.hurt);
    const attacking = settings.state === "attack";
    const bob = Math.sin(phase * (type === "mistwing" || type === "wisp" || type === "hollowmage" ? 3.2 : 2.35) + index) * (attacking ? 1.6 : .72) * scale;
    const drawX = x - width / 2;
    const drawY = y - height + 4 * scale + bob;
    ctx.save();
    try {
      drawGroundShadow(ctx, x, y, scale, boss ? 29 : type === "cragboar" || type === "hound" ? 18 : 14, .34);
      ctx.globalAlpha = hurt ? .64 : 1;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (hurt) ctx.translate(Math.sin(phase * 35) * 1.5 * scale, 0);
      ctx.drawImage(atlas.image, frame.sx + 1, frame.sy + 1, frame.sw - 2, frame.sh - 2, drawX, drawY, width, height);
      if (settings.selected) {
        ctx.strokeStyle = settings.selectionColor || "#ffc857";
        ctx.lineWidth = Math.max(1.4, 1.7 * scale);
        ctx.setLineDash([4 * scale, 2 * scale]);
        ctx.beginPath(); ctx.ellipse(x, y + 2 * scale, width * .32, height * .085, 0, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
    } finally {
      ctx.restore();
    }
    return {
      x: drawX,
      y: drawY,
      width,
      height,
      left: drawX,
      right: drawX + width,
      top: drawY,
      bottom: drawY + height,
      centerX: x,
      baselineY: y,
      nameAnchorX: x + profile.nameOffsetX * scale,
      nameAnchorY: y - profile.nameLift * scale + bob,
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function paletteFor(actor, overrides) {
    const base = actorPresets[actor] || actorPresets.villager;
    return Object.assign({}, base, overrides || {});
  }

  function enemyPaletteFor(type, overrides) {
    const base = enemyPresets[type] || enemyPresets.slime;
    return Object.assign({}, base, overrides || {});
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(Math.abs(width) / 2, Math.abs(height) / 2, Math.max(0, radius));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function oval(ctx, x, y, rx, ry, color, outline, lineWidth) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, TAU);
    if (color) { ctx.fillStyle = color; ctx.fill(); }
    if (outline && lineWidth > 0) { ctx.strokeStyle = outline; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  function pathPaint(ctx, fill, stroke, lineWidth) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke && lineWidth > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  function line(ctx, points, color, width, close) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index][0], points[index][1]);
    if (close) ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function drawGroundShadow(ctx, x, y, scale, size, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(3, 7, 16, ${alpha == null ? .38 : alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y + scale * 1.5, scale * size, scale * size * .32, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawEye(ctx, x, y, facing, palette, mood, blink, scale) {
    if (blink) {
      ctx.strokeStyle = palette.eye;
      ctx.lineWidth = 1.25 * scale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 1.65 * scale, y);
      ctx.quadraticCurveTo(x, y + .85 * scale, x + 1.65 * scale, y);
      ctx.stroke();
      return;
    }
    const narrowed = mood === "angry" || mood === "determined";
    const eyeRy = (narrowed ? 1.85 : 2.45) * scale;
    oval(ctx, x, y, 2.05 * scale, eyeRy, palette.eye, palette.outline, .45 * scale);
    oval(ctx, x - .62 * scale, y - .75 * scale, .7 * scale, .88 * scale, "#fffdf7");
    oval(ctx, x + .72 * scale, y + .9 * scale, .3 * scale, .3 * scale, palette.hairLight || "#7583a2");
    if (narrowed) line(ctx, [[x - 2.3 * scale, y - 2.1 * scale], [x + 1.7 * scale, y - 2.75 * scale]], palette.outline, .8 * scale);
    if (mood === "sad") line(ctx, [[x - 1.8 * scale, y - 2.6 * scale], [x + 1.8 * scale, y - 1.9 * scale]], palette.outline, .7 * scale);
    if (facing === "side") oval(ctx, x + 1.1 * scale, y, .35 * scale, .65 * scale, palette.eye);
  }

  function drawMouth(ctx, x, y, mood, palette, scale) {
    ctx.strokeStyle = palette.outline;
    ctx.fillStyle = "#9d4860";
    ctx.lineWidth = .8 * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (mood === "happy") {
      ctx.arc(x, y - .5 * scale, 2.15 * scale, .15, Math.PI - .15);
      ctx.stroke();
    } else if (mood === "angry" || mood === "determined") {
      ctx.moveTo(x - 2 * scale, y + .55 * scale);
      ctx.lineTo(x + 2 * scale, y - .55 * scale);
      ctx.stroke();
    } else if (mood === "hurt" || mood === "surprised") {
      ctx.ellipse(x, y, 1.25 * scale, 1.55 * scale, 0, 0, TAU);
      ctx.fill();
    } else if (mood === "sad") {
      ctx.arc(x, y + 2 * scale, 2 * scale, Math.PI + .2, TAU - .2);
      ctx.stroke();
    } else {
      ctx.moveTo(x - 1.3 * scale, y);
      ctx.quadraticCurveTo(x, y + .65 * scale, x + 1.45 * scale, y - .15 * scale);
      ctx.stroke();
    }
  }

  function drawHairBack(ctx, palette, facing, actor) {
    if (actor === "healer") {
      oval(ctx, -10.4, -27.2, 5.2, 5.6, palette.hair, palette.outline, 1.3);
      oval(ctx, 10.4, -27.2, 5.2, 5.6, palette.hair, palette.outline, 1.3);
    }
    if (facing === "up") {
      oval(ctx, 0, -25.8, 13, 12, palette.hair, palette.outline, 1.35);
      ctx.fillStyle = palette.hairLight;
      ctx.beginPath();
      ctx.arc(-2, -28, 8.5, Math.PI * 1.05, Math.PI * 1.7);
      ctx.strokeStyle = palette.hairLight;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      oval(ctx, 0, -26, 12.8, 11.8, palette.hair, palette.outline, 1.35);
    }
  }

  function drawHairFront(ctx, palette, facing, actor) {
    if (facing === "up") return;
    ctx.fillStyle = palette.hair;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    if (facing === "side") {
      ctx.moveTo(-10.5, -29);
      ctx.quadraticCurveTo(-2, -38, 10.5, -29);
      ctx.lineTo(9.5, -23.5);
      ctx.lineTo(5.5, -29.2);
      ctx.lineTo(1.6, -24.5);
      ctx.lineTo(-2.3, -30.2);
      ctx.lineTo(-7, -24.2);
      ctx.closePath();
    } else {
      ctx.moveTo(-11.2, -29.5);
      ctx.quadraticCurveTo(-2, -38, 11.2, -29.5);
      ctx.lineTo(10.4, -24.2);
      ctx.lineTo(6.2, -29.1);
      ctx.lineTo(2.8, -24.2);
      ctx.lineTo(-1.5, -30);
      ctx.lineTo(-5.2, -24.3);
      ctx.lineTo(-8.6, -28.3);
      ctx.lineTo(-10.5, -23.7);
      ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = palette.hairLight;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-6.5, -31); ctx.quadraticCurveTo(-1.5, -34.5, 4.2, -32); ctx.stroke();

    if (actor === "keeper") {
      ctx.strokeStyle = palette.accent; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(8, -33); ctx.lineTo(13, -38); ctx.stroke();
      oval(ctx, 14, -39, 2.7, 2.7, palette.accent, palette.outline, .75);
      oval(ctx, 14, -39, .8, .8, "#fff5c7");
    } else if (actor === "smith") {
      ctx.strokeStyle = palette.accent; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -28.5, 11.4, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
      ctx.fillStyle = palette.accent;
      ctx.beginPath(); ctx.moveTo(9, -31); ctx.lineTo(14, -28); ctx.lineTo(10, -26); ctx.closePath(); ctx.fill();
    } else if (actor === "healer") {
      ctx.fillStyle = palette.accent;
      ctx.beginPath(); ctx.ellipse(10.2, -35, 3.7, 1.8, -.7, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(14.2, -33.2, 3.7, 1.8, .25, 0, TAU); ctx.fill();
    }
  }

  function drawHeldAccessory(ctx, actor, palette, facing, state, handX, handY) {
    if (actor === "player") {
      if (state === "attack") {
        ctx.save();
        ctx.translate(handX + 1, handY);
        ctx.rotate(-.72);
        ctx.fillStyle = "#d8edf0";
        ctx.strokeStyle = palette.outline;
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(-1.7, 1); ctx.lineTo(-.8, -16); ctx.lineTo(1.8, -20); ctx.lineTo(2.3, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = palette.accent; ctx.fillRect(-4, 0, 8, 2.4);
        ctx.fillStyle = "#654733"; ctx.fillRect(-1.5, 2, 3, 7);
        ctx.restore();
      } else {
        ctx.strokeStyle = "#765334"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(handX, handY + 2, 3.4, Math.PI, TAU); ctx.stroke();
        ctx.fillStyle = palette.accent; ctx.shadowColor = palette.accent; ctx.shadowBlur = 7;
        roundedRect(ctx, handX - 3.2, handY + 2, 6.4, 7, 1.2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff0ae"; ctx.fillRect(handX - 1.1, handY + 3.2, 2.2, 3.8);
      }
    } else if (actor === "smith") {
      ctx.save(); ctx.translate(handX + 1, handY + 1); ctx.rotate(-.35);
      ctx.strokeStyle = "#624a39"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(0, 11); ctx.stroke();
      ctx.fillStyle = "#6e7684"; ctx.strokeStyle = palette.outline; ctx.lineWidth = 1;
      roundedRect(ctx, -5, -2.5, 10, 5, 1.5); ctx.fill(); ctx.stroke(); ctx.restore();
    } else if (actor === "healer") {
      ctx.fillStyle = "#e8dbb9"; ctx.strokeStyle = palette.outline; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(handX - 4, handY); ctx.lineTo(handX + 4, handY); ctx.lineTo(handX + 3, handY + 5); ctx.quadraticCurveTo(handX, handY + 7, handX - 3, handY + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#b17443"; ctx.beginPath(); ctx.arc(handX, handY - 1, 2.4, Math.PI, TAU); ctx.stroke();
    }
  }

  function drawCharacter(ctx, options) {
    const settings = options || {};
    if (settings.bitmap !== false) {
      const bitmapBox = drawBitmapCharacter(ctx, settings);
      if (bitmapBox) return bitmapBox;
    }
    const x = Number(settings.x) || 0;
    const y = Number(settings.y) || 0;
    const scale = Math.max(.08, Number(settings.scale) || 1);
    const actor = settings.actor || settings.kind || "villager";
    const palette = paletteFor(actor, settings.palette);
    const facingRaw = settings.facing || "down";
    const facing = facingRaw === "left" || facingRaw === "right" ? "side" : facingRaw;
    const mirror = facingRaw === "left" ? -1 : 1;
    const state = settings.state || (Math.abs(Number(settings.walk)) > .05 ? "walk" : "idle");
    const phase = Number(settings.phase) || 0;
    const step = clamp(settings.walk == null ? (state === "walk" ? Math.sin(phase * 8) : 0) : settings.walk, -1, 1);
    const attackProgress = clamp(settings.progress == null ? .45 : settings.progress, 0, 1);
    const hurt = state === "hurt" || Boolean(settings.hurt);
    const blink = Boolean(settings.blink);
    const mood = settings.expression || (hurt ? "hurt" : state === "attack" ? "determined" : "neutral");
    const bob = state === "walk" ? Math.abs(Math.sin(phase * 8)) * -1.15 : Math.sin(phase * 2) * .22;
    const shake = hurt ? Math.sin(phase * 35) * 1.25 : 0;

    const fallbackBox = fitFrameToBaseline({ sw: 24, sh: 38 }, { x, y, height: 38 * scale });
    ctx.save();
    try {
      drawGroundShadow(ctx, x, y, scale, actor === "smith" ? 13.5 : 12, hurt ? .25 : .4);
      ctx.translate(x + shake * scale, y + bob * scale);
      ctx.scale(scale * mirror, scale);
      if (state === "attack") ctx.rotate((mirror * -.05) + (attackProgress - .5) * .08);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      const frontVisible = facing !== "up";
      const sideBias = facing === "side" ? 2.2 : 0;
      const leftStep = step * 2.5;
      const rightStep = -step * 2.5;

      // Scarf tails and rear arm sit behind the body.
      if (actor === "player" || palette.scarf) {
        ctx.fillStyle = palette.scarf;
        ctx.strokeStyle = palette.outline;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-5, -17); ctx.quadraticCurveTo(-11 - step * 2, -13, -9 - step * 3, -7); ctx.lineTo(-4, -11); ctx.closePath(); ctx.fill(); ctx.stroke();
      }

      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-4.5, -7); ctx.lineTo(-5 + leftStep, .5);
      ctx.moveTo(4.5, -7); ctx.lineTo(5 + rightStep, .5);
      ctx.stroke();
      oval(ctx, -5 + leftStep, .6, 4.2, 2.5, palette.shoe, palette.outline, 1.15);
      oval(ctx, 5 + rightStep, .6, 4.2, 2.5, palette.shoe, palette.outline, 1.15);
      ctx.fillStyle = "rgba(255,255,255,.16)";
      ctx.fillRect(-7.2 + leftStep, -1.2, 3.5, .8);
      ctx.fillRect(2.8 + rightStep, -1.2, 3.5, .8);

      const rearArmX = facing === "side" ? -7 : -8.7;
      ctx.strokeStyle = palette.outfitDark;
      ctx.lineWidth = 5.8;
      ctx.beginPath(); ctx.moveTo(rearArmX, -15); ctx.lineTo(rearArmX - step * 1.5, -7); ctx.stroke();
      oval(ctx, rearArmX - step * 1.5, -5.8, 2.5, 2.8, palette.skin, palette.outline, 1);

      // Rounded coat with collar, trim and a little belt.
      ctx.beginPath();
      ctx.moveTo(-9.5, -17.2);
      ctx.quadraticCurveTo(-11, -10.5, -8.1, -4.3);
      ctx.quadraticCurveTo(0, -1.4, 8.1, -4.3);
      ctx.quadraticCurveTo(11, -10.5, 9.5, -17.2);
      ctx.quadraticCurveTo(0, -21, -9.5, -17.2);
      ctx.closePath(); pathPaint(ctx, palette.outfit, palette.outline, 1.35);
      ctx.fillStyle = palette.outfitDark;
      roundedRect(ctx, -8.5, -9, 17, 3.1, 1.2); ctx.fill();
      ctx.fillStyle = palette.accent;
      ctx.fillRect(-1, -16, 2, 8);
      oval(ctx, 0, -12.5, .75, .75, "#fff3bd");
      ctx.fillStyle = palette.scarf;
      ctx.beginPath(); ctx.moveTo(-6.8, -18.8); ctx.lineTo(0, -14.2); ctx.lineTo(6.8, -18.8); ctx.lineTo(4.6, -20.5); ctx.lineTo(0, -17.5); ctx.lineTo(-4.6, -20.5); ctx.closePath(); ctx.fill();

      const frontArmX = facing === "side" ? 7.2 : 9;
      let frontHandY = -6.2 + step * 1.1;
      let frontHandX = frontArmX + step * 1.2;
      if (state === "attack") {
        frontHandX += 4 + attackProgress * 3;
        frontHandY -= 5 - attackProgress * 2;
      }
      ctx.strokeStyle = palette.outfit;
      ctx.lineWidth = 5.6;
      ctx.beginPath(); ctx.moveTo(frontArmX - 1, -15.5); ctx.lineTo(frontHandX, frontHandY); ctx.stroke();
      oval(ctx, frontHandX, frontHandY, 2.6, 2.8, palette.skin, palette.outline, 1);

      drawHairBack(ctx, palette, facing, actor);
      if (facing !== "up") {
        const faceX = sideBias;
        oval(ctx, faceX, -25.2, facing === "side" ? 11.1 : 11.8, 10.4, palette.skin, palette.outline, 1.35);
        if (facing === "side") oval(ctx, -8.2, -25, 2.2, 3, palette.skinShade, palette.outline, .8);
        else {
          oval(ctx, -11, -24.8, 2.1, 3, palette.skin, palette.outline, .8);
          oval(ctx, 11, -24.8, 2.1, 3, palette.skin, palette.outline, .8);
        }
        ctx.globalAlpha = .27;
        if (facing === "side") oval(ctx, 8.4, -21.8, 2.8, 1.25, "#f06478");
        else {
          oval(ctx, -7, -21.8, 2.8, 1.25, "#f06478");
          oval(ctx, 7, -21.8, 2.8, 1.25, "#f06478");
        }
        ctx.globalAlpha = 1;
      }
      drawHairFront(ctx, palette, facing, actor);

      if (frontVisible) {
        if (facing === "side") {
          drawEye(ctx, 7.3, -25.5, "side", palette, mood, blink, 1);
          drawMouth(ctx, 10.3, -20.7, mood, palette, .9);
        } else {
          drawEye(ctx, -5, -25, "front", palette, mood, blink, 1);
          drawEye(ctx, 5, -25, "front", palette, mood, blink, 1);
          drawMouth(ctx, 0, -20.2, mood, palette, 1);
        }
      }

      drawHeldAccessory(ctx, actor, palette, facing, state, frontHandX, frontHandY);

      if (hurt) {
        ctx.globalAlpha = .45;
        ctx.fillStyle = "#ff7181";
        oval(ctx, 0, -18, 13.5, 18, "#ff7181");
        ctx.globalAlpha = 1;
      }
      if (settings.selected) {
        ctx.strokeStyle = settings.selectionColor || "#ffc857";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 2]);
        ctx.beginPath(); ctx.ellipse(0, 1.5, 14, 5.5, 0, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
    } finally {
      ctx.restore();
    }
    return {
      ...fallbackBox,
      nameAnchorY: fallbackBox.top - 4 * scale,
      markerAnchorY: fallbackBox.top - 23 * scale,
    };
  }

  function drawSlime(ctx, palette, phase, state) {
    const squash = state === "attack" ? 1.12 : 1 + Math.sin(phase * 5) * .045;
    const lift = state === "attack" ? -3 : Math.abs(Math.sin(phase * 5)) * -1;
    ctx.save(); ctx.translate(0, lift); ctx.scale(1 / squash, squash);
    ctx.beginPath();
    ctx.moveTo(-15, 4);
    ctx.bezierCurveTo(-16, -5, -12, -15, -4, -17);
    ctx.quadraticCurveTo(0, -21, 4, -17);
    ctx.bezierCurveTo(12, -15, 16, -5, 15, 4);
    ctx.quadraticCurveTo(11, 9, 7, 5);
    ctx.quadraticCurveTo(2, 11, -2, 5);
    ctx.quadraticCurveTo(-8, 10, -15, 4);
    ctx.closePath(); pathPaint(ctx, palette.body, palette.outline, 1.6);
    ctx.globalAlpha = .35; oval(ctx, -5, -11, 5.2, 2.7, palette.light); ctx.globalAlpha = 1;
    drawEnemyFace(ctx, palette, state === "attack" ? "angry" : state === "hurt" ? "hurt" : "happy", 0, -4, .92);
    // A sprout gives the silhouette some personality.
    ctx.strokeStyle = palette.outline; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(0, -17); ctx.quadraticCurveTo(1, -23, 5, -24); ctx.stroke();
    ctx.fillStyle = palette.accent;
    ctx.beginPath(); ctx.ellipse(7, -24.5, 4.2, 2.2, -.3, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawEnemyFace(ctx, palette, mood, x, y, scale) {
    const angry = mood === "angry";
    const hurt = mood === "hurt";
    const happy = mood === "happy";
    if (hurt) {
      line(ctx, [[x - 7 * scale, y - 2 * scale], [x - 3 * scale, y + 2 * scale]], palette.eye, 1.5 * scale);
      line(ctx, [[x - 3 * scale, y - 2 * scale], [x - 7 * scale, y + 2 * scale]], palette.eye, 1.5 * scale);
      line(ctx, [[x + 3 * scale, y - 2 * scale], [x + 7 * scale, y + 2 * scale]], palette.eye, 1.5 * scale);
      line(ctx, [[x + 7 * scale, y - 2 * scale], [x + 3 * scale, y + 2 * scale]], palette.eye, 1.5 * scale);
    } else {
      oval(ctx, x - 5.3 * scale, y, 2.5 * scale, (angry ? 2 : 3.1) * scale, palette.eye, palette.outline, .5 * scale);
      oval(ctx, x + 5.3 * scale, y, 2.5 * scale, (angry ? 2 : 3.1) * scale, palette.eye, palette.outline, .5 * scale);
      oval(ctx, x - 6 * scale, y - 1.1 * scale, .75 * scale, .9 * scale, "#fff");
      oval(ctx, x + 4.6 * scale, y - 1.1 * scale, .75 * scale, .9 * scale, "#fff");
      if (angry) {
        line(ctx, [[x - 8 * scale, y - 3.5 * scale], [x - 3 * scale, y - 2 * scale]], palette.outline, 1 * scale);
        line(ctx, [[x + 8 * scale, y - 3.5 * scale], [x + 3 * scale, y - 2 * scale]], palette.outline, 1 * scale);
      }
    }
    ctx.strokeStyle = palette.outline; ctx.lineWidth = 1.1 * scale; ctx.beginPath();
    if (angry) ctx.arc(x, y + 6 * scale, 3 * scale, Math.PI + .25, TAU - .25);
    else if (hurt) ctx.ellipse(x, y + 5 * scale, 1.4 * scale, 1.8 * scale, 0, 0, TAU);
    else if (happy) ctx.arc(x, y + 3.2 * scale, 3 * scale, .1, Math.PI - .1);
    else { ctx.moveTo(x - 1.5 * scale, y + 4 * scale); ctx.lineTo(x + 1.5 * scale, y + 4 * scale); }
    ctx.stroke();
  }

  function drawWisp(ctx, palette, phase, state) {
    const floatY = Math.sin(phase * 3.2) * 2;
    ctx.save(); ctx.translate(0, floatY);
    ctx.globalAlpha = .22; oval(ctx, 0, -7, 21, 21, palette.body); ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-7, 5, -14, -2, -11, -11);
    ctx.quadraticCurveTo(-7, -21, 0, -18);
    ctx.quadraticCurveTo(7, -21, 11, -11);
    ctx.bezierCurveTo(14, -2, 7, 5, 0, 10);
    ctx.closePath(); pathPaint(ctx, palette.body, palette.outline, 1.5);
    ctx.fillStyle = palette.light;
    ctx.beginPath(); ctx.moveTo(-5, -17); ctx.lineTo(-2, -25); ctx.lineTo(1, -18); ctx.lineTo(6, -24); ctx.lineTo(5, -15); ctx.closePath(); ctx.fill(); ctx.stroke();
    drawEnemyFace(ctx, palette, state === "attack" ? "angry" : state === "hurt" ? "hurt" : "neutral", 0, -6, .78);
    ctx.strokeStyle = palette.accent; ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.moveTo(0, 9); ctx.bezierCurveTo(-9, 16, 9, 19, Math.sin(phase * 4) * 5, 25); ctx.stroke();
    ctx.restore();
  }

  function drawHound(ctx, palette, phase, state, facing) {
    const flip = facing === "left" ? -1 : 1;
    const run = state === "walk" || state === "attack" ? Math.sin(phase * 8) * 2.4 : 0;
    ctx.save(); ctx.scale(flip, 1);
    // Tail, legs, body.
    ctx.strokeStyle = palette.outline; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-13, -6); ctx.quadraticCurveTo(-23, -17, -18, -22); ctx.stroke();
    ctx.strokeStyle = palette.body; ctx.lineWidth = 3.4; ctx.stroke();
    ctx.strokeStyle = palette.outline; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-8, 1); ctx.lineTo(-9 + run, 8); ctx.moveTo(7, 1); ctx.lineTo(8 - run, 8); ctx.stroke();
    oval(ctx, 0, -4, 15.5, 9.5, palette.body, palette.outline, 1.6);
    ctx.fillStyle = palette.light; ctx.beginPath(); ctx.ellipse(3, -1, 8, 4, 0, 0, TAU); ctx.fill();
    // Oversized fox head and ears.
    ctx.fillStyle = palette.body; ctx.strokeStyle = palette.outline; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(4, -14); ctx.lineTo(7, -27); ctx.lineTo(14, -17); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, -17); ctx.lineTo(22, -27); ctx.lineTo(23, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
    oval(ctx, 15, -10, 10.5, 10.5, palette.body, palette.outline, 1.6);
    ctx.fillStyle = palette.shade; ctx.beginPath(); ctx.moveTo(17, -12); ctx.lineTo(27, -8); ctx.lineTo(18, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
    drawEnemyFace(ctx, palette, state === "attack" ? "angry" : state === "hurt" ? "hurt" : "neutral", 15, -12, .67);
    oval(ctx, 25.2, -7.5, 2.1, 1.6, palette.outline);
    ctx.strokeStyle = palette.accent; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(17, -1); ctx.stroke();
    ctx.restore();
  }

  function drawBoss(ctx, palette, phase, state) {
    const breathe = 1 + Math.sin(phase * 2.3) * .035;
    ctx.save(); ctx.scale(breathe, 1 / breathe);
    // Mist tails fan out behind the round body.
    ctx.globalAlpha = .55;
    [-1, 0, 1].forEach((side) => {
      ctx.strokeStyle = side === 0 ? palette.accent : palette.light;
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(side * 10, -3); ctx.quadraticCurveTo(side * 25, 9, side * 29 + Math.sin(phase * 3 + side) * 3, 19); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    oval(ctx, 0, -8, 28, 24, palette.body, palette.outline, 2.2);
    ctx.fillStyle = palette.shade;
    ctx.beginPath(); ctx.ellipse(0, 2, 23, 11, 0, 0, TAU); ctx.fill();
    // Horn-like ears and a pale forehead mask.
    ctx.fillStyle = palette.body; ctx.strokeStyle = palette.outline; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-22, -22); ctx.lineTo(-32, -38); ctx.lineTo(-10, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22, -22); ctx.lineTo(32, -38); ctx.lineTo(10, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette.light;
    ctx.beginPath(); ctx.moveTo(-11, -26); ctx.quadraticCurveTo(0, -35, 11, -26); ctx.lineTo(6, -12); ctx.lineTo(0, -18); ctx.lineTo(-6, -12); ctx.closePath(); ctx.fill();
    drawEnemyFace(ctx, palette, state === "hurt" ? "hurt" : "angry", 0, -10, 1.25);
    // Tiny fang pair keeps the boss threatening but still toy-like.
    ctx.fillStyle = "#fff4e3"; ctx.strokeStyle = palette.outline; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(-5, 5); ctx.lineTo(-3, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, -2); ctx.lineTo(5, 5); ctx.lineTo(3, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawEnemy(ctx, options) {
    const settings = options || {};
    if (settings.bitmap !== false) {
      const bitmapBox = drawBitmapEnemy(ctx, settings);
      if (bitmapBox) return bitmapBox;
    }
    const x = Number(settings.x) || 0;
    const y = Number(settings.y) || 0;
    const type = settings.type || (settings.boss ? "boss" : "slime");
    const scale = Math.max(.08, Number(settings.scale) || 1);
    const phase = Number(settings.phase) || 0;
    const state = settings.state || (settings.hurt ? "hurt" : "idle");
    const palette = enemyPaletteFor(type, settings.palette);
    ctx.save();
    try {
      drawGroundShadow(ctx, x, y, scale, type === "boss" ? 29 : type === "hound" ? 18 : 14, type === "wisp" ? .2 : .42);
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      if (state === "hurt") ctx.translate(Math.sin(phase * 35) * 1.5, 0);
      if (type === "wisp") drawWisp(ctx, palette, phase, state);
      else if (type === "hound") drawHound(ctx, palette, phase, state, settings.facing);
      else if (type === "boss") drawBoss(ctx, palette, phase, state);
      else drawSlime(ctx, palette, phase, state);
      if (settings.selected) {
        ctx.strokeStyle = settings.selectionColor || "#ffc857"; ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 2]); ctx.beginPath(); ctx.ellipse(0, 3, type === "boss" ? 34 : 19, type === "boss" ? 11 : 6, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
    } finally {
      ctx.restore();
    }
    const halfWidth = (type === "boss" ? 38 : type === "hound" ? 25 : 22) * scale;
    const top = y - (type === "boss" ? 72 : type === "wisp" ? 56 : 44) * scale;
    const profile = monsterVisualProfiles[type] || monsterVisualProfiles.slime;
    return {
      left: x - halfWidth,
      right: x + halfWidth,
      top,
      bottom: y + 5 * scale,
      centerX: x,
      baselineY: y,
      nameAnchorX: x + profile.nameOffsetX * scale,
      nameAnchorY: y - profile.nameLift * scale,
    };
  }

  function drawPortraitHead(ctx, actor, palette, mood, blink) {
    // Back hair and optional buns.
    oval(ctx, 0, -2, 38, 39, palette.hair, palette.outline, 3.2);
    if (actor === "healer") {
      oval(ctx, -34, -18, 14, 15, palette.hair, palette.outline, 3);
      oval(ctx, 34, -18, 14, 15, palette.hair, palette.outline, 3);
    }
    oval(ctx, 0, 2, 34.5, 32, palette.skin, palette.outline, 3.2);
    oval(ctx, -34, 4, 6, 9, palette.skin, palette.outline, 2);
    oval(ctx, 34, 4, 6, 9, palette.skin, palette.outline, 2);
    ctx.globalAlpha = .32; oval(ctx, -21, 14, 9, 4, "#f06478"); oval(ctx, 21, 14, 9, 4, "#f06478"); ctx.globalAlpha = 1;

    // Full portrait fringe with separated clumps.
    ctx.fillStyle = palette.hair; ctx.strokeStyle = palette.outline; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-33, -8); ctx.quadraticCurveTo(-20, -46, 5, -38); ctx.quadraticCurveTo(28, -39, 34, -9);
    ctx.lineTo(26, 1); ctx.lineTo(18, -13); ctx.lineTo(9, -1); ctx.lineTo(-1, -16); ctx.lineTo(-12, 0); ctx.lineTo(-22, -12); ctx.lineTo(-30, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = palette.hairLight; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-18, -27); ctx.quadraticCurveTo(-2, -40, 16, -28); ctx.stroke();

    drawEye(ctx, -15, 4, "front", palette, mood, blink, 2.25);
    drawEye(ctx, 15, 4, "front", palette, mood, blink, 2.25);
    drawMouth(ctx, 0, 21, mood, palette, 2);

    if (actor === "keeper") {
      ctx.strokeStyle = palette.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(23, -31); ctx.lineTo(36, -45); ctx.stroke();
      oval(ctx, 39, -47, 7, 7, palette.accent, palette.outline, 2); oval(ctx, 39, -47, 2.2, 2.2, "#fff5c7");
    } else if (actor === "smith") {
      ctx.strokeStyle = palette.accent; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, -5, 34, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      // Little stubble dots.
      ctx.fillStyle = palette.hair; [[-9,21],[-3,25],[5,24],[11,20]].forEach((p) => oval(ctx, p[0], p[1], 1.1, 1.1, palette.hair));
    } else if (actor === "healer") {
      ctx.fillStyle = palette.accent;
      ctx.beginPath(); ctx.ellipse(28, -39, 10, 4, -.7, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(39, -34, 10, 4, .25, 0, TAU); ctx.fill();
    }
  }

  function drawPortrait(ctx, options) {
    const settings = options || {};
    if (settings.bitmap !== false && drawBitmapPortrait(ctx, settings)) return;
    const x = Number(settings.x) || 0;
    const y = Number(settings.y) || 0;
    const width = Math.max(24, Number(settings.width) || 144);
    const height = Math.max(24, Number(settings.height) || width);
    const actor = settings.actor || settings.kind || "player";
    const palette = paletteFor(actor, settings.palette);
    const mood = settings.expression || "happy";
    const padding = Math.max(2, Number(settings.padding) || 6);

    ctx.save();
    try {
      roundedRect(ctx, x, y, width, height, Math.min(width, height) * .12);
      ctx.clip();
      const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
      gradient.addColorStop(0, settings.background || palette.outfitDark);
      gradient.addColorStop(1, settings.backgroundEnd || "#111a31");
      ctx.fillStyle = gradient; ctx.fillRect(x, y, width, height);

      ctx.globalAlpha = .13;
      for (let index = 0; index < 8; index += 1) {
        oval(ctx, x + width * ((index * .31) % 1), y + height * ((index * .47) % 1), width * .05, width * .05, palette.accent);
      }
      ctx.globalAlpha = 1;

      const artScale = Math.min((width - padding * 2) / 112, (height - padding * 2) / 126);
      ctx.translate(x + width / 2, y + height * .68);
      ctx.scale(artScale, artScale);
      // Shoulders, collar and scarf.
      ctx.fillStyle = palette.outfit; ctx.strokeStyle = palette.outline; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(-58, 54); ctx.quadraticCurveTo(-48, 22, -25, 20); ctx.lineTo(25, 20); ctx.quadraticCurveTo(48, 22, 58, 54); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = palette.scarf;
      ctx.beginPath(); ctx.moveTo(-26, 21); ctx.lineTo(0, 42); ctx.lineTo(26, 21); ctx.lineTo(18, 15); ctx.lineTo(0, 29); ctx.lineTo(-18, 15); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = palette.accent; roundedRect(ctx, -5, 32, 10, 25, 3); ctx.fill();
      drawPortraitHead(ctx, actor, palette, mood, Boolean(settings.blink));
    } finally {
      ctx.restore();
    }

    if (settings.frame !== false) {
      ctx.save();
      roundedRect(ctx, x + .75, y + .75, width - 1.5, height - 1.5, Math.min(width, height) * .12);
      ctx.strokeStyle = settings.frameColor || palette.accent;
      ctx.lineWidth = Math.max(1.5, Math.min(width, height) * .018);
      ctx.stroke();
      ctx.restore();
    }
  }

  return Object.freeze({
    actorPresets,
    enemyPresets,
    monsterVisualProfiles,
    npcArtIndices,
    npcArtPolicy,
    npcMapProfiles,
    heroAnimationStates,
    environmentSpriteIndices,
    environmentSpriteMetrics,
    terrainSpriteIndices,
    interiorSpriteIndices,
    monsterSpriteIndices,
    markerSpriteIndices,
    markerDisplayPolicy,
    fitFrameToBaseline,
    environmentSpriteLayout,
    environmentSpriteAnchor,
    spriteStatus: () => Object.fromEntries(Object.entries(spriteAtlases).map(([key, atlas]) => [key, { ready: atlas.ready, failed: atlas.failed, src: atlas.src }])),
    drawCharacter,
    drawEnemy,
    drawPortrait,
    drawEnvironmentSprite,
    drawStandaloneSprite,
    drawTerrainTile,
    drawBattleBackground,
    drawBattleGround,
    drawInteriorSprite,
    drawMarker,
  });
});
