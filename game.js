(function () {
  "use strict";

  if (!document.getElementById("inventoryOverhaulStyles")) {
    const stylesheet = document.createElement("link");
    stylesheet.id = "inventoryOverhaulStyles";
    stylesheet.rel = "stylesheet";
    stylesheet.href = "inventory-overhaul.css";
    document.head.append(stylesheet);
  }
  if (!document.getElementById("everrealmUiStyles")) {
    const stylesheet = document.createElement("link");
    stylesheet.id = "everrealmUiStyles";
    stylesheet.rel = "stylesheet";
    stylesheet.href = "ui-system.css";
    document.head.append(stylesheet);
  }

  const Core = window.LanternCore;
  const World = window.LanternWorld;
  const Expansion = window.LanternExpansion;
  const ExpansionWorld = window.LanternExpansionWorld;
  const Guild = window.LanternGuildCommission;
  const MapRegistry = window.LanternMapRegistry;
  const MapTransitions = window.LanternMapTransitions;
  const MainTownNavigation = window.LanternMainTownNavigation;
  const TRANSITION_TYPES = MapTransitions.TRANSITION_TYPES;
  const houseSpriteSettings = MapTransitions.houseSpriteSettings;
  const Tactics = window.LanternTactics;
  const Skills = window.LanternSkills;
  const FighterEffects = window.LanternFighterEffects;
  const Art = window.LanternArt;
  const Locomotion = window.LanternLocomotion;
  const SaveSystem = window.EverrealmSaveSystem;
  const maps = MapRegistry.createMapRegistry();
  if (!MainTownNavigation?.ready) {
    console.error("Main Town navigation failed closed", MainTownNavigation?.failure || "generated runtime data unavailable");
  }
  const overworld = maps.world;
  const expansionMaps = Object.fromEntries(Object.entries(maps).filter(([id]) => id !== "world"));
  let currentMapId = "world";
  let world = overworld;
  const SAVE_KEY = "everrealm-save-v1";
  // Keep reading the pre-migration key so existing player progress survives the rename.
  const LEGACY_SAVE_KEYS = Object.freeze(["lanternbound-save-v1"]);
  const SOUND_KEY = "everrealm-sound";
  const LEGACY_SOUND_KEY = "lanternbound-sound";
  const ZOOM_KEY = "everrealm-zoom";
  const LEGACY_ZOOM_KEY = "lanternbound-zoom";
  const FIXED_STEP = 1 / 60;
  const query = new URLSearchParams(window.location.search);
  const testingMode = query.has("smoke") || query.has("autoplay");
  const autoplay = query.has("autoplay");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const miniMap = document.getElementById("miniMap");
  const miniCtx = miniMap.getContext("2d");
  const stage = document.getElementById("gameStage");
  const titleScreen = document.getElementById("titleScreen");
  const dialoguePanel = document.getElementById("dialoguePanel");
  const levelUpPanel = document.getElementById("levelUpPanel");
  const deathPanel = document.getElementById("deathPanel");
  const victoryPanel = document.getElementById("victoryPanel");
  const facilityPanel = document.getElementById("facilityPanel");
  const facilityContent = document.getElementById("facilityContent");
  const facilityTabs = document.getElementById("facilityTabs");
  const facilityFooter = document.getElementById("facilityFooter");
  const facilityHelpButton = document.getElementById("facilityHelpButton");
  const facilityHelpPopover = document.getElementById("facilityHelpPopover");
  const facilityHelpText = document.getElementById("facilityHelpText");
  const statusButton = document.getElementById("statusButton");
  const inventoryButton = document.getElementById("inventoryButton");
  const deckButton = document.getElementById("deckButton");
  const skillTreeButton = document.getElementById("skillTreeButton");
  const inventoryBookBadge = document.getElementById("inventoryBookBadge");
  const continueButton = document.getElementById("continueButton");
  const interactionPrompt = document.getElementById("interactionPrompt");
  const interactionText = document.getElementById("interactionText");
  const toastElement = document.getElementById("gameToast");
  const saveToast = document.getElementById("saveToast");
  const ariaLive = document.getElementById("ariaLive");
  const playerHudPortraitCanvas = document.getElementById("playerHudPortraitCanvas");
  const playerHudPortraitCtx = playerHudPortraitCanvas.getContext("2d");
  const battleHud = document.getElementById("battleHud");
  const battleEncounterIntro = document.getElementById("battleEncounterIntro");
  const battleFacingPicker = document.getElementById("battleFacingPicker");
  const classSelectPanel = document.getElementById("classSelectPanel");
  const skillBookConfirmPanel = document.getElementById("skillBookConfirmPanel");
  const skillDetailPanel = document.getElementById("skillDetailPanel");
  const abandonCommissionPanel = document.getElementById("abandonCommissionPanel");
  const battlePortraitCanvas = document.getElementById("selectedUnitPortraitCanvas");
  const battlePortraitCtx = battlePortraitCanvas.getContext("2d");
  const dialoguePortraitCanvas = document.getElementById("dialoguePortraitCanvas");
  const dialoguePortraitCtx = dialoguePortraitCanvas.getContext("2d");
  const battleUi = {
    encounterTitle: document.getElementById("battleEncounterTitle"),
    encounterSubtitle: document.getElementById("battleEncounterSubtitle"),
    round: document.getElementById("battleRoundLabel"),
    turn: document.getElementById("battleTurnLabel"),
    phase: document.getElementById("battlePhaseLabel"),
    unitRole: document.getElementById("selectedUnitRole"),
    unitLevel: document.getElementById("selectedUnitLevel"),
    unitName: document.getElementById("selectedUnitName"),
    hpFill: document.getElementById("selectedUnitHpFill"),
    hpText: document.getElementById("selectedUnitHpText"),
    statuses: document.getElementById("selectedUnitStatuses"),
    order: document.getElementById("battleTurnOrderList"),
    actionPoints: document.getElementById("battleActionPoints"),
    potionCount: document.getElementById("battlePotionCount"),
    hint: document.getElementById("battleHint"),
  };

  const hud = {
    level: document.getElementById("levelValue"),
    hpFill: document.getElementById("hpFill"),
    hpText: document.getElementById("hpText"),
    xpFill: document.getElementById("xpFill"),
    xpText: document.getElementById("xpText"),
    coins: document.getElementById("coinValue"),
    potions: document.getElementById("potionValue"),
    weapon: document.getElementById("weaponValue"),
    questTitle: document.getElementById("questTitle"),
    questDetail: document.getElementById("questDetail"),
    questDistance: document.getElementById("questDistance"),
    questTabs: [...document.querySelectorAll("[data-quest-track]")],
    zone: document.getElementById("zoneName"),
  };

  const expansionEnemyColors = { chick: "#d89d42", fox: "#c9783e", raccoon: "#7c6656", wild_boar: "#9a684c", bear: "#a66f45", turtle: "#817548", coyote: "#87786f", frog: "#7ba15a", snake: "#d09535" };
  const explorationSpeed = { bird: 92, beast: 104, reptile: 76, amphibian: 88 };
  const enemyTypes = {};
  for (const type of ExpansionWorld.CANONICAL_MONSTER_IDS) {
    const blueprint = ExpansionWorld.monsterBlueprint(type);
    const stats = ExpansionWorld.monsterStatsAtLevel(type, blueprint.baseLevel);
    const firstSkill = blueprint.skills[0];
    enemyTypes[type] = {
      name: blueprint.name_zh,
      hp: stats.hp,
      damage: stats.attack,
      defence: stats.defense,
      speed: explorationSpeed[blueprint.family] || 86,
      battleSpeed: firstSkill.speedGrade === "A" ? 14 : firstSkill.speedGrade === "B" ? 11 : firstSkill.speedGrade === "D" ? 7 : 9,
      moveRange: blueprint.moveRange,
      attackRange: firstSkill.range.max,
      xp: blueprint.rewards.baseXp,
      coins: blueprint.rewards.coins,
      radius: blueprint.id === "bear" ? 28 : blueprint.id === "turtle" ? 22 : 15,
      aggro: blueprint.boss ? 500 : 225,
      range: firstSkill.range.max > 1 ? 155 : 38,
      color: expansionEnemyColors[type] || "#9b8ab7",
      artType: blueprint.id,
      drop: blueprint.drop,
      ability: blueprint.ability,
      skills: blueprint.skills,
      battleRole: blueprint.battleRole,
    };
  }
  // Legacy exploration/save aliases remain readable, but all new spawns resolve to canonical IDs.
  for (const [legacy, migration] of Object.entries(ExpansionWorld.LEGACY_MONSTER_MIGRATION)) enemyTypes[legacy] = enemyTypes[migration.id];

  const hasMap = (id) => typeof id === "string" && Object.hasOwn(maps, id);
  const keys = new Set();
  let mode = "title";
  let width = 1;
  let height = 1;
  let dpr = 1;
  let previousTime = performance.now();
  let accumulator = 0;
  let elapsed = 0;
  let playTime = 0;
  let persistenceFingerprint = "";
  let persistence = null;
  let questStage = 0;
  let questTrackerMode = "main";
  let crystals = new Set();
  let bossDefeated = false;
  let openedChests = new Set();
  let ownedEquipment = ["novice_blade", "traveller_coat"];
  let equipped = { weapon: "novice_blade", armor: "traveller_coat", charm: null };
  let activeContracts = [];
  let contractRotation = 0;
  let guildCommissionState = Guild.normalizeState();
  let pendingAbandonContractId = null;
  let guildMarks = 0;
  let guildRenown = 0;
  let inventory = {};
  let monsterKills = {};
  let dungeonClears = 0;
  let defeatedDungeonBosses = new Set();
  let skillState = Skills.createSkillState();
  let playerClassId = Skills.DEFAULT_CLASS_ID || "warrior";
  let exploreMoveTarget = null;
  let exploreMovePath = [];
  let explorePortalIntentId = null;
  const EXPLORE_HOLD_DELAY_MS = 500;
  const EXPLORE_RETARGET_INTERVAL_MS = 150;
  let explorePointerGesture = null;
  let pendingClickInteractionId = null;
  let pendingManualSkillId = null;
  let pendingSkillDetailId = null;
  let skillDetailReturnTarget = null;
  let selectedInventoryItemId = null;
  let inventoryCategory = "all";
  let inventoryFixtureCount = 0;
  let checkpoint = { mapId: "world", x: overworld.start.x, y: overworld.start.y };
  const FACILITY_TABS = Object.freeze(["status", "bag", "equipment", "deck", "guild", "shop", "skills", "codex"]);
  const EXPLORE_ZOOM_SCALES = Object.freeze({ far: .78, mid: 1, near: 1.22 });
  const EXPLORE_ZOOM_LABELS = Object.freeze({ far: "遠", mid: "中", near: "近" });
  const ITEM_ICON_INDEX = Object.freeze({
    healing_potion: 0,
    skill_book_1: 1,
    skill_book_2: 2,
    skill_book_3: 3,
    lamp_dust: 4,
    hound_fang: 5,
    bright_spore: 6,
    moth_scale: 7,
    golem_core: 8,
    "golem-core": 8,
    deep_crystal: 9,
    moss_jelly: 10,
    "moss-jelly": 10,
    "mist-wing": 11,
    "crag-tusk": 12,
    "hollow-rune": 13,
    warden_lens: 14,
    "warden-lens": 14,
    coins: 15,
  });
  const EQUIPMENT_ICON_INDEX = Object.freeze({
    novice_blade: 0,
    tide_iron_sword: 1,
    windfeather_dagger: 2,
    lantern_sabre: 3,
    starfall_glaive: 4,
    dawn_oath: 5,
    traveller_coat: 6,
    guild_mail: 7,
    mistweave_cape: 8,
    cavern_guard: 9,
    aurora_plate: 10,
    copper_lantern_bell: 11,
    hunter_fang: 12,
    wayfarer_compass: 13,
    deep_lantern_core: 14,
  });
  const FIGHTER_EQUIPMENT_ICON_INDEX = Object.freeze({
    novice_gloves: 0,
    tide_iron_knuckles: 1,
    gale_gauntlets: 2,
    dragon_knuckles: 3,
  });
  let facilityTab = "bag";
  let facilityContext = "portable";
  let pendingLevelUps = 0;
  let dialogue = null;
  let dialogueChoiceIndex = 0;
  let enemies = [];
  let projectiles = [];
  let drops = [];
  let particles = [];
  let damageNumbers = [];
  let nearestInteraction = null;
  let camera = { x: world.start.x, y: world.start.y, zoom: 1.35 };
  let currentZone = "霧都主城";
  let screenShake = 0;
  let screenFlash = 0;
  let rainOffset = 0;
  let enemySerial = 100;
  let autoTarget = null;
  let battle = null;
  let encounterGrace = 1;
  let automaticPortalReady = false;
  let battleToken = 0;
  let soundEnabled = readPreference(SOUND_KEY, "on", LEGACY_SOUND_KEY) !== "off";
  let exploreZoomLevel = Object.hasOwn(EXPLORE_ZOOM_SCALES, readPreference(ZOOM_KEY, "mid", LEGACY_ZOOM_KEY))
    ? readPreference(ZOOM_KEY, "mid", LEGACY_ZOOM_KEY)
    : "mid";

  const player = createPlayer();

  class SoundEngine {
    constructor() { this.context = null; }
    ensure() {
      if (!soundEnabled) return null;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      if (!this.context) this.context = new AudioContext();
      if (this.context.state === "suspended") this.context.resume();
      return this.context;
    }
    tone(frequency, duration, options = {}) {
      const audio = this.ensure();
      if (!audio) return;
      const now = audio.currentTime + (options.delay || 0);
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = options.type || "triangle";
      oscillator.frequency.setValueAtTime(frequency, now);
      if (options.to) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(options.gain || 0.045, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.03);
    }
    start() { this.tone(196, .18, { to: 392, gain: .04 }); this.tone(587, .25, { delay: .13, gain: .028 }); }
    swing() { this.tone(240, .1, { to: 560, type: "sawtooth", gain: .022 }); }
    hit() { this.tone(120, .08, { to: 72, type: "square", gain: .026 }); }
    hurt() { this.tone(150, .16, { to: 68, type: "sawtooth", gain: .035 }); }
    coin() { this.tone(720, .08, { to: 960, gain: .028 }); }
    heal() { this.tone(390, .14, { to: 680, gain: .035 }); this.tone(780, .16, { delay: .1, gain: .025 }); }
    level() { [392, 523, 659, 784].forEach((note, index) => this.tone(note, .22, { delay: index * .09, gain: .032 })); }
    crystal() { this.tone(460, .35, { to: 920, gain: .04 }); this.tone(690, .4, { delay: .1, to: 1100, gain: .026 }); }
    death() { this.tone(210, .7, { to: 42, type: "sawtooth", gain: .035 }); }
    boss() { this.tone(84, .55, { to: 48, type: "sawtooth", gain: .045 }); }
  }
  const sound = new SoundEngine();

  function createPlayer() {
    return {
      x: world.start.x,
      y: world.start.y,
      radius: 12,
      facing: "up",
      hp: 92,
      level: 1,
      xp: 0,
      coins: 12,
      potions: 2,
      weaponLevel: 1,
      upgrades: { vigor: 0, edge: 0, swift: 0 },
      attackCooldown: 0,
      attackTimer: 0,
      invulnerable: 0,
      knockback: { x: 0, y: 0 },
      moving: false,
      walkCycle: 0,
      deathStartedAt: null,
    };
  }

  function resetPlayer() {
    const fresh = createPlayer();
    Object.assign(player, fresh);
  }

  function playerStats() {
    const base = Expansion.classStatsAtLevel(playerClassId, player.level);
    const gear = Expansion.equipmentStats(equipped);
    const passives = learnedFighterPassives();
    return {
      ...base,
      maxHp: Math.max(1, Math.round(base.maxHp + gear.maxHp)),
      attack: Math.max(1, Math.round((base.attack + gear.attack) * (passives.attackMultiplier || 1))),
      defence: Math.max(0, Math.round((base.defence + gear.defense) * (passives.defenceMultiplier || 1))),
      speed: Math.max(70, 132 + gear.speed),
      critChance: Core.clamp(.1 + gear.critChance, .05, .35),
      moveRange: Core.clamp(base.moveRange + gear.moveRange, 2, 7),
      initiative: Math.max(5, Math.round(14 + gear.speed * .35 + (passives.speedBonus || 0))),
    };
  }

  function learnedFighterPassives() {
    return FighterEffects?.passiveModifiers((skillState?.unlockedSkillIds || []).map((id) => Skills.getSkill(id)).filter(Boolean)) || {};
  }

  function equipmentItem(id) {
    return Expansion.getEquipment(Expansion.DEFAULT_EQUIPMENT_CATALOG, id);
  }

  function equipmentMatchesClass(item) {
    if (!item || item.slot !== "weapon") return true;
    const fighterWeapon = item.classId === "fighter" || /gloves|knuckles/.test(item.id);
    return playerClassId === "fighter" ? fighterWeapon : !fighterWeapon;
  }

  function equippedWeaponName() {
    return equipmentItem(equipped.weapon)?.name || "見習燈刃";
  }

  function activeGuildCommission() {
    return Guild.activeCommission(guildCommissionState);
  }

  function syncGuildCommissionProjection() {
    guildCommissionState = Guild.normalizeState(guildCommissionState);
    const commission = activeGuildCommission();
    activeContracts = commission ? [{
      id: `${guildCommissionState.cycle}:${commission.id}`,
      templateId: commission.id,
      rotation: String(guildCommissionState.cycle),
      title: commission.title,
      description: commission.description,
      minLevel: commission.recommendedLevel,
      objective: commission.type === "hunt"
        ? { event: "defeat", target: commission.objective.monster_id, count: commission.objective.count }
        : { event: "delivery", target: commission.objective.recipient_npc_id, count: 1 },
      reward: { coins: 0, xp: 0, items: [] },
      rewardBookStar: commission.reward.skill_envelope_star,
      progress: guildCommissionState.progress,
      status: guildCommissionState.status === "ready_to_report" ? "ready" : guildCommissionState.status,
      type: commission.type,
    }] : [];
    contractRotation = guildCommissionState.cycle;
  }

  function makeEnemy(spawn, overrides = {}) {
    const requestedType = overrides.type || spawn.type;
    const type = ExpansionWorld.normalizeMonsterId(requestedType) || requestedType;
    const base = enemyTypes[type] || enemyTypes[requestedType];
    const level = overrides.level || spawn.level || 1;
    const blueprint = ExpansionWorld.monsterBlueprint(type);
    const levelStats = blueprint ? ExpansionWorld.monsterStatsAtLevel(type, level, { elite: spawn.elite }) : null;
    const levelDelta = Math.max(0, level - (blueprint?.baseLevel || 1));
    const hpScale = 1 + levelDelta * .22;
    const damageScale = 1 + levelDelta * .14;
    const maxHp = levelStats?.hp || Math.round(base.hp * hpScale);
    const id = overrides.id || spawn.id || `enemy-${enemySerial++}`;
    return {
      id,
      instanceId: `${id}:${enemySerial++}`,
      type,
      name: spawn.name || blueprint?.name_zh || base.name,
      x: overrides.x ?? spawn.x,
      y: overrides.y ?? spawn.y,
      homeX: overrides.x ?? spawn.x,
      homeY: overrides.y ?? spawn.y,
      radius: base.radius,
      level,
      hp: overrides.hp ?? maxHp,
      maxHp,
      damage: levelStats?.attack || Math.round(base.damage * damageScale),
      speed: base.speed,
      xp: blueprint ? blueprint.rewards.baseXp : Math.round(base.xp * (1 + levelDelta * .18)),
      coins: blueprint ? Math.round(blueprint.rewards.coins * (1 + levelDelta * .15)) : Math.round(base.coins * (1 + levelDelta * .15)),
      aggro: base.aggro,
      range: base.range,
      color: base.color,
      artType: spawn.artType || base.artType || type,
      defence: levelStats?.defense ?? base.defence ?? 1,
      battleSpeed: base.battleSpeed || (type === "hound" ? 15 : type === "wisp" ? 12 : type === "boss" ? 10 : 8),
      moveRange: Math.max(2, base.moveRange || 4),
      attackRange: base.attackRange || 1,
      dropInfo: base.drop || null,
      crystal: spawn.crystal || null,
      boss: Boolean(spawn.boss || blueprint?.boss),
      mainBoss: Boolean(spawn.mainBoss || (type === "boss" && !blueprint)),
      monsterSkills: blueprint?.skills || [],
      elite: Boolean(spawn.elite),
      alive: true,
      respawnTimer: 0,
      attackCooldown: .4 + Math.random() * .7,
      windup: 0,
      attackDirection: { x: 0, y: 1 },
      facing: overrides.facing || spawn.facing || "down",
      pattern: "melee",
      patternCount: 0,
      encounterCooldown: 0,
      invulnerable: 0,
      hitFlash: 0,
      knockback: { x: 0, y: 0 },
      wanderAngle: Math.random() * Core.TAU,
      wanderTimer: 1 + Math.random() * 2,
      facingTurnCooldown: 0,
      facingCandidate: null,
      facingCandidateTime: 0,
      facingTravelX: 0,
      facingTravelY: 0,
      anim: Math.random() * 10,
      lastHitSerial: -1,
    };
  }

  function resetEnemies() {
    const dungeonLevelBoost = currentMapId === "dungeon"
      ? Math.min(28, Math.floor(Math.max(0, player.level - 8) * .55) + Math.min(12, dungeonClears))
      : 0;
    enemies = world.enemySpawns.map((spawn) => makeEnemy(spawn, dungeonLevelBoost
      ? { level: Math.min(Expansion.LEVEL_CAP, (spawn.level || 1) + dungeonLevelBoost) }
      : {}));
    if (bossDefeated && currentMapId === "field") {
      const boss = enemies.find((enemy) => enemy.mainBoss);
      if (boss) boss.alive = false;
    }
    projectiles = [];
    drops = [];
  }

  function readPreference(key, fallback, legacyKey = null) {
    try { return localStorage.getItem(key) || (legacyKey ? localStorage.getItem(legacyKey) : null) || fallback; } catch (_) { return fallback; }
  }

  function readSaveRaw() {
    for (const key of [SAVE_KEY, ...LEGACY_SAVE_KEYS]) {
      try {
        const raw = JSON.parse(localStorage.getItem(key));
        if (raw) return raw;
      } catch (_) {}
    }
    return null;
  }

  function hasSave() {
    return Boolean(Core.sanitizeSave(readSaveRaw()));
  }

  function resetExpansionProgress(classId = playerClassId) {
    playerClassId = Skills.CLASS_IDS?.includes(classId) ? classId : (Skills.DEFAULT_CLASS_ID || "warrior");
    const starterWeapon = playerClassId === "fighter" ? "novice_gloves" : "novice_blade";
    ownedEquipment = [starterWeapon, "traveller_coat"];
    equipped = { weapon: starterWeapon, armor: "traveller_coat", charm: null };
    guildCommissionState = Guild.emptyState();
    syncGuildCommissionProjection();
    contractRotation = 0;
    guildMarks = 0;
    guildRenown = 0;
    inventory = {};
    monsterKills = {};
    dungeonClears = 0;
    defeatedDungeonBosses = new Set();
    skillState = Skills.createSkillState({ classId: playerClassId });
    questTrackerMode = "main";
    checkpoint = { mapId: "world", x: overworld.start.x, y: overworld.start.y };
    facilityTab = "bag";
    facilityContext = "portable";
    selectedInventoryItemId = null;
    inventoryCategory = "all";
    inventoryFixtureCount = 0;
  }

  function loadExpansionProgress(raw) {
    const data = raw && typeof raw === "object" ? raw : {};
    skillState = Skills.normalizeSkillState(data.skills, { classId: data.classId || data.skills?.classId });
    playerClassId = skillState.classId;
    const starterWeapon = playerClassId === "fighter" ? "novice_gloves" : "novice_blade";
    const knownEquipment = new Set(Expansion.DEFAULT_EQUIPMENT_CATALOG.map((item) => item.id));
    const savedOwned = Array.isArray(data.ownedEquipment) ? data.ownedEquipment.filter((id) => knownEquipment.has(id)) : [];
    const gearState = Expansion.normalizeEquipmentState({
      coins: player.coins,
      level: player.level,
      ownedEquipment: [...new Set([starterWeapon, "traveller_coat", ...savedOwned])],
      equipped: data.equipped || { weapon: starterWeapon, armor: "traveller_coat", charm: null },
    });
    ownedEquipment = gearState.ownedEquipment;
    equipped = {
      weapon: gearState.equipped.weapon || starterWeapon,
      armor: gearState.equipped.armor || "traveller_coat",
      charm: gearState.equipped.charm || null,
    };
    guildCommissionState = Guild.normalizeState(data.guildCommission);
    syncGuildCommissionProjection();
    contractRotation = Core.clamp(Math.floor(Number(data.contractRotation) || guildCommissionState.cycle || 0), 0, 999999999);
    guildMarks = Core.clamp(Math.floor(Number(data.guildMarks) || 0), 0, 99999);
    guildRenown = Core.clamp(Math.floor(Number(data.guildRenown) || 0), 0, 999999);
    inventory = {};
    const knownInventory = new Set(["warden_lens"]);
    for (const template of Expansion.DEFAULT_CONTRACT_TEMPLATES) for (const item of template.reward.items) knownInventory.add(item.id);
    for (const blueprint of Object.values(ExpansionWorld.MONSTER_BLUEPRINTS)) if (blueprint.drop) knownInventory.add(blueprint.drop.id);
    if (data.inventory && typeof data.inventory === "object") {
      for (const [id, amount] of Object.entries(data.inventory).slice(0, 80)) if (knownInventory.has(id)) inventory[id] = Core.clamp(Math.floor(Number(amount) || 0), 0, 999);
    }
    monsterKills = {};
    if (data.monsterKills && typeof data.monsterKills === "object") {
      for (const [type, amount] of Object.entries(data.monsterKills).slice(0, 40)) if (enemyTypes[type]) monsterKills[type] = Core.clamp(Math.floor(Number(amount) || 0), 0, 99999);
    }
    dungeonClears = Core.clamp(Math.floor(Number(data.dungeonClears) || 0), 0, 9999);
    defeatedDungeonBosses = new Set(Array.isArray(data.defeatedDungeonBosses) ? data.defeatedDungeonBosses.filter((id) => typeof id === "string").slice(0, 20) : []);
    const checkpointMap = hasMap(data.checkpoint?.mapId) ? data.checkpoint.mapId : "world";
    const checkpointWorld = maps[checkpointMap];
    const checkpointCandidate = {
      mapId: checkpointMap,
      x: Core.clamp(Number(data.checkpoint?.x) || checkpointWorld.start.x, 40, checkpointWorld.pixelWidth - 40),
      y: Core.clamp(Number(data.checkpoint?.y) || checkpointWorld.start.y, 40, checkpointWorld.pixelHeight - 40),
    };
    checkpoint = isBlocked({ x: checkpointCandidate.x, y: checkpointCandidate.y, radius: player.radius }, checkpointWorld, checkpointMap)
      ? { mapId: checkpointMap, x: checkpointWorld.start.x, y: checkpointWorld.start.y }
      : checkpointCandidate;
  }

  function grantDeckCapacityMilestone(milestoneId, { silent = false } = {}) {
    const result = Skills.awardDeckCapacityMilestone(skillState, milestoneId);
    if (!result.ok) return result;
    skillState = result.state;
    if (result.awarded && !silent) {
      sound.level();
      showToast(`獲得戰技面板擴充 · DECK 增至 ${result.capacity} 格`, "good");
      announce(`戰技面板已擴充至 ${result.capacity} 格。`);
    }
    return result;
  }

  function syncDeckCapacityMilestones({ silent = true } = {}) {
    const results = [];
    if (questStage >= 3) results.push(grantDeckCapacityMilestone("main:fog-gate-open", { silent }));
    if (guildMarks >= 10) results.push(grantDeckCapacityMilestone("guild:rank-2", { silent }));
    if (questStage >= 4 || bossDefeated) results.push(grantDeckCapacityMilestone("main:light-eater-defeated", { silent }));
    return results;
  }

  function newGame(skipIntro = false, classId = Skills.DEFAULT_CLASS_ID || "warrior") {
    sound.ensure();
    closeBattleHud();
    encounterGrace = 1;
    automaticPortalReady = false;
    currentMapId = "world";
    world = overworld;
    clearExploreMovePath();
    pendingClickInteractionId = null;
    resetPlayer();
    resetExpansionProgress(classId);
    questStage = 0;
    crystals = new Set();
    bossDefeated = false;
    openedChests = new Set();
    pendingLevelUps = 0;
    playTime = 0;
    resetEnemies();
    camera.x = player.x;
    camera.y = player.y;
    camera.zoom = targetZoom();
    hideAllOverlays();
    titleScreen.hidden = true;
    mode = "playing";
    stage.dataset.gameState = mode;
    sound.start();
    showLocation("霧都主城", true);
    if (!skipIntro) showToast("撳地面行入公會，再同妍姐傾偈。", "good");
    updateHud(true);
    canvas.focus({ preventScroll: true });
    if (!testingMode) saveImportant(false);
  }

  function requestNewGame() {
    if (!testingMode && hasSave() && !window.confirm("開始新旅程會覆蓋而家嘅存檔。確定重新出發？")) return;
    classSelectPanel.hidden = false;
    drawClassSelectionPreviews();
    classSelectPanel.querySelector("[data-class-choice]")?.focus({ preventScroll: true });
  }

  function startNewGameWithClass(classId) {
    classSelectPanel.hidden = true;
    newGame(false, classId);
  }

  function loadGame() {
    let save = null;
    const rawSave = readSaveRaw();
    save = Core.sanitizeSave(rawSave);
    if (!save) {
      showToast("搵唔到可用嘅存檔", "danger");
      return false;
    }
    closeBattleHud();
    encounterGrace = 1.2;
    automaticPortalReady = false;
    currentMapId = hasMap(rawSave?.expansion?.currentMapId) ? rawSave.expansion.currentMapId : "world";
    world = maps[currentMapId];
    clearExploreMovePath();
    pendingClickInteractionId = null;
    resetPlayer();
    Object.assign(player, save.player);
    player.upgrades = { ...save.player.upgrades };
    questStage = save.questStage;
    crystals = new Set(save.crystals);
    bossDefeated = save.bossDefeated;
    openedChests = new Set(save.openedChests);
    playTime = save.playTime;
    // Legacy saves may contain unspent three-choice upgrades.  Growth is now
    // derived directly from class and level, so there is nothing left to spend.
    pendingLevelUps = 0;
    loadExpansionProgress(rawSave?.expansion);
    syncDeckCapacityMilestones({ silent: true });
    const stats = playerStats();
    player.hp = Core.clamp(player.hp, 1, stats.maxHp);
    if (isBlocked(player)) {
      player.x = world.start.x;
      player.y = world.start.y;
    }
    resetEnemies();
    camera.x = player.x;
    camera.y = player.y;
    camera.zoom = targetZoom();
    hideAllOverlays();
    titleScreen.hidden = true;
    mode = "playing";
    player.invulnerable = 1;
    persistence?.markLoaded(getPersistenceFingerprint());
    sound.start();
    showLocation(zoneForPosition(player), true);
    showToast("歡迎返嚟，守燈人。", "good");
    updateHud(true);
    canvas.focus({ preventScroll: true });
    return true;
  }

  function saveGame(showNotice = true, force = false) {
    if (testingMode && !force) return true;
    if (!force && persistence && !persistence.needsSave()) return true;
    const payload = {
      version: 1,
      player: {
        x: player.x,
        y: player.y,
        hp: player.hp,
        level: player.level,
        xp: player.xp,
        coins: player.coins,
        potions: player.potions,
        weaponLevel: player.weaponLevel,
        upgrades: { ...player.upgrades },
      },
      questStage,
      pendingLevelUps,
      crystals: [...crystals],
      bossDefeated,
      openedChests: [...openedChests],
      playTime,
      expansion: {
        currentMapId,
        classId: playerClassId,
        ownedEquipment: [...ownedEquipment],
        equipped: { ...equipped },
        guildCommission: Guild.normalizeState(guildCommissionState),
        activeContracts,
        contractRotation,
        guildMarks,
        guildRenown,
        inventory: { ...inventory },
        monsterKills: { ...monsterKills },
        dungeonClears,
        defeatedDungeonBosses: [...defeatedDungeonBosses],
        skills: Skills.normalizeSkillState(skillState),
        checkpoint: { ...checkpoint },
      },
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      persistenceFingerprint = getPersistenceFingerprint();
      persistence?.markSaved(persistenceFingerprint);
      continueButton.hidden = false;
      if (showNotice) {
        saveToast.classList.remove("show");
        void saveToast.offsetWidth;
        saveToast.classList.add("show");
      }
      return true;
    } catch (_) {
      if (showNotice) showToast("未能儲存；今次旅程仍然可以繼續。", "danger");
      return false;
    }
  }

  function hideAllOverlays() {
    dialoguePanel.hidden = true;
    levelUpPanel.hidden = true;
    deathPanel.hidden = true;
    victoryPanel.hidden = true;
    facilityPanel.hidden = true;
    classSelectPanel.hidden = true;
    skillBookConfirmPanel.hidden = true;
    skillDetailPanel.hidden = true;
    abandonCommissionPanel.hidden = true;
    pendingAbandonContractId = null;
    battleHud.hidden = true;
    battleEncounterIntro.hidden = true;
  }

  function targetZoom() {
    const responsiveBase = width < 650 ? 1.2 : width < 1000 ? 1.32 : 1.48;
    return responsiveBase * EXPLORE_ZOOM_SCALES[exploreZoomLevel];
  }

  function syncExploreZoomControls() {
    stage.dataset.zoomLevel = exploreZoomLevel;
    for (const button of document.querySelectorAll("[data-zoom-level]")) {
      const active = button.dataset.zoomLevel === exploreZoomLevel;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    }
  }

  function setExploreZoomLevel(level, options = {}) {
    if (!Object.hasOwn(EXPLORE_ZOOM_SCALES, level)) return false;
    const changed = level !== exploreZoomLevel;
    exploreZoomLevel = level;
    try { localStorage.setItem(ZOOM_KEY, level); } catch (_) {}
    syncExploreZoomControls();
    if (options.immediate) camera.zoom = targetZoom();
    if (changed && options.announceChange !== false && mode !== "title") {
      showToast(`地圖視角：${EXPLORE_ZOOM_LABELS[level]}`, "good");
      announce(`地圖視角切換到${EXPLORE_ZOOM_LABELS[level]}。`);
    }
    return true;
  }

  function resize() {
    const bounds = stage.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.imageSmoothingEnabled = false;
    camera.zoom = targetZoom();
    syncBattleFacingPicker();
    if (!dialoguePanel.hidden) drawDialoguePortrait();
  }

  function isGateOpen() {
    return questStage >= 3 || bossDefeated;
  }

  function houseCollisionRects(house) {
    const inset = 5;
    const top = house.y + 12;
    const spriteSettings = houseSpriteSettings(house);
    const bottom = Math.max(house.y + house.h, Number(spriteSettings?.y) || 0);
    if (!Number.isFinite(house.doorX) || !Number.isFinite(house.doorWidth)) {
      return [{ x: house.x + inset, y: top, w: house.w - inset * 2, h: Math.max(0, bottom - top - 2) }];
    }
    const doorTop = Math.max(top, bottom - Math.max(36, Number(house.doorDepth) || 48));
    const doorLeft = Core.clamp(house.doorX - house.doorWidth / 2, house.x + inset, house.x + house.w - inset);
    const doorRight = Core.clamp(house.doorX + house.doorWidth / 2, house.x + inset, house.x + house.w - inset);
    if (house.frontage === "north") {
      const doorBottom = Math.min(bottom, Math.max(top, (Number(house.doorY) || top) + Math.max(36, Number(house.doorDepth) || 48)));
      return [
        { x: house.x + inset, y: top, w: Math.max(0, doorLeft - house.x - inset), h: Math.max(0, doorBottom - top) },
        { x: doorRight, y: top, w: Math.max(0, house.x + house.w - inset - doorRight), h: Math.max(0, doorBottom - top) },
        { x: house.x + inset, y: doorBottom, w: house.w - inset * 2, h: Math.max(0, bottom - doorBottom) },
      ].filter((rect) => rect.w > 0 && rect.h > 0);
    }
    return [
      { x: house.x + inset, y: top, w: house.w - inset * 2, h: Math.max(0, doorTop - top) },
      { x: house.x + inset, y: doorTop, w: Math.max(0, doorLeft - house.x - inset), h: Math.max(0, bottom - doorTop - 2) },
      { x: doorRight, y: doorTop, w: Math.max(0, house.x + house.w - inset - doorRight), h: Math.max(0, bottom - doorTop - 2) },
    ].filter((rect) => rect.w > 0 && rect.h > 0);
  }

  function isBlocked(circle, activeWorld = world, activeMapId = currentMapId) {
    if (!Number.isFinite(circle.x) || !Number.isFinite(circle.y)) return true;
    const isAuthoritativeNavigation = activeWorld.navigation?.authoritative === true;
    const radius = isAuthoritativeNavigation ? Number(activeWorld.navigation.feetRadiusPx) || 3 : Number(circle.radius) || 0;
    if (circle.x - radius < 0 || circle.y - radius < 0 || circle.x + radius > activeWorld.pixelWidth || circle.y + radius > activeWorld.pixelHeight) return true;
    if (isAuthoritativeNavigation) {
      // Authoritative maps own one fail-closed resolver. Missing or invalid
      // generated data blocks movement; it must never reopen tile fallback.
      const canWalk = activeMapId === "world"
        ? typeof MainTownNavigation?.isWorldPositionWalkable === "function" && MainTownNavigation.isWorldPositionWalkable(activeMapId, circle, { radius })
        : typeof activeWorld.navigation.resolver?.isPositionWalkable === "function" && activeWorld.navigation.resolver.isPositionWalkable(circle, { radius });
      return !canWalk;
    }
    const left = Math.floor((circle.x - circle.radius) / activeWorld.tileSize);
    const right = Math.floor((circle.x + circle.radius) / activeWorld.tileSize);
    const top = Math.floor((circle.y - circle.radius) / activeWorld.tileSize);
    const bottom = Math.floor((circle.y + circle.radius) / activeWorld.tileSize);
    for (let ty = top; ty <= bottom; ty += 1) {
      for (let tx = left; tx <= right; tx += 1) {
        if (!World.isTileSolid(World.tileAt(activeWorld, tx, ty))) continue;
        if (Core.circleRectOverlap(circle, { x: tx * activeWorld.tileSize, y: ty * activeWorld.tileSize, w: activeWorld.tileSize, h: activeWorld.tileSize })) return true;
      }
    }
    for (const house of activeWorld.houses) {
      if (houseCollisionRects(house).some((rect) => Core.circleRectOverlap(circle, rect))) return true;
    }
    for (const tree of activeWorld.trees) {
      if (Core.circlesOverlap(circle, { x: tree.x, y: tree.y + 6, radius: tree.radius - 3 })) return true;
    }
    for (const rock of activeWorld.rocks) {
      if (Core.circlesOverlap(circle, rock, -2)) return true;
    }
    for (const object of activeWorld.collisionObjects) {
      if (Number.isFinite(object.w) && Number.isFinite(object.h) && Core.circleRectOverlap(circle, object)) return true;
      if (Number.isFinite(object.radius) && Core.circlesOverlap(circle, object, -2)) return true;
    }
    if (activeMapId === "field" && !isGateOpen() && Core.circleRectOverlap(circle, activeWorld.gate)) return true;
    return false;
  }

  function moveEntity(entity, dx, dy) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
    let hitX = false;
    let hitY = false;
    for (let step = 0; step < steps; step += 1) {
      const result = Core.moveWithCollision(entity, dx / steps, dy / steps, isBlocked);
      entity.x = result.x;
      entity.y = result.y;
      hitX ||= result.hitX;
      hitY ||= result.hitY;
    }
    return { hitX, hitY };
  }

  function clearExploreMovePath(clearPortalIntent = true) {
    exploreMoveTarget = null;
    exploreMovePath = [];
    if (clearPortalIntent) explorePortalIntentId = null;
  }

  function planExploreMove(destination) {
    clearExploreMovePath(false);
    const goal = {
      x: Core.clamp(Number(destination?.x) || player.x, player.radius, world.pixelWidth - player.radius),
      y: Core.clamp(Number(destination?.y) || player.y, player.radius, world.pixelHeight - player.radius),
    };
    if (Core.distance(player, goal) <= Math.max(5, player.radius * .45)) return true;
    const authoritativeNavigation = world.navigation?.authoritative === true;
    const navigationRadius = authoritativeNavigation
      ? Number(world.navigation?.feetRadiusPx) || (currentMapId === "world" ? MainTownNavigation?.feetRadiusPx : 3) || 3
      : player.radius;
    const path = Core.findOverworldPath(player, goal, {
      bounds: { x: 0, y: 0, w: world.pixelWidth, h: world.pixelHeight },
      // The authored Main Town allowlist has narrow but valid approaches
      // (notably the Inn). Sample the shared pathfinder from the same feet
      // contract instead of skipping over those corridors at tile scale.
      cellSize: authoritativeNavigation
        ? Math.max(12, navigationRadius * 4)
        : Math.max(20, world.tileSize * .6),
      radius: navigationRadius,
      directions: 8,
      maxVisited: 14000,
      nearestReachable: true,
      isWalkable: (point) => !isBlocked({ x: point.x, y: point.y, radius: navigationRadius }),
    });
    if (!path.length) return false;
    exploreMovePath = path.map((point) => ({ x: point.x, y: point.y }));
    exploreMoveTarget = exploreMovePath.shift() || null;
    return Boolean(exploreMoveTarget);
  }

  function updateSelectedPortalNavigation() {
    if (!explorePortalIntentId || mode !== "playing" || currentMapId !== "world") return;
    const portal = world.portals.find((candidate) => candidate.id === explorePortalIntentId);
    if (!portal || MapTransitions.transitionTypeFor(portal) !== TRANSITION_TYPES.PHYSICAL_DOOR) {
      explorePortalIntentId = null;
      return;
    }
    if (exploreMoveTarget || exploreMovePath.length) return;
    const entrance = MapTransitions.entranceFor(portal);
    if (!entrance || MapTransitions.pointInThreshold(portal, player)) return;
    const approach = entrance.approachPoint || portal.approachPoint || portal;
    const threshold = entrance.threshold;
    const thresholdCentre = threshold
      ? { x: threshold.x + threshold.w / 2, y: threshold.y + threshold.h / 2 }
      : portal;
    const destination = Core.distance(player, approach) > 16 ? approach : thresholdCentre;
    if (!planExploreMove(destination) && Core.distance(player, destination) > 8) explorePortalIntentId = null;
  }

  function movementInput() {
    if (autoplay && mode === "playing") return autoMovement();
    while (exploreMoveTarget && Core.distance(player, exploreMoveTarget) <= Math.max(6, player.radius * .55)) {
      exploreMoveTarget = exploreMovePath.shift() || null;
    }
    if (!exploreMoveTarget) return { x: 0, y: 0 };
    const delta = { x: exploreMoveTarget.x - player.x, y: exploreMoveTarget.y - player.y };
    return Core.normalize(delta);
  }

  function autoMovement() {
    if (!autoTarget || !autoTarget.alive || Core.distance(player, autoTarget) > 360) {
      autoTarget = enemies.filter((enemy) => enemy.alive && !enemy.boss).sort((a, b) => Core.distance(player, a) - Core.distance(player, b))[0] || null;
    }
    if (!autoTarget) return { x: 0, y: 0 };
    const offset = { x: autoTarget.x - player.x, y: autoTarget.y - player.y };
    const dist = Math.hypot(offset.x, offset.y);
    if (dist < 52) {
      faceToward(offset);
      if (player.attackCooldown <= 0) performAttack();
      return { x: 0, y: 0 };
    }
    return Core.normalize(offset);
  }

  function faceToward(vector) {
    setFacingFromVector(player, vector);
  }

  function setFacingFromVector(entity, vector) {
    if (!entity || (!vector.x && !vector.y)) return;
    if (Math.abs(vector.x) > Math.abs(vector.y)) entity.facing = vector.x < 0 ? "left" : "right";
    else entity.facing = vector.y < 0 ? "up" : "down";
  }

  function stableEnemyFacingFromVector(enemy, vector) {
    const horizontal = ["left", "right"].includes(enemy?.facing);
    const ax = Math.abs(vector.x);
    const ay = Math.abs(vector.y);
    // Keep the current axis around diagonals. This prevents tiny path/collision
    // corrections from making a four-direction sprite flicker every frame.
    const useHorizontal = horizontal ? ax >= ay * ENEMY_FACING_HORIZONTAL_HYSTERESIS : ax > ay * ENEMY_FACING_VERTICAL_AXIS_MARGIN;
    return useHorizontal ? (vector.x < 0 ? "left" : "right") : (vector.y < 0 ? "up" : "down");
  }

  const ENEMY_FACING_MIN_TRAVEL = .65;
  const ENEMY_FACING_CONFIRM_SECONDS = .12;
  const ENEMY_FACING_CHANGE_COOLDOWN_SECONDS = .34;
  const ENEMY_FACING_HORIZONTAL_HYSTERESIS = .82;
  const ENEMY_FACING_VERTICAL_AXIS_MARGIN = 1.18;
  const ENEMY_MOVEMENT_EPSILON = .001;

  function updateStableEnemyFacing(enemy, vector, dt) {
    if (!enemy) return;
    enemy.facingTurnCooldown = Math.max(0, (enemy.facingTurnCooldown || 0) - dt);
    if (!vector || !Number.isFinite(vector.x) || !Number.isFinite(vector.y)) return;
    if (Math.hypot(vector.x, vector.y) <= ENEMY_MOVEMENT_EPSILON) {
      enemy.facingTravelX = 0;
      enemy.facingTravelY = 0;
      enemy.facingCandidate = null;
      enemy.facingCandidateTime = 0;
      return;
    }
    enemy.facingTravelX = (enemy.facingTravelX || 0) + vector.x;
    enemy.facingTravelY = (enemy.facingTravelY || 0) + vector.y;
    if (Math.hypot(enemy.facingTravelX, enemy.facingTravelY) < ENEMY_FACING_MIN_TRAVEL) return;
    const meaningfulTravel = { x: enemy.facingTravelX, y: enemy.facingTravelY };
    enemy.facingTravelX = 0;
    enemy.facingTravelY = 0;
    const desired = stableEnemyFacingFromVector(enemy, meaningfulTravel);
    if (desired === enemy.facing) {
      enemy.facingCandidate = null;
      enemy.facingCandidateTime = 0;
      return;
    }
    if (enemy.facingCandidate !== desired) {
      enemy.facingCandidate = desired;
      enemy.facingCandidateTime = 0;
    }
    enemy.facingCandidateTime += dt;
    if (enemy.facingTurnCooldown > 0 || enemy.facingCandidateTime < ENEMY_FACING_CONFIRM_SECONDS) return;
    enemy.facing = desired;
    enemy.facingTurnCooldown = ENEMY_FACING_CHANGE_COOLDOWN_SECONDS;
    enemy.facingCandidate = null;
    enemy.facingCandidateTime = 0;
  }

  function updatePlayer(dt) {
    const stats = playerStats();
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    const drag = Math.pow(.0008, dt);
    player.knockback.x *= drag;
    player.knockback.y *= drag;

    updateSelectedPortalNavigation();
    let direction = movementInput();
    let speed = stats.speed;
    if (player.attackTimer > .05) {
      speed *= .56;
    }
    if (direction.x || direction.y) faceToward(direction);
    const dx = (direction.x * speed + player.knockback.x) * dt;
    const dy = (direction.y * speed + player.knockback.y) * dt;
    const before = { x: player.x, y: player.y };
    const movement = moveEntity(player, dx, dy);
    if (exploreMoveTarget && movement.hitX && movement.hitY) clearExploreMovePath();
    const travelled = { x: player.x - before.x, y: player.y - before.y };
    player.moving = Math.hypot(travelled.x, travelled.y) > .001;
    if (player.moving) player.facing = Locomotion.facingFromDelta(travelled.x, travelled.y, player.facing);
    player.locomotion = Locomotion.update(player.locomotion, { moving: player.moving, facing: player.facing, dt });
    if (player.moving) player.walkCycle += dt * 8;

    if (updateAutomaticPortal()) return;
    collectDrops();
    updateNearestInteraction();
    if (pendingClickInteractionId && nearestInteraction?.id === pendingClickInteractionId) {
      pendingClickInteractionId = null;
      clearExploreMovePath();
      interact();
      if (mode !== "playing") return;
    }
    const nextZone = zoneForPosition(player);
    if (nextZone !== currentZone) showLocation(nextZone);
  }

  function performAttack() {
    if (mode !== "playing" || player.attackCooldown > 0) return;
    const target = enemies
      .filter((enemy) => enemy.alive && (!enemy.mainBoss || questStage >= 3) && enemy.encounterCooldown <= 0)
      .map((enemy) => ({ enemy, distance: Core.distance(player, enemy) }))
      .filter((item) => item.distance <= 68 && lineClear(player, item.enemy))
      .sort((a, b) => a.distance - b.distance)[0]?.enemy;
    player.attackCooldown = .3;
    player.attackTimer = .2;
    sound.swing();
    if (target) {
      faceToward({ x: target.x - player.x, y: target.y - player.y });
      window.setTimeout(() => {
        if (mode === "playing" && target.alive) startBattle(target);
      }, 130);
    } else {
      showToast("行近霧獸就會展開格仔戰鬥。", "good");
    }
  }

  function lineClear(from, to) {
    const steps = Math.max(2, Math.ceil(Core.distance(from, to) / 10));
    for (let index = 1; index < steps; index += 1) {
      const t = index / steps;
      const radius = world.navigation?.authoritative ? Number(world.navigation?.feetRadiusPx) || 3 : 2;
      if (isBlocked({ x: Core.lerp(from.x, to.x, t), y: Core.lerp(from.y, to.y, t), radius })) return false;
    }
    return true;
  }

  function usePotion() {
    if (mode !== "playing") return;
    const maxHp = playerStats().maxHp;
    if (player.potions <= 0) return showToast("藥水用晒喇。", "danger");
    if (player.hp >= maxHp) return showToast("而家精神得很，留返支藥先。", "good");
    player.potions -= 1;
    const healed = Math.min(maxHp - player.hp, Math.round(maxHp * .46));
    player.hp += healed;
    markPersistenceDirty();
    spawnBurst(player.x, player.y, "#87db82", 22, 68);
    addDamageNumber(player.x, player.y - 18, `+${healed}`, "#87db82", true);
    sound.heal();
    announce(`回復 ${healed} 生命`);
    updateHud();
  }

  function damageEnemy(enemy, amount, direction = { x: 0, y: 0 }, critical = false) {
    if (!enemy.alive || enemy.invulnerable > 0) return;
    enemy.hp = Math.max(0, enemy.hp - amount);
    enemy.invulnerable = enemy.boss ? .08 : .18;
    enemy.hitFlash = .14;
    enemy.windup = 0;
    enemy.knockback.x += direction.x * (enemy.boss ? 45 : 150);
    enemy.knockback.y += direction.y * (enemy.boss ? 45 : 150);
    addDamageNumber(enemy.x, enemy.y - enemy.radius, `${critical ? "✦ " : ""}${amount}`, critical ? "#ffc857" : "#f5e9ca", critical);
    spawnBurst(enemy.x, enemy.y, critical ? "#ffc857" : enemy.color, critical ? 16 : 8, critical ? 95 : 58);
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function getPersistenceFingerprint() {
    return JSON.stringify({
      player: { x: player.x, y: player.y, hp: player.hp, level: player.level, xp: player.xp, coins: player.coins, potions: player.potions, weaponLevel: player.weaponLevel, upgrades: player.upgrades },
      questStage, pendingLevelUps, crystals: [...crystals].sort(), bossDefeated, openedChests: [...openedChests].sort(),
      expansion: { currentMapId, playerClassId, ownedEquipment: [...ownedEquipment].sort(), equipped, guildCommission: guildCommissionState, activeContracts, contractRotation, guildMarks, guildRenown, inventory, monsterKills, dungeonClears, defeatedDungeonBosses: [...defeatedDungeonBosses].sort(), skills: skillState, checkpoint },
    });
  }

  function markPersistenceDirty() {
    return persistence?.markDirty() || false;
  }

  function saveImportant(showNotice = false) {
    markPersistenceDirty();
    return saveGame(showNotice);
  }

  persistence = SaveSystem.create({
    intervalMs: 5000,
    fingerprint: getPersistenceFingerprint,
    save: () => saveGame(false),
  });

  function recordDefeatedMonster(enemy) {
    const monsterId = ExpansionWorld.normalizeMonsterId(enemy?.type) || String(enemy?.type || "");
    if (!monsterId) return { changed: false, reason: "unknown-monster" };
    monsterKills[monsterId] = (monsterKills[monsterId] || 0) + 1;
    guildRenown += enemy?.boss ? 8 : enemy?.elite ? 3 : 1;
    markPersistenceDirty();
    const result = Guild.recordHuntKill(guildCommissionState, {
      monsterId,
      instanceId: enemy?.instanceId || enemy?.id,
    });
    guildCommissionState = result.state;
    syncGuildCommissionProjection();
    if (result.changed) {
      const commission = result.commission;
      showToast(commission.type === "hunt" && result.state.status === "ready_to_report"
        ? `委託完成：${commission.title} · 返公會回報`
        : `${commission.title}　${result.state.progress} / ${commission.objective.count}`, "good");
    }
    return result;
  }

  function killEnemy(enemy) {
    if (!enemy.alive) return;
    enemy.alive = false;
    enemy.respawnTimer = enemy.boss ? Infinity : 11 + Math.random() * 5;
    enemy.windup = 0;
    spawnBurst(enemy.x, enemy.y, enemy.color, enemy.boss ? 70 : 24, enemy.boss ? 150 : 90);
    recordDefeatedMonster(enemy);
    const rewardXp = ExpansionWorld.xpReward(enemy.xp, enemy.level, player.level);
    gainXp(rewardXp);
    if (enemy.mainBoss) {
      bossDefeated = true;
      questStage = 4;
      const deckUpgrade = grantDeckCapacityMilestone("main:light-eater-defeated", { silent: true });
      player.coins += enemy.coins;
      sound.crystal();
      showToast(`吞燈獸倒下咗！返去公會搵妍姐。${deckUpgrade.awarded ? ` · DECK 增至 ${deckUpgrade.capacity} 格` : ""}`, "good");
      announce(`擊敗吞燈獸。任務更新：返回公會搵妍姐${deckUpgrade.awarded ? `；戰技面板增至 ${deckUpgrade.capacity} 格` : ""}`);
      saveImportant(false);
      return;
    }
    if (enemy.boss) {
      defeatedDungeonBosses.add(enemy.id);
      dungeonClears += 1;
      guildMarks += 2;
      inventory["warden-lens"] = (inventory["warden-lens"] || 0) + 1;
      player.coins += enemy.coins;
      sound.crystal();
      showToast(`沉燈坑道突破！第 ${dungeonClears} 次 · +2 公會印記`, "good");
      announce(`擊敗${enemy.name}，沉燈坑道突破。`);
      saveImportant(false);
      return;
    }
    drops.push({ id: `drop-${Date.now()}-${Math.random()}`, kind: "coin", x: enemy.x, y: enemy.y, value: enemy.coins, radius: 8, life: 22, phase: Math.random() * Core.TAU });
    if (Math.random() < .12) drops.push({ id: `potion-${Date.now()}-${Math.random()}`, kind: "potion", x: enemy.x + 12, y: enemy.y - 5, value: 1, radius: 9, life: 22, phase: 0 });
    if (enemy.dropInfo && Math.random() < enemy.dropInfo.chance) {
      inventory[enemy.dropInfo.id] = (inventory[enemy.dropInfo.id] || 0) + 1;
      addDamageNumber(enemy.x, enemy.y - 28, `+ ${enemy.dropInfo.name}`, "#52dccb", true);
    }
    if (enemy.crystal && questStage >= 1 && !crystals.has(enemy.crystal)) {
      drops.push({ id: `crystal-${enemy.crystal}`, kind: "crystal", crystal: enemy.crystal, x: enemy.x, y: enemy.y - 8, radius: 12, life: Infinity, phase: 0 });
    }
  }

  function gainXp(amount) {
    if (player.level >= Expansion.LEVEL_CAP) {
      player.xp = 0;
      updateHud();
      return;
    }
    const oldStats = playerStats();
    const result = Expansion.grantExperience(player.level, player.xp, amount);
    player.level = result.level;
    player.xp = result.xp;
    if (amount > 0) markPersistenceDirty();
    if (result.levelsGained > 0) {
      pendingLevelUps = 0;
      const newStats = playerStats();
      player.hp = Math.min(newStats.maxHp, player.hp + Math.max(0, newStats.maxHp - oldStats.maxHp));
      sound.level();
      const hpGain = newStats.maxHp - oldStats.maxHp;
      const attackGain = newStats.attack - oldStats.attack;
      const defenceGain = newStats.defence - oldStats.defence;
      showToast(`升到 LV.${player.level} · 生命 +${hpGain} · 攻擊 +${attackGain} · 防禦 +${defenceGain}`, "good");
      announce(`升到 ${player.level} 級。職業能力已自動成長。`);
      saveImportant(false);
    }
    updateHud();
  }

  function openLevelUp() {
    pendingLevelUps = 0;
    levelUpPanel.hidden = true;
    if (mode === "levelup") {
      mode = "playing";
      stage.dataset.gameState = mode;
    }
    return false;
  }

  function chooseUpgrade() {
    // Kept as a no-op debug compatibility hook for old smoke scripts/saves.
    return openLevelUp();
  }

  function damagePlayer(amount, source, direction) {
    if (mode !== "playing" || player.invulnerable > 0) return;
    player.hp = Math.max(0, player.hp - amount);
    markPersistenceDirty();
    player.invulnerable = .68;
    const push = direction || Core.normalize({ x: player.x - source.x, y: player.y - source.y });
    player.knockback.x += push.x * 180;
    player.knockback.y += push.y * 180;
    screenShake = reducedMotion ? 0 : 8;
    screenFlash = .35;
    spawnBurst(player.x, player.y, "#ff6b6b", 15, 95);
    addDamageNumber(player.x, player.y - 18, `-${amount}`, "#ff6b6b", true);
    sound.hurt();
    if (navigator.vibrate) navigator.vibrate(22);
    if (player.hp <= 0) playerDeath();
    updateHud();
  }

  function playerDeath() {
    mode = "dead";
    player.deathStartedAt = elapsed;
    stage.dataset.gameState = mode;
    keys.clear();
    sound.death();
    const deathCopy = deathPanel.querySelector("p:not(.modal-kicker)");
    if (deathCopy) deathCopy.innerHTML = checkpoint.mapId === "dungeon" ? "回音燈仲記得你嘅腳步。<br />喺坑道落腳點醒返，再行一次。" : "唔緊要，港口盞燈仲記得你。<br />返去抖一抖，再嚟過。";
    deathPanel.hidden = false;
    document.getElementById("respawnButton").focus({ preventScroll: true });
    announce(checkpoint.mapId === "dungeon" ? "你倒下了。可以在坑道回音燈重新出發。" : "你倒下了。可以在港口燈龕重新出發。");
  }

  function respawn() {
    closeBattleHud();
    encounterGrace = 1.2;
    currentMapId = hasMap(checkpoint.mapId) ? checkpoint.mapId : "world";
    world = maps[currentMapId];
    player.x = checkpoint.x;
    player.y = checkpoint.y;
    player.hp = playerStats().maxHp;
    player.coins = Math.floor(player.coins * .9);
    player.invulnerable = 1.2;
    player.knockback = { x: 0, y: 0 };
    player.deathStartedAt = null;
    resetEnemies();
    deathPanel.hidden = true;
    mode = "playing";
    stage.dataset.gameState = mode;
    camera.x = player.x;
    camera.y = player.y;
    showLocation(zoneForPosition(player), true);
    showToast(currentMapId === "dungeon" ? "回音燈將你帶返坑道落腳點。" : "跌咗少少燈幣，但你仲有成身本領。", "good");
    saveImportant(false);
    canvas.focus({ preventScroll: true });
  }

  function updateEnemies(dt) {
    for (const enemy of enemies) {
      if (!enemy.alive) {
        if (!enemy.boss) {
          enemy.respawnTimer -= dt;
          if (enemy.respawnTimer <= 0) Object.assign(enemy, makeEnemy({ ...enemy, x: enemy.homeX, y: enemy.homeY, type: enemy.type, level: enemy.level, crystal: enemy.crystal }, { id: enemy.id }));
        }
        continue;
      }
      if (enemy.mainBoss && (questStage < 3 || bossDefeated)) continue;
      enemy.encounterCooldown = Math.max(0, enemy.encounterCooldown - dt);
      enemy.anim += dt * (enemy.type === "hound" ? 8 : 4);
      enemy.invulnerable = Math.max(0, enemy.invulnerable - dt);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      const offset = { x: player.x - enemy.x, y: player.y - enemy.y };
      const dist = Math.hypot(offset.x, offset.y);
      const toward = Core.normalize(offset);
      if (encounterGrace <= 0 && enemy.encounterCooldown <= 0 && dist <= player.radius + enemy.radius + 10) {
        startBattle(enemy);
        break;
      }
      const before = { x: enemy.x, y: enemy.y };
      if (dist < Math.min(135, enemy.aggro * .62)) {
        moveEntity(enemy, toward.x * enemy.speed * .27 * dt, toward.y * enemy.speed * .27 * dt);
      } else updateWander(enemy, dt);
      const travelled = { x: enemy.x - before.x, y: enemy.y - before.y };
      enemy.moving = Math.hypot(travelled.x, travelled.y) > ENEMY_MOVEMENT_EPSILON;
      updateStableEnemyFacing(enemy, travelled, dt);
      enemy.locomotion = Locomotion.update(enemy.locomotion, { moving: enemy.moving, facing: enemy.facing, dt });
    }
  }

  function updateMeleeEnemy(enemy, toward, dist, dt) {
    if (dist <= enemy.range + player.radius && enemy.attackCooldown <= 0) {
      enemy.windup = enemy.type === "hound" ? .36 : .52;
      enemy.attackDirection = toward;
      enemy.pattern = "melee";
      return;
    }
    const speed = enemy.speed * (enemy.type === "hound" && dist > 80 ? 1.12 : 1);
    moveEntity(enemy, toward.x * speed * dt, toward.y * speed * dt);
  }

  function updateWisp(enemy, toward, dist, dt) {
    if (enemy.attackCooldown <= 0 && dist < enemy.range + 55) {
      enemy.windup = .48;
      enemy.attackDirection = toward;
      enemy.pattern = "shot";
      return;
    }
    const tangent = { x: -toward.y, y: toward.x };
    const radial = dist < 95 ? -1 : dist > 145 ? 1 : 0;
    const move = Core.normalize({ x: toward.x * radial + tangent.x * .55, y: toward.y * radial + tangent.y * .55 });
    moveEntity(enemy, move.x * enemy.speed * dt, move.y * enemy.speed * dt);
  }

  function updateBoss(enemy, toward, dist, dt) {
    const enraged = enemy.hp < enemy.maxHp * .42;
    if (enemy.attackCooldown <= 0) {
      enemy.patternCount += 1;
      enemy.attackDirection = toward;
      if (enemy.patternCount % 3 === 0) enemy.pattern = "burst";
      else if (dist < 92) enemy.pattern = "slam";
      else enemy.pattern = "volley";
      enemy.windup = enemy.pattern === "burst" ? .9 : .62;
      sound.boss();
      return;
    }
    const speed = enemy.speed * (enraged ? 1.25 : 1);
    if (dist > 78) moveEntity(enemy, toward.x * speed * dt, toward.y * speed * dt);
  }

  function updateWander(enemy, dt) {
    enemy.wanderTimer -= dt;
    if (enemy.wanderTimer <= 0) {
      enemy.wanderTimer = 1.2 + Math.random() * 2.4;
      enemy.wanderAngle += (Math.random() - .5) * 2.2;
    }
    const homeDistance = Math.hypot(enemy.homeX - enemy.x, enemy.homeY - enemy.y);
    const direction = homeDistance > 85
      ? Core.normalize({ x: enemy.homeX - enemy.x, y: enemy.homeY - enemy.y })
      : { x: Math.cos(enemy.wanderAngle), y: Math.sin(enemy.wanderAngle) };
    const collision = moveEntity(enemy, direction.x * enemy.speed * .22 * dt, direction.y * enemy.speed * .22 * dt);
    if (collision.hitX) enemy.wanderAngle = Math.PI - enemy.wanderAngle;
    if (collision.hitY) enemy.wanderAngle = -enemy.wanderAngle;
    if (collision.hitX || collision.hitY) enemy.wanderTimer = Math.max(enemy.wanderTimer, .45);
  }

  function resolveEnemyAttack(enemy) {
    enemy.attackCooldown = enemy.type === "boss" ? (enemy.hp < enemy.maxHp * .42 ? 1.05 : 1.45) : enemy.type === "wisp" ? 1.65 : 1.2;
    if (enemy.pattern === "shot") {
      spawnProjectile(enemy, enemy.attackDirection, enemy.damage, 155, "#ae91ff");
    } else if (enemy.pattern === "volley") {
      [-.18, 0, .18].forEach((angle) => spawnProjectile(enemy, rotateVector(enemy.attackDirection, angle), enemy.damage, 178, "#ff7199"));
    } else if (enemy.pattern === "burst") {
      for (let i = 0; i < 10; i += 1) spawnProjectile(enemy, { x: Math.cos(i / 10 * Core.TAU), y: Math.sin(i / 10 * Core.TAU) }, Math.round(enemy.damage * .72), 142, "#ff7199");
    } else if (enemy.pattern === "slam") {
      if (Core.distance(enemy, player) < 92) damagePlayer(enemy.damage, enemy);
      spawnBurst(enemy.x, enemy.y, "#ff6b91", 32, 120);
      screenShake = reducedMotion ? 0 : 11;
    } else if (Core.distance(enemy, player) < enemy.range + player.radius + 12) {
      damagePlayer(enemy.damage, enemy, enemy.attackDirection);
    }
  }

  function rotateVector(vector, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: vector.x * cos - vector.y * sin, y: vector.x * sin + vector.y * cos };
  }

  function spawnProjectile(enemy, direction, damage, speed, color) {
    projectiles.push({
      id: `projectile-${enemy.id}-${Date.now()}-${Math.random()}`,
      x: enemy.x + direction.x * (enemy.radius + 8),
      y: enemy.y + direction.y * (enemy.radius + 8),
      vx: direction.x * speed,
      vy: direction.y * speed,
      radius: enemy.boss ? 7 : 5,
      damage,
      color,
      life: 4,
      phase: Math.random() * Core.TAU,
    });
  }

  function updateProjectiles(dt) {
    for (const projectile of projectiles) {
      projectile.life -= dt;
      projectile.phase += dt * 7;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      if (isBlocked(projectile)) projectile.life = 0;
      else if (Core.circlesOverlap(projectile, player)) {
        damagePlayer(projectile.damage, projectile, Core.normalize({ x: projectile.vx, y: projectile.vy }));
        projectile.life = 0;
      }
    }
    projectiles = projectiles.filter((projectile) => projectile.life > 0);
  }

  function updateDrops(dt) {
    for (const drop of drops) {
      drop.phase += dt * 3;
      if (Number.isFinite(drop.life)) drop.life -= dt;
    }
    drops = drops.filter((drop) => drop.life > 0);
  }

  function collectDrops() {
    let changed = false;
    let important = false;
    for (const drop of drops) {
      if (drop.life <= 0 || Core.distance(player, drop) > player.radius + drop.radius + 10) continue;
      drop.life = 0;
      changed = true;
      if (drop.kind === "coin") {
        player.coins += drop.value;
        sound.coin();
      } else if (drop.kind === "potion") {
        player.potions = Math.min(9, player.potions + 1);
        showToast("執到一支回燈藥", "good");
        sound.heal();
      } else if (drop.kind === "crystal") {
        crystals.add(drop.crystal);
        sound.crystal();
        showToast(`獲得霧晶 · ${crystalName(drop.crystal)}（${crystals.size} / 3）`, "good");
        announce(`獲得${crystalName(drop.crystal)}，目前有 ${crystals.size} 粒霧晶。`);
        screenFlash = .5;
        if (crystals.size >= 3 && questStage === 1) {
          questStage = 2;
          showToast("三粒霧晶齊晒！去北岸封印。", "good");
          important = true;
        }
      }
    }
    if (changed) {
      markPersistenceDirty();
      if (important) saveGame(false);
    }
    updateHud();
  }

  function crystalName(id) {
    return id === "north" ? "北霧晶" : id === "west" ? "林霧晶" : "空心霧晶";
  }

  function spawnParticle(x, y, color, size, speed, life) {
    const angle = Math.random() * Core.TAU;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, size, life, maxLife: life });
  }

  function spawnBurst(x, y, color, count, speed) {
    const actual = reducedMotion ? Math.ceil(count * .4) : count;
    for (let index = 0; index < actual; index += 1) {
      spawnParticle(x, y, color, 1 + Math.random() * 3, speed * (.25 + Math.random() * .75), .35 + Math.random() * .55);
    }
  }

  function addDamageNumber(x, y, text, color, important = false) {
    damageNumbers.push({ x, y, text, color, life: important ? .95 : .72, maxLife: important ? .95 : .72, important });
  }

  function updateEffects(dt) {
    for (const particle of particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      const drag = Math.pow(.025, dt);
      particle.vx *= drag;
      particle.vy *= drag;
      particle.life -= dt;
    }
    particles = particles.filter((particle) => particle.life > 0);
    for (const number of damageNumbers) {
      number.y -= 24 * dt;
      number.life -= dt;
    }
    damageNumbers = damageNumbers.filter((number) => number.life > 0);
    screenShake *= Math.pow(.015, dt);
    screenFlash *= Math.pow(.035, dt);
    rainOffset = (rainOffset + dt * 190) % 80;
  }

  function updateNearestInteraction() {
    const candidates = [];
    for (const npc of world.npcs) candidates.push(npc);
    if (world.shrine) candidates.push(world.shrine);
    candidates.push(...world.signs, ...world.boards);
    for (const chest of world.chests) if (!openedChests.has(chest.id)) candidates.push(chest);
    candidates.push(...world.portals);
    const fieldGate = currentFieldGateInteraction();
    if (fieldGate) candidates.push(fieldGate);
    nearestInteraction = candidates
      .map((entity) => ({ entity, distance: Core.distance(player, entity) }))
      .filter((item) => {
        if (item.entity.kind === "portal" && MapTransitions.transitionTypeFor(item.entity) === TRANSITION_TYPES.PHYSICAL_DOOR) {
          return MapTransitions.pointInThreshold(item.entity, player);
        }
        return item.distance <= (["gate", "portal", "questBoard"].includes(item.entity.kind)
          ? 82
          : Number(item.entity.interactionRadius) || 58);
      })
      .sort((a, b) => a.distance - b.distance)[0]?.entity || null;
    // Interaction remains available through normal clicks/controls, but the
    // exploration canvas and HUD intentionally stay free of talk/transition
    // prompts. The authored scene art supplies the visual context.
    if (nearestInteraction) interactionText.textContent = interactionLabel(nearestInteraction);
    interactionPrompt.hidden = true;
  }

  function interactionLabel(entity) {
    if (entity.kind === "npc") return `同${entity.name}傾偈`;
    if (entity.kind === "chest") return "打開寶箱";
    if (entity.kind === "shrine") return "喺燈龕休息";
    if (entity.kind === "gate") return isGateOpen() ? "查看封印" : "觸摸封印";
    if (entity.kind === "portal") return entity.interactionMode === "door"
      ? (entity.prompt || `進入${entity.name}`)
      : (entity.prompt || `前往${entity.name}`);
    if (entity.kind === "questBoard") return entity.boardId === "deck-loadout" ? "設定戰技面板" : "查看公會委託";
    return "睇下寫咩";
  }

  function interact() {
    if (mode === "dialogue") return advanceDialogue();
    if (mode !== "playing" || !nearestInteraction) return;
    const entity = nearestInteraction;
    if (entity.kind === "npc") interactNpc(entity);
    else if (entity.kind === "chest") openChest(entity);
    else if (entity.kind === "shrine") restAtShrine();
    else if (entity.kind === "gate") interactGate();
    else if (entity.kind === "portal") usePortal(entity);
    else if (entity.kind === "questBoard") entity.boardId === "deck-loadout" ? openFacility("deck", "deck") : openFacility("guild");
    else if (entity.kind === "sign") startDialogue({ speaker: entity.name, color: "#9a7653", lines: [entity.text] });
  }

  function interactNpc(npc) {
    if (npc.id === "guildmaster-yin" && [0, 4].includes(questStage)) interactGuildMaster(npc);
    else if (npc.id === "clinic-healer-siu-moon") interactHealer(npc);
    else if (npc.id === "store-merchant-gin") interactGeneralStore(npc);
    else if (npc.id === "inn-keeper") interactInn(npc);
    else if (npc.id === "mountain_delivery_recipient") interactDeliveryRecipient(npc);
    else if (["guildmaster-yin", "guild-clerk-po"].includes(npc.id)) openFacility("guild");
    else if (["merchant-gin", "armorer-yuet"].includes(npc.id)) openFacility("shop");
    else startDialogue({ speaker: npc.name, color: npc.color, lines: [npc.chatter || "霧都今晚比平時熱鬧，多得你周圍探索。"] });
  }

  function interactDeliveryRecipient(npc) {
    const commission = activeGuildCommission();
    if (!commission || commission.type !== "delivery") {
      return startDialogue({
        speaker: npc.name,
        color: npc.color,
        lines: [npc.chatter || "山路北面風大，信件交畀我保管就唔會畀霧氣浸壞。"],
      });
    }
    if (guildCommissionState.status === "ready_to_report" && guildCommissionState.deliveryCompleted) {
      return startDialogue({ speaker: npc.name, color: npc.color, lines: ["公會封信我已經收妥喇。你返去拾燈公會回報，就可以領取委託報酬。"] });
    }
    const result = Guild.deliver(guildCommissionState, npc.id);
    if (!result.changed) {
      return startDialogue({ speaker: npc.name, color: npc.color, lines: ["你手上而家冇要交畀我嘅公會信件。"] });
    }
    guildCommissionState = result.state;
    syncGuildCommissionProjection();
    questTrackerMode = "contract";
    sound.crystal();
    showToast(`信件已送達：${commission.title} · 返公會回報`, "good");
    saveImportant(false);
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: ["收到了，封印完整，沿途辛苦你喇。", "信件已送達；返去拾燈公會向阿寶回報，就可以領取技能書信封。"],
    });
  }

  function usePortal(portal) {
    const arrival = MapTransitions.resolveArrival(maps, portal) || { position: null, facing: null };
    const targetPosition = arrival.position;
    if (portal.targetMap === "dungeon" && questStage < 3) {
      return startDialogue({ speaker: "沉燈坑道入口", color: "#ae91ff", lines: ["入口畀北岸封印嘅黑霧纏住。先完成三光開門，先落得到去。"] });
    }
    if (portal.targetMap === "dungeon" && player.level < (portal.minLevel || 5)) {
      return startDialogue({
        speaker: "沉燈坑道入口",
        color: "#ff8b62",
        lines: [`坑道建議 LV.${portal.minLevel || 5}。你而家 LV.${player.level}，入面嘅霧獸會明顯更強。`],
        choices: [
          { label: "照樣落去", action: () => transitionMap(portal.targetMap, targetPosition, arrival.facing) },
          { label: "準備好先", action: () => {} },
        ],
      });
    }
    transitionMap(portal.targetMap, targetPosition, arrival.facing);
  }

  function updateAutomaticPortal() {
    if (mode !== "playing") return false;
    const portal = world.portals.find((candidate) => {
      if (candidate.navigationRegion && typeof world.navigation?.isInRegion === "function") {
        return world.navigation.isInRegion(candidate.navigationRegion, player);
      }
      if (MapTransitions.transitionTypeFor(candidate) === TRANSITION_TYPES.PHYSICAL_DOOR) {
        // Ordinary doors use the authored feet/threshold rectangle. A nearby
        // sprite or label is never sufficient to enter a building.
        return MapTransitions.pointInThreshold(candidate, player);
      }
      if (candidate.trigger && typeof MapTransitions.pointInTrigger === "function") {
        return MapTransitions.pointInTrigger(candidate, player);
      }
      return Core.distance(player, candidate) <= player.radius + (candidate.radius || 20) + 3;
    });
    if (!portal) {
      automaticPortalReady = true;
      return false;
    }
    if (!automaticPortalReady) return false;
    automaticPortalReady = false;
    usePortal(portal);
    return true;
  }

  function transitionMap(targetMapId, targetPosition, targetFacing = null) {
    const target = maps[targetMapId];
    if (!target) return false;
    const destination = targetPosition && Number.isFinite(targetPosition.x) ? targetPosition : target.start;
    if (target.navigation?.authoritative && isBlocked({ x: destination.x, y: destination.y, radius: target.navigation.feetRadiusPx || player.radius }, target, targetMapId)) {
      console.error("Authoritative map transition arrival is not a valid navigation position", { targetMapId, destination });
      return false;
    }
    clearExplorePointerGesture();
    closeBattleHud();
    currentMapId = targetMapId;
    world = target;
    clearExploreMovePath();
    pendingClickInteractionId = null;
    player.x = destination.x;
    player.y = destination.y;
    if (["up", "down", "left", "right"].includes(targetFacing)) player.facing = targetFacing;
    player.knockback = { x: 0, y: 0 };
    player.invulnerable = 1;
    automaticPortalReady = false;
    nearestInteraction = null;
    interactionPrompt.hidden = true;
    particles = [];
    damageNumbers = [];
    encounterGrace = 1.1;
    resetEnemies();
    camera.x = player.x;
    camera.y = player.y;
    camera.zoom = targetZoom();
    showLocation(zoneForPosition(player), true);
    screenFlash = .22;
    sound.tone(330, .14, { to: 540, gain: .025 });
    const dungeonLevels = targetMapId === "dungeon" ? enemies.filter((enemy) => enemy.alive).map((enemy) => enemy.level) : [];
    const dungeonLevelText = dungeonLevels.length ? ` · 霧獸 LV.${Math.min(...dungeonLevels)}–${Math.max(...dungeonLevels)}` : "";
    showToast(targetMapId === "dungeon" ? `沉燈坑道${dungeonLevelText}` : target.name, "good");
    updateHud(true);
    saveImportant(false);
    canvas.focus({ preventScroll: true });
    return true;
  }

  function interactGuildMaster(npc) {
    if (questStage === 0) {
      startDialogue({
        speaker: npc.name,
        color: npc.color,
        actor: "guildmaster",
        lines: [
          "阿巡，你終於嚟喇。北岸盞長明燈，畀黑霧一口咬熄咗。",
          "三粒霧晶散咗落舊林。冇佢哋，燈塔道封印開唔返。",
          "由右邊東門出城，沿山路向東行到底，再轉向北就會去到沉燈坑道。撞到霧獸就會進入戰棋。",
        ],
        onClose: () => {
          questStage = 1;
          showToast("新任務：搵齊三粒霧晶", "good");
          saveImportant(false);
        },
      });
    } else if (questStage === 1) {
      startDialogue({ speaker: npc.name, actor: "guildmaster", color: npc.color, lines: [`仲差 ${3 - crystals.size} 粒。跟住林入面嗰陣紫光，就會搵到。`] });
    } else if (questStage === 2) {
      startDialogue({ speaker: npc.name, actor: "guildmaster", color: npc.color, lines: ["三粒都齊？好。沿城外山路向北行，坑道口嘅封印會認得你手上嘅光。"] });
    } else if (questStage === 3) {
      startDialogue({ speaker: npc.name, actor: "guildmaster", color: npc.color, lines: ["燈塔頂嗰隻吞燈獸仲喺度。見到紅色攻擊格就走開，儲 AP 再反擊。"] });
    } else if (questStage === 4) {
      startDialogue({
        speaker: npc.name,
        color: npc.color,
        lines: [
          "北岸盞燈……着返喇。成個港都睇到。",
          "燈唔係因為唔會熄先叫長明；係每次熄咗，都有人肯再點着。",
          "今晚你唔再係學徒。你係霧都嘅守燈人。",
        ],
        onClose: showVictory,
      });
    } else {
      startDialogue({ speaker: npc.name, actor: "guildmaster", color: npc.color, lines: ["今晚條路仲長。想練刀就再去霧林；港口永遠有盞燈等你返嚟。"] });
    }
  }

  function interactSmith(npc) {
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: ["齋磨同一把舊刀始終有限。我同銀姐搬晒新貨入工房：短刀夠快、重刃破甲，護甲仲會改你行幾多格。"],
      choices: [
        {
          label: "入銀火裝備店",
          action: () => transitionMap("shop", expansionMaps.shop.start),
        },
        { label: "等我準備吓先", action: () => {} },
      ],
    });
  }

  function interactHealer(npc) {
    const maxHp = playerStats().maxHp;
    if (player.hp >= maxHp && player.potions >= 3) {
      return startDialogue({ speaker: npc.name, color: npc.color, lines: ["你面色好過我添。嚟杯熱茶，慢慢行。"] });
    }
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: ["八個燈幣，飲杯回魂茶：補滿生命，再送一支回燈藥。"],
      choices: [
        {
          label: "飲茶休息（8）",
          action: () => {
            if (player.coins < 8) return showToast("差少少燈幣喎。", "danger");
            player.coins -= 8;
            player.hp = maxHp;
            player.potions = Math.min(9, player.potions + 1);
            sound.heal();
            showToast("暖返晒。", "good");
            saveImportant(false);
          },
        },
        { label: "唔使住", action: () => {} },
      ],
    });
  }

  function interactGeneralStore(npc) {
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: ["回燈藥、繩索同曬乾霧草都喺貨架上。材料採購點已經留好，之後可以接入工坊生產。"],
      choices: [
        {
          label: "買回燈藥（12）",
          action: () => {
            if (player.coins < 12) return showToast("燈幣唔夠買藥。", "danger");
            player.coins -= 12;
            player.potions = Math.min(9, player.potions + 1);
            showToast("買到一支回燈藥。", "good");
            saveImportant(false);
          },
        },
        { label: "先睇下貨架", action: () => {} },
      ],
    });
  }

  function interactInn(npc) {
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: ["房間已經整理好。坐低食啲熱湯，或者上樓瞓一晚，總有一盞燈等你返嚟。"],
      choices: [
        {
          label: "住一晚（6）",
          action: () => {
            if (player.coins < 6) return showToast("燈幣唔夠住店。", "danger");
            player.coins -= 6;
            player.hp = playerStats().maxHp;
            showToast("你喺旅店好好休息過。", "good");
            saveImportant(false);
          },
        },
        { label: "再諗下", action: () => {} },
      ],
    });
  }

  function openChest(chest) {
    if (openedChests.has(chest.id)) return;
    if (chest.lockedBy && enemies.some((enemy) => enemy.id === chest.lockedBy && enemy.alive)) {
      showToast("寶箱畀守門者嘅霧鎖住。", "danger");
      return;
    }
    openedChests.add(chest.id);
    player.coins += chest.reward.coins || 0;
    player.potions = Math.min(9, player.potions + (chest.reward.potions || 0));
    const treasureEquipment = {
      "mistguard-boots": "wayfarer_compass",
      "echo-blade": "lantern_sabre",
      "fogweave-coat": "mistweave_cape",
      "warden-lantern": "deep_lantern_core",
    }[chest.reward.itemId];
    let itemText = "";
    if (treasureEquipment && !ownedEquipment.includes(treasureEquipment)) {
      ownedEquipment.push(treasureEquipment);
      itemText = `、${equipmentItem(treasureEquipment)?.name || "稀有裝備"}`;
    }
    spawnBurst(chest.x, chest.y, "#ffc857", 25, 85);
    sound.coin();
    const potionText = chest.reward.potions ? `、${chest.reward.potions} 支回燈藥` : "";
    showToast(`寶箱：${chest.reward.coins || 0} 燈幣${potionText}${itemText}`, "good");
    announce(`打開${chest.name}，獲得 ${chest.reward.coins} 燈幣。`);
    saveImportant(false);
    updateNearestInteraction();
  }

  function restAtShrine() {
    player.hp = playerStats().maxHp;
    checkpoint = { mapId: currentMapId, x: world.shrine.x + (currentMapId === "dungeon" ? 42 : 0), y: world.shrine.y };
    sound.heal();
    spawnBurst(world.shrine.x, world.shrine.y, "#ffc857", 22, 62);
    showToast(currentMapId === "dungeon" ? "回音燈已點亮 · 死亡會喺呢度醒返" : "燈火暖返晒 · 進度已儲存", "good");
    saveImportant(false);
    updateHud();
  }

  function interactGate() {
    if (isGateOpen()) return startDialogue({ speaker: "北岸封印", color: "#52dccb", lines: ["三粒霧晶化成微光，門上只剩一圈暖暖嘅印。"] });
    if (questStage < 2) {
      return startDialogue({ speaker: "北岸封印", color: "#ae91ff", lines: [`三個凹位，得 ${crystals.size} 個亮起。黑霧喺門後面呼吸。`] });
    }
    startDialogue({
      speaker: "北岸封印",
      color: "#52dccb",
      lines: ["林、北、空心——三粒霧晶一齊發光。", "石門慢慢退開。上面傳嚟一聲，好似有嘢餓咗好多年。"],
      onClose: () => {
        questStage = 3;
        const deckUpgrade = grantDeckCapacityMilestone("main:fog-gate-open", { silent: true });
        showToast(`北岸封印已解除 · 擊敗吞燈獸${deckUpgrade.awarded ? ` · DECK 增至 ${deckUpgrade.capacity} 格` : ""}`, "good");
        sound.crystal();
        screenFlash = .5;
        saveImportant(false);
      },
    });
  }

  function startDialogue(config) {
    mode = "dialogue";
    stage.dataset.gameState = mode;
    keys.clear();
    const portraitActors = {
      "小滿": "healer",
      "妍姐": "guildmaster", "阿寶": "clerk", "諾拉": "adventurer", "麗雅": "duelist",
      "銀姐": "merchant", "阿月": "armorer", "莎菲": "tailor", "露娜": "explorer", "洛安": "mountainCourier",
    };
    dialogue = {
      ...config,
      actor: config.actor || portraitActors[config.speaker] || "villager",
      lines: config.lines || ["……"],
      index: 0,
    };
    dialogueChoiceIndex = 0;
    document.getElementById("speakerName").textContent = dialogue.speaker;
    document.getElementById("dialoguePortrait").style.setProperty("--speaker-color", dialogue.color || "#315d66");
    dialoguePanel.hidden = false;
    renderDialogue();
    sound.tone(520, .05, { gain: .014 });
  }

  function syncCanvasBackingSize(canvas) {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return false;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const nextWidth = Math.max(1, Math.round(bounds.width * pixelRatio));
    const nextHeight = Math.max(1, Math.round(bounds.height * pixelRatio));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    return true;
  }

  function drawDialoguePortrait() {
    const portraitActor = dialogue?.actor || "villager";
    dialoguePortraitCanvas.dataset.actor = portraitActor;
    if (!syncCanvasBackingSize(dialoguePortraitCanvas)) return;
    dialoguePortraitCtx.clearRect(0, 0, dialoguePortraitCanvas.width, dialoguePortraitCanvas.height);
    Art.drawPortrait(dialoguePortraitCtx, {
      x: 0,
      y: 0,
      width: dialoguePortraitCanvas.width,
      height: dialoguePortraitCanvas.height,
      actor: portraitActor,
      expression: portraitActor === "smith" ? "determined" : "happy",
      background: dialogue?.color || "#26385d",
      backgroundEnd: "#111a31",
    });
  }

  function drawPlayerHudPortrait() {
    playerHudPortraitCtx.clearRect(0, 0, playerHudPortraitCanvas.width, playerHudPortraitCanvas.height);
    Art.drawPortrait(playerHudPortraitCtx, {
      x: 0,
      y: 0,
      width: playerHudPortraitCanvas.width,
      height: playerHudPortraitCanvas.height,
      actor: "player",
      classId: playerClassId,
      expression: "determined",
      background: "#315d66",
      backgroundEnd: "#111a31",
      frame: false,
      padding: 2,
    });
  }

  function drawClassSelectionPreviews() {
    for (const [canvasId, classId] of [["warriorClassCanvas", "warrior"], ["fighterClassCanvas", "fighter"]]) {
      const preview = document.getElementById(canvasId);
      if (!preview) continue;
      const previewCtx = preview.getContext("2d");
      previewCtx.clearRect(0, 0, preview.width, preview.height);
      const gradient = previewCtx.createRadialGradient(preview.width / 2, preview.height * .55, 10, preview.width / 2, preview.height * .55, preview.width * .55);
      gradient.addColorStop(0, "rgba(82,220,203,.16)");
      gradient.addColorStop(1, "rgba(7,11,22,0)");
      previewCtx.fillStyle = gradient;
      previewCtx.fillRect(0, 0, preview.width, preview.height);
      Art.drawCharacter(previewCtx, {
        actor: "player",
        classId,
        x: preview.width / 2,
        y: preview.height - 12,
        scale: 2.55,
        state: "idle",
        facing: "down",
        phase: elapsed,
        bitmap: true,
      });
    }
  }

  function renderDialogue() {
    document.getElementById("dialogueText").textContent = dialogue.lines[dialogue.index];
    const choices = document.getElementById("dialogueChoices");
    const next = document.getElementById("dialogueNext");
    const atEnd = dialogue.index >= dialogue.lines.length - 1;
    if (atEnd && dialogue.choices?.length) {
      choices.hidden = false;
      next.hidden = true;
      choices.innerHTML = "";
      dialogue.choices.forEach((choice, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `dialogue-choice${index === dialogueChoiceIndex ? " selected" : ""}`;
        button.textContent = `${index + 1}. ${choice.label}`;
        button.addEventListener("click", () => chooseDialogueOption(index));
        choices.appendChild(button);
      });
      choices.children[dialogueChoiceIndex]?.focus({ preventScroll: true });
    } else {
      choices.hidden = true;
      choices.innerHTML = "";
      next.hidden = false;
    }
    drawDialoguePortrait();
  }

  function advanceDialogue() {
    if (!dialogue) return;
    if (dialogue.index < dialogue.lines.length - 1) {
      dialogue.index += 1;
      renderDialogue();
      sound.tone(570, .04, { gain: .012 });
    } else if (!dialogue.choices?.length) closeDialogue();
  }

  function chooseDialogueOption(index) {
    if (!dialogue?.choices?.[index]) return;
    const action = dialogue.choices[index].action;
    closeDialogue(false);
    action?.();
    updateHud(true);
  }

  function closeDialogue(runCallback = true) {
    const callback = dialogue?.onClose;
    dialogue = null;
    dialoguePanel.hidden = true;
    mode = "playing";
    stage.dataset.gameState = mode;
    canvas.focus({ preventScroll: true });
    if (runCallback) callback?.();
    updateHud(true);
  }

  function guildRankInfo() {
    if (guildMarks >= 18) return { name: "金燈領航員", next: null, icon: "✦" };
    if (guildMarks >= 10) return { name: "銀燈巡路者", next: 18, icon: "◇" };
    if (guildMarks >= 4) return { name: "銅燈冒險者", next: 10, icon: "◆" };
    return { name: "見習拾燈人", next: 4, icon: "·" };
  }

  function currentContractOffers() {
    return Guild.listAvailable(guildCommissionState);
  }

  function contractTargetName(target) {
    const blueprint = ExpansionWorld.monsterBlueprint(target);
    if (blueprint) return blueprint.name_zh;
    for (const map of Object.values(maps)) {
      const npc = map.npcs?.find((candidate) => candidate.id === target);
      if (npc) return npc.name;
    }
    return "指定收件人";
  }

  function inventoryItemName(id) {
    const names = { warden_lens: "看守者霧鏡" };
    for (const template of Expansion.DEFAULT_CONTRACT_TEMPLATES) for (const item of template.reward.items) names[item.id] = item.name;
    for (const blueprint of Object.values(ExpansionWorld.MONSTER_BLUEPRINTS)) if (blueprint.drop) names[blueprint.drop.id] = blueprint.drop.name;
    return names[id] || id.replaceAll("_", " ").replaceAll("-", " ");
  }

  function rewardItemText(reward) {
    const items = reward?.items || [];
    return items.length ? items.map((item) => `${item.name} × ${item.quantity}`).join("、") : "公會印記";
  }

  function skillBookRewardText(commission) {
    const star = commission?.reward?.skill_envelope_star || commission?.rewardBookStar || 1;
    return `${"★".repeat(star)} 技能書信封 × 1`;
  }

  function guildDiscountRate() {
    return guildMarks >= 18 ? .15 : guildMarks >= 10 ? .1 : guildMarks >= 4 ? .05 : 0;
  }

  function statText(stats) {
    const labels = { attack: "攻擊", defense: "防禦", maxHp: "生命", speed: "速度", critChance: "暴擊", moveRange: "移動" };
    return Object.entries(stats)
      .filter(([, value]) => value)
      .map(([key, value]) => `${labels[key] || key} ${value > 0 ? "+" : ""}${key === "critChance" ? Math.round(value * 100) + "%" : value}`)
      .join(" · ");
  }

  function setFacilityFooter(message) {
    facilityFooter.innerHTML = `<p>${message}</p><div class="facility-footer-actions"><button class="facility-footer-button" type="button" data-facility-footer-action="return-title">返回標題</button></div>`;
  }

  function renderFacilitySummary() {
    const rank = guildRankInfo();
    const weapon = equipmentItem(equipped.weapon)?.name || "見習燈刃";
    const armor = equipmentItem(equipped.armor)?.name || "旅行者短衣";
    const marks = facilityPanel.querySelector('[data-facility-summary="marks"] strong');
    const rankLabel = facilityPanel.querySelector('[data-facility-summary="rank"] strong');
    const gear = facilityPanel.querySelector('[data-facility-summary="equipped"] strong');
    if (marks) marks.textContent = `${guildMarks} 枚`;
    if (rankLabel) rankLabel.textContent = rank.name;
    if (gear) gear.textContent = `${weapon}／${armor}`;
  }

  function renderGuildFacility() {
    const atGuild = currentMapId === "guild";
    const active = activeGuildCommission();
    const offers = currentContractOffers();
    const activeStatus = guildCommissionState.status === "ready_to_report" ? "待回報" : "進行中";
    const activeAction = active && guildCommissionState.status === "ready_to_report"
      ? `<button class="facility-action-button" type="button" data-facility-action="claim" data-contract-id="${guildCommissionState.cycle}:${active.id}" ${atGuild ? "" : "disabled"}>${atGuild ? "回報並領取信封" : "要親身返公會回報"}</button>`
      : `<button class="facility-action-button" type="button" disabled>完成目標後返公會回報</button>`;
    const abandonAction = active
      ? `<button class="facility-action-button is-quiet" type="button" data-facility-action="abandon" data-contract-id="${guildCommissionState.cycle}:${active.id}">放棄委託</button>`
      : "";
    const objectiveText = (commission) => commission.type === "hunt"
      ? `討伐${contractTargetName(commission.objective.monster_id)}`
      : `將公會信件送給：${contractTargetName(commission.objective.recipient_npc_id)}`;
    const objectiveProgress = (commission, state) => commission.type === "hunt"
      ? `${state.progress} / ${commission.objective.count}`
      : state.deliveryCompleted ? "已送達" : "尚未送達";
    const activeHtml = active ? `
      <article class="facility-feature-card ${guildCommissionState.status === "ready_to_report" ? "is-ready" : ""}">
        <div class="facility-card-heading"><span class="facility-chip">${activeStatus}</span><strong>${"★".repeat(active.star)} ${active.title}</strong></div>
        <p>${active.description}</p>
        <div class="facility-card-meta"><span>推薦等級</span><b>Lv.${active.recommendedLevel}</b></div>
        <div class="facility-card-meta"><span>${objectiveText(active)}</span><b>${objectiveProgress(active, guildCommissionState)}</b></div>
        <div class="contract-progress"><i style="width:${Math.min(100, guildCommissionState.progress / Math.max(1, active.objective.count) * 100)}%"></i></div>
        <div class="facility-card-meta"><span>報酬</span><b>${skillBookRewardText(active)}</b></div>
        <div class="facility-action-row">${activeAction}${abandonAction}</div>
      </article>` : "";
    const offersHtml = active ? "" : offers.map((offer) => `
      <article class="facility-list-card">
        <div class="facility-card-heading"><span class="facility-chip">${"★".repeat(offer.star)}</span><strong>${offer.title}</strong></div>
        <p>${offer.description}</p>
        <div class="facility-card-meta"><span>類型</span><b>${offer.type === "hunt" ? "討伐" : "送信"}</b></div>
        <div class="facility-card-meta"><span>推薦等級</span><b>Lv.${offer.recommendedLevel}</b></div>
        <div class="facility-card-meta"><span>${objectiveText(offer)}</span><b>${offer.type === "hunt" ? `0 / ${offer.objective.count}` : "尚未送達"}</b></div>
        <div class="facility-card-meta"><span>報酬</span><b>${skillBookRewardText(offer)}</b></div>
        <button class="facility-action-button" type="button" data-facility-action="accept" data-offer-id="${offer.id}" ${atGuild ? "" : "disabled"}>${atGuild ? "接受委託" : "要返拾燈公會接受"}</button>
      </article>`).join("");
    facilityContent.innerHTML = `
      <div class="facility-section-heading"><div><small>GUILD COMMISSIONS · V1</small><h3>公會委託板</h3></div><span>${active ? "一份進行中" : "五份固定委託"}</span></div>
      ${!atGuild ? '<div class="facility-note is-warning"><b>公會紀錄副本</b><span>查看可以喺任何地方；接受、送達及回報要親身返拾燈公會或山地收件人。</span></div>' : ""}
      ${activeHtml || `<div class="facility-card-grid">${offersHtml}</div>`}
      <div class="facility-note"><b>公會規矩</b><span>同一時間只接一份；完成目標後必須返公會回報。五份委託均可無限重接。</span></div>`;
    setFacilityFooter(`<span aria-hidden="true">✦</span> 委託獎勵係技能書信封；開封後由 canonical Fighter 技能資料抽取技能書。`);
  }

  function totalOwnedSkillBooks() {
    const state = Skills.normalizeSkillState(skillState);
    return Guild.COMMISSION_STARS.reduce((total, star) => total + (guildCommissionState.envelopes[star] || 0), 0)
      + Skills.BOOK_STARS.reduce((total, star) => total + (state.books[star] || 0), 0)
      + Object.values(state.manualCounts || {}).reduce((total, count) => total + count, 0);
  }

  function updateMenuBadges() {
    const bookCount = totalOwnedSkillBooks();
    inventoryBookBadge.textContent = bookCount > 99 ? "99+" : String(bookCount);
    inventoryBookBadge.hidden = bookCount <= 0;
    inventoryButton.setAttribute("aria-label", bookCount
      ? `打開物品欄（I），有 ${bookCount} 本未開技能書`
      : "打開物品欄（I）");
  }

  function atlasIconHtml(atlas, index, label, extraClass = "") {
    const safeIndex = Math.max(0, Math.min(15, Number(index) || 0));
    const column = safeIndex % 4;
    const row = Math.floor(safeIndex / 4);
    return `<span class="atlas-icon ${atlas}-icon-atlas ${extraClass}" style="--atlas-x:${column * 33.333333}%;--atlas-y:${row * 33.333333}%" role="img" aria-label="${label}"></span>`;
  }

  function materialDescription(id) {
    return ({
      lamp_dust: "公會用嚟修補燈具嘅幼細晶粉。",
      hound_fang: "霧犬留下嘅硬牙，可以磨成護符。",
      bright_spore: "會喺黑暗中發光嘅孢子，藥師十分珍惜。",
      moth_scale: "薄而閃亮嘅晶翅鱗粉，可用作輕裝材料。",
      golem_core: "委託指定嘅石像核心，仍然帶住微弱熱力。",
      "golem-core": "失控燈偶留下嘅動力核心。",
      deep_crystal: "只會喺深層濃霧凝結嘅紫晶。",
      moss_jelly: "柔軟又有生命力嘅青苔凝膠。",
      "moss-jelly": "苔糰子留下嘅青苔啫喱，可作回復藥素材。",
      "mist-wing": "幾乎冇重量嘅翼膜，適合製作敏捷裝備。",
      "crag-tusk": "岩甲小豚嘅短牙，堅硬得似礦石。",
      "hollow-rune": "空殼術士身上剝落嘅古老符片。",
      warden_lens: "深霧看守者嘅稀有霧鏡，映住地城最深處。",
      "warden-lens": "深霧看守者嘅稀有霧鏡，映住地城最深處。",
    })[id] || "冒險途中取得嘅素材，可以留作交換或製作裝備。";
  }

  function renderBagFacility() {
    skillState = Skills.normalizeSkillState(skillState);
    const stats = playerStats();
    const maxHp = stats.maxHp;
    const items = [];
    const equipmentSlotOrder = { weapon: 0, armor: 1, charm: 2 };
    const equipmentSlotNames = { weapon: "武器", armor: "身體", charm: "飾物" };
    for (const item of Expansion.DEFAULT_EQUIPMENT_CATALOG
      .filter((entry) => ownedEquipment.includes(entry.id))
      .sort((left, right) => Number(equipped[right.slot] === right.id) - Number(equipped[left.slot] === left.id)
        || equipmentSlotOrder[left.slot] - equipmentSlotOrder[right.slot]
        || left.requiredLevel - right.requiredLevel
        || left.name.localeCompare(right.name, "zh-HK"))) {
      const isEquipped = equipped[item.slot] === item.id;
      const levelLocked = player.level < item.requiredLevel;
      const classLocked = !equipmentMatchesClass(item);
      items.push({
        id: item.id,
        name: item.name,
        category: `裝備 · ${equipmentSlotNames[item.slot] || item.slot}`,
        quantity: 1,
        description: item.description,
        detail: `${statText(item.stats)} · LV.${item.requiredLevel}`,
        equipment: item,
        categoryKey: "equipment",
        isEquipped,
        disabled: isEquipped || levelLocked || classLocked,
        action: "equip",
        actionLabel: isEquipped ? "裝備中" : classLocked ? "職業不符" : levelLocked ? `LV.${item.requiredLevel} 解鎖` : "撳一下換上",
      });
    }
    if (player.potions > 0) items.push({
      id: "healing_potion", name: "回燈藥", category: "消耗品", quantity: player.potions,
      categoryKey: "consumable",
      description: "回復大約 46% 最大生命；探索同戰鬥都用得到。",
      detail: player.hp >= maxHp ? "目前生命已全滿" : `目前 HP ${Math.ceil(player.hp)} / ${maxHp}`,
      action: "use-potion", actionLabel: player.hp >= maxHp ? "生命已滿" : "使用", disabled: player.hp >= maxHp,
    });
    for (const star of Guild.COMMISSION_STARS) {
      const count = guildCommissionState.envelopes[star] || 0;
      if (!count) continue;
      const pool = Skills.getFighterGuildBookPool(star);
      items.push({
        id: `skill_envelope_${star}`,
        iconId: "skill_book_1",
        name: `${"★".repeat(star)} 技能書信封`,
        category: "公會委託獎勵",
        categoryKey: "skillbook",
        quantity: count,
        description: `開封後從 canonical Fighter 技能資料中抽取同星級技能書（${pool.length} 招）。`,
        detail: "收到技能書後仍須符合 Fighter 前置才能學習",
        action: "open-envelope", actionLabel: "開封", envelopeStar: star,
      });
    }
    for (const star of Skills.BOOK_STARS) {
      const count = skillState.books[star] || 0;
      if (!count) continue;
      const pool = Skills.getSkillsByStar(star, { classId: playerClassId });
      const apBand = Skills.AP_BANDS[star];
      items.push({
        id: `skill_book_${star}`,
        name: `${star === 1 ? "初階" : star === 2 ? "進階" : "奧義"}技能書`,
        category: `${"★".repeat(star)} 技能書`,
        categoryKey: "skillbook",
        quantity: count,
        description: `開封後會抽出 ${pool.length} 本對應職業技能書；唔會直接學識。`,
        detail: `技能消耗範圍 ${apBand.min}–${apBand.max} AP`,
        action: "open-book", actionLabel: "開封", bookStar: star,
      });
    }
    for (const [skillId, count] of Object.entries(skillState.manualCounts || {})) {
      if (!count) continue;
      const skill = Skills.getSkill(skillId);
      if (!skill) continue;
      const classLocked = skill.classId !== playerClassId;
      const learnability = classLocked ? { status: "conditionLocked" } : Skills.skillLearnability(skillState, skill.id);
      items.push({
        id: `manual_${skill.id}`,
        iconId: "skill_book_1",
        name: `技能書：${skill.name}`,
        category: `${skillStars(skill.star)} ${skill.classId === "fighter" ? "格鬥士" : "戰士"}技能書`,
        categoryKey: "skillbook",
        quantity: count,
        description: skill.description,
        detail: `${skillRangeText(skill)} · 速度 ${skill.speedGrade}`,
        action: "use-manual",
        actionLabel: classLocked ? "職業不符" : learnability.status === "missingPrereq" ? "查看前置" : learnability.status === "learned" ? "處理重複書" : "學習",
        disabled: classLocked,
        manualSkillId: skill.id,
      });
    }
    for (const [id, amount] of Object.entries(inventory)
      .filter(([, quantity]) => quantity > 0)
      .sort(([left], [right]) => inventoryItemName(left).localeCompare(inventoryItemName(right), "zh-HK"))) {
      items.push({ id, name: inventoryItemName(id), category: "素材", categoryKey: "material", quantity: amount, description: materialDescription(id), detail: "冒險素材" });
    }
    if (inventoryFixtureCount > 0) {
      const fixtureNames = ["霧晶碎片", "舊銅齒輪", "潮濕苔絲", "微光粉末", "沉燈玻璃", "巡夜羽片"];
      for (let index = 0; index < inventoryFixtureCount; index += 1) {
        items.push({
          id: `fixture_material_${index + 1}`,
          name: `${fixtureNames[index % fixtureNames.length]} ${index + 1}`,
          category: "素材 · 測試",
          categoryKey: "material",
          quantity: 1,
          iconId: 4 + (index % 11),
          description: "只供版面壓力測試使用，不會寫入存檔。",
          detail: "UI fixture",
        });
      }
    }
    const categoryLabels = { all: "全部", equipment: "裝備", consumable: "消耗品", skillbook: "技能書", material: "素材" };
    const visibleItems = items.filter((item) => inventoryCategory === "all" || item.categoryKey === inventoryCategory);
    if (!visibleItems.some((item) => item.id === selectedInventoryItemId)) selectedInventoryItemId = null;
    const selectedItem = visibleItems.find((item) => item.id === selectedInventoryItemId) || null;
    const iconMarkup = (item, extraClass = "") => item.equipment
      ? equipmentIconHtml(item.equipment, extraClass)
      : atlasIconHtml("item", ITEM_ICON_INDEX[item.iconId || item.id] ?? 4, item.name, extraClass);
    const actionMarkup = (item) => {
      if (!item.action) return "";
      const attrs = [
        `data-facility-action="${item.action}"`,
        item.bookStar ? `data-book-star="${item.bookStar}"` : "",
        item.envelopeStar ? `data-envelope-star="${item.envelopeStar}"` : "",
        item.manualSkillId ? `data-skill-id="${item.manualSkillId}"` : "",
        item.equipment ? `data-item-id="${item.id}"` : "",
      ].filter(Boolean).join(" ");
      return `<button class="facility-action-button" type="button" ${attrs} ${item.disabled ? "disabled" : ""}>${item.actionLabel}</button>`;
    };
    const itemCards = visibleItems.map((item) => `<button class="inventory-grid-item ui-slot ${item.equipment ? "inventory-equipment-item" : ""} ${item.isEquipped ? "is-equipped" : ""} ${selectedItem?.id === item.id ? "is-selected" : ""}" type="button" data-item-id="${item.id}" data-facility-action="select-item" aria-pressed="${selectedItem?.id === item.id ? "true" : "false"}" aria-label="選取${item.name}，數量 ${item.quantity}">
      <div class="inventory-item-art">${iconMarkup(item)}<b class="inventory-quantity" aria-label="數量 ${item.quantity}">×${item.quantity}</b>${item.isEquipped ? '<span class="inventory-equipped-mark">已裝備</span>' : ""}</div>
      <div class="inventory-item-copy"><small>${item.category}</small><strong>${item.name}</strong></div>
    </button>`).join("");
    const filters = Object.entries(categoryLabels).map(([key, label]) => `<button class="inventory-filter" type="button" data-facility-action="inventory-filter" data-inventory-category="${key}" aria-selected="${inventoryCategory === key ? "true" : "false"}">${label}</button>`).join("");
    const detail = selectedItem
      ? `<section class="inventory-selected-detail" aria-label="已選物品詳情" aria-live="polite">
          <div class="inventory-item-art">${iconMarkup(selectedItem)}<b class="inventory-quantity" aria-label="數量 ${selectedItem.quantity}">×${selectedItem.quantity}</b></div>
          <div class="inventory-selected-copy"><small>${selectedItem.category}</small><strong>${selectedItem.name}</strong><span>持有數量：${selectedItem.quantity}</span><p>${selectedItem.description}</p><span>${selectedItem.detail}</span><div class="inventory-selected-actions">${actionMarkup(selectedItem)}</div></div>
        </section>`
      : `<section class="inventory-selected-detail inventory-empty-selection" aria-label="已選物品詳情"><strong>選取一件物品查看詳情</strong><small>完整描述與可用動作會喺呢度顯示。</small></section>`;
    const totalQuantity = visibleItems.reduce((total, item) => total + item.quantity, 0);
    facilityContent.innerHTML = `
      <section class="unified-inventory-layout" aria-label="角色裝備與隨身物品">
        <aside class="bag-loadout-panel" aria-label="角色目前裝備">
          <div class="facility-section-heading bag-loadout-heading"><div><small>EQUIPPED</small><h3>阿巡目前裝備</h3></div><span>LV.${player.level}</span></div>
          <div class="paperdoll-board bag-paperdoll-board">
            ${paperdollSlotHtml("head", "頭部", null, "♙")}
            ${paperdollSlotHtml("weapon", playerClassId === "fighter" ? "拳套" : "武器", "weapon", "⚔")}
            ${paperdollSlotHtml("body", "身體", "armor", "♜")}
            <div class="paperdoll-avatar"><canvas id="equipmentPaperdoll" width="180" height="220" aria-hidden="true"></canvas><strong>阿巡</strong><span>${playerClassId === "fighter" ? "格鬥士" : "戰士"} · LV.${player.level}</span></div>
            ${paperdollSlotHtml("charm", "飾物", "charm", "✦")}
            ${paperdollSlotHtml("hands", "手部", null, "◇")}
            ${paperdollSlotHtml("feet", "腳部", null, "▽")}
          </div>
          <dl class="bag-loadout-stats" aria-label="裝備後能力"><div><dt>生命</dt><dd>${stats.maxHp}</dd></div><div><dt>攻擊</dt><dd>${stats.attack}</dd></div><div><dt>防禦</dt><dd>${stats.defence}</dd></div><div><dt>移動</dt><dd>${stats.moveRange} 格</dd></div></dl>
        </aside>
          <section class="bag-items-panel" aria-label="隨身物品">
          <div class="facility-section-heading inventory-heading"><div><small>ALL CARRIED ITEMS</small><h3>隨身物品</h3></div><span>${visibleItems.length} 種 · 合共 ${totalQuantity} 件</span></div>
          <div class="inventory-filter-bar" role="tablist" aria-label="物品分類">${filters}</div>
          ${visibleItems.length ? `<div class="inventory-icon-grid" role="list" aria-label="所有隨身物品">${itemCards}</div>` : `<div class="facility-empty-state"><span aria-hidden="true">◇</span><strong>呢類物品仲係空嘅</strong><small>切換分類或探索、討伐取得更多物品。</small></div>`}
          ${detail}
        </section>
      </section>`;
    drawEquipmentPaperdoll();
    setFacilityFooter(`<span aria-hidden="true">▣</span> 左邊係固定角色裝備區；右邊用緊湊格仔揀物品，再喺詳情區操作。`);
  }

  function equipmentIconHtml(item, extraClass = "") {
    if (Object.hasOwn(FIGHTER_EQUIPMENT_ICON_INDEX, item?.id)) {
      const index = FIGHTER_EQUIPMENT_ICON_INDEX[item.id];
      return `<span class="atlas-icon fighter-equipment-icon-atlas ${extraClass}" style="--atlas-x:${index * 33.333333}%;--atlas-y:0%" role="img" aria-label="${item.name || "拳套"}"></span>`;
    }
    return atlasIconHtml("equipment", EQUIPMENT_ICON_INDEX[item?.id] ?? 0, item?.name || "裝備", extraClass);
  }

  function paperdollSlotHtml(visualSlot, label, equipmentSlot, placeholder) {
    const item = equipmentSlot ? equipmentItem(equipped[equipmentSlot]) : null;
    if (equipmentSlot && !item) return `<article class="paperdoll-slot is-empty" data-paperdoll-slot="${visualSlot}">
      <span class="paperdoll-placeholder" aria-hidden="true">${placeholder}</span><div><small>${label}</small><strong>未裝備</strong><span>已開放，可以裝備對應物品</span></div>
    </article>`;
    if (!item) return `<article class="paperdoll-slot is-empty" data-paperdoll-slot="${visualSlot}">
      <span class="paperdoll-placeholder" aria-hidden="true">${placeholder}</span><div><small>${label}</small><strong>未裝備</strong><span>目前未有呢類裝備</span></div>
    </article>`;
    return `<article class="paperdoll-slot is-filled" data-paperdoll-slot="${visualSlot}">
      ${equipmentIconHtml(item, "paperdoll-slot-icon")}<div><small>${label}</small><strong>${item.name}</strong><span>${statText(item.stats)}</span></div>
    </article>`;
  }

  function drawEquipmentPaperdoll() {
    const doll = document.getElementById("equipmentPaperdoll");
    if (!doll) return;
    const dollCtx = doll.getContext("2d");
    dollCtx.clearRect(0, 0, doll.width, doll.height);
    Art.drawCharacter(dollCtx, { actor: "player", classId: playerClassId, x: doll.width / 2, y: doll.height - 10, scale: 2.45, state: "idle", facing: "down", phase: elapsed, bitmap: true });
  }

  function renderEquipmentFacility() {
    const stats = playerStats();
    const slotOrder = { weapon: 0, armor: 1, charm: 2 };
    const collection = Expansion.DEFAULT_EQUIPMENT_CATALOG
      .filter((item) => ownedEquipment.includes(item.id) && equipmentMatchesClass(item))
      .sort((left, right) => slotOrder[left.slot] - slotOrder[right.slot]
        || Number(equipped[right.slot] === right.id) - Number(equipped[left.slot] === left.id)
        || left.requiredLevel - right.requiredLevel)
      .map((item) => {
        const isEquipped = equipped[item.slot] === item.id;
        const levelLocked = player.level < item.requiredLevel;
        return `<article class="gear-collection-item ${isEquipped ? "is-equipped" : ""} ${levelLocked ? "is-locked" : ""}">
          ${equipmentIconHtml(item, "gear-collection-icon")}
          <div><small>${item.slot === "weapon" ? "武器" : item.slot === "armor" ? "身體" : "飾物"} · LV.${item.requiredLevel}</small><strong>${item.name}</strong><p>${item.description}</p><span>${statText(item.stats)}</span></div>
          <button class="facility-action-button${isEquipped ? " is-quiet" : ""}" type="button" data-facility-action="equip" data-item-id="${item.id}" ${isEquipped || levelLocked ? "disabled" : ""}>${isEquipped ? "裝備中" : levelLocked ? `LV.${item.requiredLevel} 解鎖` : "換上"}</button>
        </article>`;
      }).join("");
    facilityContent.innerHTML = `
      <div class="facility-section-heading equipment-overview-heading"><div><small>PAPER DOLL</small><h3>目前裝備</h3></div><span>LV.${player.level} 阿巡</span></div>
      <section class="paperdoll-layout" aria-label="角色裝備槽位">
        <div class="paperdoll-board">
          ${paperdollSlotHtml("head", "頭部", null, "♙")}
          ${paperdollSlotHtml("weapon", "武器", "weapon", "⚔")}
          ${paperdollSlotHtml("body", "身體", "armor", "♜")}
          <div class="paperdoll-avatar"><canvas id="equipmentPaperdoll" width="180" height="220" aria-hidden="true"></canvas><strong>阿巡</strong><span>巡燈人 · LV.${player.level}</span></div>
          ${paperdollSlotHtml("charm", "飾物", "charm", "✦")}
          ${paperdollSlotHtml("hands", "手部", null, "◇")}
          ${paperdollSlotHtml("feet", "腳部", null, "▽")}
        </div>
        <aside class="paperdoll-stats"><small>CURRENT STATS</small><strong>目前能力</strong><dl><div><dt>生命</dt><dd>${stats.maxHp}</dd></div><div><dt>攻擊</dt><dd>${stats.attack}</dd></div><div><dt>防禦</dt><dd>${stats.defence}</dd></div><div><dt>速度</dt><dd>${Math.round(stats.speed)}</dd></div><div><dt>移動</dt><dd>${stats.moveRange}</dd></div></dl></aside>
      </section>
      <div class="facility-section-heading skill-list-heading"><div><small>OWNED GEAR</small><h3>已擁有裝備</h3></div><span>${ownedEquipment.length} 件</span></div>
      <div class="gear-collection-grid">${collection || '<div class="facility-empty-state"><strong>未有裝備</strong></div>'}</div>
      <div class="facility-note"><b>未開放槽位</b><span>頭部、手部同腳部會喺往後冒險版本加入；目前唔會計入角色能力。</span></div>`;
    drawEquipmentPaperdoll();
    setFacilityFooter(`<span aria-hidden="true">⚔</span> 換裝會即時更新角色能力並自動保存。`);
  }

  function renderShopFacility() {
    const slotNames = { weapon: "武器", armor: "防具", charm: "飾物" };
    const atShop = currentMapId === "shop";
    const discountRate = guildDiscountRate();
    const sections = Expansion.EQUIPMENT_SLOTS.map((slot) => {
      const cards = Expansion.DEFAULT_EQUIPMENT_CATALOG.filter((item) => item.slot === slot && equipmentMatchesClass(item)).map((item) => {
        const owned = ownedEquipment.includes(item.id);
        const isEquipped = equipped[slot] === item.id;
        const levelLocked = player.level < item.requiredLevel;
        const shopCost = Math.max(0, Math.floor(item.cost * (1 - discountRate)));
        let label = isEquipped ? "裝備中" : owned ? "裝備" : levelLocked ? `LV.${item.requiredLevel} 解鎖` : !item.purchasable ? "寶箱限定" : `${shopCost} 燈幣購買${discountRate ? `（-${Math.round(discountRate * 100)}%）` : ""}`;
        const action = owned ? "equip" : "buy";
        const disabled = isEquipped || levelLocked || (!owned && (!item.purchasable || !atShop));
        return `<article class="equipment-card ${isEquipped ? "is-equipped" : ""}">
          ${equipmentIconHtml(item, "equipment-card-atlas-icon")}
          <div class="equipment-copy"><div class="facility-card-heading"><span class="facility-chip">LV.${item.requiredLevel}</span><strong>${item.name}</strong></div><p>${item.description}</p><small>${statText(item.stats)}</small></div>
          <button class="facility-action-button" type="button" data-facility-action="${action}" data-item-id="${item.id}" ${disabled ? "disabled" : ""}>${label}</button>
        </article>`;
      }).join("");
      return `<section class="equipment-section"><div class="facility-section-heading"><div><small>${slot.toUpperCase()}</small><h3>${slotNames[slot]}</h3></div></div><div class="equipment-grid">${cards}</div></section>`;
    }).join("");
    const bag = Object.entries(inventory).filter(([, amount]) => amount > 0).map(([id, amount]) => `<span>${inventoryItemName(id)} × ${amount}</span>`).join("") || "<span>素材袋仲係空嘅</span>";
    facilityContent.innerHTML = `${!atShop ? '<div class="facility-note is-warning"><b>只供試睇</b><span>購買要親身去霧都「銀火裝備店」；已擁有裝備可以隨時換。</span></div>' : ""}${sections}<div class="facility-note"><b>素材袋</b><span class="inventory-row">${bag}</span></div>`;
    setFacilityFooter(`<span aria-hidden="true">⚒</span> ${player.coins} 燈幣 · ${discountRate ? `${guildRankInfo().name}折扣 ${Math.round(discountRate * 100)}% · ` : ""}輕裝快、重裝硬。`);
  }

  function skillStars(star) {
    return "★".repeat(star) + "☆".repeat(3 - star);
  }

  function skillIcon(skill) {
    if (skill.tags.includes("heal")) return "♥";
    if (skill.tags.includes("defense")) return "♢";
    if (skill.tags.includes("mobility")) return "✣";
    if (skill.tags.includes("magic")) return "✦";
    if (skill.tags.includes("ranged")) return "➶";
    return skill.tags.includes("passive") ? "✦" : "◆";
  }

  function skillBadgeMarkup(skill) {
    const passive = skill.tags.includes("passive");
    const label = passive ? "PSV" : "CMD";
    const source = passive ? "assets/ui/ui-badge-psv-v1.png" : "assets/ui/ui-badge-cmd-v1.png";
    return `<span class="skill-kind-badge ${passive ? "is-psv" : "is-cmd"}"><img src="${source}" alt="${label}" /><b>${label}</b></span>`;
  }

  function skillRangeText(skill) {
    if (skill.tags.includes("passive")) return "PSV · 自動生效";
    const range = Array.isArray(skill.rangeCellsRelative)
      ? `${skill.rangeCellsRelative.length} 格`
      : skill.range?.min == null || skill.range?.max == null
        ? "未確定"
        : skill.range.min === skill.range.max ? `${skill.range.max}` : `${skill.range.min}–${skill.range.max}`;
    const shapes = { single: "單體", self: "自身", line: "直線", cone: "扇形", cross: "十字", radius: "範圍", relative_cells: "範圍", line_to_target: "直線", impact_area: "爆發範圍" };
    return `${skill.apCost} AP · ${shapes[skill.area.shape] || skill.area.shape} · 射程 ${range}`;
  }

  function skillTypeText(skill) {
    if (skill.tags.includes("passive")) return "PSV 被動";
    if (skill.actionKind === "cleanse") return "CMD · 淨化";
    if (skill.dealsDamage && skill.deliveryMode === "linear") return "CMD · 線性攻擊";
    if (skill.dealsDamage && skill.deliveryMode === "arc") return "CMD · 弧線攻擊";
    if (skill.dealsDamage) return "CMD · 無路線效果";
    return "CMD · 輔助／控制";
  }

  function skillDamageText(skill) {
    if (skill.damage?.model?.type === "set_remaining_hp_fraction") return "特殊：目標剩餘生命比例";
    if (skill.damage?.model?.type === "set_remaining_hp_value") return "特殊：目標剩餘生命固定值";
    if (!skill.dealsDamage) return "無直接傷害";
    const multiplier = Skills.calculateSkillDamageMultiplier(skill);
    const utility = Number(skill.damage?.utility_multiplier);
    return `${multiplier.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}× 總傷害${utility < 1 ? ` · 輔助修正 ${utility}×` : ""}`;
  }

  function skillHeightText(skill) {
    const rule = skill.heightDifference;
    if (!rule || rule.status === "not_applicable") return "不適用";
    const value = (part) => part === "unlimited" ? "∞" : part == null ? "?" : part;
    return `上 ${value(rule.up)} · 下 ${value(rule.down)}${rule.status === "uncertain" ? "（來源未確定）" : ""}`;
  }

  function skillRangePatternMarkup(skill) {
    const cells = Array.isArray(skill.rangeCellsRelative) ? skill.rangeCellsRelative : [];
    if (!cells.length) return `<div class="skill-range-pattern-empty">${skill.tags.includes("passive") ? "被動技能，無可選目標格" : "此技能沒有可視化的相對射程"}</div>`;
    const lateral = cells.map((cell) => Number(cell[0]) || 0);
    const depth = cells.map((cell) => Number(cell[1]) || 0);
    const minL = Math.min(0, ...lateral);
    const maxL = Math.max(0, ...lateral);
    const minD = Math.min(0, ...depth);
    const maxD = Math.max(0, ...depth);
    const selected = new Set(cells.map((cell) => `${cell[0]},${cell[1]}`));
    const rows = [];
    for (let currentDepth = maxD; currentDepth >= minD; currentDepth -= 1) {
      const row = [];
      for (let currentLateral = minL; currentLateral <= maxL; currentLateral += 1) {
        const key = `${currentLateral},${currentDepth}`;
        const origin = currentLateral === 0 && currentDepth === 0;
        row.push(`<span class="skill-range-cell ${origin ? "is-origin" : selected.has(key) ? "is-selectable" : "is-empty"}" title="${origin ? "施術者" : selected.has(key) ? `相對位置 ${key}` : "不可選"}">${origin ? "↑" : selected.has(key) ? "◆" : "·"}</span>`);
      }
      rows.push(`<div class="skill-range-pattern-row">${row.join("")}</div>`);
    }
    return `<div class="skill-range-pattern" aria-label="${skill.name}可選範圍"><small>面向基準：↑施術者 · ◆可選</small>${rows.join("")}</div>`;
  }

  function renderStatusFacility() {
    const stats = playerStats();
    const className = playerClassId === "fighter" ? "格鬥士" : "戰士";
    const hpPercent = Core.clamp((player.hp / stats.maxHp) * 100, 0, 100);
    const xpNeeded = Core.xpRequired(player.level);
    const xpPercent = Core.clamp((player.xp / xpNeeded) * 100, 0, 100);
    facilityContent.innerHTML = `
      <div class="facility-section-heading"><div><small>STATUS</small><h3>阿巡 · ${className}</h3></div><span>LV.${player.level}</span></div>
      <section class="status-layout">
        <div class="status-character-card"><canvas id="statusCharacterCanvas" width="240" height="300" aria-hidden="true"></canvas><strong>阿巡</strong><span>${className} · ${equippedWeaponName()}</span><div class="status-level-line"><b>LV.${player.level}</b><span>${player.xp} / ${xpNeeded} XP</span></div><div class="status-progress xp-progress" aria-label="經驗值 ${player.xp} / ${xpNeeded}"><i style="width:${xpPercent}%"></i></div></div>
        <dl class="status-stat-grid">
          <div class="is-hp"><dt>生命 HP</dt><dd>${Math.ceil(player.hp)} / ${stats.maxHp}</dd><span class="status-progress"><i style="width:${hpPercent}%"></i></span></div>
          <div><dt>攻擊</dt><dd>${stats.attack}</dd></div>
          <div><dt>防禦</dt><dd>${stats.defence}</dd></div>
          <div><dt>戰棋移動</dt><dd>${stats.moveRange} 格</dd></div>
          <div><dt>DECK</dt><dd>${skillState.equippedSkillIds.length} / ${skillState.deckCapacity}</dd></div>
        </dl>
      </section>`;
    const statusCanvas = document.getElementById("statusCharacterCanvas");
    if (statusCanvas) Art.drawCharacter(statusCanvas.getContext("2d"), { actor: "player", classId: playerClassId, x: statusCanvas.width / 2, y: statusCanvas.height - 12, scale: 3.15, state: "idle", facing: "down", phase: elapsed });
    setFacilityFooter(`<span aria-hidden="true">◎</span> 撳左上角角色卡可隨時查看完整能力。`);
  }

  function skillTreeDepth(skill, cache = new Map()) {
    if (cache.has(skill.id)) return cache.get(skill.id);
    const depth = skill.prerequisites.length
      ? 1 + Math.max(...skill.prerequisites.map((id) => skillTreeDepth(Skills.getSkill(id), cache)))
      : 0;
    cache.set(skill.id, depth);
    return depth;
  }

  function buildSkillTreeLayout(classSkills) {
    const skills = [...classSkills];
    const skillById = new Map(skills.map((skill) => [skill.id, skill]));
    const originalOrder = new Map(skills.map((skill, index) => [skill.id, index]));
    const successors = new Map(skills.map((skill) => [skill.id, []]));
    const depthCache = new Map();
    const dependencyDepth = new Map(skills.map((skill) => [skill.id, skillTreeDepth(skill, depthCache)]));
    const authoredColumns = skills.some((skill) => Number.isFinite(skill.treeColumn));
    const visualDepth = (skill) => authoredColumns && Number.isInteger(skill.treeRow)
      ? skill.treeRow
      : dependencyDepth.get(skill.id) || 0;
    const maxDepth = Math.max(0, ...skills.map(visualDepth));
    const maxColumn = authoredColumns ? Math.max(0, ...skills.map((skill) => Number(skill.treeColumn) || 0)) : null;
    const tiers = Array.from({ length: maxDepth + 1 }, () => []);

    skills.forEach((skill) => {
      tiers[visualDepth(skill)].push(skill);
      skill.prerequisites.forEach((prerequisiteId) => {
        if (successors.has(prerequisiteId)) successors.get(prerequisiteId).push(skill.id);
      });
    });

    const normalizedRanks = () => {
      const ranks = new Map();
      tiers.forEach((tier) => tier.forEach((skill, index) => {
        ranks.set(skill.id, tier.length === 1 ? 0.5 : index / (tier.length - 1));
      }));
      return ranks;
    };
    const reorderTier = (tier, neighborIds, ranks) => {
      const previousOrder = new Map(tier.map((skill, index) => [skill.id, index]));
      tier.sort((left, right) => {
        const desiredRank = (skill) => {
          const neighbors = neighborIds(skill).filter((id) => ranks.has(id));
          if (!neighbors.length) return ranks.get(skill.id) ?? 0.5;
          return neighbors.reduce((total, id) => total + ranks.get(id), 0) / neighbors.length;
        };
        return desiredRank(left) - desiredRank(right)
          || previousOrder.get(left.id) - previousOrder.get(right.id)
          || originalOrder.get(left.id) - originalOrder.get(right.id);
      });
    };

    if (authoredColumns) {
      tiers.forEach((tier) => tier.sort((left, right) => Number(left.treeColumn) - Number(right.treeColumn)
        || Number(left.treeRow) - Number(right.treeRow)
        || originalOrder.get(left.id) - originalOrder.get(right.id)));
    } else {
      // Repeated parent/child sweeps produce a deterministic layered DAG with far
      // fewer crossing lines than catalog order, while prerequisites still decide
      // every vertical position.
      for (let pass = 0; pass < 4; pass += 1) {
        for (let depth = 1; depth <= maxDepth; depth += 1) {
          reorderTier(tiers[depth], (skill) => skill.prerequisites, normalizedRanks());
        }
        for (let depth = maxDepth - 1; depth >= 0; depth -= 1) {
          reorderTier(tiers[depth], (skill) => successors.get(skill.id) || [], normalizedRanks());
        }
      }
    }

    const positions = new Map();
    tiers.forEach((tier, depth) => {
      const columnGroups = new Map();
      if (authoredColumns) tier.forEach((skill) => {
        const column = Number(skill.treeColumn) || 0;
        if (!columnGroups.has(column)) columnGroups.set(column, []);
        columnGroups.get(column).push(skill);
      });
      tier.forEach((skill, index) => {
        let x = tier.length === 1 ? 500 : 100 + (800 * index) / (tier.length - 1);
        if (authoredColumns) {
          const column = Number(skill.treeColumn) || 0;
          const siblings = columnGroups.get(column);
          const siblingIndex = siblings.indexOf(skill);
          const baseX = maxColumn > 0 ? 55 + (890 * column) / maxColumn : 500;
          x = Math.max(38, Math.min(962, baseX + (siblingIndex - (siblings.length - 1) / 2) * 72));
        }
        positions.set(skill.id, { depth, dependencyDepth: dependencyDepth.get(skill.id) || 0, x });
      });
    });
    const edges = skills.flatMap((skill) => skill.prerequisites
      .filter((prerequisiteId) => skillById.has(prerequisiteId))
      .map((prerequisiteId) => ({ from: prerequisiteId, to: skill.id })));
    return { tiers, positions, edges, maxDepth, maxColumn, authoredColumns };
  }

  function skillTreeStateLabel(status, active, manualCount) {
    if (active) return "DECK 使用中";
    if (status === "learned") return manualCount ? `已學會 · 重複書 ×${manualCount}` : "已學會";
    if (status === "canLearn") return manualCount ? "可立即學習" : "可學習 · 欠技能書";
    if (status === "conditionLocked") return "條件不足";
    return "前置未解鎖";
  }

  function renderSkillsFacility() {
    skillState = Skills.normalizeSkillState(skillState, { classId: playerClassId });
    const equipped = new Set(skillState.equippedSkillIds.map((id) => Skills.canonicalSkillId(id)));
    const classSkills = Skills.getSkillsByClass(playerClassId);
    const layout = buildSkillTreeLayout(classSkills);
    const treeNodeTop = (depth) => 28 + depth * 78;
    const treeNodeHeight = 42;
    const treeHeight = treeNodeTop(layout.maxDepth) + treeNodeHeight + 28;
    const treeMinWidth = layout.authoredColumns ? Math.max(58, (layout.maxColumn + 1) * 6) : 50;
    const states = new Map(classSkills.map((skill) => [skill.id, Skills.skillLearnability(skillState, skill.id)]));
    const tierGuides = layout.authoredColumns ? "" : layout.tiers.map((tier, depth) => `<div class="skill-tree-column" data-depth="${depth}" style="--tree-tier-y:${treeNodeTop(depth) + treeNodeHeight / 2}px" aria-hidden="true"><span>${depth === 0 ? "起點" : `第 ${depth} 階`}</span></div>`).join("");
    const links = layout.edges.map(({ from, to }) => {
      const parent = layout.positions.get(from);
      const child = layout.positions.get(to);
      const childState = states.get(to)?.status || "missingPrereq";
      const linkState = childState === "learned" && states.get(from)?.status === "learned"
        ? "learned"
        : childState === "canLearn" && states.get(from)?.status === "learned" ? "canLearn" : "locked";
      const startY = treeNodeTop(parent.depth) + treeNodeHeight;
      const endY = treeNodeTop(child.depth);
      const middleY = endY - 18;
      return `<path class="skill-tree-link is-${linkState}" data-from="${from}" data-to="${to}" d="M ${parent.x.toFixed(2)} ${startY} V ${middleY} H ${child.x.toFixed(2)} V ${endY}" />`;
    }).join("");
    const nodes = classSkills.map((skill) => {
      const learnability = states.get(skill.id);
      const manualCount = skillState.manualCounts?.[skill.id] || 0;
      const active = equipped.has(Skills.canonicalSkillId(skill.id));
      const stateLabel = skillTreeStateLabel(learnability.status, active, manualCount);
      const position = layout.positions.get(skill.id);
      return `<article class="skill-tree-node is-${learnability.status} ${active ? "is-equipped" : ""} ${manualCount ? "has-manual" : ""}" role="treeitem" aria-level="${position.depth + 1}" data-tree-state="${learnability.status}" data-tree-depth="${position.depth}" data-tree-x="${position.x.toFixed(2)}" style="--tree-x:${(position.x / 10).toFixed(3)}%;--tree-y:${treeNodeTop(position.depth)}px">
        <button class="skill-tree-node-trigger" type="button" data-facility-action="skill-detail" data-skill-id="${skill.id}" aria-label="${skill.name}，${stateLabel}" title="查看「${skill.name}」詳細資料"><strong>${skill.name}</strong></button>
      </article>`;
    }).join("");
    facilityContent.innerHTML = `
      <div class="facility-section-heading"><div><small>SKILL TREE CONTROLS</small><h3>學習狀態</h3></div><span>已學 ${skillState.unlockedSkillIds.length} 招 · 技能書 ${Object.values(skillState.manualCounts || {}).reduce((sum, count) => sum + count, 0)} 本</span></div>
      <div class="skill-tree-legend"><span class="is-learned"><i>技</i> 已學會</span><span class="is-ready"><i>★</i> 可學習</span><span class="is-locked"><i>?</i> 尚未解鎖</span><span class="is-equipped"><i>裝</i> DECK 使用中</span><span><i>按</i> 撳招名睇資料</span></div>
      <div class="skill-tree-scroll ui-scroll" tabindex="0" aria-label="技能樹，可橫向捲動查看所有分支">
        <div class="skill-tree-board" role="tree" aria-label="${playerClassId === "fighter" ? "格鬥士" : "戰士"}向下發展技能樹" style="--tree-height:${treeHeight}px;--tree-min-width:${treeMinWidth}rem">
          <svg class="skill-tree-links" viewBox="0 0 1000 ${treeHeight}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${links}</svg>
          ${tierGuides}${nodes}
        </div>
      </div>`;
    setFacilityFooter(`<span aria-hidden="true">✧</span> 技能樹只管理學習；要去城門「戰技面板台」先可以裝入 DECK。`);
  }

  function skillEffectSummary(skill) {
    if (skill.tags.includes("passive")) return "習得後持續生效";
    const labels = {
      damage: (effect) => `${Math.max(1, Math.floor(effect.hits || 1))} 段攻擊`,
      heal: () => "回復生命",
      guard: (effect) => `減傷 ${Math.round((effect.amount || 0) * 100)}%`,
      evasion: (effect) => `提升迴避 ${Math.round((effect.amount || 0) * 100)}%`,
      knockback: (effect) => `擊退 ${effect.amount || 1} 格`,
      knockdown: () => "高機率跌倒",
      paralysis: () => "麻痺",
      poison: () => "中毒（來源標記未完全確定）",
      self_poison: () => "自身中毒",
      feint: () => "對防禦架式有效",
      action_interference: () => "妨礙行動",
      blind: () => "黑暗",
      stealth: () => "隱身",
      counter: () => "反擊架式",
      projectile_counter: () => "投射反擊",
      cleanse: (effect) => `解除 ${(effect.statuses || []).join("／")}`,
      halve_hp: () => "特殊：生命減半",
      set_hp: () => "特殊：生命降至 1",
    };
    const parts = [];
    for (const effect of skill.effects) {
      const label = labels[effect.type];
      if (label) parts.push(label(effect));
    }
    return parts.join(" · ") || "特殊效果";
  }

  function openSkillDetail(skillId, returnTarget = null) {
    const skill = Skills.getSkill(skillId);
    if (!skill || skill.classId !== playerClassId) return;
    pendingSkillDetailId = skill.id;
    skillDetailReturnTarget = returnTarget instanceof HTMLElement ? returnTarget : null;
    const learnability = Skills.skillLearnability(skillState, skill.id);
    const manualCount = skillState.manualCounts?.[skill.id] || 0;
    const active = skillState.equippedSkillIds.some((id) => Skills.canonicalSkillId(id) === Skills.canonicalSkillId(skill.id));
    const missingNames = (learnability.missingPrerequisites || []).map((id) => Skills.getSkill(id)?.name || id);
    const stateLabel = skillTreeStateLabel(learnability.status, active, manualCount);
    document.getElementById("skillDetailTitle").textContent = skill.name;
    document.getElementById("skillDetailDescription").textContent = skill.description;
    document.getElementById("skillDetailStats").innerHTML = `
      <div class="ui-detail-row"><dt>類型／系別</dt><dd>${skillTypeText(skill)} · ${skill.treeGroup || "戰鬥技能"}</dd></div>
      <div class="ui-detail-row"><dt>消耗 AP</dt><dd>${skill.tags.includes("passive") ? "PSV" : `${skill.apCost} AP`}</dd></div>
      <div class="ui-detail-row"><dt>速度</dt><dd>${skill.tags.includes("passive") ? "自動" : skill.speedGrade}</dd></div>
      <div class="ui-detail-row"><dt>中斷／耐久</dt><dd>${skill.interrupt ?? "—"} ／ ${skill.durability ?? "—"}</dd></div>
      <div class="ui-detail-row"><dt>總傷害</dt><dd>${skillDamageText(skill)}</dd></div>
      <div class="ui-detail-row"><dt>Hit 數／判定</dt><dd>${skill.hitResolution?.hit_count || 0} · ${skill.hitResolution?.hit_judgement_mode || "—"}</dd></div>
      <div class="ui-detail-row"><dt>可選範圍</dt><dd>${skillRangeText(skill)}</dd></div>
      <div class="ui-detail-row"><dt>高低差</dt><dd>${skillHeightText(skill)}</dd></div>
      <div class="ui-detail-row"><dt>效果</dt><dd>${skillEffectSummary(skill)}</dd></div>
      <div class="ui-detail-row"><dt>前置</dt><dd>${skill.prerequisites.length ? skill.prerequisites.map((id) => Skills.getSkill(id)?.name || id).join(" ＋ ") : "無"}</dd></div>
      <div class="ui-detail-row"><dt>狀態</dt><dd>${stateLabel}</dd></div>`;
    const detailPattern = document.getElementById("skillDetailRangePattern");
    if (detailPattern) detailPattern.innerHTML = skillRangePatternMarkup(skill);
    const learnButton = document.getElementById("skillDetailLearnButton");
    learnButton.hidden = manualCount < 1;
    learnButton.disabled = learnability.status === "missingPrereq" || learnability.status === "conditionLocked";
    learnButton.textContent = learnability.status === "learned"
      ? `處理重複技能書 ×${manualCount}`
      : learnability.status === "missingPrereq"
        ? `先學：${missingNames.join("、")}`
        : `學習 ×${manualCount}`;
    skillDetailPanel.hidden = false;
    (learnButton.hidden || learnButton.disabled ? document.getElementById("skillDetailDismissButton") : learnButton).focus({ preventScroll: true });
  }

  function closeSkillDetail(restoreFocus = true) {
    pendingSkillDetailId = null;
    skillDetailPanel.hidden = true;
    if (restoreFocus && skillDetailReturnTarget?.isConnected) skillDetailReturnTarget.focus({ preventScroll: true });
    else if (restoreFocus) facilityContent.focus({ preventScroll: true });
    skillDetailReturnTarget = null;
  }

  function learnFromSkillDetail() {
    if (!pendingSkillDetailId) return;
    const skillId = pendingSkillDetailId;
    closeSkillDetail(false);
    openSkillManualConfirm(skillId);
  }

  function renderDeckFacility() {
    skillState = Skills.normalizeSkillState(skillState, { classId: playerClassId });
    const canEdit = facilityContext === "deck" && currentMapId === "world";
    const equipped = new Set(skillState.equippedSkillIds);
    const slots = skillState.deckSlots.map((skillId, index) => {
      const skill = skillId ? Skills.getSkill(skillId) : null;
      return `<article class="deck-slot ${skill ? "is-filled" : "is-empty"}"><span class="deck-slot-number">${index + 1}</span>${skill
        ? `<div class="deck-slot-copy"><div class="deck-skill-title">${skillBadgeMarkup(skill)}<strong>${skill.name}</strong></div><small>目前已裝設</small></div>`
        : `<div class="deck-slot-empty"><strong>沒有技能</strong><small>${canEdit ? "喺戰技面板台選擇技能" : "尚未裝設技能"}</small></div>`}</article>`;
    }).join("");
    const management = canEdit ? (() => {
      const learnedSkills = Skills.getSkillsByClass(playerClassId).filter((skill) => skillState.unlockedSkillIds.some((id) => Skills.canonicalSkillId(id) === skill.id) && !skill.tags.includes("passive"));
      const available = learnedSkills.filter((skill) => !equipped.has(skill.id)).map((skill) => `<article class="deck-skill-choice"><div><div class="deck-skill-title">${skillBadgeMarkup(skill)}<strong>${skill.name}</strong></div><small>可裝入 DECK</small></div><button class="facility-action-button" type="button" data-facility-action="equip-skill" data-skill-id="${skill.id}" ${skillState.equippedSkillIds.length >= skillState.deckCapacity ? "disabled" : ""}>裝入</button></article>`).join("");
      return `<section class="deck-management-column"><div class="facility-section-heading skill-list-heading"><div><small>LEARNED SKILLS</small><h3>已學技能</h3></div><span>可裝入 ${skillState.deckCapacity} 格</span></div><div class="deck-skill-list">${available || '<div class="facility-empty-state"><strong>冇其他可裝技能</strong><small>先喺技能樹使用技能書。</small></div>'}</div></section>`;
    })() : "";
    const currentDeck = `<section class="deck-current-column"><div class="facility-section-heading"><div><small>DECK LOADOUT</small><h3>${canEdit ? "目前戰技面板" : "目前戰技面板"}</h3></div><span>${skillState.equippedSkillIds.length} / ${skillState.deckCapacity} 格</span></div><div class="deck-slot-list">${slots}</div></section>`;
    facilityContent.innerHTML = canEdit
      ? `<div class="deck-view-shell is-editable"><div class="deck-manage-layout">${management}${currentDeck}</div></div>`
      : `<div class="deck-view-shell is-readonly">${currentDeck}</div>`;
    setFacilityFooter(`<span aria-hidden="true">▤</span> ${canEdit ? "戰技面板台可管理出戰技能；戰鬥只會使用目前 DECK。" : "唯讀查看目前出戰技能；要更換配置先去舊港城門戰技面板台。"}`);
  }

  function openGuildSkillBook(star) {
    const result = Skills.openOwnedSkillBook(star, { seed: "mist-harbour-guild-skills", serial: skillState.drawSerial }, skillState);
    if (!result.ok) return showToast("你冇呢一星級嘅技能書。", "danger");
    skillState = result.state;
    sound.crystal();
    showToast(`抽到 ${"★".repeat(result.skill.star)}「${result.skill.name}」技能書，已放入物品欄。`, "good");
    renderFacility();
    saveImportant(false);
  }

  function openSkillManualConfirm(skillId) {
    skillState = Skills.normalizeSkillState(skillState, { classId: playerClassId });
    const skill = Skills.getSkill(skillId);
    if (!skill || !(skillState.manualCounts?.[skill.id] > 0)) return showToast("物品欄搵唔到呢本技能書。", "danger");
    pendingManualSkillId = skill.id;
    const learnability = Skills.skillLearnability(skillState, skill.id);
    const missingNames = (learnability.missingPrerequisites || []).map((id) => Skills.getSkill(id)?.name || id);
    document.getElementById("skillBookConfirmTitle").textContent = `技能書：${skill.name}`;
    document.getElementById("skillBookConfirmDescription").textContent = skill.description;
    document.getElementById("skillBookConfirmStats").innerHTML = `
      <div><dt>攻擊範圍／射程</dt><dd>${skillRangeText(skill)}</dd></div>
      <div><dt>AP</dt><dd>${skill.apCost}</dd></div>
      <div><dt>速度</dt><dd>${skill.speedGrade}</dd></div>
      <div><dt>前置</dt><dd>${skill.prerequisites.length ? skill.prerequisites.map((id) => Skills.getSkill(id)?.name || id).join(" → ") : "無"}</dd></div>`;
    const learnButton = document.getElementById("skillBookLearnButton");
    learnButton.disabled = learnability.status === "missingPrereq" || learnability.status === "conditionLocked";
    learnButton.textContent = learnability.status === "learned"
      ? `轉換成 ${Skills.DUPLICATE_SHARDS[skill.star]} 精通碎片`
      : learnability.status === "missingPrereq"
        ? `先學：${missingNames.join("、")}`
        : "確認學習";
    skillBookConfirmPanel.hidden = false;
    (learnButton.disabled ? document.getElementById("skillBookCancelButton") : learnButton).focus({ preventScroll: true });
  }

  function closeSkillManualConfirm() {
    pendingManualSkillId = null;
    skillBookConfirmPanel.hidden = true;
    facilityContent.focus({ preventScroll: true });
  }

  function confirmSkillManualLearning() {
    if (!pendingManualSkillId) return;
    const result = Skills.learnSkillFromManual(skillState, pendingManualSkillId);
    if (!result.ok) {
      const missing = (result.missingPrerequisites || []).map((id) => Skills.getSkill(id)?.name || id).join("、");
      showToast(result.reason === "missing-prerequisite" ? `要先學識：${missing}` : "未能學習呢本技能書。", "danger");
      return;
    }
    skillState = result.state;
    sound.crystal();
    showToast(result.duplicate ? `重複技能書化成 ${result.shardsAwarded} 精通碎片。` : `已學識「${result.skill.name}」；去城門 DECK 面板裝設先可出戰。`, "good");
    closeSkillManualConfirm();
    renderFacility();
    saveImportant(false);
  }

  function useBagPotion() {
    const maxHp = playerStats().maxHp;
    if (player.potions <= 0) return showToast("藥水用晒喇。", "danger");
    if (player.hp >= maxHp) return showToast("而家生命已經全滿。", "good");
    player.potions -= 1;
    const healed = Math.min(maxHp - player.hp, Math.round(maxHp * .46));
    player.hp += healed;
    markPersistenceDirty();
    sound.heal();
    showToast(`使用回燈藥 · 回復 ${healed} 生命`, "good");
    announce(`回復 ${healed} 生命`);
    updateHud();
    renderFacility();
    saveImportant(false);
  }

  function changeSkillLoadout(skillId, equip, options = {}) {
    if (!options.force && !(facilityContext === "deck" && currentMapId === "world")) {
      return showToast("而家只可查看；要去舊港城門戰技面板台先可以換技。", "danger");
    }
    const result = equip ? Skills.equipSkill(skillState, skillId) : Skills.unequipSkill(skillState, skillId);
    if (!result.ok) return showToast(result.reason === "full" ? `目前面板只有 ${skillState.deckCapacity} 格。` : "未能更改技能配置。", "danger");
    skillState = result.state;
    showToast(`${equip ? "已裝備" : "已卸下"}：${Skills.getSkill(skillId).name}`, "good");
    renderFacility();
    saveImportant(false);
  }

  function masterSkill(skillId) {
    const result = Skills.unlockSkillWithShards(skillState, skillId);
    if (!result.ok) return showToast("精通碎片未夠。", "danger");
    skillState = result.state;
    showToast(`用 ${result.cost} 碎片領悟「${result.skill.name}」！`, "good");
    renderFacility();
    saveImportant(false);
  }

  function renderCodexFacility() {
    const ids = ExpansionWorld.CANONICAL_MONSTER_IDS;
    const cards = ids.map((type) => {
      const data = enemyTypes[type];
      const count = monsterKills[type] || Object.entries(ExpansionWorld.LEGACY_MONSTER_MIGRATION).filter(([, migration]) => migration.id === type).reduce((sum, [legacy]) => sum + (monsterKills[legacy] || 0), 0);
      const blueprint = ExpansionWorld.monsterBlueprint(type);
      const hidden = count === 0;
      return `<article class="codex-card ${hidden ? "is-unknown" : ""}"><span class="codex-count">${count ? `討伐 ${count}` : "未發現"}</span><div class="codex-sigil" aria-hidden="true">${hidden ? "?" : blueprint.battleRole === "poison" ? "✦" : blueprint.battleRole === "tank" ? "◇" : "●"}</div><div><strong>${hidden ? "？？？" : blueprint.name_zh}</strong><p>${hidden ? "繼續探索霧林同沉燈坑道。" : blueprint.codex.summary}</p><small>${hidden ? "能力未明" : `建議級別 ${blueprint.normalLevelRange[0]}-${blueprint.normalLevelRange[1]} · ${blueprint.drop?.name || "燈幣／藥水"}`}</small></div></article>`;
    }).join("");
    const discovered = ids.filter((type) => monsterKills[type] > 0).length;
    facilityContent.innerHTML = `<div class="facility-section-heading"><div><small>MONSTER CODEX</small><h3>霧獸觀察簿</h3></div><span>${discovered} / ${ids.length} 種</span></div><div class="codex-grid">${cards}</div>`;
    setFacilityFooter(`<span aria-hidden="true">◎</span> 每次討伐都會永久記錄；稀有素材可以留畀將來製作裝備。`);
  }

  function availableFacilityTabs() {
    return Expansion.facilityTabsForContext(facilityContext, currentMapId);
  }

  function renderFacility() {
    const availableTabs = availableFacilityTabs();
    facilityTab = Expansion.normalizeFacilityTab(facilityTab, facilityContext, currentMapId);
    const copy = {
      status: ["STATUS", "角色狀態", "生命、攻防、戰棋移動同出戰面板一眼睇清；戰鬥開場 10 AP、每輪增加 10 AP，技能按速度級別排序。"],
      bag: ["ADVENTURER BAG · ITEMS", "冒險者物品欄", "左邊查看目前裝備，右邊統一管理裝備、補給、技能書同素材。"],
      equipment: ["GEAR LOADOUT · EQUIPMENT", "角色裝備欄", "查看身上裝備同已擁有收藏，隨時切換出戰配置。"],
      deck: ["DECK", facilityContext === "deck" ? "城門戰技面板" : "戰技面板", facilityContext === "deck" ? "喺城門設定今次戰鬥會用到嘅技能。" : "查看目前出戰技能；要更換技能先去舊港城門。"],
      guild: ["GUILD HALL · COMMISSIONS", "拾燈公會", "接受固定委託，完成討伐或送信後返嚟領取技能書信封。"],
      shop: ["SILVER FLAME · EQUIPMENT", "銀火裝備店", "武器、防具、飾物各有取捨；唔係只睇最大數字。"],
      skills: ["SKILL TREE", `${playerClassId === "fighter" ? "格鬥士" : "戰士"}技能樹`, "依照前置順序學習；技能書唔會自動習得。"],
      codex: ["FIELD NOTES · MONSTER CODEX", "霧獸圖鑑", "記錄你見過同擊敗過嘅每一種霧獸。"],
    }[facilityTab];
    stage.dataset.facilityTab = facilityTab;
    stage.dataset.facilityContext = facilityContext;
    if (facilityTabs) facilityTabs.dataset.visibleTabs = availableTabs.join(" ");
    document.getElementById("facilityKicker").textContent = copy[0];
    document.getElementById("facilityTitle").textContent = copy[1];
    if (facilityHelpText) facilityHelpText.textContent = copy[2];
    setFacilityHelpOpen(false);
    for (const tab of facilityTabs?.querySelectorAll("[data-facility-tab]") || []) {
      const available = availableTabs.includes(tab.dataset.facilityTab);
      const active = tab.dataset.facilityTab === facilityTab;
      tab.hidden = !available;
      tab.disabled = !available;
      tab.classList.toggle("is-active", available && active);
      tab.setAttribute("aria-selected", String(available && active));
      tab.setAttribute("aria-hidden", String(!available));
    }
    updateMenuBadges();
    if (facilityTab === "status") renderStatusFacility();
    else if (facilityTab === "bag") renderBagFacility();
    else if (facilityTab === "equipment") renderEquipmentFacility();
    else if (facilityTab === "deck") renderDeckFacility();
    else if (facilityTab === "guild") renderGuildFacility();
    else if (facilityTab === "shop") renderShopFacility();
    else if (facilityTab === "skills") renderSkillsFacility();
    else renderCodexFacility();
  }

  function openFacility(tab = "bag", requestedContext) {
    if (!["playing", "facility"].includes(mode)) return false;
    const nextContext = requestedContext || (tab === "guild" ? "guild" : tab === "shop" ? "shop" : tab === "deck" ? "deck-view" : "portable");
    const normalizedContext = ["portable", "guild", "shop", "deck", "deck-view"].includes(nextContext) ? nextContext : "portable";
    const availableTabs = Expansion.facilityTabsForContext(normalizedContext, currentMapId);
    if (!availableTabs.includes(tab) && ["guild", "shop", "deck"].includes(tab)) {
      showToast(tab === "guild" ? "公會功能要親身入拾燈公會先用到。" : tab === "shop" ? "購物功能要親身入銀火裝備店先用到。" : "DECK 要去舊港城門嘅戰技面板台設定。", "danger");
      return false;
    }
    facilityContext = normalizedContext;
    facilityTab = Expansion.normalizeFacilityTab(FACILITY_TABS.includes(tab) ? tab : "bag", facilityContext, currentMapId);
    mode = "facility";
    stage.dataset.gameState = mode;
    keys.clear();
    clearExploreMovePath();
    pendingClickInteractionId = null;
    renderFacility();
    facilityPanel.hidden = false;
    document.getElementById("facilityCloseButton").focus({ preventScroll: true });
    announce(`${document.getElementById("facilityTitle").textContent}已打開。`);
    return true;
  }

  function closeFacility() {
    if (mode !== "facility") return;
    setFacilityHelpOpen(false);
    facilityPanel.hidden = true;
    mode = "playing";
    stage.dataset.gameState = mode;
    updateHud(true);
    pendingLevelUps = 0;
    canvas.focus({ preventScroll: true });
  }

  function setFacilityHelpOpen(open) {
    if (!facilityHelpPopover || !facilityHelpButton) return;
    facilityHelpPopover.hidden = !open;
    facilityHelpButton.setAttribute("aria-expanded", String(open));
  }

  function toggleFacilityHelp() {
    if (!facilityHelpPopover || !facilityHelpButton) return;
    setFacilityHelpOpen(facilityHelpPopover.hidden);
  }

  function returnToTitle() {
    if (!["playing", "facility", "battle"].includes(mode)) return;
    if (mode !== "battle") saveGame(false, true);
    closeBattleHud();
    hideAllOverlays();
    mode = "title";
    stage.dataset.gameState = mode;
    titleScreen.hidden = false;
    continueButton.hidden = !hasSave();
    updateHud(true);
  }

  function openDeckFromSidebar() {
    return openFacility("deck", "deck-view");
  }

  function acceptGuildOffer(offerId) {
    if (currentMapId !== "guild") return showToast("要親身返拾燈公會先接到委託。", "danger");
    const result = Guild.accept(guildCommissionState, offerId);
    if (!result.ok) return showToast(result.reason === "already-active" ? "同一時間只可以接一份委託。" : "搵唔到呢份委託。", "danger");
    guildCommissionState = result.state;
    syncGuildCommissionProjection();
    questTrackerMode = "contract";
    sound.crystal();
    showToast(`已接委託：${result.commission.title}`, "good");
    renderFacility();
    saveImportant(false);
  }

  function claimGuildContract(contractId) {
    if (currentMapId !== "guild") return showToast("要返拾燈公會先可以回報。", "danger");
    const active = activeGuildCommission();
    const expectedId = active ? `${guildCommissionState.cycle}:${active.id}` : null;
    if (contractId && expectedId && contractId !== expectedId) return showToast("委託資料已更新，請重新查看公會委託板。", "danger");
    const result = Guild.report(guildCommissionState);
    if (!result.ok) return showToast(result.reason === "not-ready" ? "委託仲未完成。" : "呢份委託已經回報過喇。", "danger");
    guildCommissionState = result.state;
    syncGuildCommissionProjection();
    questTrackerMode = "main";
    sound.level();
    showToast(`委託回報完成 · ${"★".repeat(result.reward.skill_envelope_star)} 技能書信封 × 1`, "good");
    renderFacility();
    saveImportant(false);
  }

  function openAbandonCommission(contractId) {
    const active = activeGuildCommission();
    const expectedId = active ? `${guildCommissionState.cycle}:${active.id}` : null;
    if (!active || !expectedId || contractId !== expectedId) return showToast("委託資料已更新，請重新查看公會委託板。", "danger");
    pendingAbandonContractId = expectedId;
    document.getElementById("abandonCommissionTitle").textContent = `確定放棄「${active.title}」？`;
    document.getElementById("abandonCommissionDescription").textContent = active.type === "hunt"
      ? `目前討伐進度 ${guildCommissionState.progress} / ${active.objective.count} 將會失去；委託會重新開放接受。`
      : guildCommissionState.status === "ready_to_report"
        ? "信件已送達但尚未回報；放棄後送件完成狀態與回報資格都會失去。"
        : "目前送信進度將會失去；委託會重新開放接受。";
    abandonCommissionPanel.hidden = false;
    document.getElementById("abandonCommissionConfirmButton").focus({ preventScroll: true });
  }

  function closeAbandonCommission(restoreFocus = true) {
    pendingAbandonContractId = null;
    abandonCommissionPanel.hidden = true;
    if (restoreFocus && mode === "facility") facilityContent.focus({ preventScroll: true });
  }

  function confirmAbandonCommission() {
    const active = activeGuildCommission();
    const expectedId = active ? `${guildCommissionState.cycle}:${active.id}` : null;
    if (!pendingAbandonContractId || pendingAbandonContractId !== expectedId) {
      closeAbandonCommission(false);
      return showToast("委託資料已更新，請重新查看公會委託板。", "danger");
    }
    const result = Guild.abandon(guildCommissionState);
    if (!result.ok) {
      closeAbandonCommission(false);
      return showToast("呢份委託而家冇可放棄嘅進度。", "danger");
    }
    guildCommissionState = result.state;
    syncGuildCommissionProjection();
    questTrackerMode = "main";
    closeAbandonCommission(false);
    showToast(`已放棄委託：${result.commission.title} · 進度已清除`, "good");
    renderFacility();
    saveImportant(false);
  }

  function openGuildEnvelope(star) {
    const safeStar = Number(star);
    const commissionState = Guild.normalizeState(guildCommissionState);
    const skill = Skills.drawFighterGuildSkillBook(safeStar, {
      seed: "everrealm-guild-envelope",
      serial: commissionState.envelopeDrawSerial,
    });
    if (!skill) return showToast("呢個星級暫時冇可抽取嘅格鬥士技能。", "danger");
    const consumed = Guild.consumeEnvelope(commissionState, safeStar);
    if (!consumed.ok) return showToast("你冇呢一星級嘅技能書信封。", "danger");
    const granted = Skills.grantSkillManuals(skillState, skill.id, 1);
    if (!granted.ok) return showToast("未能將技能書放入物品欄。", "danger");
    guildCommissionState = consumed.state;
    skillState = granted.state;
    sound.crystal();
    showToast(`開封抽到「${skill.name}」技能書；仍須符合 Fighter 前置先可以學習。`, "good");
    announce(`獲得格鬥士技能書：${skill.name}`);
    if (mode === "facility") renderFacility();
    updateHud(true);
    saveImportant(false);
  }

  function changeEquipment(itemId, buyFirst = false) {
    const beforeMax = playerStats().maxHp;
    const requestedItem = equipmentItem(itemId);
    if (!equipmentMatchesClass(requestedItem)) return showToast(playerClassId === "fighter" ? "格鬥士只可以裝備拳套。" : "戰士唔可以裝備拳套。", "danger");
    let state = { coins: player.coins, level: player.level, ownedEquipment, equipped };
    if (buyFirst) {
      if (currentMapId !== "shop") return showToast("購買裝備要親身去銀火裝備店。", "danger");
      const item = equipmentItem(itemId);
      const discountedCost = item ? Math.max(0, Math.floor(item.cost * (1 - guildDiscountRate()))) : 0;
      if (item && player.coins < discountedCost) return showToast("燈幣唔夠。", "danger");
      const discount = item ? item.cost - discountedCost : 0;
      state = { ...state, coins: state.coins + discount };
      const purchase = Expansion.purchaseEquipment(state, itemId);
      if (!purchase.ok) {
        const reason = purchase.reason === "coins" ? "燈幣唔夠。" : purchase.reason === "level" ? "等級未夠。" : "呢件裝備而家買唔到。";
        return showToast(reason, "danger");
      }
      state = purchase.state;
      player.coins = state.coins;
      ownedEquipment = state.ownedEquipment;
    }
    const result = Expansion.equipItem({ ...state, ownedEquipment, equipped }, itemId);
    if (!result.ok) return showToast("未可以裝備呢件物品。", "danger");
    equipped = result.state.equipped;
    const afterMax = playerStats().maxHp;
    player.hp = Core.clamp(player.hp + Math.max(0, afterMax - beforeMax), 1, afterMax);
    sound.coin();
    showToast(`${buyFirst ? "買到兼裝備" : "已裝備"}：${result.item.name}`, "good");
    renderFacility();
    updateHud(true);
    saveImportant(false);
  }

  function showVictory() {
    questStage = 5;
    mode = "victory";
    stage.dataset.gameState = mode;
    document.getElementById("victoryLevel").textContent = `LV. ${player.level}`;
    document.getElementById("victoryTime").textContent = formatTime(playTime);
    const outdoorChests = [...(overworld.chests || []), ...(maps.field?.chests || [])];
    const openedOutdoorChests = outdoorChests.filter((chest) => openedChests.has(chest.id)).length;
    document.getElementById("victoryChests").textContent = `${openedOutdoorChests} / ${outdoorChests.length}`;
    victoryPanel.hidden = false;
    saveImportant(false);
    document.getElementById("keepPlayingButton").focus({ preventScroll: true });
    announce("霧梅爾山地重光。你完成了永恆國度的主線故事。");
  }

  function keepPlaying() {
    victoryPanel.hidden = true;
    mode = "playing";
    stage.dataset.gameState = mode;
    showToast("主線完成 · 可以繼續探索、開箱同練級", "good");
    canvas.focus({ preventScroll: true });
  }

  const BATTLE_WIDTH = 9;
  const BATTLE_HEIGHT = 7;
  const BATTLE_AP_GAIN = Skills.ROUND_AP_GAIN;
  const BATTLE_AP_MAX = Skills.MAX_AP;
  const BATTLE_TURN_COST = .5;
  const BATTLE_MOVE_STEP_SECONDS = reducedMotion ? .08 : .24;
  const BATTLE_ACTION_WINDUP_SECONDS = reducedMotion ? .12 : .38;
  const BATTLE_ACTION_LINGER_SECONDS = reducedMotion ? .24 : .7;
  const BATTLE_SIDE_DAMAGE_BONUS = .15;
  const BATTLE_REAR_DAMAGE_BONUS = .35;
  const MOUNTAIN_BATTLEFIELD = Object.freeze({
    biome: "mountain",
    theme: "mountain",
    groundSet: Object.freeze(["dirt", "grass", "rock-ground"]),
    obstacleSet: Object.freeze(["rock", "boulder", "bush"]),
    backgroundId: "mountain-battle-background-v1",
  });
  const ENEMY_SPEED_GRADES = Object.freeze({ chick: "B", fox: "A", raccoon: "C", wild_boar: "D", bear: "D", turtle: "A", coyote: "A", frog: "B", snake: "A" });

  function scheduleBattle(callback, delay = 0) {
    if (!battle) return;
    const token = battle.token;
    const run = () => {
      if (!battle || battle.token !== token) return;
      if (mode !== "battle") return;
      callback();
    };
    window.setTimeout(run, delay);
  }

  function battleTerrainFor(source) {
    const layouts = {
      slime: [[4, 1], [4, 5], [5, 3]],
      wisp: [[3, 1], [3, 5], [5, 2], [5, 4]],
      hound: [[3, 2], [3, 4], [5, 1], [5, 5]],
      boss: [[3, 1], [3, 5], [5, 1], [5, 5]],
      mossbun: [[3, 1], [4, 4], [6, 2]],
      mistwing: [[3, 3], [5, 1], [5, 5]],
      cragboar: [[4, 2], [4, 4], [6, 3]],
      hollowmage: [[3, 1], [3, 5], [5, 3]],
      "lantern-golem": [[3, 2], [3, 4], [5, 1], [5, 5]],
      deepwarden: [[3, 1], [3, 5], [5, 1], [5, 5]],
    };
    return (layouts[source.type] || layouts.raccoon || [[4, 1], [4, 5], [5, 3]]).map(([x, y]) => ({ x, y }));
  }

  function battleFieldContextFor(mapId) {
    if (mapId !== "field") return null;
    return {
      ...MOUNTAIN_BATTLEFIELD,
      heightMap: Object.create(null),
      terrainCells: Object.create(null),
    };
  }

  function createBattleEnemy(source, type, index, primary) {
    const canonicalType = ExpansionWorld.normalizeMonsterId(type) || type;
    const base = enemyTypes[canonicalType] || enemyTypes[type];
    const blueprint = ExpansionWorld.monsterBlueprint(canonicalType);
    const level = primary ? source.level : Math.max(1, source.level - 1);
    const stats = blueprint ? ExpansionWorld.monsterStatsAtLevel(canonicalType, level) : null;
    const rawHp = primary ? source.maxHp : Math.round((stats?.hp || base.hp) * .7);
    const maxHp = Math.max(12, Math.round(rawHp));
    const spawnCells = [{ x: 7, y: 3 }, { x: 7, y: 1 }, { x: 7, y: 5 }];
    const boss = Boolean(primary && source.boss);
    const skill = ExpansionWorld.selectMonsterSkill(canonicalType, { round: battle?.round || 1 });
    const attackRange = primary ? source.attackRange : skill?.range.max || 1;
    const ranged = attackRange > 1;
    return {
      id: primary ? `battle-${source.id}` : `battle-${source.id}-helper-${index}`,
      sourceId: primary ? source.id : null,
      instanceId: `${source.instanceId || source.id}:helper-${index}`,
      primary,
      side: "enemy",
      type: canonicalType,
      artType: base.artType || canonicalType,
      boss,
      name: primary ? source.name : `幼小${base.name}`,
      level,
      cell: { ...spawnCells[index] },
      hp: maxHp,
      maxHp,
      attack: Math.max(5, primary ? source.damage : stats?.attack || base.damage),
      defence: primary ? source.defence : stats?.defense || base.defence || 1,
      moveRange: Math.max(2, primary ? source.moveRange : stats?.moveRange || base.moveRange || 4),
      turnCost: BATTLE_TURN_COST,
      attackRange,
      minAttackRange: attackRange > 1 ? 2 : 1,
      initiative: primary ? source.battleSpeed : base.battleSpeed || (ENEMY_SPEED_GRADES[canonicalType] === "A" ? 14 : ENEMY_SPEED_GRADES[canonicalType] === "B" ? 11 : 8),
      ap: 0,
      skillCost: skill?.apCost || (boss ? 10 : ranged ? 7 : 5),
      skillId: skill?.id || null,
      skill: skill || null,
      skills: blueprint?.skills || [],
      skillName: skill?.name || base.ability || (ranged ? "凝霧彈" : "霧爪擊"),
      speedGrade: skill?.speedGrade || ENEMY_SPEED_GRADES[canonicalType] || "C",
      targetArc: ["front", "side"],
      alive: true,
      facing: "left",
      hitFlash: 0,
    };
  }

  function battlePartyFor(source) {
    const blueprint = ExpansionWorld.monsterBlueprint(source.type);
    const types = [source.type, ...(blueprint?.encounterParty || [])];
    if (source.boss && types.length === 1) types.push("turtle", "snake");
    return types.slice(0, 3).map((type, index) => createBattleEnemy(source, type, index, index === 0));
  }

  function startBattle(source, instant = false) {
    if (!source?.alive || mode !== "playing" || battle || source.encounterCooldown > 0) return false;
    if (source.mainBoss && questStage < 3) return false;
    const stats = playerStats();
    battleToken += 1;
    const hero = {
      id: "battle-player",
      side: "ally",
      type: "player",
      name: "阿巡",
      level: player.level,
      cell: { x: 1, y: 3 },
      hp: Math.ceil(player.hp),
      maxHp: stats.maxHp,
      attack: stats.attack,
      defence: stats.defence,
      baseMoveRange: stats.moveRange,
      moveRange: stats.moveRange,
      attackRange: 1,
      initiative: stats.initiative,
      alive: true,
      facing: "right",
      hitFlash: 0,
    };
    const blocked = battleTerrainFor(source);
    battle = {
      token: battleToken,
      source,
      battlefield: battleFieldContextFor(currentMapId),
      grid: Tactics.createGrid(BATTLE_WIDTH, BATTLE_HEIGHT, blocked),
      blocked,
      hero,
      enemies: battlePartyFor(source),
      phase: "intro",
      round: 1,
      ap: 0,
      moved: false,
      guard: false,
      guardReduction: 0,
      moveBonusNext: 0,
      evasionNext: 0,
      evasion: 0,
      selectedAction: "move",
      cursor: { ...hero.cell },
      enemyPlans: [],
      message: "先部署移動，再選擇技能同目標。",
      messageDanger: false,
      effects: [],
      actingUnitId: null,
      actingUnitIds: [],
      heroMoveDraft: [{ ...hero.cell }],
      heroMovePlan: null,
      awaitingFacing: false,
      movementResolution: null,
      actionResolution: null,
      autoTimer: .35,
    };
    mode = "battle";
    stage.dataset.gameState = mode;
    keys.clear();
    interactionPrompt.hidden = true;
    battleHud.hidden = false;
    battleEncounterIntro.hidden = true;
    sound.boss();
    announce(`遇上${source.name}。進入格仔回合戰。`);
    beginPlayerRound();
    return true;
  }

  function beginPlayerRound() {
    if (!battle || mode !== "battle" || !["intro", "resolving_action"].includes(battle.phase)) return;
    for (const unit of battleUnits()) {
      if (unit.alive) showFighterEffectEvents(FighterEffects?.tickStatuses(unit, battle.round, unit === battle.hero ? learnedFighterPassives() : {}));
    }
    if (!battle.hero.alive || battle.hero.hp <= 0) return finishBattleDefeat();
    if (livingBattleEnemies().length === 0) return finishBattleVictory();
    battle.phase = "planning_move";
    battle.ap = Math.min(BATTLE_AP_MAX, battle.ap + BATTLE_AP_GAIN);
    for (const enemy of livingBattleEnemies()) enemy.ap = Math.min(BATTLE_AP_MAX, (enemy.ap || 0) + BATTLE_AP_GAIN);
    battle.hero.moveRange = FighterEffects?.isDisabled(battle.hero, battle.round, "move") ? 0
      : Math.max(0, battle.hero.baseMoveRange + (battle.moveBonusNext || 0) - (FighterEffects?.movementPenalty(battle.hero, battle.round) || 0));
    battle.moveBonusNext = 0;
    battle.evasion = battle.evasionNext || 0;
    battle.evasionNext = 0;
    battle.moved = false;
    battle.guard = false;
    battle.guardReduction = 0;
    battle.selectedAction = "move";
    battle.cursor = { ...battle.hero.cell };
    battle.enemyPlans = planEnemyRound();
    battle.heroMoveDraft = [{ ...battle.hero.cell }];
    battle.heroMovePlan = null;
    battle.awaitingFacing = false;
    battle.movementResolution = null;
    battle.actionResolution = null;
    battle.message = "撳藍格逐段排路；每次轉方向會多用 0.5 步，最後揀箭嘴決定朝向。";
    battle.messageDanger = false;
    battle.actingUnitId = null;
    battle.actingUnitIds = [];
    battle.autoTimer = .28;
    updateBattleUi();
    announce(`第 ${battle.round} 輪。你有 ${battle.ap} 點 AP。`);
    canvas.focus({ preventScroll: true });
  }

  function planEnemyRound() {
    if (!battle) return [];
    const simulated = [battle.hero, ...battle.enemies].map((unit) => ({ ...unit, cell: { ...unit.cell } }));
    const plans = [];
    const enemyOrder = Tactics.buildTurnOrder(battle.enemies.filter((unit) => unit.alive));
    for (const actual of enemyOrder) {
      const enemy = simulated.find((unit) => unit.id === actual.id);
      const hero = simulated.find((unit) => unit.id === battle.hero.id);
      if (actual.moveDownUntilRound >= battle.round) enemy.moveRange = Math.max(0, enemy.moveRange - (actual.moveDown || 0));
      enemy.moveRange = Math.max(0, enemy.moveRange - (FighterEffects?.movementPenalty(actual, battle.round) || 0));
      if (FighterEffects?.isDisabled(actual, battle.round, "move") || FighterEffects?.isStealthed?.(battle.hero, battle.round)) {
        plans.push({ enemyId: actual.id, move: { ...actual.cell }, path: [{ ...actual.cell }], targetCells: [], willAttack: false, facing: actual.facing });
        continue;
      }
      const action = Tactics.chooseEnemyAction({ grid: battle.grid, enemy, targets: [hero], units: simulated });
      if (!action) continue;
      const selectedSkill = ExpansionWorld.selectMonsterSkill(actual.type, { round: battle.round, skillId: actual.skillId });
      if (selectedSkill) {
        actual.skill = selectedSkill;
        actual.skillId = selectedSkill.id;
        actual.skillName = selectedSkill.name;
        actual.skillCost = selectedSkill.apCost;
        actual.speedGrade = selectedSkill.speedGrade;
        actual.attackRange = selectedSkill.range.max;
        actual.minAttackRange = selectedSkill.range.min;
      }
      enemy.cell = { ...action.move };
      enemy.facing = action.facing || enemy.facing;
      const target = { ...hero.cell };
      const targetCells = [];
      const willAttack = Boolean(action.attackTargetId) && (actual.ap || 0) >= actual.skillCost && (!actual.skill || actual.skill.actionKind !== "guard");
      if (willAttack) {
        targetCells.push(target);
        if (actual.skill?.area?.shape === "radius" || (actual.boss && battle.round % 3 === 0)) {
          for (const direction of Tactics.DIRECTIONS) {
            const splash = { x: target.x + direction.x, y: target.y + direction.y };
            if (Tactics.isInside(battle.grid, splash)) targetCells.push(splash);
          }
        }
      }
      plans.push({
        enemyId: actual.id,
        move: { ...action.move },
        path: action.path,
        targetCells,
        willAttack,
        skillName: actual.skillName,
        skillId: actual.skillId,
        skill: actual.skill,
        apCost: actual.skillCost,
        speedGrade: actual.speedGrade || "C",
        facing: action.facing || actual.facing,
      });
    }
    return plans;
  }

  function battleUnits() {
    return battle ? [battle.hero, ...battle.enemies] : [];
  }

  function livingBattleEnemies() {
    return battle ? battle.enemies.filter((unit) => unit.alive && unit.hp > 0) : [];
  }

  function battleMoveCost(path = battle?.heroMoveDraft) {
    return Tactics.movementPathCost(path?.length ? path : [battle?.hero?.cell].filter(Boolean), {
      turnCost: BATTLE_TURN_COST,
      initialFacing: battle?.hero?.facing,
    });
  }

  function battlePathFacing(path, initialFacing = battle?.hero?.facing) {
    return Tactics.movementEvents(path, {
      turnCost: BATTLE_TURN_COST,
      initialFacing,
    }).finalTravelFacing || initialFacing;
  }

  function formatMoveCost(value) {
    const safe = Math.round((Number(value) || 0) * 2) / 2;
    return Number.isInteger(safe) ? String(safe) : safe.toFixed(1);
  }

  function battleReachableTiles() {
    if (!battle || battle.phase !== "planning_move" || battle.moved) return [];
    const path = battle.heroMoveDraft?.length ? battle.heroMoveDraft : [copyBattleCell(battle.hero.cell)];
    const result = path.map((cell, index) => {
      const prefix = path.slice(0, index + 1).map(copyBattleCell);
      return { ...copyBattleCell(cell), cost: battleMoveCost(prefix), path: prefix, routeCell: true };
    });
    const usedCost = battleMoveCost(path);
    const remaining = battle.hero.moveRange - usedCost;
    if (remaining <= 0) return result;
    const endpoint = path[path.length - 1];
    const endpointFacing = battlePathFacing(path);
    const reachable = Tactics.reachableTiles(battle.grid, endpoint, remaining, [], {
      includeStart: false,
      turnCost: BATTLE_TURN_COST,
      initialFacing: endpointFacing,
    });
    for (const next of reachable) {
      const combined = [...path.map(copyBattleCell), ...next.path.slice(1).map(copyBattleCell)];
      const totalCost = battleMoveCost(combined);
      if (totalCost > battle.hero.moveRange + 1e-9) continue;
      result.push({
        x: next.x,
        y: next.y,
        cost: totalCost,
        path: combined,
        nextStep: true,
      });
    }
    return result;
  }

  function refreshEnemyAttackPlansAfterMovement() {
    if (!battle) return;
    for (const plan of battle.enemyPlans) {
      const enemy = battle.enemies.find((unit) => unit.id === plan.enemyId);
      if (!enemy?.alive || enemy.hp <= 0 || FighterEffects?.isDisabled(enemy, battle.round) || FighterEffects?.isStealthed?.(battle.hero, battle.round)) {
        plan.willAttack = false;
        plan.targetCells = [];
        continue;
      }
      plan.facing = enemy.facing;
      plan.move = copyBattleCell(enemy.cell);
      const inRange = Tactics.isInAttackRange(enemy.cell, battle.hero.cell, enemy.attackRange, enemy.minAttackRange);
      const targetPosition = Tactics.relativePosition(enemy.cell, enemy.facing, battle.hero.cell);
      const facingAllowed = (enemy.targetArc || ["front", "side"]).includes(targetPosition);
      plan.willAttack = inRange && facingAllowed && (enemy.ap || 0) >= (plan.apCost || enemy.skillCost || 0);
      plan.targetCells = plan.willAttack ? [copyBattleCell(battle.hero.cell)] : [];
      if (plan.willAttack && enemy.boss && battle.round % 3 === 0) {
        for (const direction of Tactics.DIRECTIONS) {
          const splash = { x: battle.hero.cell.x + direction.x, y: battle.hero.cell.y + direction.y };
          if (Tactics.isInside(battle.grid, splash)) plan.targetCells.push(splash);
        }
      }
    }
  }

  function appendBattleMoveWaypoint(cell) {
    if (!battle || battle.phase !== "planning_move" || !Tactics.isInside(battle.grid, cell)) return false;
    const path = battle.heroMoveDraft?.length ? battle.heroMoveDraft : [copyBattleCell(battle.hero.cell)];
    const endpoint = path[path.length - 1];
    if (sameBattleCell(endpoint, cell)) {
      battle.cursor = copyBattleCell(cell);
      battle.awaitingFacing = true;
      battle.message = path.length > 1
        ? `路線保持 ${formatMoveCost(battleMoveCost(path))} / ${battle.hero.moveRange} 步；揀箭嘴決定朝向，或者繼續加路點。`
        : "原地待命；揀一個箭嘴決定朝向，就會立即開始同步移動。";
      battle.messageDanger = false;
      updateBattleUi();
      return true;
    }
    const route = battleReachableTiles().find((tile) => tile.nextStep && sameBattleCell(tile, cell));
    if (!route) {
      setBattleMessage("嗰格超出剩餘步數或者被石障封住；只有下面「重畫路線」先會清除已排路線。", true);
      return false;
    }
    battle.heroMoveDraft = route.path.map(copyBattleCell);
    battle.cursor = copyBattleCell(cell);
    battle.awaitingFacing = true;
    battle.message = `已排 ${formatMoveCost(battleMoveCost(battle.heroMoveDraft))} / ${battle.hero.moveRange} 步（轉向 +0.5）；可再加路點，最後揀箭嘴決定朝向。`;
    battle.messageDanger = false;
    updateBattleUi();
    return true;
  }

  function resetBattleMoveDraft() {
    if (!battle || battle.phase !== "planning_move") return false;
    battle.heroMoveDraft = [copyBattleCell(battle.hero.cell)];
    battle.cursor = copyBattleCell(battle.hero.cell);
    battle.awaitingFacing = false;
    battle.message = "路線已清除。撳格仔逐段排路；揀終點旁邊箭嘴就會確認移動。";
    battle.messageDanger = false;
    updateBattleUi();
    return true;
  }

  function confirmPlannedMovement(finalFacing = battle?.hero?.facing) {
    if (!battle || battle.phase !== "planning_move") return false;
    if (!["up", "down", "left", "right"].includes(finalFacing)) return false;
    const path = battle.heroMoveDraft?.length ? battle.heroMoveDraft.map(copyBattleCell) : [copyBattleCell(battle.hero.cell)];
    battle.awaitingFacing = false;
    startMovementResolution(path, finalFacing);
    return true;
  }

  function chooseBattleFacing(facing) {
    if (!battle || battle.phase !== "planning_move" || !battle.awaitingFacing) return false;
    if (!["up", "down", "left", "right"].includes(facing)) return false;
    return confirmPlannedMovement(facing);
  }

  function syncBattleFacingPicker() {
    if (!battleFacingPicker) return;
    const visible = Boolean(battle && mode === "battle" && battle.phase === "planning_move" && battle.awaitingFacing);
    battleFacingPicker.hidden = !visible;
    if (!visible) return;
    const endpoint = battle.heroMoveDraft?.[battle.heroMoveDraft.length - 1] || battle.hero.cell;
    const point = battleCellCentre(endpoint);
    const edge = width <= 530 ? 54 : 66;
    battleFacingPicker.style.left = `${Core.clamp(point.x, edge, width - edge)}px`;
    battleFacingPicker.style.top = `${Core.clamp(point.y, edge, height - edge)}px`;
  }

  function battleTargetTiles(action = battle?.selectedAction) {
    if (!battle) return [];
    if (action === "move") return battleReachableTiles();
    if (battle.phase !== "planning_action") return [];
    const skill = battleSkillFromAction(action);
    if (!skill) return [];
    const targets = [];
    for (let y = 0; y < BATTLE_HEIGHT; y += 1) {
      for (let x = 0; x < BATTLE_WIDTH; x += 1) {
        const cell = { x, y };
        if (skillTargetValidation(skill, cell).ok) targets.push(cell);
      }
    }
    return targets;
  }

  function equippedBattleSkills() {
    return Skills.normalizeSkillState(skillState).equippedSkillIds.map((id) => Skills.getSkill(id)).filter(Boolean);
  }

  function battleSkillFromAction(action) {
    if (typeof action !== "string") return null;
    const starterId = Skills.CLASS_STARTER_SKILLS[playerClassId]?.[0] || "quick_slash";
    const id = action.startsWith("skill:") ? action.slice(6) : action === "slash" ? starterId : action === "flare" ? "lantern_shot" : null;
    return id ? Skills.getSkill(id) : null;
  }

  function battleTargetUnitAt(cell, preferredTeam = null) {
    if (!battle) return null;
    const enemy = livingBattleEnemies().find((unit) => sameBattleCell(unit.cell, cell)) || null;
    const hero = sameBattleCell(battle.hero.cell, cell) ? battle.hero : null;
    if (preferredTeam === "enemy") return enemy;
    if (preferredTeam === "ally" || preferredTeam === "self") return hero;
    return enemy || hero;
  }

  function skillArcAllowsCell(skill, cell) {
    if (!skill || !cell) return false;
    // Canonical Fighter skills own their selectable cells in data; in
    // particular Backfist and rear/side patterns must not be erased by the
    // old generic front-arc gate.
    if (Array.isArray(skill.rangeCellsRelative)) return true;
    const relative = sameBattleCell(battle.hero.cell, cell) ? "self" : Tactics.relativePosition(battle.hero.cell, battle.hero.facing, cell);
    return relative === "side"
      ? skill.targetArc.includes("side") || skill.targetArc.includes("left") || skill.targetArc.includes("right")
      : skill.targetArc.includes(relative);
  }

  function battleSkillRangeTiles(skill) {
    if (!battle || !skill || battle.phase !== "planning_action") return [];
    const damaging = skill.effects.some((effect) => effect.type === "damage");
    const cells = [];
    for (let y = 0; y < BATTLE_HEIGHT; y += 1) {
      for (let x = 0; x < BATTLE_WIDTH; x += 1) {
        const cell = { x, y };
        if (battle.grid.blocked.has(Tactics.cellKey(cell))) continue;
        if (Skills.isTargetInRange(skill, battle.hero.cell, cell, { facing: battle.hero.facing })
          && Skills.isSkillHeightValid(skill, battle.hero.cell, cell, { battlefield: battle.battlefield, grid: battle.grid })
          && (!damaging || skillArcAllowsCell(skill, cell))) cells.push(cell);
      }
    }
    return cells;
  }

  function skillTargetValidation(skill, cell) {
    const targetUnit = battleTargetUnitAt(cell, skill?.targeting?.team);
    const validation = Skills.validateSkillTarget(skill, battle.hero.cell, cell, {
      grid: battle.grid,
      battlefield: battle.battlefield,
      heightMap: battle.battlefield?.heightMap,
      heightAt: battleCellHeight,
      facing: battle.hero.facing,
      actorTeam: "ally",
      actorId: battle.hero.id,
      targetUnit: targetUnit ? { ...targetUnit, team: targetUnit.side } : null,
    });
    const damaging = skill?.effects?.some((effect) => effect.type === "damage");
    if (validation.ok && damaging && !skillArcAllowsCell(skill, cell)) {
      return { ok: false, reason: "rear-target", cells: [] };
    }
    return validation;
  }

  function selectBattleAction(action) {
    if (!battle || mode !== "battle") return;
    if (action === "start") return beginPlayerRound();
    if (!["planning_move", "planning_action"].includes(battle.phase)) return;
    if (action === "basic-attack" || action === "slash") {
      const starter = equippedBattleSkills()[0] || Skills.getSkill(Skills.CLASS_STARTER_SKILLS[playerClassId]?.[0]);
      action = starter ? `skill:${starter.id}` : "";
    }
    if (action === "lantern-skill" || action === "flare") action = "skill:lantern_shot";
    battle.messageDanger = false;
    if (action === "flee") return fleeBattle();
    if (battle.phase === "planning_move") {
      if (action === "reset-move" || action === "move") return resetBattleMoveDraft();
      return setBattleMessage("先揀移動終點；撳自己腳下可以原地不動。", true);
    }
    if (action === "move") {
      return setBattleMessage("今輪移動已經完成；請揀攻擊、技能、飲藥或者待機。", true);
    } else if (action.startsWith("skill:")) {
      const skill = battleSkillFromAction(action);
      if (!skill || !skillState.unlockedSkillIds.some((id) => Skills.canonicalSkillId(id) === Skills.canonicalSkillId(skill.id)) || !skillState.equippedSkillIds.some((id) => Skills.canonicalSkillId(id) === Skills.canonicalSkillId(skill.id))) return setBattleMessage("呢招未裝備喺技能欄。", true);
      if (battle.ap < skill.apCost) return setBattleMessage(`${skill.name}要 ${skill.apCost} AP；可以待機儲力。`, true);
      battle.selectedAction = action;
      battle.message = `${skillStars(skill.star)} ${skill.name} · ${skillRangeText(skill)}。${skill.description}`;
      if (skill.targeting.mode === "self") return resolvePlayerBattleSkill(skill, battle.hero.cell, battle.hero);
    } else if (action === "potion") {
      return useBattlePotion();
    } else if (action === "end-turn") {
      return beginActionResolution({ type: "wait", label: "待機" });
    }
    updateBattleUi();
  }

  function setBattleMessage(message, danger = false) {
    if (!battle) return;
    battle.message = message;
    battle.messageDanger = danger;
    updateBattleUi();
  }

  function confirmBattleCell(cell) {
    if (!battle || mode !== "battle" || !["planning_move", "planning_action"].includes(battle.phase) || !Tactics.isInside(battle.grid, cell)) return false;
    battle.cursor = { x: cell.x, y: cell.y };
    if (battle.phase === "planning_move" && battle.selectedAction === "move") {
      return appendBattleMoveWaypoint(cell);
    }
    if (battle.phase !== "planning_action") return false;
    const skill = battleSkillFromAction(battle.selectedAction);
    if (skill) {
      const target = battleTargetUnitAt(cell, skill.targeting.team);
      const validation = skillTargetValidation(skill, cell);
      if (!validation.ok) {
        const copy = validation.reason === "empty-target"
          ? "呢招要揀一個合適目標。"
          : validation.reason === "wrong-team"
            ? "呢招唔可以對呢個陣營使用。"
            : validation.reason === "rear-target"
              ? "背後係攻擊死角；要靠移動最後一步轉向，先可以向前或左右出招。"
              : "目標唔喺技能射程或方向內。";
        return setBattleMessage(copy, true), false;
      }
      resolvePlayerBattleSkill(skill, cell, target, validation.cells);
      return true;
    }
    return false;
  }

  function copyBattleCell(cell) {
    return { x: Number(cell.x), y: Number(cell.y) };
  }

  function sameBattleCell(a, b) {
    return Boolean(a && b && a.x === b.x && a.y === b.y);
  }

  function buildSimultaneousMovementFrames(heroPath, finalFacing) {
    const actors = battleUnits().filter((unit) => unit.alive);
    const routes = new Map();
    routes.set(battle.hero.id, {
      path: heroPath.map(copyBattleCell),
      finalFacing,
    });
    for (const plan of battle.enemyPlans) {
      const enemy = battle.enemies.find((unit) => unit.id === plan.enemyId);
      if (enemy?.alive) routes.set(enemy.id, {
        path: (plan.path?.length ? plan.path : [enemy.cell]).map(copyBattleCell),
      });
    }
    return Tactics.resolveSimultaneousMovement({
      timed: true,
      grid: battle.grid,
      units: actors,
      routes,
      turnCost: BATTLE_TURN_COST,
      priorityUnitId: battle.hero.id,
    });
  }

  function startMovementResolution(heroPath, finalFacing) {
    if (!battle || battle.phase !== "planning_move") return;
    const movement = buildSimultaneousMovementFrames(heroPath, finalFacing);
    battle.phase = "resolving_move";
    battle.moved = true;
    battle.selectedAction = null;
    battle.heroMovePlan = { path: heroPath.map(copyBattleCell), move: copyBattleCell(heroPath[heroPath.length - 1]), facing: finalFacing };
    battle.movementResolution = { ...movement, finalHeroFacing: finalFacing, elapsed: 0, stepDuration: BATTLE_MOVE_STEP_SECONDS };
    battle.actingUnitIds = movement.actors.filter((id) => movement.unitResults[id]?.elapsedCost > 0 || movement.unitResults[id]?.blocked);
    battle.message = heroPath.length > 1 ? "路線確認——阿巡同霧獸同步移動！" : "阿巡留喺原位；霧獸開始行動。";
    battle.messageDanger = false;
    updateBattleUi();
    sound.tone(360, .09, { to: 620, gain: .025 });
    if ((movement.frameTimes?.at(-1) || 0) <= 0) finishMovementResolution();
  }

  function updateMovementResolution(dt) {
    const movement = battle?.movementResolution;
    if (!movement || battle.phase !== "resolving_move") return;
    movement.elapsed += dt;
    const timeline = movement.timeline || [];
    const frameTimes = movement.frameTimes || timeline.map((frame) => frame.time);
    const totalTime = frameTimes.at(-1) || 0;
    const movementTime = Math.min(totalTime, movement.elapsed / movement.stepDuration);
    let frameIndex = 0;
    while (frameIndex + 1 < frameTimes.length && frameTimes[frameIndex + 1] <= movementTime + 1e-9) frameIndex += 1;
    const nextIndex = Math.min(frameIndex + 1, Math.max(0, timeline.length - 1));
    const fromTime = frameTimes[frameIndex] || 0;
    const toTime = frameTimes[nextIndex] ?? fromTime;
    const progress = toTime > fromTime ? Core.clamp((movementTime - fromTime) / (toTime - fromTime), 0, 1) : 0;
    for (const id of movement.actors) {
      const unit = battleUnits().find((actor) => actor.id === id);
      if (!unit) continue;
      const from = timeline[frameIndex]?.renderCells?.[id] || movement.frames[frameIndex]?.[id] || unit.cell;
      const to = timeline[nextIndex]?.renderCells?.[id] || movement.frames[nextIndex]?.[id] || from;
      unit.renderCell = { x: Core.lerp(from.x, to.x, progress), y: Core.lerp(from.y, to.y, progress) };
      unit.facing = timeline[frameIndex]?.facings?.[id] || unit.facing;
      unit.locomotion = Locomotion.sampleMovement(movement, id, movement.elapsed, unit.facing);
      unit.facing = unit.locomotion.facing;
    }
    if (movement.elapsed >= totalTime * movement.stepDuration) finishMovementResolution();
  }

  function finishMovementResolution() {
    if (!battle?.movementResolution) return;
    const movement = battle.movementResolution;
    const stoppedIds = new Set(movement.cancelled || []);
    const stoppedUnits = [];
    for (const unit of battleUnits()) {
      const result = movement.unitResults?.[unit.id];
      if (result?.cell) unit.cell = copyBattleCell(result.cell);
      if (result?.facing) unit.facing = result.facing;
      unit.locomotion = Locomotion.create(unit.facing);
      delete unit.renderCell;
      if (result && (result.blocked || (stoppedIds.has(unit.id) && !result.completed))) stoppedUnits.push(unit);
    }
    const pathFor = (id) => (movement.unitResults?.[id]?.completedPath || [battleUnits().find((unit) => unit.id === id)?.cell])
      .filter(Boolean)
      .map(copyBattleCell);
    battle.heroMovePlan = { path: pathFor(battle.hero.id), move: copyBattleCell(battle.hero.cell), facing: battle.hero.facing };
    for (const plan of battle.enemyPlans) {
      const enemy = battle.enemies.find((unit) => unit.id === plan.enemyId);
      if (!enemy?.alive || !movement.unitResults?.[enemy.id]) continue;
      plan.path = pathFor(enemy.id);
      plan.move = copyBattleCell(enemy.cell);
      plan.facing = enemy.facing;
    }
    refreshEnemyAttackPlansAfterMovement();
    battle.movementResolution = null;
    battle.phase = "planning_action";
    const firstSkill = equippedBattleSkills()[0] || Skills.getSkill(Skills.CLASS_STARTER_SKILLS[playerClassId]?.[0]);
    battle.selectedAction = firstSkill ? `skill:${firstSkill.id}` : null;
    battle.cursor = { ...battle.hero.cell };
    battle.actingUnitIds = [];
    for (const unit of stoppedUnits) {
      battle.effects.push({ cell: { ...unit.cell }, text: "STOP!", color: "#ff6b6b", life: .95, maxLife: .95, burst: true });
    }
    if (!stoppedUnits.some((unit) => unit.id === battle.hero.id)) {
      battle.effects.push({ cell: { ...battle.hero.cell }, text: "停定！", color: "#52dccb", life: .75, maxLife: .75 });
    }
    battle.message = stoppedUnits.length
      ? "移動途中撞到其他單位，未走完嘅路線已經 STOP；依家按實際企位同朝向出招。"
      : "移動完成。依家揀攻擊、技能、飲藥或者待機；側擊 +15%，背擊 +35%。";
    battle.autoTimer = .28;
    updateBattleUi();
    announce(stoppedUnits.length ? "有單位被卡住，移動停止。請選擇今輪行動。" : "移動完成。請選擇今輪行動。");
  }

  function resolvePlayerBattleSkill(skill, targetCell, targetUnit = null, pattern = null) {
    if (!battle || battle.phase !== "planning_action") return;
    if (!skill || battle.ap < skill.apCost) return setBattleMessage("AP 唔夠。", true);
    battle.ap -= skill.apCost;
    const centre = targetCell || battle.hero.cell;
    const attackPath = skill.deliveryMode === "linear"
      ? Tactics.facingOrthogonalPriority(battle.hero.cell, centre, battle.hero.facing)
      : [];
    beginActionResolution({
      type: "skill",
      skillId: skill.id,
      label: skill.name,
      targetId: targetUnit?.id || null,
      targetCell: copyBattleCell(centre),
      pattern: (pattern || Skills.patternCells(skill, battle.hero.cell, centre, { grid: battle.grid, facing: battle.hero.facing })).map(copyBattleCell),
      attackPath: attackPath.map(copyBattleCell),
      cost: skill.apCost,
    });
  }

  function resolvePlayerBattleAttack(target, legacySkill) {
    const skill = Skills.getSkill(legacySkill === "flare" ? "lantern_shot" : Skills.CLASS_STARTER_SKILLS[playerClassId]?.[0] || "quick_slash");
    const cell = target.cell || target;
    resolvePlayerBattleSkill(skill, cell, target.cell ? target : null);
  }

  function applyBattleHit(unit, amount, color, hitIndex = 0, hitCount = 1) {
    const result = Tactics.applyDamage(unit, amount);
    unit.hp = result.hpAfter;
    unit.alive = !result.defeated;
    unit.hitFlash = .32;
    const spread = (hitIndex - (hitCount - 1) / 2) * .18;
    const offsetX = hitCount > 1 ? spread : 0;
    const offsetY = .16 + Math.floor(hitIndex / 2) * .42;
    battle.effects.push({ cell: { ...unit.cell }, text: `-${result.damage}`, color, life: .9, maxLife: .9, kind: "damage", offsetX, offsetY });
  }

  function showFighterEffectEvents(result) {
    if (!battle || !result) return;
    for (const event of result.events || []) {
      const unit = battleUnits().find((actor) => actor.id === event.unitId);
      if (!unit) continue;
      battle.effects.push({ cell: { ...unit.cell }, text: event.text, color: event.kind === "damage" ? "#ff6b6b" : "#a9c9ff", life: 1, maxLife: 1, kind: "status", offsetY: -.82 });
    }
    player.hp = battle.hero.hp;
  }

  function useBattlePotion() {
    if (!battle || battle.phase !== "planning_action") return;
    if (player.potions <= 0) return setBattleMessage("回燈藥用晒喇。", true);
    if (battle.hero.hp >= battle.hero.maxHp) return setBattleMessage("而家滿血，留返支藥先。", true);
    beginActionResolution({ type: "potion", label: "回燈藥" });
  }

  function beginActionResolution(heroAction) {
    if (!battle || mode !== "battle" || battle.phase !== "planning_action") return;
    const heroSkill = heroAction.type === "skill" ? Skills.getSkill(heroAction.skillId) : null;
    const heroSpeedGrade = heroSkill?.speedGrade || (heroAction.type === "potion" ? "S" : "F");
    const actionOrder = Skills.orderActionsBySpeed([
      { actorId: battle.hero.id, speedGrade: heroSpeedGrade, initiative: battle.hero.initiative },
      ...battle.enemyPlans.filter((plan) => plan.willAttack).map((plan) => {
        const enemy = battle.enemies.find((unit) => unit.id === plan.enemyId);
        return { actorId: plan.enemyId, speedGrade: plan.speedGrade || enemy?.speedGrade || "C", initiative: enemy?.initiative || 0 };
      }),
    ]);
    battle.phase = "resolving_action";
    battle.selectedAction = null;
    battle.messageDanger = false;
    battle.actionResolution = { elapsed: 0, applied: false, completed: false, heroAction, actionOrder };
    battle.actingUnitId = null;
    battle.actingUnitIds = actionOrder.map((action) => action.actorId);
    battle.message = `${heroAction.label}已確認（速度 ${heroSpeedGrade}）——按 S → A → B → C → D → E → F 結算！`;
    updateBattleUi();
  }

  function updateActionResolution(dt) {
    const resolution = battle?.actionResolution;
    if (!resolution || battle.phase !== "resolving_action") return;
    resolution.elapsed += dt;
    if (!resolution.applied && resolution.elapsed >= BATTLE_ACTION_WINDUP_SECONDS) applySimultaneousBattleActions(resolution.heroAction);
    if (!resolution.completed && resolution.elapsed >= BATTLE_ACTION_WINDUP_SECONDS + BATTLE_ACTION_LINGER_SECONDS) {
      resolution.completed = true;
      battle.actingUnitIds = [];
      if (battle.hero.hp <= 0) return finishBattleDefeat();
      if (livingBattleEnemies().length === 0) return finishBattleVictory();
      battle.round += 1;
      beginPlayerRound();
    }
  }

  function applySimultaneousBattleActions(heroAction) {
    if (!battle?.actionResolution || battle.actionResolution.applied) return;
    battle.actionResolution.applied = true;
    const enemiesAtStart = livingBattleEnemies();
    const heroHits = [];
    const executedHeroHits = [];
    const executedEnemyHits = [];
    const cancelledActions = [];
    let heroExecuted = false;
    let heroHeal = 0;
    let skill = null;
    let guardReduction = battle.guardReduction || 0;
    let moveBonusNext = 0;
    let evasionNext = 0;
    let effectTargets = [];
    let specialEffectsApplied = false;
    const statusTargets = [];
    const heroHitResolvers = [];
    if (heroAction.type === "skill") {
      skill = Skills.getSkill(heroAction.skillId);
      const cells = heroAction.pattern?.length ? heroAction.pattern : Skills.patternCells(skill, battle.hero.cell, heroAction.targetCell, { grid: battle.grid, facing: battle.hero.facing });
      const pattern = new Set(cells.map((cell) => Tactics.cellKey(cell)));
      const damageEffect = skill?.effects.find((effect) => effect.type === "damage");
      const healEffect = skill?.effects.find((effect) => effect.type === "heal");
      const pierceEffect = skill?.effects.find((effect) => effect.type === "armor_pierce");
      const guardEffect = skill?.effects.find((effect) => effect.type === "guard");
      const moveUpEffect = skill?.effects.find((effect) => effect.type === "move_up");
      const evasionEffect = skill?.effects.find((effect) => effect.type === "evasion");
      const defenceDownEffect = skill?.effects.find((effect) => effect.type === "defense_down");
      const moveDownEffect = skill?.effects.find((effect) => effect.type === "move_down");
      let affectedEnemies = enemiesAtStart.filter((unit) => pattern.has(Tactics.cellKey(unit.cell)));
      const linearTrace = skill?.deliveryMode === "linear"
        ? Tactics.traceAttackPath({
          origin: battle.hero.cell,
          target: heroAction.targetCell,
          path: heroAction.attackPath,
          facing: battle.hero.facing,
          grid: battle.grid,
          units: battleUnits(),
          actorId: battle.hero.id,
          deliveryMode: skill.deliveryMode,
          blocksByTerrain: skill.blocksByTerrain,
          blocksByUnits: skill.blocksByUnits,
        })
        : null;
      // A normal Linear attack resolves the first occupied cell, even when a
      // farther cell was selected.  Area/pathless skills retain their full
      // authored effect area.
      if (linearTrace) affectedEnemies = linearTrace.actualTarget ? [linearTrace.actualTarget] : [];
      effectTargets = skill.targeting.team === "ally" ? [battle.hero].filter((unit) => pattern.has(Tactics.cellKey(unit.cell))) : affectedEnemies;
      if (damageEffect) {
        const hitCount = Math.max(1, Math.floor(Number(skill.hitResolution?.hit_count || damageEffect.hits) || 1));
        const recheck = Boolean(skill.hitResolution?.recheck_attack_path_each_hit);
        const makeHeroHit = (target, hitIndex) => {
          if (!target) return null;
          const existingDebuff = target.defenceDownUntilRound >= battle.round ? target.defenceDown || 0 : 0;
          const defence = Math.max(0, (target.defence || 0) * (1 - existingDebuff) * (1 - (pierceEffect?.amount || 0)));
          const positional = Tactics.positionalAttack(battle.hero, target, {
            side: 1 + BATTLE_SIDE_DAMAGE_BONUS,
            rear: 1 + BATTLE_REAR_DAMAGE_BONUS,
          });
          const authoredMultiplier = skill.damage
            ? Skills.calculateSkillDamageMultiplier(skill)
            : (damageEffect.scale || skill.power || 1);
          const totalDamage = Tactics.calculateDamage(battle.hero, target, {
            defence,
            multiplier: authoredMultiplier * positional.multiplier,
            critical: skill.area.shape === "single" && hitIndex === 0 && Math.random() < playerStats().critChance,
            minimum: skill.star + 1,
          });
          const split = Skills.splitDamageLaterHits(totalDamage, hitCount);
          return {
            target,
            damage: split[hitIndex] || 0,
            color: skill.star === 3 ? "#ff9dd3" : skill.star === 2 ? "#a9c9ff" : "#ffc857",
            position: positional.position,
            hitIndex,
            hitCount,
          };
        };
        if (linearTrace) {
          heroHitResolvers.push({ hitCount, recheck, path: linearTrace.path, initialTarget: linearTrace.actualTarget, makeHeroHit });
        } else {
          for (const target of affectedEnemies) {
            for (let hitIndex = 0; hitIndex < hitCount; hitIndex += 1) {
              const hit = makeHeroHit(target, hitIndex);
              if (hit) heroHits.push(hit);
            }
          }
        }
      }
      if (healEffect && pattern.has(Tactics.cellKey(battle.hero.cell))) {
        heroHeal = Math.round(battle.hero.maxHp * (healEffect.maxHpRatio || 0) + (healEffect.flat || 0));
      }
      if (guardEffect && pattern.has(Tactics.cellKey(battle.hero.cell))) guardReduction = Math.max(guardReduction, guardEffect.amount || 0);
      if (moveUpEffect) moveBonusNext = Math.max(moveBonusNext, moveUpEffect.amount || 0);
      if (evasionEffect) evasionNext = Math.max(evasionNext, evasionEffect.amount || 0);
      if (defenceDownEffect || moveDownEffect) {
        for (const target of affectedEnemies) statusTargets.push({ target, defenceDownEffect, moveDownEffect });
      }
    } else if (heroAction.type === "potion") {
      heroHeal = Math.round(battle.hero.maxHp * .46);
    }

    const enemyHits = [];
    const missedCells = [];
    for (const plan of battle.enemyPlans) {
      const enemy = enemiesAtStart.find((unit) => unit.id === plan.enemyId);
      if (!enemy || !plan.willAttack || !plan.targetCells.length) continue;
      const coreTarget = plan.targetCells[0];
      const stillInRange = Tactics.isInAttackRange(enemy.cell, coreTarget, enemy.attackRange, enemy.minAttackRange);
      const targetPosition = Tactics.relativePosition(enemy.cell, enemy.facing, coreTarget);
      const facingAllowed = (enemy.targetArc || ["front", "side"]).includes(targetPosition);
      const hit = stillInRange && facingAllowed && plan.targetCells.some((cell) => sameBattleCell(cell, battle.hero.cell));
      // A stale/empty prediction is cancelled silently: the monster does not
      // spend AP or perform an attack at a square where no target exists.
      if (!hit) continue;
      const positional = Tactics.positionalAttack(enemy, battle.hero, {
        side: 1 + BATTLE_SIDE_DAMAGE_BONUS,
        rear: 1 + BATTLE_REAR_DAMAGE_BONUS,
      });
      enemyHits.push({
        enemy,
        plan,
        skillName: plan.skillName || enemy.skillName,
        position: positional.position,
      });
    }

    const heroSpeedGrade = skill?.speedGrade || (heroAction.type === "potion" ? "S" : "F");
    const orderedActions = Skills.orderActionsBySpeed([
      { actorId: battle.hero.id, kind: "hero", speedGrade: heroSpeedGrade, initiative: battle.hero.initiative },
      ...enemyHits.map((hit) => ({ actorId: hit.enemy.id, kind: "enemy", speedGrade: hit.plan.speedGrade || hit.enemy.speedGrade || "C", initiative: hit.enemy.initiative, hit })),
    ]);
    battle.actionResolution.actionOrder = orderedActions.map((action) => ({ actorId: action.actorId, speedGrade: action.speedGrade }));
    battle.actingUnitIds = orderedActions.map((action) => action.actorId);

    for (const action of orderedActions) {
      if (action.kind === "hero") {
        if (!battle.hero.alive || battle.hero.hp <= 0 || FighterEffects?.isDisabled(battle.hero, battle.round)) {
          cancelledActions.push("阿巡");
          continue;
        }
        heroExecuted = true;
        if (heroAction.type === "potion") player.potions = Math.max(0, player.potions - 1);
        heroHeal = Math.min(battle.hero.maxHp - battle.hero.hp, heroHeal);
        if (heroHeal > 0) battle.hero.hp = Math.min(battle.hero.maxHp, battle.hero.hp + heroHeal);
        battle.guardReduction = guardReduction;
        battle.guard = guardReduction > 0;
        battle.moveBonusNext = Math.max(battle.moveBonusNext || 0, moveBonusNext);
        battle.evasionNext = Math.max(battle.evasionNext || 0, evasionNext);
        battle.evasion = Math.max(battle.evasion || 0, evasionNext);
        const executionHits = [...heroHits];
        for (const resolver of heroHitResolvers) {
          for (let hitIndex = 0; hitIndex < resolver.hitCount; hitIndex += 1) {
            const trace = resolver.recheck
              ? Tactics.traceAttackPath({
                origin: battle.hero.cell,
                target: heroAction.targetCell,
                path: resolver.path,
                grid: battle.grid,
                units: battleUnits(),
                actorId: battle.hero.id,
                deliveryMode: "linear",
                blocksByTerrain: skill.blocksByTerrain,
                blocksByUnits: skill.blocksByUnits,
              })
              : null;
            const target = resolver.recheck ? trace?.actualTarget : resolver.initialTarget;
            const hit = resolver.makeHeroHit(target, hitIndex);
            if (hit) executionHits.push(hit);
          }
        }
        for (const hit of executionHits) {
          if (!hit.target.alive || hit.target.hp <= 0) continue;
          const missChance = Math.max(0, (FighterEffects?.accuracyPenalty(battle.hero, battle.round) || 0) - (learnedFighterPassives().accuracy || 0));
          if (missChance > 0 && Math.random() < missChance) {
            battle.effects.push({ cell: { ...hit.target.cell }, text: "MISS", color: "#a9c9ff", life: .9, maxLife: .9, offsetY: .16 });
            continue;
          }
          if (hit.hitIndex === 0 && hit.position === "rear") battle.effects.push({ cell: { ...hit.target.cell }, text: "背擊 +35%", color: "#ff9dd3", life: 1, maxLife: 1, kind: "positionBonus", offsetY: -.4 });
          else if (hit.hitIndex === 0 && hit.position === "side") battle.effects.push({ cell: { ...hit.target.cell }, text: "側擊 +15%", color: "#a9c9ff", life: 1, maxLife: 1, kind: "positionBonus", offsetY: -.4 });
          applyBattleHit(hit.target, hit.damage, hit.color, hit.hitIndex, hit.hitCount);
          executedHeroHits.push(hit);
        }
        for (const status of statusTargets) {
          if (!status.target.alive || status.target.hp <= 0) continue;
          if (status.defenceDownEffect) {
            status.target.defenceDown = Math.max(status.target.defenceDown || 0, status.defenceDownEffect.amount || 0);
            status.target.defenceDownUntilRound = battle.round + (status.defenceDownEffect.duration || 1);
          }
          if (status.moveDownEffect) {
            status.target.moveDown = Math.max(status.target.moveDown || 0, status.moveDownEffect.amount || 0);
            status.target.moveDownUntilRound = battle.round + (status.moveDownEffect.duration || 1);
          }
        }
        if (skill && FighterEffects) {
          const handled = new Set(["damage", "heal", "guard", "move_up", "evasion", "defense_down", "move_down", "armor_pierce"]);
          const additional = skill.effects.filter((effect) => !handled.has(effect.type));
          if (additional.length) {
            const targets = skill.effects.some((effect) => effect.type === "damage")
              ? [...new Set(executedHeroHits.map((hit) => hit.target))].filter((unit) => unit.alive)
              : effectTargets;
            const result = FighterEffects.applySkillEffects({ skill: { ...skill, effects: additional }, caster: battle.hero, targets, units: battleUnits(), grid: battle.grid, round: battle.round });
            specialEffectsApplied = Boolean(result.applied);
            showFighterEffectEvents(result);
          }
        }
        continue;
      }

      const hit = action.hit;
      if (!hit.enemy.alive || hit.enemy.hp <= 0 || !battle.hero.alive || battle.hero.hp <= 0 || FighterEffects?.isDisabled(hit.enemy, battle.round)) {
        cancelledActions.push(hit.enemy.name);
        continue;
      }
      // Faster displacement or stealth can invalidate an attack queued earlier.
      if (FighterEffects?.isStealthed?.(battle.hero, battle.round)
        || !Tactics.isInAttackRange(hit.enemy.cell, battle.hero.cell, hit.enemy.attackRange, hit.enemy.minAttackRange)) continue;
      hit.enemy.ap = Math.max(0, (hit.enemy.ap || 0) - (hit.plan.apCost || hit.enemy.skillCost || 0));
      const passiveStats = learnedFighterPassives();
      const evasionChance = Math.max(battle.evasion || 0, FighterEffects?.statusEvasion(battle.hero, battle.round, passiveStats) || 0);
      const missChance = Math.min(.9, evasionChance + (FighterEffects?.accuracyPenalty(hit.enemy, battle.round) || 0));
      if (missChance > 0 && Math.random() < missChance) {
        missedCells.push({ ...battle.hero.cell });
        continue;
      }
      const activeGuard = battle.guardReduction || 0;
      hit.damage = Tactics.calculateDamage(hit.enemy, battle.hero, {
        multiplier: (hit.plan.skill?.damageModel?.scale || 1) * (hit.enemy.boss && battle.round % 3 === 0 ? 1.25 : 1) * (hit.position === "rear" ? 1 + BATTLE_REAR_DAMAGE_BONUS : hit.position === "side" ? 1 + BATTLE_SIDE_DAMAGE_BONUS : 1),
        guarded: activeGuard > 0,
        guardMultiplier: 1 - activeGuard,
        minimum: 2,
      });
      const damageType = hit.plan.skill?.effects?.some((effect) => effect.type === "poison") ? "mind" : hit.enemy.battleRole === "charger" ? "impact" : hit.enemy.battleRole === "skirmisher" ? "pierce" : "impact";
      hit.damage = Math.max(1, Math.round(hit.damage * (FighterEffects?.damageMultiplier(battle.hero, battle.round, passiveStats, damageType) ?? 1)));
      if (FighterEffects) {
        const counter = FighterEffects.resolveCounter({ defender: battle.hero, attacker: hit.enemy, damage: hit.damage, isProjectile: hit.enemy.attackRange > 1, round: battle.round });
        hit.damage = counter.damage;
        showFighterEffectEvents(counter);
      }
      const result = Tactics.applyDamage(battle.hero, hit.damage);
      hit.damage = result.damage;
      battle.hero.hp = result.hpAfter;
      battle.hero.alive = !result.defeated;
      if (hit.plan.skill && FighterEffects && hit.plan.skill.effects?.length && battle.hero.alive) {
        const effectResult = FighterEffects.applySkillEffects({ skill: hit.plan.skill, caster: hit.enemy, targets: [battle.hero], units: battleUnits(), grid: battle.grid, round: battle.round });
        showFighterEffectEvents(effectResult);
      }
      executedEnemyHits.push(hit);
    }
    if (!heroExecuted) heroHeal = 0;
    if (skill && heroExecuted) {
      const skillColor = skill.star === 3 ? "#ff9dd3" : skill.star === 2 ? "#a9c9ff" : "#ffc857";
      const landed = executedHeroHits.length || heroHeal > 0 || specialEffectsApplied || statusTargets.length || skill.effects.some((effect) => ["guard", "move_up", "evasion"].includes(effect.type));
      battle.effects.push({ cell: { ...heroAction.targetCell }, text: landed ? skillIcon(skill) : "MISS", color: skillColor, life: 1, maxLife: 1, burst: true });
      if (skill.tags.includes("heal")) sound.heal();
      else if (skill.tags.includes("magic")) sound.crystal();
      else if (executedHeroHits.length) { sound.swing(); sound.hit(); }
      else sound.tone(430, .13, { to: 680, gain: .025 });
    } else if (heroAction.type === "potion" && heroExecuted) {
      battle.effects.push({ cell: { ...battle.hero.cell }, text: `+${heroHeal}`, color: "#87db82", life: 1, maxLife: 1, burst: true });
      sound.heal();
    } else if (heroExecuted) {
      battle.effects.push({ cell: { ...battle.hero.cell }, text: "待機", color: "#87db82", life: .9, maxLife: .9 });
    } else {
      battle.effects.push({ cell: { ...battle.hero.cell }, text: "行動取消", color: "#ff6b6b", life: 1, maxLife: 1 });
    }

    for (const cell of missedCells.slice(0, 2)) battle.effects.push({ cell: { ...cell }, text: "避開！", color: "#52dccb", life: .9, maxLife: .9 });
    const totalEnemyDamage = executedEnemyHits.reduce((sum, hit) => sum + hit.damage, 0);
    player.hp = battle.hero.hp;
    if (totalEnemyDamage > 0) {
      battle.hero.hitFlash = .35;
      if (executedEnemyHits.some((hit) => hit.position === "rear")) battle.effects.push({ cell: { ...battle.hero.cell }, text: "背擊 +35%", color: "#ff9dd3", life: 1, maxLife: 1, kind: "positionBonus", offsetY: -.4 });
      else if (executedEnemyHits.some((hit) => hit.position === "side")) battle.effects.push({ cell: { ...battle.hero.cell }, text: "側擊 +15%", color: "#a9c9ff", life: 1, maxLife: 1, kind: "positionBonus", offsetY: -.4 });
      battle.effects.push({ cell: { ...battle.hero.cell }, text: `-${totalEnemyDamage}`, color: "#ff6b6b", life: 1, maxLife: 1, kind: "damage", offsetY: .16 });
      sound.hurt();
      screenShake = reducedMotion ? 0 : 7;
    } else if (missedCells.length) sound.tone(620, .11, { to: 840, gain: .025 });
    battle.evasion = 0;

    const skillResults = [];
    if (executedHeroHits.length) {
      const targetCount = new Set(executedHeroHits.map((hit) => hit.target.id)).size;
      const hitCopy = executedHeroHits.length > targetCount ? `、${executedHeroHits.length} 段` : "";
      skillResults.push(`命中 ${targetCount} 個目標${hitCopy}`);
    }
    if (executedHeroHits.some((hit) => hit.position === "rear")) skillResults.push("觸發背擊 +35%");
    else if (executedHeroHits.some((hit) => hit.position === "side")) skillResults.push("觸發側擊 +15%");
    if (heroHeal) skillResults.push(`回復 ${heroHeal} HP`);
    if (specialEffectsApplied) skillResults.push("技能效果生效");
    if (guardReduction) skillResults.push(`減傷 ${Math.round(guardReduction * 100)}%`);
    if (battle.moveBonusNext) skillResults.push(`下輪移動 +${battle.moveBonusNext}`);
    const heroResult = !heroExecuted ? "阿巡未及出招，行動取消" : heroAction.type === "wait" ? "阿巡待機（不附帶減傷）" : heroAction.type === "potion" ? `阿巡回復 ${heroHeal} HP` : skill ? `阿巡施放「${skill.name}」${skillResults.length ? `：${skillResults.join("、")}` : "，但冇命中"}` : "阿巡完成行動";
    const usedSkills = [...new Set(executedEnemyHits.map((hit) => hit.skillName).filter(Boolean))];
    const enemyPosition = executedEnemyHits.some((hit) => hit.position === "rear") ? "（背擊 +35%）" : executedEnemyHits.some((hit) => hit.position === "side") ? "（側擊 +15%）" : "";
    const cancelledCopy = cancelledActions.length ? `；${cancelledActions.join("、")}因倒下或異常狀態取消行動` : "";
    const enemyResult = executedEnemyHits.length ? `霧獸用${usedSkills.length ? `「${usedSkills.join("／")}」` : "技能"}${enemyPosition}合共造成 ${totalEnemyDamage} 傷害` : missedCells.length ? "霧獸技能全部落空" : "霧獸未能出招";
    battle.message = `${heroResult}；${enemyResult}${cancelledCopy}。`;
    updateHud();
    updateBattleUi();
  }

  function finishBattleVictory() {
    if (!battle || battle.phase === "victory") return;
    battle.phase = "victory";
    battle.message = "霧散開咗——戰鬥勝利！";
    battle.messageDanger = false;
    const token = battle.token;
    sound.level();
    updateBattleUi();
    scheduleBattle(() => {
      if (!battle || battle.token !== token) return;
      const finished = battle;
      const bonusUnits = finished.enemies.filter((unit) => !unit.primary);
      const bonusXp = bonusUnits.reduce((sum, unit) => sum + 10 + unit.level * 4, 0);
      const bonusCoins = bonusUnits.reduce((sum, unit) => sum + 3 + unit.level * 2, 0);
      player.hp = Math.max(1, finished.hero.hp);
      closeBattleHud();
      mode = "playing";
      stage.dataset.gameState = mode;
      killEnemy(finished.source);
      for (const unit of bonusUnits) recordDefeatedMonster(unit);
      if (bonusXp) gainXp(bonusXp);
      player.coins += bonusCoins;
      encounterGrace = 1;
      const earnedXp = finished.source.xp + bonusXp;
      showToast(`戰鬥勝利 · +${earnedXp} XP${bonusCoins ? `、+${bonusCoins} 燈幣` : ""}`, "good");
      updateHud(true);
      saveImportant(false);
      canvas.focus({ preventScroll: true });
    }, 760);
  }

  function finishBattleDefeat() {
    if (!battle) return;
    const token = battle.token;
    battle.phase = "defeat";
    battle.message = "阿巡盞燈熄咗……";
    battle.messageDanger = true;
    updateBattleUi();
    scheduleBattle(() => {
      if (!battle || battle.token !== token) return;
      closeBattleHud();
      player.hp = 0;
      playerDeath();
    }, 620);
  }

  function fleeBattle() {
    if (!battle || !["planning_move", "planning_action"].includes(battle.phase)) return;
    if (battle.source.boss && battle.source.mainBoss) return setBattleMessage("守關霧獸封住咗出口，今場走唔甩。", true);
    const chance = ExpansionWorld.retreatChance(player.level, livingBattleEnemies());
    if (Math.random() >= chance) {
      setBattleMessage(`撤退失敗（成功率 ${Math.round(chance * 100)}%），霧獸逼近咗！`, true);
      battle.phase = "planning_action";
      return updateBattleUi();
    }
    const source = battle.source;
    const away = Core.normalize({ x: player.x - source.x, y: player.y - source.y });
    source.encounterCooldown = 3;
    moveEntity(player, (away.x || -1) * 54, away.y * 54);
    closeBattleHud();
    mode = "playing";
    stage.dataset.gameState = mode;
    encounterGrace = 1.4;
    showToast("成功撤退 · 霧獸暫時追唔上", "good");
    canvas.focus({ preventScroll: true });
  }

  function closeBattleHud() {
    battleToken += 1;
    battleHud.hidden = true;
    battleEncounterIntro.hidden = true;
    battleFacingPicker.hidden = true;
    delete stage.dataset.battlePhase;
    keys.clear();
    battle = null;
  }

  function updateBattle(dt) {
    if (!battle) return;
    playTime += dt;
    screenShake = Math.max(0, screenShake - dt * 28);
    screenFlash = Math.max(0, screenFlash - dt * 3.2);
    battle.hero.hitFlash = Math.max(0, battle.hero.hitFlash - dt);
    for (const enemy of battle.enemies) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    for (const effect of battle.effects) effect.life -= dt;
    battle.effects = battle.effects.filter((effect) => effect.life > 0);
    if (battle.phase === "resolving_move") updateMovementResolution(dt);
    else if (battle.phase === "resolving_action") updateActionResolution(dt);
    if (autoplay && ["planning_move", "planning_action"].includes(battle.phase)) {
      battle.autoTimer -= dt;
      if (battle.autoTimer <= 0) autoPlayBattleTurn();
    }
  }

  function autoPlayBattleTurn() {
    if (!battle || !["planning_move", "planning_action"].includes(battle.phase)) return;
    const enemiesAlive = livingBattleEnemies();
    if (!enemiesAlive.length) return finishBattleVictory();
    if (battle.phase === "planning_move") {
      const moves = Tactics.reachableTiles(battle.grid, battle.hero.cell, battle.hero.moveRange, [], {
        includeStart: true,
        turnCost: BATTLE_TURN_COST,
        initialFacing: battle.hero.facing,
      });
      moves.sort((a, b) => Math.min(...enemiesAlive.map((unit) => Tactics.manhattan(a, unit.cell))) - Math.min(...enemiesAlive.map((unit) => Tactics.manhattan(b, unit.cell))) || b.cost - a.cost);
      battle.heroMoveDraft = (moves[0]?.path || [battle.hero.cell]).map(copyBattleCell);
      const endpoint = battle.heroMoveDraft[battle.heroMoveDraft.length - 1];
      const nearest = [...enemiesAlive].sort((a, b) => Tactics.manhattan(endpoint, a.cell) - Tactics.manhattan(endpoint, b.cell))[0];
      const facing = nearest ? Tactics.facingFromStep(endpoint, nearest.cell, battle.hero.facing) : battle.hero.facing;
      confirmPlannedMovement(facing);
      return;
    }
    const usable = equippedBattleSkills()
      .filter((skill) => skill.effects.some((effect) => effect.type === "damage") && skill.apCost <= battle.ap)
      .map((skill) => {
        const action = `skill:${skill.id}`;
        const targets = battleTargetTiles(action).map((cell) => ({
          cell,
          hits: Skills.patternCells(skill, battle.hero.cell, cell, { grid: battle.grid, facing: battle.hero.facing }).filter((areaCell) => enemiesAlive.some((enemy) => sameBattleCell(enemy.cell, areaCell))).length,
        })).filter((item) => item.hits > 0).sort((a, b) => b.hits - a.hits);
        return { skill, target: targets[0] || null };
      })
      .filter((choice) => choice.target)
      .sort((a, b) => b.target.hits - a.target.hits || b.skill.star - a.skill.star || a.skill.apCost - b.skill.apCost);
    if (usable.length) {
      const choice = usable[0];
      selectBattleAction(`skill:${choice.skill.id}`);
      confirmBattleCell(choice.target.cell);
      return;
    }
    selectBattleAction("end-turn");
  }

  function renderBattleActionButtons() {
    const planningMove = battle.phase === "planning_move";
    const planningAction = battle.phase === "planning_action";
    const buttons = document.getElementById("battleSkillButtons");
    buttons.classList.toggle("is-move-phase", planningMove);
    buttons.classList.toggle("is-action-phase", planningAction);
    if (planningMove) {
      const routeSteps = formatMoveCost(battleMoveCost());
      buttons.innerHTML = `
        <button id="battleMoveButton" class="battle-skill-button move-skill" type="button" data-battle-action="reset-move" aria-keyshortcuts="M">
          <i aria-hidden="true">↺</i><span><b>重畫路線</b><small>而家 ${routeSteps} / ${battle.hero.moveRange} 步 · 轉向 +0.5</small></span><kbd>1</kbd>
        </button>
        <button id="battleFleeButton" class="battle-skill-button flee-skill" type="button" data-battle-action="flee" aria-keyshortcuts="Escape" ${battle.source.mainBoss ? "disabled" : ""}>
          <i aria-hidden="true">↩</i><span><b>撤退</b><small>返回探索</small></span><kbd>ESC</kbd>
        </button>`;
      battleUi.potionCount = null;
      return;
    }
    if (!planningAction) {
      buttons.innerHTML = `<span class="battle-actions-loading">${battle.phase === "resolving_move" ? "雙方沿路線移動中……" : "雙方同步出招中……"}</span>`;
      battleUi.potionCount = null;
      return;
    }
    const keyLabels = ["2", "3", "4", "5", "6", "7"];
    const skillButtons = equippedBattleSkills().map((skill, index) => {
      const id = skill.id === "quick_slash" ? ' id="battleAttackButton"' : skill.id === "lantern_shot" ? ' id="battleLanternButton"' : "";
      const className = skill.star === 3 ? "star-3-skill" : skill.star === 2 ? "star-2-skill" : skill.tags.includes("magic") ? "lantern-skill" : "attack-skill";
      const action = `skill:${skill.id}`;
      const selected = battle.selectedAction === action;
      const disabled = battle.ap < skill.apCost;
      return `<button${id} class="battle-skill-button ${className}${selected ? " is-selected" : ""}" type="button" data-battle-action="${action}" aria-keyshortcuts="${keyLabels[index]}" ${disabled ? "disabled" : ""}>
        <i aria-hidden="true">${skillIcon(skill)}</i><span><b>${skillStars(skill.star)} ${skill.name}</b><small>${skillRangeText(skill)}</small></span><kbd>${keyLabels[index]}</kbd>
      </button>`;
    }).join("");
    buttons.innerHTML = `
      ${skillButtons}
      <button id="battlePotionButton" class="battle-skill-button potion-skill" type="button" data-battle-action="potion" aria-keyshortcuts="Q" ${player.potions > 0 && battle.hero.hp < battle.hero.maxHp ? "" : "disabled"}>
        <i aria-hidden="true">♥</i><span><b>飲藥</b><small><em id="battlePotionCount">${player.potions}</em> 支剩低</small></span><kbd>8</kbd>
      </button>
      <button id="battleEndTurnButton" class="battle-skill-button end-turn-skill" type="button" data-battle-action="end-turn" aria-keyshortcuts="E">
        <i aria-hidden="true">✓</i><span><b>待機</b><small>保留 AP · 無減傷</small></span><kbd>9</kbd>
      </button>
      <button id="battleFleeButton" class="battle-skill-button flee-skill" type="button" data-battle-action="flee" aria-keyshortcuts="Escape" ${battle.source.mainBoss ? "disabled" : ""}>
        <i aria-hidden="true">↩</i><span><b>撤退</b><small>返回探索</small></span><kbd>ESC</kbd>
      </button>`;
    battleUi.potionCount = document.getElementById("battlePotionCount");
  }

  function updateBattleUi() {
    if (!battle) return;
    const intro = battle.phase === "intro";
    battleEncounterIntro.hidden = !intro;
    for (const panel of battleHud.querySelectorAll("[data-battle-panel]:not([data-battle-panel='encounter-intro'])")) panel.hidden = intro;
    battleHud.dataset.battlePhase = battle.phase;
    stage.dataset.battlePhase = battle.phase;
    battleUi.round.textContent = `ROUND ${battle.round}`;
    const phaseCopy = {
      planning_move: ["同步移動部署", "撳格仔加路點；揀箭嘴定朝向並確認"],
      resolving_move: ["雙方移動中", "所有單位沿路線同步逐格前進"],
      planning_action: ["選擇今輪出招", "只可向前、左、右出招；背面係死角"],
      resolving_action: ["雙方同步出招", "傷害會喺同一時點結算"],
      victory: ["戰鬥勝利！", "霧散開咗"],
      defeat: ["燈火熄滅", "返回落腳燈位"],
    };
    battleUi.turn.textContent = phaseCopy[battle.phase]?.[0] || "阿巡嘅回合";
    battleUi.phase.textContent = phaseCopy[battle.phase]?.[1] || "";
    battleUi.unitRole.textContent = "巡燈人 · 行動燈力";
    battleUi.unitLevel.textContent = `LV. ${battle.hero.level}`;
    battleUi.unitName.textContent = "阿巡";
    battleUi.hpFill.style.width = `${Core.clamp(battle.hero.hp / battle.hero.maxHp, 0, 1) * 100}%`;
    battleUi.hpText.textContent = `${Math.ceil(battle.hero.hp)} / ${battle.hero.maxHp}`;
    battleUi.actionPoints.textContent = `燈力 AP ${battle.ap} / ${BATTLE_AP_MAX}`;
    if (battleUi.potionCount) battleUi.potionCount.textContent = player.potions;
    battlePortraitCtx.clearRect(0, 0, battlePortraitCanvas.width, battlePortraitCanvas.height);
    Art.drawPortrait(battlePortraitCtx, {
      x: 0,
      y: 0,
      width: battlePortraitCanvas.width,
      height: battlePortraitCanvas.height,
      actor: "player",
      classId: playerClassId,
      expression: battle.hero.hitFlash > 0 ? "hurt" : battle.phase === "victory" ? "happy" : "determined",
      background: "#315d66",
      backgroundEnd: "#111a31",
    });
    battleUi.statuses.innerHTML = "";
    const statuses = [
      { text: `AP ${battle.ap}`, good: battle.ap >= Skills.AP_BANDS[1].min },
      battle.phase === "planning_move" ? { text: `路線 ${formatMoveCost(battleMoveCost())} / ${battle.hero.moveRange}`, good: true } : { text: "移動已結算", good: true },
      { text: `面向 ${({ up: "上", down: "下", left: "左", right: "右" })[battle.hero.facing] || "下"}`, good: true },
      battle.guard ? { text: `技能減傷 -${Math.round((battle.guardReduction || 0) * 100)}%`, good: true } : null,
      battle.moveBonusNext ? { text: `下輪移動 +${battle.moveBonusNext}`, good: true } : null,
    ].filter(Boolean);
    for (const status of statuses) {
      const chip = document.createElement("span");
      chip.className = `unit-status ${status.good ? "is-good" : ""}`;
      chip.textContent = status.text;
      battleUi.statuses.appendChild(chip);
    }
    battleUi.order.innerHTML = "";
    const order = [battle.hero, ...Tactics.buildTurnOrder(livingBattleEnemies())];
    for (const unit of order) {
      const item = document.createElement("li");
      item.dataset.unitId = unit.id;
      const current = battle.actingUnitIds?.length
        ? battle.actingUnitIds.includes(unit.id)
        : battle.actingUnitId
          ? unit.id === battle.actingUnitId
          : ["planning_move", "planning_action"].includes(battle.phase) && unit.side === "ally";
      item.className = current ? "is-current" : "";
      const avatar = document.createElement("span");
      avatar.className = `turn-avatar ${unit.side === "ally" ? "ally-avatar" : "enemy-avatar"}`;
      avatar.textContent = unit.side === "ally" ? "巡" : unit.boss ? "王" : "霧";
      const label = document.createElement("b");
      label.textContent = unit.name;
      item.append(avatar, label);
      battleUi.order.appendChild(item);
    }
    battleUi.hint.textContent = battle.message;
    battleUi.hint.classList.toggle("danger", Boolean(battle.messageDanger));
    renderBattleActionButtons();
    syncBattleFacingPicker();
  }

  function updateGame(dt) {
    updateExplorePointerTracking();
    if (mode !== "playing") return;
    playTime += dt;
    encounterGrace = Math.max(0, encounterGrace - dt);
    persistence?.tick(dt);
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateDrops(dt);
    updateEffects(dt);
    updateCamera(dt);
    updateHud();
    if (autoplay && mode === "levelup") chooseUpgrade("edge");
  }

  function updateCamera(dt) {
    const zoom = targetZoom();
    // Exploration is player-locked even at the map boundary. drawTiles clips to
    // valid tiles and the themed canvas backdrop safely fills the area beyond a
    // small map, so the left tool rail can never cover the player.
    camera.x = player.x;
    camera.y = player.y;
    camera.zoom = Core.lerp(camera.zoom, zoom, 1 - Math.exp(-5 * dt));
  }

  function currentMapExit() {
    return world.portals.find((portal) => portal.targetMap === "world") || world.portals[0] || world.start;
  }

  function firstPortalTowardMap(targetMapId) {
    if (!hasMap(targetMapId) || currentMapId === targetMapId) return null;
    const visited = new Set([currentMapId]);
    const queue = [{ mapId: currentMapId, firstPortal: null }];
    while (queue.length) {
      const step = queue.shift();
      const source = maps[step.mapId];
      for (const portal of source?.portals || []) {
        if (!hasMap(portal.targetMap)) continue;
        const firstPortal = step.firstPortal || portal;
        if (portal.targetMap === targetMapId) return firstPortal;
        if (visited.has(portal.targetMap)) continue;
        visited.add(portal.targetMap);
        queue.push({ mapId: portal.targetMap, firstPortal });
      }
    }
    return null;
  }

  function mainQuestInfo() {
    const copy = questStage === 0
      ? { title: "入公會搵妍姐", detail: "問下長明燈發生咩事" }
      : questStage === 1
        ? { title: "城外失落嘅霧晶", detail: `搵齊霧晶　${crystals.size} / 3` }
        : questStage === 2
          ? { title: "三光開門", detail: "帶霧晶去坑道封印" }
          : questStage === 3
            ? { title: "坑道口嘅黑影", detail: "擊敗吞燈獸" }
            : questStage === 4
              ? { title: "帶光返城", detail: "返公會搵妍姐" }
              : { title: "霧都重光", detail: "探索寶箱、升級同繼續夜巡" };
    const targetMapId = questStage >= 1 && questStage <= 3 ? "field" : currentMapId === "guild" ? "guild" : "world";
    if (currentMapId !== targetMapId) {
      const direction = targetMapId === "field" ? "前往城外山地" : "先返回霧都";
      return { ...copy, detail: `${direction} · ${copy.detail}`, target: routeToMap(targetMapId) };
    }
    if (questStage === 0 || questStage === 4) {
      const guildTarget = currentMapId === "guild"
        ? world.npcs.find((npc) => npc.id === "guildmaster-yin")
        : world.portals.find((portal) => portal.id === "world-to-guild");
      return { ...copy, target: guildTarget || world.start };
    }
    if (questStage === 1) return { ...copy, target: nearestMissingCrystal(world) };
    if (questStage === 2) return { ...copy, target: world.objectives.gate };
    if (questStage === 3) return { ...copy, target: world.objectives.boss };
    return { ...copy, target: world.shrine || world.start };
  }

  function contractEnemyTarget(enemy) {
    return ExpansionWorld.normalizeMonsterId(enemy?.type) || enemy?.type;
  }

  function contractTargetMap(target) {
    return ["bear", "snake"].includes(target) ? "dungeon" : "field";
  }

  function nearestContractEnemy(target) {
    return enemies.filter((enemy) => contractEnemyTarget(enemy) === target)
      .sort((a, b) => Number(b.alive) - Number(a.alive) || Core.distance(player, a) - Core.distance(player, b))[0] || null;
  }

  function routeToMap(targetMapId) {
    if (currentMapId === targetMapId) return world.start;
    return firstPortalTowardMap(targetMapId) || currentMapExit();
  }

  function contractQuestInfo() {
    const contract = activeGuildCommission();
    const guildBoard = currentMapId === "guild" ? world.boards[0] || world.start : null;
    if (!contract) return {
      title: "未接公會委託",
      detail: currentMapId === "guild" ? "查看委託板，揀一份今晚嘅工作" : "去拾燈公會查看可重複委託",
      target: guildBoard || routeToMap("guild"),
    };
    if (guildCommissionState.status === "ready_to_report") return {
      title: "返公會回報",
      detail: `${contract.title}完成 · 領取${skillBookRewardText(contract)}`,
      target: guildBoard || routeToMap("guild"),
    };
    if (contract.type === "delivery") {
      const targetMapId = "field";
      const target = currentMapId === targetMapId
        ? world.npcs.find((npc) => npc.id === contract.objective.recipient_npc_id)
        : null;
      return {
        title: contract.title,
        detail: `將公會信件送到${contractTargetName(contract.objective.recipient_npc_id)}手上`,
        target: target || routeToMap(targetMapId),
      };
    }
    const targetMapId = contractTargetMap(contract.objective.monster_id);
    const target = currentMapId === targetMapId ? nearestContractEnemy(contract.objective.monster_id) : null;
    return {
      title: contract.title,
      detail: `${guildCommissionState.progress} / ${contract.objective.count} · 討伐${contractTargetName(contract.objective.monster_id)}`,
      target: target || routeToMap(targetMapId),
    };
  }

  function questInfo() {
    return questTrackerMode === "contract" ? contractQuestInfo() : mainQuestInfo();
  }

  function nearestMissingCrystal(activeWorld = world) {
    const options = Object.entries(activeWorld.objectives?.crystals || {})
      .filter(([id]) => !crystals.has(id))
      .map(([id, point]) => ({ id, point, distance: Core.distance(player, point) }))
      .sort((a, b) => a.distance - b.distance);
    return options[0]?.point || activeWorld.objectives?.gate || activeWorld.start;
  }

  function updateHud(force = false) {
    const stats = playerStats();
    const hpRatio = Core.clamp(player.hp / stats.maxHp, 0, 1);
    const xpNeeded = Expansion.xpRequired(player.level);
    const atCap = player.level >= Expansion.LEVEL_CAP;
    const xpRatio = atCap ? 1 : Core.clamp(player.xp / xpNeeded, 0, 1);
    hud.level.textContent = `LV. ${player.level}`;
    hud.hpFill.style.width = `${hpRatio * 100}%`;
    hud.hpText.textContent = `${Math.ceil(player.hp)} / ${stats.maxHp}`;
    hud.xpFill.style.width = `${xpRatio * 100}%`;
    hud.xpText.textContent = atCap ? `LV.${Expansion.LEVEL_CAP} MAX` : `${player.xp} / ${xpNeeded} XP`;
    hud.coins.textContent = player.coins;
    hud.potions.textContent = player.potions;
    hud.weapon.textContent = equippedWeaponName();
    updateMenuBadges();
    const quest = questInfo();
    hud.questTitle.textContent = quest.title;
    hud.questDetail.textContent = quest.detail;
    for (const tab of hud.questTabs) {
      const selected = tab.dataset.questTrack === questTrackerMode;
      tab.setAttribute("aria-selected", String(selected));
      tab.dataset.ready = String(tab.dataset.questTrack === "contract" && guildCommissionState.status === "ready_to_report");
    }
    const steps = Math.round(Core.distance(player, quest.target) / world.tileSize);
    hud.questDistance.textContent = steps <= 2 ? "目標喺附近" : `距離目標約 ${steps} 步`;
    hud.zone.textContent = currentZone;
    stage.dataset.gameState = mode;
    stage.dataset.level = String(player.level);
    stage.dataset.hp = String(Math.ceil(player.hp));
    stage.dataset.quest = String(questStage);
    stage.dataset.crystals = String(crystals.size);
    stage.dataset.aliveEnemies = String(enemies.filter((enemy) => enemy.alive).length);
    stage.dataset.bossDefeated = String(bossDefeated);
    stage.dataset.map = currentMapId;
    stage.dataset.guildMarks = String(guildMarks);
    stage.dataset.contractStatus = guildCommissionState.status === "ready_to_report"
      ? "ready"
      : activeGuildCommission() ? guildCommissionState.status : "none";
    stage.dataset.questTracker = questTrackerMode;
    stage.dataset.skillBooks = String(totalOwnedSkillBooks());
    stage.dataset.facilityTab = facilityTab;
    if (force) drawMiniMap();
  }

  function zoneForPosition(position) {
    if (currentMapId === "guild") return "拾燈公會";
    if (currentMapId === "shop") return "銀火裝備店";
    if (currentMapId === "clinic") return "霧草療癒所";
    if (currentMapId === "general-store") return "霧穀雜貨舖";
    if (currentMapId === "inn") return "霧燈旅店";
    if (currentMapId === "dungeon") {
      const tx = position.x / world.tileSize;
      const ty = position.y / world.tileSize;
      if (ty <= 9 && tx >= 29) return "坑道 · 深霧核心";
      if (ty <= 9) return "坑道 · 封存庫";
      if (ty <= 18) return tx < 12 ? "坑道 · 苔石窟" : tx > 27 ? "坑道 · 殘燈迴廊" : "坑道 · 沉沒中庭";
      return "沉燈坑道 · 入口";
    }
    if (currentMapId === "field") {
      const tx = position.x / world.tileSize;
      const ty = position.y / world.tileSize;
      if (ty <= 5) return "霧梅爾山地 · 坑道口";
      if (ty <= 16) return "霧梅爾山地 · 北徑";
      if (tx >= 30) return "霧梅爾山地 · 山路彎";
      if (tx <= 7) return "霧梅爾山地 · 西口";
      return "霧梅爾山地 · 林間道";
    }
    return "霧都主城";
  }

  function showLocation(name, immediate = false) {
    currentZone = name;
    const banner = document.getElementById("locationBanner");
    banner.querySelector("strong").textContent = name;
    banner.classList.remove("show");
    if (!immediate) void banner.offsetWidth;
    banner.classList.add("show");
    hud.zone.textContent = name;
  }

  function showToast(message, style = "") {
    toastElement.textContent = message;
    toastElement.className = `game-toast ${style}`.trim();
    void toastElement.offsetWidth;
    toastElement.classList.add("show");
  }

  function announce(message) {
    ariaLive.textContent = "";
    window.setTimeout(() => { ariaLive.textContent = message; }, 20);
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  // Rendering functions are kept together below so the simulation above remains testable.
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0a1020";
    ctx.fillRect(0, 0, width, height);
    if (battle && mode === "battle") {
      drawBattle();
      if (screenFlash > .01) {
        ctx.fillStyle = `rgba(255,107,107,${screenFlash * .16})`;
        ctx.fillRect(0, 0, width, height);
      }
      return;
    }
    ctx.fillStyle = ["world", "field"].includes(currentMapId)
      ? "#132f30"
      : currentMapId === "dungeon"
        ? "#111826"
        : "#241f24";
    ctx.fillRect(0, 0, width, height);
    const shake = reducedMotion ? 0 : screenShake;
    const shakeX = (Math.random() - .5) * shake;
    const shakeY = (Math.random() - .5) * shake;
    drawTiles(shakeX, shakeY);
    drawTownWallOverlay(shakeX, shakeY);
    drawGroundDetails(shakeX, shakeY);
    drawTelegraphs(shakeX, shakeY);
    drawSortedWorld(shakeX, shakeY);
    drawProjectiles(shakeX, shakeY);
    drawEffects(shakeX, shakeY);
    drawAtmosphere();
    drawBossBar();
    if (screenFlash > .01) {
      ctx.fillStyle = `rgba(255,107,107,${screenFlash * .19})`;
      ctx.fillRect(0, 0, width, height);
    }
    drawMiniMap();
  }

  function battleLayout() {
    const top = width <= 530 ? 150 : 72;
    const reservedBottom = width <= 530 ? 300 : width <= 1120 ? 245 : 210;
    const availableHeight = Math.max(238, height - top - reservedBottom);
    const cell = Math.floor(Core.clamp(Math.min((width - 34) / BATTLE_WIDTH, availableHeight / BATTLE_HEIGHT), 30, 72));
    const gridWidth = cell * BATTLE_WIDTH;
    const gridHeight = cell * BATTLE_HEIGHT;
    return {
      cell,
      x: Math.round((width - gridWidth) / 2),
      y: Math.round(top + Math.max(0, (availableHeight - gridHeight) / 2)),
      width: gridWidth,
      height: gridHeight,
    };
  }

  function battleCellCentre(cell, layout = battleLayout()) {
    return {
      x: layout.x + (cell.x + .5) * layout.cell,
      y: layout.y + (cell.y + .5) * layout.cell,
    };
  }

  function battleVisualSeed(cell) {
    const source = String(battle?.source?.id || "mountain");
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= Math.imul((Number(cell?.x) || 0) + 17, 374761393);
    hash ^= Math.imul((Number(cell?.y) || 0) + 31, 668265263);
    return hash >>> 0;
  }

  function battleCellHeight(cell) {
    const key = Tactics.cellKey(cell);
    const value = battle?.battlefield?.heightMap?.[key] ?? battle?.grid?.heightMap?.[key] ?? 0;
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function drawMountainBoardFrame(layout) {
    const pad = Math.max(9, layout.cell * .16);
    ctx.save();
    ctx.shadowColor = "rgba(4, 8, 10, .72)";
    ctx.shadowBlur = Math.max(16, layout.cell * .28);
    ctx.fillStyle = "rgba(24, 27, 24, .9)";
    ctx.fillRect(layout.x - pad, layout.y - pad, layout.width + pad * 2, layout.height + pad * 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(98, 77, 48, .9)";
    ctx.fillRect(layout.x - pad, layout.y - pad, layout.width + pad * 2, pad);
    ctx.fillRect(layout.x - pad, layout.y + layout.height, layout.width + pad * 2, pad);
    ctx.fillStyle = "rgba(43, 35, 27, .92)";
    ctx.fillRect(layout.x - pad, layout.y, pad, layout.height);
    ctx.fillRect(layout.x + layout.width, layout.y, pad, layout.height);
    ctx.strokeStyle = "rgba(239, 204, 137, .48)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(layout.x - pad + .75, layout.y - pad + .75, layout.width + pad * 2 - 1.5, layout.height + pad * 2 - 1.5);
    ctx.strokeStyle = "rgba(31, 28, 24, .9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(layout.x - 2, layout.y - 2, layout.width + 4, layout.height + 4);
    ctx.strokeStyle = "rgba(255, 225, 161, .16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(layout.x + 3, layout.y + 3, layout.width - 6, layout.height - 6);
    // Small corner studs make the board read as a planted, raised battle deck
    // without competing with the actual cell grid.
    ctx.fillStyle = "rgba(255, 214, 132, .72)";
    for (const [x, y] of [[layout.x - pad * .52, layout.y - pad * .52], [layout.x + layout.width + pad * .52, layout.y - pad * .52], [layout.x - pad * .52, layout.y + layout.height + pad * .52], [layout.x + layout.width + pad * .52, layout.y + layout.height + pad * .52]]) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.8, layout.cell * .035), 0, Core.TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMountainGroundBoard(layout) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(layout.x + 1, layout.y + 1, layout.width - 2, layout.height - 2);
    ctx.clip();
    ctx.fillStyle = "#86613b";
    ctx.fillRect(layout.x, layout.y, layout.width, layout.height);
    const drawn = Art.drawBattleGround(ctx, {
      theme: "mountain",
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
      alpha: .9,
    });
    if (!drawn) {
      // Keep a real bitmap fallback for the first frame while the dedicated
      // mountain ground image is loading; normal runtime uses the board bitmap.
      for (let y = 0; y < BATTLE_HEIGHT; y += 1) {
        for (let x = 0; x < BATTLE_WIDTH; x += 1) {
          const seed = battleVisualSeed({ x, y });
          Art.drawTerrainTile(ctx, {
            sprite: "path",
            x: layout.x + x * layout.cell,
            y: layout.y + y * layout.cell,
            width: layout.cell,
            height: layout.cell,
            alpha: .52,
            flipX: Boolean(seed & 2),
          });
        }
      }
    }
    const boardTone = ctx.createLinearGradient(layout.x, layout.y, layout.x + layout.width, layout.y + layout.height);
    boardTone.addColorStop(0, "rgba(255, 219, 157, .05)");
    boardTone.addColorStop(.48, "rgba(87, 61, 35, 0)");
    boardTone.addColorStop(1, "rgba(30, 24, 18, .1)");
    ctx.fillStyle = boardTone;
    ctx.fillRect(layout.x, layout.y, layout.width, layout.height);
    ctx.restore();
  }

  function drawMountainGroundCell(cell, layout, blocked) {
    const seed = battleVisualSeed(cell);
    const px = layout.x + cell.x * layout.cell;
    const py = layout.y + cell.y * layout.cell;

    // Cell-local accents are sparse and deliberately smaller than a blocker.
    // The primary ground bitmap is drawn once for the whole board, so these
    // marks cannot form the old repeating vertical strips.
    if (!blocked && seed % 7 === 0) drawMountainGroundStones(px, py, layout.cell, seed);
    if (!blocked && seed % 11 === 0) drawMountainDryScrub(px + layout.cell * .52, py + layout.cell * .72, layout.cell, seed, .25);

    if (blocked) {
      ctx.fillStyle = "rgba(29, 23, 17, .13)";
      ctx.fillRect(px + 1, py + 1, layout.cell - 2, layout.cell - 2);
      ctx.fillStyle = "rgba(255, 220, 157, .08)";
      ctx.fillRect(px + 3, py + 3, layout.cell - 6, Math.max(2, layout.cell * .045));
    }

    const height = battleCellHeight(cell);
    if (height > 0) {
      const lip = Math.min(layout.cell * .16, height * layout.cell * .06);
      ctx.fillStyle = "rgba(255, 224, 159, .26)";
      ctx.fillRect(px + 1, py + 1, layout.cell - 2, Math.max(2, lip));
      ctx.fillStyle = "rgba(21, 17, 13, .26)";
      ctx.fillRect(px + 1, py + layout.cell - lip - 1, layout.cell - 2, Math.max(2, lip));
    }
  }

  function drawMountainGroundStones(px, py, size, seed) {
    const clusterX = px + size * (.2 + ((seed >>> 8) % 50) / 100);
    const clusterY = py + size * (.2 + ((seed >>> 15) % 48) / 100);
    ctx.save();
    ctx.globalAlpha = .2;
    for (let index = 0; index < 3; index += 1) {
      const radius = size * (.025 + ((seed >>> (index * 3)) % 4) * .008);
      const x = clusterX + (index - 1) * size * .075;
      const y = clusterY + ((seed >>> (index * 5 + 4)) % 9 - 4) * size * .018;
      ctx.fillStyle = index === 0 ? "#d0ae7b" : "#4f4032";
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 1.55, radius, (seed % 5) * .2, 0, Core.TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMountainDryScrub(x, y, size, seed, alpha = .38) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = seed % 3 === 0 ? "#9a8153" : "#b29561";
    ctx.lineWidth = Math.max(1, size * .018);
    const count = 3 + (seed % 3);
    for (let blade = 0; blade < count; blade += 1) {
      const offset = (blade - (count - 1) / 2) * size * .038;
      ctx.beginPath();
      ctx.moveTo(x + offset, y + size * .06);
      ctx.quadraticCurveTo(x + offset - size * .04, y - size * .01, x + offset + (blade % 2 ? size * .045 : -size * .02), y - size * .11);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMountainBattleBackdrop(layout) {
    const drewBackdrop = Art.drawBattleBackground(ctx, {
      theme: "mountain",
      x: 0,
      y: 0,
      width,
      height,
      alpha: .92,
    });
    if (!drewBackdrop) {
      const fallback = ctx.createLinearGradient(0, 0, 0, height);
      fallback.addColorStop(0, "#6f8d8b");
      fallback.addColorStop(.55, "#ad8753");
      fallback.addColorStop(1, "#2d342c");
      ctx.fillStyle = fallback;
      ctx.fillRect(0, 0, width, height);
    }
    const atmosphere = ctx.createLinearGradient(0, 0, 0, height);
    atmosphere.addColorStop(0, "rgba(15, 28, 31, .18)");
    atmosphere.addColorStop(.48, "rgba(49, 44, 34, .06)");
    atmosphere.addColorStop(1, "rgba(8, 13, 14, .54)");
    ctx.fillStyle = atmosphere;
    ctx.fillRect(0, 0, width, height);

    // A quiet grounding shadow separates the tactical board from the scenic
    // panorama while keeping the mountain silhouette visible around it.
    ctx.save();
    ctx.shadowColor = "rgba(5, 9, 10, .78)";
    ctx.shadowBlur = Math.max(22, layout.cell * .42);
    ctx.fillStyle = "rgba(24, 26, 22, .36)";
    ctx.fillRect(layout.x - 6, layout.y - 6, layout.width + 12, layout.height + 12);
    ctx.restore();
    drawMountainBoardFrame(layout);
  }

  function drawBattle() {
    if (!battle) return;
    const layout = battleLayout();
    const bossFight = battle.source.boss;
    const mountainBattle = battle.battlefield?.theme === "mountain";
    if (mountainBattle) {
      drawMountainBattleBackdrop(layout);
      drawMountainGroundBoard(layout);
    } else {
      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, bossFight ? "#241a37" : "#142c38");
      background.addColorStop(.58, bossFight ? "#16213a" : "#183d40");
      background.addColorStop(1, "#08101f");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalAlpha = .16;
      for (let index = 0; index < 8; index += 1) {
        const x = ((index * 233 + elapsed * (8 + index)) % (width + 240)) - 120;
        const y = 80 + ((index * 97) % Math.max(100, height - 170));
        const fog = ctx.createRadialGradient(x, y, 0, x, y, 90 + index * 9);
        fog.addColorStop(0, bossFight ? "rgba(174,145,255,.3)" : "rgba(82,220,203,.22)");
        fog.addColorStop(1, "rgba(20,30,50,0)");
        ctx.fillStyle = fog;
        ctx.fillRect(x - 140, y - 110, 280, 220);
      }
      ctx.restore();

      ctx.fillStyle = "rgba(4,8,18,.42)";
      ctx.fillRect(layout.x - 9, layout.y - 9, layout.width + 18, layout.height + 18);
      ctx.strokeStyle = bossFight ? "rgba(255,107,145,.52)" : "rgba(245,233,202,.38)";
      ctx.lineWidth = 2;
      ctx.strokeRect(layout.x - 9, layout.y - 9, layout.width + 18, layout.height + 18);
    }

    const selectedSkill = battleSkillFromAction(battle.selectedAction);
    const selectable = new Set(battleTargetTiles().map((cell) => Tactics.cellKey(cell)));
    const skillRange = new Set((selectedSkill ? battleSkillRangeTiles(selectedSkill) : []).map((cell) => Tactics.cellKey(cell)));
    const attackableEnemies = new Set(selectedSkill
      ? livingBattleEnemies().filter((unit) => skillTargetValidation(selectedSkill, unit.cell).ok).map((unit) => Tactics.cellKey(unit.cell))
      : []);
    const areaPreview = new Set();
    if (selectedSkill && battle.phase === "planning_action" && skillTargetValidation(selectedSkill, battle.cursor).ok) {
      for (const cell of Skills.patternCells(selectedSkill, battle.hero.cell, battle.cursor, { grid: battle.grid, facing: battle.hero.facing })) areaPreview.add(Tactics.cellKey(cell));
    }
    const attackPathPreview = selectedSkill?.deliveryMode === "linear"
      && battle.phase === "planning_action"
      && skillTargetValidation(selectedSkill, battle.cursor).ok
      ? Tactics.facingOrthogonalPriority(battle.hero.cell, battle.cursor, battle.hero.facing)
      : [];
    for (let y = 0; y < BATTLE_HEIGHT; y += 1) {
      for (let x = 0; x < BATTLE_WIDTH; x += 1) {
        const cell = { x, y };
        const key = Tactics.cellKey(cell);
        const px = layout.x + x * layout.cell;
        const py = layout.y + y * layout.cell;
        const blocked = battle.grid.blocked.has(key);
        if (mountainBattle) {
          drawMountainGroundCell(cell, layout, blocked);
        } else {
          ctx.fillStyle = blocked
            ? "rgba(10,15,29,.88)"
            : (x + y) % 2 ? "rgba(69,91,94,.58)" : "rgba(56,78,84,.65)";
          ctx.fillRect(px + 1, py + 1, layout.cell - 2, layout.cell - 2);
        }
        if (!blocked && skillRange.has(key) && battle.phase === "planning_action") {
          ctx.fillStyle = "rgba(255,218,117,.25)";
          ctx.fillRect(px + 3, py + 3, layout.cell - 6, layout.cell - 6);
          ctx.strokeStyle = "rgba(255,225,143,.88)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 5, py + 5, layout.cell - 10, layout.cell - 10);
        }
        if (!blocked && areaPreview.has(key)) {
          ctx.fillStyle = selectedSkill?.star === 3 ? "rgba(255,157,211,.24)" : selectedSkill?.star === 2 ? "rgba(169,201,255,.22)" : "rgba(255,200,87,.19)";
          ctx.fillRect(px + 4, py + 4, layout.cell - 8, layout.cell - 8);
        }
        if (!blocked && selectable.has(key) && battle.phase === "planning_move") {
          ctx.fillStyle = "rgba(82,220,203,.18)";
          ctx.fillRect(px + 5, py + 5, layout.cell - 10, layout.cell - 10);
          ctx.strokeStyle = "rgba(82,220,203,.78)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 6, py + 6, layout.cell - 12, layout.cell - 12);
        }
        if (!blocked && attackableEnemies.has(key) && battle.phase === "planning_action") {
          ctx.fillStyle = `rgba(255,91,91,${.35 + Math.sin(elapsed * 5) * .04})`;
          ctx.fillRect(px + 3, py + 3, layout.cell - 6, layout.cell - 6);
          ctx.strokeStyle = "rgba(255,118,118,.98)";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(px + 4, py + 4, layout.cell - 8, layout.cell - 8);
        }
        ctx.strokeStyle = mountainBattle ? "rgba(53,39,25,.28)" : "rgba(245,233,202,.11)";
        ctx.lineWidth = 1;
        ctx.strokeRect(px + .5, py + .5, layout.cell - 1, layout.cell - 1);
        if (blocked) drawBattleObstacle(cell, layout, mountainBattle);
      }
    }

    if (attackPathPreview.length) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,157,211,.82)";
      ctx.lineWidth = Math.max(2, layout.cell * .045);
      ctx.setLineDash([Math.max(4, layout.cell * .12), Math.max(3, layout.cell * .08)]);
      ctx.lineCap = "round";
      ctx.beginPath();
      const start = battleCellCentre(battle.hero.cell, layout);
      ctx.moveTo(start.x, start.y);
      for (const cell of attackPathPreview) {
        const point = battleCellCentre(cell, layout);
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (battle.phase === "planning_move") {
      const previewPath = battle.heroMoveDraft || [battle.hero.cell];
      if (previewPath.length) {
        ctx.save();
        ctx.strokeStyle = "rgba(82,220,203,.9)";
        ctx.lineWidth = Math.max(2, layout.cell * .055);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        previewPath.forEach((cell, index) => {
          const point = battleCellCentre(cell, layout);
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        previewPath.forEach((cell, index) => {
          const point = battleCellCentre(cell, layout);
          ctx.fillStyle = index === previewPath.length - 1 ? "#f5e9ca" : "#52dccb";
          ctx.beginPath();
          ctx.arc(point.x, point.y, Math.max(2.4, layout.cell * .055), 0, Core.TAU);
          ctx.fill();
        });
        ctx.restore();
      }
    }

    const units = battleUnits().filter((unit) => unit.alive).sort((a, b) => (a.renderCell || a.cell).y - (b.renderCell || b.cell).y || (a.renderCell || a.cell).x - (b.renderCell || b.cell).x);
    for (const unit of units) {
      if (mountainBattle) drawMountainUnitShadow(unit, layout);
      drawBattleUnit(unit, layout);
    }

    if (battle.cursor && ["planning_move", "planning_action"].includes(battle.phase)) {
      const x = layout.x + battle.cursor.x * layout.cell;
      const y = layout.y + battle.cursor.y * layout.cell;
      ctx.strokeStyle = "#f5e9ca";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x + 3, y + 3, layout.cell - 6, layout.cell - 6);
      ctx.fillStyle = "#ffc857";
      [[x+3,y+3],[x+layout.cell-3,y+3],[x+3,y+layout.cell-3],[x+layout.cell-3,y+layout.cell-3]].forEach(([cx, cy]) => ctx.fillRect(cx - 2, cy - 2, 4, 4));
    }
    drawBattleEffects(layout);

    const vignette = ctx.createRadialGradient(width / 2, layout.y + layout.height / 2, layout.width * .12, width / 2, layout.y + layout.height / 2, Math.max(width, height) * .7);
    vignette.addColorStop(0, "rgba(5,8,17,0)");
    vignette.addColorStop(1, "rgba(3,6,14,.62)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function drawBattleObstacle(cell, layout, mountainBattle = false) {
    const point = battleCellCentre(cell, layout);
    const size = layout.cell;
    if (mountainBattle) {
      const seed = battleVisualSeed(cell);
      ctx.save();
      ctx.fillStyle = "rgba(15, 16, 13, .52)";
      ctx.beginPath();
      ctx.ellipse(point.x + size * .035, point.y + size * .34, size * (.34 + (seed % 3) * .035), size * .105, 0, 0, Core.TAU);
      ctx.fill();
      ctx.restore();

      drawMountainLooseStones(point.x, point.y + size * .31, size, seed);
      const rockScale = [.9, 1.04, 1.16, .98][seed % 4];
      const rockX = point.x + (((seed >>> 6) % 9) - 4) * size * .012;
      const rockY = point.y + size * (.38 + ((seed >>> 11) % 5) * .012);
      let drawn = false;
      ctx.save();
      if (seed % 4 === 1) ctx.filter = "saturate(.82) brightness(.9)";
      if (seed % 4 === 2) ctx.filter = "saturate(1.08) brightness(1.04)";
      drawn = Art.drawEnvironmentSprite(ctx, {
        sprite: "rock",
        x: rockX,
        y: rockY,
        width: size * rockScale,
        height: size * rockScale * ([.96, 1.04, 1, .9][seed % 4]),
        alpha: .98,
        flipX: Boolean(seed & 4),
      });
      ctx.restore();

      if (drawn) {
        if (seed % 3 !== 1) {
          const scrubX = point.x + (seed % 2 ? size * .27 : -size * .27);
          drawMountainDryScrub(scrubX, point.y + size * .27, size, seed >>> 2, .42);
        }
        if (seed % 4 === 0) drawMountainDryScrub(point.x - size * .08, point.y + size * .36, size * .72, seed >>> 4, .3);
        return;
      }
    }
    ctx.save();
    ctx.translate(point.x, point.y + size * .18);
    ctx.fillStyle = "rgba(3,6,14,.4)";
    ctx.beginPath(); ctx.ellipse(0, size * .18, size * .27, size * .09, 0, 0, Core.TAU); ctx.fill();
    ctx.fillStyle = battle.source.boss ? "#566079" : "#465b5f";
    ctx.strokeStyle = "rgba(245,233,202,.24)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-size * .22, size * .13);
    ctx.lineTo(-size * .17, -size * .16);
    ctx.lineTo(size * .02, -size * .28);
    ctx.lineTo(size * .23, -size * .08);
    ctx.lineTo(size * .18, size * .15);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = battle.source.boss ? "rgba(174,145,255,.35)" : "rgba(82,220,203,.2)";
    ctx.beginPath(); ctx.arc(-size * .06, -size * .13, size * .06, 0, Core.TAU); ctx.fill();
    ctx.restore();
  }

  function drawMountainLooseStones(x, y, size, seed) {
    if (seed % 3 === 2) return;
    ctx.save();
    ctx.globalAlpha = .55;
    const count = seed % 2 ? 2 : 3;
    for (let index = 0; index < count; index += 1) {
      const offsetX = (index - (count - 1) / 2) * size * .16 + (((seed >>> (index + 8)) % 5) - 2) * size * .02;
      const offsetY = size * (.04 + ((seed >>> (index + 12)) % 6) * .015);
      const radius = size * (.035 + ((seed >>> (index + 16)) % 4) * .012);
      ctx.fillStyle = index === 0 ? "#5c4c3b" : "#a58b63";
      ctx.beginPath();
      ctx.ellipse(x + offsetX, y + offsetY, radius * 1.55, radius, (seed % 7) * .12, 0, Core.TAU);
      ctx.fill();
      if (index === 0) {
        ctx.fillStyle = "rgba(232, 204, 153, .36)";
        ctx.beginPath();
        ctx.ellipse(x + offsetX - radius * .35, y + offsetY - radius * .35, radius * .55, radius * .25, 0, 0, Core.TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawMountainUnitShadow(unit, layout) {
    const point = battleCellCentre(unit.renderCell || unit.cell, layout);
    const size = layout.cell;
    const facing = Tactics.facingVector(unit.facing);
    const shadowX = point.x - facing.x * size * .035 + size * .03;
    const shadowY = point.y + size * .31 - facing.y * size * .02;
    ctx.save();
    const gradient = ctx.createRadialGradient(shadowX, shadowY, size * .02, shadowX, shadowY, size * .3);
    gradient.addColorStop(0, "rgba(22, 18, 14, .46)");
    gradient.addColorStop(.58, "rgba(32, 25, 18, .23)");
    gradient.addColorStop(1, "rgba(32, 25, 18, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(shadowX, shadowY, size * .3, size * .09, 0, 0, Core.TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(29, 22, 16, .28)";
    ctx.beginPath();
    ctx.ellipse(point.x, point.y + size * .285, size * .13, size * .04, 0, 0, Core.TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawBattleUnit(unit, layout) {
    const point = battleCellCentre(unit.renderCell || unit.cell, layout);
    const scale = layout.cell / 43;
    const baseline = point.y + layout.cell * .29;
    const acting = battle.phase === "resolving_action" && (battle.actingUnitId === unit.id || battle.actingUnitIds?.includes(unit.id));
    const locomotion = unit.locomotion || Locomotion.create(unit.facing);
    const hurt = unit.hitFlash > 0;
    let artBox = null;
    if (unit.side === "ally") {
      artBox = Art.drawCharacter(ctx, {
        x: point.x,
        y: baseline,
        scale,
        actor: "player",
        classId: playerClassId,
        facing: unit.facing,
        state: hurt ? "hurt" : acting ? "attack" : locomotion.state,
        locomotion,
        phase: elapsed,
        progress: .55,
        expression: hurt ? "hurt" : acting ? "determined" : "happy",
        selected: ["planning_move", "planning_action"].includes(battle.phase),
      });
      for (let index = 0; index < Math.min(battle.ap, 10); index += 1) {
        const angle = index / Math.max(1, Math.min(battle.ap, 10)) * Core.TAU + elapsed * .35;
        ctx.fillStyle = index < 5 ? "#ffc857" : "#52dccb";
        ctx.beginPath();
        ctx.arc(point.x + Math.cos(angle) * layout.cell * .3, baseline - layout.cell * .35 + Math.sin(angle) * 5, Math.max(1.5, layout.cell * .026), 0, Core.TAU);
        ctx.fill();
      }
    } else {
      artBox = Art.drawEnemy(ctx, {
        x: point.x,
        y: baseline,
        scale: scale * (unit.boss ? .98 : .92),
        type: unit.type,
        facing: unit.facing,
        phase: elapsed,
        state: hurt ? "hurt" : acting ? "attack" : locomotion.state,
        locomotion,
        selected: false,
      });
    }
    const facing = Tactics.facingVector(unit.facing);
    const perpendicular = { x: -facing.y, y: facing.x };
    const arrow = {
      x: point.x + facing.x * layout.cell * .32,
      y: point.y + facing.y * layout.cell * .32,
    };
    const arrowSize = Math.max(3.5, layout.cell * .075);
    ctx.save();
    ctx.fillStyle = unit.side === "ally" ? "#52dccb" : "#ff7199";
    ctx.strokeStyle = "rgba(5,8,18,.9)";
    ctx.lineWidth = Math.max(1.5, layout.cell * .025);
    ctx.beginPath();
    ctx.moveTo(arrow.x + facing.x * arrowSize, arrow.y + facing.y * arrowSize);
    ctx.lineTo(arrow.x - facing.x * arrowSize * .7 + perpendicular.x * arrowSize * .8, arrow.y - facing.y * arrowSize * .7 + perpendicular.y * arrowSize * .8);
    ctx.lineTo(arrow.x - facing.x * arrowSize * .7 - perpendicular.x * arrowSize * .8, arrow.y - facing.y * arrowSize * .7 - perpendicular.y * arrowSize * .8);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
    const barWidth = layout.cell * (unit.boss ? .76 : .56);
    const barY = (artBox?.bottom ?? point.y + layout.cell * .31) + Math.max(3, layout.cell * .04);
    const barHeight = Math.max(5, layout.cell * .085);
    ctx.fillStyle = "rgba(5,8,18,.86)";
    ctx.fillRect(point.x - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);
    ctx.fillStyle = unit.side === "ally" ? "#52dccb" : unit.boss ? "#ff6b91" : "#ff6b6b";
    ctx.fillRect(point.x - barWidth / 2, barY, barWidth * Core.clamp(unit.hp / unit.maxHp, 0, 1), barHeight);
    const nameX = artBox?.nameAnchorX ?? point.x;
    const nameY = artBox?.nameAnchorY ?? point.y - layout.cell * .53;
    ctx.font = `900 ${Math.max(14, layout.cell * .19)}px ui-sans-serif, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.strokeStyle = "rgba(3,6,14,.96)";
    ctx.lineWidth = Math.max(3, layout.cell * .055);
    ctx.strokeText(unit.name, nameX, nameY);
    ctx.fillStyle = "#fff4d0";
    ctx.fillText(unit.name, nameX, nameY);
    ctx.textBaseline = "alphabetic";
  }

  function drawBattleEffects(layout) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const effect of battle.effects) {
      const point = battleCellCentre(effect.cell, layout);
      const progress = 1 - effect.life / effect.maxLife;
      const textX = point.x + layout.cell * (Number(effect.offsetX) || 0);
      const textY = point.y + layout.cell * (Number(effect.offsetY) || 0) - layout.cell * (.2 + progress * .38);
      ctx.globalAlpha = Core.clamp(effect.life / effect.maxLife, 0, 1);
      if (effect.burst) {
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(point.x, point.y, layout.cell * (.16 + progress * .48), 0, Core.TAU);
        ctx.stroke();
      }
      const fontScale = effect.kind === "positionBonus" ? .19 : .25;
      ctx.font = `950 ${Math.max(13, layout.cell * fontScale)}px ui-monospace, monospace`;
      ctx.strokeStyle = "rgba(5,8,18,.9)";
      ctx.lineWidth = 5;
      ctx.strokeText(effect.text, textX, textY);
      ctx.fillStyle = effect.color;
      ctx.fillText(effect.text, textX, textY);
    }
    ctx.restore();
  }

  function battleCellFromPointer(event) {
    if (!battle) return null;
    const rect = canvas.getBoundingClientRect();
    const layout = battleLayout();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cell = { x: Math.floor((x - layout.x) / layout.cell), y: Math.floor((y - layout.y) / layout.cell) };
    return Tactics.isInside(battle.grid, cell) ? cell : null;
  }

  function handleBattlePointer(event) {
    if (mode !== "battle" || !battle || !["planning_move", "planning_action"].includes(battle.phase)) return;
    const cell = battleCellFromPointer(event);
    if (!cell) return;
    event.preventDefault();
    confirmBattleCell(cell);
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const screenX = (clientX - rect.left) * (width / Math.max(1, rect.width));
    const screenY = (clientY - rect.top) * (height / Math.max(1, rect.height));
    return {
      x: Core.clamp((screenX - width * .5) / camera.zoom + camera.x, player.radius, world.pixelWidth - player.radius),
      y: Core.clamp((screenY - height * .5) / camera.zoom + camera.y, player.radius, world.pixelHeight - player.radius),
      screenX,
      screenY,
    };
  }

  function currentFieldGateInteraction() {
    if (currentMapId !== "field" || !world.gate) return null;
    return {
      ...world.gate,
      x: world.gate.x + world.gate.w / 2,
      y: world.gate.y + world.gate.h / 2,
      radius: Math.max(18, Math.min(52, world.gate.w / 4)),
      kind: "gate",
    };
  }

  function clickedExploreEntity(screenX, screenY) {
    if (world.navigation?.authoritative && typeof world.navigation.interactionAtWorldPoint === "function") {
      const authoredPoint = {
        x: (screenX - width * .5) / camera.zoom + camera.x,
        y: (screenY - height * .5) / camera.zoom + camera.y,
      };
      const authoredNpcId = world.navigation.interactionAtWorldPoint(authoredPoint);
      if (authoredNpcId) {
        const authoredNpc = world.npcs.find((npc) => npc.id === authoredNpcId);
        if (authoredNpc) return authoredNpc;
      }
    }
    const fieldGate = currentFieldGateInteraction();
    if (fieldGate) {
      const gateOrigin = worldToScreen(world.gate);
      const gatePadding = 12 * camera.zoom;
      if (
        screenX >= gateOrigin.x - gatePadding
        && screenX <= gateOrigin.x + world.gate.w * camera.zoom + gatePadding
        && screenY >= gateOrigin.y - gatePadding
        && screenY <= gateOrigin.y + world.gate.h * camera.zoom + gatePadding
      ) return fieldGate;
    }
    const candidates = [
      ...world.npcs,
      ...world.boards,
      ...world.signs,
      ...world.chests.filter((chest) => !openedChests.has(chest.id)),
      ...(world.shrine ? [world.shrine] : []),
      ...(fieldGate ? [fieldGate] : []),
      ...world.portals,
      ...enemies.filter((enemy) => enemy.alive && (!enemy.mainBoss || questStage >= 3)),
    ];
    const anchored = candidates.map((entity) => {
      const point = worldToScreen(entity);
      const radius = (entity.kind === "npc" ? 38 : entity.type ? 42 : entity.kind === "questBoard" ? 46 : 34) * camera.zoom;
      return { entity, distance: Math.hypot(screenX - point.x, screenY - point.y), radius };
    }).filter((item) => item.distance <= item.radius).sort((left, right) => left.distance - right.distance);
    if (anchored.length) return anchored[0].entity;
    return null;
  }

  function setExploreClickTarget(target, entity = null) {
    const fieldGate = currentFieldGateInteraction();
    // Clicking the dungeon marker while the seal is still shut should route
    // to the reachable side of the seal and interact with it, not silently
    // stop at the nearest path node below an unreachable portal.
    if (fieldGate && !isGateOpen() && entity?.id === world.dungeonPortalId) {
      target = fieldGate;
      entity = fieldGate;
    }
    explorePortalIntentId = null;
    const distance = entity ? Core.distance(player, entity) : Infinity;
    const interactionRange = entity && !entity.type ? (["questBoard", "gate"].includes(entity.kind) ? 76 : 54) : 0;
    if (entity && !entity.type && entity.kind !== "portal" && distance <= interactionRange) {
      nearestInteraction = entity;
      pendingClickInteractionId = null;
      clearExploreMovePath();
      interact();
      return;
    }
    let destination = { x: target.x, y: target.y };
    if (entity?.kind === "portal" && MapTransitions.transitionTypeFor(entity) === TRANSITION_TYPES.PHYSICAL_DOOR) {
      // World-building doors use their authored exterior approach point. An
      // authoritative interior map can instead own an exact pixel exit
      // region; clicking that portal must walk to the resolved portal point
      // so the shared navigation mask can perform the normal transition.
      if (world.navigation?.authoritative && entity.navigationRegion) {
        destination = { x: entity.x, y: entity.y };
        explorePortalIntentId = null;
      } else {
        const entrance = MapTransitions.entranceFor(entity);
        destination = entrance?.approachPoint || entity.approachPoint || { x: entity.x, y: entity.y };
        explorePortalIntentId = entity.id;
      }
      pendingClickInteractionId = null;
    } else if (entity && !entity.type && entity.kind !== "portal") {
      const away = Core.normalize({ x: player.x - entity.x, y: player.y - entity.y });
      destination = { x: entity.x + away.x * 34, y: entity.y + away.y * 34 };
      pendingClickInteractionId = entity.id;
    } else {
      pendingClickInteractionId = null;
    }
    if (!planExploreMove(destination)) {
      pendingClickInteractionId = null;
      explorePortalIntentId = null;
      showToast("嗰邊行唔到；撳近少少嘅空地再試。", "danger");
      return;
    }
    spawnBurst(destination.x, destination.y, entity?.type ? "#ff8b62" : "#52dccb", 5, 24);
  }

  function retargetExploreHoldGesture(gesture, force = false) {
    if (!gesture || mode !== "playing") return;
    const now = performance.now();
    if (!force && now - gesture.lastRetargetAt < EXPLORE_RETARGET_INTERVAL_MS) return;
    gesture.lastRetargetAt = now;
    const target = screenToWorld(gesture.clientX, gesture.clientY);
    const entity = gesture.followReleasedEntity ? gesture.targetEntity : clickedExploreEntity(target.screenX, target.screenY);
    if (gesture.followReleasedEntity && (!entity || entity.alive === false || (entity.kind === "chest" && openedChests.has(entity.id)))) {
      clearExplorePointerGesture();
      clearExploreMovePath();
      pendingClickInteractionId = null;
      return;
    }
    gesture.targetEntity = entity;
    const key = entity
      ? `entity:${entity.id}:${Math.round(entity.x / 8)}:${Math.round(entity.y / 8)}`
      : `ground:${Math.round(target.x / 16)}:${Math.round(target.y / 16)}`;
    if (!force && gesture.lastTargetKey === key) return;
    gesture.lastTargetKey = key;
    setExploreClickTarget(entity || target, entity);
    if (mode !== "playing") clearExplorePointerGesture();
  }

  function updateExplorePointerTracking() {
    const gesture = explorePointerGesture;
    if (!gesture) return;
    if (mode !== "playing" || gesture.mapId !== currentMapId) {
      clearExplorePointerGesture();
      return;
    }
    if (gesture.holdActive) retargetExploreHoldGesture(gesture);
  }

  function clearExplorePointerGesture(pointerId = null, releaseCapture = true) {
    const gesture = explorePointerGesture;
    if (!gesture || (pointerId != null && gesture.pointerId !== pointerId)) return;
    window.clearTimeout(gesture.holdTimer);
    explorePointerGesture = null;
    if (!releaseCapture) return;
    try {
      if (canvas.hasPointerCapture?.(gesture.pointerId)) canvas.releasePointerCapture(gesture.pointerId);
    } catch (_) {}
  }

  function handleCanvasPointer(event) {
    if (mode === "battle") return handleBattlePointer(event);
    if (mode !== "playing" || event.button > 0) return;
    // A new press exits latched mouse-follow before issuing its single target.
    clearExplorePointerGesture();
    const target = screenToWorld(event.clientX, event.clientY);
    const entity = clickedExploreEntity(target.screenX, target.screenY);
    event.preventDefault();
    setExploreClickTarget(entity || target, entity);
    if (mode !== "playing") return;
    const gesture = {
      pointerId: event.pointerId,
      pointerType: event.pointerType || "mouse",
      mapId: currentMapId,
      pressed: true,
      clientX: event.clientX,
      clientY: event.clientY,
      startedAt: performance.now(),
      holdActive: false,
      holdTimer: 0,
      lastTargetKey: null,
      lastRetargetAt: -Infinity,
      targetEntity: entity,
      followReleasedEntity: false,
    };
    explorePointerGesture = gesture;
    try { canvas.setPointerCapture?.(event.pointerId); } catch (_) {}
    gesture.holdTimer = window.setTimeout(() => {
      if (explorePointerGesture !== gesture || mode !== "playing") return;
      gesture.holdActive = true;
      retargetExploreHoldGesture(gesture, true);
    }, EXPLORE_HOLD_DELAY_MS);
  }

  function handleCanvasPointerMove(event) {
    if (mode === "battle" && ["planning_move", "planning_action"].includes(battle?.phase)) {
      const cell = battleCellFromPointer(event);
      if (cell) battle.cursor = cell;
      return;
    }
    const gesture = explorePointerGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (gesture.followReleasedEntity) return;
    gesture.clientX = event.clientX;
    gesture.clientY = event.clientY;
    if (!gesture.holdActive || mode !== "playing") return;
    event.preventDefault();
    retargetExploreHoldGesture(gesture);
  }

  function finishCanvasPointer(event) {
    const gesture = explorePointerGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gesture.clientX = event.clientX;
    gesture.clientY = event.clientY;
    if (!gesture.holdActive && performance.now() - gesture.startedAt >= EXPLORE_HOLD_DELAY_MS) {
      gesture.holdActive = true;
    }
    if (gesture.holdActive) retargetExploreHoldGesture(gesture, true);
    if (explorePointerGesture !== gesture) return;
    gesture.pressed = false;
    if (!gesture.holdActive || (gesture.pointerType !== "mouse" && !gesture.targetEntity)) {
      clearExplorePointerGesture(event.pointerId);
      return;
    }
    // Mouse follow remains active after release. Touch has no hover cursor, so
    // it retains only a selected entity; a ground release keeps its last path.
    gesture.followReleasedEntity = gesture.pointerType !== "mouse";
    window.clearTimeout(gesture.holdTimer);
    try {
      if (canvas.hasPointerCapture?.(gesture.pointerId)) canvas.releasePointerCapture(gesture.pointerId);
    } catch (_) {}
  }

  function cancelExplorePointerTracking(pointerId = null, releaseCapture = true) {
    if (!explorePointerGesture || (pointerId != null && explorePointerGesture.pointerId !== pointerId)) return;
    clearExplorePointerGesture(pointerId, releaseCapture);
    clearExploreMovePath();
    pendingClickInteractionId = null;
  }

  function visualTerrainTile(tile) {
    if (tile !== world.tileTypes.WALL) return tile;
    if (currentMapId === "field") return world.forestLayout?.visualGroundTile ?? world.tileTypes.GRASS;
    if (currentMapId === "world") return world.tileTypes.STONE;
    return tile;
  }

  function terrainSpriteFor(tile) {
    if (["guild", "clinic", "inn"].includes(currentMapId)) {
      return tile === world.tileTypes.PATH ? "guildRug" : tile === world.tileTypes.WOOD ? "guildWood" : tile === world.tileTypes.WALL ? "interiorWall" : tile === world.tileTypes.WATER ? "water" : "stone";
    }
    if (["shop", "general-store"].includes(currentMapId)) {
      return tile === world.tileTypes.STONE || tile === world.tileTypes.PATH ? "shopRug" : tile === world.tileTypes.WOOD ? "shopWood" : tile === world.tileTypes.WALL ? "interiorWall" : tile === world.tileTypes.WATER ? "water" : "stone";
    }
    if (currentMapId === "dungeon") return tile === world.tileTypes.WATER ? "water" : tile === world.tileTypes.WOOD ? "bridge" : "dungeonStone";
    return tile === world.tileTypes.GRASS ? "grass" : tile === world.tileTypes.PATH ? "path" : tile === world.tileTypes.WATER ? "water" : tile === world.tileTypes.STONE ? "stone" : tile === world.tileTypes.WOOD ? "bridge" : "dungeonStone";
  }

  function drawMiniMap() {
    const mapWidth = miniMap.width;
    const mapHeight = miniMap.height;
    const centreX = mapWidth / 2;
    const centreY = mapHeight / 2;
    const radius = Math.min(mapWidth, mapHeight) * .485;
    const flattenedTownArt = currentMapId === "world" && world.art?.flattened;
    const flattenedInteriorArt = world.art?.flattened && Boolean(world.art?.backgroundScene);
    const flattenedMapArt = flattenedTownArt || flattenedInteriorArt;
    const visibleTiles = ["world", "field"].includes(currentMapId) ? 22 : 18;
    const scale = flattenedMapArt
      ? Math.min((mapWidth - 12) / world.pixelWidth, (mapHeight - 12) / world.pixelHeight)
      : Math.min(mapWidth, mapHeight) / (visibleTiles * world.tileSize);
    const originX = flattenedMapArt ? (mapWidth - world.pixelWidth * scale) / 2 : centreX - player.x * scale;
    const originY = flattenedMapArt ? (mapHeight - world.pixelHeight * scale) / 2 : centreY - player.y * scale;
    const minTileX = flattenedMapArt ? 0 : Core.clamp(Math.floor((player.x - visibleTiles * world.tileSize * .58) / world.tileSize), 0, world.width - 1);
    const maxTileX = flattenedMapArt ? -1 : Core.clamp(Math.ceil((player.x + visibleTiles * world.tileSize * .58) / world.tileSize), 0, world.width - 1);
    const minTileY = flattenedMapArt ? 0 : Core.clamp(Math.floor((player.y - visibleTiles * world.tileSize * .58) / world.tileSize), 0, world.height - 1);
    const maxTileY = flattenedMapArt ? -1 : Core.clamp(Math.ceil((player.y + visibleTiles * world.tileSize * .58) / world.tileSize), 0, world.height - 1);
    miniCtx.clearRect(0, 0, mapWidth, mapHeight);
    miniCtx.save();
    miniCtx.beginPath();
    miniCtx.arc(centreX, centreY, radius, 0, Core.TAU);
    miniCtx.clip();
    miniCtx.fillStyle = currentMapId === "dungeon" ? "#151c2b" : ["guild", "shop", "clinic", "general-store", "inn"].includes(currentMapId) ? "#3b2b27" : "#173d3c";
    miniCtx.fillRect(0, 0, mapWidth, mapHeight);
    if (flattenedMapArt) {
      if (flattenedInteriorArt) Art.drawFlattenedBackground(miniCtx, world.art.backgroundScene, {
        x: originX, y: originY, width: world.pixelWidth * scale, height: world.pixelHeight * scale, alpha: .9,
      });
      else Art.drawMainTownBackground(miniCtx, {
        x: originX, y: originY, width: world.pixelWidth * scale, height: world.pixelHeight * scale, alpha: .9,
      });
    }
    const tilePixels = world.tileSize * scale + .7;
    if (!flattenedMapArt) {
      for (let ty = minTileY; ty <= maxTileY; ty += 1) {
        for (let tx = minTileX; tx <= maxTileX; tx += 1) {
          const tile = visualTerrainTile(world.tiles[ty][tx]);
          const noise = Core.hash2D(tx, ty, 211);
          const x = originX + tx * world.tileSize * scale;
          const y = originY + ty * world.tileSize * scale;
          const terrainSprite = terrainSpriteFor(tile);
          if (!Art.drawTerrainTile(miniCtx, {
            sprite: terrainSprite,
            x,
            y,
            width: tilePixels,
            height: tilePixels,
            flipX: noise > .5,
            flipY: ((tx + ty) & 1) === 1,
          })) {
            miniCtx.fillStyle = tile === world.tileTypes.WATER ? "#20495f" : tile === world.tileTypes.PATH ? "#8e704d" : tile === world.tileTypes.WOOD ? "#9a633c" : tile === world.tileTypes.STONE || tile === world.tileTypes.WALL ? "#586474" : "#315d4d";
            miniCtx.fillRect(x, y, tilePixels, tilePixels);
          }
        }
      }
    }

    const environmentIndex = Art.environmentSpriteIndices || {};
    const scenery = [];
    const inMiniView = (x, y, padding = 12) => Math.hypot(x - centreX, y - centreY) <= radius + padding;
    const mapPoint = (x, y) => ({ x: originX + x * scale, y: originY + y * scale });
    const queueEnvironment = (sprite, x, y, size, order = y, options = {}) => {
      if (!inMiniView(x, y, size)) return;
      const atlasIndex = environmentIndex[sprite];
      if (!Number.isInteger(atlasIndex)) return;
      scenery.push({
        order,
        draw: () => Art.drawEnvironmentSprite(miniCtx, {
          sprite: atlasIndex,
          x,
          y,
          width: size,
          height: size,
          anchorX: options.anchorX,
          anchorY: options.anchorY,
          alpha: options.alpha,
        }),
      });
    };
    const queueStandalone = (sprite, x, y, width, height, order = y, options = {}) => {
      if (!inMiniView(x, y, Math.max(width, height))) return;
      scenery.push({
        order,
        draw: () => Art.drawStandaloneSprite(miniCtx, { sprite, x, y, width, height, anchorX: options.anchorX, anchorY: options.anchorY, alpha: options.alpha }),
      });
    };
    const queueInterior = (sprite, x, y, width, height, order = y, options = {}) => {
      if (!inMiniView(x, y, Math.max(width, height))) return;
      scenery.push({
        order,
        draw: () => Art.drawInteriorSprite(miniCtx, {
          sprite,
          x,
          y,
          width,
          height,
          anchorX: options.anchorX,
          anchorY: options.anchorY,
          alpha: options.alpha,
        }),
      });
    };

    for (const tree of world.trees || []) {
      const point = mapPoint(tree.x, tree.y + 27);
      const variants = ["broadleafTree", "pineTree", "autumnTree", "blossomTree"];
      const sprite = tree.variant || variants[Math.min(variants.length - 1, Math.floor((Number(tree.seed) || 0) * variants.length))];
      const renderScale = Core.clamp(Number(tree.renderScale) || 1, .65, 2.4);
      queueEnvironment(sprite, point.x, point.y, Math.max(12, 88 * renderScale * scale), point.y);
    }
    for (const house of world.houses || []) {
      if (house.masterArt) continue;
      const w = house.w * scale;
      const h = house.h * scale;
      const sprite = house.id === "keeper-house" ? "guildHouse" : house.bitmap ? house.sprite : house.id === "tea-house" ? "teaHouse" : "cottage";
      if (house.bitmap) {
        const point = mapPoint(house.x + house.w / 2, house.y + house.h);
        queueStandalone(sprite, point.x, point.y, house.spriteWidth * scale, house.spriteHeight * scale, point.y, { anchorX: .5, anchorY: 1 });
      } else {
        const anchorY = house.id === "keeper-house" ? 1.125 : house.id === "forge" ? 1.26 : 1.1;
        const point = mapPoint(house.x + house.w / 2, house.y + house.h * anchorY);
        queueEnvironment(sprite, point.x, point.y, Math.max(w * 1.12, h * 1.4), point.y);
      }
    }
    for (const rock of world.rocks || []) {
      const point = mapPoint(rock.x, rock.y + (rock.radius || 10) * .8);
      queueEnvironment("rock", point.x, point.y, Math.max(7, (rock.radius || 10) * scale * 4.15), point.y);
    }
    for (const lamp of world.lamps || []) {
      const point = mapPoint(lamp.x, lamp.y + 13);
      queueEnvironment("lamp", point.x, point.y, Math.max(8, 62 * scale), point.y);
    }
    for (const sign of world.signs || []) {
      const point = mapPoint(sign.x, sign.y + 20);
      queueEnvironment("sign", point.x, point.y, Math.max(7, 58 * scale), point.y);
    }
    for (const chest of world.chests || []) {
      if (openedChests.has(chest.id)) continue;
      const point = mapPoint(chest.x, chest.y + 13);
      queueEnvironment("chest", point.x, point.y, Math.max(7, 54 * scale), point.y);
    }
    if (world.shrine) {
      const point = mapPoint(world.shrine.x, world.shrine.y + 25);
      queueEnvironment("shrine", point.x, point.y, Math.max(11, 88 * scale), point.y);
    }
    for (const board of world.boards || []) {
      const point = mapPoint(board.x, board.y + 15);
      if (currentMapId === "world") queueEnvironment("questBoard", point.x, point.y, Math.max(9, 76 * scale), point.y);
      else queueInterior("indoorQuestBoard", point.x, point.y, Math.max(9, 68 * scale), Math.max(8, 58 * scale), point.y);
    }
    for (const prop of world.staticObjects || []) {
      if (!prop?.kind || prop.render === false || ["questBoard", "rug", "crackedTile"].includes(prop.kind)) continue;
      const w = Math.max(4, (prop.w || prop.radius * 2 || 36) * scale);
      const h = Math.max(4, (prop.h || prop.radius * 2 || 36) * scale);
      const rectPoint = mapPoint(prop.x + (prop.w || 0) / 2, prop.y + (prop.h || 0));
      const point = mapPoint(prop.x, prop.y + 12);
      const environmentSprites = { counter: "guildCounter", bookshelf: "indoorBookshelf", weaponRack: "equipmentDisplay", armourRack: "equipmentDisplay", anvil: "indoorForge", forgeFire: "indoorForge", goodsCrate: "barrelCrate" };
      const interiorSprites = { table: "guildTable", screen: "fittingScreen", pillar: "pillar", fireplace: "fireplace", wallSconce: "wallSconce", ancientLamp: "ancientLamp", banner: "guildBanner", glowMushroom: "glowMushroom", rubble: "rubble", mannequin: "mannequin" };
      if (environmentSprites[prop.kind]) {
        const propScale = prop.kind === "counter" ? 1 : prop.kind === "bookshelf" ? 1.1 : 1.35;
        queueEnvironment(environmentSprites[prop.kind], rectPoint.x, rectPoint.y, Math.min(radius * .82, Math.max(8, Math.max(w, h) * propScale)), rectPoint.y);
      } else if (interiorSprites[prop.kind]) {
        queueInterior(interiorSprites[prop.kind], prop.w ? rectPoint.x : point.x, prop.w ? rectPoint.y : point.y, Math.max(7, w * 1.2), Math.max(7, h * 1.55), prop.w ? rectPoint.y : point.y);
      }
    }
    scenery.sort((left, right) => left.order - right.order);
    for (const item of scenery) item.draw();

    const objective = questInfo().target;
    const objectiveVector = { x: (objective.x - player.x) * scale, y: (objective.y - player.y) * scale };
    const objectiveLength = Math.hypot(objectiveVector.x, objectiveVector.y) || 1;
    const objectiveLimit = radius - 12;
    const objectivePoint = objectiveLength > objectiveLimit
      ? { x: centreX + objectiveVector.x / objectiveLength * objectiveLimit, y: centreY + objectiveVector.y / objectiveLength * objectiveLimit }
      : { x: centreX + objectiveVector.x, y: centreY + objectiveVector.y };
    miniCtx.save();
    miniCtx.translate(objectivePoint.x, objectivePoint.y);
    miniCtx.rotate(Math.PI / 4);
    miniCtx.fillStyle = "#ffc857";
    miniCtx.shadowColor = "rgba(255,200,87,.8)";
    miniCtx.shadowBlur = 5;
    miniCtx.fillRect(-4, -4, 8, 8);
    miniCtx.restore();
    miniCtx.save();
    miniCtx.translate(centreX, centreY);
    miniCtx.rotate(({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 })[player.facing] || 0);
    miniCtx.fillStyle = "#65ead7";
    miniCtx.strokeStyle = "#f5e9ca";
    miniCtx.lineWidth = 1.5;
    miniCtx.beginPath();
    miniCtx.moveTo(0, -7); miniCtx.lineTo(5, 6); miniCtx.lineTo(0, 4); miniCtx.lineTo(-5, 6); miniCtx.closePath();
    miniCtx.fill();
    miniCtx.stroke();
    miniCtx.restore();
    miniCtx.restore();
    miniCtx.save();
    miniCtx.strokeStyle = "rgba(255,220,139,.7)";
    miniCtx.lineWidth = 2;
    miniCtx.beginPath(); miniCtx.arc(centreX, centreY, radius - 1, 0, Core.TAU); miniCtx.stroke();
    miniCtx.restore();
  }

  function worldToScreen(point, shakeX = 0, shakeY = 0) {
    return {
      x: (point.x - camera.x) * camera.zoom + width * .5 + shakeX,
      y: (point.y - camera.y) * camera.zoom + height * .5 + shakeY,
    };
  }

  function inView(point, margin = 100) {
    const screen = worldToScreen(point);
    return screen.x >= -margin && screen.y >= -margin && screen.x <= width + margin && screen.y <= height + margin;
  }

  function drawTiles(shakeX, shakeY) {
    if (currentMapId === "world" && world.art?.flattened) {
      const topLeft = worldToScreen({ x: 0, y: 0 }, shakeX, shakeY);
      Art.drawMainTownBackground(ctx, {
        x: topLeft.x,
        y: topLeft.y,
        width: world.pixelWidth * camera.zoom,
        height: world.pixelHeight * camera.zoom,
      });
      return;
    }
    if (world.art?.flattened && world.art?.backgroundScene) {
      const topLeft = worldToScreen({ x: 0, y: 0 }, shakeX, shakeY);
      Art.drawFlattenedBackground(ctx, world.art.backgroundScene, {
        x: topLeft.x,
        y: topLeft.y,
        width: world.pixelWidth * camera.zoom,
        height: world.pixelHeight * camera.zoom,
      });
      return;
    }
    const tileSize = world.tileSize;
    const halfWorldW = width / (2 * camera.zoom);
    const halfWorldH = height / (2 * camera.zoom);
    const minX = Core.clamp(Math.floor((camera.x - halfWorldW) / tileSize) - 1, 0, world.width - 1);
    const maxX = Core.clamp(Math.ceil((camera.x + halfWorldW) / tileSize) + 1, 0, world.width - 1);
    const minY = Core.clamp(Math.floor((camera.y - halfWorldH) / tileSize) - 1, 0, world.height - 1);
    const maxY = Core.clamp(Math.ceil((camera.y + halfWorldH) / tileSize) + 1, 0, world.height - 1);
    const size = tileSize * camera.zoom + 1;
    for (let ty = minY; ty <= maxY; ty += 1) {
      for (let tx = minX; tx <= maxX; tx += 1) {
        const tile = visualTerrainTile(world.tiles[ty][tx]);
        const point = worldToScreen({ x: tx * tileSize, y: ty * tileSize }, shakeX, shakeY);
        const noise = Core.hash2D(tx, ty, 93);
        const terrainSprite = terrainSpriteFor(tile);
        if (Art.drawTerrainTile(ctx, {
          sprite: terrainSprite,
          x: Math.floor(point.x),
          y: Math.floor(point.y),
          width: Math.ceil(size),
          height: Math.ceil(size),
          flipX: noise > .5,
          flipY: ((tx + ty) & 1) === 1,
        })) continue;
        if (tile === world.tileTypes.GRASS) {
          ctx.fillStyle = noise > .66 ? "#173b3b" : noise > .32 ? "#153637" : "#123334";
          ctx.fillRect(Math.floor(point.x), Math.floor(point.y), Math.ceil(size), Math.ceil(size));
          if (noise > .72) {
            ctx.strokeStyle = "rgba(104,162,129,.25)";
            ctx.lineWidth = Math.max(1, camera.zoom * .7);
            ctx.beginPath();
            ctx.moveTo(point.x + size * .22, point.y + size * .74);
            ctx.lineTo(point.x + size * .18, point.y + size * .55);
            ctx.moveTo(point.x + size * .22, point.y + size * .74);
            ctx.lineTo(point.x + size * .32, point.y + size * .58);
            ctx.stroke();
          }
        } else if (tile === world.tileTypes.PATH) {
          ctx.fillStyle = noise > .5 ? "#6c5a45" : "#64523f";
          ctx.fillRect(Math.floor(point.x), Math.floor(point.y), Math.ceil(size), Math.ceil(size));
          ctx.fillStyle = "rgba(245,233,202,.1)";
          ctx.fillRect(point.x + size * noise * .7, point.y + size * ((noise * 5) % 1) * .7, Math.max(1, camera.zoom), Math.max(1, camera.zoom));
        } else if (tile === world.tileTypes.WATER) {
          ctx.fillStyle = noise > .5 ? "#17384d" : "#193f53";
          ctx.fillRect(Math.floor(point.x), Math.floor(point.y), Math.ceil(size), Math.ceil(size));
          ctx.strokeStyle = "rgba(82,220,203,.2)";
          ctx.lineWidth = Math.max(1, camera.zoom * .65);
          const waveY = point.y + size * (.25 + ((elapsed * .23 + noise) % .55));
          ctx.beginPath();
          ctx.moveTo(point.x + size * .13, waveY);
          ctx.lineTo(point.x + size * (.42 + noise * .35), waveY);
          ctx.stroke();
        } else if (tile === world.tileTypes.STONE) {
          ctx.fillStyle = noise > .55 ? "#39465a" : "#354155";
          ctx.fillRect(Math.floor(point.x), Math.floor(point.y), Math.ceil(size), Math.ceil(size));
          ctx.strokeStyle = "rgba(10,16,32,.23)";
          ctx.lineWidth = 1;
          ctx.strokeRect(Math.floor(point.x), Math.floor(point.y), Math.ceil(size), Math.ceil(size));
          if (noise > .7) {
            ctx.beginPath();
            ctx.moveTo(point.x + size * .3, point.y + size * .18);
            ctx.lineTo(point.x + size * .45, point.y + size * .43);
            ctx.lineTo(point.x + size * .38, point.y + size * .66);
            ctx.stroke();
          }
        } else if (tile === world.tileTypes.WOOD) {
          ctx.fillStyle = noise > .5 ? "#8a6141" : "#7e573c";
          ctx.fillRect(Math.floor(point.x), Math.floor(point.y), Math.ceil(size), Math.ceil(size));
          ctx.strokeStyle = "rgba(38,24,28,.36)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(point.x, point.y + size * .5);
          ctx.lineTo(point.x + size, point.y + size * .5);
          ctx.stroke();
        } else {
          ctx.fillStyle = noise > .5 ? "#263147" : "#222c41";
          ctx.fillRect(Math.floor(point.x), Math.floor(point.y), Math.ceil(size), Math.ceil(size));
          ctx.fillStyle = "rgba(245,233,202,.08)";
          ctx.fillRect(point.x + 2, point.y + 2, size - 4, Math.max(2, camera.zoom * 2));
        }
      }
    }
    drawTownRoadEdges(shakeX, shakeY);
  }

  function drawTownRoadEdges(shakeX, shakeY) {
    if (currentMapId !== "world" || !world.townLayout?.roads) return;
    const roadTiles = new Set();
    for (const road of Object.values(world.townLayout.roads)) {
      const [x, y, roadWidth, roadHeight] = road.rect;
      for (let ty = y; ty < y + roadHeight; ty += 1) {
        for (let tx = x; tx < x + roadWidth; tx += 1) roadTiles.add(`${tx},${ty}`);
      }
    }
    for (const [tx, ty] of [[48, 32], [49, 32], [48, 33], [49, 33], [48, 34], [49, 34], [48, 35], [49, 35], [48, 36], [49, 36]]) roadTiles.add(`${tx},${ty}`);
    const isRoad = (tx, ty) => roadTiles.has(`${tx},${ty}`);
    const tileSize = world.tileSize * camera.zoom;
    ctx.save();
    ctx.strokeStyle = "rgba(239, 213, 166, .48)";
    ctx.lineWidth = Math.max(1, camera.zoom * 1.1);
    ctx.beginPath();
    for (const key of roadTiles) {
      const [tx, ty] = key.split(",").map(Number);
      const point = worldToScreen({ x: tx * world.tileSize, y: ty * world.tileSize }, shakeX, shakeY);
      if (!isRoad(tx, ty - 1)) { ctx.moveTo(point.x, point.y + .5); ctx.lineTo(point.x + tileSize, point.y + .5); }
      if (!isRoad(tx, ty + 1)) { ctx.moveTo(point.x, point.y + tileSize - .5); ctx.lineTo(point.x + tileSize, point.y + tileSize - .5); }
      if (!isRoad(tx - 1, ty)) { ctx.moveTo(point.x + .5, point.y); ctx.lineTo(point.x + .5, point.y + tileSize); }
      if (!isRoad(tx + 1, ty)) { ctx.moveTo(point.x + tileSize - .5, point.y); ctx.lineTo(point.x + tileSize - .5, point.y + tileSize); }
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawGroundDetails(shakeX, shakeY) {
    for (const flower of world.flowers) {
      if (!inView(flower, 30)) continue;
      const point = worldToScreen(flower, shakeX, shakeY);
      const sway = Math.sin(elapsed * 1.5 + flower.seed * 8) * camera.zoom;
      ctx.fillStyle = flower.color;
      ctx.globalAlpha = .5;
      ctx.fillRect(Math.round(point.x + sway), Math.round(point.y), Math.max(1, camera.zoom * 1.4), Math.max(1, camera.zoom * 1.4));
      ctx.globalAlpha = 1;
    }
    for (const lamp of world.lamps) {
      if (!inView(lamp, 180)) continue;
      drawGlow(lamp, "rgba(255,200,87,.16)", 100, shakeX, shakeY);
    }
    drawGlow(player, "rgba(255,200,87,.105)", 125, shakeX, shakeY);
  }

  function drawTownWallOverlay(shakeX, shakeY) {
    if (currentMapId !== "world" || world.art?.flattened || !world.townLayout?.perimeter) return;
    const { left, top, right, bottom } = world.townLayout.perimeter;
    const wallTiles = new Map();
    for (let tx = left; tx <= right; tx += 1) {
      wallTiles.set(`${tx},${top}`, { tx, ty: top, side: "horizontal" });
      wallTiles.set(`${tx},${bottom}`, { tx, ty: bottom, side: "horizontal" });
    }
    for (let ty = top; ty <= bottom; ty += 1) {
      wallTiles.set(`${left},${ty}`, { tx: left, ty, side: "vertical" });
      wallTiles.set(`${right},${ty}`, { tx: right, ty, side: "vertical" });
    }
    const size = world.tileSize * camera.zoom;
    ctx.save();
    for (const { tx, ty, side } of wallTiles.values()) {
      if (world.tiles[ty]?.[tx] !== world.tileTypes.WALL) continue;
      const point = worldToScreen({ x: tx * world.tileSize, y: ty * world.tileSize }, shakeX, shakeY);
      if (point.x > width + size || point.y > height + size || point.x + size < 0 || point.y + size < 0) continue;
      ctx.fillStyle = "rgba(54,67,86,.88)";
      ctx.fillRect(point.x, point.y, size + 1, size + 1);
      ctx.fillStyle = "rgba(111,127,150,.34)";
      ctx.fillRect(point.x + size * .08, point.y + size * .08, size * .84, size * .26);
      ctx.strokeStyle = "rgba(10,16,32,.55)";
      ctx.lineWidth = Math.max(1, camera.zoom);
      ctx.strokeRect(point.x, point.y, size, size);
      ctx.fillStyle = "#303c50";
      if (side === "horizontal") {
        for (let index = 0; index < 3; index += 1) ctx.fillRect(point.x + size * (.06 + index * .34), point.y + size * .02, size * .22, size * .18);
      } else {
        for (let index = 0; index < 3; index += 1) ctx.fillRect(point.x + size * .02, point.y + size * (.06 + index * .34), size * .18, size * .22);
      }
    }
    ctx.restore();
  }

  function drawGlow(entity, color, radius, shakeX, shakeY) {
    const point = worldToScreen(entity, shakeX, shakeY);
    const size = radius * camera.zoom;
    const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(255,200,87,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Core.TAU);
    ctx.fill();
  }

  function drawTelegraphs(shakeX, shakeY) {
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.windup <= 0 || (enemy.mainBoss && questStage < 3) || !inView(enemy, 140)) continue;
      const point = worldToScreen(enemy, shakeX, shakeY);
      const pulse = .45 + Math.sin(elapsed * 20) * .15;
      ctx.save();
      ctx.strokeStyle = `rgba(255,107,107,${pulse + .24})`;
      ctx.fillStyle = `rgba(255,107,107,${pulse * .16})`;
      ctx.lineWidth = Math.max(1.5, 2 * camera.zoom);
      if (enemy.pattern === "burst") {
        const radius = (70 + (1 - enemy.windup / .9) * 22) * camera.zoom;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Core.TAU);
        ctx.fill();
        ctx.stroke();
      } else if (enemy.pattern === "slam" || enemy.pattern === "melee") {
        const radius = (enemy.pattern === "slam" ? 92 : enemy.range + player.radius + 12) * camera.zoom;
        const angle = Math.atan2(enemy.attackDirection.y, enemy.attackDirection.x);
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.arc(point.x, point.y, radius, angle - .72, angle + .72);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        const length = 220 * camera.zoom;
        const normal = { x: -enemy.attackDirection.y, y: enemy.attackDirection.x };
        ctx.beginPath();
        ctx.moveTo(point.x + normal.x * 7, point.y + normal.y * 7);
        ctx.lineTo(point.x + enemy.attackDirection.x * length + normal.x * 7, point.y + enemy.attackDirection.y * length + normal.y * 7);
        ctx.lineTo(point.x + enemy.attackDirection.x * length - normal.x * 7, point.y + enemy.attackDirection.y * length - normal.y * 7);
        ctx.lineTo(point.x - normal.x * 7, point.y - normal.y * 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function houseFootY(house) {
    const settings = houseSpriteSettings(house);
    return Number.isFinite(settings?.y) ? settings.y : house.y + house.h;
  }

  function depthFor(entity) {
    if (entity.kind === "house") return houseFootY(entity);
    if (entity.kind === "gate") return entity.y + entity.h;
    if (entity.kind === "portal" && MapTransitions.transitionTypeFor(entity) === TRANSITION_TYPES.PHYSICAL_DOOR) {
      const house = world.houses?.find((candidate) => candidate.id === entity.houseId);
      // The marker belongs to the doorway's foreground plane. Draw it after
      // the facade so a large PNG cannot swallow an otherwise valid marker.
      return Math.max(entity.y + 36, house ? houseFootY(house) + 1 : entity.y + (entity.radius || 0));
    }
    if (Number.isFinite(entity.h) && !["rug"].includes(entity.kind)) return entity.y + entity.h;
    return entity.y + (entity.radius || 0);
  }

  function drawSortedWorld(shakeX, shakeY) {
    const renderables = [];
    const groundKinds = new Set(["rug", "crackedTile"]);
    for (const object of world.staticObjects) {
      if (object.render === false) continue;
      if (!inView({ x: object.x + (object.w || 0) / 2, y: object.y + (object.h || 0) / 2 }, 180)) continue;
      if (groundKinds.has(object.kind)) drawMapProp(object, shakeX, shakeY);
      else renderables.push(object);
    }
    if (currentMapId === "field") renderables.push({ ...world.gate, kind: "gate" });
    for (const portal of world.portals) if (inView(portal, 100)) renderables.push(portal);
    for (const npc of world.npcs) if (inView(npc, 100)) renderables.push(npc);
    for (const enemy of enemies) if (enemy.alive && (!enemy.mainBoss || questStage >= 3) && inView(enemy, 130)) renderables.push(enemy);
    for (const drop of drops) if (drop.life > 0 && inView(drop, 60)) renderables.push(drop);
    renderables.push({ ...player, kind: "player" });
    renderables.sort((a, b) => depthFor(a) - depthFor(b));
    for (const entity of renderables) drawWorldEntity(entity, shakeX, shakeY);
  }

  function drawWorldEntity(entity, shakeX, shakeY) {
    if (entity.kind === "house") drawHouse(entity, shakeX, shakeY);
    else if (entity.kind === "tree") drawTree(entity, shakeX, shakeY);
    else if (entity.kind === "rock") drawRock(entity, shakeX, shakeY);
    else if (entity.kind === "lamp") drawLamp(entity, shakeX, shakeY);
    else if (entity.kind === "shrine") drawShrine(entity, shakeX, shakeY);
    else if (entity.kind === "sign") drawSign(entity, shakeX, shakeY);
    else if (entity.kind === "chest") drawChest(entity, shakeX, shakeY);
    else if (entity.kind === "gate") drawGate(entity, shakeX, shakeY);
    else if (entity.kind === "npc") drawNpc(entity, shakeX, shakeY);
    else if (entity.kind === "portal") drawPortal(entity, shakeX, shakeY);
    else if (entity.kind === "player") drawPlayer(shakeX, shakeY);
    else if (["coin", "potion", "crystal"].includes(entity.kind)) drawDrop(entity, shakeX, shakeY);
    else if (entity.type && enemyTypes[entity.type]) drawEnemy(entity, shakeX, shakeY);
    else drawMapProp(entity, shakeX, shakeY);
  }

  function drawDoorway(portal, shakeX, shakeY) {
    // Doorway geometry remains interactive, but the doorway marker/label is
    // intentionally hidden because the flattened master art already shows it.
    return undefined;
  }

  function drawPortal(portal, shakeX, shakeY) {
    // Transition hit regions remain semantic; no transition marker or label
    // is painted over the authored scene.
    return undefined;
  }

  function drawPhysicalPassage(portal, shakeX, shakeY) {
    return undefined;
  }

  function drawMapProp(prop, shakeX, shakeY) {
    const point = worldToScreen(prop, shakeX, shakeY);
    const scale = camera.zoom;
    ctx.save();
    if (prop.kind === "questBoard") {
      const indoor = ["guild", "shop", "clinic", "general-store", "inn", "dungeon"].includes(currentMapId);
      const boardDrawer = indoor ? Art.drawInteriorSprite : Art.drawEnvironmentSprite;
      if (boardDrawer(ctx, {
        sprite: indoor ? "indoorQuestBoard" : "questBoard",
        x: point.x,
        y: point.y + (indoor ? 20 : 15) * scale,
        width: (indoor ? 88 : 76) * scale,
        height: (indoor ? 72 : 76) * scale,
      })) {
        ctx.restore();
        return;
      }
      ctx.fillStyle = "#6d4e34"; ctx.fillRect(point.x - 17 * scale, point.y - 20 * scale, 34 * scale, 28 * scale);
      ctx.fillStyle = "#ead9a7"; ctx.fillRect(point.x - 12 * scale, point.y - 16 * scale, 10 * scale, 13 * scale); ctx.fillRect(point.x + 2 * scale, point.y - 13 * scale, 9 * scale, 10 * scale);
      ctx.strokeStyle = "#ffc857"; ctx.strokeRect(point.x - 18 * scale, point.y - 21 * scale, 36 * scale, 30 * scale);
    } else if (["counter", "bookshelf", "table", "bed", "weaponRack", "armourRack", "anvil", "screen", "pillar", "goodsCrate"].includes(prop.kind)) {
      const w = Math.max(16, (prop.w || 28) * scale);
      const h = Math.max(12, (prop.h || 22) * scale);
      if (prop.kind === "bed") {
        const bedW = Math.max(96, (prop.w || 120) * 1.18 * scale);
        const bedH = bedW * (1024 / 1536);
        if (Art.drawStandaloneSprite(ctx, {
          sprite: "innBed",
          x: point.x + w / 2,
          y: point.y + h + 3 * scale,
          width: bedW,
          height: bedH,
          anchorX: .5,
          anchorY: 1,
          flipX: prop.id?.includes("east"),
        })) {
          ctx.restore();
          return;
        }
        // Canvas fallback is intentionally plain and is only used before the
        // reusable bitmap asset finishes loading.
        ctx.fillStyle = "rgba(2,5,12,.3)";
        ctx.fillRect(point.x + 5 * scale, point.y + 7 * scale, bedW, Math.max(22, (prop.h || 42) * scale));
        ctx.restore();
        return;
      }
      const environmentSprites = { counter: "guildCounter", bookshelf: "indoorBookshelf", weaponRack: "equipmentDisplay", armourRack: "equipmentDisplay", anvil: "indoorForge", goodsCrate: "barrelCrate" };
      const interiorSprites = { table: "guildTable", screen: "fittingScreen", pillar: "pillar" };
      const sprite = environmentSprites[prop.kind] || interiorSprites[prop.kind];
      const drawer = environmentSprites[prop.kind] ? Art.drawEnvironmentSprite : Art.drawInteriorSprite;
      const artWidth = prop.kind === "counter" ? w * 1.03 : prop.kind === "bookshelf" ? Math.max(w * 2.4, 76 * scale) : prop.kind.includes("Rack") ? Math.max(w * 1.45, 86 * scale) : prop.kind === "table" ? w * 1.08 : prop.kind === "goodsCrate" ? Math.max(w * 1.35, 58 * scale) : Math.max(w * 1.25, 68 * scale);
      const artHeight = prop.kind === "counter" ? Math.max(h * 2.15, 68 * scale) : prop.kind === "bookshelf" ? h * 1.03 : prop.kind.includes("Rack") ? Math.max(h * 1.2, 78 * scale) : prop.kind === "table" ? Math.max(h * 2.4, 74 * scale) : prop.kind === "goodsCrate" ? Math.max(h * 1.2, 58 * scale) : Math.max(h * 1.15, 72 * scale);
      if (sprite && drawer(ctx, {
        sprite,
        x: point.x + w / 2,
        y: point.y + h,
        width: artWidth,
        height: artHeight,
      })) {
        ctx.restore();
        return;
      }
      const colors = { counter: "#79553c", bookshelf: "#4f3c36", table: "#72533d", weaponRack: "#604b42", armourRack: "#536273", anvil: "#59616d", screen: "#796175", pillar: "#556273", goodsCrate: "#8f6843" };
      ctx.fillStyle = "rgba(2,5,12,.32)"; ctx.fillRect(point.x + 4, point.y + 6, w, h);
      ctx.fillStyle = colors[prop.kind] || "#586273"; ctx.fillRect(point.x, point.y, w, h);
      ctx.strokeStyle = "rgba(245,233,202,.2)"; ctx.strokeRect(point.x, point.y, w, h);
      if (prop.kind === "bookshelf" || prop.kind.includes("Rack")) {
        ctx.strokeStyle = "rgba(255,200,87,.55)"; ctx.beginPath(); ctx.moveTo(point.x + w * .2, point.y + 4); ctx.lineTo(point.x + w * .2, point.y + h - 4); ctx.moveTo(point.x + w * .55, point.y + 4); ctx.lineTo(point.x + w * .55, point.y + h - 4); ctx.stroke();
      }
    } else if (prop.kind === "rug") {
      const w = (prop.w || 100) * scale; const h = (prop.h || 80) * scale;
      if (Art.drawTerrainTile(ctx, { sprite: ["shop", "general-store"].includes(currentMapId) ? "shopRug" : "guildRug", x: point.x - w / 2, y: point.y - h / 2, width: w, height: h })) {
        ctx.restore();
        return;
      }
      ctx.globalAlpha = .72; ctx.fillStyle = prop.color || "#315d66"; ctx.fillRect(point.x - w / 2, point.y - h / 2, w, h); ctx.strokeStyle = "rgba(245,233,202,.24)"; ctx.strokeRect(point.x - w / 2 + 4, point.y - h / 2 + 4, w - 8, h - 8);
    } else if (["fireplace", "forgeFire", "ancientLamp", "wallSconce"].includes(prop.kind)) {
      drawGlow(prop, prop.kind === "forgeFire" ? "rgba(255,116,76,.22)" : "rgba(82,220,203,.18)", prop.radius ? prop.radius * 3 : 70, shakeX, shakeY);
      const useEnvironment = prop.kind === "forgeFire";
      const sprite = prop.kind === "forgeFire" ? "indoorForge" : prop.kind === "fireplace" ? "fireplace" : prop.kind === "wallSconce" ? "wallSconce" : "ancientLamp";
      const drawer = useEnvironment ? Art.drawEnvironmentSprite : Art.drawInteriorSprite;
      if (drawer(ctx, {
        sprite,
        x: point.x,
        y: point.y + 14 * scale,
        width: (prop.kind === "forgeFire" ? 92 : prop.kind === "fireplace" ? 76 : 48) * scale,
        height: (prop.kind === "forgeFire" ? 86 : prop.kind === "fireplace" ? 72 : 48) * scale,
      })) {
        ctx.restore();
        return;
      }
      ctx.fillStyle = prop.kind === "forgeFire" ? "#ff8b62" : "#52dccb"; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(point.x, point.y, 6 * scale, 0, Core.TAU); ctx.fill(); ctx.shadowBlur = 0;
    } else if (prop.kind === "banner") {
      if (Art.drawInteriorSprite(ctx, { sprite: "guildBanner", x: point.x, y: point.y + 24 * scale, width: 50 * scale, height: 68 * scale })) {
        ctx.restore();
        return;
      }
      ctx.fillStyle = prop.color || "#ffc857"; ctx.beginPath(); ctx.moveTo(point.x - 10 * scale, point.y - 18 * scale); ctx.lineTo(point.x + 10 * scale, point.y - 18 * scale); ctx.lineTo(point.x + 8 * scale, point.y + 13 * scale); ctx.lineTo(point.x, point.y + 7 * scale); ctx.lineTo(point.x - 8 * scale, point.y + 13 * scale); ctx.closePath(); ctx.fill();
    } else if (prop.kind === "glowMushroom") {
      if (Art.drawInteriorSprite(ctx, { sprite: "glowMushroom", x: point.x, y: point.y + 10 * scale, width: 54 * scale, height: 54 * scale })) {
        ctx.restore();
        return;
      }
      ctx.fillStyle = prop.color || "#52dccb"; ctx.globalAlpha = .7; ctx.beginPath(); ctx.arc(point.x, point.y, 4 * scale, Math.PI, Core.TAU); ctx.fill(); ctx.fillRect(point.x - scale, point.y, 2 * scale, 5 * scale);
    } else if (["rubble", "crackedTile"].includes(prop.kind)) {
      if (Art.drawInteriorSprite(ctx, { sprite: prop.kind, x: point.x, y: point.y + 8 * scale, width: (prop.kind === "rubble" ? 52 : 46) * scale, height: (prop.kind === "rubble" ? 52 : 34) * scale })) {
        ctx.restore();
        return;
      }
      ctx.strokeStyle = "rgba(159,178,194,.28)"; ctx.beginPath(); ctx.moveTo(point.x - 5 * scale, point.y + 3 * scale); ctx.lineTo(point.x, point.y - 4 * scale); ctx.lineTo(point.x + 6 * scale, point.y + 2 * scale); ctx.stroke();
    } else if (prop.kind === "mannequin") {
      if (Art.drawInteriorSprite(ctx, { sprite: "mannequin", x: point.x, y: point.y + 18 * scale, width: 62 * scale, height: 72 * scale })) {
        ctx.restore();
        return;
      }
      ctx.fillStyle = "#88765f"; ctx.beginPath(); ctx.arc(point.x, point.y - 13 * scale, 5 * scale, 0, Core.TAU); ctx.fill(); ctx.fillRect(point.x - 7 * scale, point.y - 7 * scale, 14 * scale, 20 * scale);
    }
    ctx.restore();
  }

  function drawHouse(house, shakeX, shakeY) {
    const point = worldToScreen(house, shakeX, shakeY);
    const w = house.w * camera.zoom;
    const h = house.h * camera.zoom;
    const spriteSettings = houseSpriteSettings(house);
    const spritePoint = worldToScreen(spriteSettings, shakeX, shakeY);
    const drewSprite = !house.forceProcedural && (house.bitmap
      ? Art.drawStandaloneSprite(ctx, {
        sprite: spriteSettings.sprite,
        x: spritePoint.x,
        y: spritePoint.y,
        width: spriteSettings.width * camera.zoom,
        height: spriteSettings.height * camera.zoom,
        anchorX: spriteSettings.anchorX,
        anchorY: spriteSettings.anchorY,
      })
      : Art.drawEnvironmentSprite(ctx, {
        sprite: spriteSettings.sprite,
        x: spritePoint.x,
        y: spritePoint.y,
        width: spriteSettings.width * camera.zoom,
        height: spriteSettings.height * camera.zoom,
      }));
    if (!drewSprite) {
      ctx.fillStyle = "rgba(3,6,14,.35)";
      ctx.fillRect(point.x + 7, point.y + 10, w, h);
      ctx.fillStyle = "#263047";
      ctx.fillRect(point.x + w * .08, point.y + h * .28, w * .84, h * .7);
      ctx.fillStyle = house.roof;
      ctx.beginPath();
      ctx.moveTo(point.x - w * .05, point.y + h * .34);
      ctx.lineTo(point.x + w * .15, point.y + h * .05);
      ctx.lineTo(point.x + w * .85, point.y + h * .05);
      ctx.lineTo(point.x + w * 1.05, point.y + h * .34);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(245,233,202,.22)";
      ctx.lineWidth = Math.max(1, camera.zoom);
      for (let i = 0; i < 5; i += 1) {
        const roofLineY = point.y + h * (.09 + i * .055);
        ctx.beginPath();
        ctx.moveTo(point.x + w * (.1 - i * .02), roofLineY);
        ctx.lineTo(point.x + w * (.9 + i * .02), roofLineY);
        ctx.stroke();
      }
      const windowW = 18 * camera.zoom;
      const windowH = 16 * camera.zoom;
      [point.x + w * .26, point.x + w * .67].forEach((x) => {
        ctx.fillStyle = house.light;
        ctx.globalAlpha = .68 + Math.sin(elapsed * 1.7 + x) * .12;
        ctx.fillRect(x, point.y + h * .55, windowW, windowH);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#141b2d";
        ctx.strokeRect(x, point.y + h * .55, windowW, windowH);
      });
      ctx.fillStyle = "#151b2b";
      ctx.fillRect(point.x + w * .45, point.y + h * .63, w * .13, h * .35);
      if (house.role === "clinic") {
        ctx.fillStyle = "#82d6c7";
        ctx.fillRect(point.x + w * .23, point.y + h * .4, w * .54, h * .07);
        ctx.fillStyle = "#fff1bf";
        ctx.fillRect(point.x + w * .47, point.y + h * .13, w * .06, h * .13);
        ctx.fillRect(point.x + w * .42, point.y + h * .18, w * .16, h * .06);
        ctx.fillStyle = "#82d6c7";
        ctx.fillRect(point.x + w * .19, point.y + h * .54, w * .12, h * .11);
        ctx.fillRect(point.x + w * .69, point.y + h * .54, w * .12, h * .11);
      } else if (house.role === "general-store") {
        ctx.fillStyle = "#f0c36a";
        ctx.fillRect(point.x + w * .18, point.y + h * .4, w * .64, h * .08);
        for (let stripe = 0; stripe < 4; stripe += 1) {
          ctx.fillStyle = stripe % 2 ? "#9c6545" : "#f0c36a";
          ctx.fillRect(point.x + w * (.2 + stripe * .16), point.y + h * .46, w * .13, h * .08);
        }
        ctx.fillStyle = "#8a6847";
        ctx.fillRect(point.x + w * .08, point.y + h * .7, w * .14, h * .13);
        ctx.fillRect(point.x + w * .78, point.y + h * .7, w * .14, h * .13);
        ctx.strokeStyle = "#f0c36a";
        ctx.strokeRect(point.x + w * .08, point.y + h * .7, w * .14, h * .13);
        ctx.strokeRect(point.x + w * .78, point.y + h * .7, w * .14, h * .13);
      }
    }
    const label = house.label;
    if (label) {
      const centerX = point.x + w / 2;
      const labelY = Math.max(18, point.y - 10 * camera.zoom);
      const fontSize = Core.clamp(13 * camera.zoom, 12, 17);
      ctx.font = `900 ${fontSize}px "Noto Sans HK", "Microsoft JhengHei", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(7,11,22,.78)";
      ctx.fillRect(centerX - textWidth / 2 - 9 * camera.zoom, labelY - 11 * camera.zoom, textWidth + 18 * camera.zoom, 22 * camera.zoom);
      ctx.strokeStyle = house.accent || house.light || "#ffc857";
      ctx.lineWidth = Math.max(1, camera.zoom);
      ctx.strokeRect(centerX - textWidth / 2 - 9 * camera.zoom, labelY - 11 * camera.zoom, textWidth + 18 * camera.zoom, 22 * camera.zoom);
      ctx.fillStyle = "#fff1bf";
      ctx.fillText(label, centerX, labelY);
    }
  }

  function drawTree(tree, shakeX, shakeY) {
    const point = worldToScreen(tree, shakeX, shakeY);
    const scale = camera.zoom;
    const renderScale = Core.clamp(Number(tree.renderScale) || 1, .7, 1.6);
    const treeSize = 88 * renderScale;
    const variants = ["broadleafTree", "pineTree", "autumnTree", "blossomTree"];
    const variant = tree.variant || variants[Math.min(variants.length - 1, Math.floor((Number(tree.seed) || 0) * variants.length))];
    if (Art.drawEnvironmentSprite(ctx, {
      sprite: variant,
      x: point.x,
      y: point.y + 27 * scale,
      width: treeSize * scale,
      height: treeSize * scale,
    })) return;
    ctx.fillStyle = "rgba(3,7,13,.35)";
    ctx.beginPath();
    ctx.ellipse(point.x + 3, point.y + 14 * scale, 18 * scale, 7 * scale, 0, 0, Core.TAU);
    ctx.fill();
    ctx.fillStyle = "#584336";
    ctx.fillRect(point.x - 4 * scale, point.y - 2 * scale, 8 * scale, 22 * scale);
    const sway = Math.sin(elapsed * .7 + tree.seed * 8) * 1.2 * scale;
    const colors = ["#1b4a45", "#20534a", "#183f40"];
    [[-10,-14,16],[10,-12,15],[0,-25,18],[-2,-6,19]].forEach((part, index) => {
      ctx.fillStyle = colors[index % colors.length];
      ctx.beginPath();
      ctx.arc(point.x + part[0] * scale + sway, point.y + part[1] * scale, part[2] * scale, 0, Core.TAU);
      ctx.fill();
    });
    ctx.fillStyle = "rgba(135,219,130,.18)";
    ctx.beginPath();
    ctx.arc(point.x - 7 * scale + sway, point.y - 24 * scale, 7 * scale, 0, Core.TAU);
    ctx.fill();
  }

  function drawRock(rock, shakeX, shakeY) {
    const point = worldToScreen(rock, shakeX, shakeY);
    const r = rock.radius * camera.zoom;
    if (Art.drawEnvironmentSprite(ctx, {
      sprite: "rock",
      x: point.x,
      y: point.y + r * .8,
      width: r * 4.15,
      height: r * 4.15,
    })) return;
    ctx.fillStyle = "rgba(3,6,13,.3)";
    ctx.beginPath(); ctx.ellipse(point.x + 2, point.y + r * .7, r * 1.15, r * .45, 0, 0, Core.TAU); ctx.fill();
    ctx.fillStyle = rock.seed > .5 ? "#52606a" : "#46555f";
    ctx.beginPath();
    ctx.moveTo(point.x - r, point.y + r * .45);
    ctx.lineTo(point.x - r * .65, point.y - r * .55);
    ctx.lineTo(point.x + r * .2, point.y - r);
    ctx.lineTo(point.x + r, point.y - r * .15);
    ctx.lineTo(point.x + r * .7, point.y + r * .65);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(245,233,202,.16)"; ctx.stroke();
  }

  function drawLamp(lamp, shakeX, shakeY) {
    const point = worldToScreen(lamp, shakeX, shakeY);
    const scale = camera.zoom;
    if (Art.drawEnvironmentSprite(ctx, {
      sprite: "lamp",
      x: point.x,
      y: point.y + 13 * scale,
      width: 62 * scale,
      height: 62 * scale,
    })) return;
    ctx.strokeStyle = "#735a42"; ctx.lineWidth = 3 * scale;
    ctx.beginPath(); ctx.moveTo(point.x, point.y + 10 * scale); ctx.lineTo(point.x, point.y - 22 * scale); ctx.stroke();
    ctx.fillStyle = "#ffc857"; ctx.shadowColor = "#ffc857"; ctx.shadowBlur = 12;
    ctx.fillRect(point.x - 5 * scale, point.y - 26 * scale, 10 * scale, 11 * scale);
    ctx.shadowBlur = 0;
  }

  function drawShrine(shrine, shakeX, shakeY) {
    const point = worldToScreen(shrine, shakeX, shakeY);
    const scale = camera.zoom;
    if (Art.drawEnvironmentSprite(ctx, {
      sprite: "shrine",
      x: point.x,
      y: point.y + 25 * scale,
      width: 88 * scale,
      height: 88 * scale,
    })) return;
    ctx.fillStyle = "rgba(3,6,13,.35)"; ctx.beginPath(); ctx.ellipse(point.x, point.y + 13 * scale, 23 * scale, 8 * scale, 0, 0, Core.TAU); ctx.fill();
    ctx.fillStyle = "#6e594a"; ctx.fillRect(point.x - 17 * scale, point.y - 2 * scale, 34 * scale, 23 * scale);
    ctx.fillStyle = "#23314a"; ctx.beginPath(); ctx.moveTo(point.x - 23 * scale, point.y); ctx.lineTo(point.x, point.y - 19 * scale); ctx.lineTo(point.x + 23 * scale, point.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffc857"; ctx.shadowColor = "#ffc857"; ctx.shadowBlur = 16;
    ctx.fillRect(point.x - 5 * scale, point.y + 3 * scale, 10 * scale, 11 * scale); ctx.shadowBlur = 0;
  }

  function drawSign(sign, shakeX, shakeY) {
    const point = worldToScreen(sign, shakeX, shakeY);
    const scale = camera.zoom;
    if (Art.drawEnvironmentSprite(ctx, {
      sprite: "sign",
      x: point.x,
      y: point.y + 20 * scale,
      width: 58 * scale,
      height: 58 * scale,
    })) return;
    ctx.fillStyle = "#624a39"; ctx.fillRect(point.x - 2 * scale, point.y - 2 * scale, 4 * scale, 20 * scale);
    ctx.fillStyle = "#8a6847"; ctx.fillRect(point.x - 13 * scale, point.y - 12 * scale, 26 * scale, 13 * scale);
    ctx.strokeStyle = "#34281f"; ctx.strokeRect(point.x - 13 * scale, point.y - 12 * scale, 26 * scale, 13 * scale);
  }

  function drawChest(chest, shakeX, shakeY) {
    const point = worldToScreen(chest, shakeX, shakeY);
    const scale = camera.zoom;
    const open = openedChests.has(chest.id);
    if (!open && Art.drawEnvironmentSprite(ctx, {
      sprite: "chest",
      x: point.x,
      y: point.y + 13 * scale,
      width: 54 * scale,
      height: 54 * scale,
    })) return;
    ctx.fillStyle = "rgba(3,6,13,.3)"; ctx.beginPath(); ctx.ellipse(point.x, point.y + 8 * scale, 15 * scale, 5 * scale, 0, 0, Core.TAU); ctx.fill();
    ctx.save(); ctx.translate(point.x, point.y);
    if (open) ctx.rotate(-.25);
    ctx.fillStyle = "#7c5637"; ctx.fillRect(-13 * scale, -7 * scale, 26 * scale, 16 * scale);
    ctx.fillStyle = "#a77b49"; ctx.fillRect(-13 * scale, -8 * scale, 26 * scale, 5 * scale);
    ctx.fillStyle = "#ffc857"; ctx.fillRect(-2 * scale, -4 * scale, 4 * scale, 8 * scale);
    ctx.restore();
  }

  function drawGate(gate, shakeX, shakeY) {
    const point = worldToScreen(gate, shakeX, shakeY);
    const w = gate.w * camera.zoom;
    const h = gate.h * camera.zoom;
    ctx.fillStyle = "#4a5870";
    ctx.fillRect(point.x - 11 * camera.zoom, point.y - 4, 14 * camera.zoom, h + 8);
    ctx.fillRect(point.x + w - 3 * camera.zoom, point.y - 4, 14 * camera.zoom, h + 8);
    if (!isGateOpen()) {
      const pulse = .58 + Math.sin(elapsed * 3) * .18;
      ctx.fillStyle = "rgba(15,20,38,.92)"; ctx.fillRect(point.x, point.y, w, h);
      ctx.strokeStyle = `rgba(174,145,255,${pulse})`; ctx.lineWidth = 2 * camera.zoom;
      ctx.strokeRect(point.x + 2, point.y + 2, w - 4, h - 4);
      for (let i = 0; i < 3; i += 1) {
        const y = point.y + h * (.25 + i * .25);
        ctx.beginPath(); ctx.arc(point.x + w * .5, y, 5 * camera.zoom, 0, Core.TAU); ctx.stroke();
      }
    }
  }

  function drawNpc(npc, shakeX, shakeY) {
    const point = worldToScreen(npc, shakeX, shakeY);
    const scale = camera.zoom;
    if (npc.render === false) {
      // The Hospital nurse is already part of the supplied flattened bitmap.
      // Keep the semantic NPC for collision, authored-hotspot clicks and the
      // existing service flow without drawing a duplicate sprite over it.
      drawNpcName(point.x, point.y - 69 * scale, npc.name);
      return;
    }
    const actors = {
      "clinic-healer-siu-moon": "healer", "store-merchant-gin": "merchant", "inn-keeper": "clerk",
      "guildmaster-yin": "guildmaster", "guild-clerk-po": "clerk", "guild-adventurer-nok": "adventurer", "guild-duelist-rhea": "duelist",
      "merchant-gin": "merchant", "armorer-yuet": "armorer", "shop-tailor-safi": "tailor", "lost-explorer-kai": "explorer", "mountain_delivery_recipient": "mountainCourier",
    };
    const artBox = Art.drawCharacter(ctx, {
      x: point.x,
      y: point.y + 13 * camera.zoom,
      scale: camera.zoom * 1.03,
      actor: npc.actor || actors[npc.id] || "villager",
      facing: npc.facing,
      state: "idle",
      phase: elapsed + npc.x * .007,
      expression: "happy",
    });
    const anchorX = artBox?.nameAnchorX ?? point.x;
    const nameY = artBox?.nameAnchorY ?? point.y - 56 * scale;
    const markerX = (artBox?.markerAnchorX ?? anchorX) + (Number(npc.markerOffsetX) || 0) * scale;
    const markerY = artBox?.markerAnchorY ?? point.y - 88 * scale;
    drawNpcName(anchorX, nameY, npc.name);
  }

  function drawNpcName(x, y, name) {
    if (!name) return;
    const fontSize = Core.clamp(8.5 * camera.zoom, 10, 14);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 ${fontSize}px "Noto Sans HK", "Microsoft JhengHei", sans-serif`;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(7,11,22,.92)";
    ctx.lineWidth = Math.max(2.5, fontSize * .34);
    ctx.strokeText(name, x, y);
    ctx.fillStyle = "#f5e9ca";
    ctx.fillText(name, x, y);
    ctx.restore();
  }

  function drawHumanoid(x, y, color, facing, walk, playerActor) {
    const scale = camera.zoom;
    ctx.save();
    ctx.fillStyle = "rgba(2,5,12,.42)"; ctx.beginPath(); ctx.ellipse(x, y + 10 * scale, 11 * scale, 4 * scale, 0, 0, Core.TAU); ctx.fill();
    const leg = walk * 3 * scale;
    ctx.strokeStyle = "#121829"; ctx.lineWidth = 4 * scale; ctx.lineCap = "square";
    ctx.beginPath(); ctx.moveTo(x - 4 * scale, y + 5 * scale); ctx.lineTo(x - 4 * scale + leg, y + 14 * scale); ctx.moveTo(x + 4 * scale, y + 5 * scale); ctx.lineTo(x + 4 * scale - leg, y + 14 * scale); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x - 10 * scale, y - 9 * scale); ctx.lineTo(x + 10 * scale, y - 9 * scale); ctx.lineTo(x + 8 * scale, y + 9 * scale); ctx.lineTo(x - 8 * scale, y + 9 * scale); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#edc6a2"; ctx.beginPath(); ctx.arc(x, y - 15 * scale, 7 * scale, 0, Core.TAU); ctx.fill();
    ctx.fillStyle = playerActor ? "#1c2945" : "#2d3548";
    ctx.beginPath(); ctx.arc(x, y - 18 * scale, 7.5 * scale, Math.PI, Core.TAU); ctx.fill();
    if (playerActor) {
      const facingVector = Core.directionVector(facing);
      ctx.strokeStyle = "#ffc857"; ctx.lineWidth = 2 * scale;
      ctx.beginPath(); ctx.moveTo(x - 8 * scale, y - 7 * scale); ctx.lineTo(x + 8 * scale, y - 5 * scale); ctx.stroke();
      const lanternX = x - facingVector.y * 10 * scale;
      const lanternY = y + 2 * scale;
      ctx.fillStyle = "#ffc857"; ctx.shadowColor = "#ffc857"; ctx.shadowBlur = 9;
      ctx.fillRect(lanternX - 2 * scale, lanternY - 2 * scale, 4 * scale, 6 * scale); ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawPlayer(shakeX, shakeY) {
    const point = worldToScreen(player, shakeX, shakeY);
    const blink = player.invulnerable > 0 && Math.floor(elapsed * 18) % 2 === 0;
    ctx.save();
    ctx.globalAlpha = blink ? .45 : 1;
    const walk = player.moving ? Math.sin(player.walkCycle) : 0;
    const state = mode === "dead"
      ? "death"
      : player.attackTimer > 0
        ? "attack"
        : player.moving
          ? "walk"
          : "idle";
    const progress = state === "death"
      ? Core.clamp((elapsed - (player.deathStartedAt ?? elapsed)) / .9, 0, 1)
      : state === "attack"
        ? 1 - Core.clamp(player.attackTimer / .19, 0, 1)
        : undefined;
    Art.drawCharacter(ctx, {
      x: point.x,
      y: point.y + 13 * camera.zoom,
      scale: camera.zoom * 1.05,
      actor: "player",
      classId: playerClassId,
      facing: player.facing,
      state,
      walk,
      locomotion: player.locomotion,
      phase: elapsed,
      progress,
      expression: player.attackTimer > 0 ? "determined" : "happy",
    });
    if (player.attackTimer > 0) drawSlash(point.x, point.y);
    ctx.restore();
  }

  function drawSlash(x, y) {
    const direction = Core.directionVector(player.facing);
    const angle = Math.atan2(direction.y, direction.x);
    const progress = 1 - player.attackTimer / .19;
    const radius = 40 * camera.zoom;
    ctx.save();
    ctx.strokeStyle = progress < .55 ? "#f5e9ca" : "rgba(255,200,87,.5)";
    ctx.lineWidth = 4 * camera.zoom * (1 - progress * .45);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x, y, radius, angle - 1.05 + progress * .55, angle + .15 + progress * .55);
    ctx.stroke();
    ctx.restore();
  }

  function drawEnemy(enemy, shakeX, shakeY) {
    const point = worldToScreen(enemy, shakeX, shakeY);
    const scale = camera.zoom;
    if (Art?.drawEnemy) {
      ctx.save();
      if (enemy.hitFlash > 0) ctx.filter = "brightness(2.2)";
      Art.drawEnemy(ctx, {
        x: point.x,
        y: point.y + enemy.radius * .72 * scale,
        scale: scale * (enemy.boss ? 1.03 : .98),
        type: enemy.type,
        facing: enemy.facing,
        phase: enemy.anim,
        state: enemy.hitFlash > 0 ? "hurt" : enemy.locomotion?.state || "idle",
        locomotion: enemy.locomotion,
        palette: { body: enemy.color },
      });
      ctx.restore();
      return;
    }
    ctx.save();
    if (enemy.hitFlash > 0) ctx.filter = "brightness(2.4)";
    ctx.fillStyle = "rgba(2,5,12,.42)"; ctx.beginPath(); ctx.ellipse(point.x, point.y + enemy.radius * .72 * scale, enemy.radius * 1.05 * scale, enemy.radius * .4 * scale, 0, 0, Core.TAU); ctx.fill();
    if (enemy.type === "slime") {
      const bounce = Math.sin(enemy.anim) * 2.2 * scale;
      ctx.fillStyle = enemy.color;
      ctx.beginPath(); ctx.moveTo(point.x - 14 * scale, point.y + 9 * scale); ctx.quadraticCurveTo(point.x - 13 * scale, point.y - 12 * scale - bounce, point.x, point.y - 13 * scale - bounce); ctx.quadraticCurveTo(point.x + 13 * scale, point.y - 12 * scale - bounce, point.x + 14 * scale, point.y + 9 * scale); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#d8d4ff"; ctx.fillRect(point.x - 6 * scale, point.y - 3 * scale - bounce, 3 * scale, 3 * scale); ctx.fillRect(point.x + 4 * scale, point.y - 3 * scale - bounce, 3 * scale, 3 * scale);
    } else if (enemy.type === "wisp") {
      ctx.globalCompositeOperation = "lighter";
      const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 28 * scale);
      glow.addColorStop(0, "rgba(240,230,255,.9)"); glow.addColorStop(.25, "rgba(174,145,255,.7)"); glow.addColorStop(1, "rgba(174,145,255,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(point.x, point.y, 28 * scale, 0, Core.TAU); ctx.fill();
      ctx.fillStyle = "#f5e9ff"; ctx.beginPath(); ctx.arc(point.x, point.y - 2 * scale, 6 * scale, 0, Core.TAU); ctx.fill();
      ctx.strokeStyle = "#ae91ff"; ctx.lineWidth = 3 * scale; ctx.beginPath(); ctx.moveTo(point.x, point.y + 3 * scale); ctx.quadraticCurveTo(point.x - 9 * scale, point.y + 12 * scale, point.x + Math.sin(elapsed * 4 + enemy.x) * 5 * scale, point.y + 19 * scale); ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    } else if (enemy.type === "hound") {
      ctx.fillStyle = enemy.color;
      ctx.beginPath(); ctx.ellipse(point.x, point.y, 18 * scale, 10 * scale, 0, 0, Core.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(point.x + 13 * scale, point.y - 8 * scale, 9 * scale, 0, Core.TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(point.x + 7 * scale, point.y - 14 * scale); ctx.lineTo(point.x + 10 * scale, point.y - 25 * scale); ctx.lineTo(point.x + 16 * scale, point.y - 14 * scale); ctx.fill();
      ctx.fillStyle = "#ff6b6b"; ctx.fillRect(point.x + 15 * scale, point.y - 9 * scale, 3 * scale, 3 * scale);
    } else {
      const pulse = 1 + Math.sin(enemy.anim * .7) * .04;
      ctx.translate(point.x, point.y); ctx.scale(pulse, pulse);
      ctx.fillStyle = "#371f45"; ctx.beginPath(); ctx.arc(0, -4 * scale, 27 * scale, 0, Core.TAU); ctx.fill();
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.moveTo(-24 * scale, -12 * scale); ctx.lineTo(-33 * scale, -29 * scale); ctx.lineTo(-11 * scale, -21 * scale); ctx.moveTo(24 * scale, -12 * scale); ctx.lineTo(33 * scale, -29 * scale); ctx.lineTo(11 * scale, -21 * scale); ctx.fill();
      ctx.fillStyle = "#ffc857"; ctx.shadowColor = "#ff6b91"; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(-9 * scale, -7 * scale, 4 * scale, 0, Core.TAU); ctx.arc(9 * scale, -7 * scale, 4 * scale, 0, Core.TAU); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ff6b91"; ctx.lineWidth = 3 * scale; ctx.beginPath(); ctx.arc(0, 2 * scale, 12 * scale, .25, Math.PI - .25); ctx.stroke();
    }
    ctx.filter = "none";
    ctx.restore();
  }

  function drawDrop(drop, shakeX, shakeY) {
    const point = worldToScreen(drop, shakeX, shakeY);
    const bob = Math.sin(drop.phase * 2) * 4 * camera.zoom;
    ctx.save(); ctx.translate(point.x, point.y + bob);
    if (drop.kind === "coin") {
      ctx.fillStyle = "#ffc857"; ctx.shadowColor = "#ffc857"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, 5 * camera.zoom, 0, Core.TAU); ctx.fill();
      ctx.fillStyle = "#8c6728"; ctx.fillRect(-1 * camera.zoom, -3 * camera.zoom, 2 * camera.zoom, 6 * camera.zoom);
    } else if (drop.kind === "potion") {
      ctx.fillStyle = "#ff6b6b"; ctx.fillRect(-5 * camera.zoom, -4 * camera.zoom, 10 * camera.zoom, 11 * camera.zoom);
      ctx.fillStyle = "#f5e9ca"; ctx.fillRect(-3 * camera.zoom, -8 * camera.zoom, 6 * camera.zoom, 4 * camera.zoom);
    } else {
      ctx.rotate(elapsed * 1.6);
      ctx.fillStyle = "#ae91ff"; ctx.shadowColor = "#ae91ff"; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(0, -13 * camera.zoom); ctx.lineTo(7 * camera.zoom, 0); ctx.lineTo(0, 13 * camera.zoom); ctx.lineTo(-7 * camera.zoom, 0); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawQuestMark(x, y, mark) {
    const sprite = mark === "!" ? "exclamation" : "question";
    if (Art.drawMarker(ctx, { sprite, x, y: y + Math.sin(elapsed * 4) * 3, size: Math.max(26, 31 * camera.zoom), anchorY: .5 })) return;
    ctx.fillStyle = "#ffc857"; ctx.strokeStyle = "#11182a"; ctx.lineWidth = 3;
    ctx.font = `900 ${Math.max(14, 18 * camera.zoom)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.strokeText(mark, x, y + Math.sin(elapsed * 4) * 3); ctx.fillText(mark, x, y + Math.sin(elapsed * 4) * 3);
  }

  function drawInteractDiamond(x, y) {
    if (Art.drawMarker(ctx, { sprite: "interact", x, y: y + Math.sin(elapsed * 4) * 3, size: Math.max(19, 22 * camera.zoom), anchorY: .5 })) return;
    const size = 5 * camera.zoom;
    ctx.save(); ctx.translate(x, y + Math.sin(elapsed * 4) * 3); ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = "#52dccb"; ctx.lineWidth = 2; ctx.strokeRect(-size, -size, size * 2, size * 2); ctx.restore();
  }

  function drawProjectiles(shakeX, shakeY) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const projectile of projectiles) {
      if (!inView(projectile, 40)) continue;
      const point = worldToScreen(projectile, shakeX, shakeY);
      const radius = projectile.radius * camera.zoom;
      ctx.fillStyle = projectile.color; ctx.shadowColor = projectile.color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Core.TAU); ctx.fill();
      ctx.strokeStyle = projectile.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(point.x, point.y); ctx.lineTo(point.x - projectile.vx * .055 * camera.zoom, point.y - projectile.vy * .055 * camera.zoom); ctx.stroke();
    }
    ctx.restore();
  }

  function drawEffects(shakeX, shakeY) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const particle of particles) {
      if (!inView(particle, 50)) continue;
      const point = worldToScreen(particle, shakeX, shakeY);
      ctx.globalAlpha = Core.clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(point.x, point.y, particle.size * camera.zoom, particle.size * camera.zoom);
    }
    ctx.restore();
    ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const number of damageNumbers) {
      const point = worldToScreen(number, shakeX, shakeY);
      const alpha = Core.clamp(number.life / number.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.font = `${number.important ? 900 : 750} ${number.important ? 16 : 12}px ui-monospace, monospace`;
      ctx.strokeStyle = "rgba(7,11,22,.85)"; ctx.lineWidth = 4; ctx.strokeText(number.text, point.x, point.y);
      ctx.fillStyle = number.color; ctx.fillText(number.text, point.x, point.y);
    }
    ctx.restore();
  }

  function drawAtmosphere() {
    const vignette = ctx.createRadialGradient(width * .5, height * .52, Math.min(width, height) * .16, width * .5, height * .52, Math.max(width, height) * .72);
    vignette.addColorStop(0, "rgba(4,8,18,0)");
    vignette.addColorStop(.62, "rgba(4,8,18,.08)");
    vignette.addColorStop(1, "rgba(3,6,16,.66)");
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
    ctx.save();
    for (let i = 0; i < 7; i += 1) {
      const fogX = ((i * 239 + elapsed * (8 + i)) % (width + 320)) - 160;
      const fogY = height * (.2 + ((i * .173) % .7));
      const gradient = ctx.createRadialGradient(fogX, fogY, 0, fogX, fogY, 130 + i * 8);
      gradient.addColorStop(0, "rgba(190,205,222,.035)"); gradient.addColorStop(1, "rgba(190,205,222,0)");
      ctx.fillStyle = gradient; ctx.fillRect(fogX - 180, fogY - 120, 360, 240);
    }
    if (["world", "field"].includes(currentMapId)) {
      ctx.strokeStyle = "rgba(190,220,228,.1)"; ctx.lineWidth = 1;
      for (let i = 0; i < Math.ceil(width / 56); i += 1) {
        const x = (i * 67 + (i * 17 % 23)) % width;
        const y = (i * 93 + rainOffset * (1 + i % 3)) % (height + 50) - 25;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 14); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawBossBar() {
    const boss = enemies.find((enemy) => enemy.boss && enemy.alive);
    if (!boss || (boss.mainBoss && questStage < 3) || Core.distance(player, boss) > 520 || mode === "title") return;
    const barWidth = Math.min(420, width * .46);
    const x = (width - barWidth) / 2;
    const y = width < 650 ? 106 : 28;
    ctx.fillStyle = "rgba(7,11,22,.88)"; ctx.fillRect(x - 7, y - 18, barWidth + 14, 34);
    ctx.strokeStyle = "rgba(245,233,202,.4)"; ctx.strokeRect(x - 7, y - 18, barWidth + 14, 34);
    ctx.fillStyle = "#4b243d"; ctx.fillRect(x, y, barWidth, 7);
    ctx.fillStyle = "#ff6b91"; ctx.fillRect(x, y, barWidth * Core.clamp(boss.hp / boss.maxHp, 0, 1), 7);
    const english = boss.mainBoss ? "THE LIGHT EATER" : "DEEP WARDEN";
    ctx.fillStyle = "#f5e9ca"; ctx.font = "800 10px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillText(`${boss.name} · ${english}`, width / 2, y - 6);
  }

  function frame(now) {
    const rawDelta = Core.clamp((now - previousTime) / 1000 || 0, 0, .12);
    previousTime = now;
    elapsed += rawDelta;
    if (mode !== "playing") cancelExplorePointerTracking();
    if (mode === "playing") {
      accumulator += rawDelta;
      let steps = 0;
      while (accumulator >= FIXED_STEP && steps < 7 && mode === "playing") {
        updateGame(FIXED_STEP);
        accumulator -= FIXED_STEP;
        steps += 1;
      }
      if (steps >= 7) accumulator = 0;
    } else if (mode === "battle") {
      updateBattle(rawDelta);
    } else if (mode === "title") {
      rainOffset = (rainOffset + rawDelta * 80) % 80;
    }
    render();
    requestAnimationFrame(frame);
  }

  function handleKeyDown(event) {
    const code = event.code;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) event.preventDefault();
    if (event.repeat) return;

    if (mode === "title") {
      if (code === "Enter" || code === "Space") requestNewGame();
      return;
    }
    if (mode === "facility") {
      if (!skillDetailPanel.hidden) {
        if (code === "Escape" || code === "KeyE") closeSkillDetail();
        return;
      }
      if (!skillBookConfirmPanel.hidden) {
        if (code === "Escape" || code === "KeyE") closeSkillManualConfirm();
        return;
      }
      if (!abandonCommissionPanel.hidden) {
        if (code === "Escape" || code === "KeyE") closeAbandonCommission();
        return;
      }
      if (code === "Escape" || code === "KeyE" || (code === "KeyI" && facilityTab === "bag") || (code === "KeyL" && facilityTab === "skills")) closeFacility();
      return;
    }
    if (mode === "battle") {
      if (!battle) return;
      if (battle.phase === "intro") {
        if (code === "Enter" || code === "Space") beginPlayerRound();
        return;
      }
      if (!["planning_move", "planning_action"].includes(battle.phase)) return;
      if (battle.phase === "planning_move" && battle.awaitingFacing && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(code)) {
        const facing = ({ KeyW: "up", KeyA: "left", KeyS: "down", KeyD: "right" })[code];
        chooseBattleFacing(facing);
        return;
      }
      if (battle.phase === "planning_move" && battle.awaitingFacing && code === "Escape") {
        battle.awaitingFacing = false;
        battle.message = "未確認朝向；可繼續加路點，或者再撳終點叫返方向箭嘴。";
        updateBattleUi();
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
        const direction = code === "ArrowUp" ? { x: 0, y: -1 } : code === "ArrowDown" ? { x: 0, y: 1 } : code === "ArrowLeft" ? { x: -1, y: 0 } : { x: 1, y: 0 };
        battle.cursor.x = Core.clamp(battle.cursor.x + direction.x, 0, BATTLE_WIDTH - 1);
        battle.cursor.y = Core.clamp(battle.cursor.y + direction.y, 0, BATTLE_HEIGHT - 1);
        return;
      }
      if (code === "Enter" || code === "Space") confirmBattleCell(battle.cursor);
      else if (code === "KeyM" || code === "Digit1") selectBattleAction("reset-move");
      else if (/^Digit[2-7]$/.test(code)) {
        const skill = equippedBattleSkills()[Number(code.slice(-1)) - 2];
        if (skill) selectBattleAction(`skill:${skill.id}`);
      } else if (code === "KeyA") {
        const skill = equippedBattleSkills()[0];
        if (skill) selectBattleAction(`skill:${skill.id}`);
      } else if (code === "KeyS") {
        const skill = equippedBattleSkills()[1];
        if (skill) selectBattleAction(`skill:${skill.id}`);
      } else if (code === "KeyQ" || code === "Digit8") selectBattleAction("potion");
      else if (code === "KeyE" || code === "Digit9") selectBattleAction("end-turn");
      else if (code === "Escape" || code === "Digit0") selectBattleAction("flee");
      return;
    }
    if (mode === "dialogue") {
      if (dialogue?.choices?.length && dialogue.index >= dialogue.lines.length - 1) {
        if (code === "ArrowUp") { dialogueChoiceIndex = (dialogueChoiceIndex - 1 + dialogue.choices.length) % dialogue.choices.length; renderDialogue(); }
        else if (code === "ArrowDown") { dialogueChoiceIndex = (dialogueChoiceIndex + 1) % dialogue.choices.length; renderDialogue(); }
        else if (["Enter", "KeyE", "Space"].includes(code)) chooseDialogueOption(dialogueChoiceIndex);
        else if (/^Digit[1-3]$/.test(code)) chooseDialogueOption(Number(code.slice(-1)) - 1);
      } else if (["Enter", "KeyE", "Space"].includes(code)) advanceDialogue();
      return;
    }
    if (mode === "levelup") {
      if (code === "Digit1") chooseUpgrade("vigor");
      else if (code === "Digit2") chooseUpgrade("edge");
      else if (code === "Digit3") chooseUpgrade("swift");
      return;
    }
    if (mode === "dead") {
      if (code === "Enter" || code === "Space") respawn();
      return;
    }
    if (mode === "victory") {
      if (code === "Enter" || code === "Space") keepPlaying();
      return;
    }
    if (mode !== "playing") return;
    if (code === "KeyI") openFacility("bag");
    else if (code === "KeyL") openFacility("skills");
    else if (code === "KeyE" || code === "Enter") interact();
    else if (code === "Escape") canvas.focus({ preventScroll: true });
  }

  function debugBattleSnapshot() {
    if (!battle) return null;
    return {
      sourceId: battle.source.id,
      battlefield: battle.battlefield ? {
        biome: battle.battlefield.biome,
        theme: battle.battlefield.theme,
        groundSet: [...(battle.battlefield.groundSet || [])],
        obstacleSet: [...(battle.battlefield.obstacleSet || [])],
        backgroundId: battle.battlefield.backgroundId,
      } : null,
      phase: battle.phase,
      round: battle.round,
      ap: battle.ap,
      apGain: BATTLE_AP_GAIN,
      apMax: BATTLE_AP_MAX,
      moved: battle.moved,
      guard: battle.guard,
      selectedAction: battle.selectedAction,
      awaitingFacing: battle.awaitingFacing,
      cursor: { ...battle.cursor },
      hero: { cell: { ...battle.hero.cell }, renderCell: battle.hero.renderCell ? { ...battle.hero.renderCell } : null, hp: battle.hero.hp, maxHp: battle.hero.maxHp, moveRange: battle.hero.moveRange, facing: battle.hero.facing, locomotion: battle.hero.locomotion ? { ...battle.hero.locomotion } : null },
      enemies: battle.enemies.map((unit) => ({
        id: unit.id,
        primary: unit.primary,
        type: unit.type,
        cell: { ...unit.cell },
        renderCell: unit.renderCell ? { ...unit.renderCell } : null,
        hp: unit.hp,
        maxHp: unit.maxHp,
        ap: unit.ap,
        skillName: unit.skillName,
        speedGrade: unit.speedGrade,
        targetArc: [...(unit.targetArc || [])],
        alive: unit.alive,
        facing: unit.facing,
        locomotion: unit.locomotion ? { ...unit.locomotion } : null,
      })),
      plans: battle.enemyPlans.map((plan) => ({
        enemyId: plan.enemyId,
        move: { ...plan.move },
        path: plan.path.map((cell) => ({ ...cell })),
        targetCells: plan.targetCells.map((cell) => ({ ...cell })),
        willAttack: plan.willAttack,
        skillName: plan.skillName,
        apCost: plan.apCost,
        speedGrade: plan.speedGrade,
        facing: plan.facing,
      })),
      heroMovePlan: battle.heroMovePlan ? {
        move: { ...battle.heroMovePlan.move },
        path: battle.heroMovePlan.path.map((cell) => ({ ...cell })),
        facing: battle.heroMovePlan.facing || null,
      } : null,
      heroMoveDraft: (battle.heroMoveDraft || []).map((cell) => ({ ...cell })),
      movement: battle.movementResolution ? {
        elapsed: battle.movementResolution.elapsed,
        movementTime: battle.movementResolution.elapsed / battle.movementResolution.stepDuration,
        stepDuration: battle.movementResolution.stepDuration,
        frameCount: battle.movementResolution.frames.length,
        frameTimes: [...(battle.movementResolution.frameTimes || [])],
        cancelled: [...battle.movementResolution.cancelled],
        finalHeroFacing: battle.movementResolution.finalHeroFacing || null,
        unitResults: Object.fromEntries(Object.entries(battle.movementResolution.unitResults || {}).map(([id, result]) => [id, {
          cell: { ...result.cell },
          facing: result.facing,
          blocked: result.blocked,
          blockReason: result.blockReason,
          blockedBy: [...(result.blockedBy || [])],
          completed: result.completed,
          completedPath: result.completedPath.map((cell) => ({ ...cell })),
          elapsedCost: result.elapsedCost,
        }])),
      } : null,
      effects: battle.effects.map((effect) => ({ cell: { ...effect.cell }, text: effect.text, color: effect.color })),
      action: battle.actionResolution ? {
        type: battle.actionResolution.heroAction.type,
        skillId: battle.actionResolution.heroAction.skillId || null,
        applied: battle.actionResolution.applied,
        elapsed: battle.actionResolution.elapsed,
        actionOrder: (battle.actionResolution.actionOrder || []).map((action) => ({ ...action })),
      } : null,
    };
  }

  function installDebugHooks() {
    if (!testingMode) return;
    window.__RPG_DEBUG__ = {
      ready: true,
      newGame: (classId) => newGame(true, classId),
      snapshot: () => ({
        mode, level: player.level, xp: player.xp, hp: player.hp, maxHp: playerStats().maxHp,
        stats: playerStats(),
        classId: playerClassId,
        x: player.x, y: player.y, facing: player.facing, moving: player.moving, locomotion: player.locomotion ? { ...player.locomotion } : null,
        currentMapId, questStage, questTrackerMode, crystals: [...crystals], bossDefeated, pendingLevelUps,
        coins: player.coins, ownedEquipment: [...ownedEquipment], equipped: { ...equipped },
        guildCommission: Guild.normalizeState(guildCommissionState),
        activeContracts, guildMarks, guildRenown, monsterKills: { ...monsterKills }, dungeonClears,
        skills: Skills.normalizeSkillState(skillState), automaticPortalReady,
        explorePath: { target: exploreMoveTarget ? { ...exploreMoveTarget } : null, remaining: exploreMovePath.length, portalIntentId: explorePortalIntentId },
        exploreZoomLevel, cameraZoom: camera.zoom, targetCameraZoom: targetZoom(),
        persistence: { dirty: persistence?.isDirty() || false, saveAttempts: persistence?.getSaveAttempts() || 0, successfulSaves: persistence?.getSuccessfulSaves() || 0 },
        facility: mode === "facility" ? { tab: facilityTab, context: facilityContext, availableTabs: [...availableFacilityTabs()] } : null,
        checkpoint: { ...checkpoint },
        enemyLevels: enemies.map((enemy) => ({ id: enemy.id, level: enemy.level, boss: enemy.boss })),
        enemyStates: enemies.filter((enemy) => enemy.alive).map((enemy) => ({
          id: enemy.id, type: enemy.type, x: enemy.x, y: enemy.y, facing: enemy.facing,
          moving: enemy.moving, locomotion: enemy.locomotion ? { ...enemy.locomotion } : null,
        })),
        aliveEnemies: enemies.filter((enemy) => enemy.alive).length,
        battle: debugBattleSnapshot(),
      }),
      teleport: (x, y) => { clearExploreMovePath(); pendingClickInteractionId = null; player.x = x; player.y = y; camera.x = x; camera.y = y; },
      collisionAt: (x, y, radius = player.radius) => isBlocked({ x, y, radius }),
      setEncounterGrace: (seconds) => { encounterGrace = Math.max(0, Number(seconds) || 0); },
      clickMoveTo: (x, y) => { setExploreClickTarget({ x, y }); return window.__RPG_DEBUG__.snapshot(); },
      clickPortal: (id) => {
        const portal = world.portals.find((candidate) => candidate.id === id);
        if (!portal) return false;
        setExploreClickTarget(portal, portal);
        return window.__RPG_DEBUG__.snapshot();
      },
      setZoom: (level) => {
        setExploreZoomLevel(level, { announceChange: false, immediate: true });
        return window.__RPG_DEBUG__.snapshot();
      },
      teleportTo: (id) => {
        const enemy = enemies.find((item) => item.id === id);
        const target = enemy || world.npcs.find((item) => item.id === id) || world.portals.find((item) => item.id === id) || world.boards.find((item) => item.id === id) || world.chests.find((item) => item.id === id) || world.objectives?.[id];
        if (!target) return false;
        player.x = target.x - 38;
        player.y = target.y;
        player.facing = "right";
        camera.x = player.x;
        camera.y = player.y;
        return true;
      },
      entityPosition: (id) => {
        const target = enemies.find((item) => item.id === id) || world.npcs.find((item) => item.id === id) || world.portals.find((item) => item.id === id) || world.boards.find((item) => item.id === id) || world.chests.find((item) => item.id === id) || world.objectives?.[id];
        return target ? { id: target.id, x: target.x, y: target.y } : null;
      },
      transitionInfo: (id) => {
        const target = world.portals.find((item) => item.id === id);
        if (!target) return null;
        return JSON.parse(JSON.stringify({
          id: target.id,
          sourceMapId: target.sourceMapId,
          targetMap: target.targetMap,
          targetSpawn: target.targetSpawn,
          entrance: target.entrance,
          returnPosition: target.returnPosition,
          returnFacing: target.returnFacing,
        }));
      },
      attack: performAttack,
      startBattle: (id, instant = false) => {
        const enemy = enemies.find((item) => item.id === id);
        return enemy ? startBattle(enemy, instant) : false;
      },
      battleAction: (action) => {
        selectBattleAction(action);
        return window.__RPG_DEBUG__.snapshot();
      },
      battleConfirm: (x, y) => {
        confirmBattleCell({ x, y });
        return window.__RPG_DEBUG__.snapshot();
      },
      battleCommitMove: (facing = battle?.hero?.facing) => {
        confirmPlannedMovement(facing);
        return window.__RPG_DEBUG__.snapshot();
      },
      battleChooseFacing: (facing) => {
        chooseBattleFacing(facing);
        return window.__RPG_DEBUG__.snapshot();
      },
      prepareBattleCollision: () => {
        if (!battle || battle.phase !== "planning_move") return false;
        const enemy = livingBattleEnemies()[0];
        if (!enemy) return false;
        let lane = null;
        for (let y = 0; y < battle.grid.height && !lane; y += 1) {
          for (let x = 0; x + 2 < battle.grid.width; x += 1) {
            const cells = [{ x, y }, { x: x + 1, y }, { x: x + 2, y }];
            const occupiedByOther = battle.enemies.some((unit) => unit.alive && unit.id !== enemy.id && cells.some((cell) => sameBattleCell(cell, unit.cell)));
            if (!occupiedByOther && cells.every((cell) => Tactics.isWalkable(battle.grid, cell))) {
              lane = cells;
              break;
            }
          }
        }
        if (!lane) return false;
        battle.hero.cell = copyBattleCell(lane[0]);
        battle.hero.facing = "right";
        battle.hero.locomotion = Locomotion.create("right");
        enemy.cell = copyBattleCell(lane[2]);
        enemy.facing = "left";
        enemy.locomotion = Locomotion.create("left");
        battle.enemyPlans = battle.enemies.filter((unit) => unit.alive).map((unit) => unit.id === enemy.id ? {
          enemyId: unit.id,
          move: copyBattleCell(lane[1]),
          path: [copyBattleCell(lane[2]), copyBattleCell(lane[1])],
          targetCells: [], willAttack: false,
          skillName: unit.skillName, apCost: unit.skillCost,
          speedGrade: unit.speedGrade || "C", facing: "left",
        } : {
          enemyId: unit.id,
          move: copyBattleCell(unit.cell),
          path: [copyBattleCell(unit.cell)],
          targetCells: [], willAttack: false,
          skillName: unit.skillName, apCost: unit.skillCost,
          speedGrade: unit.speedGrade || "C", facing: unit.facing,
        });
        battle.heroMoveDraft = [copyBattleCell(lane[0])];
        battle.heroMovePlan = null;
        battle.cursor = copyBattleCell(lane[0]);
        battle.awaitingFacing = false;
        updateBattleUi();
        return { target: copyBattleCell(lane[1]), requestedFacing: "down", expectedFacing: "right", enemyId: enemy.id };
      },
      battleReachable: () => battleReachableTiles().map((tile) => ({
        x: tile.x,
        y: tile.y,
        cost: tile.cost,
        path: tile.path.map((cell) => ({ ...cell })),
      })),
      weakenBattleEnemies: (hp = 1) => {
        if (!battle) return false;
        for (const enemy of livingBattleEnemies()) enemy.hp = Core.clamp(Math.floor(Number(hp) || 1), 1, enemy.maxHp);
        updateBattleUi();
        return true;
      },
      giveXp: gainXp,
      setPlayer: (values = {}) => {
        if (Number.isFinite(values.level)) player.level = Core.clamp(Math.floor(values.level), 1, Expansion.LEVEL_CAP);
        if (Number.isFinite(values.coins)) player.coins = Core.clamp(Math.floor(values.coins), 0, 99999);
        if (Number.isFinite(values.hp)) player.hp = Core.clamp(values.hp, 1, playerStats().maxHp);
        if (Number.isFinite(values.pendingLevelUps)) pendingLevelUps = Core.clamp(Math.floor(values.pendingLevelUps), 0, Math.max(0, player.level - 1));
        updateHud(true);
        return window.__RPG_DEBUG__.snapshot();
      },
      setGuildMarks: (value) => {
        guildMarks = Core.clamp(Math.floor(Number(value) || 0), 0, 99999);
        syncDeckCapacityMilestones({ silent: true });
        if (mode === "facility") renderFacility();
        return window.__RPG_DEBUG__.snapshot();
      },
      chooseUpgrade,
      save: () => saveGame(false, true),
      load: loadGame,
      setQuestStage: (value) => { questStage = Core.clamp(Math.floor(value), 0, 5); syncDeckCapacityMilestones({ silent: true }); return window.__RPG_DEBUG__.snapshot(); },
      enterMap: (id) => transitionMap(id, maps[id]?.start),
      forceDeath: () => { player.hp = 0; playerDeath(); },
      respawn,
      interactWith: (id) => {
        const target = world.npcs.find((item) => item.id === id) || world.portals.find((item) => item.id === id) || world.boards.find((item) => item.id === id) || world.chests.find((item) => item.id === id) || (world.shrine?.id === id ? world.shrine : null);
        if (!target) return false;
        nearestInteraction = target;
        interact();
        return true;
      },
      openFacility,
      closeFacility,
      facilityTab: (tab) => { facilityTab = tab; renderFacility(); },
      setInventoryFixture: (count = 0) => {
        inventoryFixtureCount = Core.clamp(Math.floor(Number(count) || 0), 0, 30);
        if (mode === "facility" && facilityTab === "bag") renderBagFacility();
        return window.__RPG_DEBUG__.snapshot();
      },
      acceptOffer: (id) => acceptGuildOffer(id || currentContractOffers()[0]?.id),
      claimContract: (id) => claimGuildContract(id || activeContracts[0]?.id),
      recordGuildKill: (monsterId, instanceId) => {
        const result = recordDefeatedMonster({ type: monsterId, instanceId: instanceId || `${monsterId}:debug:${Date.now()}` });
        updateHud(true);
        return window.__RPG_DEBUG__.snapshot();
      },
      grantSkillBook: (star, quantity = 1) => {
        const result = Skills.grantSkillBooks(skillState, star, quantity);
        if (result.ok) skillState = result.state;
        if (mode === "facility") renderFacility();
        return window.__RPG_DEBUG__.snapshot();
      },
      openSkillBook: (star) => { openGuildSkillBook(Number(star)); return window.__RPG_DEBUG__.snapshot(); },
      openGuildEnvelope: (star) => { openGuildEnvelope(Number(star)); return window.__RPG_DEBUG__.snapshot(); },
      openSkillManual: (skillId) => { openSkillManualConfirm(skillId); return window.__RPG_DEBUG__.snapshot(); },
      learnSkillManual: () => { confirmSkillManualLearning(); return window.__RPG_DEBUG__.snapshot(); },
      equipSkill: (id) => { changeSkillLoadout(id, true, { force: true }); return window.__RPG_DEBUG__.snapshot(); },
      setSkillLoadout: (ids = []) => {
        const unlockedSkillIds = Skills.SKILL_CATALOG.map((skill) => skill.id);
        skillState = Skills.normalizeSkillState({
          ...skillState,
          unlockedSkillIds,
          equippedSkillIds: ids,
          deckSlots: ids,
          deckCapacity: Math.max(skillState.deckCapacity, Math.min(Skills.MAX_EQUIPPED_SKILLS, ids.length)),
        });
        if (mode === "facility") renderFacility();
        return window.__RPG_DEBUG__.snapshot();
      },
      setBattleAp: (value) => {
        if (!battle) return false;
        battle.ap = Core.clamp(Math.floor(Number(value) || 0), 0, BATTLE_AP_MAX);
        updateBattleUi();
        return true;
      },
      battleSkillRange: (skillId) => battleSkillRangeTiles(Skills.getSkill(skillId)).map((cell) => ({ ...cell })),
      portalTick: updateAutomaticPortal,
      offers: currentContractOffers,
      buyEquip: (id) => { changeEquipment(id, true); return window.__RPG_DEBUG__.snapshot(); },
      damageEnemy: (id, amount) => {
        const enemy = enemies.find((item) => item.id === id);
        if (!enemy) return false;
        damageEnemy(enemy, amount, { x: 1, y: 0 });
        return true;
      },
      collectAllDrops: () => {
        for (const drop of [...drops]) {
          if (drop.life <= 0) continue;
          player.x = drop.x;
          player.y = drop.y;
          collectDrops();
        }
        updateHud(true);
        return window.__RPG_DEBUG__.snapshot();
      },
      runScenario: (name) => {
        newGame(true);
        if (name === "combat-levelup") {
          transitionMap("field", maps.field.start);
          questStage = 1;
          player.xp = Core.xpRequired(player.level) - 5;
          const enemy = enemies.find((item) => item.id === "slime-1");
          if (!enemy) throw new Error("Combat level-up scenario could not find slime-1.");
          enemy.x = player.x + 38;
          enemy.y = player.y;
          enemy.hp = 1;
          player.facing = "right";
          damageEnemy(enemy, 99999, { x: 1, y: 0 });
        } else if (name === "forest") {
          transitionMap("field", maps.field.start);
          questStage = 1;
          player.x = world.objectives.crystals.hollow.x - 80;
          player.y = world.objectives.crystals.hollow.y + 15;
          camera.x = player.x;
          camera.y = player.y;
        }
        updateHud(true);
        return window.__RPG_DEBUG__.snapshot();
      },
    };
    window.__RPG_READY__ = true;
    window.dispatchEvent(new Event("rpg-ready"));
  }

  document.getElementById("newGameButton").addEventListener("click", requestNewGame);
  for (const card of document.querySelectorAll("[data-class-choice]")) {
    card.addEventListener("click", () => startNewGameWithClass(card.dataset.classChoice));
  }
  document.getElementById("classSelectCancel").addEventListener("click", () => {
    classSelectPanel.hidden = true;
    document.getElementById("newGameButton").focus({ preventScroll: true });
  });
  document.getElementById("dialogueNext").addEventListener("click", advanceDialogue);
  dialoguePanel.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    advanceDialogue();
  });
  continueButton.addEventListener("click", loadGame);
  const openStatusFromHud = () => openFacility("status");
  statusButton.addEventListener("click", openStatusFromHud);
  playerHud.addEventListener("click", openStatusFromHud);
  playerHud.addEventListener("keydown", (event) => {
    if (!["Enter", "Space"].includes(event.code)) return;
    event.preventDefault();
    openStatusFromHud();
  });
  inventoryButton.addEventListener("click", () => openFacility("bag"));
  deckButton.addEventListener("click", openDeckFromSidebar);
  skillTreeButton.addEventListener("click", () => openFacility("skills"));
  document.getElementById("skillBookLearnButton").addEventListener("click", confirmSkillManualLearning);
  document.getElementById("skillBookCancelButton").addEventListener("click", closeSkillManualConfirm);
  document.getElementById("skillBookConfirmCloseButton").addEventListener("click", closeSkillManualConfirm);
  skillBookConfirmPanel.addEventListener("click", (event) => {
    if (event.target === skillBookConfirmPanel) closeSkillManualConfirm();
  });
  document.getElementById("skillDetailLearnButton").addEventListener("click", learnFromSkillDetail);
  document.getElementById("skillDetailDismissButton").addEventListener("click", () => closeSkillDetail());
  document.getElementById("skillDetailCloseButton").addEventListener("click", () => closeSkillDetail());
  skillDetailPanel.addEventListener("click", (event) => {
    if (event.target === skillDetailPanel) closeSkillDetail();
  });
  document.getElementById("abandonCommissionConfirmButton").addEventListener("click", confirmAbandonCommission);
  document.getElementById("abandonCommissionCancelButton").addEventListener("click", () => closeAbandonCommission());
  document.getElementById("abandonCommissionCloseButton").addEventListener("click", () => closeAbandonCommission());
  abandonCommissionPanel.addEventListener("click", (event) => {
    if (event.target === abandonCommissionPanel) closeAbandonCommission();
  });
  document.getElementById("respawnButton").addEventListener("click", respawn);
  document.getElementById("keepPlayingButton").addEventListener("click", keepPlaying);
  document.getElementById("facilityCloseButton").addEventListener("click", closeFacility);
  facilityHelpButton?.addEventListener("click", toggleFacilityHelp);
  facilityFooter.addEventListener("click", (event) => {
    if (event.target.closest("[data-facility-footer-action='return-title']")) returnToTitle();
  });
  facilityPanel.addEventListener("click", (event) => {
    if (event.target === facilityPanel) closeFacility();
    else if (facilityHelpPopover && !facilityHelpPopover.hidden && !event.target.closest(".facility-help-popover, #facilityHelpButton")) setFacilityHelpOpen(false);
  });
  facilityTabs?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-facility-tab]");
    if (!tab || !availableFacilityTabs().includes(tab.dataset.facilityTab)) return;
    facilityTab = tab.dataset.facilityTab;
    renderFacility();
  });
  facilityContent.addEventListener("click", (event) => {
    const button = event.target.closest("[data-facility-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.facilityAction;
    if (action === "select-item") {
      selectedInventoryItemId = button.dataset.itemId || null;
      renderBagFacility();
    } else if (action === "inventory-filter") {
      inventoryCategory = ["all", "equipment", "consumable", "skillbook", "material"].includes(button.dataset.inventoryCategory)
        ? button.dataset.inventoryCategory
        : "all";
      renderBagFacility();
    } else if (action === "accept") acceptGuildOffer(button.dataset.offerId);
    else if (action === "claim") claimGuildContract(button.dataset.contractId);
    else if (action === "abandon") openAbandonCommission(button.dataset.contractId);
    else if (action === "buy") changeEquipment(button.dataset.itemId, true);
    else if (action === "equip") changeEquipment(button.dataset.itemId, false);
    else if (action === "use-potion") useBagPotion();
    else if (action === "open-book") openGuildSkillBook(Number(button.dataset.bookStar));
    else if (action === "open-envelope") openGuildEnvelope(Number(button.dataset.envelopeStar));
    else if (action === "use-manual") openSkillManualConfirm(button.dataset.skillId);
    else if (action === "skill-detail") openSkillDetail(button.dataset.skillId, button);
    else if (action === "equip-skill") changeSkillLoadout(button.dataset.skillId, true);
    else if (action === "unequip-skill") changeSkillLoadout(button.dataset.skillId, false);
    else if (action === "master-skill") masterSkill(button.dataset.skillId);
  });
  battleHud.addEventListener("click", (event) => {
    const facingButton = event.target.closest("[data-battle-facing]");
    if (facingButton && !facingButton.disabled) {
      chooseBattleFacing(facingButton.dataset.battleFacing);
      return;
    }
    const button = event.target.closest("[data-battle-action]");
    if (!button || button.disabled) return;
    selectBattleAction(button.dataset.battleAction);
  });
  document.getElementById("questHud").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-quest-track]");
    if (!tab) return;
    questTrackerMode = tab.dataset.questTrack === "contract" ? "contract" : "main";
    updateHud(true);
    announce(questTrackerMode === "contract" ? "而家追蹤公會委託。" : "而家追蹤主線任務。");
  });
  canvas.addEventListener("pointerdown", handleCanvasPointer);
  canvas.addEventListener("pointermove", handleCanvasPointerMove);
  canvas.addEventListener("pointerup", finishCanvasPointer);
  canvas.addEventListener("pointercancel", (event) => cancelExplorePointerTracking(event.pointerId));
  canvas.addEventListener("lostpointercapture", (event) => {
    if (explorePointerGesture?.pressed) cancelExplorePointerTracking(event.pointerId, false);
  });
  document.getElementById("zoomControl")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-zoom-level]");
    if (!button) return;
    setExploreZoomLevel(button.dataset.zoomLevel);
  });
  document.getElementById("soundButton").addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    try { localStorage.setItem(SOUND_KEY, soundEnabled ? "on" : "off"); } catch (_) {}
    const button = document.getElementById("soundButton");
    button.setAttribute("aria-pressed", String(soundEnabled));
    button.setAttribute("aria-label", soundEnabled ? "關閉聲效" : "開啟聲效");
    button.textContent = soundEnabled ? "♪" : "×";
    if (soundEnabled) sound.tone(520, .1, { to: 760, gain: .03 });
  });
  for (const card of document.querySelectorAll("[data-upgrade]")) card.addEventListener("click", () => chooseUpgrade(card.dataset.upgrade));
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("blur", () => { keys.clear(); cancelExplorePointerTracking(); });
  document.addEventListener("visibilitychange", () => {
    keys.clear();
    cancelExplorePointerTracking();
    previousTime = performance.now();
  });
  window.addEventListener("beforeunload", () => { if (mode !== "title") persistence?.flush(); });
  window.addEventListener("resize", resize, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

  const savedGameAvailable = hasSave();
  continueButton.hidden = !savedGameAvailable;
  document.getElementById("soundButton").setAttribute("aria-pressed", String(soundEnabled));
  syncExploreZoomControls();
  resetEnemies();
  drawPlayerHudPortrait();
  window.addEventListener("lantern-art-ready", () => {
    drawPlayerHudPortrait();
    if (!dialoguePanel.hidden) drawDialoguePortrait();
  });
  resize();
  updateHud(true);
  installDebugHooks();
  if (savedGameAvailable && !autoplay) loadGame();
  if (autoplay) {
    window.setTimeout(() => {
      newGame(true);
      transitionMap("field", maps.field.start);
      questStage = 1;
      player.x = world.enemySpawns[0].x - 90;
      player.y = world.enemySpawns[0].y;
      player.invulnerable = 999;
      camera.x = player.x;
      camera.y = player.y;
    }, 80);
  }
  requestAnimationFrame(frame);
})();

