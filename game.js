(function () {
  "use strict";

  const Core = window.LanternCore;
  const World = window.LanternWorld;
  const Expansion = window.LanternExpansion;
  const ClassData = window.EverrealmClassData;
  const EquipmentData = window.EverrealmEquipmentData;
  const ItemData = window.EverrealmItemData;
  const ExpansionWorld = window.LanternExpansionWorld;
  const Guild = window.LanternGuildCommission;
  const MapRegistry = window.LanternMapRegistry;
  const MapTransitions = window.LanternMapTransitions;
  const MainTownNavigation = window.LanternMainTownNavigation;
  const TRANSITION_TYPES = MapTransitions.TRANSITION_TYPES;
  const houseSpriteSettings = MapTransitions.houseSpriteSettings;
  const Tactics = window.LanternTactics;
  const Skills = window.LanternSkills;
  const MonsterAI = window.EverrealmMonsterAI;
  const Bgm = window.LanternBgm;
  const FighterEffects = window.LanternFighterEffects;
  const Art = window.LanternArt;
  const Locomotion = window.LanternLocomotion;
  const SaveSystem = window.EverrealmSaveSystem;
  const Firebase = window.EverrealmFirebase;
  const CloudSave = window.EverrealmCloudSave?.create?.({ firebase: Firebase });
  const SavePersistence = window.EverrealmSavePersistence;
  const UiDom = window.EverrealmUiDom;
  const UiPresentation = window.EverrealmUiPresentation;
  const {
    normalizeCharacterName,
    statText,
    setTextIfChanged,
    setStyleWidthIfChanged,
    setDatasetIfChanged,
    escapeUiText,
    formatTime,
  } = UiDom;
  const {
    atlasIconHtml,
    itemIconHtml,
    coinAmountHtml,
    envelopeIconHtml,
    materialDescription,
    skillStars,
    skillIcon,
    skillBadgeMarkup,
    skillRangeText,
    skillTypeText,
    skillDamageText,
    skillHeightText,
  } = UiPresentation;
  const setFacilityFooter = (message) => UiDom.setFacilityFooter(facilityFooter, message);
  const maps = MapRegistry.createMapRegistry();
  if (!MainTownNavigation?.ready) {
    console.error("Main Town navigation failed closed", MainTownNavigation?.failure || "generated runtime data unavailable");
  }
  const overworld = maps.world;
  const expansionMaps = Object.fromEntries(Object.entries(maps).filter(([id]) => id !== "world"));
  let currentMapId = "world";
  let world = overworld;
  const SOUND_KEY = "everrealm-sound";
  const LEGACY_SOUND_KEY = "lanternbound-sound";
  const BGM_VOLUME_KEY = "everrealm-bgm-volume-v1";
  const ZOOM_KEY = "everrealm-zoom";
  const LEGACY_ZOOM_KEY = "lanternbound-zoom";
  const HUD_COLLAPSED_KEY = "everrealm-hud-collapsed";
  const BATTLE_COMMAND_POSITION_KEY = "everrealm-battle-command-position-v1";
  const SYSTEM_LOG_POSITION_KEY = "everrealm-system-log-position-v2";
  const SYSTEM_LOG_COLLAPSED_KEY = "everrealm-system-log-collapsed-v1";
  const INVENTORY_PAGE_SIZE = 15;
  const WEAK_POTION_TOTAL_STEPS = 500;
  const WEAK_POTION_WORLD_UNITS_PER_STEP = 32;
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
  const facilityPanelTemplate = document.getElementById("facilityPanel");
  let facilityPanel = facilityPanelTemplate;
  let facilityContent = document.getElementById("facilityContent");
  let facilityTabs = document.getElementById("facilityTabs");
  let facilityFooter = document.getElementById("facilityFooter");
  let facilityHelpButton = document.getElementById("facilityHelpButton");
  let facilityHelpPopover = document.getElementById("facilityHelpPopover");
  let facilityHelpText = document.getElementById("facilityHelpText");
  const exploreSidebar = document.getElementById("exploreSidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const statusButton = document.getElementById("statusButton");
  const missionButton = document.getElementById("missionButton");
  const inventoryButton = document.getElementById("inventoryButton");
  const deckButton = document.getElementById("deckButton");
  const skillTreeButton = document.getElementById("skillTreeButton");
  const systemButton = document.getElementById("systemButton");
  const systemSettingsPopover = document.getElementById("systemSettingsPopover");
  const systemSettingsCloseButton = document.getElementById("systemSettingsCloseButton");
  const volumeMuteButton = document.getElementById("volumeMuteButton");
  const musicVolumeSlider = document.getElementById("musicVolumeSlider");
  const musicVolumeValue = document.getElementById("musicVolumeValue");
  const inventoryBookBadge = document.getElementById("inventoryBookBadge");
  const missionMenuBadge = document.getElementById("missionMenuBadge");
  const skillMenuBadge = document.getElementById("skillMenuBadge");
  const continueButton = document.getElementById("continueButton");
  const titleActions = document.getElementById("titleActions");
  const titleAccountStatus = document.getElementById("titleAccountStatus");
  const titleAccountText = document.getElementById("titleAccountText");
  const accountButton = document.getElementById("accountButton");
  const titleLogoutButton = document.getElementById("titleLogoutButton");
  const authPanel = document.getElementById("authPanel");
  const authForm = document.getElementById("authForm");
  const authKicker = document.getElementById("authKicker");
  const authTitle = document.getElementById("authTitle");
  const authMessage = document.getElementById("authMessage");
  const authCharacterNameRow = document.getElementById("authCharacterNameRow");
  const authCharacterName = document.getElementById("authCharacterName");
  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const authConfirmRow = document.getElementById("authConfirmRow");
  const authConfirmPassword = document.getElementById("authConfirmPassword");
  const authSubmitButton = document.getElementById("authSubmitButton");
  const authSwitchButton = document.getElementById("authSwitchButton");
  const authForgotButton = document.getElementById("authForgotButton");
  const authCloseButton = document.getElementById("authCloseButton");
  const legacySavePanel = document.getElementById("legacySavePanel");
  const legacySaveMessage = document.getElementById("legacySaveMessage");
  const legacyUseButton = document.getElementById("legacyUseButton");
  const legacyStartButton = document.getElementById("legacyStartButton");
  const systemAccountText = document.getElementById("systemAccountText");
  const systemAccountMeta = document.getElementById("systemAccountMeta");
  const systemLogoutButton = document.getElementById("systemLogoutButton");
  const interactionPrompt = document.getElementById("interactionPrompt");
  const interactionText = document.getElementById("interactionText");
  const toastElement = document.getElementById("gameToast");
  const saveToast = document.getElementById("saveToast");
  const systemLog = document.getElementById("systemLog");
  const systemLogTabs = document.getElementById("systemLogTabs");
  const systemLogToggleButton = document.getElementById("systemLogToggleButton");
  const systemLogDragHandle = document.getElementById("systemLogDragHandle");
  const systemLogMessages = document.getElementById("systemLogMessages");
  const systemLogScrollZone = document.getElementById("systemLogScrollZone");
  const guildCommissionDetailPanel = document.getElementById("guildCommissionDetailPanel");
  const guildCommissionDetailContent = document.getElementById("guildCommissionDetailContent");
  const guildCommissionDetailCloseButton = document.getElementById("guildCommissionDetailCloseButton");
  const ariaLive = document.getElementById("ariaLive");
  const playerHudPortraitCanvas = document.getElementById("playerHudPortraitCanvas");
  const playerHudPortraitCtx = playerHudPortraitCanvas.getContext("2d");
  const battleHud = document.getElementById("battleHud");
  const battleEncounterIntro = document.getElementById("battleEncounterIntro");
  const battleFacingPicker = document.getElementById("battleFacingPicker");
  const battleActionDock = document.getElementById("battleActionDock");
  const classSelectPanel = document.getElementById("classSelectPanel");
  const skillBookConfirmPanel = document.getElementById("skillBookConfirmPanel");
  const skillDetailPanel = document.getElementById("skillDetailPanel");
  const abandonCommissionPanel = document.getElementById("abandonCommissionPanel");
  const battlePortraitCanvas = document.getElementById("selectedUnitPortraitCanvas");
  const battlePortraitCtx = battlePortraitCanvas.getContext("2d");
  const battleUi = {
    encounterTitle: document.getElementById("battleEncounterTitle"),
    encounterSubtitle: document.getElementById("battleEncounterSubtitle"),
    round: document.getElementById("battleRoundLabel"),
    turn: document.getElementById("battleTurnLabel"),
    phase: document.getElementById("battlePhaseLabel"),
    unitLevel: document.getElementById("selectedUnitLevel"),
    unitName: document.getElementById("selectedUnitName"),
    hpFill: document.getElementById("selectedUnitHpFill"),
    hpText: document.getElementById("selectedUnitHpText"),
    apFill: document.getElementById("selectedUnitApFill"),
    apText: document.getElementById("selectedUnitApText"),
    statuses: document.getElementById("selectedUnitStatuses"),
    potionCount: document.getElementById("battlePotionCount"),
    hint: document.getElementById("battleHint"),
  };

  const hud = {
    name: document.querySelector("#playerHud .name-row strong"),
    level: document.getElementById("levelValue"),
    hpFill: document.getElementById("hpFill"),
    hpText: document.getElementById("hpText"),
    xpFill: document.getElementById("xpFill"),
    xpText: document.getElementById("xpText"),
    coins: document.getElementById("coinValue"),
    potions: document.getElementById("potionValue"),
    weapon: document.getElementById("weaponValue"),
    commissionTitle: document.getElementById("commissionTitle"),
    commissionDetail: document.getElementById("commissionDetail"),
    commissionDistance: document.getElementById("commissionDistance"),
    zone: document.getElementById("zoneName"),
  };

  const MONSTER_INITIATIVE_BY_SPEED = Object.freeze({ S: 16, A: 14, B: 12, C: 10, D: 8, E: 6, F: 4 });
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
      speed: blueprint.exploration?.speed || 86,
      battleSpeed: MONSTER_INITIATIVE_BY_SPEED[firstSkill.speedGrade] || 10,
      moveRange: blueprint.moveRange,
      attackRange: firstSkill.range.max,
      xp: blueprint.rewards.baseXp,
      coins: blueprint.rewards.coins,
      radius: blueprint.exploration?.radius || 15,
      aggro: blueprint.exploration?.aggro || 225,
      range: firstSkill.range.max > 1 ? 155 : 38,
      color: blueprint.exploration?.color || "#9b8ab7",
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
  let savePersistence = null;
  let authUser = null;
  let authMode = "login";
  let pendingRegistrationCharacterName = "";
  let authSyncToken = 0;
  let authStateResolved = false;
  let legacyClaimUid = null;
  let openedChests = new Set();
  let ownedEquipment = ["novice_blade", "traveller_coat"];
  let equipped = { head: null, weapon: "novice_blade", upperBody: "traveller_coat", lowerBody: null, hands: null, feet: null, charm: null };
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
  const activeExploreTouches = new Map();
  let explorePinchGesture = null;
  let suppressExploreTouchTap = false;
  const activeBattleTouches = new Map();
  let battlePinchGesture = null;
  let suppressBattleTouchTap = false;
  const BATTLE_VIEW_ZOOM_MIN = .86;
  const BATTLE_VIEW_ZOOM_MAX = 2.25;
  let battleView = { zoom: 1, offsetX: 0, offsetY: 0 };
  let exploreHoverEntityId = null;
  let pendingClickInteractionId = null;
  let pendingManualSkillId = null;
  let pendingSkillDetailId = null;
  let skillDetailReturnTarget = null;
  let deckDragGesture = null;
  let skillTreePanGesture = null;
  let draggableWindowGesture = null;
  let suppressSkillTreeClickUntil = 0;
  let selectedInventoryItemId = null;
  let pendingInventoryDestroyItemId = null;
  let inventoryCategory = "all";
  let inventoryPage = 0;
  let equipmentShopCategory = "weapon";
  let shopTradeMode = "buy";
  let weakPotionStepsRemaining = 0;
  let weakPotionDistanceRemainder = 0;
  let pendingCommissionDetailId = null;
  let systemLogFilter = "all";
  let systemLogEntries = [];
  let systemLogSerial = 0;
  let systemLogDragGesture = null;
  let systemLogScrollGesture = null;
  let systemLogCollapsed = false;
  try { systemLogCollapsed = localStorage.getItem(SYSTEM_LOG_COLLAPSED_KEY) === "1"; } catch (_) {}
  let remoteSessionKickMessage = "";
  let sessionKickInProgress = false;
  let inventoryFixtureCount = 0;
  let checkpoint = { mapId: "world", x: overworld.start.x, y: overworld.start.y };
  const FACILITY_TABS = Object.freeze(["status", "missions", "bag", "equipment", "deck", "guild", "shop", "skills", "codex"]);
  // Native-world zooms preserve the pre-migration wide-screen field of view:
  // 1.48 * { .78, 1, 1.22 } * .4 = the constants below. This is a completed
  // unit conversion, not a runtime map/migration scale.
  const EXPLORE_ZOOM_SCALES = Object.freeze({ far: .46176, mid: .592, near: .72224 });
  const EXPLORE_ZOOM_LABELS = Object.freeze({ far: "遠", mid: "中", near: "近" });
  const EXPLORE_ZOOM_ORDER = Object.freeze(["far", "mid", "near"]);
  const MOBILE_EXPLORE_ZOOM_MIN = .26;
  const MOBILE_EXPLORE_ZOOM_MAX = .82;
  // Temporary development tuning: retreat always succeeds until the normal
  // level-difference formula is re-enabled.
  const RETREAT_CHANCE_OVERRIDE = 1;
  const MOBILE_EXPLORE_ZOOM_DEFAULTS = Object.freeze({
    world: .34,
    field: .38,
    dungeon: .42,
    guild: .60,
    shop: .60,
    clinic: .60,
    "general-store": .60,
    inn: .60,
  });
  const mobileExploreZoomByMap = new Map();
  const FIGHTER_SHOP_ITEM_ID_SET = EquipmentData?.FIGHTER_SHOP_ITEM_ID_SET || new Set();
  const GENERAL_STORE_GOODS = Object.freeze([
    Object.freeze({ id: "healing_potion", name: "小型回復藥", price: 30, description: "回復 30 HP。" }),
    Object.freeze({ id: "weak_potion", name: "弱氣之藥", price: 200, description: ItemData?.getItem?.("weak_potion")?.description || "一瓶來歷可疑的藥氣之藥。據說喝下後會令人變得孱弱，但身上散出的怪味，卻會令附近魔物蠢蠢欲動。" }),
  ]);
  const GENERAL_STORE_GOODS_BY_ID = new Map(GENERAL_STORE_GOODS.map((item) => [item.id, item]));
  const SHOP_SELL_RATE = 1 / 3;
  const FIGHTER_GUILD_BOOK_RANKS = new Map(
    (window.LanternFighterSkillData?.skills || []).map((sourceSkill) => {
      const ranks = (sourceSkill.original_reference?.acquisition?.guild_reward_books || [])
        .map((entry) => Number(entry?.star_value))
        .filter((value) => Number.isFinite(value) && value > 0);
      return [sourceSkill.id, ranks];
    })
  );

  function fighterGuildBookRanks(skillOrId) {
    const id = typeof skillOrId === "string" ? skillOrId : skillOrId?.id;
    return id ? (FIGHTER_GUILD_BOOK_RANKS.get(id) || []) : [];
  }

  function fighterGuildBookRankText(skillOrId) {
    const ranks = fighterGuildBookRanks(skillOrId);
    if (!ranks.length) {
      const fallbackStar = typeof skillOrId === "object" ? skillOrId?.star : null;
      return fallbackStar ? Skills.formatSkillBookRank(fallbackStar) : "";
    }
    return ranks.map((star) => Skills.formatSkillBookRank(star)).join("／");
  }

  let facilityTab = "bag";
  let facilityContext = "portable";
  const facilityWindows = new Map();
  let activeFacilityWindow = null;
  let uiWindowZCounter = 40;
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
  let currentZone = "米克雷帝國";
  let screenShake = 0;
  let screenFlash = 0;
  let enemySerial = 100;
  let autoTarget = null;
  let battle = null;
  const battleCommandPosition = { manual: false, x: 0, y: 0, xRatio: null, yRatio: null, pointerId: null, offsetX: 0, offsetY: 0 };
  try {
    const savedBattleCommandPosition = JSON.parse(localStorage.getItem(BATTLE_COMMAND_POSITION_KEY));
    const xRatio = Number(savedBattleCommandPosition?.xRatio);
    const yRatio = Number(savedBattleCommandPosition?.yRatio);
    if (Number.isFinite(xRatio) && Number.isFinite(yRatio)) {
      battleCommandPosition.manual = true;
      battleCommandPosition.xRatio = Core.clamp(xRatio, 0, 1);
      battleCommandPosition.yRatio = Core.clamp(yRatio, 0, 1);
    }
  } catch (_) {}
  let encounterGrace = 1;
  let automaticPortalReady = false;
  let battleToken = 0;
  let soundEnabled = readPreference(SOUND_KEY, "on", LEGACY_SOUND_KEY) !== "off";
  let bgmVolume = Core.clamp(Number(readPreference(BGM_VOLUME_KEY, "0.70")), 0, 1);
  if (!Number.isFinite(bgmVolume)) bgmVolume = .7;
  let lastAudibleBgmVolume = bgmVolume > 0 ? bgmVolume : .7;
  // A stored 0% volume is semantically muted. Keep the speaker state, slider
  // and persisted audio behavior in sync instead of showing an active speaker
  // beside a zero-value control.
  if (bgmVolume <= 0) soundEnabled = false;
  const bgm = Bgm.createBgmManager({ enabled: soundEnabled, volume: bgmVolume });
  const battleBgmAudio = typeof Audio === "function" ? new Audio("assets/audio/everrealm_battle_bgm_v2_seamless_loop.mp3") : null;
  // Mountain battle obstacle art supplied as standalone PNGs. Every prop is
  // rendered with its native aspect ratio: resizing is allowed, stretching is
  // not. Low cover deliberately has four visual variants and picks one stable
  // variant per battle so repeated encounters do not always show the same prop.
  const battleMountainTreeImage = typeof Image === "function" ? new Image() : null;
  if (battleMountainTreeImage) battleMountainTreeImage.src = "assets/battle/mountain/battle-tree-v1.png";
  const battleMountainLowCoverArt = [
    { id: "rock-cluster", src: "assets/battle/mountain/battle-low-rock-cluster-v1.png", widthScale: 1.02, anchorY: .93 },
    { id: "rock-single", src: "assets/battle/mountain/battle-low-rock-single-v1.png", widthScale: .94, anchorY: .93 },
    { id: "grass-tall", src: "assets/battle/mountain/battle-low-grass-tall-v1.png", widthScale: 1.26, anchorY: .91 },
    { id: "grass-round", src: "assets/battle/mountain/battle-low-grass-round-v1.png", widthScale: 1.18, anchorY: .91 },
  ].map((entry) => {
    const image = typeof Image === "function" ? new Image() : null;
    if (image) image.src = entry.src;
    return { ...entry, image };
  });
  if (battleBgmAudio) {
    battleBgmAudio.loop = true;
    battleBgmAudio.preload = "auto";
    battleBgmAudio.volume = bgmVolume;
  }
  let pageAudioSuspended = document.visibilityState !== "visible";
  let audioGestureUnlocked = false;

  function suspendGameAudio() {
    pageAudioSuspended = true;
    sound.suspend();
    bgm.suspend?.();
    battleBgmAudio?.pause();
  }

  function resumeGameAudio() {
    if (document.visibilityState !== "visible") return;
    pageAudioSuspended = false;
    sound.resume();
    bgm.resume?.();
    if (!soundEnabled) return;
    if (mode === "battle" && battle) {
      bgm.suspend?.();
      battleBgmAudio?.play().catch(() => {});
      return;
    }
    battleBgmAudio?.pause();
    bgm.resume?.();
    bgm.setMap(currentMapId);
  }

  function unlockGameAudioFromGesture() {
    if (!soundEnabled || document.visibilityState !== "visible") return;
    const battlePlaying = mode === "battle" && battle && battleBgmAudio && battleBgmAudio.paused === false;
    const mapPlaying = mode !== "battle" && (bgm.snapshot?.().activeInstances || 0) > 0;
    if (audioGestureUnlocked && (battlePlaying || mapPlaying)) return;
    audioGestureUnlocked = true;
    resumeGameAudio();
  }

  function startBattleBgm() {
    bgm.setEnabled(false);
    if (!battleBgmAudio || !soundEnabled || pageAudioSuspended || document.visibilityState !== "visible") return;
    try { battleBgmAudio.currentTime = 0; } catch (_) {}
    battleBgmAudio.play().catch(() => {});
  }
  function stopBattleBgm() {
    if (battleBgmAudio) {
      battleBgmAudio.pause();
      try { battleBgmAudio.currentTime = 0; } catch (_) {}
    }
    bgm.setEnabled(soundEnabled);
    if (soundEnabled) bgm.setMap(currentMapId);
    if (pageAudioSuspended) bgm.suspend?.();
  }
  if (pageAudioSuspended) {
    sound.suspend();
    bgm.suspend?.();
  }
  let exploreZoomLevel = Object.hasOwn(EXPLORE_ZOOM_SCALES, readPreference(ZOOM_KEY, "mid", LEGACY_ZOOM_KEY))
    ? readPreference(ZOOM_KEY, "mid", LEGACY_ZOOM_KEY)
    : "mid";
  let hudCollapsed = readPreference(HUD_COLLAPSED_KEY, "0") === "1";

  const player = createPlayer();

  // The simulation intentionally stays on its canonical 60 Hz fixed step, but
  // browsers/displays can present at other refresh rates (for example 72/75/120
  // Hz). Keep the previous simulation pose so exploration rendering can
  // interpolate between fixed steps without changing gameplay speed, collision,
  // camera presets or native-world geometry.
  let renderInterpolationAlpha = 1;
  let renderPreviousMapId = currentMapId;
  const renderPreviousPlayer = { x: player.x, y: player.y };
  const renderPreviousCamera = { x: camera.x, y: camera.y, zoom: camera.zoom };

  function capturePreviousExplorationRenderState() {
    renderPreviousMapId = currentMapId;
    renderPreviousPlayer.x = player.x;
    renderPreviousPlayer.y = player.y;
    renderPreviousCamera.x = camera.x;
    renderPreviousCamera.y = camera.y;
    renderPreviousCamera.zoom = camera.zoom;
  }

  // Rendering caches: keep 4K gameplay visually identical while avoiding
  // repeated creation/resampling work that is static between frames.
  const atmosphereVignetteCache = document.createElement("canvas");
  const atmosphereVignetteCtx = atmosphereVignetteCache.getContext("2d");
  let atmosphereVignetteCacheKey = "";
  const miniMapBackgroundCache = document.createElement("canvas");
  const miniMapBackgroundCacheCtx = miniMapBackgroundCache.getContext("2d");
  let miniMapBackgroundCacheKey = "";

  function ensureAtmosphereVignetteCache() {
    const cacheWidth = Math.max(1, Math.round(width));
    const cacheHeight = Math.max(1, Math.round(height));
    const key = `${cacheWidth}x${cacheHeight}`;
    if (atmosphereVignetteCacheKey === key) return;
    atmosphereVignetteCache.width = cacheWidth;
    atmosphereVignetteCache.height = cacheHeight;
    const vignette = atmosphereVignetteCtx.createRadialGradient(
      cacheWidth * .5, cacheHeight * .52, Math.min(cacheWidth, cacheHeight) * .16,
      cacheWidth * .5, cacheHeight * .52, Math.max(cacheWidth, cacheHeight) * .72,
    );
    vignette.addColorStop(0, "rgba(4,8,18,0)");
    vignette.addColorStop(.62, "rgba(4,8,18,.08)");
    vignette.addColorStop(1, "rgba(3,6,16,.66)");
    atmosphereVignetteCtx.fillStyle = vignette;
    atmosphereVignetteCtx.fillRect(0, 0, cacheWidth, cacheHeight);
    atmosphereVignetteCacheKey = key;
  }

  function flattenedMiniMapBackgroundKey(mapWidth, mapHeight) {
    if (!(world.art?.flattened && world.art?.backgroundScene)) return "";
    return [currentMapId, world.art.backgroundScene, world.pixelWidth, world.pixelHeight, mapWidth, mapHeight].join("|");
  }

  class SoundEngine {
    constructor() {
      this.context = null;
      this.suspended = document.visibilityState !== "visible";
    }
    ensure() {
      if (!soundEnabled || this.suspended || document.visibilityState !== "visible" || !audioGestureUnlocked) return null;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      if (!this.context) this.context = new AudioContext();
      if (this.context.state === "suspended") this.context.resume().catch(() => {});
      return this.context;
    }
    suspend() {
      this.suspended = true;
      if (this.context?.state === "running") this.context.suspend().catch(() => {});
    }
    resume() {
      this.suspended = false;
      if (soundEnabled && document.visibilityState === "visible" && this.context?.state === "suspended") {
        this.context.resume().catch(() => {});
      }
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
      name: "阿巡",
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
      explorationDistance: 0,
      explorationMoveSeconds: 0,
      deathStartedAt: null,
    };
  }

  function resetPlayer() {
    const fresh = createPlayer();
    Object.assign(player, fresh);
  }

  function playerDisplayName() {
    return normalizeCharacterName(player?.name) || "阿巡";
  }

  function playerStats() {
    const base = Expansion.classStatsAtLevel(playerClassId, player.level);
    const gear = Expansion.equipmentStats(equipped);
    const passives = learnedFighterPassives();
    return {
      ...base,
      // Equipment never changes Max HP.  Keep the legacy maxHp field in the
      // data schema for save compatibility, but combat/runtime HP progression
      // is owned entirely by the class level curve.
      maxHp: Math.max(1, Math.round(base.maxHp)),
      attack: Math.max(0, Math.round((base.attack + gear.attack) * (passives.attackMultiplier || 1))),
      defence: Math.max(0, Math.round((base.defence + gear.defense) * (passives.defenceMultiplier || 1))),
      speed: Math.max(
        Core.EXPLORATION_MOVEMENT.minimumWorldUnitsPerSecond,
        Core.EXPLORATION_MOVEMENT.baseWorldUnitsPerSecond
          + gear.speed * Core.EXPLORATION_MOVEMENT.equipmentPointWorldUnitsPerSecond,
      ),
      accuracy: Math.max(0, 99 + gear.accuracy + (passives.accuracy || 0) * 100),
      evasion: Math.max(0, gear.evasion + (passives.evasion || 0) * 100),
      weight: Math.max(0, gear.weight),
      move: Core.clamp(base.moveRange + gear.moveRange, 2, 7),
      critChance: Core.clamp(.1 + gear.critChance, .05, .35),
      moveRange: Core.clamp(base.moveRange + gear.moveRange, 2, 7),
      initiative: Math.max(5, Math.round(14 + gear.speed * .35 + (passives.speedBonus || 0))),
      actionSpeedBonus: passives.speedBonus || 0,
    };
  }

  function learnedFighterPassives() {
    return FighterEffects?.passiveModifiers((skillState?.unlockedSkillIds || []).map((id) => Skills.getSkill(id)).filter(Boolean)) || {};
  }

  function equipmentItem(id) {
    return Expansion.getEquipment(Expansion.DEFAULT_EQUIPMENT_CATALOG, id);
  }

  function equipmentMatchesClass(item) {
    if (!item) return false;
    if (item.classId === "fighter") return playerClassId === "fighter";
    if (item.classId === "warrior") return playerClassId === "warrior";
    return true;
  }

  function equippedWeaponName() {
    return equipmentItem(equipped.weapon)?.name || "見習燈刃";
  }

  function activeGuildCommission() {
    return Guild.activeCommission(guildCommissionState);
  }


  function makeEnemy(spawn, overrides = {}) {
    const requestedType = overrides.type || spawn.type;
    const type = ExpansionWorld.normalizeMonsterId(requestedType) || requestedType;
    const base = enemyTypes[type] || enemyTypes[requestedType];
    const level = overrides.level || spawn.level || 1;
    const blueprint = ExpansionWorld.monsterBlueprint(type);
    const levelStats = blueprint ? ExpansionWorld.monsterStatsAtLevel(type, level) : null;
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
      boss: false,
      monsterSkills: blueprint?.skills || [],
      elite: false,
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
    // Monster progression is authored by species/map data. Do not dynamically
    // scale exploration spawns to the player's level or dungeon-clear count;
    // doing so destroys the fixed Lv1→45 progression ladder.
    enemies = world.enemySpawns.map((spawn) => makeEnemy(spawn));
    projectiles = [];
    drops = [];
  }

  function readPreference(key, fallback, legacyKey = null) {
    try { return localStorage.getItem(key) || (legacyKey ? localStorage.getItem(legacyKey) : null) || fallback; } catch (_) { return fallback; }
  }

  function authenticatedUser() {
    const current = Firebase?.currentUser?.();
    return current?.uid ? current : null;
  }

  function authenticatedUid() {
    return authenticatedUser()?.uid || null;
  }

  function isGameplayAuthorized() {
    if (testingMode) return true;
    const current = authenticatedUser();
    return Boolean(
      authStateResolved &&
      authUser?.uid &&
      current?.uid === authUser.uid &&
      savePersistence?.getActiveUid?.() === current.uid &&
      savePersistence?.isCloudReady?.(),
    );
  }

  function requireAuthenticatedGameplay() {
    if (isGameplayAuthorized()) return true;
    if (authStateResolved && !authUser) openAuthPanel("login", true);
    return false;
  }

  function resetExpansionProgress(classId = playerClassId) {
    playerClassId = Skills.CLASS_IDS?.includes(classId) ? classId : (Skills.DEFAULT_CLASS_ID || "warrior");
    const starterGear = Expansion.starterEquipmentForClass(playerClassId);
    const starterWeapon = starterGear.weapon;
    const starterUpperBody = starterGear.upperBody;
    ownedEquipment = [starterWeapon, starterUpperBody];
    equipped = { head: null, weapon: starterWeapon, upperBody: starterUpperBody, lowerBody: null, hands: null, feet: null, charm: null };
    guildCommissionState = Guild.emptyState();
    guildMarks = 0;
    guildRenown = 0;
    inventory = {};
    monsterKills = {};
    dungeonClears = 0;
    defeatedDungeonBosses = new Set();
    skillState = Skills.createSkillState({ classId: playerClassId });
    checkpoint = { mapId: "world", x: overworld.start.x, y: overworld.start.y };
    facilityTab = "bag";
    facilityContext = "portable";
    selectedInventoryItemId = null;
    pendingInventoryDestroyItemId = null;
    inventoryCategory = "all";
    inventoryPage = 0;
    equipmentShopCategory = "weapon";
    shopTradeMode = "buy";
    inventoryFixtureCount = 0;
    weakPotionStepsRemaining = 0;
    weakPotionDistanceRemainder = 0;
  }

  function loadExpansionProgress(raw) {
    const data = raw && typeof raw === "object" ? raw : {};
    skillState = Skills.normalizeSkillState(data.skills, { classId: data.classId || data.skills?.classId });
    playerClassId = skillState.classId;
    const starterGear = Expansion.starterEquipmentForClass(playerClassId);
    const starterWeapon = starterGear.weapon;
    const starterUpperBody = starterGear.upperBody;
    const knownEquipment = new Set(Expansion.DEFAULT_EQUIPMENT_CATALOG.map((item) => item.id));
    const savedOwned = Array.isArray(data.ownedEquipment) ? data.ownedEquipment.filter((id) => knownEquipment.has(id)) : [];
    const gearState = Expansion.normalizeEquipmentState({
      coins: player.coins,
      level: player.level,
      ownedEquipment: [...new Set([starterWeapon, starterUpperBody, ...savedOwned])],
      classId: playerClassId,
      equipped: data.equipped || { weapon: starterWeapon, body: starterUpperBody, charm: null },
    });
    ownedEquipment = gearState.ownedEquipment;
    equipped = { ...gearState.equipped, weapon: gearState.equipped.weapon || starterWeapon, upperBody: gearState.equipped.upperBody || starterUpperBody };
    guildCommissionState = Guild.normalizeState(data.guildCommission);
    guildMarks = Core.clamp(Math.floor(Number(data.guildMarks) || 0), 0, 99999);
    guildRenown = Core.clamp(Math.floor(Number(data.guildRenown) || 0), 0, 999999);
    inventory = ItemData?.normalizeInventory?.(data.inventory, { maxEntries: 80, maxQuantity: 999 }) || {};
    weakPotionStepsRemaining = Core.clamp(Math.floor(Number(data.weakPotion?.stepsRemaining) || 0), 0, WEAK_POTION_TOTAL_STEPS);
    weakPotionDistanceRemainder = Core.clamp(Number(data.weakPotion?.distanceRemainder) || 0, 0, WEAK_POTION_WORLD_UNITS_PER_STEP - .001);
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

  function buildSaveData() {
    return {
      version: 1,
      player: {
        name: playerDisplayName(),
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
      pendingLevelUps,
      openedChests: [...openedChests],
      playTime,
      expansion: {
        currentMapId,
        classId: playerClassId,
        ownedEquipment: [...ownedEquipment],
        equipped: { ...equipped },
        guildCommission: Guild.normalizeState(guildCommissionState),
        guildMarks,
        guildRenown,
        inventory: { ...inventory },
        weakPotion: { stepsRemaining: weakPotionStepsRemaining, distanceRemainder: weakPotionDistanceRemainder },
        monsterKills: { ...monsterKills },
        dungeonClears,
        defeatedDungeonBosses: [...defeatedDungeonBosses],
        skills: Skills.normalizeSkillState(skillState),
        checkpoint: { ...checkpoint },
      },
    };
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
    if (guildMarks >= 10) results.push(grantDeckCapacityMilestone("guild:rank-2", { silent }));
    return results;
  }

  function newGame(skipIntro = false, classId = Skills.DEFAULT_CLASS_ID || "warrior") {
    if (!requireAuthenticatedGameplay()) return false;
    sound.ensure();
    closeBattleHud();
    encounterGrace = 1;
    automaticPortalReady = false;
    currentMapId = "world";
    world = overworld;
    clearExploreMovePath();
    pendingClickInteractionId = null;
    const registeredName = normalizeCharacterName(
      pendingRegistrationCharacterName
      || (savePersistence?.hasCloudSave?.() ? player?.name : authenticatedUser()?.displayName)
      || authenticatedUser()?.displayName
      || player?.name,
    );
    resetPlayer();
    if (registeredName) player.name = registeredName;
    resetExpansionProgress(classId);
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
    syncAccountStatus(savePersistence?.getCloudStatus?.());
    bgm.setMap(currentMapId);
    sound.start();
    showLocation("米克雷帝國", true);
    systemLogEntries = [];
    addSystemMessage("system", "旅程開始");
    if (!skipIntro) showToast("沿山路自由探索；想接工作就隨時返公會查看委託。", "good");
    updateHud(true);
    canvas.focus({ preventScroll: true });
    if (!testingMode) saveImportant(false);
    if (registeredName) pendingRegistrationCharacterName = "";
  }

  function requestNewGame() {
    if (!requireAuthenticatedGameplay()) return;
    if (!testingMode && savePersistence?.hasCloudSave?.() && !window.confirm("開始新旅程會覆蓋而家嘅存檔。確定重新出發？")) return;
    classSelectPanel.hidden = false;
    drawClassSelectionPreviews();
    classSelectPanel.querySelector("[data-class-choice]")?.focus({ preventScroll: true });
  }

  function startNewGameWithClass(classId) {
    classSelectPanel.hidden = true;
    newGame(false, classId);
  }

  function applySaveData(rawSave, options = {}) {
    const save = Core.sanitizeSave(rawSave);
    if (!save) {
      if (!options.silent) showToast("搵唔到可用嘅存檔", "danger");
      return false;
    }
    closeBattleHud();
    encounterGrace = 1.2;
    automaticPortalReady = false;
    currentMapId = hasMap(rawSave?.expansion?.currentMapId) ? rawSave.expansion.currentMapId : "world";
    world = maps[currentMapId];
    bgm.setMap(currentMapId);
    clearExploreMovePath();
    pendingClickInteractionId = null;
    resetPlayer();
    Object.assign(player, save.player);
    player.name = normalizeCharacterName(save.player?.name) || "阿巡";
    player.upgrades = { ...save.player.upgrades };
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
    stage.dataset.gameState = mode;
    syncAccountStatus(savePersistence?.getCloudStatus?.());
    player.invulnerable = 1;
    persistence?.markLoaded(getPersistenceFingerprint());
    sound.start();
    showLocation(zoneForPosition(player), true);
    systemLogEntries = [];
    addSystemMessage("system", `已載入 ${playerDisplayName()} 的旅程`);
    if (!options.silent) showToast(`歡迎返嚟，${playerDisplayName()}。`, "good");
    updateHud(true);
    canvas.focus({ preventScroll: true });
    return true;
  }

  function loadGame(rawSave = null, options = {}) {
    if (rawSave && typeof rawSave.preventDefault === "function") rawSave = null;
    if (!requireAuthenticatedGameplay()) return false;
    return applySaveData(savePersistence?.getCloudData?.() || null, options);
  }

  function saveGame(showNotice = true, force = false) {
    if (!isGameplayAuthorized()) return false;
    if (testingMode && !force) return true;
    if (!force && persistence && !persistence.needsSave()) return true;
    const payload = buildSaveData();
    try {
      const result = savePersistence?.save(payload, { uid: authenticatedUid() });
      if (!result?.ok) throw result?.error || new Error("cloud save unavailable");
      persistenceFingerprint = getPersistenceFingerprint();
      persistence?.markSaved(persistenceFingerprint);
      syncAccountStatus(savePersistence?.getCloudStatus?.());
      if (showNotice) {
        saveToast.classList.remove("show");
        void saveToast.offsetWidth;
        saveToast.classList.add("show");
      }
      return true;
    } catch (_) {
      if (showNotice) showToast("未能儲存到雲端；今次進度留喺記憶體，請保持登入後重試。", "danger");
      return false;
    }
  }

  function authErrorMessage(error) {
    const code = String(error?.code || "");
    const messages = {
      "auth/invalid-credential": "Email 或密碼不正確。",
      "auth/invalid-email": "請輸入有效嘅 Email。",
      "auth/email-already-in-use": "呢個 Email 已經有帳戶。",
      "auth/weak-password": "密碼至少需要 6 個字元。",
      "auth/too-many-requests": "嘗試次數太多，請稍後再試。",
      "auth/network-request-failed": "網絡連線失敗；登入後才可以開始遊戲。",
    };
    return messages[code] || error?.message || "帳戶操作未能完成。";
  }

  function setAuthMessage(message = "", kind = "") {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.dataset.kind = kind;
  }

  function setAuthMode(modeName = "login") {
    authMode = modeName === "register" ? "register" : "login";
    const registering = authMode === "register";
    authKicker.textContent = registering ? "CREATE ACCOUNT" : "ACCOUNT";
    authTitle.textContent = registering ? "建立旅程帳戶" : "登入旅程";
    authCharacterNameRow.hidden = !registering;
    authCharacterName.required = registering;
    authConfirmRow.hidden = !registering;
    authConfirmPassword.required = registering;
    authSubmitButton.querySelector("span").textContent = registering ? "建立帳戶" : "登入";
    authSwitchButton.querySelector("span").textContent = registering ? "返回登入" : "建立帳戶";
    authPassword.autocomplete = registering ? "new-password" : "current-password";
    setAuthMessage("");
  }

  function openAuthPanel(modeName = "login", required = false) {
    if (authUser) return;
    setAuthMode(modeName);
    authPanel.dataset.authRequired = required ? "true" : "false";
    authCloseButton.hidden = required;
    authPanel.hidden = false;
    authEmail.focus({ preventScroll: true });
  }

  function closeAuthPanel(force = false) {
    if (!force && authPanel.dataset.authRequired === "true") return;
    authPanel.hidden = true;
    authPanel.dataset.authRequired = "false";
    authCloseButton.hidden = false;
    setAuthMessage("");
  }

  function syncAccountStatus(status = savePersistence?.getCloudStatus?.()) {
    const email = authenticatedUser()?.email || authUser?.email || "";
    const signedIn = Boolean(authUser);
    const canPlay = isGameplayAuthorized();
    const statusLabel = signedIn
      ? `${email} · ${status === "cloud-error" ? "雲端同步有問題" : status === "syncing" ? "同步中" : "已同步"}`
      : authStateResolved ? "需要登入才可以開始遊戲" : "正在確認帳戶…";
    titleAccountStatus.dataset.authState = signedIn ? (status === "cloud-error" ? "error" : "signed-in") : "signed-out";
    titleAccountText.textContent = statusLabel;
    titleActions.hidden = !canPlay;
    accountButton.hidden = !authStateResolved || signedIn;
    titleLogoutButton.hidden = !signedIn;
    if (systemAccountText) systemAccountText.textContent = signedIn ? email : "未登入";
    if (systemAccountMeta) systemAccountMeta.textContent = signedIn
      ? status === "cloud-error" ? "雲端同步有問題" : status === "syncing" ? "正在同步雲端進度…" : "雲端進度已同步"
      : authStateResolved ? "需要登入才可以開始遊戲" : "正在確認帳戶…";
    systemLogoutButton.hidden = !signedIn;
    continueButton.hidden = !canPlay || !savePersistence?.hasCloudSave?.();
    exploreSidebar.hidden = !(canPlay && mode !== "title");
    stage.dataset.authState = canPlay ? "signed-in" : "signed-out";
  }

  function returnToTitleWithoutSave() {
    closeBattleHud();
    hideAllOverlays();
    mode = "title";
    stage.dataset.gameState = mode;
    titleScreen.hidden = false;
    syncAccountStatus(savePersistence?.getCloudStatus?.());
    updateHud(true);
  }

  function clearGameplayState() {
    closeBattleHud();
    hideAllOverlays();
    currentMapId = "world";
    world = overworld;
    mode = "title";
    stage.dataset.gameState = mode;
    titleScreen.hidden = false;
    clearExploreMovePath();
    pendingClickInteractionId = null;
    resetPlayer();
    resetExpansionProgress();
    resetEnemies();
    camera.x = player.x;
    camera.y = player.y;
    camera.zoom = targetZoom();
    persistenceFingerprint = "";
    updateHud(true);
  }

  async function handleRemoteSessionInvalidated(reason = null) {
    if (sessionKickInProgress) return;
    sessionKickInProgress = true;
    remoteSessionKickMessage = typeof reason === "string" && reason.trim()
      ? reason.trim()
      : "帳號已於其他裝置登入，你已被登出。";
    savePersistence?.deactivateUser();
    clearGameplayState();
    try {
      await Firebase?.signOut?.();
    } catch (error) {
      console.warn("Everrealm forced session sign-out failed.", error);
      authUser = null;
      syncAccountStatus();
      openAuthPanel("login", true);
      setAuthMessage(remoteSessionKickMessage, "error");
      remoteSessionKickMessage = "";
    } finally {
      sessionKickInProgress = false;
    }
  }

  async function syncAuthenticatedUser(user) {
    const token = ++authSyncToken;
    authUser = user || null;
    legacyClaimUid = null;
    syncAccountStatus(user ? "syncing" : undefined);
    if (!user) {
      pendingRegistrationCharacterName = "";
      savePersistence?.deactivateUser();
      clearGameplayState();
      syncAccountStatus();
      if (testingMode) {
        authPanel.hidden = true;
        titleActions.hidden = false;
        continueButton.hidden = true;
        return;
      }
      openAuthPanel("login", true);
      if (remoteSessionKickMessage) {
        setAuthMessage(remoteSessionKickMessage, "error");
        remoteSessionKickMessage = "";
      }
      return;
    }

    try {
      const session = await Firebase?.activateSingleSession?.(user.uid, handleRemoteSessionInvalidated);
      if (token !== authSyncToken || authUser?.uid !== user.uid) return;
      if (session && session.active === false) {
        await handleRemoteSessionInvalidated();
        return;
      }
    } catch (error) {
      if (token !== authSyncToken || authUser?.uid !== user.uid) return;
      setAuthMessage(`已登入，但未能建立裝置登入狀態：${authErrorMessage(error)}`, "error");
      showToast("未能確認裝置登入狀態，請重新登入。", "danger");
      await handleRemoteSessionInvalidated("未能確認裝置登入狀態，請重新登入。");
      return;
    }

    if (mode !== "title") returnToTitleWithoutSave();
    const result = await savePersistence?.resolveUser(authenticatedUid());
    if (token !== authSyncToken || authUser?.uid !== user.uid) return;
    syncAccountStatus(savePersistence?.getCloudStatus());
    if (result?.status === "new-account") {
      const registeredName = normalizeCharacterName(pendingRegistrationCharacterName || user.displayName);
      if (registeredName) player.name = registeredName;
    } else if (result?.status === "cloud-loaded") {
      pendingRegistrationCharacterName = "";
    }
    if (result?.status === "legacy-claim") {
      legacyClaimUid = user.uid;
      legacySaveMessage.textContent = "你可以只喺呢個帳戶使用，或者將本機角色安全連結到雲端。";
      legacySavePanel.hidden = false;
      legacyUseButton.focus({ preventScroll: true });
    } else if (result?.status === "error") {
      setAuthMessage(`已登入，但未能同步雲端存檔：${authErrorMessage(result.error)}`, "error");
      showToast("雲端暫時未能連線；登入後才可以開始遊戲。", "danger");
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value;
    const characterName = authMode === "register" ? normalizeCharacterName(authCharacterName.value) : "";
    if (authMode === "register" && !characterName) {
      setAuthMessage("請輸入角色名稱。", "error");
      authCharacterName.focus({ preventScroll: true });
      return;
    }
    if (authMode === "register" && password !== authConfirmPassword.value) {
      setAuthMessage("兩次輸入嘅密碼唔一致。", "error");
      return;
    }
    authSubmitButton.disabled = true;
    setAuthMessage("處理中…");
    try {
      if (authMode === "register") {
        pendingRegistrationCharacterName = characterName;
        await Firebase.createAccount(email, password, { displayName: characterName });
      } else {
        await Firebase.signIn(email, password);
      }
      closeAuthPanel(true);
    } catch (error) {
      if (authMode === "register") pendingRegistrationCharacterName = "";
      setAuthMessage(authErrorMessage(error), "error");
    } finally {
      authSubmitButton.disabled = false;
    }
  }

  async function sendPasswordReset() {
    const email = authEmail.value.trim();
    if (!email) {
      setAuthMessage("先輸入 Email，再寄出重設電郵。", "error");
      authEmail.focus({ preventScroll: true });
      return;
    }
    authForgotButton.disabled = true;
    try {
      await Firebase.sendPasswordReset(email);
      setAuthMessage("重設密碼電郵已寄出，請檢查收件匣。", "good");
    } catch (error) {
      setAuthMessage(authErrorMessage(error), "error");
    } finally {
      authForgotButton.disabled = false;
    }
  }

  async function signOutAccount() {
    const current = authenticatedUser();
    if (!Firebase || !authUser || !current || current.uid !== authUser.uid) return;
    titleLogoutButton.disabled = true;
    systemLogoutButton.disabled = true;
    try {
      if (weakPotionStepsRemaining > 0) {
        weakPotionStepsRemaining = 0;
        weakPotionDistanceRemainder = 0;
        markPersistenceDirty();
        saveGame(false, true);
      }
      const result = await savePersistence?.flushCloud();
      if (result && result.saved === false && !result.created) throw result.error || new Error("cloud save failed");
      savePersistence?.clearLegacyGameplayKeys?.();
      clearGameplayState();
      await Firebase.signOut();
    } catch (error) {
      showToast(`未能登出，進度未被捨棄：${authErrorMessage(error)}`, "danger");
    } finally {
      titleLogoutButton.disabled = false;
      systemLogoutButton.disabled = false;
    }
  }

  async function useLegacySave() {
    if (!legacyClaimUid || !savePersistence) return;
    legacyUseButton.disabled = true;
    legacyStartButton.disabled = true;
    legacySaveMessage.textContent = "正在安全連結本機存檔…";
    try {
      const result = await savePersistence.claimLegacySave(legacyClaimUid);
      legacySavePanel.hidden = true;
      syncAccountStatus(savePersistence.getCloudStatus());
      if (result.status === "local-migrated") showToast("本機角色已連結到雲端。", "good");
    } catch (error) {
      legacySaveMessage.textContent = `未能連結：${authErrorMessage(error)}`;
    } finally {
      legacyUseButton.disabled = false;
      legacyStartButton.disabled = false;
    }
  }

  function declineLegacySave() {
    savePersistence?.declineLegacySave();
    legacyClaimUid = null;
    legacySavePanel.hidden = true;
    syncAccountStatus(savePersistence?.getCloudStatus());
  }

  savePersistence = SavePersistence?.create({
    cloud: CloudSave,
    sanitize: (value) => Core.sanitizeSave(value),
    applySaveData,
    onStatus: (status) => syncAccountStatus(status),
  }) || null;

  function hideAllOverlays() {
    setSystemSettingsOpen(false);
    authPanel.hidden = true;
    authPanel.dataset.authRequired = "false";
    authCloseButton.hidden = false;
    legacySavePanel.hidden = true;
    dialoguePanel.hidden = true;
    levelUpPanel.hidden = true;
    deathPanel.hidden = true;
    clearAllFacilityWindows();
    classSelectPanel.hidden = true;
    skillBookConfirmPanel.hidden = true;
    skillDetailPanel.hidden = true;
    abandonCommissionPanel.hidden = true;
    guildCommissionDetailPanel.hidden = true;
    pendingCommissionDetailId = null;
    pendingAbandonContractId = null;
    battleHud.hidden = true;
    battleEncounterIntro.hidden = true;
  }

  function usesMobileExploreControls() {
    return window.matchMedia("(hover: none), (pointer: coarse)").matches;
  }

  function mobileZoomStorageKey(mapId = currentMapId) {
    return `everrealm-mobile-zoom:${mapId}`;
  }

  function mobileZoomBounds() {
    return { min: MOBILE_EXPLORE_ZOOM_MIN, max: MOBILE_EXPLORE_ZOOM_MAX };
  }

  function mobileExploreZoom(mapId = currentMapId) {
    if (!mobileExploreZoomByMap.has(mapId)) {
      let saved = NaN;
      try { saved = Number(localStorage.getItem(mobileZoomStorageKey(mapId))); } catch (_) {}
      const fallback = MOBILE_EXPLORE_ZOOM_DEFAULTS[mapId] ?? .40;
      mobileExploreZoomByMap.set(mapId, Number.isFinite(saved) && saved > 0 ? saved : fallback);
    }
    const bounds = mobileZoomBounds();
    return Core.clamp(mobileExploreZoomByMap.get(mapId), bounds.min, bounds.max);
  }

  function setMobileExploreZoom(value, options = {}) {
    const bounds = mobileZoomBounds();
    const next = Core.clamp(Number(value) || mobileExploreZoom(), bounds.min, bounds.max);
    mobileExploreZoomByMap.set(currentMapId, next);
    try { localStorage.setItem(mobileZoomStorageKey(), String(next)); } catch (_) {}
    stage.dataset.mobileZoom = next.toFixed(3);
    if (options.immediate !== false) {
      camera.zoom = next;
      renderPreviousCamera.zoom = next;
    }
    return next;
  }

  function targetZoom() {
    // Camera zoom is global authored presentation scale. Map dimensions only
    // constrain camera position; small interiors must never be auto-enlarged
    // merely to cover the viewport.
    return usesMobileExploreControls() ? mobileExploreZoom() : EXPLORE_ZOOM_SCALES[exploreZoomLevel];
  }

  function syncExploreZoomControls() {
    stage.dataset.zoomLevel = exploreZoomLevel;
    for (const button of document.querySelectorAll("[data-zoom-level]")) {
      const active = button.dataset.zoomLevel === exploreZoomLevel;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    }
  }

  function syncSystemSoundControl() {
    const effectiveVolume = soundEnabled ? bgmVolume : 0;
    if (musicVolumeSlider) musicVolumeSlider.value = String(Math.round(effectiveVolume * 100));
    if (musicVolumeValue) musicVolumeValue.textContent = `${Math.round(effectiveVolume * 100)}%`;
    if (volumeMuteButton) {
      volumeMuteButton.setAttribute("aria-pressed", String(!soundEnabled));
      volumeMuteButton.setAttribute("aria-label", soundEnabled ? "靜音" : "取消靜音");
      const icon = volumeMuteButton.querySelector("span");
      if (icon) icon.textContent = soundEnabled ? "🔊" : "🔇";
    }
    systemSettingsPopover?.style.setProperty("--music-volume", String(effectiveVolume));
  }

  function setBgmVolume(value, persist = true) {
    bgmVolume = Core.clamp(Number(value) || 0, 0, 1);
    if (bgmVolume > 0) lastAudibleBgmVolume = bgmVolume;
    bgm.setVolume?.(bgmVolume);
    if (battleBgmAudio) battleBgmAudio.volume = bgmVolume;
    if (persist) {
      try { localStorage.setItem(BGM_VOLUME_KEY, bgmVolume.toFixed(2)); } catch (_) {}
    }
    syncSystemSoundControl();
    return bgmVolume;
  }

  function setSoundEnabled(enabled, persist = true) {
    soundEnabled = Boolean(enabled);
    if (soundEnabled && bgmVolume <= 0) setBgmVolume(lastAudibleBgmVolume || .7, persist);
    if (mode === "battle") {
      bgm.setEnabled(false);
      if (battleBgmAudio) {
        if (soundEnabled && !pageAudioSuspended) battleBgmAudio.play().catch(() => {});
        else battleBgmAudio.pause();
      }
    } else {
      bgm.setEnabled(soundEnabled);
    }
    if (persist) {
      try { localStorage.setItem(SOUND_KEY, soundEnabled ? "on" : "off"); } catch (_) {}
    }
    syncSystemSoundControl();
    return soundEnabled;
  }

  function setSystemSettingsOpen(open) {
    if (!systemSettingsPopover || !systemButton) return;
    const next = Boolean(open) && ["playing", "facility"].includes(mode);
    const wasHidden = systemSettingsPopover.hidden;
    systemSettingsPopover.hidden = !next;
    systemButton.setAttribute("aria-expanded", String(next));
    if (next) {
      if (wasHidden) resetDraggableWindowPosition(systemSettingsPopover);
      syncSystemSoundControl();
      focusUiWindow(systemSettingsPopover);
    } else {
      systemSettingsPopover.classList.remove("is-ui-window-active");
    }
  }

  function syncHudCollapse() {
    exploreSidebar?.classList.toggle("is-collapsed", hudCollapsed);
    stage.dataset.hudCollapsed = String(hudCollapsed);
    if (sidebarToggle) {
      sidebarToggle.setAttribute("aria-expanded", String(!hudCollapsed));
      sidebarToggle.setAttribute("aria-label", hudCollapsed ? "展開探索功能列" : "收起探索功能列");
      sidebarToggle.title = hudCollapsed ? "展開探索功能列" : "收起探索功能列";
    }
  }

  function setHudCollapsed(collapsed) {
    hudCollapsed = Boolean(collapsed);
    try { localStorage.setItem(HUD_COLLAPSED_KEY, hudCollapsed ? "1" : "0"); } catch (_) {}
    syncHudCollapse();
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

  function handleExploreWheelZoom(event) {
    if (mode !== "playing" || usesMobileExploreControls() || event.ctrlKey || !event.deltaY) return;
    const currentIndex = Math.max(0, EXPLORE_ZOOM_ORDER.indexOf(exploreZoomLevel));
    const direction = event.deltaY < 0 ? 1 : -1;
    const nextIndex = Core.clamp(currentIndex + direction, 0, EXPLORE_ZOOM_ORDER.length - 1);
    if (nextIndex === currentIndex) return;
    event.preventDefault();
    setExploreZoomLevel(EXPLORE_ZOOM_ORDER[nextIndex], { announceChange: false });
  }

  function resize() {
    const bounds = stage.getBoundingClientRect();
    const nextWidth = Math.max(1, bounds.width);
    const nextHeight = Math.max(1, bounds.height);
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextBackingWidth = Math.round(nextWidth * nextDpr);
    const nextBackingHeight = Math.round(nextHeight * nextDpr);
    const backingChanged = canvas.width !== nextBackingWidth || canvas.height !== nextBackingHeight;
    const layoutChanged = width !== nextWidth || height !== nextHeight || dpr !== nextDpr;

    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;

    if (backingChanged) {
      canvas.width = nextBackingWidth;
      canvas.height = nextBackingHeight;
      ctx.imageSmoothingEnabled = false;
    }
    const cssWidth = `${width}px`;
    const cssHeight = `${height}px`;
    if (canvas.style.width !== cssWidth) canvas.style.width = cssWidth;
    if (canvas.style.height !== cssHeight) canvas.style.height = cssHeight;

    if (layoutChanged) {
      atmosphereVignetteCacheKey = "";
      camera.zoom = targetZoom();
      syncBattleFacingPicker();
      syncBattleCommandMenu();
    }
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

  function nearestWalkableExploreDestination(goal, navigationRadius) {
    if (!isBlocked({ x: goal.x, y: goal.y, radius: navigationRadius })) return { ...goal };
    const authoritativeNavigation = world.navigation?.authoritative === true;

    // Blocked clicks are common on authored bitmap maps. Searching A* against
    // the blocked pixel itself forces the pathfinder to exhaust a large area
    // before it can return a nearest-reachable fallback. Instead, snap the
    // requested point to the first nearby standable ring, then route normally.
    // The ring scan is deliberately bounded and samples at world-pixel scale,
    // so even the 8K town / 4K field stay responsive on pointerdown.
    const searchStep = authoritativeNavigation ? (currentMapId === "world" || currentMapId === "field" ? 16 : 8) : Math.max(8, Math.round(world.tileSize * .25));
    const sampleSpacing = Math.max(20, searchStep * 1.5);
    const maxSearchRadius = Math.min(1200, Math.max(320, Math.round(Math.min(world.pixelWidth, world.pixelHeight) * .22)));
    const seen = new Set();

    for (let radius = searchStep; radius <= maxSearchRadius; radius += searchStep) {
      const samples = Math.max(12, Math.ceil((Math.PI * 2 * radius) / sampleSpacing));
      let best = null;
      for (let index = 0; index < samples; index += 1) {
        const angle = index / samples * Math.PI * 2;
        const candidate = {
          x: Core.clamp(goal.x + Math.cos(angle) * radius, navigationRadius, world.pixelWidth - navigationRadius),
          y: Core.clamp(goal.y + Math.sin(angle) * radius, navigationRadius, world.pixelHeight - navigationRadius),
        };
        const key = `${Math.round(candidate.x)}:${Math.round(candidate.y)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (isBlocked({ x: candidate.x, y: candidate.y, radius: navigationRadius })) continue;
        const goalDistance = Core.distance(goal, candidate);
        const playerDistance = Core.distance(player, candidate);
        if (!best || goalDistance < best.goalDistance - .01 || (Math.abs(goalDistance - best.goalDistance) <= .01 && playerDistance < best.playerDistance)) {
          best = { point: candidate, goalDistance, playerDistance };
        }
      }
      if (best) return best.point;
    }
    return null;
  }

  function planExploreMove(destination) {
    clearExploreMovePath(false);
    const requestedGoal = {
      x: Core.clamp(Number(destination?.x) || player.x, player.radius, world.pixelWidth - player.radius),
      y: Core.clamp(Number(destination?.y) || player.y, player.radius, world.pixelHeight - player.radius),
    };
    if (Core.distance(player, requestedGoal) <= Math.max(5, player.radius * .45)) return true;
    const authoritativeNavigation = world.navigation?.authoritative === true;
    const navigationRadius = authoritativeNavigation
      ? Number(world.navigation?.feetRadiusPx) || (currentMapId === "world" ? MainTownNavigation?.feetRadiusPx : 3) || 3
      : player.radius;
    const goal = authoritativeNavigation
      ? nearestWalkableExploreDestination(requestedGoal, navigationRadius)
      : requestedGoal;
    if (!goal) return false;
    const baseOptions = {
      bounds: { x: 0, y: 0, w: world.pixelWidth, h: world.pixelHeight },
      sampleStep: authoritativeNavigation ? 1 : undefined,
      radius: navigationRadius,
      // Authoritative bitmap movement resolves each frame with X then Y
      // collision, so keep click routes cardinal. This prevents a diagonal
      // waypoint from slipping into a one-pixel mask boundary between the
      // two axis collision checks.
      directions: authoritativeNavigation ? 4 : 8,
      maxVisited: 14000,
      isWalkable: (point) => !isBlocked({ x: point.x, y: point.y, radius: navigationRadius }),
    };

    let path;
    if (authoritativeNavigation) {
      // First search a wider planning grid, but keep exact 1px line-clear
      // validation on every accepted segment. The search bounds are local to
      // this click instead of the entire native bitmap: a narrow authored
      // doorway can still require the fine fallback, but it must not make A*
      // inspect every unrelated room in a high-resolution interior.
      const coarseCellSize = Math.max(40, navigationRadius * 12);
      const directDistance = Core.distance(player, goal);
      const localSearchPadding = Math.min(1200, Math.max(320, directDistance * .35));
      path = Core.findOverworldPath(player, goal, {
        ...baseOptions,
        bounds: null,
        cellSize: coarseCellSize,
        terminalConnectDistance: coarseCellSize * 4,
        searchPadding: localSearchPadding,
        nearestReachable: false,
      });
      if (!path.length) {
        const fineCellSize = Math.max(12, navigationRadius * 4);
        path = Core.findOverworldPath(player, goal, {
          ...baseOptions,
          bounds: null,
          cellSize: fineCellSize,
          terminalConnectDistance: fineCellSize * 4,
          searchPadding: localSearchPadding,
          nearestReachable: true,
        });
        const localEndpoint = path[path.length - 1];
        const localFallbackTooFar = localEndpoint && Core.distance(localEndpoint, goal) > localSearchPadding * .5;
        if (!path.length || localFallbackTooFar) {
          // A long detour may genuinely leave the local window. Preserve the
          // old full-map nearest-reachable behaviour for that case; the common
          // narrow-door fallback above remains bounded and fast.
          path = Core.findOverworldPath(player, goal, {
            ...baseOptions,
            cellSize: coarseCellSize,
            terminalConnectDistance: coarseCellSize * 4,
            nearestReachable: false,
          });
          if (!path.length) {
            path = Core.findOverworldPath(player, goal, {
              ...baseOptions,
              cellSize: fineCellSize,
              terminalConnectDistance: fineCellSize * 4,
              nearestReachable: true,
            });
          }
        }
      }
    } else {
      const cellSize = Math.max(20, world.tileSize * .6);
      path = Core.findOverworldPath(player, goal, {
        ...baseOptions,
        cellSize,
        nearestReachable: true,
      });
    }

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

  function blockingGameplayOverlayOpen() {
    return Boolean(
      guildCommissionDetailPanel?.hidden === false ||
      skillBookConfirmPanel?.hidden === false ||
      skillDetailPanel?.hidden === false ||
      abandonCommissionPanel?.hidden === false ||
      authPanel?.hidden === false ||
      legacySavePanel?.hidden === false ||
      classSelectPanel?.hidden === false ||
      deathPanel?.hidden === false ||
      levelUpPanel?.hidden === false ||
      dialoguePanel?.hidden === false ||
      hasBlockingFacilityWindow()
    );
  }

  function updatePlayer(dt) {
    const stats = playerStats();
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    const drag = Math.pow(.0008, dt);
    player.knockback.x *= drag;
    player.knockback.y *= drag;

    const movementBlockedByUi = blockingGameplayOverlayOpen();
    if (movementBlockedByUi && (exploreMoveTarget || exploreMovePath.length)) {
      clearExploreMovePath();
      pendingClickInteractionId = null;
    }
    if (!movementBlockedByUi) updateSelectedPortalNavigation();
    let direction = movementBlockedByUi ? { x: 0, y: 0 } : movementInput();
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
    if (player.moving) {
      const travelDistance = Math.hypot(travelled.x, travelled.y);
      player.explorationDistance += travelDistance;
      player.explorationMoveSeconds += dt;
      updateWeakPotionTravel(travelDistance);
    }
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

  function encounterLevelMultiplier(monsterLevel) {
    if (weakPotionStepsRemaining > 0) return 1;
    const difference = player.level - Math.max(1, Number(monsterLevel) || 1);
    if (difference <= 4) return 1;
    return ({ 5: .8, 6: .6, 7: .4, 8: .2, 9: .1 })[difference] ?? 0;
  }

  function updateWeakPotionTravel(distance) {
    if (weakPotionStepsRemaining <= 0 || !(distance > 0)) return;
    weakPotionDistanceRemainder += distance;
    let consumed = 0;
    while (weakPotionDistanceRemainder >= WEAK_POTION_WORLD_UNITS_PER_STEP && weakPotionStepsRemaining > 0) {
      weakPotionDistanceRemainder -= WEAK_POTION_WORLD_UNITS_PER_STEP;
      weakPotionStepsRemaining -= 1;
      consumed += 1;
    }
    if (!consumed) return;
    markPersistenceDirty();
    if (weakPotionStepsRemaining <= 0) {
      weakPotionStepsRemaining = 0;
      weakPotionDistanceRemainder = 0;
      showToast("弱氣之藥的效果已經消失", "good");
      addSystemMessage("system", "弱氣之藥的效果已經消失");
      saveImportant(false);
    }
  }

  function useWeakPotion() {
    const count = Math.max(0, Math.floor(Number(inventory.weak_potion) || 0));
    if (!count) return showToast("你身上冇弱氣之藥。", "danger");
    inventory.weak_potion = count - 1;
    if (inventory.weak_potion <= 0) delete inventory.weak_potion;
    weakPotionStepsRemaining = WEAK_POTION_TOTAL_STEPS;
    weakPotionDistanceRemainder = 0;
    markPersistenceDirty();
    showToast("弱氣之藥生效 · 500 步", "good");
    addSystemMessage("item", "使用弱氣之藥；效果持續 500 步");
    renderFacility();
    saveImportant(false);
  }

  function performAttack() {
    if (mode !== "playing" || player.attackCooldown > 0) return;
    const target = enemies
      .filter((enemy) => enemy.alive && enemy.encounterCooldown <= 0)
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
    const healed = Math.min(maxHp - player.hp, 30);
    player.hp += healed;
    markPersistenceDirty();
    spawnBurst(player.x, player.y, "#87db82", 22, 68);
    addDamageNumber(player.x, player.y - 18, `+${healed}`, "#87db82", true);
    sound.heal();
    addSystemMessage("item", `使用小型回復藥，恢復 ${healed} HP`);
    announce(`回復 ${healed} 生命`);
    saveImportant(false);
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
      pendingLevelUps, openedChests: [...openedChests].sort(),
      expansion: { currentMapId, playerClassId, ownedEquipment: [...ownedEquipment].sort(), equipped, guildCommission: guildCommissionState, guildMarks, guildRenown, inventory, weakPotion: { stepsRemaining: weakPotionStepsRemaining, distanceRemainder: weakPotionDistanceRemainder }, monsterKills, dungeonClears, defeatedDungeonBosses: [...defeatedDungeonBosses].sort(), skills: skillState, checkpoint },
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
    guildRenown += 1;
    markPersistenceDirty();
    const result = Guild.recordHuntKill(guildCommissionState, {
      monsterId,
      instanceId: enemy?.instanceId || enemy?.id,
    });
    guildCommissionState = result.state;
    if (result.changed) {
      const commission = result.commission;
      const questText = commission.type === "hunt" && result.state.status === "ready_to_report"
        ? `委託完成：${commission.title} · 返公會回報`
        : `${commission.title} ${result.state.progress} / ${commission.objective.count}`;
      showToast(questText, "good");
      addSystemMessage("quest", questText);
    }
    return result;
  }

  function killEnemy(enemy, options = {}) {
    if (!enemy.alive) return;
    enemy.alive = false;
    enemy.respawnTimer = 11 + Math.random() * 5;
    enemy.windup = 0;
    spawnBurst(enemy.x, enemy.y, enemy.color, 24, 90);
    recordDefeatedMonster(enemy);
    if (options.grantXp !== false) {
      const rewardXp = ExpansionWorld.xpReward(enemy.xp, enemy.level, player.level);
      gainXp(rewardXp);
    }
  }

  function gainXp(amount) {
    if (player.level >= Expansion.LEVEL_CAP) {
      player.xp = 0;
      updateHud();
      return;
    }
    const oldStats = playerStats();
    if (amount > 0) addSystemMessage("reward", `獲得 ${Math.round(amount)} EXP`);
    const result = Expansion.grantExperience(player.level, player.xp, amount);
    player.level = result.level;
    player.xp = result.xp;
    if (amount > 0) markPersistenceDirty();
    if (result.levelsGained > 0) {
      pendingLevelUps = 0;
      const newStats = playerStats();
      player.hp = newStats.maxHp;
      sound.level();
      const hpGain = newStats.maxHp - oldStats.maxHp;
      addSystemMessage("system", `等級提升！LV.${player.level} · HP 已完全恢復`, "good");
      showToast(`升到 LV.${player.level} · HP 回滿 · 生命上限 +${hpGain}`, "good");
      announce(`升到 ${player.level} 級。生命已完全恢復。`);
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

  function deathExpPenaltyAmount() {
    return Math.max(1, Math.round(Expansion.xpRequired(player.level) * .05));
  }

  function applyDeathExpPenalty() {
    const penalty = deathExpPenaltyAmount();
    const result = Expansion.loseExperience(player.level, player.xp, penalty);
    const previousLevel = player.level;
    player.level = result.level;
    player.xp = result.xp;
    const equipmentResult = Expansion.unequipIneligibleEquipment({
      coins: player.coins,
      level: player.level,
      classId: playerClassId,
      ownedEquipment,
      equipped,
    });
    equipped = equipmentResult.state.equipped;
    markPersistenceDirty();
    return {
      penalty,
      deducted: result.deducted,
      levelsLost: previousLevel - player.level,
      removedItems: equipmentResult.removedItems,
    };
  }

  function playerDeath() {
    mode = "dead";
    player.deathStartedAt = elapsed;
    stage.dataset.gameState = mode;
    keys.clear();
    sound.death();
    battleHud.hidden = true;
    battleFacingPicker.hidden = true;
    deathPanel.hidden = false;
    resetDraggableWindowPosition(deathPanel.querySelector(".ui-modal-window"));
    document.getElementById("reviveHereButton").focus({ preventScroll: true });
    announce("你倒下了。");
  }

  function finishDeathRevive({ returnToTown = false } = {}) {
    if (mode !== "dead") return;
    closeBattleHud();
    encounterGrace = 1.8;
    const { deducted, levelsLost, removedItems } = applyDeathExpPenalty();
    player.hp = returnToTown ? playerStats().maxHp : 1;
    player.invulnerable = 1.8;
    player.knockback = { x: 0, y: 0 };
    player.deathStartedAt = null;
    deathPanel.hidden = true;
    mode = "playing";
    stage.dataset.gameState = mode;

    if (returnToTown) {
      // Use the normal map-transition path so BGM, pathing, portal state,
      // particles and camera all reset exactly as they do on any other return.
      transitionMap("world", overworld.start);
      player.invulnerable = 1.8;
    } else {
      resetEnemies();
      camera.x = player.x;
      camera.y = player.y;
      camera.zoom = targetZoom();
      showLocation(zoneForPosition(player), true);
      updateHud(true);
      saveImportant(false);
      canvas.focus({ preventScroll: true });
    }

    const levelText = levelsLost > 0 ? ` · 降至 LV.${player.level}` : "";
    const equipmentText = removedItems.length ? ` · 已卸下 ${removedItems.map((item) => item.name).join("、")}` : "";
    showToast(`失去 ${deducted} EXP${levelText}${equipmentText}`, "danger");
    addSystemMessage("system", `失去 ${deducted} EXP${levelText}${equipmentText}`, "danger");
  }

  function reviveHere() {
    finishDeathRevive({ returnToTown: false });
  }

  function respawn() {
    finishDeathRevive({ returnToTown: true });
  }

  function updateEnemies(dt) {
    for (const enemy of enemies) {
      if (!enemy.alive) {
        if (!enemy.boss) {
          enemy.respawnTimer -= dt;
          if (enemy.respawnTimer <= 0) Object.assign(enemy, makeEnemy({ ...enemy, x: enemy.homeX, y: enemy.homeY, type: enemy.type, level: enemy.level }, { id: enemy.id }));
        }
        continue;
      }
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
    // Monster loot is intentionally disabled for now. Combat rewards are EXP only.
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

  function authoritativeInteractionRegion(entity) {
    if (!entity || !world.navigation?.authoritative) return null;
    if (entity.navigationRegion) return entity.navigationRegion;
    // Flattened interiors author the service counter as a single `npc` region.
    // Older map objects did not copy that region id onto the NPC itself, which
    // made canvas clicks fall back to the NPC feet behind the counter and then
    // fail pathfinding. Treat that authored region as the NPC's source of truth.
    if (entity.kind === "npc" && world.navigation.data?.regions?.npc?.length && typeof world.navigation.interactionHitTest === "function") return "npc";
    return null;
  }

  function interactionDistanceToEntity(entity) {
    const region = authoritativeInteractionRegion(entity);
    if (region && typeof world.navigation.distanceToRegion === "function") {
      return world.navigation.distanceToRegion(region, player);
    }
    return Core.distance(player, entity);
  }

  function interactionReachForEntity(entity) {
    if (authoritativeInteractionRegion(entity)) {
      return Number(entity.interactionRadius) || Number(world.navigation.serviceInteractionReachPx) || 112;
    }
    return ["gate", "portal", "questBoard"].includes(entity?.kind)
      ? 82
      : Number(entity?.interactionRadius) || 58;
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
  }

  function updateNearestInteraction() {
    const candidates = [];
    for (const npc of world.npcs) candidates.push(npc);
    if (world.shrine) candidates.push(world.shrine);
    candidates.push(...world.signs, ...world.boards);
    candidates.push(...world.portals);
    nearestInteraction = candidates
      .map((entity) => ({ entity, distance: interactionDistanceToEntity(entity) }))
      .filter((item) => {
        if (item.entity.kind === "questBoard" && item.entity.navigationRegion && typeof world.navigation?.isInRegion === "function") {
          return world.navigation.isInRegion(item.entity.navigationRegion, player) ||
            Core.distance(player, item.entity.approachPoint || item.entity) <= (Number(item.entity.interactionRadius) || 80);
        }
        if (item.entity.kind === "portal" && MapTransitions.transitionTypeFor(item.entity) === TRANSITION_TYPES.PHYSICAL_DOOR) {
          return MapTransitions.pointInThreshold(item.entity, player);
        }
        return item.distance <= interactionReachForEntity(item.entity);
      })
      .sort((a, b) => a.distance - b.distance)[0]?.entity || null;
    // Interaction remains available through normal clicks/controls, but the
    // exploration canvas and HUD intentionally stay free of talk/transition
    // prompts. The authored scene art supplies the visual context.
    if (nearestInteraction) interactionText.textContent = interactionLabel(nearestInteraction);
    interactionPrompt.hidden = true;
  }

  function interactionLabel(entity) {
    if (entity.kind === "npc") return `同${npcDisplayName(entity)}傾偈`;
    if (entity.kind === "shrine") return "喺燈龕休息";
    if (entity.kind === "portal") return entity.interactionMode === "door"
      ? (entity.prompt || `進入${entity.name}`)
      : (entity.prompt || `前往${entity.name}`);
    if (entity.kind === "questBoard") return entity.boardId === "deck-loadout" ? "面板配置" : "查看公會委託";
    if (entity.kind === "wishPool") return "喺古怪水池許願";
    return "睇下";
  }

  function interact() {
    if (mode === "dialogue") return advanceDialogue();
    if (mode !== "playing" || !nearestInteraction) return;
    const entity = nearestInteraction;
    if (entity.kind === "npc") interactNpc(entity);
    else if (entity.kind === "chest") openChest(entity);
    else if (entity.kind === "shrine") restAtShrine();
    else if (entity.kind === "portal") usePortal(entity);
    else if (entity.kind === "questBoard") entity.boardId === "deck-loadout" ? openFacility("deck", "deck") : openFacility("guild");
    else if (entity.kind === "wishPool") interactWishPool(entity);
    else if (entity.kind === "sign") startDialogue({ speaker: entity.name, color: "#9a7653", lines: [entity.text] });
  }

  function interactNpc(npc) {
    if (npc.id === "clinic-healer-siu-moon") interactHealer(npc);
    else if (npc.id === "store-merchant-gin") interactGeneralStore(npc);
    else if (npc.id === "inn-keeper") interactInn(npc);
    else if (["guildmaster-yin", "guild-clerk-po"].includes(npc.id)) openFacility("guild");
    else if (["merchant-gin", "armorer-yuet"].includes(npc.id)) openFacility("shop");
    else startDialogue({ speaker: npc.name, color: npc.color, lines: [npc.chatter || "米克雷帝國今晚比平時熱鬧，多得你周圍探索。"] });
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
      return startDialogue({ speaker: npc.name, color: npc.color, lines: ["公會封信我已經收妥喇。你返公會回報，就可以領取委託報酬。"] });
    }
    const result = Guild.deliver(guildCommissionState, npc.id);
    if (!result.changed) {
      return startDialogue({ speaker: npc.name, color: npc.color, lines: ["你手上而家冇要交畀我嘅公會信件。"] });
    }
    guildCommissionState = result.state;
    sound.crystal();
    showToast(`信件已送達：${commission.title} · 返公會回報`, "good");
    saveImportant(false);
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: ["收到了，封印完整，沿途辛苦你喇。", "信件已送達；返公會向接待員回報，就可以領取技能書信封。"],
    });
  }

  function interactWishPool(pool) {
    const commission = activeGuildCommission();
    if (!commission || commission.type !== "wish") {
      return startDialogue({
        speaker: pool.name || "古怪水池",
        color: "#a88cff",
        lines: ["水面靜得有啲可疑。唔知點解，總覺得真係有人會特登走到嚟許願。"],
      });
    }
    if (guildCommissionState.status === "ready_to_report" && guildCommissionState.interactionCompleted) {
      return startDialogue({
        speaker: pool.name || "古怪水池",
        color: "#a88cff",
        lines: ["你已經替委託人許過願。至於靈唔靈……交畀個水池自己負責。"],
      });
    }
    const result = Guild.recordInteraction(guildCommissionState, pool.id);
    if (!result.changed) {
      return startDialogue({ speaker: pool.name || "古怪水池", color: "#a88cff", lines: ["而家似乎冇需要喺呢度代人許願。"] });
    }
    guildCommissionState = result.state;
    sound.crystal();
    showToast(`委託完成：${commission.title} · 返公會回報`, "good");
    addSystemMessage("quest", `委託完成：${commission.title} · 返公會回報`);
    updateHud(true);
    saveImportant(false);
    startDialogue({
      speaker: pool.name || "古怪水池",
      color: "#a88cff",
      lines: ["你替委託人認真許咗個願。", "至於靈唔靈……交畀個水池自己負責。"],
    });
  }

  function usePortal(portal) {
    const arrival = MapTransitions.resolveArrival(maps, portal) || { position: null, facing: null };
    const targetPosition = arrival.position;
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
    bgm.setMap(currentMapId);
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

  function interactSmith(npc) {
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: ["齋磨同一把舊刀始終有限。我同裝備店店員搬晒新貨入工房：短刀夠快、重刃破甲，護甲仲會改你行幾多格。"],
      choices: [
        {
          label: "入裝備店",
          action: () => transitionMap("shop", expansionMaps.shop.start),
        },
        { label: "等我準備吓先", action: () => {} },
      ],
    });
  }

  function interactHealer(npc) {
    const maxHp = playerStats().maxHp;
    const missingHp = Math.max(0, maxHp - player.hp);
    if (missingHp <= 0) {
      startDialogue({
        speaker: npc.name,
        color: npc.color,
        lines: ["目前不需要治療。"],
      });
      return;
    }
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: ["需要治療嗎？"],
      choiceLayout: "compact",
      choices: [
        {
          label: "治療",
          buttonStyle: "primary",
          action: () => {
            const healTo = playerStats().maxHp;
            player.hp = healTo;
            markPersistenceDirty();
            sound.heal();
            showToast("HP 已完全恢復", "good");
            addSystemMessage("system", "護士治療完成 · HP 已完全恢復", "good");
            saveImportant(false);
            updateHud(true);
          },
        },
        { label: "不用了", buttonStyle: "secondary", action: () => {} },
      ],
    });
  }

  function interactGeneralStore(npc) {
    openFacility("shop", "general-store");
  }

  function interactInn(npc) {
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: ["歡迎來到旅館！不過我哋仲準備緊，暫時未正式營業呢。"],
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
    const potionText = chest.reward.potions ? `、${chest.reward.potions} 支小型回復藥` : "";
    showToast(`寶箱：${chest.reward.coins || 0} 金幣${potionText}${itemText}`, "good");
    announce(`打開${chest.name}，獲得 ${chest.reward.coins} 金幣。`);
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

  function startDialogue(config) {
    mode = "dialogue";
    stage.dataset.gameState = mode;
    keys.clear();
    const speakerNpc = world?.npcs?.find((npc) => npc.name === config.speaker || npc.id === config.speaker || npc.displayName === config.speaker);
    const speakerLabel = speakerNpc ? npcDisplayName(speakerNpc) : (config.speaker || "指定角色");
    dialogue = {
      ...config,
      speaker: speakerLabel,
      lines: config.lines || ["……"],
      index: 0,
    };
    dialogueChoiceIndex = 0;
    document.getElementById("speakerName").textContent = dialogue.speaker;
    dialoguePanel.hidden = false;
    renderDialogue();
    sound.tone(520, .05, { gain: .014 });
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
    const preview = document.getElementById("fighterClassCanvas");
    if (!preview) return;
    const previewCtx = preview.getContext("2d");
    previewCtx.clearRect(0, 0, preview.width, preview.height);
    const gradient = previewCtx.createRadialGradient(preview.width / 2, preview.height * .55, 10, preview.width / 2, preview.height * .55, preview.width * .55);
    gradient.addColorStop(0, "rgba(82,220,203,.16)");
    gradient.addColorStop(1, "rgba(7,11,22,0)");
    previewCtx.fillStyle = gradient;
    previewCtx.fillRect(0, 0, preview.width, preview.height);
    // Keep the original fighter art/runtime renderer. The smaller scale and
    // lower anchor leave breathing room above the hair and below the feet.
    Art.drawCharacter(previewCtx, {
      actor: "player",
      classId: "fighter",
      x: preview.width / 2,
      y: preview.height - 26,
      scale: 2.05,
      state: "idle",
      facing: "down",
      phase: elapsed,
      bitmap: true,
    });
  }

  function renderDialogue() {
    document.getElementById("dialogueText").textContent = dialogue.lines[dialogue.index];
    const choices = document.getElementById("dialogueChoices");
    const next = document.getElementById("dialogueNext");
    const nextLabel = next.querySelector(".dialogue-next-label");
    const atEnd = dialogue.index >= dialogue.lines.length - 1;
    if (nextLabel) nextLabel.textContent = atEnd ? "確定" : "繼續";
    next.dataset.dialogueState = atEnd ? "terminal" : "continue";
    next.setAttribute("aria-label", atEnd ? "確定並關閉對話" : "繼續對話");
    if (atEnd && dialogue.choices?.length) {
      choices.hidden = false;
      choices.classList.toggle("is-compact", dialogue.choiceLayout === "compact");
      next.hidden = true;
      choices.innerHTML = "";
      dialogue.choices.forEach((choice, index) => {
        const button = document.createElement("button");
        button.type = "button";
        const choiceStyle = choice.buttonStyle === "primary" ? " is-primary primary-button" : choice.buttonStyle === "secondary" ? " is-secondary secondary-button" : "";
        button.className = `dialogue-choice${choiceStyle}${index === dialogueChoiceIndex ? " selected" : ""}`;
        button.setAttribute("role", "listitem");
        button.setAttribute("aria-pressed", String(index === dialogueChoiceIndex));
        button.textContent = choice.label;
        button.addEventListener("click", () => chooseDialogueOption(index));
        choices.appendChild(button);
      });
      choices.children[dialogueChoiceIndex]?.focus({ preventScroll: true });
    } else {
      choices.hidden = true;
      choices.classList.remove("is-compact");
      choices.innerHTML = "";
      next.hidden = false;
    }
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

  function npcDisplayName(npc) {
    return npc?.displayName || npc?.name || "指定角色";
  }

  function contractTargetName(target) {
    const blueprint = ExpansionWorld.monsterBlueprint(target);
    if (blueprint) return blueprint.name_zh;
    for (const map of Object.values(maps)) {
      const npc = map.npcs?.find((candidate) => candidate.id === target);
      if (npc) return npcDisplayName(npc);
    }
    return "指定收件人";
  }

  function inventoryItemName(id) {
    return ItemData?.getItem?.(id)?.name || String(id || "").replaceAll("_", " ").replaceAll("-", " ");
  }

  function rewardItemText(reward) {
    const items = reward?.items || [];
    return items.length ? items.map((item) => `${item.name} × ${item.quantity}`).join("、") : "公會印記";
  }

  function skillBookRewardText(commission) {
    const star = commission?.reward?.skill_envelope_star || commission?.rewardBookStar || 1;
    return `${Skills.formatSkillBookRank(star)} 技能書信封 × 1`;
  }

  function guildDiscountRate() {
    return guildMarks >= 18 ? .15 : guildMarks >= 10 ? .1 : guildMarks >= 4 ? .05 : 0;
  }

  function renderFacilitySummary() {
    const rank = guildRankInfo();
    const weapon = equipmentItem(equipped.weapon)?.name || "見習燈刃";
    const upperBody = equipmentItem(equipped.upperBody)?.name || "旅行者短衣";
    const lowerBody = equipped.lowerBody && equipped.lowerBody !== equipped.upperBody
      ? equipmentItem(equipped.lowerBody)?.name
      : null;
    const marks = facilityPanel.querySelector('[data-facility-summary="marks"] strong');
    const rankLabel = facilityPanel.querySelector('[data-facility-summary="rank"] strong');
    const gear = facilityPanel.querySelector('[data-facility-summary="equipped"] strong');
    if (marks) marks.textContent = `${guildMarks} 枚`;
    if (rankLabel) rankLabel.textContent = rank.name;
    if (gear) gear.textContent = `${weapon}／${upperBody}${lowerBody ? `／${lowerBody}` : ""}`;
  }

  function guildCommissionObjectiveText(commission) {
    if (!commission) return "";
    if (commission.type === "hunt") return `討伐${contractTargetName(commission.objective.monster_id)} × ${commission.objective.count}`;
    if (commission.type === "wish") return "前往山地深處嘅古怪水池許願";
    return `將公會信件送給：${contractTargetName(commission.objective.recipient_npc_id)}`;
  }

  function guildCommissionProgressText(commission, state = guildCommissionState) {
    if (!commission) return "";
    if (commission.type === "hunt") return `${state.progress} / ${commission.objective.count}`;
    if (commission.type === "wish") return state.interactionCompleted ? "已許願" : "尚未許願";
    return state.deliveryCompleted ? "已送達" : "尚未送達";
  }

  function guildCommissionProgressValue(commission, state = guildCommissionState) {
    if (!commission) return 0;
    if (commission.type === "hunt") return Math.min(commission.objective.count, state.progress);
    if (commission.type === "wish") return state.interactionCompleted ? 1 : 0;
    return state.deliveryCompleted ? 1 : 0;
  }

  function renderMissionFacility() {
    const active = activeGuildCommission();
    if (!active) {
      facilityContent.innerHTML = `
        <section class="mission-view is-empty" aria-label="目前任務">
          <strong>目前沒有進行中的任務</strong>
        </section>`;
      setFacilityFooter("");
      return;
    }
    const ready = guildCommissionState.status === "ready_to_report";
    const progressText = guildCommissionProgressText(active);
    const progressMax = active.type === "hunt" ? active.objective.count : 1;
    const progressValue = guildCommissionProgressValue(active);
    const progressPercent = Math.min(100, progressValue / Math.max(1, progressMax) * 100);
    facilityContent.innerHTML = `
      <section class="mission-view" aria-label="目前任務">
        <article class="mission-card ${ready ? "is-ready" : ""}">
          <div class="mission-card-heading">
            <strong>${active.title}</strong>
            <span>${ready ? "已完成" : "進行中"}</span>
          </div>
          <div class="mission-task-row">
            <div class="mission-objective"><small>目標</small><strong>${guildCommissionObjectiveText(active)}</strong></div>
            <div class="mission-progress-row"><small>進度</small><strong>${progressText}</strong></div>
          </div>
          <div class="mission-progress-bar" role="progressbar" aria-label="任務進度" aria-valuemin="0" aria-valuemax="${progressMax}" aria-valuenow="${progressValue}"><i style="width:${progressPercent}%"></i></div>
          ${ready ? '<p class="mission-report-note">請返回公會回報任務</p>' : ""}
        </article>
      </section>`;
    setFacilityFooter("");
  }

  function guildRewardText(commission) {
    const coins = Math.max(0, Math.floor(Number(commission?.reward?.coins) || 0));
    return `${skillBookRewardText(commission)} + ${coins.toLocaleString("zh-HK")} 金幣`;
  }

  function renderGuildFacility() {
    const active = activeGuildCommission();
    const offers = Guild.DEFAULT_COMMISSIONS || currentContractOffers();
    const rows = offers.map((offer) => {
      const activeRow = active?.id === offer.id;
      const stateLabel = activeRow ? (guildCommissionState.status === "ready_to_report" ? "待回報" : "進行中") : "";
      return `<button class="guild-simple-row ${activeRow ? "is-active" : ""}" type="button" data-facility-action="commission-detail" data-offer-id="${offer.id}"><strong>${offer.title}</strong><span class="guild-simple-stars">${Skills.formatSkillBookRank(offer.star)}</span>${stateLabel ? `<em>${stateLabel}</em>` : ""}</button>`;
    }).join("");
    facilityContent.innerHTML = `<section class="guild-simple-list" aria-label="公會委託">${rows || '<div class="facility-empty-state"><strong>暫時冇委託</strong></div>'}</section>`;
    setFacilityFooter("");
  }

  function renderGuildCommissionDetail(commissionId) {
    const commission = Guild.getCommission(commissionId) || currentContractOffers().find((offer) => offer.id === commissionId) || activeGuildCommission();
    if (!commission || !guildCommissionDetailContent) return false;
    const active = activeGuildCommission();
    const isActive = active?.id === commission.id;
    const ready = isActive && guildCommissionState.status === "ready_to_report";
    const objective = guildCommissionObjectiveText(commission);
    const progress = isActive ? guildCommissionProgressText(commission, guildCommissionState) : (commission.type === "hunt" ? `0 / ${commission.objective.count}` : "尚未完成");
    const action = isActive
      ? ready
        ? `<button class="facility-action-button" type="button" data-guild-detail-action="claim" data-contract-id="${guildCommissionState.cycle}:${commission.id}">回報並領取</button>`
        : `<button class="facility-action-button is-quiet" type="button" data-guild-detail-action="abandon" data-contract-id="${guildCommissionState.cycle}:${commission.id}">放棄委託</button>`
      : active
        ? `<button class="facility-action-button" type="button" disabled>已有進行中委託</button>`
        : `<button class="facility-action-button" type="button" data-guild-detail-action="accept" data-offer-id="${commission.id}">接受委託</button>`;
    guildCommissionDetailContent.innerHTML = `<p class="modal-kicker">${Skills.formatSkillBookRank(commission.star)} 公會委託</p><h2 id="guildCommissionDetailTitle">${commission.title}</h2><p class="guild-detail-description">${commission.description}</p><dl class="guild-detail-grid"><div><dt>目標</dt><dd>${objective}</dd></div><div><dt>建議等級</dt><dd>Lv.${commission.recommendedLevel}</dd></div><div><dt>進度</dt><dd>${progress}</dd></div><div><dt>報酬</dt><dd>${guildRewardText(commission)}</dd></div></dl><div class="guild-detail-actions">${action}</div>`;
    pendingCommissionDetailId = commission.id;
    guildCommissionDetailPanel.hidden = false;
    focusUiWindow(guildCommissionDetailPanel.querySelector(".ui-modal-window"));
    resetDraggableWindowPosition(guildCommissionDetailPanel.querySelector(".ui-modal-window"));
    return true;
  }

  function closeGuildCommissionDetail() {
    pendingCommissionDetailId = null;
    guildCommissionDetailPanel.hidden = true;
  }


  function totalOwnedSkillBooks() {
    const state = Skills.normalizeSkillState(skillState);
    return Guild.COMMISSION_STARS.reduce((total, star) => total + (guildCommissionState.envelopes[star] || 0), 0)
      + Skills.BOOK_STARS.reduce((total, star) => total + (state.books[star] || 0), 0)
      + Object.values(state.manualCounts || {}).reduce((total, count) => total + count, 0);
  }

  function updateMenuBadges() {
    const bookCount = totalOwnedSkillBooks();
    setTextIfChanged(inventoryBookBadge, bookCount > 99 ? "99+" : String(bookCount));
    const shouldHide = bookCount <= 0;
    if (inventoryBookBadge.hidden !== shouldHide) inventoryBookBadge.hidden = shouldHide;
    const label = bookCount
      ? `打開物品欄（I），有 ${bookCount} 本未開技能書`
      : "打開物品欄（I）";
    if (inventoryButton.getAttribute("aria-label") !== label) inventoryButton.setAttribute("aria-label", label);

    const missionReady = Boolean(activeGuildCommission() && guildCommissionState.status === "ready_to_report");
    if (missionMenuBadge && missionMenuBadge.hidden === missionReady) missionMenuBadge.hidden = !missionReady;

    let skillReady = false;
    try {
      const normalized = Skills.normalizeSkillState(skillState, { classId: playerClassId });
      skillReady = Skills.getSkillsByClass(playerClassId).some((skill) => Skills.skillLearnability(normalized, skill.id) === "canLearn");
    } catch (_) {}
    if (skillMenuBadge && skillMenuBadge.hidden === skillReady) skillMenuBadge.hidden = !skillReady;
  }

  function renderBagFacility() {
    skillState = Skills.normalizeSkillState(skillState);
    const stats = playerStats();
    const maxHp = stats.maxHp;
    const items = [];
    const equipmentSlotOrder = { head: 0, weapon: 1, upperBody: 2, lowerBody: 3, hands: 4, feet: 5, charm: 6 };
    const equipmentSlotNames = { head: "頭部", weapon: "武器", upperBody: "上身", lowerBody: "下身", hands: "手部", feet: "腳部", charm: "飾物" };
    for (const item of Expansion.DEFAULT_EQUIPMENT_CATALOG
      .filter((entry) => ownedEquipment.includes(entry.id))
      .sort((left, right) => Number(Expansion.isEquipmentEquipped({ equipped }, right.id)) - Number(Expansion.isEquipmentEquipped({ equipped }, left.id))
        || equipmentSlotOrder[left.slot] - equipmentSlotOrder[right.slot]
        || left.requiredLevel - right.requiredLevel
        || left.name.localeCompare(right.name, "zh-HK"))) {
      const isEquipped = Expansion.isEquipmentEquipped({ equipped }, item.id);
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
        disabled: !isEquipped && (levelLocked || classLocked),
        action: isEquipped ? "unequip" : "equip",
        actionLabel: isEquipped ? "卸下" : classLocked ? "職業不符" : levelLocked ? "無法裝備" : "裝備",
        destroyable: !isEquipped,
      });
    }
    if (player.potions > 0) items.push({
      id: "healing_potion", name: "小型回復藥", category: "消耗品", quantity: player.potions,
      categoryKey: "consumable",
      description: "回復 30 HP；探索同戰鬥都用得到。",
      detail: player.hp >= maxHp ? "目前生命已全滿" : `目前 HP ${Math.ceil(player.hp)} / ${maxHp}`,
      action: "use-potion", actionLabel: player.hp >= maxHp ? "生命已滿" : "使用", disabled: player.hp >= maxHp,
      destroyable: true,
    });
    const weakPotionCount = Math.max(0, Math.floor(Number(inventory.weak_potion) || 0));
    if (weakPotionCount > 0) items.push({
      id: "weak_potion", name: "弱氣之藥", category: "消耗品", quantity: weakPotionCount,
      categoryKey: "consumable",
      description: ItemData?.getItem?.("weak_potion")?.description || "一瓶來歷可疑的藥氣之藥。據說喝下後會令人變得孱弱，但身上散出的怪味，卻會令附近魔物蠢蠢欲動。",
      detail: weakPotionStepsRemaining > 0 ? "怪味仲纏住你，附近霧獸似乎更加躁動。" : "喝下後，這股古怪氣味會跟住你一段路。",
      action: "use-weak-potion", actionLabel: weakPotionStepsRemaining > 0 ? "重新使用" : "使用",
      destroyable: true,
    });
    for (const star of Guild.COMMISSION_STARS) {
      const count = guildCommissionState.envelopes[star] || 0;
      if (!count) continue;
      items.push({
        id: `skill_envelope_${star}`,
        iconType: "envelope",
        name: `${Skills.formatSkillBookRank(star)} 技能書信封`,
        category: "公會委託獎勵",
        categoryKey: "skillbook",
        quantity: count,
        description: "",
        detail: "",
        action: "open-envelope", actionLabel: "開封", envelopeStar: star,
        destroyable: true,
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
        rankLabel: Skills.formatSkillBookRank(star),
        category: `${Skills.formatSkillBookRank(star)} 技能書`,
        categoryKey: "skillbook",
        quantity: count,
        description: `開封後會抽出 ${pool.length} 本對應職業技能書；唔會直接學識。`,
        detail: `技能消耗範圍 ${apBand.min}–${apBand.max} AP`,
        action: "open-book", actionLabel: "開封", bookStar: star,
        destroyable: true,
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
        iconItemId: `skill_book_${Core.clamp(Math.round(Number(skill.star) || 1), 1, 3)}`,
        name: `技能書：${skill.name}`,
        rankLabel: skill.classId === "fighter" ? fighterGuildBookRankText(skill) : skillStars(skill.star),
        category: `${skill.classId === "fighter" ? fighterGuildBookRankText(skill) : skillStars(skill.star)} 技能書`,
        categoryKey: "skillbook",
        quantity: count,
        description: skill.description,
        detail: `${skillRangeText(skill)} · 速度 ${skill.speedGrade}`,
        action: "use-manual",
        actionLabel: learnability.status === "learned" ? "已學習" : learnability.status === "canLearn" ? "學習" : "無法學習",
        disabled: learnability.status !== "canLearn",
        manualSkillId: skill.id,
        destroyable: true,
      });
    }
    for (const [id, amount] of Object.entries(inventory)
      .filter(([id, quantity]) => id !== "weak_potion" && quantity > 0)
      .sort(([left], [right]) => inventoryItemName(left).localeCompare(inventoryItemName(right), "zh-HK"))) {
      const itemData = ItemData?.getItem?.(id);
      const categoryKey = itemData?.kind === "consumable" ? "consumable" : "material";
      items.push({ id, name: inventoryItemName(id), category: categoryKey === "consumable" ? "消耗品" : "素材", categoryKey, quantity: amount, description: materialDescription(id), detail: categoryKey === "consumable" ? "消耗品" : "冒險素材", destroyable: itemData?.destroyable !== false && itemData?.kind !== "quest" });
    }
    if (inventoryFixtureCount > 0) {
      const fixtureNames = ["霧晶碎片", "舊銅齒輪", "潮濕苔絲", "微光粉末", "沉燈玻璃", "巡夜羽片"];
      for (let index = 0; index < inventoryFixtureCount; index += 1) {
        items.push({ id: `fixture_material_${index + 1}`, name: `${fixtureNames[index % fixtureNames.length]} ${index + 1}`, category: "素材 · 測試", categoryKey: "material", quantity: 1, iconId: 4 + (index % 11), description: "只供版面壓力測試使用，不會寫入存檔。", detail: "UI fixture" });
      }
    }
    const categoryLabels = { all: "全部", equipment: "裝備", consumable: "消耗品", skillbook: "技能書", material: "素材" };
    const filteredItems = items.filter((item) => inventoryCategory === "all" || item.categoryKey === inventoryCategory);
    const pageCount = Math.max(1, Math.ceil(filteredItems.length / INVENTORY_PAGE_SIZE));
    inventoryPage = Core.clamp(inventoryPage, 0, pageCount - 1);
    const visibleItems = filteredItems.slice(inventoryPage * INVENTORY_PAGE_SIZE, (inventoryPage + 1) * INVENTORY_PAGE_SIZE);
    if (!items.some((item) => item.id === selectedInventoryItemId)) {
      selectedInventoryItemId = null;
      pendingInventoryDestroyItemId = null;
    }
    const selectedItem = items.find((item) => item.id === selectedInventoryItemId) || null;
    const iconMarkup = (item, extraClass = "") => item.equipment
      ? equipmentIconHtml(item.equipment, extraClass)
      : item.iconType === "envelope"
        ? envelopeIconHtml(item.name)
        : item.iconItemId
          ? itemIconHtml(item.iconItemId, item.name, extraClass, 4)
          : Number.isFinite(Number(item.iconId))
            ? atlasIconHtml("item", Number(item.iconId), item.name, extraClass)
            : itemIconHtml(item.id, item.name, extraClass, 4);
    const actionMarkup = (item) => {
      const buttons = [];
      const confirmingDestroy = item.destroyable && pendingInventoryDestroyItemId === item.id;
      if (item.action && !confirmingDestroy) {
        const attrs = [
          `data-facility-action="${item.action}"`,
          item.bookStar ? `data-book-star="${item.bookStar}"` : "",
          item.envelopeStar ? `data-envelope-star="${item.envelopeStar}"` : "",
          item.manualSkillId ? `data-skill-id="${item.manualSkillId}"` : "",
          `data-item-id="${item.id}"`,
        ].filter(Boolean).join(" ");
        const actionClass = item.action === "unequip" ? "secondary-button" : "facility-action-button";
        buttons.push(`<button class="${actionClass}" type="button" ${attrs} ${item.disabled ? "disabled" : ""}>${item.actionLabel}</button>`);
      }
      if (item.destroyable) {
        if (confirmingDestroy) {
          buttons.push(`<button class="facility-action-button inventory-destroy-confirm" type="button" data-facility-action="confirm-destroy-item" data-item-id="${item.id}">確定銷毀</button>`);
          buttons.push(`<button class="secondary-button inventory-destroy-cancel" type="button" data-facility-action="cancel-destroy-item" data-item-id="${item.id}">取消</button>`);
        } else {
          buttons.push(`<button class="secondary-button inventory-destroy-button" type="button" data-facility-action="destroy-item" data-item-id="${item.id}">銷毀</button>`);
        }
      }
      return buttons.join("");
    };
    const quantityMarkup = (item) => item.quantity > 1 ? `<b class="inventory-quantity" aria-label="數量 ${item.quantity}">×${item.quantity}</b>` : "";
    const itemCards = visibleItems.map((item) => `<button class="inventory-grid-item ui-slot ${item.equipment ? "inventory-equipment-item" : ""} ${item.isEquipped ? "is-equipped" : ""} ${selectedItem?.id === item.id ? "is-selected" : ""}" type="button" data-item-id="${item.id}" data-facility-action="select-item" aria-pressed="${selectedItem?.id === item.id ? "true" : "false"}" aria-label="選取${item.name}，數量 ${item.quantity}">
      <div class="inventory-item-art">${iconMarkup(item)}${quantityMarkup(item)}${item.isEquipped ? '<span class="inventory-equipped-mark" aria-label="已裝備" title="已裝備">✓</span>' : ""}</div>
      <div class="inventory-item-copy"><strong title="${item.name}">${item.name}</strong></div>
    </button>`).join("");
    const filters = Object.entries(categoryLabels).map(([key, label]) => `<button class="inventory-filter" type="button" data-facility-action="inventory-filter" data-inventory-category="${key}" aria-selected="${inventoryCategory === key ? "true" : "false"}">${label}</button>`).join("");
    const pager = pageCount > 1 ? `<nav class="inventory-pager" aria-label="物品分頁"><button type="button" data-facility-action="inventory-prev" ${inventoryPage <= 0 ? "disabled" : ""} aria-label="上一頁">‹</button><span>${inventoryPage + 1} / ${pageCount}</span><button type="button" data-facility-action="inventory-next" ${inventoryPage >= pageCount - 1 ? "disabled" : ""} aria-label="下一頁">›</button></nav>` : "";
    const detailCopy = selectedItem
      ? [selectedItem.description ? `<p>${selectedItem.description}</p>` : "", selectedItem.detail ? `<span>${selectedItem.detail}</span>` : ""].filter(Boolean).join("")
      : "";
    const detail = selectedItem
      ? `<div class="inventory-detail-layer" data-inventory-detail-dismiss data-no-window-drag aria-hidden="false"><section class="inventory-detail-popup" role="dialog" aria-modal="true" aria-label="${selectedItem.name}" aria-live="polite"><div class="inventory-detail-art">${iconMarkup(selectedItem)}${quantityMarkup(selectedItem)}</div>${selectedItem.rankLabel ? `<small class="inventory-detail-rank">${selectedItem.rankLabel}</small>` : ""}<strong class="inventory-detail-name">${selectedItem.name}</strong>${detailCopy ? `<div class="inventory-detail-copy">${detailCopy}</div>` : ""}<div class="inventory-detail-actions">${actionMarkup(selectedItem)}</div></section></div>`
      : "";
    facilityContent.innerHTML = `
      <section class="unified-inventory-layout" aria-label="角色裝備與隨身物品">
        <aside class="bag-loadout-panel" aria-label="角色目前裝備"><div class="paperdoll-board bag-paperdoll-board bag-equipment-grid">${paperdollSlotHtml("head", "頭部", "head", { iconOnly: true })}${paperdollSlotHtml("weapon", "武器", "weapon", { iconOnly: true })}${paperdollSlotHtml("upperBody", "上身", "upperBody", { iconOnly: true })}${paperdollSlotHtml("hands", "手部", "hands", { iconOnly: true })}${paperdollSlotHtml("lowerBody", "下身", "lowerBody", { iconOnly: true })}${paperdollSlotHtml("feet", "腳部", "feet", { iconOnly: true })}</div></aside>
        <section class="bag-items-panel" aria-label="隨身物品">
          <div class="inventory-toolbar"><div class="inventory-filter-bar" role="tablist" aria-label="物品分類">${filters}</div><div class="inventory-money" aria-label="持有金幣">${coinAmountHtml(player.coins)}</div></div>
          ${filteredItems.length ? `<div class="inventory-icon-grid" role="list" aria-label="所有隨身物品">${itemCards}</div>${pager}` : `<div class="inventory-empty-grid" aria-label="呢類物品仲係空嘅"></div>`}
        </section>${detail}
      </section>`;
    setFacilityFooter("");
  }

  function equipmentIconHtml(item, extraClass = "") {
    const icon = item?.icon || EquipmentData?.getEquipment?.(item?.id)?.icon;
    if (icon?.type === "image" && icon.src) {
      return `<span class="equipment-item-art ${extraClass}" style="--equipment-art:url('${icon.src}')" role="img" aria-label="${item?.name || "裝備"}"></span>`;
    }
    if (icon?.type === "atlas" && icon.atlas === "fighter-equipment") {
      const index = Math.max(0, Math.min(3, Number(icon.index) || 0));
      return `<span class="atlas-icon fighter-equipment-icon-atlas ${extraClass}" style="--atlas-x:${index * 33.333333}%;--atlas-y:0%" role="img" aria-label="${item?.name || "拳套"}"></span>`;
    }
    return atlasIconHtml("equipment", icon?.index ?? item?.iconIndex ?? 0, item?.name || "裝備", extraClass);
  }

  function paperdollSlotIconHtml(visualSlot) {
    const common = 'viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
    const paths = {
      head: '<circle cx="32" cy="24" r="11"></circle><path d="M17 53c2-10 8-16 15-16s13 6 15 16"></path><path d="M23 17c3-7 15-9 20 0"></path>',
      upperBody: '<path d="M22 15 12 24l7 9 5-4v22h16V29l5 4 7-9-10-9-5 5H27z"></path><path d="M27 20h10"></path>',
      lowerBody: '<path d="M21 14h22l-2 17-5 20h-8l-1-18-1 18h-8l-5-20z"></path><path d="M27 14v19M37 14v19"></path>',
      feet: '<path d="M12 37c8 0 11-6 14-14l8 3-3 16H14c-3 0-4-2-2-5z"></path><path d="M34 39c7 1 11-4 15-11l7 5-6 15H35c-4 0-5-5-1-9z"></path>',
      charm: '<path d="M20 13c3 8 7 13 12 17 5-4 9-9 12-17"></path><path d="m32 27 9 9-9 14-9-14z"></path><circle cx="32" cy="37" r="2"></circle>',
      hands: '<path d="M10 25c0-5 4-9 9-9h3c5 0 9 4 9 9v5c0 4-3 7-7 7h-1v8H12V34c0-3 2-6 5-7-4 0-7-1-7-2z"></path><path d="M12 45h12M16 37v8"></path><path d="M54 25c0-5-4-9-9-9h-3c-5 0-9 4-9 9v5c0 4 3 7 7 7h1v8h11V34c0-3-2-6-5-7 4 0 7-1 7-2z"></path><path d="M40 45h12M48 37v8"></path>',
      weapon: '<path d="m18 18 11 11-6 6-11-11z"></path><path d="m46 18-11 11 6 6 11-11z"></path><path d="M23 35 14 50M41 35l9 15"></path><path d="M10 50h10M44 50h10"></path>',
    };
    return `<span class="paperdoll-line-icon" aria-hidden="true"><svg ${common}>${paths[visualSlot] || paths.charm}</svg></span>`;
  }

  function paperdollSlotHtml(visualSlot, label, equipmentSlot, options = {}) {
    let item = equipmentSlot ? equipmentItem(equipped[equipmentSlot]) : null;
    if (equipmentSlot === "lowerBody" && !item && equipped.upperBody) {
      const upper = equipmentItem(equipped.upperBody);
      if (upper?.occupiesSlots?.includes?.("lowerBody")) item = upper;
    }
    if (!item) return `<article class="paperdoll-slot is-empty ${options.iconOnly ? "is-icon-only" : ""}" data-paperdoll-slot="${visualSlot}" aria-label="${label}：未裝備">${paperdollSlotIconHtml(visualSlot)}</article>`;
    if (options.iconOnly) {
      return `<button class="paperdoll-slot is-filled is-icon-only" type="button" data-paperdoll-slot="${visualSlot}" data-facility-action="select-item" data-item-id="${item.id}" aria-label="${label}：${item.name}，查看詳情">
        ${equipmentIconHtml(item, "paperdoll-slot-icon")}
        <strong class="paperdoll-compact-name" title="${item.name}">${item.name}</strong>
      </button>`;
    }
    return `<article class="paperdoll-slot is-filled" data-paperdoll-slot="${visualSlot}" aria-label="${label}：${item.name}">
      ${equipmentIconHtml(item, "paperdoll-slot-icon")}<div class="paperdoll-item-name"><strong>${item.name}</strong></div>
    </article>`;
  }

  function drawEquipmentPaperdoll() {
    const doll = document.getElementById("equipmentPaperdoll");
    if (!doll) return;
    const dollCtx = doll.getContext("2d");
    dollCtx.clearRect(0, 0, doll.width, doll.height);
    Art.drawCharacter(dollCtx, { actor: "player", classId: playerClassId, x: doll.width / 2, y: doll.height - 8, scale: 1.8, state: "idle", facing: "down", phase: elapsed, bitmap: true });
  }

  function renderEquipmentFacility() {
    const stats = playerStats();
    const slotOrder = { head: 0, weapon: 1, upperBody: 2, lowerBody: 3, hands: 4, feet: 5, charm: 6 };
    const collection = Expansion.DEFAULT_EQUIPMENT_CATALOG
      .filter((item) => ownedEquipment.includes(item.id) && equipmentMatchesClass(item))
      .sort((left, right) => slotOrder[left.slot] - slotOrder[right.slot]
        || Number(Expansion.isEquipmentEquipped({ equipped }, right.id)) - Number(Expansion.isEquipmentEquipped({ equipped }, left.id))
        || left.requiredLevel - right.requiredLevel)
      .map((item) => {
        const isEquipped = Expansion.isEquipmentEquipped({ equipped }, item.id);
        const levelLocked = player.level < item.requiredLevel;
        const slotLabel = { head: "頭部", weapon: "武器", upperBody: "上身", lowerBody: "下身", hands: "手部", feet: "腳部", charm: "飾物" }[item.slot] || item.slot;
        return `<article class="gear-collection-item ${isEquipped ? "is-equipped" : ""} ${levelLocked ? "is-locked" : ""}">
          ${equipmentIconHtml(item, "gear-collection-icon")}
          <div><small>${slotLabel}${item.occupiesSlots.length > 1 ? " · 一件式" : ""} · LV.${item.requiredLevel}</small><strong>${item.name}</strong><p>${item.description}</p><span>${statText(item.stats)}</span></div>
          <button class="facility-action-button${isEquipped ? " is-quiet" : ""}" type="button" data-facility-action="${isEquipped ? "unequip" : "equip"}" data-item-id="${item.id}" ${!isEquipped && levelLocked ? "disabled" : ""}>${isEquipped ? "卸下" : levelLocked ? "無法裝備" : "換上"}</button>
        </article>`;
      }).join("");
    facilityContent.innerHTML = `
      <div class="facility-section-heading equipment-overview-heading"><div><small>PAPER DOLL</small><h3>目前裝備</h3></div><span>LV.${player.level} ${playerDisplayName()}</span></div>
      <section class="paperdoll-layout" aria-label="角色裝備槽位">
        <div class="paperdoll-board">
          ${paperdollSlotHtml("head", "頭部", "head")}
          ${paperdollSlotHtml("upperBody", "上身", "upperBody")}
          ${paperdollSlotHtml("lowerBody", "下身", "lowerBody")}
          ${paperdollSlotHtml("feet", "腳部", "feet")}
          <div class="paperdoll-avatar"><canvas id="equipmentPaperdoll" width="180" height="280" aria-hidden="true"></canvas><strong>${playerDisplayName()}</strong><span>LV.${player.level}</span></div>
          ${paperdollSlotHtml("charm", "飾物", "charm")}
          ${paperdollSlotHtml("hands", "手部", "hands")}
          ${paperdollSlotHtml("weapon", "武器", "weapon")}
        </div>
        <aside class="paperdoll-stats"><small>CURRENT STATS</small><strong>目前能力</strong><dl><div><dt>生命</dt><dd>${stats.maxHp}</dd></div><div><dt>攻擊</dt><dd>${stats.attack}</dd></div><div><dt>防禦</dt><dd>${stats.defence}</dd></div><div><dt>速度</dt><dd>${Math.round(stats.speed)}</dd></div><div><dt>移動</dt><dd>${stats.moveRange}</dd></div></dl></aside>
      </section>
      <div class="facility-section-heading skill-list-heading"><div><small>OWNED GEAR</small><h3>已擁有裝備</h3></div><span>${ownedEquipment.length} 件</span></div>
      <div class="gear-collection-grid">${collection || '<div class="facility-empty-state"><strong>未有裝備</strong></div>'}</div>
      <div class="facility-note"><b>裝備槽位</b><span>頭部、武器、上身、下身都會按裝備資料獨立佔用；武道服屬一件式裝備，會同時佔用上身及下身。</span></div>`;
    drawEquipmentPaperdoll();
    setFacilityFooter(`<span aria-hidden="true">⚔</span> 換裝會即時更新角色能力並自動保存。`);
  }

  function shopTradeTabsHtml() {
    return `<nav class="shop-trade-tabs" role="tablist" aria-label="交易模式">
      <button class="equipment-shop-tab" type="button" role="tab" data-facility-action="shop-trade-mode" data-shop-trade-mode="buy" aria-selected="${shopTradeMode === "buy" ? "true" : "false"}">購買</button>
      <button class="equipment-shop-tab" type="button" role="tab" data-facility-action="shop-trade-mode" data-shop-trade-mode="sell" aria-selected="${shopTradeMode === "sell" ? "true" : "false"}">出售</button>
    </nav>`;
  }

  function equipmentSellPrice(item) {
    const cost = Math.max(0, Math.floor(Number(item?.cost) || 0));
    return cost > 0 ? Math.max(1, Math.floor(cost * SHOP_SELL_RATE)) : 0;
  }

  function generalStoreSellPrice(itemId) {
    const shopItem = GENERAL_STORE_GOODS_BY_ID.get(itemId);
    if (shopItem) return Math.max(1, Math.floor(shopItem.price * SHOP_SELL_RATE));
    const item = ItemData?.getItem?.(itemId);
    if (!item || ["ui", "currency", "quest"].includes(item.kind) || item.sellable === false) return 0;
    // Materials do not currently have a purchase price.  Give them a simple
    // baseline resale value so unwanted drops can always be cleared for coin.
    return 10;
  }

  function renderShopFacility() {
    const atShop = currentMapId === "shop";
    const discountRate = guildDiscountRate();
    if (!['buy', 'sell'].includes(shopTradeMode)) shopTradeMode = "buy";
    const tradeTabs = shopTradeTabsHtml();

    if (shopTradeMode === "sell") {
      const sellable = Expansion.DEFAULT_EQUIPMENT_CATALOG
        .filter((item) => ownedEquipment.includes(item.id) && equipmentSellPrice(item) > 0)
        .sort((left, right) => left.requiredLevel - right.requiredLevel || left.name.localeCompare(right.name, "zh-HK"));
      const cards = sellable.map((item) => {
        const isEquipped = Expansion.isEquipmentEquipped({ equipped }, item.id);
        const sellPrice = equipmentSellPrice(item);
        return `<article class="equipment-card equipment-shop-card ${isEquipped ? "is-equipped" : ""}">
          <div class="equipment-shop-art">${equipmentIconHtml(item, "equipment-card-atlas-icon")}</div>
          <div class="equipment-copy">
            <div class="facility-card-heading"><span class="facility-chip">LV.${item.requiredLevel}</span><strong>${item.name}</strong></div>
            <p>${item.description}</p>
            <small>${statText(item.stats)}</small>
          </div>
          <div class="equipment-shop-purchase"><span class="equipment-price">出售價 ${coinAmountHtml(sellPrice, "store-price")}</span><button class="facility-action-button" type="button" data-facility-action="sell-equipment" data-item-id="${item.id}" ${!atShop || isEquipped ? "disabled" : ""}>${isEquipped ? "請先卸下" : "出售"}</button></div>
        </article>`;
      }).join("");
      facilityContent.innerHTML = `${tradeTabs}<section class="equipment-shop-browser" aria-label="出售裝備"><div class="facility-section-heading equipment-shop-heading"><div><small>SELL EQUIPMENT</small><h3>出售裝備</h3></div>${coinAmountHtml(player.coins, "store-balance")}</div><div class="equipment-grid">${cards || '<div class="facility-empty-state"><strong>暫時冇可出售裝備</strong></div>'}</div></section>`;
      setFacilityFooter("");
      return;
    }

    const categories = [
      { key: "weapon", label: "武器", matches: (item) => item.slot === "weapon" },
      { key: "head", label: "頭部", matches: (item) => item.slot === "head" },
      { key: "upper", label: "上身", matches: (item) => item.slot === "upperBody" && !item.occupiesSlots.includes("lowerBody") },
      { key: "lower", label: "下身", matches: (item) => item.slot === "lowerBody" },
      { key: "martial", label: "武道服", matches: (item) => item.slot === "upperBody" && item.occupiesSlots.includes("lowerBody") },
    ];
    if (!categories.some((category) => category.key === equipmentShopCategory)) equipmentShopCategory = "weapon";
    const activeCategory = categories.find((category) => category.key === equipmentShopCategory) || categories[0];
    const shopItems = Expansion.DEFAULT_EQUIPMENT_CATALOG
      .filter((item) => FIGHTER_SHOP_ITEM_ID_SET.has(item.id) && equipmentMatchesClass(item) && activeCategory.matches(item))
      .sort((left, right) => left.requiredLevel - right.requiredLevel || left.name.localeCompare(right.name, "zh-HK"));
    const tabs = categories.map((category) => `<button class="equipment-shop-tab" type="button" role="tab" data-facility-action="shop-category" data-shop-category="${category.key}" aria-selected="${category.key === equipmentShopCategory ? "true" : "false"}">${category.label}</button>`).join("");
    const cards = shopItems.map((item) => {
      const owned = ownedEquipment.includes(item.id);
      const isEquipped = Expansion.isEquipmentEquipped({ equipped }, item.id);
      const levelLocked = player.level < item.requiredLevel;
      const shopCost = Math.max(0, Math.floor(item.cost * (1 - discountRate)));
      const action = owned ? (isEquipped ? "unequip" : "equip") : "buy";
      const disabled = owned ? (!isEquipped && levelLocked) : (!item.purchasable || !atShop);
      const buttonLabel = isEquipped ? "卸下" : owned ? (levelLocked ? "無法裝備" : "裝備") : !item.purchasable ? "非賣品" : "購買";
      const price = owned
        ? '<span class="equipment-price is-owned">已擁有</span>'
        : !item.purchasable
          ? '<span class="equipment-price">非賣品</span>'
          : `<span class="equipment-price">${coinAmountHtml(shopCost, "store-price")}${discountRate ? `<small>原價 ${item.cost}</small>` : ""}</span>`;
      const onePiece = item.occupiesSlots.includes("upperBody") && item.occupiesSlots.includes("lowerBody");
      return `<article class="equipment-card equipment-shop-card ${isEquipped ? "is-equipped" : ""}">
        <div class="equipment-shop-art">${equipmentIconHtml(item, "equipment-card-atlas-icon")}</div>
        <div class="equipment-copy">
          <div class="facility-card-heading"><span class="facility-chip">LV.${item.requiredLevel}</span><strong>${item.name}</strong>${onePiece ? '<em class="equipment-one-piece">一件式</em>' : ""}</div>
          <p>${item.description}</p>
          <small>${statText(item.stats)}</small>
        </div>
        <div class="equipment-shop-purchase">${price}<button class="facility-action-button" type="button" data-facility-action="${action}" data-item-id="${item.id}" ${disabled ? "disabled" : ""}>${buttonLabel}</button></div>
      </article>`;
    }).join("");
    facilityContent.innerHTML = `
      ${tradeTabs}
      ${!atShop ? '<div class="facility-note is-warning"><b>只供試睇</b><span>購買要親身去「裝備店」；已擁有裝備可以隨時換。</span></div>' : ""}
      <nav class="equipment-shop-tabs" role="tablist" aria-label="裝備分類">${tabs}</nav>
      <section class="equipment-shop-browser" aria-label="${activeCategory.label}">
        <div class="facility-section-heading equipment-shop-heading"><div><small>FIGHTER EQUIPMENT</small><h3>${activeCategory.label}</h3></div><span>格鬥士專用裝備</span></div>
        <div class="equipment-grid">${cards || '<div class="facility-empty-state"><strong>呢個分類暫時冇商品</strong></div>'}</div>
      </section>`;
    setFacilityFooter(`<span aria-hidden="true">⚒</span> ${player.coins} 金幣 · ${discountRate ? `${guildRankInfo().name}折扣 ${Math.round(discountRate * 100)}% · ` : ""}裝備店`);
  }

  function renderGeneralStoreFacility() {
    if (!['buy', 'sell'].includes(shopTradeMode)) shopTradeMode = "buy";
    const tradeTabs = shopTradeTabsHtml();
    if (shopTradeMode === "sell") {
      const sellItems = [];
      if (player.potions > 0) sellItems.push({ id: "healing_potion", name: "小型回復藥", quantity: player.potions, description: GENERAL_STORE_GOODS_BY_ID.get("healing_potion")?.description || "回復 30 HP。" });
      for (const [id, quantity] of Object.entries(inventory).filter(([, amount]) => Number(amount) > 0)) {
        const item = ItemData?.getItem?.(id);
        if (!item || ["ui", "currency", "quest"].includes(item.kind) || item.sellable === false) continue;
        sellItems.push({ id, name: item.name, quantity: Number(quantity), description: item.description || materialDescription(id) });
      }
      const cards = sellItems.map((item) => {
        const sellPrice = generalStoreSellPrice(item.id);
        return `<article class="equipment-card general-store-card"><div class="equipment-shop-art">${itemIconHtml(item.id, item.name, "equipment-card-atlas-icon", 0)}</div><div class="equipment-copy"><div class="facility-card-heading"><strong>${item.name}</strong><span class="facility-chip">×${item.quantity}</span></div><p>${item.description}</p></div><div class="equipment-shop-purchase"><span class="equipment-price">出售價 ${coinAmountHtml(sellPrice, "store-price")}</span><button class="facility-action-button" type="button" data-facility-action="sell-store-item" data-item-id="${item.id}" ${sellPrice <= 0 ? "disabled" : ""}>出售 1 件</button></div></article>`;
      }).join("");
      facilityContent.innerHTML = `${tradeTabs}<section class="equipment-shop-browser general-store-browser" aria-label="道具店出售"><div class="facility-section-heading equipment-shop-heading"><div><small>SELL ITEMS</small><h3>出售物品</h3></div>${coinAmountHtml(player.coins, "store-balance")}</div><div class="equipment-grid general-store-grid">${cards || '<div class="facility-empty-state"><strong>暫時冇可出售物品</strong></div>'}</div></section>`;
      setFacilityFooter("");
      return;
    }
    const cards = GENERAL_STORE_GOODS.map((item) => `<article class="equipment-card general-store-card"><div class="equipment-shop-art">${itemIconHtml(item.id, item.name, "equipment-card-atlas-icon", 0)}</div><div class="equipment-copy"><div class="facility-card-heading"><strong>${item.name}</strong></div><p>${item.description}</p></div><div class="equipment-shop-purchase"><span class="equipment-price">${coinAmountHtml(item.price, "store-price")}</span><button class="facility-action-button" type="button" data-facility-action="buy-store-item" data-item-id="${item.id}" ${player.coins < item.price ? "disabled" : ""}>購買</button></div></article>`).join("");
    facilityContent.innerHTML = `${tradeTabs}<section class="equipment-shop-browser general-store-browser" aria-label="道具店"><div class="facility-section-heading equipment-shop-heading"><div><small>ITEM SHOP</small><h3>道具店</h3></div>${coinAmountHtml(player.coins, "store-balance")}</div><div class="equipment-grid general-store-grid">${cards}</div></section>`;
    setFacilityFooter("");
  }

  function buyGeneralStoreItem(itemId) {
    const item = GENERAL_STORE_GOODS_BY_ID.get(itemId);
    if (!item || currentMapId !== "general-store") return showToast("呢件商品而家買唔到。", "danger");
    if (player.coins < item.price) return showToast("金幣唔夠。", "danger");
    player.coins -= item.price;
    if (itemId === "healing_potion") player.potions = Math.min(9, player.potions + 1);
    else inventory.weak_potion = Math.min(999, (inventory.weak_potion || 0) + 1);
    markPersistenceDirty();
    sound.coin();
    showToast(`買到 ${item.name}`, "good");
    addSystemMessage("item", `購買 ${item.name} · -${item.price} 金幣`);
    updateHud(true);
    renderFacility();
    saveImportant(false);
  }

  function sellEquipmentItem(itemId) {
    if (currentMapId !== "shop") return showToast("出售裝備要親身去裝備店。", "danger");
    const item = equipmentItem(itemId);
    if (!item || !ownedEquipment.includes(item.id)) return showToast("你冇呢件裝備。", "danger");
    if (Expansion.isEquipmentEquipped({ equipped }, item.id)) return showToast("請先卸下裝備。", "danger");
    const sellPrice = equipmentSellPrice(item);
    if (sellPrice <= 0) return showToast("呢件裝備唔可以出售。", "danger");
    ownedEquipment = ownedEquipment.filter((id) => id !== item.id);
    player.coins = Math.min(99999, player.coins + sellPrice);
    sound.coin();
    showToast(`已出售：${item.name} · +${sellPrice} 金幣`, "good");
    addSystemMessage("item", `出售 ${item.name} · +${sellPrice} 金幣`);
    renderFacility();
    updateHud(true);
    saveImportant(false);
  }

  function sellGeneralStoreItem(itemId) {
    if (currentMapId !== "general-store") return showToast("出售物品要親身去道具店。", "danger");
    const sellPrice = generalStoreSellPrice(itemId);
    if (sellPrice <= 0) return showToast("呢件物品唔可以出售。", "danger");
    const itemName = inventoryItemName(itemId);
    if (itemId === "healing_potion") {
      if (player.potions <= 0) return showToast("你冇呢件物品。", "danger");
      player.potions -= 1;
    } else {
      const amount = Math.max(0, Math.floor(Number(inventory[itemId]) || 0));
      if (amount <= 0) return showToast("你冇呢件物品。", "danger");
      inventory[itemId] = amount - 1;
      if (inventory[itemId] <= 0) delete inventory[itemId];
    }
    player.coins = Math.min(99999, player.coins + sellPrice);
    sound.coin();
    showToast(`已出售：${itemName} · +${sellPrice} 金幣`, "good");
    addSystemMessage("item", `出售 ${itemName} · +${sellPrice} 金幣`);
    renderFacility();
    updateHud(true);
    saveImportant(false);
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
      <section class="status-compact" aria-label="角色狀態">
        <div class="status-compact-identity">
          <div>
            <strong class="status-compact-name">${playerDisplayName()}</strong>
            <span class="status-compact-class">${className}</span>
          </div>
          <b class="status-compact-level">Lv.${player.level}</b>
        </div>

        <div class="status-compact-meters">
          <div class="status-compact-meter">
            <div class="status-compact-meter-heading"><span>HP</span><b>${Math.ceil(player.hp)} / ${stats.maxHp}</b></div>
            <span class="status-compact-progress is-hp" role="progressbar" aria-label="生命 ${Math.ceil(player.hp)} / ${stats.maxHp}" aria-valuemin="0" aria-valuemax="${stats.maxHp}" aria-valuenow="${Math.ceil(player.hp)}"><i style="width:${hpPercent}%"></i></span>
          </div>
          <div class="status-compact-meter">
            <div class="status-compact-meter-heading"><span>EXP</span><b>${player.xp} / ${xpNeeded}</b></div>
            <span class="status-compact-progress is-exp" role="progressbar" aria-label="經驗值 ${player.xp} / ${xpNeeded}" aria-valuemin="0" aria-valuemax="${xpNeeded}" aria-valuenow="${player.xp}"><i style="width:${xpPercent}%"></i></span>
          </div>
        </div>

        <dl class="status-compact-stats">
          <div><dt>攻擊</dt><dd>${stats.attack}</dd></div>
          <div><dt>防禦</dt><dd>${stats.defence}</dd></div>
          <div><dt>移動</dt><dd>${stats.moveRange}</dd></div>
        </dl>
      </section>`;
    setFacilityFooter("");
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

  function skillTreeStateLabel(status) {
    if (status === "learned") return "已學會";
    if (status === "canLearn") return "可學習";
    if (status === "conditionLocked") return "尚未解鎖";
    return "尚未解鎖";
  }

  function renderSkillsFacility() {
    skillState = Skills.normalizeSkillState(skillState, { classId: playerClassId });
    const classSkills = Skills.getSkillsByClass(playerClassId);
    const layout = buildSkillTreeLayout(classSkills);
    const treeTopPercent = 1.5;
    const treeBottomPercent = 89.5;
    const treeNodeYPercent = (depth) => layout.maxDepth > 0
      ? treeTopPercent + (treeBottomPercent - treeTopPercent) * (depth / layout.maxDepth)
      : 45;
    const treeNodeYCoord = (depth) => treeNodeYPercent(depth) * 10;
    const treeNodeHeightCoord = 38;
    const treeHeight = 1000;
    const states = new Map(classSkills.map((skill) => [skill.id, Skills.skillLearnability(skillState, skill.id)]));
    const tierGuides = "";
    const links = layout.edges.map(({ from, to }) => {
      const parent = layout.positions.get(from);
      const child = layout.positions.get(to);
      const startY = treeNodeYCoord(parent.depth) + treeNodeHeightCoord;
      const endY = treeNodeYCoord(child.depth);
      const middleY = Math.max(startY + 8, endY - 22);
      return `<path class="skill-tree-link" data-from="${from}" data-to="${to}" d="M ${parent.x.toFixed(2)} ${startY.toFixed(2)} V ${middleY.toFixed(2)} H ${child.x.toFixed(2)} V ${endY.toFixed(2)}" />`;
    }).join("");
    const nodes = classSkills.map((skill) => {
      const learnability = states.get(skill.id);
      const stateLabel = skillTreeStateLabel(learnability.status);
      const position = layout.positions.get(skill.id);
      return `<article class="skill-tree-node is-${learnability.status}" role="treeitem" aria-level="${position.depth + 1}" data-tree-state="${learnability.status}" data-tree-depth="${position.depth}" data-tree-x="${position.x.toFixed(2)}" style="--tree-x:${(position.x / 10).toFixed(3)}%;--tree-y:${treeNodeYPercent(position.depth).toFixed(3)}%">
        <button class="skill-tree-node-trigger" type="button" data-facility-action="skill-detail" data-skill-id="${skill.id}" aria-label="${skill.name}，${stateLabel}" title="${skill.name}"><strong>${skill.name}</strong></button>
      </article>`;
    }).join("");
    facilityContent.innerHTML = `
      <div class="skill-tree-scroll" aria-label="技能樹">
        <div class="skill-tree-board" role="tree" aria-label="技能發展路線">
          <svg class="skill-tree-links" viewBox="0 0 1000 ${treeHeight}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${links}</svg>
          ${tierGuides}${nodes}
        </div>
      </div>`;
    setFacilityFooter("");
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
    learnButton.disabled = learnability.status !== "canLearn";
    learnButton.textContent = learnability.status === "learned"
      ? "已學習"
      : learnability.status === "canLearn"
        ? "學習"
        : "無法學習";
    skillDetailPanel.hidden = false;
    resetDraggableWindowPosition(skillDetailPanel.querySelector(".ui-modal-window"));
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
    learnSkillManualImmediately(skillId);
  }

  function renderDeckFacility() {
    skillState = Skills.normalizeSkillState(skillState, { classId: playerClassId });
    const canEdit = facilityContext === "deck" && currentMapId === "world";
    const slots = skillState.deckSlots.map((skillId, index) => {
      const skill = skillId ? Skills.getSkill(skillId) : null;
      return `<article class="deck-slot ${skill ? "is-filled" : "is-empty"}" data-deck-slot-index="${index}" ${skill ? `data-deck-drag-source="slot" data-skill-id="${skill.id}"` : ""} aria-label="${skill ? skill.name : `面板 ${index + 1} 空白`}">${skill
        ? `${skillBadgeMarkup(skill)}<strong>${skill.name}</strong>`
        : ""}</article>`;
    }).join("");
    const management = canEdit ? (() => {
      const learnedSkills = Skills.getSkillsByClass(playerClassId).filter((skill) => skillState.unlockedSkillIds.some((id) => Skills.canonicalSkillId(id) === skill.id) && !skill.tags.includes("passive"));
      const learned = learnedSkills.map((skill) => `<article class="deck-skill-choice" data-deck-drag-source="library" data-skill-id="${skill.id}" aria-label="${skill.name}">${skillBadgeMarkup(skill)}<strong>${skill.name}</strong></article>`).join("");
      return `<section class="deck-management-column" data-deck-region="learned" aria-labelledby="deckLearnedHeading"><div class="deck-region-heading"><h3 id="deckLearnedHeading">技能</h3></div><div class="deck-skill-list">${learned || '<div class="facility-empty-state"><strong>未有已學技能</strong></div>'}</div></section>`;
    })() : "";
    const currentDeckHeading = `<div class="deck-region-heading"><h3 id="deckCurrentHeading">面板</h3></div>`;
    const currentDeck = `<section class="deck-current-column" data-deck-region="current" aria-labelledby="deckCurrentHeading">${currentDeckHeading}<div class="deck-slot-list">${slots}</div></section>`;
    facilityContent.innerHTML = canEdit
      ? `<div class="deck-view-shell is-editable"><div class="deck-manage-layout">${management}${currentDeck}</div></div>`
      : `<div class="deck-view-shell is-readonly">${currentDeck}</div>`;
    setFacilityFooter("");
  }

  function openGuildSkillBook(star) {
    const result = Skills.openOwnedSkillBook(star, { seed: "mist-harbour-guild-skills", serial: skillState.drawSerial }, skillState);
    if (!result.ok) return showToast("你冇呢一星級嘅技能書。", "danger");
    skillState = result.state;
    sound.crystal();
    showToast(`抽到 ${Skills.formatSkillBookRank(result.skill.star)}「${result.skill.name}」技能書，已放入物品欄。`, "good");
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
    learnButton.disabled = learnability.status !== "canLearn";
    learnButton.textContent = learnability.status === "learned"
      ? "已學習"
      : learnability.status === "canLearn"
        ? "學習"
        : "無法學習";
    skillBookConfirmPanel.hidden = false;
    resetDraggableWindowPosition(skillBookConfirmPanel.querySelector(".ui-modal-window"));
    (learnButton.disabled ? document.getElementById("skillBookCancelButton") : learnButton).focus({ preventScroll: true });
  }

  function closeSkillManualConfirm() {
    pendingManualSkillId = null;
    skillBookConfirmPanel.hidden = true;
    facilityContent.focus({ preventScroll: true });
  }

  function learnSkillManualImmediately(skillId) {
    if (!skillId) return false;
    skillState = Skills.normalizeSkillState(skillState, { classId: playerClassId });
    const learnability = Skills.skillLearnability(skillState, skillId);
    if (learnability.status === "learned") {
      showToast("已學習", "good");
      return false;
    }
    if (learnability.status !== "canLearn") {
      showToast("無法學習", "danger");
      return false;
    }
    const result = Skills.learnSkillFromManual(skillState, skillId);
    if (!result.ok) {
      showToast(result.reason === "already-learned" ? "已學習" : "無法學習", result.reason === "already-learned" ? "good" : "danger");
      return false;
    }
    skillState = result.state;
    pendingManualSkillId = null;
    skillBookConfirmPanel.hidden = true;
    sound.crystal();
    showToast(`已學識「${result.skill.name}」；去城門面板配置先可出戰。`, "good");
    renderFacility();
    saveImportant(false);
    return true;
  }

  function useSkillManualFromBag(skillId) {
    const skill = Skills.getSkill(skillId);
    if (!skill) return;
    skillState = Skills.normalizeSkillState(skillState, { classId: playerClassId });
    const learnability = Skills.skillLearnability(skillState, skill.id);
    if (learnability.status === "learned") {
      showToast("已學習", "good");
      return;
    }
    if (learnability.status !== "canLearn") {
      showToast("無法學習", "danger");
      return;
    }
    learnSkillManualImmediately(skill.id);
  }

  function confirmSkillManualLearning() {
    if (!pendingManualSkillId) return;
    learnSkillManualImmediately(pendingManualSkillId);
  }

  function useBagPotion() {
    const maxHp = playerStats().maxHp;
    if (player.potions <= 0) return showToast("藥水用晒喇。", "danger");
    if (player.hp >= maxHp) return showToast("而家生命已經全滿。", "good");
    player.potions -= 1;
    const healed = Math.min(maxHp - player.hp, 30);
    player.hp += healed;
    markPersistenceDirty();
    sound.heal();
    showToast(`使用小型回復藥 · 回復 ${healed} HP`, "good");
    addSystemMessage("item", `使用小型回復藥，恢復 ${healed} HP`);
    announce(`回復 ${healed} 生命`);
    updateHud();
    renderFacility();
    saveImportant(false);
  }

  function changeSkillLoadout(skillId, equip, options = {}) {
    if (!options.force && !(facilityContext === "deck" && currentMapId === "world")) {
      return showToast("而家只可查看；要去舊港城門面板配置先可以換技。", "danger");
    }
    const result = equip ? Skills.equipSkill(skillState, skillId) : Skills.unequipSkill(skillState, skillId);
    if (!result.ok) return showToast(result.reason === "full" ? `目前面板只有 ${skillState.deckCapacity} 格。` : "未能更改技能配置。", "danger");
    skillState = result.state;
    showToast(`${equip ? "已配置" : "已移除"}：${Skills.getSkill(skillId).name}`, "good");
    renderFacility();
    saveImportant(false);
  }

  function configureSkillInDeckSlot(skillId, slotIndex) {
    if (!(facilityContext === "deck" && currentMapId === "world")) return false;
    const result = Skills.equipSkill(skillState, skillId, slotIndex);
    if (!result.ok) {
      showToast(result.reason === "full" ? `目前面板只有 ${skillState.deckCapacity} 格。` : "未能更改技能配置。", "danger");
      return false;
    }
    skillState = result.state;
    showToast(`已配置：${Skills.getSkill(skillId).name}`, "good");
    renderFacility();
    saveImportant(false);
    return true;
  }

  function beginSkillTreePan(event) {
    if (facilityTab !== "skills" || event.button !== 0 || event.pointerType !== "touch") return;
    if (event.target.closest?.("button, a, input, select, textarea, [contenteditable], [role=button], .skill-tree-node")) return;
    const viewport = event.target.closest?.(".skill-tree-scroll");
    if (!viewport || !facilityContent.contains(viewport)) return;
    skillTreePanGesture = {
      pointerId: event.pointerId,
      viewport,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: viewport.scrollLeft,
      startTop: viewport.scrollTop,
      dragging: false,
    };
    try { viewport.setPointerCapture?.(event.pointerId); } catch (_) {}
  }

  function moveSkillTreePan(event) {
    const gesture = skillTreePanGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!gesture.dragging && Math.hypot(dx, dy) < 5) return;
    if (!gesture.dragging) {
      gesture.dragging = true;
      gesture.viewport.classList.add("is-panning");
    }
    gesture.viewport.scrollLeft = gesture.startLeft - dx;
    gesture.viewport.scrollTop = gesture.startTop - dy;
    event.preventDefault();
  }

  function finishSkillTreePan(event) {
    const gesture = skillTreePanGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    skillTreePanGesture = null;
    gesture.viewport.classList.remove("is-panning");
    try { gesture.viewport.releasePointerCapture?.(event.pointerId); } catch (_) {}
    if (gesture.dragging) {
      suppressSkillTreeClickUntil = performance.now() + 450;
      event.preventDefault();
    }
  }

  function cancelSkillTreePan(event) {
    const gesture = skillTreePanGesture;
    if (!gesture || (event?.pointerId != null && gesture.pointerId !== event.pointerId)) return;
    skillTreePanGesture = null;
    gesture.viewport.classList.remove("is-panning");
    try { gesture.viewport.releasePointerCapture?.(gesture.pointerId); } catch (_) {}
  }

  function clearDeckDropTarget() {
    facilityContent.querySelectorAll(".deck-slot.is-drop-target").forEach((slot) => slot.classList.remove("is-drop-target"));
  }

  function deckDropSlotAt(clientX, clientY) {
    const target = document.elementFromPoint(clientX, clientY);
    const slot = target?.closest?.(".deck-slot[data-deck-slot-index]");
    return slot && facilityContent.contains(slot) ? slot : null;
  }

  function cancelDeckDrag() {
    if (!deckDragGesture) return;
    const gesture = deckDragGesture;
    deckDragGesture = null;
    clearDeckDropTarget();
    gesture.sourceElement?.classList.remove("is-drag-source");
    gesture.ghost?.remove();
    try { facilityContent.releasePointerCapture?.(gesture.pointerId); } catch (_) {}
  }

  function beginDeckDrag(event) {
    if (!(facilityContext === "deck" && currentMapId === "world") || event.button !== 0) return;
    const sourceElement = event.target.closest("[data-deck-drag-source][data-skill-id]");
    if (!sourceElement || !facilityContent.contains(sourceElement)) return;
    deckDragGesture = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      sourceElement,
      source: sourceElement.dataset.deckDragSource,
      skillId: sourceElement.dataset.skillId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      ghost: null,
    };
    try { facilityContent.setPointerCapture?.(event.pointerId); } catch (_) {}
  }

  function moveDeckDrag(event) {
    const gesture = deckDragGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!gesture.dragging) {
      if (Math.hypot(dx, dy) < 7) return;
      if (gesture.pointerType === "touch" && gesture.source === "library" && Math.abs(dy) > Math.abs(dx) * 1.2) {
        cancelDeckDrag();
        return;
      }
      gesture.dragging = true;
      gesture.ghost = gesture.sourceElement.cloneNode(true);
      gesture.ghost.classList.add("deck-drag-ghost");
      gesture.ghost.removeAttribute("data-deck-drag-source");
      gesture.ghost.removeAttribute("data-deck-slot-index");
      const sourceRect = gesture.sourceElement.getBoundingClientRect();
      gesture.ghost.style.setProperty("width", `${sourceRect.width}px`, "important");
      gesture.ghost.style.setProperty("min-width", `${sourceRect.width}px`, "important");
      gesture.ghost.style.setProperty("max-width", `${sourceRect.width}px`, "important");
      gesture.ghost.style.setProperty("height", `${sourceRect.height}px`, "important");
      gesture.ghost.style.setProperty("min-height", `${sourceRect.height}px`, "important");
      document.body.appendChild(gesture.ghost);
      gesture.sourceElement.classList.add("is-drag-source");
    }
    gesture.ghost.style.left = `${event.clientX}px`;
    gesture.ghost.style.top = `${event.clientY}px`;
    clearDeckDropTarget();
    deckDropSlotAt(event.clientX, event.clientY)?.classList.add("is-drop-target");
    event.preventDefault();
  }

  function finishDeckDrag(event) {
    const gesture = deckDragGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (!gesture.dragging) {
      cancelDeckDrag();
      return;
    }
    const slot = deckDropSlotAt(event.clientX, event.clientY);
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const droppedInsideCurrentPanel = Boolean(target?.closest?.(".deck-current-column"));
    const skillId = gesture.skillId;
    const source = gesture.source;
    cancelDeckDrag();
    if (slot) {
      configureSkillInDeckSlot(skillId, Number(slot.dataset.deckSlotIndex));
    } else if (source === "slot" && !droppedInsideCurrentPanel) {
      changeSkillLoadout(skillId, false);
    }
    event.preventDefault();
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
      return `<article class="codex-card ${hidden ? "is-unknown" : ""}"><span class="codex-count">${count ? `討伐 ${count}` : "未發現"}</span><div class="codex-sigil" aria-hidden="true">${hidden ? "?" : blueprint.battleRole === "poison" ? "✦" : blueprint.battleRole === "tank" ? "◇" : "●"}</div><div><strong>${hidden ? "？？？" : blueprint.name_zh}</strong><p>${hidden ? "繼續探索霧林同沉燈坑道。" : blueprint.codex.summary}</p><small>${hidden ? "能力未明" : `建議級別 ${blueprint.normalLevelRange[0]}-${blueprint.normalLevelRange[1]} · 暫無掉落物`}</small></div></article>`;
    }).join("");
    const discovered = ids.filter((type) => monsterKills[type] > 0).length;
    facilityContent.innerHTML = `<div class="facility-section-heading"><div><small>MONSTER CODEX</small><h3>霧獸觀察簿</h3></div><span>${discovered} / ${ids.length} 種</span></div><div class="codex-grid">${cards}</div>`;
    setFacilityFooter(`<span aria-hidden="true">◎</span> 每次討伐都會永久記錄；目前戰鬥只會獲得 EXP。`);
  }

  function facilityTabsForContext(context = facilityContext, mapId = currentMapId) {
    const base = Expansion.facilityTabsForContext(context, mapId);
    return context === "portable" ? [...new Set([...base, "missions"])] : base;
  }

  function availableFacilityTabs() {
    return facilityTabsForContext(facilityContext, currentMapId);
  }

  function facilityWindowKey(tab, context) {
    return `${context}:${tab}`;
  }

  function focusUiWindow(windowElement) {
    if (!windowElement) return;
    const layer = windowElement.closest?.(".facility-overlay[data-facility-window-key]") || windowElement;
    uiWindowZCounter += 1;
    layer.style.zIndex = String(uiWindowZCounter);
    for (const candidate of document.querySelectorAll(".facility-window.ui-window.is-ui-window-active, .system-settings-window.is-ui-window-active")) {
      candidate.classList.remove("is-ui-window-active");
    }
    windowElement.classList.add("is-ui-window-active");
  }

  function facilityStateForNode(node) {
    const panel = node?.closest?.(".facility-overlay[data-facility-window-key]");
    if (!panel) return null;
    return facilityWindows.get(panel.dataset.facilityWindowKey) || null;
  }

  function activateFacilityWindow(state, { bringToFront = true } = {}) {
    if (!state || !facilityWindows.has(state.key)) return false;
    activeFacilityWindow = state;
    facilityPanel = state.panel;
    facilityContent = state.content;
    facilityTabs = state.tabs;
    facilityFooter = state.footer;
    facilityHelpButton = state.helpButton;
    facilityHelpPopover = state.helpPopover;
    facilityHelpText = state.helpText;
    facilityTab = state.tab;
    facilityContext = state.context;
    stage.dataset.facilityTab = facilityTab;
    stage.dataset.facilityContext = facilityContext;
    if (bringToFront) focusUiWindow(state.windowElement);
    return true;
  }

  function syncActiveFacilityWindowState() {
    if (!activeFacilityWindow) return;
    activeFacilityWindow.tab = facilityTab;
    activeFacilityWindow.context = facilityContext;
  }

  function remapFacilityCloneIds(panel, key) {
    const slug = key.replace(/[^a-z0-9_-]+/gi, "-");
    const idMap = new Map();
    for (const element of [panel, ...panel.querySelectorAll("[id]")]) {
      const oldId = element.id;
      if (!oldId) continue;
      const nextId = `${oldId}-${slug}`;
      idMap.set(oldId, nextId);
      element.id = nextId;
    }
    const idRefAttributes = ["aria-labelledby", "aria-describedby", "aria-controls", "for"];
    for (const element of [panel, ...panel.querySelectorAll("*")]) {
      for (const attribute of idRefAttributes) {
        const value = element.getAttribute?.(attribute);
        if (!value) continue;
        const next = value.split(/\s+/).map((id) => idMap.get(id) || id).join(" ");
        element.setAttribute(attribute, next);
      }
    }
  }

  function facilityWindowBlocksMovement(state) {
    if (!state) return false;
    return !["portable", "deck-view"].includes(state.context);
  }

  function hasBlockingFacilityWindow() {
    return [...facilityWindows.values()].some(facilityWindowBlocksMovement);
  }

  function syncFacilityMovementMode() {
    const shouldBlock = hasBlockingFacilityWindow();
    mode = shouldBlock ? "facility" : "playing";
    stage.dataset.gameState = mode;
    return shouldBlock;
  }

  function createFacilityWindow(tab, context) {
    const key = facilityWindowKey(tab, context);
    const panel = facilityPanelTemplate.cloneNode(true);
    panel.hidden = false;
    panel.dataset.facilityWindowKey = key;
    panel.classList.add("is-floating-facility-layer");
    panel.setAttribute("aria-modal", "false");
    remapFacilityCloneIds(panel, key);
    stage.appendChild(panel);
    const state = {
      key,
      tab,
      context,
      panel,
      windowElement: panel.querySelector(".facility-window.ui-window"),
      content: panel.querySelector(".facility-content"),
      tabs: panel.querySelector(".facility-tabs"),
      footer: panel.querySelector(".facility-footer"),
      helpButton: panel.querySelector(".ui-info-button"),
      helpPopover: panel.querySelector(".facility-help-popover"),
      helpText: panel.querySelector(".facility-help-popover p"),
      closeButton: panel.querySelector(".facility-close-button"),
    };
    facilityWindows.set(key, state);
    wireFacilityWindow(state);
    return state;
  }

  function topFacilityWindow() {
    return [...facilityWindows.values()].sort((a, b) => (Number(b.panel.style.zIndex) || 0) - (Number(a.panel.style.zIndex) || 0))[0] || null;
  }

  function clearAllFacilityWindows() {
    selectedInventoryItemId = null;
    pendingInventoryDestroyItemId = null;
    for (const state of facilityWindows.values()) state.panel.remove();
    facilityWindows.clear();
    activeFacilityWindow = null;
    facilityPanel = facilityPanelTemplate;
    facilityContent = facilityPanelTemplate.querySelector(".facility-content");
    facilityTabs = facilityPanelTemplate.querySelector(".facility-tabs");
    facilityFooter = facilityPanelTemplate.querySelector(".facility-footer");
    facilityHelpButton = facilityPanelTemplate.querySelector(".ui-info-button");
    facilityHelpPopover = facilityPanelTemplate.querySelector(".facility-help-popover");
    facilityHelpText = facilityPanelTemplate.querySelector(".facility-help-popover p");
    facilityPanelTemplate.hidden = true;
  }

  function renderFacility() {
    const availableTabs = availableFacilityTabs();
    facilityTab = facilityTab === "missions" && availableTabs.includes("missions")
      ? "missions"
      : Expansion.normalizeFacilityTab(facilityTab, facilityContext, currentMapId);
    const copy = {
      status: ["", "角色狀態", ""],
      missions: ["", "任務", ""],
      bag: ["", "物品欄", ""],
      equipment: ["", "角色裝備欄", "查看身上裝備同已擁有收藏，隨時切換出戰配置。"],
      deck: ["", facilityContext === "deck" ? "面板配置" : "面板", ""],
      guild: ["", "公會委託", "一份委託只可以同時進行；完成目標後返公會回報。五份固定委託都可以重複接受，信封開封後會得到對應星級技能書。"],
      shop: ["", facilityContext === "general-store" ? "道具店" : "裝備店", facilityContext === "general-store" ? "" : "同一間店可以購買格鬥士武器與防具；用分類切換武器、頭部、上身、下身及武道服。"],
      skills: ["", "技能樹", ""],
      codex: ["", "霧獸圖鑑", "記錄你見過同擊敗過嘅每一種霧獸。"],
    }[facilityTab];
    stage.dataset.facilityTab = facilityTab;
    stage.dataset.facilityContext = facilityContext;
    facilityPanel.dataset.facilityContext = facilityContext;
    facilityPanel.dataset.facilityTab = facilityTab;
    facilityPanel.dataset.panelSize = facilityTab === "deck"
      ? facilityContext === "deck-view" ? "compact" : "wide"
      : facilityTab === "status" ? "compact"
      : facilityTab === "missions" ? "medium"
      : facilityTab === "guild" && activeGuildCommission() ? "medium"
      : "wide";
    if (facilityTabs) facilityTabs.dataset.visibleTabs = availableTabs.join(" ");
    const facilityKicker = facilityPanel.querySelector(".facility-kicker");
    if (facilityKicker) {
      facilityKicker.textContent = copy[0];
      facilityKicker.hidden = true;
    }
    const facilityTitle = facilityPanel.querySelector(".facility-header h2");
    if (facilityTitle) facilityTitle.textContent = copy[1];
    if (facilityHelpText) facilityHelpText.textContent = copy[2];
    if (facilityHelpButton) facilityHelpButton.hidden = ["bag", "guild", "shop"].includes(facilityTab) || facilityContext === "general-store" || !copy[2];
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
    else if (facilityTab === "missions") renderMissionFacility();
    else if (facilityTab === "bag") renderBagFacility();
    else if (facilityTab === "equipment") renderEquipmentFacility();
    else if (facilityTab === "deck") renderDeckFacility();
    else if (facilityTab === "guild") renderGuildFacility();
    else if (facilityTab === "shop") facilityContext === "general-store" ? renderGeneralStoreFacility() : renderShopFacility();
    else if (facilityTab === "skills") renderSkillsFacility();
    else renderCodexFacility();
    syncActiveFacilityWindowState();
  }

  function openFacility(tab = "bag", requestedContext) {
    if (!["playing", "facility"].includes(mode)) return false;
    const nextContext = requestedContext || (tab === "guild" ? "guild" : tab === "shop" ? "shop" : tab === "deck" ? "deck-view" : "portable");
    const normalizedContext = ["portable", "guild", "shop", "general-store", "deck", "deck-view"].includes(nextContext) ? nextContext : "portable";
    const availableTabs = facilityTabsForContext(normalizedContext, currentMapId);
    if (!availableTabs.includes(tab) && ["guild", "shop", "deck"].includes(tab)) {
      showToast(tab === "guild" ? "公會功能要親身入公會先用到。" : tab === "shop" ? "購物功能要親身入商店先用到。" : "面板配置要去舊港城門設定。", "danger");
      return false;
    }
    const requestedTab = FACILITY_TABS.includes(tab) ? tab : "bag";
    const normalizedTab = requestedTab === "missions" && availableTabs.includes("missions")
      ? "missions"
      : Expansion.normalizeFacilityTab(requestedTab, normalizedContext, currentMapId);
    const key = facilityWindowKey(normalizedTab, normalizedContext);
    const existing = facilityWindows.get(key);
    if (existing) {
      activateFacilityWindow(existing);
      syncFacilityMovementMode();
      renderFacility();
      existing.closeButton?.focus({ preventScroll: true });
      return true;
    }

    const state = createFacilityWindow(normalizedTab, normalizedContext);
    if (normalizedTab === "shop") shopTradeMode = "buy";
    activateFacilityWindow(state);
    const blocksMovement = syncFacilityMovementMode();
    if (blocksMovement) {
      keys.clear();
      clearExploreMovePath();
      pendingClickInteractionId = null;
    }
    renderFacility();
    resetDraggableWindowPosition(state.windowElement);
    const cascadeIndex = Math.max(0, facilityWindows.size - 1) % 6;
    state.windowElement.style.setProperty("--ui-drag-x", `${cascadeIndex * 18}px`);
    state.windowElement.style.setProperty("--ui-drag-y", `${cascadeIndex * 14}px`);
    focusUiWindow(state.windowElement);
    state.closeButton?.focus({ preventScroll: true });
    const title = state.panel.querySelector(".facility-header h2")?.textContent || "視窗";
    announce(`${title}已打開。`);
    return true;
  }

  function closeFacility(state = activeFacilityWindow) {
    if (!state || !facilityWindows.has(state.key)) return;
    if (state.tab === "bag") {
      selectedInventoryItemId = null;
      pendingInventoryDestroyItemId = null;
    }
    if (state.context === "guild" || state.tab === "guild") closeGuildCommissionDetail();
    if (state === activeFacilityWindow) {
      cancelDeckDrag();
      setFacilityHelpOpen(false, state);
    }
    facilityWindows.delete(state.key);
    state.panel.remove();
    if (activeFacilityWindow === state) activeFacilityWindow = null;
    const next = topFacilityWindow();
    if (next) {
      activateFacilityWindow(next, { bringToFront: false });
      syncFacilityMovementMode();
    } else {
      facilityPanel = facilityPanelTemplate;
      facilityContent = facilityPanelTemplate.querySelector(".facility-content");
      facilityTabs = facilityPanelTemplate.querySelector(".facility-tabs");
      facilityFooter = facilityPanelTemplate.querySelector(".facility-footer");
      facilityHelpButton = facilityPanelTemplate.querySelector(".ui-info-button");
      facilityHelpPopover = facilityPanelTemplate.querySelector(".facility-help-popover");
      facilityHelpText = facilityPanelTemplate.querySelector(".facility-help-popover p");
      mode = "playing";
      stage.dataset.gameState = mode;
      updateHud(true);
      pendingLevelUps = 0;
      canvas.focus({ preventScroll: true });
    }
  }

  function setFacilityHelpOpen(open, state = activeFacilityWindow) {
    const popover = state?.helpPopover || facilityHelpPopover;
    const button = state?.helpButton || facilityHelpButton;
    if (!popover || !button) return;
    popover.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  }

  function toggleFacilityHelp(state = activeFacilityWindow) {
    const popover = state?.helpPopover || facilityHelpPopover;
    const button = state?.helpButton || facilityHelpButton;
    if (!popover || !button) return;
    setFacilityHelpOpen(popover.hidden, state);
  }

  function returnToTitle() {
    if (!["playing", "facility", "battle"].includes(mode)) return;
    if (mode !== "battle") saveGame(false, true);
    returnToTitleWithoutSave();
  }

  function openDeckFromSidebar() {
    return openFacility("deck", "deck-view");
  }

  function acceptGuildOffer(offerId) {
    if (currentMapId !== "guild") return showToast("要親身返公會先接到委託。", "danger");
    const result = Guild.accept(guildCommissionState, offerId);
    if (!result.ok) return showToast(result.reason === "already-active" ? "同一時間只可以接一份委託。" : "搵唔到呢份委託。", "danger");
    guildCommissionState = result.state;
    sound.crystal();
    showToast(`已接委託：${result.commission.title}`, "good");
    addSystemMessage("quest", `已接委託：${result.commission.title}`);
    closeGuildCommissionDetail();
    renderFacility();
    saveImportant(false);
  }

  function claimGuildContract(contractId) {
    if (currentMapId !== "guild") return showToast("要返公會先可以回報。", "danger");
    const active = activeGuildCommission();
    const expectedId = active ? `${guildCommissionState.cycle}:${active.id}` : null;
    if (contractId && expectedId && contractId !== expectedId) return showToast("委託資料已更新，請重新查看公會委託。", "danger");
    const result = Guild.report(guildCommissionState);
    if (!result.ok) return showToast(result.reason === "not-ready" ? "委託仲未完成。" : "呢份委託已經回報過喇。", "danger");
    guildCommissionState = result.state;
    const rewardCoins = Math.max(0, Math.floor(Number(result.reward.coins) || 0));
    player.coins += rewardCoins;
    sound.level();
    const rewardText = `委託回報完成 · ${Skills.formatSkillBookRank(result.reward.skill_envelope_star)} 技能書信封 × 1 + ${rewardCoins.toLocaleString("zh-HK")} 金幣`;
    showToast(rewardText, "good");
    addSystemMessage("reward", rewardText);
    closeGuildCommissionDetail();
    renderFacility();
    saveImportant(false);
  }

  function openAbandonCommission(contractId) {
    const active = activeGuildCommission();
    const expectedId = active ? `${guildCommissionState.cycle}:${active.id}` : null;
    if (!active || !expectedId || contractId !== expectedId) return showToast("委託資料已更新，請重新查看公會委託。", "danger");
    pendingAbandonContractId = expectedId;
    document.getElementById("abandonCommissionTitle").textContent = `確定放棄「${active.title}」？`;
    document.getElementById("abandonCommissionDescription").textContent = active.type === "hunt"
      ? `目前討伐進度 ${guildCommissionState.progress} / ${active.objective.count} 將會失去；委託會重新開放接受。`
      : active.type === "wish"
        ? guildCommissionState.status === "ready_to_report"
          ? "願望已經許完但尚未回報；放棄後完成狀態與回報資格都會失去。"
          : "目前許願委託會取消，之後可以重新接受。"
        : guildCommissionState.status === "ready_to_report"
          ? "信件已送達但尚未回報；放棄後送件完成狀態與回報資格都會失去。"
          : "目前送信進度將會失去；委託會重新開放接受。";
    abandonCommissionPanel.hidden = false;
    resetDraggableWindowPosition(abandonCommissionPanel.querySelector(".ui-modal-window"));
    document.getElementById("abandonCommissionConfirmButton").focus({ preventScroll: true });
  }

  function closeAbandonCommission(restoreFocus = true) {
    pendingAbandonContractId = null;
    abandonCommissionPanel.hidden = true;
    if (restoreFocus && facilityWindows.size) facilityContent.focus({ preventScroll: true });
  }

  function confirmAbandonCommission() {
    const active = activeGuildCommission();
    const expectedId = active ? `${guildCommissionState.cycle}:${active.id}` : null;
    if (!pendingAbandonContractId || pendingAbandonContractId !== expectedId) {
      closeAbandonCommission(false);
      return showToast("委託資料已更新，請重新查看公會委託。", "danger");
    }
    const result = Guild.abandon(guildCommissionState);
    if (!result.ok) {
      closeAbandonCommission(false);
      return showToast("呢份委託而家冇可放棄嘅進度。", "danger");
    }
    guildCommissionState = result.state;
    closeAbandonCommission(false);
    showToast(`已放棄委託：${result.commission.title} · 進度已清除`, "good");
    addSystemMessage("quest", `已放棄委託：${result.commission.title}`);
    closeGuildCommissionDetail();
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
    showToast(`開封抽到「${skill.name}」技能書；仍須符合格鬥士前置先可以學習。`, "good");
    announce(`獲得格鬥士技能書：${skill.name}`);
    if (facilityWindows.size) renderFacility();
    updateHud(true);
    saveImportant(false);
  }

  function changeEquipment(itemId, buyFirst = false) {
    const requestedItem = equipmentItem(itemId);
    if (!equipmentMatchesClass(requestedItem)) return showToast("呢件裝備唔適合目前職業。", "danger");
    let state = { coins: player.coins, level: player.level, classId: playerClassId, ownedEquipment, equipped };
    if (buyFirst) {
      if (currentMapId !== "shop") return showToast("購買裝備要親身去裝備店。", "danger");
      const item = equipmentItem(itemId);
      const discountedCost = item ? Math.max(0, Math.floor(item.cost * (1 - guildDiscountRate()))) : 0;
      if (item && player.coins < discountedCost) return showToast("金幣唔夠。", "danger");
      const discount = item ? item.cost - discountedCost : 0;
      state = { ...state, coins: state.coins + discount };
      const purchase = Expansion.purchaseEquipment(state, itemId);
      if (!purchase.ok) {
        const reason = purchase.reason === "coins" ? "金幣唔夠。" : "呢件裝備而家買唔到。";
        return showToast(reason, "danger");
      }
      player.coins = purchase.state.coins;
      ownedEquipment = purchase.state.ownedEquipment;
      sound.coin();
      showToast(`已購買：${purchase.item.name}`, "good");
      renderFacility();
      updateHud(true);
      saveImportant(false);
      return;
    }
    const result = Expansion.equipItem({ ...state, ownedEquipment, equipped }, itemId);
    if (!result.ok) return showToast("未可以裝備呢件物品。", "danger");
    equipped = result.state.equipped;
    player.hp = Core.clamp(player.hp, 1, playerStats().maxHp);
    sound.coin();
    showToast(`已裝備：${result.item.name}`, "good");
    renderFacility();
    updateHud(true);
    saveImportant(false);
  }

  function unequipEquipment(itemId) {
    const item = equipmentItem(itemId);
    if (!item || !Expansion.isEquipmentEquipped({ equipped }, item.id)) return showToast("呢件裝備目前冇裝備緊。", "danger");
    const occupiedSlot = item.occupiesSlots.find((slot) => equipped[slot] === item.id);
    if (!occupiedSlot) return showToast("未能找到裝備槽位。", "danger");
    const result = Expansion.unequipItem({ coins: player.coins, level: player.level, classId: playerClassId, ownedEquipment, equipped }, occupiedSlot);
    if (!result.ok) return showToast("未能卸下呢件裝備。", "danger");
    equipped = result.state.equipped;
    player.hp = Core.clamp(player.hp, 1, playerStats().maxHp);
    selectedInventoryItemId = null;
    pendingInventoryDestroyItemId = null;
    sound.coin();
    showToast(`已卸下：${item.name}`, "good");
    if (facilityWindows.size) renderFacility();
    updateHud(true);
    saveImportant(false);
  }

  function destroyInventoryItem(itemId) {
    const id = String(itemId || "").trim();
    if (!id) return showToast("呢件物品唔可以銷毀。", "danger");
    let itemName = inventoryItemName(id);
    let destroyed = false;

    const equipment = equipmentItem(id);
    if (equipment && ownedEquipment.includes(equipment.id)) {
      if (Expansion.isEquipmentEquipped({ equipped }, equipment.id)) return showToast("請先卸下裝備。", "danger");
      ownedEquipment = ownedEquipment.filter((ownedId) => ownedId !== equipment.id);
      itemName = equipment.name;
      destroyed = true;
    } else if (id === "healing_potion") {
      if (player.potions > 0) {
        player.potions -= 1;
        itemName = "小型回復藥";
        destroyed = true;
      }
    } else if (id === "weak_potion") {
      const amount = Math.max(0, Math.floor(Number(inventory.weak_potion) || 0));
      if (amount > 0) {
        inventory.weak_potion = amount - 1;
        if (inventory.weak_potion <= 0) delete inventory.weak_potion;
        destroyed = true;
      }
    } else {
      const envelopeMatch = id.match(/^skill_envelope_(\d+)$/);
      const bookMatch = id.match(/^skill_book_(\d+)$/);
      const manualMatch = id.match(/^manual_(.+)$/);
      if (envelopeMatch) {
        const star = Number(envelopeMatch[1]);
        const state = Guild.normalizeState(guildCommissionState);
        if ((state.envelopes[star] || 0) > 0) {
          guildCommissionState = { ...state, envelopes: { ...state.envelopes, [star]: state.envelopes[star] - 1 } };
          itemName = `${skillStars(star)} 技能書信封`;
          destroyed = true;
        }
      } else if (bookMatch) {
        const star = Number(bookMatch[1]);
        const state = Skills.normalizeSkillState(skillState);
        if ((state.books[star] || 0) > 0) {
          skillState = { ...state, books: { ...state.books, [star]: state.books[star] - 1 } };
          itemName = `${skillStars(star)} 技能書`;
          destroyed = true;
        }
      } else if (manualMatch) {
        const skillId = manualMatch[1];
        const state = Skills.normalizeSkillState(skillState);
        const amount = Math.max(0, Math.floor(Number(state.manualCounts[skillId]) || 0));
        if (amount > 0) {
          const manualCounts = { ...state.manualCounts, [skillId]: amount - 1 };
          if (manualCounts[skillId] <= 0) delete manualCounts[skillId];
          skillState = { ...state, manualCounts };
          itemName = `技能書：${Skills.getSkill(skillId)?.name || skillId}`;
          destroyed = true;
        }
      } else {
        const itemData = ItemData?.getItem?.(id);
        const amount = Math.max(0, Math.floor(Number(inventory[id]) || 0));
        // UI/currency/unknown identifiers are treated as protected.  Only
        // ordinary inventory consumables/materials can be destroyed here.
        if (itemData && !["ui", "currency", "quest"].includes(itemData.kind) && itemData.destroyable !== false && amount > 0) {
          inventory[id] = amount - 1;
          if (inventory[id] <= 0) delete inventory[id];
          itemName = itemData.name || itemName;
          destroyed = true;
        }
      }
    }

    if (!destroyed) return showToast("呢件物品唔可以銷毀。", "danger");
    pendingInventoryDestroyItemId = null;
    selectedInventoryItemId = null;
    showToast(`已銷毀：${itemName}`, "good");
    addSystemMessage("item", `銷毀 ${itemName}`);
    renderBagFacility();
    updateHud(true);
    saveImportant(false);
  }

  const DEFAULT_BATTLE_WIDTH = 9;
  const DEFAULT_BATTLE_HEIGHT = 7;
  const BATTLE_AP_GAIN = Skills.ROUND_AP_GAIN;
  const BATTLE_AP_MAX = Skills.MAX_AP;
  const BATTLE_TURN_COST = .5;
  const BATTLE_FINAL_FACING_RESERVE = 1;
  const BATTLE_MOVE_STEP_SECONDS = reducedMotion ? .08 : .24;
  const BATTLE_ACTION_WINDUP_SECONDS = reducedMotion ? .12 : .38;
  const BATTLE_ACTION_LINGER_SECONDS = reducedMotion ? .24 : .7;
  const BATTLE_SIDE_DAMAGE_BONUS = .15;
  const BATTLE_REAR_DAMAGE_BONUS = .35;
  const BATTLE_MISS_COLOR = "#ffc857";
  const MOUNTAIN_BATTLEFIELD = Object.freeze({
    biome: "mountain",
    theme: "mountain",
    groundSet: Object.freeze(["dirt", "grass", "rock-ground"]),
    obstacleSet: Object.freeze(["rock", "boulder", "bush"]),
    backgroundId: "mountain-battle-background-v1",
  });

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

  function battleTerrainFor(source, battlefield = null) {
    if (battlefield?.terrainCells) {
      return Object.entries(battlefield.terrainCells)
        .filter(([, terrain]) => terrain?.movementBlocked !== false)
        .map(([key]) => {
          const [x, y] = key.split(",").map(Number);
          return { x, y };
        })
        .filter((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y));
    }
    const layouts = {
      chick: [[3, 1], [3, 5], [5, 2], [5, 4]],
      fox: [[3, 2], [3, 4], [5, 1], [5, 5]],
      raccoon: [[4, 1], [4, 5], [5, 3]],
      wild_boar: [[4, 2], [4, 4], [6, 3]],
      frog: [[3, 3], [5, 1], [5, 5]],
      coyote: [[3, 2], [3, 4], [5, 1], [5, 5]],
      turtle: [[3, 2], [3, 4], [5, 1], [5, 5]],
      snake: [[3, 1], [3, 5], [5, 3]],
      bear: [[3, 1], [3, 5], [5, 1], [5, 5]],
    };
    return (layouts[source.type] || layouts.raccoon || [[4, 1], [4, 5], [5, 3]]).map(([x, y]) => ({ x, y }));
  }

  function battleFieldContextFor(mapId) {
    if (mapId !== "field") return null;
    const authored = world?.battlefield || {};
    return {
      ...MOUNTAIN_BATTLEFIELD,
      ...authored,
      heightMap: { ...(authored.heightMap || {}) },
      terrainCells: { ...(authored.terrainCells || {}) },
      deploymentZones: {
        ally: [...(authored.deploymentZones?.ally || [{ x: 1, y: 3 }])],
        enemy: [...(authored.deploymentZones?.enemy || [{ x: 7, y: 3 }, { x: 7, y: 1 }, { x: 7, y: 5 }])],
      },
    };
  }

  function battleDimensionsFor(battlefield) {
    return {
      width: Math.max(1, Math.trunc(Number(battlefield?.width) || DEFAULT_BATTLE_WIDTH)),
      height: Math.max(1, Math.trunc(Number(battlefield?.height) || DEFAULT_BATTLE_HEIGHT)),
    };
  }

  function battleDeploymentCell(battlefield, side, index = 0) {
    const fallback = side === "enemy"
      ? [{ x: 7, y: 3 }, { x: 7, y: 1 }, { x: 7, y: 5 }]
      : [{ x: 1, y: 3 }];
    const cells = battlefield?.deploymentZones?.[side]?.length ? battlefield.deploymentZones[side] : fallback;
    const chosen = cells[Math.min(Math.max(0, index), cells.length - 1)] || fallback[0];
    return { x: Math.trunc(Number(chosen.x) || 0), y: Math.trunc(Number(chosen.y) || 0) };
  }

  function createBattleEnemy(source, type, index, primary, battlefield = null) {
    const canonicalType = ExpansionWorld.normalizeMonsterId(type) || type;
    const base = enemyTypes[canonicalType] || enemyTypes[type];
    const blueprint = ExpansionWorld.monsterBlueprint(canonicalType);
    const level = source.level || blueprint?.baseLevel || 1;
    const stats = blueprint ? ExpansionWorld.monsterStatsAtLevel(canonicalType, level) : null;
    const encounterCount = Math.max(1, Math.min(3, Number(blueprint?.encounterCount) || 1));
    const hpMultiplier = ExpansionWorld.encounterHpMultiplier(encounterCount);
    const unscaledHp = primary ? (source.maxHp || stats?.hp || base.hp) : (stats?.hp || base.hp);
    const maxHp = Math.max(1, Math.round(unscaledHp * hpMultiplier));
    const spawnCell = battleDeploymentCell(battlefield, "enemy", index);
    const skill = blueprint?.skills?.[0] || null;
    const attackRange = skill?.range?.max || 1;
    return {
      id: primary ? `battle-${source.id}` : `battle-${source.id}-pack-${index + 1}`,
      sourceId: primary ? source.id : null,
      instanceId: `${source.instanceId || source.id}:pack-${index + 1}`,
      primary,
      side: "enemy",
      type: canonicalType,
      artType: base.artType || canonicalType,
      boss: false,
      name: primary ? source.name : (blueprint?.name_zh || base.name),
      level,
      cell: { ...spawnCell },
      hp: maxHp,
      maxHp,
      attack: Math.max(1, primary ? (source.damage || stats?.attack || base.damage) : (stats?.attack || base.damage)),
      defence: primary ? (source.defence ?? stats?.defense ?? base.defence ?? 0) : (stats?.defense ?? base.defence ?? 0),
      xp: blueprint?.rewards?.baseXp ?? source.xp ?? base.xp ?? 0,
      coins: blueprint?.rewards?.coins ?? source.coins ?? base.coins ?? 0,
      accuracy: 99,
      evasion: 0,
      weight: 0,
      moveRange: Math.max(0, blueprint?.moveRange ?? source.moveRange ?? stats?.moveRange ?? base.moveRange ?? 4),
      turnCost: BATTLE_TURN_COST,
      attackRange,
      minAttackRange: skill?.range?.min || 1,
      initiative: base.battleSpeed || 8,
      ap: 0,
      skillCost: skill?.apCost || 0,
      skillId: skill?.id || null,
      skill,
      skills: blueprint?.skills || [],
      skillName: skill?.name || base.ability || "普通攻擊",
      speedGrade: skill?.speedGrade || "C",
      targetArc: ["front", "side"],
      alive: true,
      facing: "left",
      hitFlash: 0,
    };
  }

  function battlePartyFor(source, battlefield = null) {
    const blueprint = ExpansionWorld.monsterBlueprint(source.type);
    const type = blueprint?.id || source.type;
    const count = Math.max(1, Math.min(3, Number(blueprint?.encounterCount) || 1));
    return Array.from({ length: count }, (_, index) => createBattleEnemy(source, type, index, index === 0, battlefield));
  }

  function startBattle(source, instant = false) {
    if (!source?.alive || mode !== "playing" || battle || source.encounterCooldown > 0) return false;
    hideAllOverlays();
    activeBattleTouches.clear();
    battlePinchGesture = null;
    suppressBattleTouchTap = false;
    battleView = { zoom: 1, offsetX: 0, offsetY: 0 };
    const stats = playerStats();
    const battleMoveCapacity = playerClassId === "fighter" ? stats.moveRange + BATTLE_FINAL_FACING_RESERVE : stats.moveRange;
    const battlefield = battleFieldContextFor(currentMapId);
    const dimensions = battleDimensionsFor(battlefield);
    const heroSpawn = battleDeploymentCell(battlefield, "ally", 0);
    battleToken += 1;
    const hero = {
      id: "battle-player",
      side: "ally",
      type: "player",
      name: playerDisplayName(),
      level: player.level,
      cell: { ...heroSpawn },
      hp: Math.ceil(player.hp),
      maxHp: stats.maxHp,
      attack: stats.attack,
      defence: stats.defence,
      accuracy: stats.accuracy,
      evasion: stats.evasion,
      weight: stats.weight,
      actionSpeedBonus: stats.actionSpeedBonus,
      baseMoveRange: battleMoveCapacity,
      moveRange: battleMoveCapacity,
      facingReserve: BATTLE_FINAL_FACING_RESERVE,
      attackRange: 1,
      initiative: stats.initiative,
      alive: true,
      facing: "right",
      hitFlash: 0,
    };
    const blocked = battleTerrainFor(source, battlefield);
    const battleGrid = Tactics.createGrid(dimensions.width, dimensions.height, blocked);
    battleGrid.heightMap = battlefield?.heightMap || Object.create(null);
    battleGrid.terrainCells = battlefield?.terrainCells || Object.create(null);
    battle = {
      token: battleToken,
      source,
      battlefield,
      grid: battleGrid,
      blocked,
      hero,
      enemies: battlePartyFor(source, battlefield),
      rng: Tactics.createSeededRng(`battle:${battleToken}:${source.instanceId || source.id}`),
      phase: "intro",
      round: 1,
      ap: 0,
      moved: false,
      guard: false,
      guardReduction: 0,
      moveBonusNext: 0,
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
      heroMoveCommands: [],
      heroMovePlan: null,
      awaitingFacing: true,
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
    startBattleBgm();
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
    battle.evasion = 0;
    battle.moved = false;
    battle.guard = false;
    battle.guardReduction = 0;
    battle.selectedAction = "move";
    battle.cursor = { ...battle.hero.cell };
    battle.enemyPlans = planEnemyRound();
    battle.heroMoveDraft = [{ ...battle.hero.cell }];
    battle.heroMoveCommands = [];
    battle.heroMovePlan = null;
    // Facing controls stay available throughout movement planning. On an
    // oblique battlefield they represent the four diagonal screen directions
    // and each press is real 0.5-step footwork, not a free final-facing picker.
    battle.awaitingFacing = true;
    battle.movementResolution = null;
    battle.actionResolution = null;
    battle.message = "揀下一個路點；來回、轉向同原地踏步都會照扣移動力。";
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
        plans.push({ enemyId: actual.id, move: { ...actual.cell }, path: [{ ...actual.cell }], targetCells: [], willAttack: false, facing: actual.facing, reason: "disabled" });
        continue;
      }

      const action = MonsterAI?.planEnemyAction({
        grid: battle.grid,
        enemy,
        targets: [hero],
        units: simulated,
        skills: actual.skills,
        apGain: BATTLE_AP_GAIN,
      }) || Tactics.chooseEnemyAction({ grid: battle.grid, enemy, targets: [hero], units: simulated });
      if (!action) continue;

      const selectedSkill = action.skill || action.setupSkill || null;
      if (selectedSkill) {
        actual.skill = selectedSkill;
        actual.skillId = selectedSkill.id;
        actual.skillName = selectedSkill.name;
        actual.skillCost = selectedSkill.apCost;
        actual.speedGrade = selectedSkill.speedGrade;
        actual.attackRange = selectedSkill.range.max;
        actual.minAttackRange = selectedSkill.range.min;
      }

      // Melee movement may intentionally target the hero's OCCUPIED cell so
      // the shared collision resolver can create natural surrounds.  For
      // planning subsequent enemies, keep a legal preview cell instead of
      // temporarily overlapping the simulated hero.
      enemy.cell = { ...(action.previewCell || action.move) };
      enemy.facing = action.facing || enemy.facing;
      const willAttack = Boolean(action.attackTargetId && action.skill)
        && (actual.ap || 0) >= (action.skill?.apCost || 0);
      const previewOrigin = action.attackOrigin || action.move;
      const previewFacing = action.attackFacing || action.facing || actual.facing;
      const targetCells = willAttack
        ? Skills.patternCells(action.skill, previewOrigin, hero.cell, {
            grid: battle.grid,
            battlefield: battle.battlefield,
            heightMap: battle.battlefield?.heightMap,
            facing: previewFacing,
          })
        : [];

      plans.push({
        enemyId: actual.id,
        move: { ...action.move },
        path: action.path,
        commands: action.commands || [],
        targetId: hero.id,
        targetCells,
        willAttack,
        skillName: action.skill?.name || selectedSkill?.name || actual.skillName,
        skillId: action.skill?.id || selectedSkill?.id || actual.skillId,
        skill: action.skill || selectedSkill || actual.skill,
        apCost: action.skill?.apCost || selectedSkill?.apCost || actual.skillCost,
        speedGrade: action.skill?.speedGrade || selectedSkill?.speedGrade || actual.speedGrade || "C",
        facing: action.facing || actual.facing,
        reason: action.reason || (willAttack ? "attack" : "move"),
        setupSkillId: action.setupSkill?.id || null,
      });
    }
    return plans;
  }

  function battleUnits() {
    return battle ? [battle.hero, ...battle.enemies] : [];
  }

  function battleRandom() {
    return typeof battle?.rng === "function" ? battle.rng() : Math.random();
  }

  function battleNumber(value, fallback = 0) {
    if (Number.isFinite(Number(value))) return Number(value);
    if (typeof value === "string" && /^\s*-?\d+(?:\.\d+)?(?:\s*\*\s*-?\d+(?:\.\d+)?)+\s*$/.test(value)) {
      return value.split("*").reduce((product, part) => product * Number(part), 1);
    }
    return fallback;
  }

  function battleTargetEvasion(unit) {
    if (!unit) return 0;
    // unit.evasion already contains permanent gear/passive modifiers. Ask the
    // status system only for temporary stance/concealment bonuses, then add
    // the one-resolution battle stance (e.g. 舞葉) on top.
    const base = Math.max(0, Number(unit.evasion) || 0);
    const status = (FighterEffects?.statusEvasion(unit, battle?.round || 0, {}) || 0) * 100;
    const battleStance = unit === battle?.hero ? Math.max(0, Number(battle.evasion) || 0) * 100 : 0;
    return Math.max(0, base + status + battleStance);
  }

  function revalidateBattlePendingAction(pending) {
    const actor = battleUnits().find((unit) => unit.id === pending?.actorId);
    const target = pending?.targetId == null ? null : battleUnits().find((unit) => unit.id === pending.targetId);
    return Tactics.revalidatePendingAction(pending, {
      actor,
      target,
      units: battleUnits(),
      grid: battle.grid,
      canAct: (unit) => !FighterEffects?.isDisabled(unit, battle.round),
      rangeResolver: ({ action, actor: currentActor, target: currentTarget }) => {
        const cell = currentTarget?.cell || action.targetCell;
        if (!cell) return action.rangeMax == null;

        // Fighter CMD skills own exact actor-local target geometry. Resolve it
        // again at execution time so knockback, displacement or a facing
        // change cannot reuse the range that was valid when the round began.
        const skill = action.skillId ? (Skills.getSkill(action.skillId) || currentActor?.skills?.find((candidate) => candidate.id === action.skillId) || (currentActor?.skill?.id === action.skillId ? currentActor.skill : null)) : null;
        if (skill) {
          const actorTeam = currentActor?.side || (currentActor?.id === battle.hero.id ? "ally" : "enemy");
          const validation = Skills.validateSkillTarget(skill, currentActor.cell, cell, {
            grid: battle.grid,
            battlefield: battle.battlefield,
            heightMap: battle.battlefield?.heightMap,
            heightAt: battleCellHeight,
            facing: currentActor.facing,
            actorTeam,
            actorId: currentActor.id,
            targetUnit: currentTarget ? { ...currentTarget, team: currentTarget.side || currentTarget.team } : null,
          });
          return validation.ok;
        }
        if (action.rangeMax == null) return true;
        if (!Tactics.isInAttackRange(currentActor.cell, cell, action.rangeMax, action.rangeMin || 1)) return false;
        if (!action.targetArc) return true;
        const relative = Tactics.relativePosition(currentActor.cell, currentActor.facing, cell);
        return action.targetArc.includes(relative)
          || (relative === "side" && action.targetArc.some((value) => ["side", "left", "right"].includes(value)));
      },
    });
  }

  function livingBattleEnemies() {
    return battle ? battle.enemies.filter((unit) => unit.alive && unit.hp > 0) : [];
  }

  function battleMoveSchedule(commands = battle?.heroMoveCommands) {
    const start = battle?.hero?.cell;
    if (!start) return { path: [], finalTravelFacing: null, events: [], totalCost: Infinity };
    return Tactics.movementCommandEvents(start, Array.isArray(commands) ? commands : [], {
      turnCost: BATTLE_TURN_COST,
      initialFacing: battle.hero.facing,
    });
  }

  function battleMoveCost(commands = battle?.heroMoveCommands) {
    return battleMoveSchedule(commands).totalCost;
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

  function formatRemainingMove(value) {
    return (Math.max(0, Math.round((Number(value) || 0) * 2) / 2)).toFixed(1);
  }

  function battleFacingReserve() {
    return Math.min(BATTLE_FINAL_FACING_RESERVE, Math.max(0, Number(battle?.hero?.moveRange) || 0));
  }

  function battleRouteBudgetRemaining(commands = battle?.heroMoveCommands) {
    return Math.max(0, (battle?.hero?.moveRange || 0) - battleFacingReserve() - battleMoveCost(commands));
  }

  function battleMoveDraftState(commands = battle?.heroMoveCommands) {
    const schedule = battleMoveSchedule(commands);
    const endpoint = schedule.path?.at(-1) || battle?.hero?.cell;
    return {
      schedule,
      endpoint: endpoint ? copyBattleCell(endpoint) : null,
      facing: schedule.finalTravelFacing || battle?.hero?.facing || "down",
      cost: schedule.totalCost,
      remaining: Math.max(0, (battle?.hero?.moveRange || 0) - schedule.totalCost),
      routeRemaining: Math.max(0, (battle?.hero?.moveRange || 0) - battleFacingReserve() - schedule.totalCost),
    };
  }

  function battleReachableTiles() {
    if (!battle || battle.phase !== "planning_move" || battle.moved) return [];
    const draft = battleMoveDraftState();
    if (!draft.endpoint || !Number.isFinite(draft.cost)) return [];

    // Preserve the already-authored route as history.  A new click chooses the
    // next waypoint/segment from the CURRENT endpoint; it never re-plans from
    // the round origin and never truncates/refunds a previous visit.
    const result = draft.schedule.path.map((cell) => ({
      ...copyBattleCell(cell),
      cost: draft.cost,
      path: draft.schedule.path.map(copyBattleCell),
      routeCell: true,
      nextStep: false,
    }));
    const remaining = battleRouteBudgetRemaining();
    if (remaining <= 1e-9) return result;

    const reachable = Tactics.reachableTiles(battle.grid, draft.endpoint, remaining, [], {
      includeStart: false,
      turnCost: BATTLE_TURN_COST,
      initialFacing: draft.facing,
    });
    for (const next of reachable) {
      const segment = (next.path?.length ? next.path : [draft.endpoint]).slice(1).map(copyBattleCell);
      if (!segment.length) continue;
      const commands = [
        ...(battle.heroMoveCommands || []).map((command) => ({ ...command, to: command.to ? copyBattleCell(command.to) : undefined })),
        ...segment.map((to) => ({ type: "move", to })),
      ];
      const schedule = battleMoveSchedule(commands);
      if (schedule.totalCost > battle.hero.moveRange - battleFacingReserve() + 1e-9) continue;
      result.push({
        x: next.x,
        y: next.y,
        cost: schedule.totalCost,
        path: schedule.path.map(copyBattleCell),
        commands,
        routeCell: false,
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
      const skill = plan.skill || enemy.skill;
      if (!skill || skill.dealsDamage === false || skill.actionKind === "guard") {
        plan.willAttack = false;
        plan.targetCells = [];
        continue;
      }
      const legalTarget = MonsterAI?.validateSkillFrom
        ? MonsterAI.validateSkillFrom(skill, enemy, enemy.cell, enemy.facing, battle.hero, battle.grid, battleUnits())
        : Skills.validateSkillTarget(skill, enemy.cell, battle.hero.cell, {
            grid: battle.grid,
            battlefield: battle.battlefield,
            heightMap: battle.battlefield?.heightMap,
            facing: enemy.facing,
            actorTeam: "enemy",
            actorId: enemy.id,
            targetUnit: { ...battle.hero, team: "ally" },
          }).ok;
      plan.willAttack = legalTarget && (enemy.ap || 0) >= (plan.apCost || skill.apCost || 0);
      plan.targetCells = plan.willAttack
        ? Skills.patternCells(skill, enemy.cell, battle.hero.cell, {
            grid: battle.grid,
            battlefield: battle.battlefield,
            heightMap: battle.battlefield?.heightMap,
            facing: enemy.facing,
          })
        : [];
    }
  }

  function appendBattleMoveWaypoint(cell) {
    if (!battle || battle.phase !== "planning_move" || !Tactics.isInside(battle.grid, cell)) return false;
    const draft = battleMoveDraftState();
    const endpoint = draft.endpoint || battle.hero.cell;

    // Clicking the current endpoint merely keeps the authored route selected.
    // Deliberate 0.5-step footwork belongs to the facing arrows, so an ordinary
    // map click never burns movement by accident.
    if (sameBattleCell(cell, endpoint)) {
      battle.cursor = copyBattleCell(endpoint);
      battle.awaitingFacing = true;
      battle.message = "";
      battle.messageDanger = false;
      updateBattleUi();
      return true;
    }

    // A click may target ANY tile reachable from the CURRENT endpoint.  The
    // chosen segment is expanded into its individual movement commands, so a
    // straight four-cell move needs one click, while A → B → A still keeps and
    // charges the return segment.  Only 「重新移動」 clears prior history.
    const route = battleReachableTiles().find((tile) => tile.nextStep && sameBattleCell(tile, cell));
    if (!route?.commands) {
      setBattleMessage("嗰格超出剩餘移動力，或者路線被障礙封住。", true);
      return false;
    }
    battle.heroMoveCommands = route.commands.map((command) => ({ ...command, to: command.to ? copyBattleCell(command.to) : undefined }));
    battle.heroMoveDraft = route.path.map(copyBattleCell);
    battle.cursor = copyBattleCell(cell);
    battle.awaitingFacing = true;
    battle.message = "";
    battle.messageDanger = false;
    updateBattleUi();
    return true;
  }

  function resetBattleMoveDraft() {
    if (!battle || battle.phase !== "planning_move") return false;
    battle.heroMoveCommands = [];
    battle.heroMoveDraft = [copyBattleCell(battle.hero.cell)];
    battle.cursor = copyBattleCell(battle.hero.cell);
    battle.awaitingFacing = true;
    battle.message = "";
    battle.messageDanger = false;
    updateBattleUi();
    return true;
  }

  function finishBattleMoveDraft() {
    if (!battle || battle.phase !== "planning_move") return false;
    return confirmPlannedMovement();
  }

  function confirmPlannedMovement(finalFacing = null) {
    if (!battle || battle.phase !== "planning_move") return false;
    let commands = [...(battle.heroMoveCommands || [])];
    let schedule = battleMoveSchedule(commands);
    if (finalFacing != null && ["up", "down", "left", "right"].includes(finalFacing)
      && finalFacing !== (schedule.finalTravelFacing || battle.hero.facing)) {
      const candidate = [...commands, { type: "face", facing: finalFacing }];
      const candidateSchedule = battleMoveSchedule(candidate);
      if (candidateSchedule.totalCost <= battle.hero.moveRange + 1e-9) {
        commands = candidate;
        schedule = candidateSchedule;
      }
    }
    battle.heroMoveCommands = commands;
    battle.heroMoveDraft = schedule.path.map(copyBattleCell);
    battle.awaitingFacing = false;
    startMovementResolution(schedule.path, schedule.finalTravelFacing || battle.hero.facing, commands);
    return true;
  }

  function chooseBattleFacing(facing) {
    if (!battle || battle.phase !== "planning_move" || !["up", "down", "left", "right"].includes(facing)) return false;
    const commands = [...(battle.heroMoveCommands || []), { type: "face", facing }];
    const schedule = battleMoveSchedule(commands);
    if (schedule.totalCost > battle.hero.moveRange + 1e-9) {
      setBattleMessage("移動力唔夠再轉向／踏步。", true);
      return false;
    }
    battle.heroMoveCommands = commands;
    battle.heroMoveDraft = schedule.path.map(copyBattleCell);
    battle.cursor = copyBattleCell(schedule.path.at(-1) || battle.hero.cell);
    battle.awaitingFacing = true;
    battle.message = "";
    battle.messageDanger = false;
    updateBattleUi();
    return true;
  }

  function syncBattleFacingPicker() {
    if (!battleFacingPicker) return;
    const visible = Boolean(battle && mode === "battle" && battle.phase === "planning_move" && battle.awaitingFacing);
    battleFacingPicker.hidden = !visible;
    if (!visible) return;
    const layout = battleLayout();
    const projected = Boolean(layout.projected);
    battleFacingPicker.dataset.projected = projected ? "true" : "false";
    const labels = projected
      ? { up: "左上", right: "右上", down: "右下", left: "左下" }
      : { up: "上", right: "右", down: "下", left: "左" };
    const coarseBattlePointer = Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    const touchSizedPicker = coarseBattlePointer || width <= 530;
    const pickerRadius = touchSizedPicker
      ? Core.clamp(layout.cell * .56, 34, 48)
      : Core.clamp(layout.cell * .48, 31, 45);
    const currentCommands = battle.heroMoveCommands || [];
    const currentCost = battleMoveCost(currentCommands);
    for (const button of battleFacingPicker.querySelectorAll("[data-battle-facing]")) {
      const facing = button.dataset.battleFacing;
      const label = labels[facing] || facing;
      if (projected) {
        const vector = battleFacingScreenVector(facing, layout);
        const angle = Math.atan2(vector.y, vector.x) * 180 / Math.PI;
        button.innerHTML = '<span aria-hidden="true">➤</span>';
        button.style.left = `${vector.x * pickerRadius}px`;
        button.style.top = `${vector.y * pickerRadius}px`;
        button.style.setProperty("--battle-facing-angle", `${angle}deg`);
      } else {
        const glyph = ({ up: "▲", right: "▶", down: "▼", left: "◀" })[facing] || "•";
        button.textContent = glyph;
        button.style.left = "";
        button.style.top = "";
        button.style.removeProperty("--battle-facing-angle");
      }
      const candidateCommands = [...currentCommands, { type: "face", facing }];
      const candidateCost = battleMoveCost(candidateCommands);
      const actionCost = Math.max(0, candidateCost - currentCost);
      const affordable = candidateCost <= battle.hero.moveRange + 1e-9;
      button.disabled = !affordable;
      button.classList.toggle("is-unaffordable", !affordable);
      button.setAttribute("aria-label", `面向${label}；消耗 ${formatRemainingMove(actionCost)} 移動力`);
      button.title = affordable ? `消耗 ${formatRemainingMove(actionCost)} 移動力` : "剩餘移動力不足";
    }
    const endpoint = battleMoveDraftState().endpoint || battle.hero.cell;
    const point = battleCellCentre(endpoint, layout);
    const edge = touchSizedPicker ? 62 : 66;
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
    for (let y = 0; y < battle.grid.height; y += 1) {
      for (let x = 0; x < battle.grid.width; x += 1) {
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
    for (let y = 0; y < battle.grid.height; y += 1) {
      for (let x = 0; x < battle.grid.width; x += 1) {
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
    if (action === "cancel-target") return cancelBattleTargetSelection();
    if (action === "flee") {
      if (battle.phase !== "planning_move") return setBattleMessage("移動階段先可以撤退。", true);
      return fleeBattle();
    }
    if (battle.phase === "planning_move") {
      if (action === "end-move") return finishBattleMoveDraft();
      if (action === "reset-move" || action === "move") return resetBattleMoveDraft();
      return setBattleMessage("先完成移動。", true);
    }
    if (action === "move") {
      return setBattleMessage("今輪移動已經完成。", true);
    } else if (action.startsWith("skill:")) {
      const skill = battleSkillFromAction(action);
      if (!skill || !skillState.unlockedSkillIds.some((id) => Skills.canonicalSkillId(id) === Skills.canonicalSkillId(skill.id)) || !skillState.equippedSkillIds.some((id) => Skills.canonicalSkillId(id) === Skills.canonicalSkillId(skill.id))) return setBattleMessage("呢招未裝備喺技能欄。", true);
      if (battle.ap < skill.apCost) return setBattleMessage(`${skill.name}要 ${skill.apCost} AP；可以待機儲力。`, true);
      battle.selectedAction = action;
      battle.message = "請喺棋盤揀發光目標；按 Esc 或右鍵取消。";
      if (skill.targeting.mode === "self") return resolvePlayerBattleSkill(skill, battle.hero.cell, battle.hero);
    } else if (action === "potion") {
      return useBattlePotion();
    } else if (action === "end-turn") {
      return beginActionResolution({ type: "wait", label: "待機" });
    }
    updateBattleUi();
  }

  function cancelBattleTargetSelection() {
    if (!battle || battle.phase !== "planning_action" || !battleSkillFromAction(battle.selectedAction)) return false;
    battle.selectedAction = null;
    battle.message = "揀一招；棋盤會顯示合法目標。";
    battle.messageDanger = false;
    updateBattleUi();
    return true;
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

  function buildSimultaneousMovementFrames(heroPath, finalFacing, heroCommands = battle?.heroMoveCommands || []) {
    const actors = battleUnits().filter((unit) => unit.alive);
    const routes = new Map();
    routes.set(battle.hero.id, {
      path: heroPath.map(copyBattleCell),
      commands: heroCommands.map((command) => ({ ...command, to: command.to ? copyBattleCell(command.to) : undefined })),
      finalFacing,
    });
    for (const plan of battle.enemyPlans) {
      const enemy = battle.enemies.find((unit) => unit.id === plan.enemyId);
      if (enemy?.alive) routes.set(enemy.id, {
        path: (plan.path?.length ? plan.path : [enemy.cell]).map(copyBattleCell),
        commands: (plan.commands || []).map((command) => ({ ...command, to: command.to ? copyBattleCell(command.to) : undefined })),
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

  function startMovementResolution(heroPath, finalFacing, heroCommands = battle?.heroMoveCommands || []) {
    if (!battle || battle.phase !== "planning_move") return;
    const movement = buildSimultaneousMovementFrames(heroPath, finalFacing, heroCommands);
    battle.phase = "resolving_move";
    battle.moved = true;
    battle.selectedAction = null;
    battle.heroMovePlan = {
      path: heroPath.map(copyBattleCell),
      commands: heroCommands.map((command) => ({ ...command, to: command.to ? copyBattleCell(command.to) : undefined })),
      move: copyBattleCell(heroPath[heroPath.length - 1]),
      facing: finalFacing,
    };
    battle.movementResolution = { ...movement, finalHeroFacing: finalFacing, elapsed: 0, stepDuration: BATTLE_MOVE_STEP_SECONDS };
    battle.actingUnitIds = movement.actors.filter((id) => movement.unitResults[id]?.elapsedCost > 0 || movement.unitResults[id]?.blocked);
    battle.message = heroPath.length > 1 ? `路線確認——${battle.hero.name}同霧獸同步移動！` : `${battle.hero.name}留喺原位；霧獸開始行動。`;
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
    // Action selection is an explicit step. Do not silently enter target
    // selection for the first equipped skill before the player chooses it.
    battle.selectedAction = null;
    battle.cursor = { ...battle.hero.cell };
    battle.actingUnitIds = [];
    for (const unit of stoppedUnits) {
      unit.stopFlash = .48;
      battle.effects.push({ cell: { ...unit.cell }, text: "STOP!", color: "#ff6b6b", life: .95, maxLife: .95, burst: true });
    }
    if (!stoppedUnits.some((unit) => unit.id === battle.hero.id)) {
      battle.effects.push({ cell: { ...battle.hero.cell }, text: "停定！", color: "#52dccb", life: .75, maxLife: .75 });
    }
    battle.message = stoppedUnits.length
      ? "移動 STOP；按實際企位揀招。"
      : "移動完成；揀一招，棋盤會顯示合法目標。";
    battle.autoTimer = .28;
    updateBattleUi();
    announce(stoppedUnits.length ? "有單位被卡住，移動停止。請選擇今輪行動。" : "移動完成。請選擇今輪行動。");
  }

  function resolvePlayerBattleSkill(skill, targetCell, targetUnit = null, pattern = null) {
    if (!battle || battle.phase !== "planning_action") return;
    if (!skill || battle.ap < skill.apCost) return setBattleMessage("AP 唔夠。", true);
    battle.ap -= skill.apCost;
    const centre = targetCell || battle.hero.cell;
    const attackPath = ["linear", "arc"].includes(skill.deliveryMode)
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
    battle.effects.push({ cell: { ...unit.cell }, text: `-${result.requestedDamage}`, color, life: .9, maxLife: .9, kind: "damage", offsetX, offsetY });
    return result;
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
    if (player.potions <= 0) return setBattleMessage("小型回復藥用晒喇。", true);
    if (battle.hero.hp >= battle.hero.maxHp) return setBattleMessage("而家滿血，留返支藥先。", true);
    beginActionResolution({ type: "potion", label: "小型回復藥" });
  }

  function beginActionResolution(heroAction) {
    if (!battle || mode !== "battle" || battle.phase !== "planning_action") return;
    const heroSkill = heroAction.type === "skill" ? Skills.getSkill(heroAction.skillId) : null;
    const heroSpeedGrade = heroSkill?.speedGrade || (heroAction.type === "potion" ? "S" : "F");
    const heroPending = Tactics.createPendingAction({
      id: `round-${battle.round}:hero`,
      actorId: battle.hero.id,
      targetId: heroAction.targetId,
      targetCell: heroAction.targetCell,
      skillId: heroSkill?.id,
      skillDurability: heroSkill?.durability,
      deliveryMode: heroSkill?.deliveryMode || "pathless",
      rangeMin: heroSkill?.range?.min,
      rangeMax: heroSkill?.range?.max,
      targetArc: heroSkill?.targetArc,
      blocksByTerrain: heroSkill?.blocksByTerrain,
      blocksByUnits: heroSkill?.blocksByUnits,
      arcHeight: heroSkill?.arcHeight,
    });
    const enemyPending = battle.enemyPlans.filter((plan) => plan.willAttack).map((plan) => {
      const enemy = battle.enemies.find((unit) => unit.id === plan.enemyId);
      return Tactics.createPendingAction({
        id: `round-${battle.round}:${plan.enemyId}`,
        actorId: plan.enemyId,
        targetId: battle.hero.id,
        targetCell: { ...battle.hero.cell },
        skillId: plan.skill?.id || plan.skillId,
        skillDurability: plan.skill?.durability,
        deliveryMode: plan.skill?.deliveryMode || "pathless",
        rangeMin: enemy?.minAttackRange,
        rangeMax: enemy?.attackRange,
        targetArc: enemy?.targetArc,
        blocksByTerrain: plan.skill?.blocksByTerrain,
        blocksByUnits: plan.skill?.blocksByUnits,
        arcHeight: plan.skill?.arcHeight,
      });
    });
    const actionOrder = Skills.orderActionsBySpeed([
      { actorId: battle.hero.id, speedGrade: heroSpeedGrade, weight: battle.hero.weight, actionSpeedBonus: battle.hero.actionSpeedBonus, initiative: battle.hero.initiative },
      ...battle.enemyPlans.filter((plan) => plan.willAttack).map((plan) => {
        const enemy = battle.enemies.find((unit) => unit.id === plan.enemyId);
        return { actorId: plan.enemyId, speedGrade: plan.speedGrade || enemy?.speedGrade || "C", weight: enemy?.weight || 0, actionSpeedBonus: enemy?.actionSpeedBonus || 0, initiative: enemy?.initiative || 0 };
      }),
    ]);
    battle.phase = "resolving_action";
    battle.selectedAction = null;
    battle.messageDanger = false;
    battle.actionResolution = {
      elapsed: 0,
      actionElapsed: 0,
      actionIndex: 0,
      applied: false,
      completed: false,
      heroAction,
      actionOrder,
      pendingActions: [heroPending, ...enemyPending],
      resolvedActorIds: [],
      heroSummary: "",
      enemySummaries: [],
      cancelledActors: [],
    };
    battle.actingUnitId = actionOrder[0]?.actorId || null;
    battle.actingUnitIds = [];
    battle.message = `${heroAction.label}已確認（速度 ${heroSpeedGrade}）——按 S → A → B → C → D → E → F 順序出手。`;
    updateBattleUi();
  }

  function updateActionResolution(dt) {
    const resolution = battle?.actionResolution;
    if (!resolution || battle.phase !== "resolving_action") return;
    const duration = Math.max(.01, BATTLE_ACTION_WINDUP_SECONDS + BATTLE_ACTION_LINGER_SECONDS);
    resolution.elapsed += dt;
    resolution.actionElapsed += dt;
    const current = resolution.actionOrder?.[resolution.actionIndex] || null;
    battle.actingUnitId = current?.actorId || null;
    battle.actingUnitIds = [];

    if (current && !resolution.resolvedActorIds.includes(current.actorId) && resolution.actionElapsed >= BATTLE_ACTION_WINDUP_SECONDS) {
      applyOrderedBattleAction(resolution.heroAction, current.actorId);
    }

    if (!resolution.completed && resolution.actionElapsed >= duration) {
      if (current && !resolution.resolvedActorIds.includes(current.actorId)) applyOrderedBattleAction(resolution.heroAction, current.actorId);
      resolution.actionIndex += 1;
      resolution.actionElapsed = 0;
      const next = resolution.actionOrder?.[resolution.actionIndex] || null;
      if (next) {
        battle.actingUnitId = next.actorId;
        updateBattleUi();
        return;
      }

      resolution.completed = true;
      resolution.applied = true;
      battle.actingUnitId = null;
      battle.actingUnitIds = [];
      battle.evasion = 0;
      const summaries = [resolution.heroSummary, ...(resolution.enemySummaries || [])].filter(Boolean);
      const cancelled = [...new Set(resolution.cancelledActors || [])];
      if (cancelled.length) summaries.push(`${cancelled.join("、")}因倒下或異常狀態取消行動`);
      if (summaries.length) battle.message = `${summaries.join("；")}。`;
      if (battle.hero.hp <= 0) return finishBattleDefeat();
      if (livingBattleEnemies().length === 0) return finishBattleVictory();
      battle.round += 1;
      beginPlayerRound();
    }
  }

  function applyOrderedBattleAction(heroAction, actorId) {
    const resolution = battle?.actionResolution;
    if (!resolution || resolution.resolvedActorIds.includes(actorId)) return;
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
    let evasionThisRound = 0;
    let effectTargets = [];
    let specialEffectsApplied = false;
    const heroBuffFeedback = [];
    const statusTargets = [];
    const heroHitResolvers = [];
    let heroMissCount = 0;
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
      const projectileTrace = ["linear", "arc"].includes(skill?.deliveryMode)
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
          arcHeight: skill.arcHeight,
        })
        : null;
      // Linear and ballistic deliveries resolve the first terrain/unit impact;
      // pathless/area skills retain their authored effect area.
      if (projectileTrace) affectedEnemies = projectileTrace.actualTarget ? [projectileTrace.actualTarget] : [];
      effectTargets = skill.targeting.team === "ally" ? [battle.hero].filter((unit) => pattern.has(Tactics.cellKey(unit.cell))) : affectedEnemies;
      if (damageEffect) {
        const hitCount = Math.max(1, Math.floor(Number(skill.hitResolution?.hit_count || damageEffect.hits) || 1));
        const recheck = Boolean(skill.hitResolution?.recheck_attack_path_each_hit);
        const makeHeroHit = (target, hitIndex, attackPath = projectileTrace?.path || heroAction.attackPath) => {
          if (!target) return null;
          const existingDebuff = target.defenceDownUntilRound >= battle.round ? target.defenceDown || 0 : 0;
          const defence = Math.max(0, (target.defence || 0) * (1 - existingDebuff) * (1 - (pierceEffect?.amount || 0)));
          const positional = Tactics.positionalAttack(battle.hero, target, {
            attackPath,
            facing: battle.hero.facing,
            side: 1 + BATTLE_SIDE_DAMAGE_BONUS,
            rear: 1 + BATTLE_REAR_DAMAGE_BONUS,
          });
          const authoredMultiplier = skill.damage
            ? Skills.calculateSkillDamageMultiplier(skill)
            : (damageEffect.scale || skill.power || 1);
          const totalDamage = Tactics.calculateDamage(battle.hero, target, {
            defence,
            multiplier: authoredMultiplier * positional.multiplier,
            critical: skill.area.shape === "single" && hitIndex === 0 && battleRandom() < playerStats().critChance,
            minimum: Tactics.MIN_DIRECT_DAMAGE,
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
        if (projectileTrace) {
          heroHitResolvers.push({
            hitCount,
            recheck,
            path: projectileTrace.path,
            initialTarget: projectileTrace.actualTarget,
            deliveryMode: skill.deliveryMode,
            arcHeight: skill.arcHeight,
            makeHeroHit,
          });
        } else {
          for (const target of affectedEnemies) {
            heroHitResolvers.push({
              hitCount,
              recheck: false,
              path: [],
              initialTarget: target,
              deliveryMode: skill.deliveryMode,
              arcHeight: skill.arcHeight,
              makeHeroHit,
            });
          }
        }
      }
      if (healEffect && pattern.has(Tactics.cellKey(battle.hero.cell))) {
        heroHeal = Math.round(battle.hero.maxHp * (healEffect.maxHpRatio || 0) + (healEffect.flat || 0));
      }
      if (guardEffect && pattern.has(Tactics.cellKey(battle.hero.cell))) {
        guardReduction = Math.max(guardReduction, guardEffect.amount || 0);
        heroBuffFeedback.push("防禦力提升");
      }
      if (moveUpEffect) {
        moveBonusNext = Math.max(moveBonusNext, moveUpEffect.amount || 0);
        heroBuffFeedback.push("移動力提升");
      }
      if (evasionEffect) {
        evasionThisRound = Math.max(evasionThisRound, evasionEffect.amount || 0);
        heroBuffFeedback.push("迴避力提升");
      }
      if (defenceDownEffect || moveDownEffect) {
        for (const target of affectedEnemies) statusTargets.push({ target, defenceDownEffect, moveDownEffect });
      }
    } else if (heroAction.type === "potion") {
      heroHeal = 30;
    }

    const enemyHits = [];
    const missedCells = [];
    for (const plan of battle.enemyPlans) {
      const enemy = enemiesAtStart.find((unit) => unit.id === plan.enemyId);
      if (!enemy || !plan.willAttack || !plan.targetCells.length) continue;
      const skill = plan.skill || enemy.skill;
      const hit = Boolean(skill)
        && (MonsterAI?.validateSkillFrom
          ? MonsterAI.validateSkillFrom(skill, enemy, enemy.cell, enemy.facing, battle.hero, battle.grid, battleUnits())
          : Skills.validateSkillTarget(skill, enemy.cell, battle.hero.cell, {
              grid: battle.grid,
              battlefield: battle.battlefield,
              heightMap: battle.battlefield?.heightMap,
              facing: enemy.facing,
              actorTeam: "enemy",
              actorId: enemy.id,
              targetUnit: { ...battle.hero, team: "ally" },
            }).ok)
        && plan.targetCells.some((cell) => sameBattleCell(cell, battle.hero.cell));
      // A stale/empty prediction is cancelled silently: the monster does not
      // spend AP or perform an attack at a square where no target exists.
      if (!hit) continue;
      const positionalPath = Tactics.facingOrthogonalPriority(enemy.cell, battle.hero.cell, enemy.facing);
      const positional = Tactics.positionalAttack(enemy, battle.hero, {
        attackPath: positionalPath,
        facing: enemy.facing,
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
    const currentAction = orderedActions.find((action) => action.actorId === actorId) || null;
    battle.actingUnitIds = [];

    if (!currentAction) {
      const skippedUnit = battleUnits().find((unit) => unit.id === actorId);
      if (skippedUnit?.name) cancelledActions.push(skippedUnit.name);
    }

    for (const action of orderedActions) {
      if (action.actorId !== actorId) continue;
      const pending = battle.actionResolution.pendingActions.find((entry) => entry.actorId === action.actorId);
      const validation = pending ? revalidateBattlePendingAction(pending) : { ok: true };
      if (!validation.ok) {
        pending && (pending.status = "cancelled");
        cancelledActions.push(action.kind === "hero" ? battle.hero.name : action.hit?.enemy?.name || action.actorId);
        continue;
      }
      pending && (pending.status = "executing");
      if (action.kind === "hero") {
        if (!battle.hero.alive || battle.hero.hp <= 0 || FighterEffects?.isDisabled(battle.hero, battle.round)) {
          pending && (pending.status = "cancelled");
          cancelledActions.push(battle.hero.name);
          continue;
        }
        heroExecuted = true;
        if (heroAction.type === "potion") player.potions = Math.max(0, player.potions - 1);
        heroHeal = Math.min(battle.hero.maxHp - battle.hero.hp, heroHeal);
        if (heroHeal > 0) battle.hero.hp = Math.min(battle.hero.maxHp, battle.hero.hp + heroHeal);
        battle.guardReduction = guardReduction;
        battle.guard = guardReduction > 0;
        battle.moveBonusNext = Math.max(battle.moveBonusNext || 0, moveBonusNext);
        // Evasion stance applies to this resolution only. It is cleared after
        // both sides finish acting, so a one-round stance never leaks into
        // the next round.
        battle.evasion = Math.max(battle.evasion || 0, evasionThisRound);
        const executionHits = [...heroHits];
        for (const resolver of heroHitResolvers) {
          const routedDelivery = ["linear", "arc"].includes(resolver.deliveryMode);
          const traceNow = () => routedDelivery
            ? Tactics.traceAttackPath({
                origin: battle.hero.cell,
                target: heroAction.targetCell,
                facing: battle.hero.facing,
                grid: battle.grid,
                units: battleUnits(),
                actorId: battle.hero.id,
                deliveryMode: resolver.deliveryMode,
                blocksByTerrain: skill.blocksByTerrain,
                blocksByUnits: skill.blocksByUnits,
                arcHeight: resolver.arcHeight,
              })
            : null;
          const stableTrace = routedDelivery && !resolver.recheck ? traceNow() : null;
          for (let hitIndex = 0; hitIndex < resolver.hitCount; hitIndex += 1) {
            const trace = resolver.recheck ? traceNow() : stableTrace;
            const target = routedDelivery ? trace?.actualTarget : resolver.initialTarget;
            const hit = resolver.makeHeroHit(target, hitIndex, trace?.path || resolver.path);
            if (hit) executionHits.push(hit);
          }
        }
        for (const hit of executionHits) {
          if (!hit.target.alive || hit.target.hp <= 0) continue;
          const hitRoll = Tactics.rollHit({
            accuracy: battle.hero.accuracy,
            accuracyMultiplier: skill?.accuracyMultiplier ?? 1,
            evasion: battleTargetEvasion(hit.target),
            accuracyPenalties: [(FighterEffects?.accuracyPenalty(battle.hero, battle.round) || 0) * 100],
          }, battleRandom);
          if (!hitRoll.hit) {
            heroMissCount += 1;
            battle.effects.push({ cell: { ...hit.target.cell }, text: "MISS", color: BATTLE_MISS_COLOR, life: .9, maxLife: .9, offsetY: .16 });
            addSystemMessage("combat", `${skill?.name || "攻擊"}對${hit.target.name}未命中`);
            continue;
          }
          if (hit.hitIndex === 0 && hit.position === "rear") battle.effects.push({ cell: { ...hit.target.cell }, text: "背擊 +35%", color: "#ff9dd3", life: 1, maxLife: 1, kind: "positionBonus", offsetY: -.4 });
          else if (hit.hitIndex === 0 && hit.position === "side") battle.effects.push({ cell: { ...hit.target.cell }, text: "側擊 +15%", color: "#a9c9ff", life: 1, maxLife: 1, kind: "positionBonus", offsetY: -.4 });
          const hitResult = applyBattleHit(hit.target, hit.damage, hit.color, hit.hitIndex, hit.hitCount);
          addSystemMessage("combat", `${skill?.name || "攻擊"}對${hit.target.name}造成 ${hitResult.requestedDamage} 傷害`);
          Tactics.applyInterrupt(
            battle.actionResolution.pendingActions.find((entry) => entry.actorId === hit.target.id),
            battleNumber(skill.interrupt),
          );
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
            const result = FighterEffects.applySkillEffects({ skill: { ...skill, effects: additional }, caster: battle.hero, targets, units: battleUnits(), grid: battle.grid, round: battle.round, random: battleRandom });
            specialEffectsApplied = Boolean(result.applied);
            showFighterEffectEvents(result);
          }
        }
        continue;
      }

      const hit = action.hit;
      if (!hit.enemy.alive || hit.enemy.hp <= 0 || !battle.hero.alive || battle.hero.hp <= 0 || FighterEffects?.isDisabled(hit.enemy, battle.round)) {
        pending && (pending.status = "cancelled");
        cancelledActions.push(hit.enemy.name);
        continue;
      }
      // The pending action was revalidated above against the current cells;
      // never execute a prediction from the old pre-knockback position.
      const liveEnemyPositional = Tactics.positionalAttack(hit.enemy, battle.hero, {
        attackPath: Tactics.facingOrthogonalPriority(hit.enemy.cell, battle.hero.cell, hit.enemy.facing),
        facing: hit.enemy.facing,
        side: 1 + BATTLE_SIDE_DAMAGE_BONUS,
        rear: 1 + BATTLE_REAR_DAMAGE_BONUS,
      });
      hit.position = liveEnemyPositional.position;
      hit.enemy.ap = Math.max(0, (hit.enemy.ap || 0) - (hit.plan.apCost || hit.enemy.skillCost || 0));
      const passiveStats = learnedFighterPassives();
      const hitRoll = Tactics.rollHit({
        accuracy: hit.enemy.accuracy,
        accuracyMultiplier: hit.plan.skill?.accuracyMultiplier ?? 1,
        evasion: battleTargetEvasion(battle.hero),
        accuracyPenalties: [(FighterEffects?.accuracyPenalty(hit.enemy, battle.round) || 0) * 100],
      }, battleRandom);
      if (!hitRoll.hit) {
        missedCells.push({ cell: { ...battle.hero.cell }, enemy: hit.enemy, skillName: hit.plan.skillName || hit.enemy.skillName || "攻擊" });
        addSystemMessage("combat", `${hit.enemy.name}對你未命中`, "incoming");
        continue;
      }
      const activeGuard = battle.guardReduction || 0;
      hit.damage = Tactics.calculateDamage(hit.enemy, battle.hero, {
        multiplier: (hit.plan.skill?.damageModel?.scale || 1) * (hit.position === "rear" ? 1 + BATTLE_REAR_DAMAGE_BONUS : hit.position === "side" ? 1 + BATTLE_SIDE_DAMAGE_BONUS : 1),
        guarded: activeGuard > 0,
        guardMultiplier: 1 - activeGuard,
        minimum: Tactics.MIN_DIRECT_DAMAGE,
      });
      hit.damage = Math.max(1, Math.round(hit.damage * (FighterEffects?.damageMultiplier(battle.hero, battle.round) ?? 1)));
      if (FighterEffects) {
        const counter = FighterEffects.resolveCounter({
          defender: battle.hero,
          attacker: hit.enemy,
          damage: hit.damage,
          isProjectile: hit.plan.skill?.isProjectile === true,
          round: battle.round,
        });
        hit.damage = counter.damage;
        showFighterEffectEvents(counter);
      }
      const result = Tactics.applyDamage(battle.hero, hit.damage);
      hit.appliedDamage = result.appliedDamage;
      hit.damage = result.requestedDamage;
      addSystemMessage("combat", `${hit.enemy.name}對你造成 ${hit.damage} 傷害`, "incoming");
      battle.hero.hp = result.hpAfter;
      battle.hero.alive = !result.defeated;
      if (hit.plan.skill && FighterEffects && hit.plan.skill.effects?.length && battle.hero.alive) {
        const effectResult = FighterEffects.applySkillEffects({ skill: hit.plan.skill, caster: hit.enemy, targets: [battle.hero], units: battleUnits(), grid: battle.grid, round: battle.round, random: battleRandom });
        showFighterEffectEvents(effectResult);
      }
      Tactics.applyInterrupt(
        battle.actionResolution.pendingActions.find((entry) => entry.actorId === battle.hero.id),
        battleNumber(hit.plan.skill?.interrupt),
      );
      executedEnemyHits.push(hit);
    }
    const actorIsHero = actorId === battle.hero.id;
    if (actorIsHero && !heroExecuted) heroHeal = 0;
    if (actorIsHero) {
      if (skill && heroExecuted) {
        const skillColor = skill.star === 3 ? "#ff9dd3" : skill.star === 2 ? "#a9c9ff" : "#ffc857";
        const appliedBuffLabels = [...new Set(heroBuffFeedback)];
        appliedBuffLabels.forEach((label, index) => {
          battle.effects.push({
            cell: { ...battle.hero.cell },
            text: label,
            color: "#87db82",
            life: 1.05,
            maxLife: 1.05,
            kind: "status",
            burst: true,
            offsetY: -.55 - index * .34,
          });
          addSystemMessage("combat", label);
        });
        const landed = executedHeroHits.length || heroHeal > 0 || specialEffectsApplied || statusTargets.length || appliedBuffLabels.length > 0;
        const pureCoreBuff = appliedBuffLabels.length > 0 && !executedHeroHits.length && heroHeal <= 0 && !specialEffectsApplied && !statusTargets.length;
        if (landed && !pureCoreBuff) battle.effects.push({ cell: { ...heroAction.targetCell }, text: skillIcon(skill), color: skillColor, life: 1, maxLife: 1, burst: true });
        else if (!landed && !heroMissCount) {
          battle.effects.push({ cell: { ...heroAction.targetCell }, text: "MISS", color: BATTLE_MISS_COLOR, life: 1, maxLife: 1, burst: true });
          addSystemMessage("combat", `${skill.name}未命中`);
        }
        if (skill.tags.includes("heal")) sound.heal();
        else if (skill.tags.includes("magic")) sound.crystal();
        else if (executedHeroHits.length) { sound.swing(); sound.hit(); }
        else sound.tone(430, .13, { to: 680, gain: .025 });
      } else if (heroAction.type === "potion" && heroExecuted) {
        battle.effects.push({ cell: { ...battle.hero.cell }, text: `+${heroHeal}`, color: "#87db82", life: 1, maxLife: 1, burst: true });
        addSystemMessage("item", `使用小型回復藥，恢復 ${heroHeal} HP`);
        sound.heal();
      } else if (heroExecuted) {
        battle.effects.push({ cell: { ...battle.hero.cell }, text: "待機", color: "#87db82", life: .9, maxLife: .9 });
      } else {
        battle.effects.push({ cell: { ...battle.hero.cell }, text: "行動取消", color: "#ff6b6b", life: 1, maxLife: 1 });
      }
    }

    for (const miss of missedCells.slice(0, 2)) battle.effects.push({ cell: { ...miss.cell }, text: "MISS", color: BATTLE_MISS_COLOR, life: .9, maxLife: .9 });
    const totalEnemyDamage = executedEnemyHits.reduce((sum, hit) => sum + hit.damage, 0);
    player.hp = battle.hero.hp;
    if (!actorIsHero && totalEnemyDamage > 0) {
      battle.hero.hitFlash = .35;
      if (executedEnemyHits.some((hit) => hit.position === "rear")) battle.effects.push({ cell: { ...battle.hero.cell }, text: "背擊 +35%", color: "#ff9dd3", life: 1, maxLife: 1, kind: "positionBonus", offsetY: -.4 });
      else if (executedEnemyHits.some((hit) => hit.position === "side")) battle.effects.push({ cell: { ...battle.hero.cell }, text: "側擊 +15%", color: "#a9c9ff", life: 1, maxLife: 1, kind: "positionBonus", offsetY: -.4 });
      battle.effects.push({ cell: { ...battle.hero.cell }, text: `-${totalEnemyDamage}`, color: "#ff6b6b", life: 1, maxLife: 1, kind: "damage", offsetY: .16 });
      sound.hurt();
      screenShake = reducedMotion ? 0 : 7;
    } else if (!actorIsHero && missedCells.length) sound.tone(620, .11, { to: 840, gain: .025 });

    if (actorIsHero) {
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
      const heroName = battle.hero.name || playerDisplayName();
      resolution.heroSummary = !heroExecuted
        ? `${heroName}未及出招，行動取消`
        : heroAction.type === "wait"
          ? `${heroName}待機（不附帶減傷）`
          : heroAction.type === "potion"
            ? `${heroName}回復 ${heroHeal} HP`
            : skill
              ? `${heroName}施放「${skill.name}」${skillResults.length ? `：${skillResults.join("、")}` : "，但冇命中"}`
              : `${heroName}完成行動`;
      battle.message = `${resolution.heroSummary}。`;
    } else {
      const usedSkills = [...new Set(executedEnemyHits.map((hit) => hit.skillName).filter(Boolean))];
      const enemyPosition = executedEnemyHits.some((hit) => hit.position === "rear") ? "（背擊 +35%）" : executedEnemyHits.some((hit) => hit.position === "side") ? "（側擊 +15%）" : "";
      const actorUnit = battleUnits().find((unit) => unit.id === actorId);
      const enemyResult = executedEnemyHits.length
        ? `${actorUnit?.name || "霧獸"}用${usedSkills.length ? `「${usedSkills.join("／")}」` : "技能"}${enemyPosition}造成 ${totalEnemyDamage} 傷害`
        : missedCells.length
          ? `${actorUnit?.name || "霧獸"}技能落空`
          : `${actorUnit?.name || "霧獸"}未能出招`;
      resolution.enemySummaries.push(enemyResult);
      battle.message = `${enemyResult}。`;
    }

    if (cancelledActions.length) resolution.cancelledActors.push(...cancelledActions);
    const pendingForActor = resolution.pendingActions.find((entry) => entry.actorId === actorId);
    if (pendingForActor?.status === "executing") pendingForActor.status = "resolved";
    resolution.resolvedActorIds.push(actorId);
    resolution.applied = resolution.resolvedActorIds.length >= resolution.actionOrder.length;
    updateHud();
    updateBattleUi();
  }

  function finishBattleVictory() {
    if (!battle || battle.phase === "victory") return;
    battle.phase = "victory";
    battle.message = "霧散開咗——戰鬥勝利！";
    battle.messageDanger = false;
    addSystemMessage("combat", "戰鬥獲勝！", "good");
    const token = battle.token;
    sound.level();
    updateBattleUi();
    scheduleBattle(() => {
      if (!battle || battle.token !== token) return;
      const finished = battle;
      const bonusUnits = finished.enemies.filter((unit) => !unit.primary);
      const encounterCount = Math.max(1, finished.enemies.length);
      const rewardLevel = Math.max(finished.source.level || 1, ...finished.enemies.map((unit) => Number(unit.level) || 1));
      const baseXp = ExpansionWorld.monsterBlueprint(finished.source.type)?.rewards?.baseXp ?? 100;
      const earnedXp = ExpansionWorld.battleXpReward(rewardLevel, player.level, encounterCount, baseXp);
      const bonusCoins = 0;
      player.hp = Math.max(1, finished.hero.hp);
      closeBattleHud();
      mode = "playing";
      stage.dataset.gameState = mode;
      killEnemy(finished.source, { grantXp: false });
      for (const unit of bonusUnits) recordDefeatedMonster(unit);
      gainXp(earnedXp);
      encounterGrace = 1;
      showToast(`戰鬥勝利 · +${earnedXp} XP`, "good");
      updateHud(true);
      saveImportant(false);
      canvas.focus({ preventScroll: true });
    }, 760);
  }

  function finishBattleDefeat() {
    if (!battle) return;
    const token = battle.token;
    battle.phase = "defeat";
    battle.message = "你倒下了……";
    battle.messageDanger = true;
    addSystemMessage("combat", "戰鬥失敗。", "danger");
    updateBattleUi();
    scheduleBattle(() => {
      if (!battle || battle.token !== token) return;
      player.hp = 0;
      playerDeath();
    }, 620);
  }

  function fleeBattle() {
    if (!battle || !["planning_move", "planning_action"].includes(battle.phase)) return;
    const chance = RETREAT_CHANCE_OVERRIDE ?? ExpansionWorld.retreatChance(player.level, livingBattleEnemies());
    if (battleRandom() >= chance) {
      const retreatMessage = `撤退失敗 · 成功率 ${Math.round(chance * 100)}%`;
      setBattleMessage(`${retreatMessage}，霧獸逼近咗！`, true);
      showToast(retreatMessage, "danger");
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
    addSystemMessage("combat", "撤退成功。", "good");
    showToast("撤退成功", "good");
    canvas.focus({ preventScroll: true });
  }

  function closeBattleHud() {
    stopBattleBgm();
    activeBattleTouches.clear();
    battlePinchGesture = null;
    suppressBattleTouchTap = false;
    battleView = { zoom: 1, offsetX: 0, offsetY: 0 };
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
    battle.hero.stopFlash = Math.max(0, (battle.hero.stopFlash || 0) - dt);
    for (const enemy of battle.enemies) {
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.stopFlash = Math.max(0, (enemy.stopFlash || 0) - dt);
    }
    for (const effect of battle.effects) effect.life -= dt;
    battle.effects = battle.effects.filter((effect) => effect.life > 0);
    if (battle.phase === "resolving_move") updateMovementResolution(dt);
    else if (battle.phase === "resolving_action") updateActionResolution(dt);
    if (autoplay && ["planning_move", "planning_action"].includes(battle.phase)) {
      battle.autoTimer -= dt;
      if (battle.autoTimer <= 0) autoPlayBattleTurn();
    }
    if (!battleCommandPosition.manual) syncBattleCommandMenu();
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
      battle.heroMoveCommands = battle.heroMoveDraft.slice(1).map((cell) => ({ type: "move", to: copyBattleCell(cell) }));
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

  function battleMoveRemainingMarkup(remaining) {
    return `<div class="battle-move-meter" role="status" aria-live="polite" aria-label="剩餘移動力 ${formatRemainingMove(remaining)}">
      <span class="battle-move-meter-label">剩餘移動力</span>
      <strong class="battle-move-remaining-value">${formatRemainingMove(remaining)}</strong>
    </div>`;
  }

  function selectedBattleSkillDetail(skill) {
    if (!skill) return "";
    const delivery = skill.deliveryMode === "arc" ? "拋物線" : skill.deliveryMode === "linear" ? "直線" : "";
    const details = [skillRangeText(skill), delivery].filter(Boolean).join(" · ");
    return `<div class="battle-target-context" role="status" aria-live="polite">
      <div><strong>${skill.name}</strong><small>${details}</small></div>
      <span>選擇目標</span>
    </div>`;
  }

  function renderBattleActionButtons() {
    const planningMove = battle.phase === "planning_move";
    const planningAction = battle.phase === "planning_action";
    const buttons = document.getElementById("battleSkillButtons");
    const commandModeLabel = battleActionDock?.querySelector(".battle-action-heading small");
    if (commandModeLabel) commandModeLabel.textContent = planningMove ? "移動" : planningAction ? "行動" : "";
    buttons.classList.toggle("is-move-phase", planningMove);
    buttons.classList.toggle("is-action-phase", planningAction);
    buttons.classList.toggle("is-target-phase", false);
    if (planningMove) {
      const remaining = Math.max(0, battle.hero.moveRange - battleMoveCost());
      buttons.innerHTML = `
        ${battleMoveRemainingMarkup(remaining)}
        <div class="battle-command-utility-row battle-move-command-row">
          <button id="battleResetMoveButton" class="battle-command-secondary reset-move-skill" type="button" data-battle-action="reset-move" ${battleMoveCost() <= 0 ? "disabled" : ""}>
            <b>重新移動</b>
          </button>
          <button id="battleMoveButton" class="battle-command-primary move-skill" type="button" data-battle-action="end-move">
            <b>結束移動</b>
          </button>
          <button id="battleFleeButton" class="battle-command-secondary flee-skill" type="button" data-battle-action="flee">
            <b>撤退</b>
          </button>
        </div>`;
      battleUi.potionCount = null;
      return;
    }
    if (!planningAction) {
      buttons.innerHTML = `<span class="battle-actions-loading">${battle.phase === "resolving_move" ? "移動中" : "行動中"}</span>`;
      battleUi.potionCount = null;
      return;
    }
    const selectedSkill = battleSkillFromAction(battle.selectedAction);
    if (selectedSkill) {
      buttons.classList.add("is-target-phase");
      buttons.innerHTML = `
        ${selectedBattleSkillDetail(selectedSkill)}
        <button class="battle-command-secondary cancel-target-button" type="button" data-battle-action="cancel-target">
          <b>取消</b>
        </button>`;
      battleUi.potionCount = null;
      return;
    }
    const skillButtons = equippedBattleSkills().map((skill) => {
      const id = skill.id === "quick_slash" ? ' id="battleAttackButton"' : skill.id === "lantern_shot" ? ' id="battleLanternButton"' : "";
      const className = skill.tags.includes("magic") ? "lantern-skill" : "attack-skill";
      const action = `skill:${skill.id}`;
      const disabled = battle.ap < skill.apCost;
      const apLabel = disabled ? `AP不足，需要 ${skill.apCost} AP` : `消耗 ${skill.apCost} AP`;
      return `<button${id} class="battle-command-skill ${className}" type="button" data-battle-action="${action}" ${disabled ? "disabled" : ""} title="${apLabel}" aria-label="${skill.name}，${apLabel}">
        <b>${skill.name}</b>
      </button>`;
    }).join("");
    buttons.innerHTML = `
      <div class="battle-command-skill-list">${skillButtons}</div>
      <div class="battle-command-utility-row battle-single-command-row">
        <button id="battleEndTurnButton" class="battle-command-secondary end-turn-skill" type="button" data-battle-action="end-turn"><b>待機</b></button>
      </div>`;
    battleUi.potionCount = null;
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
      planning_move: ["移動", "選擇位置"],
      resolving_move: ["移動中", ""],
      planning_action: ["戰鬥指令", "選擇招式"],
      resolving_action: ["行動中", ""],
      victory: ["戰鬥勝利！", "霧散開咗"],
      defeat: ["燈火熄滅", "返回落腳燈位"],
    };
    battleUi.turn.textContent = phaseCopy[battle.phase]?.[0] || "戰鬥";
    battleUi.phase.textContent = phaseCopy[battle.phase]?.[1] || "";
        battleUi.unitLevel.textContent = `LV. ${battle.hero.level}`;
    battleUi.unitName.textContent = battle.hero.name || playerDisplayName();
    battleUi.hpFill.style.width = `${Core.clamp(battle.hero.hp / battle.hero.maxHp, 0, 1) * 100}%`;
    battleUi.hpText.textContent = `${Math.ceil(battle.hero.hp)} / ${battle.hero.maxHp}`;
    battleUi.apFill.style.width = `${Core.clamp(battle.ap / BATTLE_AP_MAX, 0, 1) * 100}%`;
    battleUi.apText.textContent = `${battle.ap} / ${BATTLE_AP_MAX}`;
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
      { text: `面向 ${battleFacingDisplayLabel(battle.phase === "planning_move" ? battleMoveDraftState().facing : battle.hero.facing)}`, good: true },
      battle.guard ? { text: `技能減傷 -${Math.round((battle.guardReduction || 0) * 100)}%`, good: true } : null,
      battle.moveBonusNext ? { text: `下輪移動 +${battle.moveBonusNext}`, good: true } : null,
    ].filter(Boolean);
    for (const status of statuses) {
      const chip = document.createElement("span");
      chip.className = `unit-status ${status.good ? "is-good" : ""}`;
      chip.textContent = status.text;
      battleUi.statuses.appendChild(chip);
    }
    battleUi.hint.textContent = battle.message;
    battleUi.hint.classList.toggle("danger", Boolean(battle.messageDanger));
    battleUi.hint.hidden = !battle.messageDanger;
    renderBattleActionButtons();
    syncBattleFacingPicker();
    syncBattleCommandMenu();
  }

  function battleCommandBounds() {
    const margin = 12;
    const menuWidth = Math.max(1, battleActionDock?.offsetWidth || 1);
    const menuHeight = Math.max(1, battleActionDock?.offsetHeight || 1);
    return {
      margin,
      menuWidth,
      menuHeight,
      minX: margin,
      maxX: Math.max(margin, width - menuWidth - margin),
      minY: margin,
      maxY: Math.max(margin, height - menuHeight - margin),
    };
  }

  function clampBattleCommandPosition(x, y) {
    const bounds = battleCommandBounds();
    return {
      x: Core.clamp(Number(x) || 0, bounds.minX, bounds.maxX),
      y: Core.clamp(Number(y) || 0, bounds.minY, bounds.maxY),
    };
  }

  function defaultBattleCommandPosition() {
    const bounds = battleCommandBounds();
    const layout = battleLayout();
    const gap = Math.max(14, layout.cell * .12);
    const board = { left: layout.x, top: layout.y, right: layout.x + layout.width, bottom: layout.y + layout.height };
    const preferredY = board.top + layout.height * .58 - bounds.menuHeight / 2;
    const candidates = [
      { x: board.left - bounds.menuWidth - gap, y: preferredY },
      { x: board.right + gap, y: preferredY },
      { x: board.left, y: board.bottom + gap },
      { x: board.right - bounds.menuWidth, y: board.bottom + gap },
      { x: board.left, y: board.top - bounds.menuHeight - gap },
    ].map((candidate, index) => {
      const next = clampBattleCommandPosition(candidate.x, candidate.y);
      const overlapW = Math.max(0, Math.min(next.x + bounds.menuWidth, board.right) - Math.max(next.x, board.left));
      const overlapH = Math.max(0, Math.min(next.y + bounds.menuHeight, board.bottom) - Math.max(next.y, board.top));
      return { ...next, score: overlapW * overlapH * 1000 + index * 100 + Math.abs(next.y - preferredY) };
    });
    candidates.sort((a, b) => a.score - b.score);
    return { x: candidates[0].x, y: candidates[0].y };
  }

  function updateBattleCommandRatios() {
    const bounds = battleCommandBounds();
    const spanX = Math.max(1, bounds.maxX - bounds.minX);
    const spanY = Math.max(1, bounds.maxY - bounds.minY);
    battleCommandPosition.xRatio = Core.clamp((battleCommandPosition.x - bounds.minX) / spanX, 0, 1);
    battleCommandPosition.yRatio = Core.clamp((battleCommandPosition.y - bounds.minY) / spanY, 0, 1);
  }

  function saveBattleCommandPosition() {
    if (!battleCommandPosition.manual) return;
    updateBattleCommandRatios();
    try {
      localStorage.setItem(BATTLE_COMMAND_POSITION_KEY, JSON.stringify({
        xRatio: battleCommandPosition.xRatio,
        yRatio: battleCommandPosition.yRatio,
      }));
    } catch (_) {}
  }

  function syncBattleCommandMenu() {
    if (!battleActionDock || battleActionDock.hidden || !battle || mode !== "battle") return;
    const bounds = battleCommandBounds();
    let next;
    if (battleCommandPosition.manual) {
      if (battleCommandPosition.pointerId != null) {
        next = clampBattleCommandPosition(battleCommandPosition.x, battleCommandPosition.y);
      } else if (Number.isFinite(battleCommandPosition.xRatio) && Number.isFinite(battleCommandPosition.yRatio)) {
        next = clampBattleCommandPosition(
          bounds.minX + battleCommandPosition.xRatio * Math.max(1, bounds.maxX - bounds.minX),
          bounds.minY + battleCommandPosition.yRatio * Math.max(1, bounds.maxY - bounds.minY),
        );
      } else {
        next = defaultBattleCommandPosition();
        battleCommandPosition.manual = false;
      }
    } else {
      next = defaultBattleCommandPosition();
    }
    battleCommandPosition.x = next.x;
    battleCommandPosition.y = next.y;
    battleActionDock.style.left = `${Math.round(next.x)}px`;
    battleActionDock.style.top = `${Math.round(next.y)}px`;
    battleActionDock.dataset.positionMode = battleCommandPosition.manual ? "saved" : "default";
  }

  function beginBattleCommandDrag(event) {
    if (!battle || mode !== "battle" || event.button !== 0 || event.target.closest("button")) return;
    const rect = battleActionDock.getBoundingClientRect();
    battleCommandPosition.pointerId = event.pointerId;
    battleCommandPosition.offsetX = event.clientX - rect.left;
    battleCommandPosition.offsetY = event.clientY - rect.top;
    battleCommandPosition.manual = true;
    battleActionDock.classList.add("is-dragging");
    try { battleActionDock.setPointerCapture?.(event.pointerId); } catch (_) {}
    event.preventDefault();
  }

  function moveBattleCommandDrag(event) {
    if (battleCommandPosition.pointerId !== event.pointerId) return;
    const stageRect = stage.getBoundingClientRect();
    const next = clampBattleCommandPosition(
      event.clientX - stageRect.left - battleCommandPosition.offsetX,
      event.clientY - stageRect.top - battleCommandPosition.offsetY,
    );
    battleCommandPosition.manual = true;
    battleCommandPosition.x = next.x;
    battleCommandPosition.y = next.y;
    updateBattleCommandRatios();
    syncBattleCommandMenu();
    event.preventDefault();
  }

  function finishBattleCommandDrag(event) {
    if (battleCommandPosition.pointerId !== event.pointerId) return;
    try { battleActionDock.releasePointerCapture?.(event.pointerId); } catch (_) {}
    battleCommandPosition.pointerId = null;
    battleActionDock.classList.remove("is-dragging");
    saveBattleCommandPosition();
    syncBattleCommandMenu();
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
    camera.zoom = Core.lerp(camera.zoom, zoom, 1 - Math.exp(-5 * dt));
    const halfWorldW = width / (2 * Math.max(.001, camera.zoom));
    const halfWorldH = height / (2 * Math.max(.001, camera.zoom));
    const minX = Math.min(halfWorldW, world.pixelWidth * .5);
    const maxX = Math.max(minX, world.pixelWidth - halfWorldW);
    const minY = Math.min(halfWorldH, world.pixelHeight * .5);
    const maxY = Math.max(minY, world.pixelHeight - halfWorldH);
    // Follow the player through the middle of the map. Near an edge, let the
    // player move off-centre and clamp the camera instead of showing black.
    camera.x = Core.clamp(player.x, minX, maxX);
    camera.y = Core.clamp(player.y, minY, maxY);
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

  function contractEnemyTarget(enemy) {
    return ExpansionWorld.normalizeMonsterId(enemy?.type) || enemy?.type;
  }

  function contractTargetMap(target) {
    return ["frog", "turtle", "snake", "bear"].includes(target) ? "dungeon" : "field";
  }

  function nearestContractEnemy(target) {
    return enemies.filter((enemy) => contractEnemyTarget(enemy) === target)
      .sort((a, b) => Number(b.alive) - Number(a.alive) || Core.distance(player, a) - Core.distance(player, b))[0] || null;
  }

  function routeToMap(targetMapId) {
    if (currentMapId === targetMapId) return world.start;
    return firstPortalTowardMap(targetMapId) || currentMapExit();
  }

  function commissionQuestInfo() {
    const contract = activeGuildCommission();
    const guildBoard = currentMapId === "guild" ? world.boards[0] || world.start : null;
    if (!contract) return {
      title: "未接公會委託",
      detail: currentMapId === "guild" ? "查看公會委託，揀一份今晚嘅工作" : "去公會查看可重複委託",
      target: guildBoard || routeToMap("guild"),
    };
    if (guildCommissionState.status === "ready_to_report") return {
      title: "返公會回報",
      detail: `${contract.title}完成 · 領取${skillBookRewardText(contract)}`,
      target: guildBoard || routeToMap("guild"),
    };
    if (contract.type === "wish") {
      const targetMapId = "field";
      const target = currentMapId === targetMapId
        ? world.boards.find((board) => board.id === contract.objective.interaction_id)
        : null;
      return {
        title: contract.title,
        detail: "前往山地深處嘅古怪水池，替委託人許願",
        target: target || routeToMap(targetMapId),
      };
    }
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

  function updateHud(force = false) {
    const stats = playerStats();
    const hpRatio = Core.clamp(player.hp / stats.maxHp, 0, 1);
    const xpNeeded = Expansion.xpRequired(player.level);
    const atCap = player.level >= Expansion.LEVEL_CAP;
    const xpRatio = atCap ? 1 : Core.clamp(player.xp / xpNeeded, 0, 1);
    setTextIfChanged(hud.name, playerDisplayName());
    setTextIfChanged(hud.level, `LV. ${player.level}`);
    setStyleWidthIfChanged(hud.hpFill, `${hpRatio * 100}%`);
    setTextIfChanged(hud.hpText, `${Math.ceil(player.hp)} / ${stats.maxHp}`);
    setStyleWidthIfChanged(hud.xpFill, `${xpRatio * 100}%`);
    setTextIfChanged(hud.xpText, atCap ? `LV.${Expansion.LEVEL_CAP} MAX` : `${player.xp} / ${xpNeeded} XP`);
    setTextIfChanged(hud.coins, player.coins);
    setTextIfChanged(hud.potions, player.potions);
    setTextIfChanged(hud.weapon, equippedWeaponName());
    updateMenuBadges();
    const commission = commissionQuestInfo();
    setTextIfChanged(hud.commissionTitle, commission.title);
    setTextIfChanged(hud.commissionDetail, commission.detail);
    const steps = Math.round(Core.distance(player, commission.target) / world.tileSize);
    setTextIfChanged(hud.commissionDistance, steps <= 2 ? "目標喺附近" : `距離目標約 ${steps} 步`);
    setTextIfChanged(hud.zone, currentZone);
    setDatasetIfChanged(stage, "gameState", mode);
    setDatasetIfChanged(stage, "level", player.level);
    setDatasetIfChanged(stage, "hp", Math.ceil(player.hp));
    setDatasetIfChanged(stage, "aliveEnemies", enemies.filter((enemy) => enemy.alive).length);
    setDatasetIfChanged(stage, "map", currentMapId);
    setDatasetIfChanged(stage, "guildMarks", guildMarks);
    setDatasetIfChanged(stage, "contractStatus", guildCommissionState.status === "ready_to_report"
      ? "ready"
      : activeGuildCommission() ? guildCommissionState.status : "none");
    setDatasetIfChanged(stage, "skillBooks", totalOwnedSkillBooks());
    setDatasetIfChanged(stage, "facilityTab", facilityTab);
    if (force) drawMiniMap();
  }

  function zoneForPosition(position) {
    if (currentMapId === "guild") return "公會";
    if (currentMapId === "shop") return "裝備店";
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
    return "米克雷帝國";
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

  const SYSTEM_LOG_LABELS = Object.freeze({ combat: "戰鬥", reward: "獎勵", quest: "任務", item: "物品", system: "系統" });

  function syncSystemLogCollapsed() {
    if (!systemLog) return;
    systemLog.classList.toggle("is-collapsed", systemLogCollapsed);
    systemLog.dataset.collapsed = String(systemLogCollapsed);
    if (systemLogToggleButton) {
      systemLogToggleButton.textContent = systemLogCollapsed ? "+" : "−";
      systemLogToggleButton.setAttribute("aria-expanded", String(!systemLogCollapsed));
      systemLogToggleButton.setAttribute("aria-label", systemLogCollapsed ? "展開系統資訊欄" : "縮細系統資訊欄");
      systemLogToggleButton.title = systemLogCollapsed ? "展開資訊欄" : "縮細資訊欄";
    }
  }

  function toggleSystemLogCollapsed() {
    systemLogCollapsed = !systemLogCollapsed;
    try { localStorage.setItem(SYSTEM_LOG_COLLAPSED_KEY, systemLogCollapsed ? "1" : "0"); } catch (_) {}
    syncSystemLogCollapsed();
    renderSystemLog();
  }

  function renderSystemLog() {
    if (!systemLogMessages) return;
    const entries = systemLogFilter === "all" ? systemLogEntries : systemLogEntries.filter((entry) => entry.type === systemLogFilter);
    systemLog.dataset.filter = systemLogFilter;
    const visibleEntries = systemLogCollapsed ? entries.slice(-2) : entries;
    systemLogMessages.innerHTML = visibleEntries.map((entry) => `<div class="system-log-entry is-${entry.type} ${entry.tone ? `is-${entry.tone}` : ""}"><span class="system-log-tag">[${SYSTEM_LOG_LABELS[entry.type] || "系統"}]</span><span class="system-log-text">${escapeUiText(entry.text)}</span></div>`).join("");
    systemLogMessages.scrollTop = systemLogMessages.scrollHeight;
    for (const tab of systemLogTabs?.querySelectorAll?.("[data-log-filter]") || []) {
      const selected = tab.dataset.logFilter === systemLogFilter;
      tab.setAttribute("aria-pressed", String(selected));
      tab.classList.toggle("is-active", selected);
    }
    syncSystemLogCollapsed();
  }

  function addSystemMessage(type, text, tone = "") {
    const safeType = Object.hasOwn(SYSTEM_LOG_LABELS, type) ? type : "system";
    const safeText = String(text || "").trim().replace(/。+$/u, "");
    if (!safeText) return;
    systemLogEntries.push({ id: ++systemLogSerial, type: safeType, text: safeText, tone: String(tone || "") });
    if (systemLogEntries.length > 400) systemLogEntries.splice(0, systemLogEntries.length - 400);
    renderSystemLog();
  }

  function restoreSystemLogPosition() {
    if (!systemLog) return;
    try {
      const saved = JSON.parse(localStorage.getItem(SYSTEM_LOG_POSITION_KEY) || "null");
      if (!saved) return;
      const x = Number(saved.x);
      const y = Number(saved.y);
      if (Number.isFinite(x)) systemLog.style.setProperty("--system-log-x", `${x}px`);
      if (Number.isFinite(y)) systemLog.style.setProperty("--system-log-y", `${y}px`);
    } catch (_) {}
  }

  function beginSystemLogDrag(event) {
    if (!systemLog || event.button > 0) return;
    const style = getComputedStyle(systemLog);
    const rect = systemLog.getBoundingClientRect();
    systemLogDragGesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: Number.parseFloat(style.getPropertyValue("--system-log-x")) || 0,
      y: Number.parseFloat(style.getPropertyValue("--system-log-y")) || 0,
      rectLeft: rect.left,
      rectTop: rect.top,
      rectRight: rect.right,
      rectBottom: rect.bottom,
    };
    systemLogDragHandle.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveSystemLogDrag(event) {
    const gesture = systemLogDragGesture;
    if (!gesture || gesture.pointerId !== event.pointerId || !systemLog) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const minX = gesture.x + (8 - gesture.rectLeft);
    const maxX = gesture.x + (window.innerWidth - 8 - gesture.rectRight);
    const minY = gesture.y + (8 - gesture.rectTop);
    const maxY = gesture.y + (window.innerHeight - 8 - gesture.rectBottom);
    systemLog.style.setProperty("--system-log-x", `${Core.clamp(gesture.x + dx, Math.min(minX, maxX), Math.max(minX, maxX))}px`);
    systemLog.style.setProperty("--system-log-y", `${Core.clamp(gesture.y + dy, Math.min(minY, maxY), Math.max(minY, maxY))}px`);
    event.preventDefault();
  }

  function finishSystemLogDrag(event) {
    const gesture = systemLogDragGesture;
    if (!gesture || (event && event.pointerId !== gesture.pointerId) || !systemLog) return;
    systemLogDragGesture = null;
    try { systemLogDragHandle.releasePointerCapture?.(gesture.pointerId); } catch (_) {}
    const style = getComputedStyle(systemLog);
    const x = Number.parseFloat(style.getPropertyValue("--system-log-x")) || 0;
    const y = Number.parseFloat(style.getPropertyValue("--system-log-y")) || 0;
    try { localStorage.setItem(SYSTEM_LOG_POSITION_KEY, JSON.stringify({ x, y })); } catch (_) {}
  }

  function scrollSystemLogBy(delta) {
    if (!systemLogMessages || !Number.isFinite(Number(delta))) return;
    systemLogMessages.scrollTop += Number(delta);
  }

  function beginSystemLogScroll(event) {
    if (!systemLogScrollZone || event.button > 0) return;
    systemLogScrollGesture = { pointerId: event.pointerId, y: event.clientY, scrollTop: systemLogMessages?.scrollTop || 0 };
    systemLogScrollZone.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveSystemLogScroll(event) {
    const gesture = systemLogScrollGesture;
    if (!gesture || gesture.pointerId !== event.pointerId || !systemLogMessages) return;
    const dy = event.clientY - gesture.y;
    systemLogMessages.scrollTop = gesture.scrollTop - dy;
    event.preventDefault();
  }

  function finishSystemLogScroll(event) {
    const gesture = systemLogScrollGesture;
    if (!gesture || (event && event.pointerId !== gesture.pointerId)) return;
    systemLogScrollGesture = null;
    try { systemLogScrollZone?.releasePointerCapture?.(gesture.pointerId); } catch (_) {}
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

  // Rendering functions are kept together below so the simulation above remains testable.
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (battle && (mode === "battle" || mode === "dead")) {
      ctx.fillStyle = "#0a1020";
      ctx.fillRect(0, 0, width, height);
      drawBattle();
      if (screenFlash > .01) {
        ctx.fillStyle = `rgba(255,107,107,${screenFlash * .16})`;
        ctx.fillRect(0, 0, width, height);
      }
      return;
    }

    // Render-only interpolation removes fixed-step judder on displays whose
    // refresh rate is not an exact multiple of 60 Hz. Simulation values are
    // restored immediately after drawing, so movement/collision/save state stay
    // canonical. Snap instead of interpolating across teleports/map changes.
    const simulationPlayer = { x: player.x, y: player.y };
    const simulationCamera = { x: camera.x, y: camera.y, zoom: camera.zoom };
    const interpolationDelta = Math.hypot(
      simulationPlayer.x - renderPreviousPlayer.x,
      simulationPlayer.y - renderPreviousPlayer.y,
    );
    const canInterpolateExploration = mode === "playing"
      && renderPreviousMapId === currentMapId
      && interpolationDelta <= 96;

    if (canInterpolateExploration) {
      const alpha = Core.clamp(renderInterpolationAlpha, 0, 1);
      player.x = Core.lerp(renderPreviousPlayer.x, simulationPlayer.x, alpha);
      player.y = Core.lerp(renderPreviousPlayer.y, simulationPlayer.y, alpha);
      camera.x = Core.lerp(renderPreviousCamera.x, simulationCamera.x, alpha);
      camera.y = Core.lerp(renderPreviousCamera.y, simulationCamera.y, alpha);
      camera.zoom = Core.lerp(renderPreviousCamera.zoom, simulationCamera.zoom, alpha);
    }

    try {
      // The camera is clamped inside the authored map. The black clear is only
      // a safety reset; normal exploration must never reveal it at an edge.
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      const shake = reducedMotion ? 0 : screenShake;
      const rawShakeX = (Math.random() - .5) * shake;
      const rawShakeY = (Math.random() - .5) * shake;
      const clampedShake = clampExploreShake(rawShakeX, rawShakeY);
      const shakeX = clampedShake.x;
      const shakeY = clampedShake.y;
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
    } finally {
      player.x = simulationPlayer.x;
      player.y = simulationPlayer.y;
      camera.x = simulationCamera.x;
      camera.y = simulationCamera.y;
      camera.zoom = simulationCamera.zoom;
    }
  }

  function setBattleView(zoom, offsetX = battleView.offsetX, offsetY = battleView.offsetY) {
    const nextZoom = Core.clamp(Number(zoom) || 1, BATTLE_VIEW_ZOOM_MIN, BATTLE_VIEW_ZOOM_MAX);
    const extra = Math.max(0, nextZoom - 1);
    const maxX = width * (.16 + extra * .5);
    const maxY = height * (.14 + extra * .5);
    battleView = {
      zoom: nextZoom,
      offsetX: Core.clamp(Number(offsetX) || 0, -maxX, maxX),
      offsetY: Core.clamp(Number(offsetY) || 0, -maxY, maxY),
    };
  }

  function applyBattleViewToLayout(layout) {
    if (!layout) return layout;
    const zoom = battleView.zoom || 1;
    const centreX = width / 2;
    const centreY = height / 2;
    const projectX = (value) => centreX + (value - centreX) * zoom + battleView.offsetX;
    const projectY = (value) => centreY + (value - centreY) * zoom + battleView.offsetY;
    return {
      ...layout,
      cell: layout.cell * zoom,
      x: projectX(layout.x),
      y: projectY(layout.y),
      width: layout.width * zoom,
      height: layout.height * zoom,
      originX: projectX(layout.originX),
      originY: projectY(layout.originY),
      stepX: { x: layout.stepX.x * zoom, y: layout.stepX.y * zoom },
      stepY: { x: layout.stepY.x * zoom, y: layout.stepY.y * zoom },
      elevationStep: layout.elevationStep * zoom,
      baseThickness: layout.baseThickness * zoom,
      actorCell: layout.actorCell * zoom,
      viewZoom: zoom,
    };
  }

  function battleLayout() {
    const gridWidth = battle?.grid?.width || DEFAULT_BATTLE_WIDTH;
    const gridHeight = battle?.grid?.height || DEFAULT_BATTLE_HEIGHT;
    const top = width <= 530 ? 148 : Math.round(Core.clamp(height * .115, 96, 132));
    // V10 gives the board a little more breathing room per tile without
    // scaling the actors. The command dock is an overlay, so desktop can use
    // more of the lower viewport while remaining responsively clamped.
    const reservedBottom = width <= 530 ? 270 : width <= 1120 ? 170 : 96;
    const legacyReservedBottom = width <= 530 ? 285 : width <= 1120 ? 190 : 132;
    const availableHeight = Math.max(238, height - top - reservedBottom);
    const legacyAvailableHeight = Math.max(238, height - top - legacyReservedBottom);
    const projection = battle?.battlefield?.projection || null;
    if (!projection) {
      const cell = Math.floor(Core.clamp(Math.min((width - 34) / gridWidth, availableHeight / gridHeight), 30, 72));
      const boardWidth = cell * gridWidth;
      const boardHeight = cell * gridHeight;
      const x = Math.round((width - boardWidth) / 2);
      const y = Math.round(top + Math.max(0, (availableHeight - boardHeight) / 2));
      return applyBattleViewToLayout({
        cell,
        x,
        y,
        width: boardWidth,
        height: boardHeight,
        originX: x,
        originY: y,
        stepX: { x: cell, y: 0 },
        stepY: { x: 0, y: cell },
        elevationStep: cell * .18,
        baseThickness: cell * .12,
        actorCell: cell,
        projected: false,
      });
    }

    const rawXAxis = projection.xAxis || { x: .78, y: -.36 };
    const rawYAxis = projection.yAxis || { x: .78, y: .36 };
    // A logical battle tile is always 1×1.  Preserve the authored view angles
    // but normalize both projected axes to the same screen-space length so an
    // oblique board reads as equal-sided tactical cells rather than stretched
    // rectangles.
    const xLength = Math.hypot(Number(rawXAxis.x) || 0, Number(rawXAxis.y) || 0) || 1;
    const yLength = Math.hypot(Number(rawYAxis.x) || 0, Number(rawYAxis.y) || 0) || 1;
    const projectedAxisLength = (xLength + yLength) * .5;
    const xAxis = { x: (Number(rawXAxis.x) || 0) / xLength * projectedAxisLength, y: (Number(rawXAxis.y) || 0) / xLength * projectedAxisLength };
    const yAxis = { x: (Number(rawYAxis.x) || 0) / yLength * projectedAxisLength, y: (Number(rawYAxis.y) || 0) / yLength * projectedAxisLength };
    const elevationRatio = Math.max(.06, Number(projection.elevationStep) || .18);
    const baseThicknessRatio = Math.max(.035, Number(projection.baseThickness) || .075);
    const unitCorners = [
      { x: 0, y: 0 },
      { x: gridWidth * xAxis.x, y: gridWidth * xAxis.y },
      { x: gridHeight * yAxis.x, y: gridHeight * yAxis.y },
      { x: gridWidth * xAxis.x + gridHeight * yAxis.x, y: gridWidth * xAxis.y + gridHeight * yAxis.y },
    ];
    const minX = Math.min(...unitCorners.map((point) => point.x));
    const maxX = Math.max(...unitCorners.map((point) => point.x));
    const minY = Math.min(...unitCorners.map((point) => point.y));
    const maxY = Math.max(...unitCorners.map((point) => point.y));
    const maxElevation = Math.max(0, ...Object.values(battle?.battlefield?.heightMap || {}).map((value) => Number(value) || 0));
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const verticalUnits = spanY + maxElevation * elevationRatio + baseThicknessRatio;
    const cell = Math.floor(Core.clamp(Math.min((width - 24) / spanX, availableHeight / verticalUnits), 30, 92));
    // Actor artwork keeps the previous V9 physical size even though the tile
    // surface gets a few extra pixels. This avoids making hero/monsters bigger.
    const actorCell = Math.floor(Core.clamp(Math.min((width - 34) / spanX, legacyAvailableHeight / verticalUnits), 30, 86));
    const boardWidth = spanX * cell;
    const boardHeight = verticalUnits * cell;
    const x = Math.round((width - boardWidth) / 2);
    const verticalSlack = Math.max(0, availableHeight - boardHeight);
    const y = Math.round(top + verticalSlack * .66);
    const elevationStep = cell * elevationRatio;
    const originX = x - minX * cell;
    // Reserve room above the flat board for the tallest elevated top face.
    const originY = y + maxElevation * elevationStep - minY * cell;
    return applyBattleViewToLayout({
      cell,
      x,
      y,
      width: boardWidth,
      height: boardHeight,
      originX,
      originY,
      stepX: { x: xAxis.x * cell, y: xAxis.y * cell },
      stepY: { x: yAxis.x * cell, y: yAxis.y * cell },
      elevationStep,
      baseThickness: cell * baseThicknessRatio,
      actorCell,
      projected: true,
    });
  }

  function battleProjectCorner(gridX, gridY, layout = battleLayout(), elevation = 0) {
    return {
      x: layout.originX + gridX * layout.stepX.x + gridY * layout.stepY.x,
      y: layout.originY + gridX * layout.stepX.y + gridY * layout.stepY.y - elevation * layout.elevationStep,
    };
  }

  function battleRenderHeight(cell) {
    if (!cell) return 0;
    const x = Number(cell.x) || 0;
    const y = Number(cell.y) || 0;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min((battle?.grid?.width ?? (x0 + 1)) - 1, Math.ceil(x));
    const y1 = Math.min((battle?.grid?.height ?? (y0 + 1)) - 1, Math.ceil(y));
    const tx = Core.clamp(x - x0, 0, 1);
    const ty = Core.clamp(y - y0, 0, 1);
    const h00 = battleCellHeight({ x: x0, y: y0 });
    const h10 = battleCellHeight({ x: x1, y: y0 });
    const h01 = battleCellHeight({ x: x0, y: y1 });
    const h11 = battleCellHeight({ x: x1, y: y1 });
    const upper = Core.lerp(h00, h10, tx);
    const lower = Core.lerp(h01, h11, tx);
    return Core.lerp(upper, lower, ty);
  }

  function battleCellCorners(cell, layout = battleLayout(), elevation = battleCellHeight(cell)) {
    const x = Number(cell?.x) || 0;
    const y = Number(cell?.y) || 0;
    return [
      battleProjectCorner(x, y, layout, elevation),
      battleProjectCorner(x + 1, y, layout, elevation),
      battleProjectCorner(x + 1, y + 1, layout, elevation),
      battleProjectCorner(x, y + 1, layout, elevation),
    ];
  }

  function battleCellCentre(cell, layout = battleLayout()) {
    const elevation = battleRenderHeight(cell);
    return battleProjectCorner((Number(cell?.x) || 0) + .5, (Number(cell?.y) || 0) + .5, layout, elevation);
  }

  function battleTracePolygon(points) {
    if (!points?.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x, points[index].y);
    ctx.closePath();
  }

  function battleInsetPolygon(points, amount = .84) {
    const centre = points.reduce((result, point) => ({ x: result.x + point.x / points.length, y: result.y + point.y / points.length }), { x: 0, y: 0 });
    return points.map((point) => ({
      x: centre.x + (point.x - centre.x) * amount,
      y: centre.y + (point.y - centre.y) * amount,
    }));
  }

  function battlePointInPolygon(x, y, points) {
    let inside = false;
    for (let first = 0, second = points.length - 1; first < points.length; second = first++) {
      const a = points[first];
      const b = points[second];
      const intersects = ((a.y > y) !== (b.y > y))
        && x < (b.x - a.x) * (y - a.y) / ((b.y - a.y) || 1e-9) + a.x;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function battleFacingDisplayLabel(facing, layout = battleLayout()) {
    if (layout.projected) return ({ up: "左上", right: "右上", down: "右下", left: "左下" })[facing] || "右下";
    return ({ up: "上", right: "右", down: "下", left: "左" })[facing] || "下";
  }

  function battleFacingScreenVector(facing, layout = battleLayout()) {
    const vector = Tactics.facingVector(facing);
    const x = vector.x * layout.stepX.x + vector.y * layout.stepY.x;
    const y = vector.x * layout.stepX.y + vector.y * layout.stepY.y;
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  function battleCellPaintOrder(layout = battleLayout()) {
    const cells = [];
    for (let y = 0; y < battle.grid.height; y += 1) {
      for (let x = 0; x < battle.grid.width; x += 1) cells.push({ x, y });
    }
    return cells.sort((a, b) => {
      const first = battleCellCentre(a, layout);
      const second = battleCellCentre(b, layout);
      return first.y - second.y || first.x - second.x;
    });
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

  function battleTerrainCell(cell) {
    if (!cell) return null;
    const key = Tactics.cellKey({ x: Math.round(Number(cell.x) || 0), y: Math.round(Number(cell.y) || 0) });
    return battle?.battlefield?.terrainCells?.[key] || battle?.grid?.terrainCells?.[key] || null;
  }

  function battleDrawPolygon(points, fillStyle = null, strokeStyle = null, lineWidth = 1) {
    if (!points?.length) return;
    ctx.save();
    battleTracePolygon(points);
    if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill(); }
    if (strokeStyle) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth; ctx.stroke(); }
    ctx.restore();
  }

  function battleCellSideFaces(cell, layout) {
    if (!layout.projected) return;
    const heightValue = battleCellHeight(cell);
    const top = battleCellCorners(cell, layout, heightValue);
    const westNeighbour = cell.x > 0 ? battleCellHeight({ x: cell.x - 1, y: cell.y }) : null;
    const southNeighbour = cell.y < battle.grid.height - 1 ? battleCellHeight({ x: cell.x, y: cell.y + 1 }) : null;
    const faces = [];
    const addFace = (a, b, neighbourHeight, outside, shade) => {
      const exposedLevels = outside ? heightValue : Math.max(0, heightValue - neighbourHeight);
      const depth = exposedLevels * layout.elevationStep + (outside ? layout.baseThickness : 0);
      if (depth <= .5) return;
      faces.push({ points: [a, b, { x: b.x, y: b.y + depth }, { x: a.x, y: a.y + depth }], depth, shade, outside });
    };
    // Only faces visible from the lower-left camera side are drawn.  Flat
    // Level-0 cells share one continuous top plane; side walls appear solely
    // around the board perimeter and genuine elevation changes.
    addFace(top[0], top[3], westNeighbour, cell.x === 0, "west");
    addFace(top[3], top[2], southNeighbour, cell.y === battle.grid.height - 1, "south");
    for (const face of faces) {
      const minY = Math.min(...face.points.map((point) => point.y));
      const maxY = Math.max(...face.points.map((point) => point.y));
      const earth = ctx.createLinearGradient(0, minY, 0, maxY || minY + 1);
      earth.addColorStop(0, face.outside ? "#806241" : "#765235");
      earth.addColorStop(.5, face.shade === "west" ? "#62462f" : "#59402b");
      earth.addColorStop(1, "#3d2c20");
      battleDrawPolygon(face.points, earth, "rgba(38,27,19,.58)", Math.max(1, layout.cell * .012));

      ctx.save();
      battleTracePolygon(face.points);
      ctx.clip();
      ctx.strokeStyle = "rgba(221,183,126,.11)";
      ctx.lineWidth = Math.max(1, layout.cell * .009);
      for (const ratio of [.34, .68]) {
        const y = minY + (maxY - minY) * ratio;
        ctx.beginPath();
        ctx.moveTo(Math.min(...face.points.map((point) => point.x)) - layout.cell, y);
        ctx.lineTo(Math.max(...face.points.map((point) => point.x)) + layout.cell, y + layout.cell * .025);
        ctx.stroke();
      }
      ctx.restore();

      const highlight = [face.points[0], face.points[1],
        { x: face.points[1].x, y: face.points[1].y + Math.min(2.5, layout.cell * .025) },
        { x: face.points[0].x, y: face.points[0].y + Math.min(2.5, layout.cell * .025) }];
      battleDrawPolygon(highlight, "rgba(236,203,151,.16)");
    }
  }

  function drawMountainBoardFrame(layout) {
    const flat = [
      battleProjectCorner(0, 0, layout, 0),
      battleProjectCorner(battle.grid.width, 0, layout, 0),
      battleProjectCorner(battle.grid.width, battle.grid.height, layout, 0),
      battleProjectCorner(0, battle.grid.height, layout, 0),
    ];
    ctx.save();
    ctx.shadowColor = "rgba(18,15,10,.42)";
    ctx.shadowBlur = Math.max(14, layout.cell * .25);
    ctx.shadowOffsetY = Math.max(5, layout.cell * .11);
    battleTracePolygon(flat);
    ctx.fillStyle = "rgba(55,43,29,.15)";
    ctx.fill();
    ctx.restore();
  }

  function drawBattleCellTop(cell, layout, mountainBattle, blocked) {
    const heightValue = battleCellHeight(cell);
    const corners = battleCellCorners(cell, layout, heightValue);
    ctx.save();
    battleTracePolygon(corners);
    ctx.clip();
    if (mountainBattle) {
      ctx.fillStyle = "#86613b";
      const boundsX = corners.map((point) => point.x);
      const boundsY = corners.map((point) => point.y);
      ctx.fillRect(Math.min(...boundsX) - 2, Math.min(...boundsY) - 2, Math.max(...boundsX) - Math.min(...boundsX) + 4, Math.max(...boundsY) - Math.min(...boundsY) + 4);
      const projected = Art.drawBattleGroundProjected?.(ctx, {
        theme: "mountain",
        originX: layout.originX,
        originY: layout.originY - heightValue * layout.elevationStep,
        stepX: layout.stepX,
        stepY: layout.stepY,
        logicalWidth: battle.grid.width,
        logicalHeight: battle.grid.height,
        alpha: .92,
      });
      if (!projected) {
        const centre = battleCellCentre(cell, layout);
        const radius = layout.cell * .75;
        const ground = ctx.createRadialGradient(centre.x, centre.y, 1, centre.x, centre.y, radius);
        ground.addColorStop(0, "#9a7447");
        ground.addColorStop(1, "#735333");
        ctx.fillStyle = ground;
        ctx.fillRect(centre.x - radius, centre.y - radius, radius * 2, radius * 2);
      }
    } else {
      ctx.fillStyle = blocked
        ? "rgba(10,15,29,.88)"
        : (cell.x + cell.y) % 2 ? "rgba(69,91,94,.58)" : "rgba(56,78,84,.65)";
      const xs = corners.map((point) => point.x);
      const ys = corners.map((point) => point.y);
      ctx.fillRect(Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) - Math.min(...xs) + 2, Math.max(...ys) - Math.min(...ys) + 2);
    }
    if (blocked) {
      ctx.fillStyle = "rgba(27,20,14,.12)";
      const xs = corners.map((point) => point.x);
      const ys = corners.map((point) => point.y);
      ctx.fillRect(Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) - Math.min(...xs) + 2, Math.max(...ys) - Math.min(...ys) + 2);
    }
    ctx.restore();
    // Do not outline every logical cell. Movement/skill overlays supply the
    // only visible grid information, keeping the idle terrain visually whole.
  }

  function drawBattleCellOverlay(cell, layout, fillStyle, strokeStyle = null, lineWidth = 1.5, inset = .82) {
    const corners = battleInsetPolygon(battleCellCorners(cell, layout, battleCellHeight(cell)), inset);
    battleDrawPolygon(corners, fillStyle, strokeStyle, lineWidth);
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
    // If the authored battle background is unavailable, leave the background
    // empty instead of reviving the old generated Canvas placeholder.
    const atmosphere = ctx.createLinearGradient(0, 0, 0, height);
    atmosphere.addColorStop(0, "rgba(15,28,31,.18)");
    atmosphere.addColorStop(.48, "rgba(49,44,34,.06)");
    atmosphere.addColorStop(1, "rgba(8,13,14,.54)");
    ctx.fillStyle = atmosphere;
    ctx.fillRect(0, 0, width, height);
    drawMountainBoardFrame(layout);
  }

  function drawBattle() {
    if (!battle) return;
    const layout = battleLayout();
    const bossFight = battle.source.boss;
    const mountainBattle = battle.battlefield?.theme === "mountain";
    if (mountainBattle) drawMountainBattleBackdrop(layout);
    else {
      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, bossFight ? "#241a37" : "#142c38");
      background.addColorStop(.58, bossFight ? "#16213a" : "#183d40");
      background.addColorStop(1, "#08101f");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      // Preserve the established dungeon / boss presentation.  The oblique
      // height renderer is opt-in per battlefield and must not silently restyle
      // legacy flat encounters.
      ctx.save();
      ctx.globalAlpha = .16;
      for (let index = 0; index < 8; index += 1) {
        const fogX = ((index * 233 + elapsed * (8 + index)) % (width + 240)) - 120;
        const fogY = 80 + ((index * 97) % Math.max(100, height - 170));
        const fog = ctx.createRadialGradient(fogX, fogY, 0, fogX, fogY, 90 + index * 9);
        fog.addColorStop(0, bossFight ? "rgba(174,145,255,.3)" : "rgba(82,220,203,.22)");
        fog.addColorStop(1, "rgba(20,30,50,0)");
        ctx.fillStyle = fog;
        ctx.fillRect(fogX - 140, fogY - 110, 280, 220);
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
    const attackPathPreview = ["linear", "arc"].includes(selectedSkill?.deliveryMode)
      && battle.phase === "planning_action"
      && skillTargetValidation(selectedSkill, battle.cursor).ok
      ? Tactics.facingOrthogonalPriority(battle.hero.cell, battle.cursor, battle.hero.facing)
      : [];

    const cells = battleCellPaintOrder(layout);
    // Terrain is a projected height field. Paint back-to-front so an elevated
    // tile's exposed face and top keep the same depth relationship as actors.
    // Gameplay coordinates stay pure 2D grid coordinates.
    for (const cell of cells) {
      const key = Tactics.cellKey(cell);
      const blocked = battle.grid.blocked.has(key);
      battleCellSideFaces(cell, layout);
      drawBattleCellTop(cell, layout, mountainBattle, blocked);
      if (!blocked && skillRange.has(key) && battle.phase === "planning_action") {
        drawBattleCellOverlay(cell, layout, "rgba(255,218,117,.25)", "rgba(255,225,143,.88)", 1.5, .78);
      }
      if (!blocked && areaPreview.has(key)) {
        drawBattleCellOverlay(cell, layout,
          selectedSkill?.star === 3 ? "rgba(255,157,211,.24)" : selectedSkill?.star === 2 ? "rgba(169,201,255,.22)" : "rgba(255,200,87,.19)",
          null, 1, .74);
      }
      if (!blocked && selectable.has(key) && battle.phase === "planning_move") {
        drawBattleCellOverlay(cell, layout, "rgba(82,220,203,.18)", "rgba(82,220,203,.78)", 1.5, .76);
      }
      if (!blocked && attackableEnemies.has(key) && battle.phase === "planning_action") {
        drawBattleCellOverlay(cell, layout, `rgba(255,91,91,${.35 + Math.sin(elapsed * 5) * .04})`, "rgba(255,118,118,.98)", 2.5, .79);
      }
    }

    if (attackPathPreview.length) {
      ctx.save();
      ctx.strokeStyle = selectedSkill?.deliveryMode === "arc" ? "rgba(169,201,255,.9)" : "rgba(255,157,211,.82)";
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

    // Obstacles and actors share one painter-sorted layer.  A tall tree can
    // therefore occlude a unit standing behind it without turning sprites 3D.
    const renderables = [];
    for (const cell of cells) {
      if (!battle.grid.blocked.has(Tactics.cellKey(cell))) continue;
      const point = battleCellCentre(cell, layout);
      renderables.push({ kind: "obstacle", cell, depth: point.y + layout.cell * .22 });
    }
    for (const unit of battleUnits().filter((actor) => actor.alive)) {
      const renderCell = unit.renderCell || unit.cell;
      const point = battleCellCentre(renderCell, layout);
      renderables.push({ kind: "unit", unit, depth: point.y + layout.cell * .26 });
    }
    renderables.sort((a, b) => a.depth - b.depth || (a.kind === "obstacle" ? -1 : 1));
    for (const item of renderables) {
      if (item.kind === "obstacle") drawBattleObstacle(item.cell, layout, mountainBattle);
      else {
        if (mountainBattle) drawMountainUnitShadow(item.unit, layout);
        drawBattleUnit(item.unit, layout);
      }
    }

    if (battle.cursor && ["planning_move", "planning_action"].includes(battle.phase)) {
      const cursorCorners = battleInsetPolygon(battleCellCorners(battle.cursor, layout, battleCellHeight(battle.cursor)), .82);
      battleDrawPolygon(cursorCorners, null, "#f5e9ca", 2.5);
      ctx.save();
      ctx.fillStyle = "#ffc857";
      for (const point of cursorCorners) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, Math.max(2, layout.cell * .028), 0, Core.TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    drawBattleEffects(layout);

    const boardCentre = battleProjectCorner(battle.grid.width / 2, battle.grid.height / 2, layout, 0);
    const vignette = ctx.createRadialGradient(boardCentre.x, boardCentre.y, layout.cell * 1.2, boardCentre.x, boardCentre.y, Math.max(width, height) * .7);
    vignette.addColorStop(0, "rgba(5,8,17,0)");
    vignette.addColorStop(1, "rgba(3,6,14,.62)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function drawBattleObstacle(cell, layout, mountainBattle = false) {
    const point = battleCellCentre(cell, layout);
    const size = layout.cell;
    const terrain = battleTerrainCell(cell);
    if (mountainBattle && terrain?.kind === "tree") {
      const baselineY = point.y + size * .29;
      // The supplied tree art already has its own contact detail. Do not add a
      // separate painted floor shadow; it makes the prop look like it is
      // hovering above the battlefield.
      let drawn = false;
      if (battleMountainTreeImage?.complete && battleMountainTreeImage.naturalWidth > 0) {
        const drawWidth = size * 1.92;
        const drawHeight = drawWidth * (battleMountainTreeImage.naturalHeight / battleMountainTreeImage.naturalWidth);
        ctx.drawImage(
          battleMountainTreeImage,
          point.x - drawWidth * .5,
          baselineY - drawHeight * .91,
          drawWidth,
          drawHeight,
        );
        drawn = true;
      }
      // If the supplied obstacle bitmap is unavailable, leave this visual
      // empty. Do not revive the retired generated/static tree fallback.
      return;
    }
    if (mountainBattle && terrain?.kind === "scrub") {
      const baselineY = point.y + size * .29;
      // Low cover randomly alternates between the two supplied rocks and two
      // supplied plants. The battle token changes the choice between encounters
      // while keeping it stable for the lifetime of the current battle.
      const seed = (battleVisualSeed(cell) ^ Math.imul((Number(battle?.token) || 0) + 1, 2654435761)) >>> 0;
      const variant = battleMountainLowCoverArt[seed % battleMountainLowCoverArt.length];
      const image = variant?.image;
      let drawn = false;
      if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
        const drawWidth = size * variant.widthScale;
        // Derive height from the source bitmap. Never set width/height
        // independently, otherwise the artwork would be squashed or stretched.
        const drawHeight = drawWidth * (image.naturalHeight / image.naturalWidth);
        ctx.drawImage(
          image,
          point.x - drawWidth * .5,
          baselineY - drawHeight * variant.anchorY,
          drawWidth,
          drawHeight,
        );
        drawn = true;
      }
      // Missing supplied art stays empty; do not revive legacy generated cover.
      return;
    }
    if (mountainBattle) {
      const seed = battleVisualSeed(cell);
      ctx.save();
      ctx.fillStyle = "rgba(15,16,13,.52)";
      ctx.beginPath();
      ctx.ellipse(point.x + size * .035, point.y + size * .34, size * (.34 + (seed % 3) * .035), size * .105, 0, 0, Core.TAU);
      ctx.fill();
      ctx.restore();
      drawMountainLooseStones(point.x, point.y + size * .31, size, seed);
      const rockScale = [.9, 1.04, 1.16, .98][seed % 4];
      const drawn = Art.drawEnvironmentSprite(ctx, {
        sprite: "rock",
        x: point.x,
        y: point.y + size * .39,
        width: size * rockScale,
        height: size * rockScale,
        alpha: .98,
      });
      if (drawn) return;
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

  function battleUnitRenderFacing(unit) {
    // Planning is a non-destructive preview.  The actor keeps its committed
    // facing until movement resolution actually plays the queued turns/moves.
    return unit?.facing || "down";
  }

  function drawMountainUnitShadow(unit, layout) {
    const point = battleCellCentre(unit.renderCell || unit.cell, layout);
    const size = layout.actorCell || layout.cell;
    const facing = battleFacingScreenVector(battleUnitRenderFacing(unit), layout);
    const shadowX = point.x - facing.x * size * .035 + size * .03;
    const shadowY = point.y + size * (layout.projected ? .22 : .31) - facing.y * size * .02;
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
    ctx.ellipse(point.x, point.y + size * (layout.projected ? .205 : .285), size * .13, size * .04, 0, 0, Core.TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawBattleUnit(unit, layout) {
    const point = battleCellCentre(unit.renderCell || unit.cell, layout);
    const actorCell = layout.actorCell || layout.cell;
    const heroScale = actorCell / 118;
    const monsterScale = actorCell / 47;
    const baseline = point.y + actorCell * (layout.projected ? .2 : .29);
    const acting = battle.phase === "resolving_action"
      && (battle.actingUnitId === unit.id || battle.actingUnitIds?.includes(unit.id))
      && (unit.side !== "ally" || battle.actionResolution?.heroAction?.type === "skill");
    const renderFacing = battleUnitRenderFacing(unit);
    const baseLocomotion = unit.locomotion || Locomotion.create(renderFacing);
    const locomotion = baseLocomotion.facing === renderFacing
      ? baseLocomotion
      : { ...baseLocomotion, state: "idle", facing: renderFacing, time: 0 };
    const hurt = unit.hitFlash > 0;
    const stopped = !hurt && (unit.stopFlash || 0) > 0;
    const actionProgress = battle.phase === "resolving_action"
      ? Core.clamp((battle.actionResolution?.actionElapsed ?? battle.actionResolution?.elapsed ?? 0) / Math.max(.01, BATTLE_ACTION_WINDUP_SECONDS + BATTLE_ACTION_LINGER_SECONDS), 0, 1)
      : stopped
        ? 1 - Core.clamp((unit.stopFlash || 0) / .48, 0, 1)
        : 0;
    const visualState = hurt ? "hurt" : stopped ? "stop" : acting ? "attack" : locomotion.state;
    let artBox = null;
    if (unit.side === "ally") {
      artBox = Art.drawCharacter(ctx, {
        x: point.x,
        y: baseline,
        scale: heroScale,
        actor: "player",
        classId: playerClassId,
        facing: renderFacing,
        battleDiagonal: layout.projected,
        state: visualState,
        locomotion,
        phase: elapsed,
        progress: actionProgress,
        expression: hurt ? "hurt" : acting ? "determined" : "happy",
        // The old selected ring and AP orbit were persistent visual noise; tile
        // overlays/cursor already communicate tactical selection.
        selected: false,
      });
    } else {
      artBox = Art.drawEnemy(ctx, {
        x: point.x,
        y: baseline,
        scale: monsterScale * (unit.boss ? .98 : .92),
        type: unit.type,
        facing: renderFacing,
        phase: elapsed,
        state: visualState,
        locomotion,
        progress: actionProgress,
        selected: false,
      });
    }

    // The four movement controls already communicate the player's intended
    // direction, so the extra cyan facing triangle beside the hero is
    // redundant. Keep the enemy facing marker because it still conveys useful
    // tactical information.
    if (unit.side !== "ally") {
      const facing = battleFacingScreenVector(renderFacing, layout);
      const perpendicular = { x: -facing.y, y: facing.x };
      const arrow = {
        x: point.x + facing.x * layout.cell * .32,
        y: point.y + facing.y * layout.cell * .32,
      };
      const arrowSize = Math.max(3.5, layout.cell * .075);
      ctx.save();
      ctx.fillStyle = "#ff7199";
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
    }

    const barWidth = actorCell * (unit.boss ? .76 : .56);
    const barY = point.y + actorCell * (layout.projected ? .31 : .38);
    const barHeight = Math.max(5, actorCell * .085);
    ctx.fillStyle = "rgba(5,8,18,.86)";
    ctx.fillRect(point.x - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);
    ctx.fillStyle = unit.side === "ally" ? "#52dccb" : unit.boss ? "#ff6b91" : "#ff6b6b";
    ctx.fillRect(point.x - barWidth / 2, barY, barWidth * Core.clamp(unit.hp / unit.maxHp, 0, 1), barHeight);

    // Player art has a stable authored name anchor. Monster locomotion frames
    // have different opaque bounds, so using their per-frame visual anchor makes
    // the name drift/fly while walking. Keep enemy labels tied to the interpolated
    // battle cell instead; they still follow movement without frame-to-frame wobble.
    const fallbackNameY = point.y - actorCell * (unit.boss ? .76 : unit.side === "ally" ? .68 : .64);
    const useArtNameAnchor = unit.side === "ally";
    const nameX = useArtNameAnchor && Number.isFinite(artBox?.nameAnchorX) ? artBox.nameAnchorX : point.x;
    const nameAnchorY = useArtNameAnchor && Number.isFinite(artBox?.nameAnchorY) ? artBox.nameAnchorY : fallbackNameY;
    const nameY = nameAnchorY - Math.max(2, actorCell * .025);
    ctx.font = `900 ${Math.max(14, actorCell * .19)}px ui-sans-serif, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.strokeStyle = "rgba(3,6,14,.96)";
    ctx.lineWidth = Math.max(3, actorCell * .055);
    ctx.strokeText(unit.name, nameX, nameY);
    ctx.fillStyle = "#fff4d0";
    ctx.fillText(unit.name, nameX, nameY);
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
    const x = (event.clientX - rect.left) * (width / Math.max(1, rect.width));
    const y = (event.clientY - rect.top) * (height / Math.max(1, rect.height));
    // A projected/elevated board is not invertible with floor(x/cell).  There
    // are only a few dozen battle cells, so exact polygon hit-testing is both
    // cheap and robust.  Test front-most cells first when projected faces overlap.
    const cells = battleCellPaintOrder(layout).reverse();
    for (const cell of cells) {
      if (battlePointInPolygon(x, y, battleCellCorners(cell, layout, battleCellHeight(cell)))) return cell;
    }
    return null;
  }

  function handleBattlePointer(event) {
    if (mode !== "battle" || !battle || !["planning_move", "planning_action"].includes(battle.phase)) return;
    if (event.button === 2) {
      event.preventDefault();
      if (battle.phase === "planning_action") cancelBattleTargetSelection();
      return;
    }
    const cell = battleCellFromPointer(event);
    if (!cell) return;
    event.preventDefault();
    confirmBattleCell(cell);
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const screenX = (clientX - rect.left) * (width / Math.max(1, rect.width));
    const screenY = (clientY - rect.top) * (height / Math.max(1, rect.height));
    const worldPoint = screenToWorldPoint(screenX, screenY);
    return {
      x: Core.clamp(worldPoint.x, player.radius, world.pixelWidth - player.radius),
      y: Core.clamp(worldPoint.y, player.radius, world.pixelHeight - player.radius),
      screenX,
      screenY,
    };
  }

  function clickedExploreEntity(screenX, screenY) {
    if (world.navigation?.authoritative && typeof world.navigation.interactionAtWorldPoint === "function") {
      const authoredPoint = screenToWorldPoint(screenX, screenY);
      const authoredInteractionId = world.navigation.interactionAtWorldPoint(authoredPoint);
      if (authoredInteractionId) {
        const authoredInteraction = [...world.npcs, ...world.boards].find((entity) => entity.id === authoredInteractionId);
        if (authoredInteraction) return authoredInteraction;
      }
      if (typeof world.navigation.interactionHitTest === "function" && world.navigation.interactionHitTest("npc", authoredPoint)) {
        const paddedInteraction = [...world.npcs, ...world.boards].find((entity) => authoritativeInteractionRegion(entity) === "npc");
        if (paddedInteraction) return paddedInteraction;
      }
    }
    const candidates = [
      ...world.npcs,
      ...world.boards,
      ...world.signs,
      ...(world.shrine ? [world.shrine] : []),
      ...world.portals,
      ...enemies.filter((enemy) => enemy.alive),
    ];
    const anchored = candidates.map((entity) => {
      const point = worldToScreen(entity);
      const radius = (entity.kind === "npc" ? (Number(entity.interactionHitRadius) || 38) : entity.type ? 42 : entity.kind === "questBoard" ? 46 : 34) * camera.zoom;
      return { entity, distance: Math.hypot(screenX - point.x, screenY - point.y), radius };
    }).filter((item) => item.distance <= item.radius).sort((left, right) => left.distance - right.distance);
    if (anchored.length) return anchored[0].entity;
    return null;
  }

  function authoritativeInteractionApproachPoint(entity) {
    const navigation = world.navigation;
    const region = authoritativeInteractionRegion(entity);
    if (!region || !navigation?.authoritative || typeof navigation.nearestPointInRegion !== "function") return null;
    const regionPoint = navigation.nearestPointInRegion(region, player);
    if (!regionPoint) return null;
    const reach = Math.max(24, interactionReachForEntity(entity) - 8);
    const baseAngle = Math.atan2(player.y - regionPoint.y, player.x - regionPoint.x);
    const angleOffsets = [0, Math.PI / 12, -Math.PI / 12, Math.PI / 6, -Math.PI / 6, Math.PI / 4, -Math.PI / 4, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2, Math.PI];
    const radii = [12, 18, 26, 36, 50, 68, 88, 112, 136, 176, 216, 256, 296, reach].filter((value, index, array) => value <= reach && array.indexOf(value) === index);
    const navigationRadius = Number(navigation.feetRadiusPx) || 3;
    const candidates = [];
    for (const radius of radii) {
      for (const offset of angleOffsets) {
        const angle = baseAngle + offset;
        const candidate = {
          x: Core.clamp(regionPoint.x + Math.cos(angle) * radius, navigationRadius, world.pixelWidth - navigationRadius),
          y: Core.clamp(regionPoint.y + Math.sin(angle) * radius, navigationRadius, world.pixelHeight - navigationRadius),
        };
        if (isBlocked({ ...candidate, radius: navigationRadius })) continue;
        if (typeof navigation.distanceToRegion === "function" && navigation.distanceToRegion(region, candidate) > reach) continue;
        candidates.push({ candidate, playerDistance: Core.distance(player, candidate), regionDistance: Core.distance(regionPoint, candidate) });
      }
    }
    candidates.sort((a, b) => a.playerDistance - b.playerDistance || a.regionDistance - b.regionDistance);
    return candidates[0]?.candidate || null;
  }

  function setExploreClickTarget(target, entity = null) {
    explorePortalIntentId = null;
    const distance = entity ? interactionDistanceToEntity(entity) : Infinity;
    const interactionRange = entity && !entity.type ? interactionReachForEntity(entity) : 0;
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
      if (entity.approachPoint) {
        destination = { x: entity.approachPoint.x, y: entity.approachPoint.y };
        pendingClickInteractionId = entity.id;
      } else {
        const authoredApproach = authoritativeInteractionApproachPoint(entity);
        if (authoredApproach) destination = authoredApproach;
        else {
          const away = Core.normalize({ x: player.x - entity.x, y: player.y - entity.y });
          destination = { x: entity.x + away.x * 34, y: entity.y + away.y * 34 };
        }
        pendingClickInteractionId = entity.id;
      }
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

  function updateExploreHoverPointer(event) {
    if (!canvas || mode !== "playing" || event?.pointerType === "touch") {
      exploreHoverEntityId = null;
      if (canvas) canvas.dataset.exploreCursor = "default";
      return;
    }
    const target = screenToWorld(event.clientX, event.clientY);
    const entity = clickedExploreEntity(target.screenX, target.screenY);
    exploreHoverEntityId = entity?.id || null;
    // Enemy targeting can gain its own cursor later. For now the hand is
    // reserved for world interactions such as NPCs, chests and the skill panel.
    canvas.dataset.exploreCursor = entity && !entity.type && entity.kind !== "portal" ? "interact" : "default";
  }

  function clearExploreHoverPointer() {
    exploreHoverEntityId = null;
    if (canvas) canvas.dataset.exploreCursor = "default";
  }

  function beginExplorePinch() {
    if (!usesMobileExploreControls() || activeExploreTouches.size < 2 || mode !== "playing") return false;
    const touches = [...activeExploreTouches.values()].slice(0, 2);
    const distance = Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    if (distance < 2) return false;
    clearExplorePointerGesture();
    pendingClickInteractionId = null;
    suppressExploreTouchTap = true;
    explorePinchGesture = {
      pointerIds: [touches[0].pointerId, touches[1].pointerId],
      startDistance: distance,
      startZoom: targetZoom(),
    };
    return true;
  }

  function updateExplorePinch() {
    const pinch = explorePinchGesture;
    if (!pinch || mode !== "playing") return false;
    const first = activeExploreTouches.get(pinch.pointerIds[0]);
    const second = activeExploreTouches.get(pinch.pointerIds[1]);
    if (!first || !second) return false;
    const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
    if (distance < 2 || pinch.startDistance < 2) return false;
    setMobileExploreZoom(pinch.startZoom * (distance / pinch.startDistance));
    return true;
  }

  function beginBattlePinch() {
    if (!usesMobileExploreControls() || activeBattleTouches.size < 2 || mode !== "battle") return false;
    const touches = [...activeBattleTouches.values()].slice(0, 2);
    const distance = Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    if (distance < 2) return false;
    const rect = canvas.getBoundingClientRect();
    const toCanvasPoint = (touch) => ({
      x: (touch.clientX - rect.left) * (width / Math.max(1, rect.width)),
      y: (touch.clientY - rect.top) * (height / Math.max(1, rect.height)),
    });
    const first = toCanvasPoint(touches[0]);
    const second = toCanvasPoint(touches[1]);
    const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const centre = { x: width / 2, y: height / 2 };
    const startZoom = battleView.zoom || 1;
    battlePinchGesture = {
      pointerIds: [touches[0].pointerId, touches[1].pointerId],
      startDistance: distance,
      startZoom,
      startOffsetX: battleView.offsetX,
      startOffsetY: battleView.offsetY,
      anchorBaseX: centre.x + (midpoint.x - centre.x - battleView.offsetX) / startZoom,
      anchorBaseY: centre.y + (midpoint.y - centre.y - battleView.offsetY) / startZoom,
    };
    suppressBattleTouchTap = true;
    return true;
  }

  function updateBattlePinch() {
    const pinch = battlePinchGesture;
    if (!pinch || mode !== "battle") return false;
    const firstTouch = activeBattleTouches.get(pinch.pointerIds[0]);
    const secondTouch = activeBattleTouches.get(pinch.pointerIds[1]);
    if (!firstTouch || !secondTouch) return false;
    const distance = Math.hypot(firstTouch.clientX - secondTouch.clientX, firstTouch.clientY - secondTouch.clientY);
    if (distance < 2 || pinch.startDistance < 2) return false;
    const rect = canvas.getBoundingClientRect();
    const first = {
      x: (firstTouch.clientX - rect.left) * (width / Math.max(1, rect.width)),
      y: (firstTouch.clientY - rect.top) * (height / Math.max(1, rect.height)),
    };
    const second = {
      x: (secondTouch.clientX - rect.left) * (width / Math.max(1, rect.width)),
      y: (secondTouch.clientY - rect.top) * (height / Math.max(1, rect.height)),
    };
    const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const centre = { x: width / 2, y: height / 2 };
    const nextZoom = Core.clamp(pinch.startZoom * (distance / pinch.startDistance), BATTLE_VIEW_ZOOM_MIN, BATTLE_VIEW_ZOOM_MAX);
    const offsetX = midpoint.x - centre.x - (pinch.anchorBaseX - centre.x) * nextZoom;
    const offsetY = midpoint.y - centre.y - (pinch.anchorBaseY - centre.y) * nextZoom;
    setBattleView(nextZoom, offsetX, offsetY);
    syncBattleFacingPicker();
    syncBattleCommandMenu();
    return true;
  }

  function handleCanvasPointer(event) {
    if (mode === "battle") {
      const battleTouch = event.pointerType === "touch" && usesMobileExploreControls();
      if (!battleTouch) return handleBattlePointer(event);
      event.preventDefault();
      activeBattleTouches.set(event.pointerId, { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY });
      try { canvas.setPointerCapture?.(event.pointerId); } catch (_) {}
      if (activeBattleTouches.size >= 2) beginBattlePinch();
      return;
    }
    if (mode !== "playing" || event.button > 0 || blockingGameplayOverlayOpen()) return;

    const mobileTouch = event.pointerType === "touch" && usesMobileExploreControls();
    if (mobileTouch) {
      event.preventDefault();
      activeExploreTouches.set(event.pointerId, { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY });
      try { canvas.setPointerCapture?.(event.pointerId); } catch (_) {}
      if (activeExploreTouches.size >= 2) {
        beginExplorePinch();
        return;
      }
      // Defer a one-finger tap until release so a second finger can turn the
      // gesture into pinch zoom without accidentally sending the hero walking.
      suppressExploreTouchTap = false;
    }

    // A new press exits latched mouse-follow before issuing its single target.
    clearExplorePointerGesture();
    const target = screenToWorld(event.clientX, event.clientY);
    const entity = clickedExploreEntity(target.screenX, target.screenY);
    event.preventDefault();
    if (!mobileTouch) setExploreClickTarget(entity || target, entity);
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
      if (explorePointerGesture !== gesture || mode !== "playing" || explorePinchGesture) return;
      gesture.holdActive = true;
      retargetExploreHoldGesture(gesture, true);
    }, EXPLORE_HOLD_DELAY_MS);
  }

  function handleCanvasPointerMove(event) {
    if (mode === "battle" && event.pointerType === "touch" && activeBattleTouches.has(event.pointerId)) {
      activeBattleTouches.set(event.pointerId, { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY });
      if (battlePinchGesture) {
        event.preventDefault();
        updateBattlePinch();
        return;
      }
    }
    if (event.pointerType === "touch" && activeExploreTouches.has(event.pointerId)) {
      activeExploreTouches.set(event.pointerId, { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY });
      if (explorePinchGesture) {
        event.preventDefault();
        updateExplorePinch();
        return;
      }
    }
    if (mode !== "battle") updateExploreHoverPointer(event);
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
    const battleTouch = mode === "battle" && event.pointerType === "touch" && usesMobileExploreControls();
    if (battleTouch) {
      const wasTracked = activeBattleTouches.has(event.pointerId);
      activeBattleTouches.delete(event.pointerId);
      if (battlePinchGesture || suppressBattleTouchTap) {
        event.preventDefault();
        if (activeBattleTouches.size < 2) battlePinchGesture = null;
        if (activeBattleTouches.size === 0) suppressBattleTouchTap = false;
        return;
      }
      if (wasTracked) {
        event.preventDefault();
        handleBattlePointer(event);
      }
      return;
    }

    const mobileTouch = event.pointerType === "touch" && usesMobileExploreControls();
    if (mobileTouch) {
      activeExploreTouches.delete(event.pointerId);
      if (explorePinchGesture || suppressExploreTouchTap) {
        event.preventDefault();
        clearExplorePointerGesture(event.pointerId);
        if (activeExploreTouches.size < 2) explorePinchGesture = null;
        if (activeExploreTouches.size === 0) suppressExploreTouchTap = false;
        return;
      }
    }

    const gesture = explorePointerGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gesture.clientX = event.clientX;
    gesture.clientY = event.clientY;

    // A quick touch is a normal move / interaction tap. It is intentionally
    // committed here (rather than pointerdown) so pinch recognition wins.
    if (mobileTouch && !gesture.holdActive) {
      const { clientX, clientY, pointerId } = event;
      event.preventDefault();
      clearExplorePointerGesture(pointerId);
      // Authored-map hit testing and route planning can be relatively heavy on
      // high-resolution interiors. Run that work on the next frame so the
      // browser's pointerup dispatch itself stays responsive.
      window.requestAnimationFrame(() => {
        if (mode !== "playing" || blockingGameplayOverlayOpen()) return;
        const target = screenToWorld(clientX, clientY);
        const entity = clickedExploreEntity(target.screenX, target.screenY);
        setExploreClickTarget(entity || target, entity);
      });
      return;
    }

    if (!gesture.holdActive && performance.now() - gesture.startedAt >= EXPLORE_HOLD_DELAY_MS) {
      gesture.holdActive = true;
    }
    // The hold timer / pointermove path has normally already targeted this
    // point. Do not synchronously run authored-map pathfinding again during
    // pointerup: on high-resolution interiors that duplicate route search can
    // turn a harmless release into a 100ms+ long event handler.
    if (gesture.holdActive && !gesture.lastTargetKey) {
      window.requestAnimationFrame(() => {
        if (explorePointerGesture === gesture && mode === "playing") retargetExploreHoldGesture(gesture, true);
      });
    }
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

  function cancelExploreTouchPointer(event) {
    if (event?.pointerType === "touch" && activeBattleTouches.has(event.pointerId)) {
      activeBattleTouches.delete(event.pointerId);
      if (activeBattleTouches.size < 2) battlePinchGesture = null;
      if (activeBattleTouches.size === 0) suppressBattleTouchTap = false;
      return;
    }
    if (event?.pointerType === "touch") {
      activeExploreTouches.delete(event.pointerId);
      if (activeExploreTouches.size < 2) explorePinchGesture = null;
      if (activeExploreTouches.size === 0) suppressExploreTouchTap = false;
    }
    if (!suppressExploreTouchTap) cancelExplorePointerTracking(event?.pointerId);
    else clearExplorePointerGesture(event?.pointerId);
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
    const flattenedMapArt = world.art?.flattened && Boolean(world.art?.backgroundScene);
    // A minimap is a local navigation tool, not a thumbnail of the whole map.
    // Keep the player centred, but show enough nearby roads/buildings to orient the player.
    const visibleTiles = ["world", "field"].includes(currentMapId) ? 192 : 144;
    const scale = Math.min(mapWidth, mapHeight) / (visibleTiles * world.tileSize);
    const originX = centreX - player.x * scale;
    const originY = centreY - player.y * scale;
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
      // Draw the authored flattened scene at local-navigation scale. The circle
      // clip above naturally crops it around the centred player.
      Art.drawFlattenedBackground(miniCtx, world.art.backgroundScene, {
        x: originX, y: originY, width: world.pixelWidth * scale, height: world.pixelHeight * scale, alpha: .94,
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
    if (world.shrine) {
      const point = mapPoint(world.shrine.x, world.shrine.y + 25);
      queueEnvironment("shrine", point.x, point.y, Math.max(11, 88 * scale), point.y);
    }
    for (const board of world.boards || []) {
      if (board.render === false) continue;
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

    const objective = commissionQuestInfo().target;
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

  function screenToWorldPoint(screenX, screenY) {
    return {
      x: (screenX - width * .5) / camera.zoom + camera.x,
      y: (screenY - height * .5) / camera.zoom + camera.y,
    };
  }

  function clampExploreShake(shakeX, shakeY) {
    const zoom = Math.max(.001, camera.zoom);
    const mapScreenWidth = world.pixelWidth * zoom;
    const mapScreenHeight = world.pixelHeight * zoom;
    const leftEdge = (0 - camera.x) * zoom + width * .5;
    const rightEdge = (world.pixelWidth - camera.x) * zoom + width * .5;
    const topEdge = (0 - camera.y) * zoom + height * .5;
    const bottomEdge = (world.pixelHeight - camera.y) * zoom + height * .5;
    return {
      x: mapScreenWidth <= width ? 0 : Core.clamp(shakeX, width - rightEdge, -leftEdge),
      y: mapScreenHeight <= height ? 0 : Core.clamp(shakeY, height - bottomEdge, -topEdge),
    };
  }

  function flattenedBackgroundCrop(shakeX = 0, shakeY = 0) {
    const mapWidth = Math.max(1, Number(world?.pixelWidth) || 1);
    const mapHeight = Math.max(1, Number(world?.pixelHeight) || 1);
    const zoom = Math.max(.001, camera.zoom);
    const viewportWorldWidth = width / zoom;
    const viewportWorldHeight = height / zoom;
    const sw = Math.min(mapWidth, viewportWorldWidth);
    const sh = Math.min(mapHeight, viewportWorldHeight);
    const sx = Core.clamp(camera.x - sw * .5, 0, Math.max(0, mapWidth - sw));
    const sy = Core.clamp(camera.y - sh * .5, 0, Math.max(0, mapHeight - sh));
    return {
      sx, sy, sw, sh,
      dx: (sx - camera.x) * zoom + width * .5 + shakeX,
      dy: (sy - camera.y) * zoom + height * .5 + shakeY,
      dw: sw * zoom,
      dh: sh * zoom,
      viewportWorldWidth,
      viewportWorldHeight,
    };
  }

  function inView(point, margin = 100) {
    const screen = worldToScreen(point);
    return screen.x >= -margin && screen.y >= -margin && screen.x <= width + margin && screen.y <= height + margin;
  }

  function drawTiles(shakeX, shakeY) {
    if (world.art?.flattened && world.art?.backgroundScene) {
      const crop = flattenedBackgroundCrop(shakeX, shakeY);
      Art.drawFlattenedBackground(ctx, world.art.backgroundScene, {
        sourceX: crop.sx,
        sourceY: crop.sy,
        sourceWidth: crop.sw,
        sourceHeight: crop.sh,
        x: crop.dx,
        y: crop.dy,
        width: crop.dw,
        height: crop.dh,
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
        Art.drawTerrainTile(ctx, {
          sprite: terrainSprite,
          x: Math.floor(point.x),
          y: Math.floor(point.y),
          width: Math.ceil(size),
          height: Math.ceil(size),
          flipX: noise > .5,
          flipY: ((tx + ty) & 1) === 1,
        });
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
      if (!enemy.alive || enemy.windup <= 0 || !inView(enemy, 140)) continue;
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
    if (entity.kind === "portal" && MapTransitions.transitionTypeFor(entity) === TRANSITION_TYPES.PHYSICAL_DOOR) {
      const house = world.houses?.find((candidate) => candidate.id === entity.houseId);
      // The marker belongs to the doorway's foreground plane. Draw it after
      // the facade so a large PNG cannot swallow an otherwise valid marker.
      return Math.max(entity.y + 36, house ? houseFootY(house) + 1 : entity.y + (entity.radius || 0));
    }
    if (Number.isFinite(entity.h) && !["rug"].includes(entity.kind)) return entity.y + entity.h;
    return entity.y + (entity.radius || 0);
  }

  // The clickable deck-board region stays authoritative, but Main Town no
  // longer paints a yellow hover outline over the baked artwork. A compact
  // label is anchored a few pixels above the authored interaction region.
  function drawSkillPanelLabel(prop, shakeX, shakeY) {
    if (!prop || prop.boardId !== "deck-loadout") return;
    const point = worldToScreen(prop, shakeX, shakeY);
    const scale = camera.zoom;
    const authoredHeight = Number(prop.authoredRegion?.h) || 0;
    const topY = point.y - authoredHeight * scale / 2;
    const fontSize = Core.clamp(18 * scale, 13, 19);
    const labelY = topY - Math.max(22, 26 * scale);
    const label = "✦ 面板配置 ✦";
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${fontSize}px system-ui, -apple-system, "Noto Sans TC", sans-serif`;
    const paddingX = Math.max(10, fontSize * .72);
    const paddingY = Math.max(5, fontSize * .34);
    const textWidth = ctx.measureText(label).width;
    const boxW = textWidth + paddingX * 2;
    const boxH = fontSize + paddingY * 2;
    const boxX = point.x - boxW / 2;
    const boxY = labelY - boxH / 2;
    const radius = Math.max(7, boxH * .34);
    ctx.shadowColor = "rgba(0,0,0,.5)";
    ctx.shadowBlur = Math.max(5, fontSize * .32);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(boxX, boxY, boxW, boxH, radius);
    else ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = "rgba(8,16,31,.88)";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1.4, fontSize * .1);
    ctx.strokeStyle = "rgba(255,200,87,.88)";
    ctx.stroke();
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, fontSize * .16);
    ctx.strokeStyle = "rgba(4,8,18,.82)";
    ctx.strokeText(label, point.x, labelY + .5);
    ctx.fillStyle = "#fff0c8";
    ctx.fillText(label, point.x, labelY + .5);
    ctx.restore();
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
    for (const portal of world.portals) if (inView(portal, 100)) renderables.push(portal);
    for (const npc of world.npcs) if (inView(npc, 100)) renderables.push(npc);
    for (const enemy of enemies) if (enemy.alive && inView(enemy, 130)) renderables.push(enemy);
    for (const drop of drops) if (drop.life > 0 && inView(drop, 60)) renderables.push(drop);
    renderables.push({ ...player, kind: "player" });
    renderables.sort((a, b) => depthFor(a) - depthFor(b));
    for (const entity of renderables) drawWorldEntity(entity, shakeX, shakeY);
    // The newest Main Town can bake the panel artwork into the flattened map.
    // Keep its invisible authored interaction region authoritative and paint
    // only the subtle gold outline when the separate prop itself is hidden.
    for (const board of world.boards || []) {
      if (board.boardId === "deck-loadout" && board.render === false && inView(board, 120)) {
        drawSkillPanelLabel(board, shakeX, shakeY);
      }
    }
  }

  function drawWorldEntity(entity, shakeX, shakeY) {
    if (entity.kind === "house") drawHouse(entity, shakeX, shakeY);
    else if (entity.kind === "tree") drawTree(entity, shakeX, shakeY);
    else if (entity.kind === "rock") drawRock(entity, shakeX, shakeY);
    else if (entity.kind === "lamp") drawLamp(entity, shakeX, shakeY);
    else if (entity.kind === "shrine") drawShrine(entity, shakeX, shakeY);
    else if (entity.kind === "sign") drawSign(entity, shakeX, shakeY);
    else if (entity.kind === "chest") drawChest(entity, shakeX, shakeY);
    else if (entity.kind === "npc") drawNpc(entity, shakeX, shakeY);
    else if (entity.kind === "portal") drawPortal(entity, shakeX, shakeY);
    else if (entity.kind === "player") drawPlayer(shakeX, shakeY);
    else if (["coin", "potion"].includes(entity.kind)) drawDrop(entity, shakeX, shakeY);
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
    if (prop.kind === "questBoard") {
      const indoor = ["guild", "shop", "clinic", "general-store", "inn", "dungeon"].includes(currentMapId);
      const boardDrawer = indoor ? Art.drawInteriorSprite : Art.drawEnvironmentSprite;
      if (prop.boardId === "deck-loadout") drawSkillPanelLabel(prop, shakeX, shakeY);
      boardDrawer(ctx, {
        sprite: indoor ? "indoorQuestBoard" : "questBoard",
        x: point.x,
        y: point.y + (indoor ? 20 : 15) * scale,
        width: (indoor ? 88 : 76) * scale,
        height: (indoor ? 72 : 76) * scale,
      });
      return;
    }
    if (["counter", "bookshelf", "table", "bed", "weaponRack", "armourRack", "anvil", "screen", "pillar", "goodsCrate"].includes(prop.kind)) {
      const w = Math.max(16, (prop.w || 28) * scale);
      const h = Math.max(12, (prop.h || 22) * scale);
      if (prop.kind === "bed") {
        const bedW = Math.max(96, (prop.w || 120) * 1.18 * scale);
        const bedH = bedW * (1024 / 1536);
        Art.drawStandaloneSprite(ctx, {
          sprite: "innBed",
          x: point.x + w / 2,
          y: point.y + h + 3 * scale,
          width: bedW,
          height: bedH,
          anchorX: .5,
          anchorY: 1,
          flipX: prop.id?.includes("east"),
        });
        return;
      }
      const environmentSprites = { counter: "guildCounter", bookshelf: "indoorBookshelf", weaponRack: "equipmentDisplay", armourRack: "equipmentDisplay", anvil: "indoorForge", goodsCrate: "barrelCrate" };
      const interiorSprites = { table: "guildTable", screen: "fittingScreen", pillar: "pillar" };
      const sprite = environmentSprites[prop.kind] || interiorSprites[prop.kind];
      if (!sprite) return;
      const drawer = environmentSprites[prop.kind] ? Art.drawEnvironmentSprite : Art.drawInteriorSprite;
      const artWidth = prop.kind === "counter" ? w * 1.03 : prop.kind === "bookshelf" ? Math.max(w * 2.4, 76 * scale) : prop.kind.includes("Rack") ? Math.max(w * 1.45, 86 * scale) : prop.kind === "table" ? w * 1.08 : prop.kind === "goodsCrate" ? Math.max(w * 1.35, 58 * scale) : Math.max(w * 1.25, 68 * scale);
      const artHeight = prop.kind === "counter" ? Math.max(h * 2.15, 68 * scale) : prop.kind === "bookshelf" ? h * 1.03 : prop.kind.includes("Rack") ? Math.max(h * 1.2, 78 * scale) : prop.kind === "table" ? Math.max(h * 2.4, 74 * scale) : prop.kind === "goodsCrate" ? Math.max(h * 1.2, 58 * scale) : Math.max(h * 1.15, 72 * scale);
      drawer(ctx, { sprite, x: point.x + w / 2, y: point.y + h, width: artWidth, height: artHeight });
      return;
    }
    if (prop.kind === "rug") {
      const w = (prop.w || 100) * scale;
      const h = (prop.h || 80) * scale;
      Art.drawTerrainTile(ctx, { sprite: ["shop", "general-store"].includes(currentMapId) ? "shopRug" : "guildRug", x: point.x - w / 2, y: point.y - h / 2, width: w, height: h });
      return;
    }
    if (["fireplace", "forgeFire", "ancientLamp", "wallSconce"].includes(prop.kind)) {
      const useEnvironment = prop.kind === "forgeFire";
      const sprite = prop.kind === "forgeFire" ? "indoorForge" : prop.kind === "fireplace" ? "fireplace" : prop.kind === "wallSconce" ? "wallSconce" : "ancientLamp";
      const drawer = useEnvironment ? Art.drawEnvironmentSprite : Art.drawInteriorSprite;
      const drew = drawer(ctx, {
        sprite,
        x: point.x,
        y: point.y + 14 * scale,
        width: (prop.kind === "forgeFire" ? 92 : prop.kind === "fireplace" ? 76 : 48) * scale,
        height: (prop.kind === "forgeFire" ? 86 : prop.kind === "fireplace" ? 72 : 48) * scale,
      });
      if (drew) drawGlow(prop, prop.kind === "forgeFire" ? "rgba(255,116,76,.22)" : "rgba(82,220,203,.18)", prop.radius ? prop.radius * 3 : 70, shakeX, shakeY);
      return;
    }
    if (prop.kind === "banner") {
      Art.drawInteriorSprite(ctx, { sprite: "guildBanner", x: point.x, y: point.y + 24 * scale, width: 50 * scale, height: 68 * scale });
      return;
    }
    if (prop.kind === "glowMushroom") {
      Art.drawInteriorSprite(ctx, { sprite: "glowMushroom", x: point.x, y: point.y + 10 * scale, width: 54 * scale, height: 54 * scale });
      return;
    }
    if (["rubble", "crackedTile"].includes(prop.kind)) {
      Art.drawInteriorSprite(ctx, { sprite: prop.kind, x: point.x, y: point.y + 8 * scale, width: (prop.kind === "rubble" ? 52 : 46) * scale, height: (prop.kind === "rubble" ? 52 : 34) * scale });
      return;
    }
    if (prop.kind === "mannequin") {
      Art.drawInteriorSprite(ctx, { sprite: "mannequin", x: point.x, y: point.y + 18 * scale, width: 62 * scale, height: 72 * scale });
    }
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
    if (!drewSprite) return;
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
    Art.drawEnvironmentSprite(ctx, { sprite: variant, x: point.x, y: point.y + 27 * scale, width: treeSize * scale, height: treeSize * scale });
  }

  function drawRock(rock, shakeX, shakeY) {
    const point = worldToScreen(rock, shakeX, shakeY);
    const r = rock.radius * camera.zoom;
    Art.drawEnvironmentSprite(ctx, { sprite: "rock", x: point.x, y: point.y + r * .8, width: r * 4.15, height: r * 4.15 });
  }

  function drawLamp(lamp, shakeX, shakeY) {
    const point = worldToScreen(lamp, shakeX, shakeY);
    const scale = camera.zoom;
    const drew = Art.drawEnvironmentSprite(ctx, { sprite: "lamp", x: point.x, y: point.y + 13 * scale, width: 62 * scale, height: 62 * scale });
    if (drew) drawGlow(lamp, "rgba(255,200,87,.16)", 100, shakeX, shakeY);
  }

  function drawShrine(shrine, shakeX, shakeY) {
    const point = worldToScreen(shrine, shakeX, shakeY);
    const scale = camera.zoom;
    Art.drawEnvironmentSprite(ctx, { sprite: "shrine", x: point.x, y: point.y + 25 * scale, width: 88 * scale, height: 88 * scale });
  }

  function drawSign(sign, shakeX, shakeY) {
    const point = worldToScreen(sign, shakeX, shakeY);
    const scale = camera.zoom;
    Art.drawEnvironmentSprite(ctx, { sprite: "sign", x: point.x, y: point.y + 20 * scale, width: 58 * scale, height: 58 * scale });
  }

  function drawChest(chest, shakeX, shakeY) {
    if (openedChests.has(chest.id)) return;
    const point = worldToScreen(chest, shakeX, shakeY);
    const scale = camera.zoom;
    Art.drawEnvironmentSprite(ctx, { sprite: "chest", x: point.x, y: point.y + 13 * scale, width: 54 * scale, height: 54 * scale });
  }

  function drawNpc(npc, shakeX, shakeY) {
    const point = worldToScreen(npc, shakeX, shakeY);
    const scale = camera.zoom;
    if (npc.render === false) {
      // Flattened interiors bake the visible receptionist into the map art.
      // Anchor the label to the authored magenta NPC region so higher-resolution
      // interiors do not place the name over the character's face.
      const region = authoritativeInteractionRegion(npc);
      const authored = region ? world.navigation?.data?.regions?.[region]?.[0] : null;
      if (authored?.bbox) {
        const labelGapPx = Math.max(2, Number(npc.nameLabelGapPx) || 8);
        const fontSize = Core.clamp(8.5 * camera.zoom, 10, 14);
        const labelTop = worldToScreen({
          x: authored.bbox.x + authored.bbox.width / 2 + (Number(npc.nameLabelOffsetXPx) || 0),
          y: authored.bbox.y,
        }, shakeX, shakeY);
        const anchorMode = String(npc.nameLabelAnchorMode || "").trim();
        const labelY = anchorMode === "region-top"
          ? labelTop.y - labelGapPx * scale - fontSize * .5
          : labelTop.y - 12 * scale;
        drawNpcName(labelTop.x, labelY, npcDisplayName(npc));
      } else {
        drawNpcName(point.x, point.y - 69 * scale, npcDisplayName(npc));
      }
      return;
    }
    const actors = {
      "clinic-healer-siu-moon": "healer", "store-merchant-gin": "merchant", "inn-keeper": "clerk",
      "guildmaster-yin": "guildmaster", "guild-clerk-po": "clerk", "guild-adventurer-nok": "adventurer", "guild-duelist-rhea": "duelist",
      "merchant-gin": "merchant", "armorer-yuet": "armorer", "shop-tailor-safi": "tailor", "lost-explorer-kai": "explorer",
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
    drawNpcName(anchorX, nameY, npcDisplayName(npc));
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
      scale: camera.zoom,
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
    if (!Art?.drawEnemy) return;
    const point = worldToScreen(enemy, shakeX, shakeY);
    const scale = camera.zoom;
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
    Art.drawMarker(ctx, { sprite, x, y: y + Math.sin(elapsed * 4) * 3, size: Math.max(26, 31 * camera.zoom), anchorY: .5 });
  }

  function drawInteractDiamond(x, y) {
    Art.drawMarker(ctx, { sprite: "interact", x, y: y + Math.sin(elapsed * 4) * 3, size: Math.max(19, 22 * camera.zoom), anchorY: .5 });
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
    const left = (0 - camera.x) * camera.zoom + width * .5;
    const top = (0 - camera.y) * camera.zoom + height * .5;
    const right = (world.pixelWidth - camera.x) * camera.zoom + width * .5;
    const bottom = (world.pixelHeight - camera.y) * camera.zoom + height * .5;
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.max(0, left), Math.max(0, top), Math.max(0, Math.min(width, right) - Math.max(0, left)), Math.max(0, Math.min(height, bottom) - Math.max(0, top)));
    ctx.clip();

    ensureAtmosphereVignetteCache();
    ctx.drawImage(atmosphereVignetteCache, 0, 0, width, height);

    ctx.restore();
  }

  function drawBossBar() {
    const boss = enemies.find((enemy) => enemy.boss && enemy.alive);
    if (!boss || Core.distance(player, boss) > 520 || mode === "title") return;
    const barWidth = Math.min(420, width * .46);
    const x = (width - barWidth) / 2;
    const y = width < 650 ? 106 : 28;
    ctx.fillStyle = "rgba(7,11,22,.88)"; ctx.fillRect(x - 7, y - 18, barWidth + 14, 34);
    ctx.strokeStyle = "rgba(245,233,202,.4)"; ctx.strokeRect(x - 7, y - 18, barWidth + 14, 34);
    ctx.fillStyle = "#4b243d"; ctx.fillRect(x, y, barWidth, 7);
    ctx.fillStyle = "#ff6b91"; ctx.fillRect(x, y, barWidth * Core.clamp(boss.hp / boss.maxHp, 0, 1), 7);
    const english = "DEEP WARDEN";
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
        capturePreviousExplorationRenderState();
        updateGame(FIXED_STEP);
        accumulator -= FIXED_STEP;
        steps += 1;
      }
      if (steps >= 7) {
        accumulator = 0;
        renderInterpolationAlpha = 1;
      } else {
        renderInterpolationAlpha = Core.clamp(accumulator / FIXED_STEP, 0, 1);
      }
    } else if (mode === "battle") {
      updateBattle(rawDelta);
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
    if (guildCommissionDetailPanel?.hidden === false) {
      if (code === "Escape" || code === "KeyE") closeGuildCommissionDetail();
      return;
    }
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
    if (mode === "facility") {
      if (guildCommissionDetailPanel?.hidden === false) {
        if (code === "Escape" || code === "KeyE") closeGuildCommissionDetail();
        return;
      }
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
      if (systemSettingsPopover?.hidden === false && code === "Escape") {
        setSystemSettingsOpen(false);
        systemButton?.focus({ preventScroll: true });
        return;
      }
      if (facilityTab === "bag" && selectedInventoryItemId && (code === "Escape" || code === "KeyE")) {
        selectedInventoryItemId = null;
        pendingInventoryDestroyItemId = null;
        renderBagFacility();
        return;
      }
      if (code === "KeyI") {
        openFacility("bag");
        return;
      }
      if (code === "KeyL") {
        openFacility("skills");
        return;
      }
      if (code === "Escape" || code === "KeyE") closeFacility();
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
      if (battle.phase === "planning_action" && code === "Escape" && battleSkillFromAction(battle.selectedAction)) {
        cancelBattleTargetSelection();
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
        const direction = code === "ArrowUp" ? { x: 0, y: -1 } : code === "ArrowDown" ? { x: 0, y: 1 } : code === "ArrowLeft" ? { x: -1, y: 0 } : { x: 1, y: 0 };
        battle.cursor.x = Core.clamp(battle.cursor.x + direction.x, 0, battle.grid.width - 1);
        battle.cursor.y = Core.clamp(battle.cursor.y + direction.y, 0, battle.grid.height - 1);
        return;
      }
      if (code === "Enter" || code === "Space") confirmBattleCell(battle.cursor);
      else if (code === "KeyR") selectBattleAction("reset-move");
      else if (code === "KeyM" || code === "Digit1") selectBattleAction("end-move");
      else if (/^Digit[2-7]$/.test(code)) {
        const skill = equippedBattleSkills()[Number(code.slice(-1)) - 2];
        if (skill) selectBattleAction(`skill:${skill.id}`);
      } else if (code === "KeyA") {
        const skill = equippedBattleSkills()[0];
        if (skill) selectBattleAction(`skill:${skill.id}`);
      } else if (code === "KeyS") {
        const skill = equippedBattleSkills()[1];
        if (skill) selectBattleAction(`skill:${skill.id}`);
      } else if (code === "KeyE" || code === "Digit9") selectBattleAction("end-turn");
      else if ((code === "Escape" || code === "Digit0") && battle.phase === "planning_move") selectBattleAction("flee");
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
    if (mode === "dead") return;
    if (mode !== "playing") return;
    if (code === "Escape" && systemSettingsPopover?.hidden === false) {
      setSystemSettingsOpen(false);
      systemButton?.focus({ preventScroll: true });
      return;
    }
    if (code === "Escape" && facilityWindows.size) {
      closeFacility(topFacilityWindow());
      return;
    }
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
      hero: { cell: { ...battle.hero.cell }, renderCell: battle.hero.renderCell ? { ...battle.hero.renderCell } : null, hp: battle.hero.hp, maxHp: battle.hero.maxHp, attack: battle.hero.attack, defence: battle.hero.defence, accuracy: battle.hero.accuracy, evasion: battle.hero.evasion, weight: battle.hero.weight, moveRange: battle.hero.moveRange, facing: battle.hero.facing, hitFlash: battle.hero.hitFlash || 0, stopFlash: battle.hero.stopFlash || 0, locomotion: battle.hero.locomotion ? { ...battle.hero.locomotion } : null },
      enemies: battle.enemies.map((unit) => ({
        id: unit.id,
        primary: unit.primary,
        type: unit.type,
        cell: { ...unit.cell },
        renderCell: unit.renderCell ? { ...unit.renderCell } : null,
        hp: unit.hp,
        maxHp: unit.maxHp,
        attack: unit.attack,
        defence: unit.defence,
        accuracy: unit.accuracy,
        evasion: unit.evasion,
        weight: unit.weight,
        ap: unit.ap,
        skillName: unit.skillName,
        speedGrade: unit.speedGrade,
        targetArc: [...(unit.targetArc || [])],
        alive: unit.alive,
        facing: unit.facing,
        hitFlash: unit.hitFlash || 0,
        stopFlash: unit.stopFlash || 0,
        locomotion: unit.locomotion ? { ...unit.locomotion } : null,
      })),
      plans: battle.enemyPlans.map((plan) => ({
        enemyId: plan.enemyId,
        move: { ...plan.move },
        path: plan.path.map((cell) => ({ ...cell })),
        commands: (plan.commands || []).map((command) => ({ ...command, to: command.to ? { ...command.to } : undefined })),
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
      heroMoveCommands: (battle.heroMoveCommands || []).map((command) => ({ ...command, to: command.to ? { ...command.to } : undefined })),
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
        pendingActions: (battle.actionResolution.pendingActions || []).map((pending) => ({
          id: pending.id,
          actorId: pending.actorId,
          targetId: pending.targetId,
          skillId: pending.skillId,
          skillDurability: pending.skillDurability,
          accumulatedInterrupt: pending.accumulatedInterrupt,
          remainingSkillDurability: pending.remainingSkillDurability,
          status: pending.status,
        })),
      } : null,
    };
  }

  function installDebugHooks() {
    if (!testingMode) return;
    window.__RPG_DEBUG__ = {
      ready: true,
      newGame: (classId) => newGame(true, classId),
      snapshot: () => ({
        mode, elapsedSeconds: elapsed, level: player.level, xp: player.xp, hp: player.hp, maxHp: playerStats().maxHp,
        stats: playerStats(),
        classId: playerClassId,
        x: player.x, y: player.y, facing: player.facing, moving: player.moving, locomotion: player.locomotion ? { ...player.locomotion } : null,
        movementOdometer: { distanceWorldUnits: player.explorationDistance, movingSeconds: player.explorationMoveSeconds },
        currentMapId, bgm: bgm.snapshot(), pendingLevelUps,
        coins: player.coins, ownedEquipment: [...ownedEquipment], equipped: { ...equipped },
        guildCommission: Guild.normalizeState(guildCommissionState),
        guildMarks, guildRenown, monsterKills: { ...monsterKills }, dungeonClears,
        skills: Skills.normalizeSkillState(skillState), automaticPortalReady,
        explorePath: { target: exploreMoveTarget ? { ...exploreMoveTarget } : null, remaining: exploreMovePath.length, portalIntentId: explorePortalIntentId },
        exploreZoomLevel, cameraZoom: camera.zoom, targetCameraZoom: targetZoom(), hudCollapsed,
        flattenedMapRender: world.art?.flattened && world.art?.backgroundScene ? (() => {
          const crop = flattenedBackgroundCrop();
          const downsampling = crop.dw < crop.sw || crop.dh < crop.sh;
          const atlas = Art.spriteStatus()[`${world.art.backgroundScene}Background`];
          return {
            source: { x: crop.sx, y: crop.sy, width: crop.sw, height: crop.sh },
            destination: { x: crop.dx, y: crop.dy, width: crop.dw, height: crop.dh },
            image: { width: atlas?.naturalWidth || world.pixelWidth, height: atlas?.naturalHeight || world.pixelHeight },
            canvas: { cssWidth: width, cssHeight: height, dpr, backingWidth: canvas.width, backingHeight: canvas.height },
            cameraZoom: camera.zoom,
            sampling: { imageSmoothingEnabled: downsampling, imageSmoothingQuality: downsampling ? "high" : "disabled", intermediateBitmap: false },
          };
        })() : null,
        persistence: { dirty: persistence?.isDirty() || false, saveAttempts: persistence?.getSaveAttempts() || 0, successfulSaves: persistence?.getSuccessfulSaves() || 0 },
        facility: facilityWindows.size ? { tab: facilityTab, context: facilityContext, availableTabs: [...availableFacilityTabs()] } : null,
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
        const lanes = [];
        for (let y = 0; y < battle.grid.height; y += 1) {
          for (let x = 0; x + 2 < battle.grid.width; x += 1) {
            const cells = [{ x, y }, { x: x + 1, y }, { x: x + 2, y }];
            const occupiedByOther = battle.enemies.some((unit) => unit.alive && unit.id !== enemy.id && cells.some((cell) => sameBattleCell(cell, unit.cell)));
            if (!occupiedByOther && cells.every((cell) => Tactics.isWalkable(battle.grid, cell))) lanes.push(cells);
          }
        }
        lanes.sort((a, b) => {
          const score = (cells) => Math.abs(cells[1].x + .5 - battle.grid.width / 2) + Math.abs(cells[1].y + .5 - battle.grid.height / 2);
          return score(a) - score(b);
        });
        const lane = lanes[0] || null;
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
        battle.heroMoveCommands = [];
        battle.heroMovePlan = null;
        battle.cursor = copyBattleCell(lane[0]);
        battle.awaitingFacing = false;
        updateBattleUi();
        return { target: copyBattleCell(lane[1]), requestedFacing: "down", expectedFacing: "right", enemyId: enemy.id };
      },
      prepareBattleVisualActions: () => {
        if (!battle || battle.phase !== "planning_move") return false;
        const enemy = livingBattleEnemies()[0];
        if (!enemy) return false;
        const pairs = [];
        for (let y = 0; y < battle.grid.height; y += 1) {
          for (let x = 0; x + 1 < battle.grid.width; x += 1) {
            const cells = [{ x, y }, { x: x + 1, y }];
            const occupiedByOther = battle.enemies.some((unit) => unit.alive && unit.id !== enemy.id && cells.some((cell) => sameBattleCell(cell, unit.cell)));
            if (!occupiedByOther && cells.every((cell) => Tactics.isWalkable(battle.grid, cell))) pairs.push(cells);
          }
        }
        pairs.sort((a, b) => {
          const score = (cells) => Math.abs((cells[0].x + cells[1].x + 1) / 2 - battle.grid.width / 2) + Math.abs(cells[0].y + .5 - battle.grid.height / 2);
          return score(a) - score(b);
        });
        const pair = pairs[0] || null;
        if (!pair) return false;
        battle.hero.cell = copyBattleCell(pair[0]);
        battle.hero.renderCell = copyBattleCell(pair[0]);
        battle.hero.facing = "right";
        battle.hero.locomotion = Locomotion.create("right");
        battle.hero.accuracy = 999;
        battle.hero.evasion = 0;
        battle.hero.hp = battle.hero.maxHp;
        enemy.cell = copyBattleCell(pair[1]);
        enemy.renderCell = copyBattleCell(pair[1]);
        enemy.facing = "left";
        enemy.locomotion = Locomotion.create("left");
        enemy.accuracy = 999;
        enemy.evasion = 0;
        enemy.hp = enemy.maxHp;
        battle.enemyPlans = battle.enemyPlans.map((plan) => plan.enemyId === enemy.id ? {
          ...plan,
          move: copyBattleCell(pair[1]),
          path: [copyBattleCell(pair[1])],
          targetCells: [copyBattleCell(pair[0])],
          willAttack: true,
          facing: "left",
        } : {
          ...plan,
          move: copyBattleCell(battle.enemies.find((unit) => unit.id === plan.enemyId)?.cell || plan.move),
          path: [copyBattleCell(battle.enemies.find((unit) => unit.id === plan.enemyId)?.cell || plan.move)],
          targetCells: [],
          willAttack: false,
        });
        battle.phase = "planning_action";
        battle.moved = true;
        battle.heroMoveDraft = [copyBattleCell(pair[0])];
        battle.heroMoveCommands = [];
        battle.heroMovePlan = null;
        battle.cursor = copyBattleCell(pair[1]);
        battle.awaitingFacing = false;
        updateBattleUi();
        return { heroCell: copyBattleCell(pair[0]), enemyCell: copyBattleCell(pair[1]), enemyId: enemy.id, enemyType: enemy.type };
      },
      battleUnitAnchor: (id = "hero") => {
        if (!battle) return null;
        const unit = id === "hero" || id === battle.hero.id ? battle.hero : battle.enemies.find((entry) => entry.id === id);
        if (!unit) return null;
        const layout = battleLayout();
        const point = battleCellCentre(unit.renderCell || unit.cell, layout);
        return {
          cellCentreX: point.x,
          cellCentreY: point.y,
          nameX: point.x,
          nameY: point.y - layout.cell * (unit.boss ? .76 : unit.side === "ally" ? .68 : .6),
          hpCentreX: point.x,
          hpY: point.y + layout.cell * .38,
        };
      },
      setBattleVisualReaction: (id = "hero", state = "hurt") => {
        if (!battle || !["hurt", "stop"].includes(state)) return false;
        const unit = id === "hero" || id === battle.hero.id ? battle.hero : battle.enemies.find((entry) => entry.id === id);
        if (!unit) return false;
        if (state === "hurt") unit.hitFlash = .35;
        else unit.stopFlash = .48;
        return true;
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
        if (facilityWindows.size) renderFacility();
        return window.__RPG_DEBUG__.snapshot();
      },
      chooseUpgrade,
      save: () => saveGame(false, true),
      load: loadGame,
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
        if (facilityWindows.size && facilityTab === "bag") renderBagFacility();
        return window.__RPG_DEBUG__.snapshot();
      },
      acceptOffer: (id) => acceptGuildOffer(id || currentContractOffers()[0]?.id),
      claimContract: (id) => claimGuildContract(id),
      recordGuildKill: (monsterId, instanceId) => {
        const result = recordDefeatedMonster({ type: monsterId, instanceId: instanceId || `${monsterId}:debug:${Date.now()}` });
        updateHud(true);
        return window.__RPG_DEBUG__.snapshot();
      },
      grantSkillBook: (star, quantity = 1) => {
        const result = Skills.grantSkillBooks(skillState, star, quantity);
        if (result.ok) skillState = result.state;
        if (facilityWindows.size) renderFacility();
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
        if (facilityWindows.size) renderFacility();
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
          const target = world.enemySpawns[2] || world.start;
          player.x = target.x - 80;
          player.y = target.y + 15;
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
    card.addEventListener("click", () => {
      if (card.dataset.classLocked === "true") {
        showToast("此職業需課金解鎖", "danger");
        return;
      }
      startNewGameWithClass(card.dataset.classChoice);
    });
  }
  document.getElementById("classSelectCancel").addEventListener("click", () => {
    classSelectPanel.hidden = true;
    document.getElementById("newGameButton").focus({ preventScroll: true });
  });
  document.getElementById("dialogueNext").addEventListener("click", advanceDialogue);
  sidebarToggle?.addEventListener("click", () => setHudCollapsed(!hudCollapsed));
  const draggableWindowSelector = ".facility-window.ui-window, .ui-modal-window, .system-settings-window.ui-window";
  const nonDraggableControlSelector = "button, a, input, select, textarea, [contenteditable], [role=button], [data-no-window-drag], [data-deck-drag-source]";

  function resetDraggableWindowPosition(windowElement) {
    if (!windowElement) return;
    windowElement.style.setProperty("--ui-drag-x", "0px");
    windowElement.style.setProperty("--ui-drag-y", "0px");
    windowElement.classList.remove("is-window-dragging");
  }

  function beginDraggableWindow(event) {
    if (event.button !== 0 || draggableWindowGesture) return;
    const windowElement = event.target.closest?.(draggableWindowSelector);
    if (!windowElement || windowElement.closest("[hidden]")) return;
    const facilityState = facilityStateForNode(windowElement);
    if (facilityState) activateFacilityWindow(facilityState);
    else if (windowElement === systemSettingsPopover) focusUiWindow(windowElement);
    if (event.pointerType === "touch" && event.target.closest?.(".skill-tree-scroll")) return;
    if (event.target.closest?.(nonDraggableControlSelector)) return;
    const style = getComputedStyle(windowElement);
    const startOffsetX = Number.parseFloat(style.getPropertyValue("--ui-drag-x")) || 0;
    const startOffsetY = Number.parseFloat(style.getPropertyValue("--ui-drag-y")) || 0;
    draggableWindowGesture = {
      pointerId: event.pointerId,
      windowElement,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX,
      startOffsetY,
      moved: false,
    };
    try { windowElement.setPointerCapture?.(event.pointerId); } catch (_) {}
  }

  function moveDraggableWindow(event) {
    const gesture = draggableWindowGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!gesture.moved && Math.hypot(dx, dy) < 4) return;
    gesture.moved = true;
    gesture.windowElement.classList.add("is-window-dragging");
    const rect = gesture.windowElement.getBoundingClientRect();
    const keepVisibleX = Math.min(72, rect.width * .35);
    const keepVisibleY = Math.min(56, rect.height * .35);
    const desiredX = gesture.startOffsetX + dx;
    const desiredY = gesture.startOffsetY + dy;
    const minDx = -rect.right + keepVisibleX + (Number.parseFloat(getComputedStyle(gesture.windowElement).getPropertyValue("--ui-drag-x")) || 0);
    const maxDx = window.innerWidth - rect.left - keepVisibleX + (Number.parseFloat(getComputedStyle(gesture.windowElement).getPropertyValue("--ui-drag-x")) || 0);
    const minDy = -rect.bottom + keepVisibleY + (Number.parseFloat(getComputedStyle(gesture.windowElement).getPropertyValue("--ui-drag-y")) || 0);
    const maxDy = window.innerHeight - rect.top - keepVisibleY + (Number.parseFloat(getComputedStyle(gesture.windowElement).getPropertyValue("--ui-drag-y")) || 0);
    gesture.windowElement.style.setProperty("--ui-drag-x", `${Core.clamp(desiredX, minDx, maxDx)}px`);
    gesture.windowElement.style.setProperty("--ui-drag-y", `${Core.clamp(desiredY, minDy, maxDy)}px`);
    event.preventDefault();
  }

  function finishDraggableWindow(event) {
    const gesture = draggableWindowGesture;
    if (!gesture || (event && gesture.pointerId !== event.pointerId)) return;
    draggableWindowGesture = null;
    gesture.windowElement.classList.remove("is-window-dragging");
    try { gesture.windowElement.releasePointerCapture?.(gesture.pointerId); } catch (_) {}
  }

  function handleFacilityContentClick(event, state) {
    if (!activateFacilityWindow(state)) return;
    if (performance.now() < suppressSkillTreeClickUntil && event.target.closest?.(".skill-tree-scroll")) {
      event.preventDefault();
      return;
    }
    const clickedDetailPopup = event.target.closest?.(".inventory-detail-popup");
    const clickedDetailBackdrop = event.target.closest?.("[data-inventory-detail-dismiss]");
    const clickedInventoryItem = event.target.closest?.('[data-facility-action="select-item"]');
    const button = event.target.closest("[data-facility-action]");
    if (facilityTab === "bag" && selectedInventoryItemId && clickedDetailBackdrop && !clickedDetailPopup) {
      selectedInventoryItemId = null;
      pendingInventoryDestroyItemId = null;
      renderBagFacility();
      return;
    }
    if (facilityTab === "bag" && selectedInventoryItemId && !clickedDetailPopup && !clickedInventoryItem) {
      selectedInventoryItemId = null;
      pendingInventoryDestroyItemId = null;
      // If the click was only on inventory/background space, close immediately.
      // For a real control (filter/page/etc.), let that action continue below.
      if (!button) {
        renderBagFacility();
        return;
      }
    }
    if (!button || button.disabled) return;
    const action = button.dataset.facilityAction;
    if (action === "select-item") {
      selectedInventoryItemId = button.dataset.itemId || null;
      pendingInventoryDestroyItemId = null;
      renderBagFacility();
    } else if (action === "inventory-filter") {
      inventoryCategory = ["all", "equipment", "consumable", "skillbook", "material"].includes(button.dataset.inventoryCategory)
        ? button.dataset.inventoryCategory
        : "all";
      inventoryPage = 0;
      selectedInventoryItemId = null;
      pendingInventoryDestroyItemId = null;
      renderBagFacility();
    } else if (action === "inventory-prev") {
      inventoryPage = Math.max(0, inventoryPage - 1);
      selectedInventoryItemId = null;
      pendingInventoryDestroyItemId = null;
      renderBagFacility();
    } else if (action === "inventory-next") {
      inventoryPage += 1;
      selectedInventoryItemId = null;
      pendingInventoryDestroyItemId = null;
      renderBagFacility();
    } else if (action === "shop-category") {
      equipmentShopCategory = ["weapon", "head", "upper", "lower", "martial"].includes(button.dataset.shopCategory)
        ? button.dataset.shopCategory
        : "weapon";
      renderShopFacility();
    } else if (action === "shop-trade-mode") {
      shopTradeMode = button.dataset.shopTradeMode === "sell" ? "sell" : "buy";
      facilityContext === "general-store" ? renderGeneralStoreFacility() : renderShopFacility();
    } else if (action === "commission-detail") renderGuildCommissionDetail(button.dataset.offerId);
    else if (action === "accept") acceptGuildOffer(button.dataset.offerId);
    else if (action === "claim") claimGuildContract(button.dataset.contractId);
    else if (action === "abandon") openAbandonCommission(button.dataset.contractId);
    else if (action === "buy") changeEquipment(button.dataset.itemId, true);
    else if (action === "equip") changeEquipment(button.dataset.itemId, false);
    else if (action === "unequip") unequipEquipment(button.dataset.itemId);
    else if (action === "sell-equipment") sellEquipmentItem(button.dataset.itemId);
    else if (action === "sell-store-item") sellGeneralStoreItem(button.dataset.itemId);
    else if (action === "destroy-item") {
      pendingInventoryDestroyItemId = button.dataset.itemId || null;
      renderBagFacility();
    } else if (action === "cancel-destroy-item") {
      pendingInventoryDestroyItemId = null;
      renderBagFacility();
    } else if (action === "confirm-destroy-item") destroyInventoryItem(button.dataset.itemId);
    else if (action === "use-potion") useBagPotion();
    else if (action === "use-weak-potion") useWeakPotion();
    else if (action === "buy-store-item") buyGeneralStoreItem(button.dataset.itemId);
    else if (action === "open-book") openGuildSkillBook(Number(button.dataset.bookStar));
    else if (action === "open-envelope") openGuildEnvelope(Number(button.dataset.envelopeStar));
    else if (action === "use-manual") useSkillManualFromBag(button.dataset.skillId);
    else if (action === "skill-detail") openSkillDetail(button.dataset.skillId, button);
    else if (action === "equip-skill") changeSkillLoadout(button.dataset.skillId, true);
    else if (action === "unequip-skill") changeSkillLoadout(button.dataset.skillId, false);
    else if (action === "master-skill") masterSkill(button.dataset.skillId);
    syncActiveFacilityWindowState();
  }

  function wireFacilityWindow(state) {
    state.closeButton?.addEventListener("click", () => closeFacility(state));
    state.helpButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      activateFacilityWindow(state);
      toggleFacilityHelp(state);
    });
    state.panel.addEventListener("pointerdown", () => activateFacilityWindow(state), true);
    state.panel.addEventListener("click", (event) => {
      if (!state.helpPopover?.hidden && !event.target.closest(".facility-help-popover, .ui-info-button")) setFacilityHelpOpen(false, state);
      const tab = event.target.closest("[data-facility-tab]");
      if (!tab) return;
      activateFacilityWindow(state);
      if (!availableFacilityTabs().includes(tab.dataset.facilityTab)) return;
      facilityTab = tab.dataset.facilityTab;
      renderFacility();
    });
    state.content.addEventListener("click", (event) => handleFacilityContentClick(event, state));
    state.content.addEventListener("pointerdown", (event) => {
      activateFacilityWindow(state);
      beginSkillTreePan(event);
      beginDeckDrag(event);
    });
    state.content.addEventListener("pointermove", (event) => {
      if (activeFacilityWindow !== state) return;
      moveSkillTreePan(event);
      moveDeckDrag(event);
    });
    state.content.addEventListener("pointerup", (event) => {
      if (activeFacilityWindow !== state) return;
      finishSkillTreePan(event);
      finishDeckDrag(event);
    });
    state.content.addEventListener("pointercancel", (event) => {
      if (activeFacilityWindow !== state) return;
      cancelSkillTreePan(event);
      cancelDeckDrag(event);
    });
  }

  systemLogTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-log-filter]");
    if (!button) return;
    const next = button.dataset.logFilter;
    systemLogFilter = ["all", "combat", "reward", "quest", "item", "system"].includes(next) ? next : "all";
    renderSystemLog();
  });
  systemLogToggleButton?.addEventListener("click", toggleSystemLogCollapsed);
  systemLogScrollZone?.addEventListener("wheel", (event) => {
    if (!event.deltaY) return;
    scrollSystemLogBy(event.deltaY);
    event.preventDefault();
  }, { passive: false });
  systemLogScrollZone?.addEventListener("pointerdown", beginSystemLogScroll);
  systemLogScrollZone?.addEventListener("pointermove", moveSystemLogScroll);
  systemLogScrollZone?.addEventListener("pointerup", finishSystemLogScroll);
  systemLogScrollZone?.addEventListener("pointercancel", finishSystemLogScroll);
  systemLogDragHandle?.addEventListener("pointerdown", beginSystemLogDrag);
  systemLogDragHandle?.addEventListener("pointermove", moveSystemLogDrag);
  systemLogDragHandle?.addEventListener("pointerup", finishSystemLogDrag);
  systemLogDragHandle?.addEventListener("pointercancel", finishSystemLogDrag);

  guildCommissionDetailCloseButton?.addEventListener("click", closeGuildCommissionDetail);
  guildCommissionDetailPanel?.addEventListener("click", (event) => {
    if (event.target === guildCommissionDetailPanel) return closeGuildCommissionDetail();
    const button = event.target.closest("[data-guild-detail-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.guildDetailAction;
    if (action === "accept") acceptGuildOffer(button.dataset.offerId);
    else if (action === "claim") claimGuildContract(button.dataset.contractId);
    else if (action === "abandon") {
      closeGuildCommissionDetail();
      openAbandonCommission(button.dataset.contractId);
    }
  });

  document.addEventListener("pointerdown", beginDraggableWindow);
  document.addEventListener("pointermove", moveDraggableWindow, { passive: false });
  document.addEventListener("pointerup", finishDraggableWindow);
  document.addEventListener("pointercancel", finishDraggableWindow);

  dialoguePanel.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    advanceDialogue();
  });
  continueButton.addEventListener("click", loadGame);
  accountButton?.addEventListener("click", () => openAuthPanel("login"));
  titleLogoutButton?.addEventListener("click", signOutAccount);
  systemLogoutButton?.addEventListener("click", signOutAccount);
  authForm?.addEventListener("submit", handleAuthSubmit);
  authSwitchButton?.addEventListener("click", () => setAuthMode(authMode === "login" ? "register" : "login"));
  authForgotButton?.addEventListener("click", sendPasswordReset);
  authCloseButton?.addEventListener("click", closeAuthPanel);
  authPanel?.addEventListener("click", (event) => {
    if (event.target === authPanel) closeAuthPanel();
  });
  legacyUseButton?.addEventListener("click", useLegacySave);
  legacyStartButton?.addEventListener("click", declineLegacySave);
  const openStatusFromHud = () => openFacility("status");
  statusButton.addEventListener("click", openStatusFromHud);
  playerHud.addEventListener("click", openStatusFromHud);
  playerHud.addEventListener("keydown", (event) => {
    if (!["Enter", "Space"].includes(event.code)) return;
    event.preventDefault();
    openStatusFromHud();
  });
  inventoryButton.addEventListener("click", () => openFacility("bag"));
  missionButton?.addEventListener("click", () => openFacility("missions"));
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
  document.getElementById("reviveHereButton").addEventListener("click", reviveHere);
  document.getElementById("respawnButton").addEventListener("click", respawn);
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
  battleActionDock?.querySelector("[data-battle-command-drag-handle]")?.addEventListener("pointerdown", beginBattleCommandDrag);
  battleActionDock?.addEventListener("pointermove", moveBattleCommandDrag);
  battleActionDock?.addEventListener("pointerup", finishBattleCommandDrag);
  battleActionDock?.addEventListener("pointercancel", finishBattleCommandDrag);
  canvas.addEventListener("pointerdown", handleCanvasPointer);
  canvas.addEventListener("contextmenu", (event) => {
    if (mode === "battle") event.preventDefault();
  });
  canvas.addEventListener("pointermove", handleCanvasPointerMove);
  canvas.addEventListener("pointerleave", clearExploreHoverPointer);
  canvas.addEventListener("pointerup", finishCanvasPointer);
  canvas.addEventListener("pointercancel", cancelExploreTouchPointer);
  canvas.addEventListener("wheel", handleExploreWheelZoom, { passive: false });
  canvas.addEventListener("lostpointercapture", (event) => {
    if (explorePointerGesture?.pressed) cancelExplorePointerTracking(event.pointerId, false);
  });
  document.getElementById("zoomControl")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-zoom-level]");
    if (!button) return;
    setExploreZoomLevel(button.dataset.zoomLevel);
  });
  systemButton?.addEventListener("click", () => {
    if (systemSettingsPopover?.hidden === false) {
      focusUiWindow(systemSettingsPopover);
      return;
    }
    setSystemSettingsOpen(true);
  });
  systemSettingsCloseButton?.addEventListener("click", () => {
    setSystemSettingsOpen(false);
    systemButton?.focus({ preventScroll: true });
  });
  volumeMuteButton?.addEventListener("click", () => {
    const enabled = setSoundEnabled(!soundEnabled);
    if (enabled) sound.tone(520, .1, { to: 760, gain: .03 });
  });
  musicVolumeSlider?.addEventListener("input", () => {
    const nextVolume = Core.clamp(Number(musicVolumeSlider.value) / 100, 0, 1);
    if (nextVolume <= 0) {
      setSoundEnabled(false);
      return;
    }
    setBgmVolume(nextVolume);
    if (!soundEnabled) setSoundEnabled(true);
  });
  for (const card of document.querySelectorAll("[data-upgrade]")) card.addEventListener("click", () => chooseUpgrade(card.dataset.upgrade));
  document.addEventListener("pointerdown", unlockGameAudioFromGesture, { capture: true, passive: true });
  window.addEventListener("keydown", unlockGameAudioFromGesture, { capture: true });
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("blur", () => {
    keys.clear();
    activeExploreTouches.clear();
    explorePinchGesture = null;
    suppressExploreTouchTap = false;
    activeBattleTouches.clear();
    battlePinchGesture = null;
    suppressBattleTouchTap = false;
    cancelExplorePointerTracking();
  });
  document.addEventListener("visibilitychange", () => {
    keys.clear();
    cancelExplorePointerTracking();
    previousTime = performance.now();
    if (document.visibilityState === "visible") resumeGameAudio();
    else suspendGameAudio();
  });
  window.addEventListener("pagehide", suspendGameAudio);
  window.addEventListener("pageshow", () => {
    if (document.visibilityState === "visible") resumeGameAudio();
  });
  window.addEventListener("beforeunload", () => { if (mode !== "title" && isGameplayAuthorized()) persistence?.flush(); });
  window.addEventListener("resize", resize, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

  titleScreen.hidden = false;
  titleActions.hidden = true;
  continueButton.hidden = true;
  restoreSystemLogPosition();
  syncSystemLogCollapsed();
  renderSystemLog();
  syncAccountStatus();
  syncSystemSoundControl();
  syncExploreZoomControls();
  syncHudCollapse();
  resetEnemies();
  drawPlayerHudPortrait();
  window.addEventListener("lantern-art-ready", () => {
    drawPlayerHudPortrait();
  });
  resize();
  updateHud(true);
  installDebugHooks();
  if (Firebase?.onAuthStateChanged) {
    Firebase.onAuthStateChanged((user, error) => {
      authStateResolved = true;
      if (error) {
        authUser = null;
        savePersistence?.deactivateUser();
        clearGameplayState();
        syncAccountStatus();
        setAuthMessage("未能確認帳戶；請重新載入後再試。", "error");
        openAuthPanel("login", true);
        return;
      }
      void syncAuthenticatedUser(user);
    });
  }
  requestAnimationFrame(frame);
})();
