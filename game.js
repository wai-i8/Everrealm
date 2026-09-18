(function () {
  "use strict";

  const Core = window.EverrealmCore;
  const World = window.EverrealmWorld;
  const Expansion = window.EverrealmExpansion;
  const ClassData = window.EverrealmClassData;
  const EquipmentData = window.EverrealmEquipmentData;
  const ItemData = window.EverrealmItemData;
  const ExpansionWorld = window.EverrealmExpansionWorld;
  const Guild = window.EverrealmGuildCommission;
  const MapRegistry = window.EverrealmMapRegistry;
  const MapTransitions = window.EverrealmMapTransitions;
  const MainTownNavigation = window.EverrealmMainTownNavigation;
  const TRANSITION_TYPES = MapTransitions.TRANSITION_TYPES;
  const houseSpriteSettings = MapTransitions.houseSpriteSettings;
  const Tactics = window.EverrealmTactics;
  const Skills = window.EverrealmSkills;
  const Panels = window.EverrealmPanels;
  const MainQuest = window.EverrealmMainQuest;
  const MonsterAI = window.EverrealmMonsterAI;
  const Bgm = window.EverrealmBgm;
  const FighterEffects = window.EverrealmFighterEffects;
  const Art = window.EverrealmArt;
  const Locomotion = window.EverrealmLocomotion;
  const SaveSystem = window.EverrealmSaveSystem;
  const Firebase = window.EverrealmFirebase;
  const CloudSave = window.EverrealmCloudSave?.create?.({ firebase: Firebase });
  const SavePersistence = window.EverrealmSavePersistence;
  const UiDom = window.EverrealmUiDom;
  const UiPresentation = window.EverrealmUiPresentation;
  const SystemFeedback = window.EverrealmSystemFeedback;
  const DialogueUi = window.EverrealmDialogueUi;
  const FacilityBasicViews = window.EverrealmFacilityBasicViews;
  const FacilityCatalogViews = window.EverrealmFacilityCatalogViews;
  const FacilityProgressionViews = window.EverrealmFacilityProgressionViews;
  const FacilityBagView = window.EverrealmFacilityBagView;
  const FacilityWindowShell = window.EverrealmFacilityWindowShell;
  const FacilityActionRouter = window.EverrealmFacilityActionRouter;
  const BattleVictory = window.EverrealmBattleVictory;
  const PlayerStateActions = window.EverrealmPlayerStateActions;
  // Step 9C startup safety: the server API can be constructed before the map/player
  // bindings exist, but it must never touch those later bindings during boot. Keep
  // an inert provider until createPlayer() has completed, then arm it below.
  let serverCommandPositionProvider = () => null;
  const ServerApi = window.EverrealmServerApi?.create?.({
    firebase: Firebase,
    positionProvider: () => serverCommandPositionProvider(),
  });
  const worldTime = window.EverrealmWorldTime?.create?.({ firebase: Firebase });
  const multiplayer = window.EverrealmMultiplayer?.create?.({ firebase: Firebase, locomotion: Locomotion });
  const Chat = window.EverrealmChat;
  let worldChat = null;
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
  const BGM_ENABLED_KEY = "everrealm-bgm-enabled-v1";
  const SFX_ENABLED_KEY = "everrealm-sfx-enabled-v1";
  const BGM_VOLUME_KEY = "everrealm-bgm-volume-v1";
  const SFX_VOLUME_KEY = "everrealm-sfx-volume-v1";
  const ZOOM_KEY = "everrealm-zoom";
  const HUD_COLLAPSED_KEY = "everrealm-hud-collapsed";
  const MOBILE_HUD_IDLE_MS = 10000;
  const MOBILE_HUD_MEDIA_QUERY = "(max-width: 820px) and (orientation: portrait)";
  const BATTLE_COMMAND_POSITION_KEY = "everrealm-battle-command-position-v1";
  const BATTLE_FACING_POSITION_KEY = "everrealm-battle-facing-position-v1";
  const LOCAL_BATTLE_RESUME_KEY = "everrealm-battle-resume-v1";
  const LOCAL_BATTLE_DEFEAT_KEY = "everrealm-battle-defeat-v1";
  const MOBILE_PROJECTED_FACING_MAP = Object.freeze({ up: "right", right: "down", down: "left", left: "up" });
  const SYSTEM_LOG_POSITION_KEY = "everrealm-system-log-position-v2";
  const SYSTEM_LOG_COLLAPSED_KEY = "everrealm-system-log-collapsed-v1";
  const PLAYER_GENDER_KEY = "everrealm-player-gender-v1";
  const INVENTORY_PAGE_SIZE = 15;
  const COMBAT_SCALE_VERSION = 2;
  const HP_SCALE = ClassData?.HP_SCALE || 5;
  const POTION_HEAL = 30 * HP_SCALE;
  const WEAK_POTION_TOTAL_STEPS = 500;
  const WEAK_POTION_WORLD_UNITS_PER_STEP = 32;
  const FIXED_STEP = 1 / 60;
  const query = new URLSearchParams(window.location.search);
  const testingMode = query.has("smoke") || query.has("autoplay");
  const autoplay = query.has("autoplay");
  const godModeRequested = testingMode && query.get("god") === "1";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const miniMap = document.getElementById("miniMap");
  const miniCtx = miniMap.getContext("2d");
  const miniMapWrap = miniMap.closest(".minimap-wrap");
  const worldClock = document.getElementById("worldClock");
  const stage = document.getElementById("gameStage");
  const titleScreen = document.getElementById("titleScreen");
  const dialoguePanel = document.getElementById("dialoguePanel");
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
  const soundEffectsMuteButton = document.getElementById("soundEffectsMuteButton");
  const soundEffectsVolumeSlider = document.getElementById("soundEffectsVolumeSlider");
  const soundEffectsVolumeValue = document.getElementById("soundEffectsVolumeValue");
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
  const worldChatForm = document.getElementById("worldChatForm");
  const worldChatInput = document.getElementById("worldChatInput");
  const guildCommissionDetailPanel = document.getElementById("guildCommissionDetailPanel");
  const guildCommissionDetailContent = document.getElementById("guildCommissionDetailContent");
  const guildCommissionDetailCloseButton = document.getElementById("guildCommissionDetailCloseButton");
  const ariaLive = document.getElementById("ariaLive");
  const playerHudPortraitCanvas = document.getElementById("playerHudPortraitCanvas");
  const playerHudPortraitCtx = playerHudPortraitCanvas.getContext("2d");
  const battleHud = document.getElementById("battleHud");
  const mapTransitionOverlay = document.getElementById("mapTransitionOverlay");
  const mapTransitionName = document.getElementById("mapTransitionName");
  const battleEntryTransition = document.getElementById("battleEntryTransition");
  const battleEntryName = document.getElementById("battleEntryName");
  const battleFacingPicker = document.getElementById("battleFacingPicker");
  const battleFacingDragHandle = battleFacingPicker?.querySelector("[data-battle-facing-drag-handle]");
  const battleActionDock = document.getElementById("battleActionDock");
  const battleVictoryOverlay = document.getElementById("battleVictoryOverlay");
  const battleVictoryContinue = document.getElementById("battleVictoryContinue");
  const classSelectPanel = document.getElementById("classSelectPanel");
  const skillBookConfirmPanel = document.getElementById("skillBookConfirmPanel");
  const skillDetailPanel = document.getElementById("skillDetailPanel");
  const abandonCommissionPanel = document.getElementById("abandonCommissionPanel");
  const battleUi = {
    round: document.getElementById("battleRoundLabel"),
    turn: document.getElementById("battleTurnLabel"),
    phase: document.getElementById("battlePhaseLabel"),
    unitLevel: document.getElementById("selectedUnitLevel"),
    unitName: document.getElementById("selectedUnitName"),
    hpFill: document.getElementById("selectedUnitHpFill"),
    hpText: document.getElementById("selectedUnitHpText"),
    apFill: document.getElementById("selectedUnitApFill"),
    apText: document.getElementById("selectedUnitApText"),
    commandAp: document.getElementById("battleCommandAp"),
    enemyRows: document.getElementById("battleEnemyRows"),
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
  let healingPotionCommandPending = false;
  let weakPotionCommandPending = false;
  let optimisticUiMutationPending = false;
  let guildQuestMutationPending = false;
  let guildQuestCommandSerial = 0;
  let lastAppliedServerRevision = 0;
  let guildEnvelopeOpenPending = false;
  let playerResetWrite = Promise.resolve({ saved: true, idle: true });
  let recoveryCommandPending = false;
  let recoveryCommandSerial = 0;
  let mapTransitionPending = false;
  let mapTransitionSerial = 0;
  let authUser = null;
  let authMode = "login";
  let pendingRegistrationCharacterName = "";
  let authSyncToken = 0;
  let authStateResolved = false;
  let legacyClaimUid = null;
  let openedChests = new Set();
  let ownedEquipment = ["novice_gloves", "traveller_coat"];
  let equipped = { head: null, weapon: "novice_gloves", upperBody: "traveller_coat", lowerBody: null, hands: null, feet: null, charm: null };
  let guildCommissionState = Guild.normalizeState();
  let pendingAbandonContractId = null;
  let guildMarks = 0;
  let guildRenown = 0;
  let inventory = {};
  let monsterKills = {};
  let skillState = Skills.createSkillState();
  let panelState = Panels.createInitialState(skillState);
  skillState = Panels.syncSkillState(panelState, skillState);
  let mainQuestState = MainQuest.emptyState();
  let selectedLoadoutPanelId = panelState.equippedPanelId;
  let pendingPanelEquipId = null;
  let playerClassId = Skills.DEFAULT_CLASS_ID || "fighter";
  let playerGender = "male";
  let pendingPlayerGender = "male";
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
  let pendingClickInteractionPoint = null;
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
  let selectedShopItemId = null;
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
  const FACILITY_TABS = Object.freeze(["status", "missions", "bag", "equipment", "deck", "guild", "shop", "skills", "codex"]);
  // Exploration camera zoom is continuous.  The endpoints are expressed in
  // authored world pixels: 1.0 is native image size and .35 is the far limit.
  const EXPLORE_ZOOM_MIN = .35;
  const EXPLORE_ZOOM_MAX = 1;
  const EXPLORE_ZOOM_DEFAULT = .592;
  const EXPLORE_ZOOM_WHEEL_SENSITIVITY = .0015;
  // Temporary development tuning: retreat always succeeds until the normal
  // level-difference formula is re-enabled.
  const RETREAT_CHANCE_OVERRIDE = 1;
  const FIGHTER_SHOP_ITEM_ID_SET = EquipmentData?.FIGHTER_SHOP_ITEM_ID_SET || new Set();
  const GENERAL_STORE_GOODS = Object.freeze([
    Object.freeze({ id: "healing_potion", name: "小型回復藥", price: 30, description: `回復 ${POTION_HEAL} HP。` }),
    Object.freeze({ id: "weak_potion", name: "弱氣之藥", price: 200, description: ItemData?.getItem?.("weak_potion")?.description || "一瓶來歷可疑的藥氣之藥。據說喝下後會令人變得孱弱，但身上散出的怪味，卻會令附近魔物蠢蠢欲動。" }),
  ]);
  const GENERAL_STORE_GOODS_BY_ID = new Map(GENERAL_STORE_GOODS.map((item) => [item.id, item]));
  const SHOP_SELL_RATE = 1 / 3;
  const FIGHTER_GUILD_BOOK_RANKS = new Map(
    (window.EverrealmFighterSkillData?.skills || []).map((sourceSkill) => {
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
  let dialogue = null;
  let dialogueChoiceIndex = 0;
  const dialogueUi = DialogueUi.create({
    getDom: () => ({
      dialogueText: document.getElementById("dialogueText"),
      dialogueChoices: document.getElementById("dialogueChoices"),
      dialogueNext: document.getElementById("dialogueNext"),
    }),
    getDialogue: () => dialogue,
    getChoiceIndex: () => dialogueChoiceIndex,
    createElement: (tagName) => document.createElement(tagName),
    onChooseDialogueOption: (index) => chooseDialogueOption(index),
  });
  const renderDialogue = () => dialogueUi.renderDialogue();
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
  const enemySessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  let autoTarget = null;
  let battle = null;
  let godModeActive = false;
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
  const battleFacingPosition = { manual: false, x: 0, y: 0, xRatio: null, yRatio: null, pointerId: null, offsetX: 0, offsetY: 0 };
  try {
    const savedBattleFacingPosition = JSON.parse(localStorage.getItem(BATTLE_FACING_POSITION_KEY));
    const xRatio = Number(savedBattleFacingPosition?.xRatio);
    const yRatio = Number(savedBattleFacingPosition?.yRatio);
    if (Number.isFinite(xRatio) && Number.isFinite(yRatio)) {
      battleFacingPosition.manual = true;
      battleFacingPosition.xRatio = Core.clamp(xRatio, 0, 1);
      battleFacingPosition.yRatio = Core.clamp(yRatio, 0, 1);
    }
  } catch (_) {}
  let encounterGrace = 1;
  let automaticPortalReady = false;
  let battleToken = 0;

  function createRandomEncounterRuntime() {
    return {
      mapId: null,
      enabled: false,
      loading: false,
      ready: false,
      failed: false,
      error: null,
      imagePath: null,
      loadToken: null,
      width: 0,
      height: 0,
      pixels: null,
      resolver: null,
      zones: [],
      zoneByColor: Object.create(null),
      checkDistancePx: 96,
      chancePerRoll: .18,
      safeDistanceRemaining: 0,
      distanceSinceRoll: 0,
      variance: { minDelta: -2, maxDelta: 3, floor: 1, cap: ExpansionWorld.MONSTER_LEVEL_CAP || 45 },
    };
  }

  let randomEncounterRuntime = createRandomEncounterRuntime();
  const legacySoundPreference = readPreference(SOUND_KEY, "on");
  let musicEnabled = readPreference(BGM_ENABLED_KEY, legacySoundPreference) !== "off";
  let sfxEnabled = readPreference(SFX_ENABLED_KEY, legacySoundPreference) !== "off";
  let bgmVolume = Core.clamp(Number(readPreference(BGM_VOLUME_KEY, "0.70")), 0, 1);
  if (!Number.isFinite(bgmVolume)) bgmVolume = .7;
  let sfxVolume = Core.clamp(Number(readPreference(SFX_VOLUME_KEY, readPreference(BGM_VOLUME_KEY, "0.70"))), 0, 1);
  if (!Number.isFinite(sfxVolume)) sfxVolume = .7;
  const bgm = Bgm.createBgmManager({ enabled: musicEnabled, volume: bgmVolume });
  const titleBgmAudio = typeof Audio === "function" ? new Audio("assets/audio/bgm/login-v1-01-loop.mp3") : null;
  const battleBgmAudio = typeof Audio === "function" ? new Audio("assets/audio/bgm/fighting-easy-mode-v1-01-loop.mp3") : null;
  const victoryBgmAudio = typeof Audio === "function" ? new Audio("assets/audio/bgm/victory-v1.mp3") : null;
  const defeatBgmAudio = typeof Audio === "function" ? new Audio("assets/audio/bgm/defeat-screen-v1.mp3") : null;
  const encounterTransitionAudio = typeof Audio === "function" ? new Audio("assets/audio/sfx/battle/common/encounter-transition-v2.mp3") : null;
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
  for (const music of [titleBgmAudio, battleBgmAudio, victoryBgmAudio, defeatBgmAudio]) {
    if (!music) continue;
    music.loop = true;
    music.preload = "auto";
    music.volume = bgmVolume;
  }
  if (encounterTransitionAudio) {
    encounterTransitionAudio.loop = false;
    encounterTransitionAudio.preload = "auto";
    encounterTransitionAudio.volume = sfxVolume;
  }
  let pageAudioSuspended = document.visibilityState !== "visible";
  let audioGestureUnlocked = false;

  function pauseMusicElement(element, reset = false) {
    if (!element) return;
    element.pause();
    if (reset) {
      try { element.currentTime = 0; } catch (_) {}
    }
  }

  function startTitleBgm({ restart = false } = {}) {
    bgm.setEnabled(false);
    pauseMusicElement(battleBgmAudio);
    pauseMusicElement(victoryBgmAudio);
    // Login/registration/title music is always enabled by default. A stale
    // in-game music preference from another account must not silence this flow.
    if (!titleBgmAudio || pageAudioSuspended || document.visibilityState !== "visible") return;
    if (restart) {
      try { titleBgmAudio.currentTime = 0; } catch (_) {}
    }
    titleBgmAudio.play().catch(() => {});
  }

  function stopTitleBgm({ reset = true } = {}) {
    pauseMusicElement(titleBgmAudio, reset);
  }

  function suspendGameAudio() {
    pageAudioSuspended = true;
    sound.suspend();
    bgm.suspend?.();
    titleBgmAudio?.pause();
    battleBgmAudio?.pause();
    victoryBgmAudio?.pause();
    defeatBgmAudio?.pause();
    encounterTransitionAudio?.pause();
  }

  function resumeGameAudio() {
    if (document.visibilityState !== "visible") return;
    pageAudioSuspended = false;
    sound.resume();
    if (mode === "title") {
      startTitleBgm();
      return;
    }
    if (!musicEnabled) {
      bgm.suspend?.();
      titleBgmAudio?.pause();
      battleBgmAudio?.pause();
      victoryBgmAudio?.pause();
      defeatBgmAudio?.pause();
      return;
    }
    stopTitleBgm({ reset: false });
    if ((mode === "battle" || mode === "dead") && battle) {
      bgm.setEnabled(false);
      if (mode === "dead" || battle.phase === "defeat") {
        battleBgmAudio?.pause();
        victoryBgmAudio?.pause();
        defeatBgmAudio?.play().catch(() => {});
      } else if (battle.phase === "victory") {
        battleBgmAudio?.pause();
        defeatBgmAudio?.pause();
        victoryBgmAudio?.play().catch(() => {});
      } else {
        victoryBgmAudio?.pause();
        defeatBgmAudio?.pause();
        battleBgmAudio?.play().catch(() => {});
      }
      return;
    }
    battleBgmAudio?.pause();
    victoryBgmAudio?.pause();
    defeatBgmAudio?.pause();
    bgm.setEnabled(true);
    bgm.resume?.();
    bgm.setMap(currentMapId);
  }

  function unlockGameAudioFromGesture() {
    if ((mode !== "title" && !musicEnabled && !sfxEnabled) || document.visibilityState !== "visible") return;
    const titlePlaying = mode === "title" && titleBgmAudio && titleBgmAudio.paused === false;
    const battlePlaying = (mode === "battle" || mode === "dead") && battle && (
      ((mode === "dead" || battle.phase === "defeat") && defeatBgmAudio && defeatBgmAudio.paused === false)
      || (battle.phase === "victory" && victoryBgmAudio && victoryBgmAudio.paused === false)
      || (battle.phase !== "victory" && battle.phase !== "defeat" && battleBgmAudio && battleBgmAudio.paused === false)
    );
    const mapPlaying = mode !== "title" && mode !== "battle" && mode !== "dead" && (bgm.snapshot?.().activeInstances || 0) > 0;
    if (audioGestureUnlocked && (titlePlaying || battlePlaying || mapPlaying || (mode !== "title" && !musicEnabled))) return;
    audioGestureUnlocked = true;
    resumeGameAudio();
  }

  function playEncounterTransitionSfx() {
    if (!encounterTransitionAudio || !sfxEnabled || sfxVolume <= 0 || pageAudioSuspended || document.visibilityState !== "visible") return;
    encounterTransitionAudio.pause();
    encounterTransitionAudio.volume = sfxVolume;
    try { encounterTransitionAudio.currentTime = 0; } catch (_) {}
    encounterTransitionAudio.play().catch(() => {});
  }

  function stopEncounterTransitionSfx({ reset = true } = {}) {
    if (!encounterTransitionAudio) return;
    encounterTransitionAudio.pause();
    if (reset) {
      try { encounterTransitionAudio.currentTime = 0; } catch (_) {}
    }
  }

  function startBattleBgm() {
    window.EverrealmFootstepsRuntime?.suspend();
    stopTitleBgm({ reset: false });
    pauseMusicElement(victoryBgmAudio, true);
    pauseMusicElement(defeatBgmAudio, true);
    bgm.setEnabled(false);
    if (!battleBgmAudio || !musicEnabled || pageAudioSuspended || document.visibilityState !== "visible") return;
    try { battleBgmAudio.currentTime = 0; } catch (_) {}
    battleBgmAudio.play().catch(() => {});
  }

  function startVictoryBgm() {
    stopTitleBgm({ reset: false });
    pauseMusicElement(battleBgmAudio, true);
    pauseMusicElement(defeatBgmAudio, true);
    bgm.setEnabled(false);
    if (!victoryBgmAudio || !musicEnabled || pageAudioSuspended || document.visibilityState !== "visible") return;
    try { victoryBgmAudio.currentTime = 0; } catch (_) {}
    victoryBgmAudio.play().catch(() => {});
  }

  function startDefeatBgm() {
    window.EverrealmFootstepsRuntime?.suspend();
    stopTitleBgm({ reset: false });
    pauseMusicElement(battleBgmAudio, true);
    pauseMusicElement(victoryBgmAudio, true);
    bgm.setEnabled(false);
    if (!defeatBgmAudio || !musicEnabled || pageAudioSuspended || document.visibilityState !== "visible") return;
    try { defeatBgmAudio.currentTime = 0; } catch (_) {}
    defeatBgmAudio.play().catch(() => {});
  }

  function stopBattleBgm() {
    window.EverrealmFootstepsRuntime?.resume();
    pauseMusicElement(battleBgmAudio, true);
    pauseMusicElement(victoryBgmAudio, true);
    pauseMusicElement(defeatBgmAudio, true);
    // closeBattleHud() is also called while authentication/new-game flows are
    // still on the title screen. Do not briefly start map music underneath the
    // title/login track in that state; real battle exits still resume map BGM.
    if (mode === "title") {
      bgm.setEnabled(false);
      return;
    }
    bgm.setEnabled(musicEnabled);
    if (musicEnabled) bgm.setMap(currentMapId);
    if (pageAudioSuspended) bgm.suspend?.();
  }
  if (pageAudioSuspended) {
    sound.suspend();
    bgm.suspend?.();
  }
  const storedExploreZoomPreference = readPreference(ZOOM_KEY, String(EXPLORE_ZOOM_DEFAULT));
  const storedExploreZoom = {
    far: EXPLORE_ZOOM_MIN,
    mid: EXPLORE_ZOOM_DEFAULT,
    near: EXPLORE_ZOOM_MAX,
  }[storedExploreZoomPreference] ?? Number(storedExploreZoomPreference);
  let exploreZoom = Number.isFinite(storedExploreZoom)
    ? Core.clamp(storedExploreZoom, EXPLORE_ZOOM_MIN, EXPLORE_ZOOM_MAX)
    : EXPLORE_ZOOM_DEFAULT;
  let hudCollapsed = readPreference(HUD_COLLAPSED_KEY, "0") === "1";
  let mobileHudIdleTimer = 0;
  let mobileHudModeActive = false;

  const player = createPlayer();
  serverCommandPositionProvider = () => ({ mapId: currentMapId, x: player.x, y: player.y });

  let worldTimeLoadStarted = false;
  let worldClockText = "";
  let realtimeStartPromise = null;
  let chatStartPromise = null;
  let realtimeSessionToken = 0;

  function realtimePlayerSnapshot(state = ["battle", "dead"].includes(mode) ? "battle" : "exploring") {
    return {
      uid: authenticatedUid(),
      mapId: currentMapId,
      name: playerDisplayName(),
      classId: playerClassId,
      gender: normalizeGender(player.gender),
      x: player.x,
      y: player.y,
      facing: player.facing,
      state,
      moving: state === "exploring" && Boolean(player.moving),
    };
  }

  function ensureWorldTimeLoaded() {
    if (!worldTime || worldTimeLoadStarted) return;
    worldTimeLoadStarted = true;
    void worldTime.load();
  }

  function syncWorldClock() {
    if (!worldClock) return;
    const next = worldTime?.getTime()?.display || "101年 --月--日   --:--";
    if (next === worldClockText) return;
    worldClockText = next;
    worldClock.textContent = next;
  }

  function startRealtimeSession() {
    const uid = authenticatedUid();
    if (!uid) return;
    const token = ++realtimeSessionToken;
    if (multiplayer) {
      realtimeStartPromise = multiplayer.start({
        uid,
        getPlayer: () => realtimePlayerSnapshot(),
      }).then((started) => {
        if (token !== realtimeSessionToken) {
          if (started) void multiplayer.stop();
          return false;
        }
        return started;
      }).catch((error) => {
        console.warn("Everrealm multiplayer unavailable.", error);
        return false;
      });
    }
    if (worldChat) {
      chatStartPromise = worldChat.start({ uid, name: playerDisplayName() }).then((started) => {
        if (token !== realtimeSessionToken) {
          if (started) worldChat.stop();
          return false;
        }
        return started;
      }).catch((error) => {
        console.warn("Everrealm world chat unavailable.", error);
        return false;
      });
    }
  }

  function stopRealtimeSession() {
    realtimeSessionToken += 1;
    realtimeStartPromise = null;
    chatStartPromise = null;
    if (multiplayer?.isActive?.()) void multiplayer.stop();
    worldChat?.stop?.();
  }

  function syncRealtimeState(state) {
    if (!multiplayer) return;
    if (multiplayer.isActive?.()) {
      multiplayer.setState(state);
      return;
    }
    void realtimeStartPromise?.then((started) => {
      if (started && multiplayer.isActive?.()) multiplayer.setState(state);
    });
  }

  function syncRealtimeMap() {
    if (!multiplayer?.isActive?.()) return;
    void multiplayer.setMap(currentMapId);
  }

  function syncRealtimeExploration() {
    if (!multiplayer?.isActive?.() || mode !== "playing") return;
    multiplayer.updateLocal(realtimePlayerSnapshot("exploring"));
  }

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

  class SoundEngine {
    constructor() {
      this.context = null;
      this.suspended = document.visibilityState !== "visible";
    }
    ensure() {
      if (!sfxEnabled || sfxVolume <= 0 || this.suspended || document.visibilityState !== "visible" || !audioGestureUnlocked) return null;
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
      if (sfxEnabled && document.visibilityState === "visible" && this.context?.state === "suspended") {
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
      gain.gain.exponentialRampToValueAtTime((options.gain || 0.045) * sfxVolume, now + 0.012);
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

  function normalizeGender(value, fallback = "male") {
    const gender = String(value || "").trim().toLowerCase();
    return gender === "female" || gender === "male" ? gender : fallback;
  }

  function rememberPlayerGender(value) {
    const gender = normalizeGender(value);
    try { localStorage.setItem(PLAYER_GENDER_KEY, gender); } catch (_) {}
    return gender;
  }

  function rememberedPlayerGender() {
    try {
      const stored = localStorage.getItem(PLAYER_GENDER_KEY);
      if (stored === "female" || stored === "male") return stored;
      for (const key of ["everrealm-save-v1"]) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          const legacy = String(parsed?.player?.gender || "").trim().toLowerCase();
          if (legacy === "female" || legacy === "male") return legacy;
        } catch (_) {}
      }
    } catch (_) {}
    return null;
  }

  function resolveMissingSavedGender() {
    const remembered = rememberedPlayerGender();
    if (remembered) return remembered;
    if (testingMode || typeof window.confirm !== "function") return "male";
    const useFemale = window.confirm("舊存檔未有角色性別資料。\n\n確定：女角色\n取消：男角色");
    return useFemale ? "female" : "male";
  }

  function createPlayer() {
    return {
      name: "阿巡",
      gender: normalizeGender(playerGender),
      x: world.start.x,
      y: world.start.y,
      radius: 12,
      facing: "up",
      hp: 88 * HP_SCALE,
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
    return true;
  }

  function equippedWeaponName() {
    return equipmentItem(equipped.weapon)?.name || "見習拳套";
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
      instanceId: `${enemySessionId}:${id}:${enemySerial++}`,
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
    // scale exploration spawns to the authored monster progression;
    // doing so destroys the fixed Lv1→45 progression ladder.
    enemies = world.enemySpawns.map((spawn) => makeEnemy(spawn));
    projectiles = [];
    drops = [];
    resetRandomEncounterRuntime();
  }

  function encounterColorKey(r, g, b) {
    return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Number(value) || 0)).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  }

  function normalizeEncounterZone(raw) {
    const color = String(raw?.color || "").trim().toUpperCase();
    const range = Array.isArray(raw?.levelRange) ? raw.levelRange : [];
    const minLevel = Math.max(1, Math.floor(Number(range[0]) || 1));
    const maxLevel = Math.max(minLevel, Math.floor(Number(range[1]) || minLevel));
    const rgb = /^#?([0-9A-F]{6})$/i.test(color)
      ? [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)]
      : null;
    if (!rgb) return null;
    return {
      color: color.startsWith("#") ? color : `#${color}`,
      label: String(raw?.label || `Lv${minLevel}-${maxLevel}`),
      minLevel,
      maxLevel,
      rgb,
    };
  }

  function resetRandomEncounterRuntime() {
    randomEncounterRuntime = createRandomEncounterRuntime();
    const config = world?.randomEncounters;
    if (!config?.enabled) return;
    const zones = (Array.isArray(config.zones) ? config.zones : []).map(normalizeEncounterZone).filter(Boolean);
    const zoneByColor = Object.create(null);
    for (const zone of zones) zoneByColor[zone.color] = zone;
    const variance = config.monsterLevelVariance || {};
    randomEncounterRuntime = {
      ...randomEncounterRuntime,
      mapId: currentMapId,
      enabled: true,
      imagePath: config.maskImage || null,
      resolver: config.resolver || null,
      zones,
      zoneByColor,
      checkDistancePx: Math.max(8, Math.round(Number(config.checkDistancePx) || 96)),
      chancePerRoll: Core.clamp(Number(config.chancePerRoll) || .18, 0, 1),
      safeDistanceRemaining: Math.max(0, Number(config.transitionGraceDistancePx) || 0),
      variance: {
        minDelta: Math.floor(Number(variance.minDelta) || -2),
        maxDelta: Math.floor(Number(variance.maxDelta) || 3),
        floor: Math.max(1, Math.floor(Number(variance.floor) || 1)),
        cap: Math.max(1, Math.floor(Number(variance.cap) || ExpansionWorld.MONSTER_LEVEL_CAP || 45)),
      },
    };
    if (typeof randomEncounterRuntime.resolver?.zoneAtWorldPosition === "function") {
      randomEncounterRuntime.ready = true;
      randomEncounterRuntime.loading = false;
      randomEncounterRuntime.failed = false;
      return;
    }
    if (!config.maskImage || typeof Image !== "function") {
      randomEncounterRuntime.failed = true;
      randomEncounterRuntime.error = "encounter-mask-unavailable";
      return;
    }
    const loadToken = `${currentMapId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    randomEncounterRuntime.loading = true;
    randomEncounterRuntime.loadToken = loadToken;
    const image = new Image();
    image.onload = () => {
      if (randomEncounterRuntime.loadToken !== loadToken) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx || !canvas.width || !canvas.height) throw new Error("encounter-mask-context");
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        randomEncounterRuntime.loading = false;
        randomEncounterRuntime.ready = true;
        randomEncounterRuntime.failed = false;
        randomEncounterRuntime.error = null;
        randomEncounterRuntime.width = canvas.width;
        randomEncounterRuntime.height = canvas.height;
        randomEncounterRuntime.pixels = pixels;
      } catch (error) {
        randomEncounterRuntime.loading = false;
        randomEncounterRuntime.ready = false;
        randomEncounterRuntime.failed = true;
        randomEncounterRuntime.error = String(error?.message || error || "encounter-mask-read-failed");
      }
    };
    image.onerror = () => {
      if (randomEncounterRuntime.loadToken !== loadToken) return;
      randomEncounterRuntime.loading = false;
      randomEncounterRuntime.ready = false;
      randomEncounterRuntime.failed = true;
      randomEncounterRuntime.error = config.maskImage || "encounter-mask-load-failed";
    };
    image.src = config.maskImage;
  }

  function nearestEncounterZoneByRgb(r, g, b) {
    let best = null;
    let bestDistance = Infinity;
    for (const zone of randomEncounterRuntime.zones) {
      const [zr, zg, zb] = zone.rgb;
      const distance = (zr - r) ** 2 + (zg - g) ** 2 + (zb - b) ** 2;
      if (distance < bestDistance) {
        best = zone;
        bestDistance = distance;
      }
    }
    return bestDistance <= 1728 ? best : null;
  }

  function encounterZoneAtWorldPosition(x, y) {
    if (!randomEncounterRuntime.enabled || !randomEncounterRuntime.ready) return null;
    if (typeof randomEncounterRuntime.resolver?.zoneAtWorldPosition === "function") {
      return randomEncounterRuntime.resolver.zoneAtWorldPosition(x, y, world?.pixelWidth, world?.pixelHeight);
    }
    if (!randomEncounterRuntime.pixels) return null;
    const mapWidth = Math.max(1, Number(world?.pixelWidth) || randomEncounterRuntime.width || 1);
    const mapHeight = Math.max(1, Number(world?.pixelHeight) || randomEncounterRuntime.height || 1);
    const px = Core.clamp(Math.round((Core.clamp(Number(x) || 0, 0, mapWidth) / mapWidth) * Math.max(0, randomEncounterRuntime.width - 1)), 0, Math.max(0, randomEncounterRuntime.width - 1));
    const py = Core.clamp(Math.round((Core.clamp(Number(y) || 0, 0, mapHeight) / mapHeight) * Math.max(0, randomEncounterRuntime.height - 1)), 0, Math.max(0, randomEncounterRuntime.height - 1));
    const index = (py * randomEncounterRuntime.width + px) * 4;
    const r = randomEncounterRuntime.pixels[index] || 0;
    const g = randomEncounterRuntime.pixels[index + 1] || 0;
    const b = randomEncounterRuntime.pixels[index + 2] || 0;
    const alpha = randomEncounterRuntime.pixels[index + 3] || 0;
    if (alpha < 8) return null;
    if (r === 0 && g === 0 && b === 0) return null;
    return randomEncounterRuntime.zoneByColor[encounterColorKey(r, g, b)] || nearestEncounterZoneByRgb(r, g, b);
  }

  function monsterEncounterLevelWindow(blueprint) {
    const variance = randomEncounterRuntime.variance || {};
    const minLevel = Math.max(variance.floor || 1, blueprint.baseLevel + (variance.minDelta || 0));
    const maxLevel = Math.max(minLevel, Math.min(variance.cap || ExpansionWorld.MONSTER_LEVEL_CAP || 45, blueprint.baseLevel + (variance.maxDelta || 0)));
    return [minLevel, maxLevel];
  }

  function encounterCandidatesForZone(zone) {
    const allow = Array.isArray(world?.randomEncounters?.allowedMonsters) && world.randomEncounters.allowedMonsters.length
      ? new Set(world.randomEncounters.allowedMonsters.map((id) => ExpansionWorld.normalizeMonsterId(id)).filter(Boolean))
      : null;
    return (ExpansionWorld.CANONICAL_MONSTER_IDS || [])
      .map((id) => ExpansionWorld.monsterBlueprint(id))
      .filter(Boolean)
      .filter((blueprint) => !allow || allow.has(blueprint.id))
      .map((blueprint) => {
        const [minLevel, maxLevel] = monsterEncounterLevelWindow(blueprint);
        return { blueprint, id: blueprint.id, minLevel, maxLevel };
      })
      .filter((candidate) => candidate.maxLevel >= zone.minLevel && candidate.minLevel <= zone.maxLevel);
  }

  function randomIntegerInRange(min, max) {
    const low = Math.floor(Math.min(min, max));
    const high = Math.floor(Math.max(min, max));
    return low + Math.floor(Math.random() * (high - low + 1));
  }

  function createRandomEncounterSource(zone) {
    const candidates = encounterCandidatesForZone(zone);
    if (!candidates.length) return null;
    const sampledZoneLevel = randomIntegerInRange(zone.minLevel, zone.maxLevel);
    let eligible = candidates.filter((candidate) => sampledZoneLevel >= candidate.minLevel && sampledZoneLevel <= candidate.maxLevel);
    if (!eligible.length) eligible = candidates;
    const chosen = eligible[Math.floor(Math.random() * eligible.length)] || eligible[0];
    if (!chosen) return null;
    const minLevel = Math.max(zone.minLevel, chosen.minLevel);
    const maxLevel = Math.min(zone.maxLevel, chosen.maxLevel);
    const level = randomIntegerInRange(minLevel, maxLevel);
    const spawn = {
      id: `mask-encounter-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      type: chosen.id,
      x: player.x,
      y: player.y,
      level,
      name: chosen.blueprint.name_zh,
    };
    const source = makeEnemy(spawn, { id: spawn.id, x: player.x, y: player.y, level });
    source.randomEncounter = true;
    source.encounterZone = zone.label;
    source.encounterColor = zone.color;
    return source;
  }

  function updateRandomEncounters(travelDistance) {
    if (!(travelDistance > 0) || mode !== "playing" || battle) return false;
    if (!randomEncounterRuntime.enabled || !randomEncounterRuntime.ready || randomEncounterRuntime.failed) return false;
    if (randomEncounterRuntime.mapId !== currentMapId) return false;
    const zone = encounterZoneAtWorldPosition(player.x, player.y);
    if (!zone) {
      randomEncounterRuntime.distanceSinceRoll = 0;
      return false;
    }
    if (encounterGrace > 0) return false;
    if (randomEncounterRuntime.safeDistanceRemaining > 0) {
      randomEncounterRuntime.safeDistanceRemaining = Math.max(0, randomEncounterRuntime.safeDistanceRemaining - travelDistance);
      return false;
    }
    randomEncounterRuntime.distanceSinceRoll += travelDistance;
    while (randomEncounterRuntime.distanceSinceRoll >= randomEncounterRuntime.checkDistancePx) {
      randomEncounterRuntime.distanceSinceRoll -= randomEncounterRuntime.checkDistancePx;
      if (Math.random() > randomEncounterRuntime.chancePerRoll) continue;
      const source = createRandomEncounterSource(zone);
      if (!source) continue;
      if (startBattle(source)) {
        randomEncounterRuntime.distanceSinceRoll = 0;
        randomEncounterRuntime.safeDistanceRemaining = Math.max(0, Number(world?.randomEncounters?.postEncounterGraceDistancePx) || 0);
        return true;
      }
    }
    return false;
  }

  function readPreference(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
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
    playerClassId = Skills.CLASS_IDS?.includes(classId) ? classId : (Skills.DEFAULT_CLASS_ID || "fighter");
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
    skillState = Skills.createSkillState({ classId: playerClassId });
    panelState = Panels.createInitialState(skillState);
    skillState = Panels.syncSkillState(panelState, skillState);
    mainQuestState = MainQuest.emptyState();
    selectedLoadoutPanelId = panelState.equippedPanelId;
    pendingPanelEquipId = null;
    facilityTab = "bag";
    facilityContext = "portable";
    selectedInventoryItemId = null;
    pendingInventoryDestroyItemId = null;
    inventoryCategory = "all";
    inventoryPage = 0;
    equipmentShopCategory = "weapon";
    shopTradeMode = "buy";
    selectedShopItemId = null;
    inventoryFixtureCount = 0;
    weakPotionStepsRemaining = 0;
    weakPotionDistanceRemainder = 0;
  }

  function loadExpansionProgress(raw) {
    const data = raw && typeof raw === "object" ? raw : {};
    skillState = Skills.normalizeSkillState(data.skills, { classId: data.classId || data.skills?.classId });
    panelState = Panels.normalizeState(data.panels, skillState);
    skillState = Panels.syncSkillState(panelState, skillState);
    mainQuestState = MainQuest.normalizeState(data.mainQuest);
    selectedLoadoutPanelId = panelState.equippedPanelId;
    pendingPanelEquipId = null;
    playerClassId = skillState.classId;
    const starterGear = Expansion.starterEquipmentForClass(playerClassId);
    const starterWeapon = starterGear.weapon;
    const starterUpperBody = starterGear.upperBody;
    const knownEquipment = new Set(Expansion.DEFAULT_EQUIPMENT_CATALOG.map((item) => item.id));
    const savedOwned = Array.isArray(data.ownedEquipment) ? data.ownedEquipment.filter((id) => knownEquipment.has(id)) : [];
    const ownedWithStarters = [...savedOwned];
    for (const starterId of [starterWeapon, starterUpperBody]) {
      if (!ownedWithStarters.includes(starterId)) ownedWithStarters.push(starterId);
    }
    const gearState = Expansion.normalizeEquipmentState({
      coins: player.coins,
      level: player.level,
      ownedEquipment: ownedWithStarters,
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

  }

  function buildSaveData() {
    return {
      version: 1,
      combatScaleVersion: COMBAT_SCALE_VERSION,
      player: {
        name: playerDisplayName(),
        gender: normalizeGender(player.gender),
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
        skills: Skills.normalizeSkillState(skillState),
        panels: Panels.normalizeState(panelState, skillState),
        mainQuest: MainQuest.normalizeState(mainQuestState),
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

  function syncDeckCapacityMilestones() {
    // Skill capacity now belongs to the equipped panel. Guild rank no longer
    // mutates a shared deck size; each owned panel keeps its own slots.
    return [];
  }

  function maintainGodModeState() {
    if (!godModeActive) return;
    const stats = playerStats();
    player.hp = stats.maxHp;
    player.invulnerable = Number.POSITIVE_INFINITY;
    if (battle) {
      battle.hero.hp = battle.hero.maxHp;
      battle.hero.alive = true;
      battle.ap = BATTLE_AP_MAX;
    }
  }

  function setGodMode(enabled = true, { silent = false } = {}) {
    if (!testingMode) return { ok: false, reason: "debug-only", active: godModeActive };
    godModeActive = Boolean(enabled);
    let skillResult = null;
    if (godModeActive) {
      skillResult = Skills.createGodModeSkillState(skillState);
      if (skillResult.ok) skillState = skillResult.state;
      maintainGodModeState();
      markPersistenceDirty();
    } else {
      player.invulnerable = 0;
    }
    if (facilityWindows.size) renderFacility();
    updateHud(true);
    if (!silent && mode === "playing") {
      showToast(godModeActive
        ? "DEBUG God Mode 已開：全技能解鎖、技能書齊、無敵、AP 無限"
        : "DEBUG God Mode 已關閉", "good");
    }
    return { ok: true, reason: null, active: godModeActive, skillResult };
  }

  function newGame(skipIntro = false, classId = Skills.DEFAULT_CLASS_ID || "fighter", gender = playerGender) {
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
    playerGender = rememberPlayerGender(gender);
    resetPlayer();
    if (registeredName) player.name = registeredName;
    resetExpansionProgress(classId);
    openedChests = new Set();
    playTime = 0;
    resetEnemies();
    camera.x = player.x;
    camera.y = player.y;
    camera.zoom = targetZoom();
    hideAllOverlays();
    titleScreen.hidden = true;
    mode = "playing";
    stage.dataset.gameState = mode;
    if (godModeRequested || godModeActive) setGodMode(true, { silent: true });
    syncAccountStatus(savePersistence?.getCloudStatus?.());
    stopTitleBgm();
    bgm.setEnabled(musicEnabled);
    bgm.setMap(currentMapId);
    sound.start();
    showLocation("米克雷帝國", true);
    systemLogEntries = [];
    addSystemMessage("system", "旅程開始");
    if (!skipIntro) showToast("沿山路自由探索；想接工作就隨時返公會查看委託。", "good");
    updateHud(true);
    canvas.focus({ preventScroll: true });
    if (!testingMode) {
      if (savePersistence?.hasCloudSave?.() && typeof savePersistence.resetCloudSave === "function") {
        const resetPayload = buildSaveData();
        playerResetWrite = savePersistence.resetCloudSave(resetPayload).then((result) => {
          persistenceFingerprint = getPersistenceFingerprint();
          persistence?.markSaved(persistenceFingerprint);
          syncAccountStatus(savePersistence?.getCloudStatus?.());
          return result;
        }).catch((error) => {
          console.warn("Everrealm server-authoritative journey reset failed.", error);
          showToast("新旅程未能同步到伺服器，請重新登入後再試。", "danger");
          return { saved: false, error };
        });
      } else {
        saveImportant(false);
      }
    }
    ensureWorldTimeLoaded();
    startRealtimeSession();
    if (registeredName) pendingRegistrationCharacterName = "";
  }

  function requestNewGame() {
    if (!requireAuthenticatedGameplay()) return;
    if (!testingMode && savePersistence?.hasCloudSave?.() && !window.confirm("開始新旅程會覆蓋而家嘅存檔。確定重新出發？")) return;
    pendingPlayerGender = normalizeGender(player.gender);
    classSelectPanel.hidden = false;
    updateGenderChoiceUi();
    drawClassSelectionPreviews();
    classSelectPanel.querySelector("[data-class-choice]")?.focus({ preventScroll: true });
  }

  function startNewGameWithClass(classId) {
    classSelectPanel.hidden = true;
    newGame(false, classId, pendingPlayerGender);
  }

  let battleSnapshotPersistTimer = null;

  function safeLocalJsonGet(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function safeLocalJsonSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function safeLocalRemove(key) {
    try { localStorage.removeItem(key); } catch (_) {}
  }

  function clearBattlePersistenceSnapshots() {
    if (battleSnapshotPersistTimer != null) {
      window.clearTimeout(battleSnapshotPersistTimer);
      battleSnapshotPersistTimer = null;
    }
    safeLocalRemove(LOCAL_BATTLE_RESUME_KEY);
    safeLocalRemove(LOCAL_BATTLE_DEFEAT_KEY);
  }

  function normalizeStoredBattleSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null;
    // Tactical cache has no time expiry. It is keyed by battleId and is cleared
    // when the authoritative battle settles/cancels, so age alone must never
    // destroy a resumable board state.
    return snapshot.version === 1 ? snapshot : null;
  }

  function readPersistedBattleResumeSnapshot(expectedBattleId = null) {
    const snapshot = normalizeStoredBattleSnapshot(safeLocalJsonGet(LOCAL_BATTLE_RESUME_KEY));
    if (!snapshot) return null;
    if (expectedBattleId && snapshot.battleId && String(snapshot.battleId) !== String(expectedBattleId)) return null;
    return snapshot;
  }

  function readPersistedBattleDefeatSnapshot() {
    const snapshot = normalizeStoredBattleSnapshot(safeLocalJsonGet(LOCAL_BATTLE_DEFEAT_KEY));
    if (!snapshot) return null;
    if (snapshot.phase !== "defeat" && Number(snapshot.hero?.hp) > 0) return null;
    return snapshot;
  }

  function serializeLocalBattleUnit(unit) {
    if (!unit) return null;
    return {
      id: String(unit.id || ""),
      type: unit.type || "",
      name: unit.name || "",
      level: Math.max(1, Math.floor(Number(unit.level) || 1)),
      hp: Math.max(0, Number(unit.hp) || 0),
      maxHp: Math.max(1, Number(unit.maxHp) || 1),
      alive: unit.alive !== false && Number(unit.hp) > 0,
      cell: unit.cell ? copyBattleCell(unit.cell) : null,
      facing: unit.facing || "right",
      side: unit.side || "enemy",
    };
  }

  function buildLocalBattleSnapshot(currentBattle = battle, options = {}) {
    if (!currentBattle || !currentBattle.hero || !Array.isArray(currentBattle.enemies)) return null;
    const defeatPhase = options.defeat === true || currentBattle.phase === "defeat" || mode === "dead" || Number(currentBattle.hero.hp) <= 0;
    return {
      version: 1,
      storedAt: Date.now(),
      mapId: currentMapId,
      battleId: currentBattle.serverBattleId || null,
      phase: defeatPhase ? "defeat" : "planning_move",
      round: Math.max(1, Math.floor(Number(currentBattle.round) || 1)),
      ap: Math.max(0, Number(currentBattle.ap) || 0),
      source: {
        id: String(currentBattle.source?.id || "resume-local"),
        instanceId: String(currentBattle.source?.instanceId || currentBattle.source?.id || "resume-local"),
        type: String(currentBattle.source?.type || ""),
        name: currentBattle.source?.name || "戰鬥",
        level: Math.max(1, Math.floor(Number(currentBattle.source?.level) || 1)),
        boss: Boolean(currentBattle.source?.boss),
        x: Number(currentBattle.source?.x) || 0,
        y: Number(currentBattle.source?.y) || 0,
      },
      hero: serializeLocalBattleUnit(currentBattle.hero),
      enemies: currentBattle.enemies.map((enemy) => serializeLocalBattleUnit(enemy)).filter(Boolean),
    };
  }

  function persistBattleResumeState(options = {}) {
    const snapshot = buildLocalBattleSnapshot(options.battle || battle, options);
    if (!snapshot) return false;
    safeLocalJsonSet(LOCAL_BATTLE_RESUME_KEY, snapshot);
    if (options.defeat || snapshot.phase === "defeat") safeLocalJsonSet(LOCAL_BATTLE_DEFEAT_KEY, snapshot);
    return true;
  }

  function schedulePersistBattleResumeState(options = {}) {
    if (!(options.battle || battle)) return false;
    if (battleSnapshotPersistTimer != null) window.clearTimeout(battleSnapshotPersistTimer);
    battleSnapshotPersistTimer = window.setTimeout(() => {
      battleSnapshotPersistTimer = null;
      persistBattleResumeState(options);
    }, Math.max(0, Number(options.delayMs) || 120));
    return true;
  }

  function battleSourceFromLocalSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null;
    const type = ExpansionWorld.normalizeMonsterId(snapshot.source?.type) || String(snapshot.source?.type || "").trim();
    const blueprint = type ? ExpansionWorld.monsterBlueprint(type) : null;
    const base = type ? enemyTypes[type] : null;
    if (!type || (!blueprint && !base)) return null;
    const level = Core.clamp(Math.floor(Number(snapshot.source?.level) || blueprint?.baseLevel || 1), 1, 45);
    const stats = blueprint ? ExpansionWorld.monsterStatsAtLevel(type, level) : null;
    const encounterId = String(snapshot.source?.instanceId || snapshot.source?.id || snapshot.battleId || `resume-${type}`);
    return {
      id: encounterId,
      instanceId: encounterId,
      alive: true,
      encounterCooldown: 0,
      type,
      name: snapshot.source?.name || blueprint?.name_zh || base?.name || type,
      level,
      boss: Boolean(snapshot.source?.boss),
      damage: stats?.attack || base?.damage || 1,
      defence: stats?.defense ?? base?.defence ?? 0,
      xp: blueprint?.rewards?.baseXp ?? base?.xp ?? 0,
      coins: blueprint?.rewards?.coins ?? base?.coins ?? 0,
      moveRange: blueprint?.moveRange ?? stats?.moveRange ?? base?.moveRange ?? 4,
      x: Number(snapshot.source?.x) || Number(player.x) || 0,
      y: Number(snapshot.source?.y) || Number(player.y) || 0,
      color: base?.color || "#ffc857",
    };
  }

  function applyLocalBattleSnapshot(targetBattle, snapshot, options = {}) {
    if (!targetBattle || !snapshot || typeof snapshot !== "object") return false;
    const authorityLocked = options.authorityLocked === true;
    if (snapshot.hero?.cell) targetBattle.hero.cell = copyBattleCell(snapshot.hero.cell);
    if (snapshot.hero?.facing) targetBattle.hero.facing = String(snapshot.hero.facing);
    if (!authorityLocked && Number.isFinite(Number(snapshot.hero?.hp))) {
      targetBattle.hero.hp = Core.clamp(Number(snapshot.hero.hp), 0, targetBattle.hero.maxHp);
      targetBattle.hero.alive = targetBattle.hero.hp > 0;
      player.hp = targetBattle.hero.hp;
    }
    for (let index = 0; index < targetBattle.enemies.length; index += 1) {
      const local = targetBattle.enemies[index];
      const stored = snapshot.enemies?.[index];
      if (!local || !stored) continue;
      if (stored.cell) local.cell = copyBattleCell(stored.cell);
      if (stored.facing) local.facing = String(stored.facing);
      if (!authorityLocked && Number.isFinite(Number(stored.maxHp))) local.maxHp = Math.max(1, Number(stored.maxHp));
      if (!authorityLocked && Number.isFinite(Number(stored.hp))) local.hp = Core.clamp(Number(stored.hp), 0, local.maxHp);
      if (!authorityLocked) local.alive = stored.alive !== false && local.hp > 0;
    }
    if (!authorityLocked && Number.isFinite(Number(snapshot.round))) targetBattle.round = Math.max(1, Math.floor(Number(snapshot.round)));
    if (!authorityLocked && Number.isFinite(Number(snapshot.ap))) targetBattle.ap = Core.clamp(Math.floor(Number(snapshot.ap)), 0, BATTLE_AP_MAX);

    const visualOnly = options.visualOnly === true;
    targetBattle.phase = visualOnly ? "defeat" : "planning_move";
    targetBattle.moveBonusNext = 0;
    targetBattle.evasion = 0;
    targetBattle.moved = false;
    targetBattle.guard = false;
    targetBattle.guardReduction = 0;
    targetBattle.selectedAction = "move";
    targetBattle.cursor = { ...targetBattle.hero.cell };
    targetBattle.heroMoveDraft = [{ ...targetBattle.hero.cell }];
    targetBattle.heroMoveCommands = [];
    targetBattle.heroMovePlan = null;
    targetBattle.awaitingFacing = true;
    targetBattle.movementResolution = null;
    targetBattle.actionResolution = null;
    targetBattle.actingUnitId = null;
    targetBattle.actingUnitIds = [];
    targetBattle.predictedRoundPending = false;
    targetBattle.serverSyncPending = false;
    targetBattle.enemyPlans = visualOnly ? [] : planEnemyRound();
    targetBattle.message = visualOnly ? "請選擇復活方式。" : "已重新連接上一場戰鬥。";
    targetBattle.messageDanger = visualOnly;
    updateHud(true);
    updateBattleUi();
    return true;
  }

  function resumeDefeatPresentationFromSnapshot(snapshot) {
    const source = battleSourceFromLocalSnapshot(snapshot);
    if (!source) return false;
    return startBattle(source, true, { localResumeSnapshot: snapshot, localVisualOnly: true });
  }

  function applySaveData(rawSave, options = {}) {
    const save = Core.sanitizeSave(rawSave);
    if (!save) {
      if (!options.silent) showToast("搵唔到可用嘅存檔", "danger");
      return false;
    }
    // Baseline the monotonic server revision from Firestore. Authoritative
    // callable responses carry the same field, allowing late responses to be
    // ignored instead of rewinding newer client state.
    lastAppliedServerRevision = Math.max(0, Math.floor(Number(rawSave?.stateRevision) || 0));
    closeBattleHud();
    encounterGrace = 1.2;
    automaticPortalReady = false;
    const savedMapId = rawSave?.expansion?.currentMapId === "dungeon" ? "mountain-southeast" : rawSave?.expansion?.currentMapId;
    currentMapId = hasMap(savedMapId) ? savedMapId : "world";
    world = maps[currentMapId];
    clearExploreMovePath();
    pendingClickInteractionId = null;
    resetPlayer();
    Object.assign(player, save.player);
    const remoteGender = String(rawSave?.player?.gender || "").trim().toLowerCase();
    const missingRemoteGender = remoteGender !== "female" && remoteGender !== "male";
    player.gender = missingRemoteGender
      ? resolveMissingSavedGender()
      : normalizeGender(remoteGender);
    playerGender = rememberPlayerGender(player.gender);
    player.name = normalizeCharacterName(save.player?.name) || "阿巡";
    player.upgrades = { ...save.player.upgrades };
    openedChests = new Set(save.openedChests);
    playTime = save.playTime;
    loadExpansionProgress(rawSave?.expansion);
    syncDeckCapacityMilestones({ silent: true });
    const stats = playerStats();
    const loadedHp = save.combatScaleVersion >= COMBAT_SCALE_VERSION
      ? player.hp
      : Math.round(player.hp * HP_SCALE);
    // Zero HP is meaningful server-authoritative state. Keep it across reloads
    // so bootstrap can route straight to recovery instead of resurrecting the
    // player into exploration for one frame.
    player.hp = Core.clamp(loadedHp, 0, stats.maxHp);
    const persistedServerBattle = rawSave?.expansion?.serverBattle && typeof rawSave.expansion.serverBattle === "object"
      ? rawSave.expansion.serverBattle
      : null;
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
    if (godModeRequested || godModeActive) setGodMode(true, { silent: true });
    syncAccountStatus(savePersistence?.getCloudStatus?.());
    stopTitleBgm();
    bgm.setEnabled(musicEnabled);
    bgm.setMap(currentMapId);
    player.invulnerable = 1;
    persistence?.markLoaded(getPersistenceFingerprint());
    sound.start();
    showLocation(zoneForPosition(player), true);
    systemLogEntries = [];
    addSystemMessage("system", `已載入 ${playerDisplayName()} 的旅程`);
    if (missingRemoteGender && rememberedPlayerGender()) {
      window.setTimeout(() => {
        try { saveImportant(false); } catch (_) {}
      }, 0);
    }
    if (!options.silent) showToast(`歡迎返嚟，${playerDisplayName()}。`, "good");
    updateHud(true);
    canvas.focus({ preventScroll: true });
    ensureWorldTimeLoaded();
    startRealtimeSession();

    // Bootstrap routing is based on authoritative persisted state, not RTDB
    // presence. Closing a tab, backgrounding a phone or losing connectivity is
    // not a defeat by itself. On reconnect/reload we either resume the server
    // battle, reopen recovery for HP=0, or remain in normal exploration.
    if (persistedServerBattle?.status === "active") {
      addSystemMessage("system", "偵測到未完成戰鬥，正在重新連接。", "info");
      if (!resumeBattleFromServerSnapshot(persistedServerBattle)) {
        console.warn("Everrealm could not rebuild the persisted battle session.", persistedServerBattle);
        showToast("未能還原上一場戰鬥，請重新載入後再試。", "danger");
      }
    } else if (player.hp <= 0) {
      addSystemMessage("system", "角色仍處於倒下狀態，請選擇復活方式。", "warning");
      const defeatSnapshot = readPersistedBattleDefeatSnapshot();
      if (defeatSnapshot && defeatSnapshot.mapId === currentMapId && resumeDefeatPresentationFromSnapshot(defeatSnapshot)) {
        playerDeath({ silent: true, resumed: true });
      } else {
        playerDeath({ silent: true, resumed: true });
      }
    } else {
      clearBattlePersistenceSnapshots();
    }
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
    // While an authoritative battle session is active, the server owns HP,
    // rewards and the private serverBattle snapshot. A normal client autosave
    // must not replace the Firestore document and erase that server-only state.
    if (!force && battle?.serverReady && battle?.serverBattleId) return true;
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

  function syncExploreSidebarVisibility() {
    const canPlay = isGameplayAuthorized();
    exploreSidebar.hidden = !(canPlay && ["playing", "facility", "dialogue"].includes(mode));
  }

  function restoreExplorationUiAfterBattle() {
    clearBattlePersistenceSnapshots();
    mode = "playing";
    stage.dataset.gameState = mode;
    syncExploreSidebarVisibility();
    syncRealtimeState("exploring");
    updateHud(true);
    requestAnimationFrame(() => {
      if (mode === "playing") syncExploreSidebarVisibility();
    });
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
    syncExploreSidebarVisibility();
    stage.dataset.authState = canPlay ? "signed-in" : "signed-out";
  }

  function returnToTitleWithoutSave() {
    stopRealtimeSession();
    worldTime?.destroy?.();
    worldTimeLoadStarted = false;
    closeBattleHud();
    hideAllOverlays();
    mode = "title";
    stage.dataset.gameState = mode;
    titleScreen.hidden = false;
    startTitleBgm({ restart: true });
    syncAccountStatus(savePersistence?.getCloudStatus?.());
    updateHud(true);
  }

  function clearGameplayState() {
    stopRealtimeSession();
    worldTime?.destroy?.();
    worldTimeLoadStarted = false;
    closeBattleHud();
    hideAllOverlays();
    currentMapId = "world";
    world = overworld;
    mode = "title";
    stage.dataset.gameState = mode;
    titleScreen.hidden = false;
    startTitleBgm({ restart: true });
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
      // A brand-new account starts with music ON even if this browser previously
      // stored an OFF preference for another player. They can disable it in-game.
      setMusicEnabled(true);
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
    battleVictoryOverlay.hidden = true;
  }

  function usesMobileExploreControls() {
    return window.matchMedia("(hover: none), (pointer: coarse)").matches;
  }

  function mobileChatInputActive() {
    return Boolean(usesMobileExploreControls() && worldChatInput && document.activeElement === worldChatInput);
  }

  function stopMobileChatMovement() {
    if (!mobileChatInputActive()) return false;
    clearExploreMovePath();
    pendingClickInteractionId = null;
    pendingClickInteractionPoint = null;
    clearExplorePointerGesture();
    activeExploreTouches.clear();
    explorePinchGesture = null;
    suppressExploreTouchTap = false;
    return true;
  }

  function targetZoom() {
    // Camera zoom is shared by every map and input device. Map dimensions only
    // constrain camera position; small interiors must never be auto-enlarged
    // merely to cover the viewport.
    return exploreZoom;
  }

  function setExploreZoomFromPinch(value) {
    return setExploreZoom(value, { announceChange: false, immediate: true });
  }

  function syncSystemSoundControl() {
    if (musicVolumeSlider) musicVolumeSlider.value = String(Math.round(bgmVolume * 100));
    if (musicVolumeValue) musicVolumeValue.textContent = `${Math.round(bgmVolume * 100)}%`;
    if (soundEffectsVolumeSlider) soundEffectsVolumeSlider.value = String(Math.round(sfxVolume * 100));
    if (soundEffectsVolumeValue) soundEffectsVolumeValue.textContent = `${Math.round(sfxVolume * 100)}%`;
    if (volumeMuteButton) {
      volumeMuteButton.setAttribute("aria-pressed", String(!musicEnabled));
      volumeMuteButton.setAttribute("aria-label", musicEnabled ? "音樂靜音" : "取消音樂靜音");
      const icon = volumeMuteButton.querySelector("span");
      if (icon) icon.textContent = musicEnabled ? "🔊" : "🔇";
    }
    if (soundEffectsMuteButton) {
      soundEffectsMuteButton.setAttribute("aria-pressed", String(!sfxEnabled));
      soundEffectsMuteButton.setAttribute("aria-label", sfxEnabled ? "音效靜音" : "取消音效靜音");
      const icon = soundEffectsMuteButton.querySelector("span");
      if (icon) icon.textContent = sfxEnabled ? "🔊" : "🔇";
    }
    systemSettingsPopover?.style.setProperty("--music-volume", String(bgmVolume));
    systemSettingsPopover?.style.setProperty("--sfx-volume", String(sfxVolume));
  }

  function setBgmVolume(value, persist = true) {
    bgmVolume = Core.clamp(Number(value) || 0, 0, 1);
    bgm.setVolume?.(bgmVolume);
    if (titleBgmAudio) titleBgmAudio.volume = bgmVolume;
    if (battleBgmAudio) battleBgmAudio.volume = bgmVolume;
    if (victoryBgmAudio) victoryBgmAudio.volume = bgmVolume;
    if (defeatBgmAudio) defeatBgmAudio.volume = bgmVolume;
    if (persist) {
      try { localStorage.setItem(BGM_VOLUME_KEY, bgmVolume.toFixed(2)); } catch (_) {}
    }
    syncSystemSoundControl();
    return bgmVolume;
  }

  function setSfxVolume(value, persist = true) {
    sfxVolume = Core.clamp(Number(value) || 0, 0, 1);
    if (encounterTransitionAudio) encounterTransitionAudio.volume = sfxVolume;
    if (persist) {
      try { localStorage.setItem(SFX_VOLUME_KEY, sfxVolume.toFixed(2)); } catch (_) {}
    }
    syncSystemSoundControl();
    return sfxVolume;
  }

  function setMusicEnabled(enabled, persist = true) {
    musicEnabled = Boolean(enabled);
    if (mode === "title") {
      if (musicEnabled && !pageAudioSuspended) startTitleBgm();
      else {
        stopTitleBgm({ reset: false });
        bgm.setEnabled(false);
      }
    } else if (mode === "battle" || mode === "dead") {
      stopTitleBgm({ reset: false });
      bgm.setEnabled(false);
      if (mode === "dead" || battle?.phase === "defeat") {
        battleBgmAudio?.pause();
        victoryBgmAudio?.pause();
        if (defeatBgmAudio) {
          if (musicEnabled && !pageAudioSuspended) defeatBgmAudio.play().catch(() => {});
          else defeatBgmAudio.pause();
        }
      } else if (battle?.phase === "victory") {
        battleBgmAudio?.pause();
        defeatBgmAudio?.pause();
        if (victoryBgmAudio) {
          if (musicEnabled && !pageAudioSuspended) victoryBgmAudio.play().catch(() => {});
          else victoryBgmAudio.pause();
        }
      } else {
        victoryBgmAudio?.pause();
        defeatBgmAudio?.pause();
        if (battleBgmAudio) {
          if (musicEnabled && !pageAudioSuspended) battleBgmAudio.play().catch(() => {});
          else battleBgmAudio.pause();
        }
      }
    } else {
      stopTitleBgm({ reset: false });
      bgm.setEnabled(musicEnabled);
      if (musicEnabled && !pageAudioSuspended) bgm.setMap(currentMapId);
    }
    if (persist) {
      try { localStorage.setItem(BGM_ENABLED_KEY, musicEnabled ? "on" : "off"); } catch (_) {}
    }
    syncSystemSoundControl();
    return musicEnabled;
  }

  function setSfxEnabled(enabled, persist = true) {
    sfxEnabled = Boolean(enabled);
    if (!sfxEnabled) {
      sound.suspend();
      stopEncounterTransitionSfx();
    } else if (!pageAudioSuspended) sound.resume();
    if (persist) {
      try { localStorage.setItem(SFX_ENABLED_KEY, sfxEnabled ? "on" : "off"); } catch (_) {}
    }
    syncSystemSoundControl();
    return sfxEnabled;
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

  function usesMobilePortraitSidebar() {
    return window.matchMedia(MOBILE_HUD_MEDIA_QUERY).matches;
  }

  function clearMobileHudAutoHide() {
    if (!mobileHudIdleTimer) return;
    window.clearTimeout(mobileHudIdleTimer);
    mobileHudIdleTimer = 0;
  }

  function scheduleMobileHudAutoHide() {
    clearMobileHudAutoHide();
    if (!usesMobilePortraitSidebar() || hudCollapsed || exploreSidebar?.hidden) return;
    mobileHudIdleTimer = window.setTimeout(() => {
      mobileHudIdleTimer = 0;
      if (!usesMobilePortraitSidebar() || hudCollapsed) return;
      setHudCollapsed(true, { persist: false });
    }, MOBILE_HUD_IDLE_MS);
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

  function setHudCollapsed(collapsed, options = {}) {
    hudCollapsed = Boolean(collapsed);
    if (options.persist !== false) {
      try { localStorage.setItem(HUD_COLLAPSED_KEY, hudCollapsed ? "1" : "0"); } catch (_) {}
    }
    syncHudCollapse();
    if (hudCollapsed) clearMobileHudAutoHide();
    else scheduleMobileHudAutoHide();
  }

  function syncMobileHudAutoHideMode() {
    const active = usesMobilePortraitSidebar();
    if (active === mobileHudModeActive) return;
    mobileHudModeActive = active;
    clearMobileHudAutoHide();
    if (active) {
      setHudCollapsed(true, { persist: false });
      return;
    }
    const storedCollapsed = readPreference(HUD_COLLAPSED_KEY, "0") === "1";
    hudCollapsed = storedCollapsed;
    syncHudCollapse();
  }

  function setExploreZoom(value, options = {}) {
    const requested = Number(value);
    if (!Number.isFinite(requested)) return false;
    const nextZoom = Core.clamp(requested, EXPLORE_ZOOM_MIN, EXPLORE_ZOOM_MAX);
    const changed = Math.abs(nextZoom - exploreZoom) >= .0001;
    exploreZoom = nextZoom;
    try { localStorage.setItem(ZOOM_KEY, exploreZoom.toFixed(4)); } catch (_) {}
    if (options.immediate) {
      camera.zoom = targetZoom();
      renderPreviousCamera.zoom = targetZoom();
    }
    if (changed && options.announceChange !== false && mode !== "title") {
      const percentage = Math.round(exploreZoom * 100);
      showToast(`地圖視角：${percentage}%`, "good");
      announce(`地圖視角切換到${percentage}%。`);
    }
    return exploreZoom;
  }

  function handleExploreWheelZoom(event) {
    if (mode !== "playing" || usesMobileExploreControls() || event.ctrlKey || !event.deltaY) return;
    const nextZoom = targetZoom() * Math.pow(1 + EXPLORE_ZOOM_WHEEL_SENSITIVITY, -event.deltaY);
    if (Math.abs(Core.clamp(nextZoom, EXPLORE_ZOOM_MIN, EXPLORE_ZOOM_MAX) - targetZoom()) < .0001) return;
    event.preventDefault();
    setExploreZoom(nextZoom, { announceChange: false, immediate: true });
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
      dialoguePanel?.hidden === false ||
      hasBlockingFacilityWindow()
    );
  }

  function updatePlayer(dt) {
    const stats = playerStats();
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    maintainGodModeState();
    const drag = Math.pow(.0008, dt);
    player.knockback.x *= drag;
    player.knockback.y *= drag;

    const movementBlockedByUi = mapTransitionPending || blockingGameplayOverlayOpen() || mobileChatInputActive();
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
    let travelDistance = 0;
    player.moving = Math.hypot(travelled.x, travelled.y) > .001;
    if (player.moving) {
      travelDistance = Math.hypot(travelled.x, travelled.y);
      player.explorationDistance += travelDistance;
      player.explorationMoveSeconds += dt;
      updateWeakPotionTravel(travelDistance);
    }
    if (player.moving) player.facing = Locomotion.facingFromDelta(travelled.x, travelled.y, player.facing);
    player.locomotion = Locomotion.update(player.locomotion, { moving: player.moving, facing: player.facing, dt });
    if (player.moving) player.walkCycle += dt * 8;

    if (updateAutomaticPortal()) return;
    if (player.moving && updateRandomEncounters(travelDistance)) return;
    collectDrops();
    updateNearestInteraction();
    const pendingInteractionEntity = pendingClickInteractionId ? findInteractionEntity(pendingClickInteractionId) : null;
    const pendingInteractionArrived = pendingClickInteractionId && pendingClickInteractionPoint && !exploreMoveTarget && !exploreMovePath.length &&
      Core.distance(player, pendingClickInteractionPoint) <= Math.max(10, (Number(world.navigation?.feetRadiusPx) || 3) * 3);
    if (pendingClickInteractionId && (nearestInteraction?.id === pendingClickInteractionId || (pendingInteractionArrived && pendingInteractionEntity))) {
      if (pendingInteractionArrived) nearestInteraction = pendingInteractionEntity;
      pendingClickInteractionId = null;
      pendingClickInteractionPoint = null;
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

  async function useWeakPotion() {
    if (mode !== "playing" || weakPotionCommandPending) return;
    const current = Math.max(0, Math.floor(Number(inventory.weak_potion) || 0));
    if (current <= 0) return showToast("你身上冇弱氣之藥。", "danger");
    if (!ServerApi?.useItem) return showToast("伺服器道具指令尚未就緒。", "danger");
    if (!beginOptimisticUiMutation()) return;

    const optimisticSnapshot = captureOptimisticUiState();
    weakPotionCommandPending = true;

    if (current > 1) inventory.weak_potion = current - 1;
    else delete inventory.weak_potion;
    weakPotionStepsRemaining = WEAK_POTION_TOTAL_STEPS;
    weakPotionDistanceRemainder = 0;
    renderOptimisticUiState();

    try {
      const flush = await flushForServerCommand();
      if (flush?.error) throw flush.error;

      const result = await ServerApi.useItem("weak_potion");
      if (!result?.ok) {
        restoreOptimisticUiState(optimisticSnapshot);
        if (result?.reason === "empty") return showToast("你身上冇弱氣之藥。", "danger");
        return showToast("今次未能使用弱氣之藥。", "danger");
      }

      const quantity = Math.max(0, Math.floor(Number(result.inventory?.quantity) || 0));
      if (quantity > 0) inventory.weak_potion = quantity;
      else delete inventory.weak_potion;
      weakPotionStepsRemaining = Core.clamp(Math.floor(Number(result.weakPotion?.stepsRemaining) || 0), 0, WEAK_POTION_TOTAL_STEPS);
      weakPotionDistanceRemainder = Core.clamp(Number(result.weakPotion?.distanceRemainder) || 0, 0, WEAK_POTION_WORLD_UNITS_PER_STEP - .001);
      renderOptimisticUiState();
      showToast(`弱氣之藥生效 · ${weakPotionStepsRemaining} 步`, "good");
      addSystemMessage("item", `使用弱氣之藥；效果持續 ${weakPotionStepsRemaining} 步`);
      saveImportant(false);
    } catch (error) {
      restoreOptimisticUiState(optimisticSnapshot);
      console.warn("Everrealm server weak-potion command failed.", error);
      const code = String(error?.code || "");
      if (code.includes("unauthenticated")) showToast("登入狀態已失效，請重新登入。", "danger");
      else if (code.includes("failed-precondition")) showToast("雲端角色資料尚未準備好，請稍後再試。", "danger");
      else showToast("伺服器暫時未能使用弱氣之藥。", "danger");
    } finally {
      weakPotionCommandPending = false;
      endOptimisticUiMutation();
    }
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
      showToast("行近怪物就會展開格仔戰鬥。", "good");
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

  async function useHealingPotionCommand({ fromBag = false } = {}) {
    if (mode !== "playing" || healingPotionCommandPending) return;
    const maxHp = playerStats().maxHp;
    if (player.potions <= 0) return showToast("藥水用晒喇。", "danger");
    if (player.hp >= maxHp) return showToast(fromBag ? "而家生命已經全滿。" : "而家精神得很，留返支藥先。", "good");
    if (!ServerApi?.useItem) return showToast("伺服器道具指令尚未就緒。", "danger");
    if (!beginOptimisticUiMutation()) return;

    const optimisticSnapshot = captureOptimisticUiState();
    const predictedHealed = Math.max(0, Math.min(POTION_HEAL, maxHp - player.hp));
    healingPotionCommandPending = true;

    player.hp = Core.clamp(player.hp + predictedHealed, 0, maxHp);
    player.potions = Core.clamp(Math.floor(player.potions - 1), 0, 9);
    renderOptimisticUiState();
    if (!fromBag) {
      spawnBurst(player.x, player.y, "#87db82", 22, 68);
      addDamageNumber(player.x, player.y - 18, `+${predictedHealed}`, "#87db82", true);
    }
    sound.heal();

    try {
      const flush = await flushForServerCommand();
      if (flush?.error) throw flush.error;

      const result = await ServerApi.useItem("healing_potion");
      if (!result?.ok) {
        restoreOptimisticUiState(optimisticSnapshot);
        if (result?.reason === "empty") return showToast("藥水用晒喇。", "danger");
        if (result?.reason === "full") return showToast(fromBag ? "而家生命已經全滿。" : "而家精神得很，留返支藥先。", "good");
        return showToast("今次未能使用小型回復藥。", "danger");
      }

      const authoritativeHp = Number(result.player?.hp);
      const authoritativePotions = Number(result.player?.potions);
      if (!Number.isFinite(authoritativeHp) || !Number.isFinite(authoritativePotions)) {
        throw new Error("useItem returned an invalid authoritative player state.");
      }

      player.hp = Core.clamp(authoritativeHp, 0, playerStats().maxHp);
      player.potions = Core.clamp(Math.floor(authoritativePotions), 0, 9);
      const healed = Math.max(0, Number(result.healed) || 0);
      renderOptimisticUiState();
      if (fromBag) showToast(`使用小型回復藥 · 回復 ${healed} HP`, "good");
      addSystemMessage("item", `使用小型回復藥，恢復 ${healed} HP`);
      announce(`回復 ${healed} 生命`);
      saveImportant(false);
    } catch (error) {
      restoreOptimisticUiState(optimisticSnapshot);
      console.warn("Everrealm server useItem command failed.", error);
      const code = String(error?.code || "");
      if (code.includes("unauthenticated")) showToast("登入狀態已失效，請重新登入。", "danger");
      else if (code.includes("failed-precondition")) showToast("雲端角色資料尚未準備好，請稍後再試。", "danger");
      else showToast("伺服器暫時未能使用道具。", "danger");
    } finally {
      healingPotionCommandPending = false;
      endOptimisticUiMutation();
    }
  }

  function usePotion() {
    return useHealingPotionCommand({ fromBag: false });
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
      player: { gender: normalizeGender(player.gender), x: player.x, y: player.y, hp: player.hp, level: player.level, xp: player.xp, coins: player.coins, potions: player.potions, weaponLevel: player.weaponLevel, upgrades: player.upgrades },
      openedChests: [...openedChests].sort(),
      expansion: { currentMapId, playerClassId, ownedEquipment: [...ownedEquipment].sort(), equipped, guildCommission: guildCommissionState, guildMarks, guildRenown, inventory, weakPotion: { stepsRemaining: weakPotionStepsRemaining, distanceRemainder: weakPotionDistanceRemainder }, monsterKills, skills: skillState, panels: panelState, mainQuest: mainQuestState },
    });
  }

  function markPersistenceDirty() {
    return persistence?.markDirty() || false;
  }

  function saveImportant(showNotice = false) {
    markPersistenceDirty();
    return saveGame(showNotice);
  }


  async function flushForServerCommand() {
    const reset = await playerResetWrite;
    if (reset?.error) throw reset.error;
    saveImportant(false);
    const flush = await savePersistence?.flushCloud?.();
    if (flush?.error) throw flush.error;
    return true;
  }

  function applyAuthoritativeState(snapshot, options = {}) {
    if (!snapshot || typeof snapshot !== "object") return false;
    const incomingRevision = Math.max(0, Math.floor(Number(snapshot.stateRevision) || 0));
    if (incomingRevision > 0 && incomingRevision < lastAppliedServerRevision) {
      console.warn(`[AuthoritativeState] Ignored stale revision ${incomingRevision}; latest is ${lastAppliedServerRevision}.`);
      return false;
    }
    if (incomingRevision > 0) lastAppliedServerRevision = incomingRevision;

    const nextPlayer = snapshot.player || {};
    if (Number.isFinite(Number(nextPlayer.hp))) player.hp = Number(nextPlayer.hp);
    if (Number.isFinite(Number(nextPlayer.level))) player.level = Math.max(1, Math.floor(Number(nextPlayer.level)));
    if (Number.isFinite(Number(nextPlayer.xp))) player.xp = Math.max(0, Math.floor(Number(nextPlayer.xp)));
    if (Number.isFinite(Number(nextPlayer.coins))) player.coins = Core.clamp(Math.floor(Number(nextPlayer.coins)), 0, 99999);
    if (Number.isFinite(Number(nextPlayer.potions))) player.potions = Core.clamp(Math.floor(Number(nextPlayer.potions)), 0, 9);

    const expansion = snapshot.expansion || {};
    const guildStateIncluded = Boolean(expansion.guildCommission && typeof expansion.guildCommission === "object");
    if (expansion.inventory && typeof expansion.inventory === "object") inventory = { ...expansion.inventory };
    if (Array.isArray(expansion.ownedEquipment)) ownedEquipment = [...expansion.ownedEquipment];
    if (expansion.equipped && typeof expansion.equipped === "object") equipped = { ...expansion.equipped };
    if (guildStateIncluded) guildCommissionState = Guild.normalizeState(expansion.guildCommission);
    if (Number.isFinite(Number(expansion.guildMarks))) guildMarks = Math.max(0, Math.floor(Number(expansion.guildMarks)));
    if (Number.isFinite(Number(expansion.guildRenown))) guildRenown = Math.max(0, Math.floor(Number(expansion.guildRenown)));
    if (expansion.skills && typeof expansion.skills === "object") skillState = Skills.normalizeSkillState(expansion.skills, { classId: playerClassId });
    if (expansion.panels && typeof expansion.panels === "object") panelState = Panels.normalizeState(expansion.panels, skillState);
    else panelState = Panels.normalizeState(panelState, skillState);
    skillState = Panels.syncSkillState(panelState, skillState);
    if (expansion.mainQuest && typeof expansion.mainQuest === "object") mainQuestState = MainQuest.normalizeState(expansion.mainQuest);
    if (!panelState.panels?.[selectedLoadoutPanelId]) selectedLoadoutPanelId = panelState.equippedPanelId;
    if (expansion.weakPotion && typeof expansion.weakPotion === "object") {
      weakPotionStepsRemaining = Math.max(0, Math.floor(Number(expansion.weakPotion.stepsRemaining) || 0));
      weakPotionDistanceRemainder = Math.max(0, Number(expansion.weakPotion.distanceRemainder) || 0);
    }
    if (expansion.monsterKills && typeof expansion.monsterKills === "object") monsterKills = { ...expansion.monsterKills };
    if (Array.isArray(snapshot.openedChests)) openedChests = new Set(snapshot.openedChests.map(String));
    if (options.applyMap === true && typeof expansion.currentMapId === "string") {
      const nextMapId = expansion.currentMapId === "dungeon" ? "mountain-southeast" : expansion.currentMapId;
      if (hasMap(nextMapId)) currentMapId = nextMapId;
    }
    if (options.markDirty !== false) markPersistenceDirty();
    updateHud(true);
    updateMenuBadges();
    if (facilityWindows.size) renderFacility();
    if (guildStateIncluded && guildCommissionDetailPanel?.hidden === false && pendingCommissionDetailId) {
      renderGuildCommissionDetail(pendingCommissionDetailId);
    }
    return true;
  }

  function serverCommandError(error, fallback = "伺服器暫時未能處理呢個操作。") {
    console.warn("Everrealm authoritative command failed.", error);
    const code = String(error?.code || "");
    if (code.includes("unauthenticated")) showToast("登入狀態已失效，請重新登入。", "danger");
    else if (code.includes("failed-precondition")) showToast("雲端角色資料尚未準備好，請稍後再試。", "danger");
    else showToast(fallback, "danger");
  }

  function captureOptimisticUiState() {
    return {
      player: { hp: player.hp, coins: player.coins, potions: player.potions },
      inventory: { ...inventory },
      ownedEquipment: [...ownedEquipment],
      equipped: { ...equipped },
      skillState: Skills.normalizeSkillState(skillState, { classId: playerClassId }),
      panelState: Panels.normalizeState(panelState, skillState),
      mainQuestState: MainQuest.normalizeState(mainQuestState),
      selectedLoadoutPanelId,
      pendingPanelEquipId,
      guildCommissionState: Guild.normalizeState(guildCommissionState),
      weakPotionStepsRemaining,
      weakPotionDistanceRemainder,
    };
  }

  function renderOptimisticUiState() {
    markPersistenceDirty();
    updateHud(true);
    if (facilityWindows.size) renderFacility();
  }

  function restoreOptimisticUiState(snapshot) {
    if (!snapshot) return;
    player.hp = snapshot.player.hp;
    player.coins = snapshot.player.coins;
    player.potions = snapshot.player.potions;
    inventory = { ...snapshot.inventory };
    ownedEquipment = [...snapshot.ownedEquipment];
    equipped = { ...snapshot.equipped };
    skillState = Skills.normalizeSkillState(snapshot.skillState, { classId: playerClassId });
    panelState = Panels.normalizeState(snapshot.panelState, skillState);
    skillState = Panels.syncSkillState(panelState, skillState);
    mainQuestState = MainQuest.normalizeState(snapshot.mainQuestState);
    selectedLoadoutPanelId = snapshot.selectedLoadoutPanelId || panelState.equippedPanelId;
    pendingPanelEquipId = snapshot.pendingPanelEquipId || null;
    if (snapshot.guildCommissionState) guildCommissionState = Guild.normalizeState(snapshot.guildCommissionState);
    weakPotionStepsRemaining = snapshot.weakPotionStepsRemaining;
    weakPotionDistanceRemainder = snapshot.weakPotionDistanceRemainder;
    renderOptimisticUiState();
  }

  function beginOptimisticUiMutation() {
    if (optimisticUiMutationPending) return false;
    optimisticUiMutationPending = true;
    return true;
  }

  function endOptimisticUiMutation() {
    optimisticUiMutationPending = false;
  }

  function beginGuildQuestMutation() {
    if (guildQuestMutationPending) return false;
    guildQuestMutationPending = true;
    return true;
  }

  function endGuildQuestMutation() {
    guildQuestMutationPending = false;
  }

  function guildQuestServerRejectMessage(reason, fallback) {
    const code = String(reason || "").trim();
    if (code === "already-active") return "同一時間只可以接一份委託。";
    if (code === "wrong-map" || code === "position-map-mismatch") return "要親身返公會先可以處理委託。";
    if (code === "not-found") return "搵唔到呢份委託。";
    if (code === "not-ready") return "委託仲未完成。";
    if (code === "interaction-too-far" || code === "invalid-position") return "位置同步未完成，請再試一次。";
    return fallback;
  }

  async function runGuildQuestServerCommand(action, payload = {}) {
    const serial = ++guildQuestCommandSerial;
    const startedAt = performance.now();
    let slowTimer = window.setTimeout(() => {
      console.warn(`[GuildQuest #${serial}] ${action} still pending after ${Math.round(performance.now() - startedAt)}ms.`);
    }, 3000);
    console.info(`[GuildQuest #${serial}] ${action} START`);
    try {
      const result = await ServerApi.quest(action, payload);
      console.info(`[GuildQuest #${serial}] ${action} END ${Math.round(performance.now() - startedAt)}ms`, result?.ok ? "ok" : (result?.reason || "rejected"), `rev=${result?.state?.stateRevision ?? "n/a"}`);
      return result;
    } catch (error) {
      console.warn(`[GuildQuest #${serial}] ${action} ERROR ${Math.round(performance.now() - startedAt)}ms`, error);
      throw error;
    } finally {
      window.clearTimeout(slowTimer);
      slowTimer = null;
    }
  }

  function captureGuildQuestOptimisticState() {
    return {
      guildCommissionState: Guild.normalizeState(guildCommissionState),
      coins: player.coins,
    };
  }

  function renderGuildQuestOptimisticState() {
    // Guild commission state is server-owned. Rendering an optimistic preview
    // must not schedule a generic cloud save against the same Firestore doc,
    // otherwise a slow callable can contend with an unnecessary autosave.
    updateHud(true);
    updateMenuBadges();
    if (facilityWindows.size) renderFacility();
  }

  function restoreGuildQuestOptimisticState(snapshot) {
    if (!snapshot) return;
    guildCommissionState = Guild.normalizeState(snapshot.guildCommissionState);
    player.coins = Core.clamp(Math.floor(Number(snapshot.coins) || 0), 0, 99999);
    renderGuildQuestOptimisticState();
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
    if (options.recordDefeat !== false) recordDefeatedMonster(enemy);
    if (options.grantXp !== false) {
      const rewardXp = ExpansionWorld.xpReward(enemy.xp, enemy.level, player.level);
      gainXp(rewardXp);
    }
  }

  function gainXp(amount, options = {}) {
    const deferPresentation = options.deferPresentation === true;
    if (player.level >= Expansion.LEVEL_CAP) {
      player.xp = 0;
      updateHud();
      return { level: player.level, xp: player.xp, levelsGained: 0, hpGain: 0 };
    }
    const oldStats = playerStats();
    if (amount > 0) addSystemMessage("reward", `獲得 ${Math.round(amount)} EXP`);
    const result = Expansion.grantExperience(player.level, player.xp, amount);
    player.level = result.level;
    player.xp = result.xp;
    if (amount > 0) markPersistenceDirty();
    let hpGain = 0;
    if (result.levelsGained > 0) {
        const newStats = playerStats();
      player.hp = newStats.maxHp;
      hpGain = newStats.maxHp - oldStats.maxHp;
      addSystemMessage("system", `等級提升！LV.${player.level} · HP 已完全恢復`, "good");
      if (!deferPresentation) {
        sound.level();
        showToast(`升到 LV.${player.level} · HP 回滿 · 生命上限 +${hpGain}`, "good");
        announce(`升到 ${player.level} 級。生命已完全恢復。`);
        saveImportant(false);
      }
    }
    updateHud();
    return { ...result, hpGain };
  }


  function damagePlayer(amount, source, direction) {
    if (mode !== "playing" || player.invulnerable > 0) return;
    if (godModeActive) {
      maintainGodModeState();
      return;
    }
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

  const RECOVERY_COMMAND_TIMEOUT_MS = 12000;
  const DEFEAT_SETTLEMENT_WAIT_MS = 6000;

  function withClientTimeout(promise, timeoutMs, label = "server-command") {
    let timeoutId = null;
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        const error = new Error(`${label} timed out after ${timeoutMs}ms`);
        error.code = "client/timeout";
        reject(error);
      }, Math.max(1, Number(timeoutMs) || 1));
    });
    return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
    });
  }

  function playerDeath(options = {}) {
    const silent = options?.silent === true;
    // A death screen is a new recovery lifecycle. Invalidate any stale
    // recovery response from a previous death and always reset the reusable
    // DOM buttons; successful recovery hides the panel before its finally
    // block runs, so leaving them disabled there would lock the next death.
    recoveryCommandSerial += 1;
    recoveryCommandPending = false;
    const reviveHereButton = document.getElementById("reviveHereButton");
    const respawnButton = document.getElementById("respawnButton");
    if (reviveHereButton) reviveHereButton.disabled = false;
    if (respawnButton) respawnButton.disabled = false;

    mode = "dead";
    player.deathStartedAt = elapsed;
    stage.dataset.gameState = mode;
    syncRealtimeState("battle");
    keys.clear();
    if (!silent) sound.death();
    battleHud.hidden = true;
    battleFacingPicker.hidden = true;
    if (battle) persistBattleResumeState({ defeat: true });
    startDefeatBgm();
    deathPanel.hidden = false;
    resetDraggableWindowPosition(deathPanel.querySelector(".ui-modal-window"));
    reviveHereButton?.focus({ preventScroll: true });
    announce("Defeated.");
  }

  async function finishDeathRevive({ returnToTown = false } = {}) {
    if (mode !== "dead" || recoveryCommandPending) return;
    if (!ServerApi?.recoverPlayer) return showToast("伺服器復活指令尚未就緒。", "danger");

    const reviveHereButton = document.getElementById("reviveHereButton");
    const respawnButton = document.getElementById("respawnButton");
    const commandSerial = ++recoveryCommandSerial;
    recoveryCommandPending = true;
    if (reviveHereButton) reviveHereButton.disabled = true;
    if (respawnButton) respawnButton.disabled = true;
    const recoveryLabel = returnToTown ? "返回主城" : "原地復活";
    const overlayStartedAt = showMapTransitionOverlay(returnToTown ? "返回主城中" : "復活中");
    addSystemMessage("system", `${recoveryLabel}中`, "info");

    try {
      // If the defeat settlement was still in flight when the death panel
      // appeared, wait for that SAME request instead of firing a duplicate
      // settle command. A later click can retry this wait without duplicating
      // the authoritative defeat transaction.
      if (battle?.phase === "defeat" && battle.serverReady && !battle.serverDefeatSettled) {
        let previousSettled = false;
        if (battle.defeatSettlementPromise) {
          try {
            previousSettled = Boolean(await withClientTimeout(battle.defeatSettlementPromise, DEFEAT_SETTLEMENT_WAIT_MS, "battle-defeat-settle"));
          } catch (error) {
            if (String(error?.code || "") === "client/timeout") {
              throw Object.assign(new Error("Defeat settlement is still pending."), { code: "client/defeat-settle-timeout" });
            }
            throw error;
          }
        }
        // If the original settle definitely finished but failed, retry once on
        // the user's recovery action. This is not a duplicate while the first
        // request is still pending.
        if (!previousSettled && !battle.serverDefeatSettled) {
          const retrySettlement = settleBattleDefeatState(battle);
          battle.defeatSettlementPromise = retrySettlement;
          try {
            await withClientTimeout(retrySettlement, DEFEAT_SETTLEMENT_WAIT_MS, "battle-defeat-settle-retry");
          } catch (error) {
            if (String(error?.code || "") === "client/timeout") {
              throw Object.assign(new Error("Defeat settlement retry is still pending."), { code: "client/defeat-settle-timeout" });
            }
            throw error;
          }
        }
        if (!battle.serverDefeatSettled) {
          throw Object.assign(new Error("Defeat settlement is not confirmed."), { code: "client/defeat-not-settled" });
        }
      }

      // A normal server-settled battle defeat has already committed HP=0, so
      // no pre-revive cloud save is needed. Keep a bounded fallback only for
      // non-battle deaths/debug paths that do not have an authoritative settle.
      const serverDeathConfirmed = battle?.serverDefeatSettled === true;
      if (!serverDeathConfirmed) {
        saveImportant(false);
        const flush = await withClientTimeout(savePersistence?.flushCloud?.(), 6000, "pre-revive-flush");
        if (flush?.error) throw flush.error;
      }

      const result = await withClientTimeout(
        ServerApi.recoverPlayer(returnToTown ? "respawn_town" : "revive_here"),
        RECOVERY_COMMAND_TIMEOUT_MS,
        "recover-player",
      );
      if (commandSerial !== recoveryCommandSerial) return;
      if (!result?.ok && result?.reason === "defeat-not-settled") {
        throw Object.assign(new Error("Server defeat state is not settled."), { code: "client/defeat-not-settled" });
      }
      if (!result?.ok && result?.reason === "not-dead") {
        throw Object.assign(new Error("Server player is not dead."), { code: "client/not-dead" });
      }
      if (!result?.ok) return showToast("今次未能完成復活。", "danger");

      if (result.state) applyAuthoritativeState(result.state, { markDirty: false });
      const authoritativePlayer = result.state?.player || result.player || {};
      const nextLevel = Core.clamp(Math.floor(Number(authoritativePlayer.level) || player.level), 1, Expansion.LEVEL_CAP);
      const nextXp = Math.max(0, Math.floor(Number(authoritativePlayer.xp) || 0));
      const nextHp = Math.max(1, Number(authoritativePlayer.hp) || 1);
      player.level = nextLevel;
      player.xp = nextXp;
      player.hp = Core.clamp(nextHp, 1, playerStats().maxHp);

      const equipmentResult = Expansion.unequipIneligibleEquipment({
        coins: player.coins,
        level: player.level,
        classId: playerClassId,
        ownedEquipment,
        equipped,
      });
      equipped = equipmentResult.state.equipped;
      const removedItems = equipmentResult.removedItems;
      const deducted = Math.max(0, Math.floor(Number(result.deducted) || 0));
      const levelsLost = Math.max(0, Math.floor(Number(result.levelsLost) || 0));
      const authoritativeMapId = String(result.state?.expansion?.currentMapId || result.respawn?.mapId || currentMapId);
      const authoritativePosition = {
        x: Number(result.respawn?.x ?? result.state?.player?.x),
        y: Number(result.respawn?.y ?? result.state?.player?.y),
      };
      const hasAuthoritativePosition = Number.isFinite(authoritativePosition.x) && Number.isFinite(authoritativePosition.y);

      clearBattlePersistenceSnapshots();
      closeBattleHud();
      encounterGrace = 1.8;
      player.invulnerable = 1.8;
      player.knockback = { x: 0, y: 0 };
      player.deathStartedAt = null;
      deathPanel.hidden = true;
      mode = "playing";
      stage.dataset.gameState = mode;

      if (authoritativeMapId !== currentMapId || returnToTown) {
        const targetMap = maps[authoritativeMapId] || overworld;
        const targetPosition = hasAuthoritativePosition ? authoritativePosition : targetMap.start;
        await transitionMap(authoritativeMapId, targetPosition, null, { serverVerified: true });
        player.invulnerable = 1.8;
      } else {
        await waitForMapTransitionCover(overlayStartedAt);
        await hideMapTransitionOverlay();
        resetEnemies();
        camera.x = player.x;
        camera.y = player.y;
        camera.zoom = targetZoom();
        showLocation(zoneForPosition(player), true);
        updateHud(true);
        saveImportant(false);
        canvas.focus({ preventScroll: true });
      }

      syncRealtimeState("exploring");

      if (result.alreadyRecovered) {
        showToast("復活狀態已重新同步。", "good");
        addSystemMessage("system", "伺服器其實已完成復活，角色狀態已重新同步。", "good");
      } else {
        const levelText = levelsLost > 0 ? ` · 降至 LV.${player.level}` : "";
        const equipmentText = removedItems.length ? ` · 已卸下 ${removedItems.map((item) => item.name).join("、")}` : "";
        showToast(`失去 ${deducted} EXP${levelText}${equipmentText}`, "danger", { log: false });
        addSystemMessage("reward", `失去 ${deducted} EXP${levelText}${equipmentText}`, "danger");
      }
    } catch (error) {
      if (commandSerial !== recoveryCommandSerial) return;
      await hideMapTransitionOverlay();
      console.warn("Everrealm server revive command failed.", error);
      const code = String(error?.code || "");
      if (code === "client/timeout") {
        showToast("伺服器回覆逾時，未確認復活結果；可以再試一次。", "danger");
        addSystemMessage("system", "復活請求逾時；按鈕已重新開放，可以再試一次。", "warning");
      } else if (code === "client/defeat-settle-timeout" || code === "client/defeat-not-settled") {
        showToast("戰敗狀態仍在同步，請稍後再試復活。", "danger");
        addSystemMessage("system", "戰敗狀態尚未完成同步，復活未被扣除任何額外代價。", "warning");
      } else if (code.includes("unauthenticated")) showToast("登入狀態已失效，請重新登入。", "danger");
      else if (code.includes("failed-precondition")) showToast("雲端角色資料尚未準備好，請稍後再試。", "danger");
      else showToast("伺服器暫時未能處理復活。", "danger");
    } finally {
      if (commandSerial === recoveryCommandSerial) {
        recoveryCommandPending = false;
        // These buttons are persistent DOM nodes. Re-enable them even after a
        // successful recovery (when mode is already "playing") so the next
        // death cannot inherit disabled controls from the previous one.
        if (reviveHereButton) reviveHereButton.disabled = false;
        if (respawnButton) respawnButton.disabled = false;
        if (mode === "dead") await hideMapTransitionOverlay();
      }
    }
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
    // Older flattened maps did not copy the authored `npc` region id onto the
    // semantic entity, which made canvas clicks fall back to the entity feet
    // behind the counter and then fail pathfinding.
    if (entity.kind === "npc" && world.navigation.data?.regions?.npc?.length && typeof world.navigation.interactionHitTest === "function") return "npc";
    return null;
  }

  function authoritativeInteractionRegionIndex(entity) {
    const value = Number(entity?.navigationRegionIndex);
    return Number.isInteger(value) && value >= 0 ? value : null;
  }

  function interactionDistanceToEntity(entity) {
    const region = authoritativeInteractionRegion(entity);
    if (region && typeof world.navigation.distanceToRegion === "function") {
      return world.navigation.distanceToRegion(region, player, authoritativeInteractionRegionIndex(entity));
    }
    return Core.distance(player, entity);
  }

  function interactionReachForEntity(entity) {
    if (authoritativeInteractionRegion(entity)) {
      return Math.max(8, (Number(world.navigation.feetRadiusPx) || 3) * 2);
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
    candidates.push(...world.signs, ...world.boards);
    candidates.push(...world.portals);
    nearestInteraction = candidates
      .map((entity) => ({ entity, distance: interactionDistanceToEntity(entity) }))
      .filter((item) => {
        if (item.entity.kind === "questBoard" && item.entity.navigationRegion && typeof world.navigation?.isInRegion === "function") {
          if (world.navigation.authoritative && authoritativeInteractionRegion(item.entity)) {
            return item.distance <= interactionReachForEntity(item.entity);
          }
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
    if (entity.kind === "portal") return entity.interactionMode === "door"
      ? (entity.prompt || `進入${entity.name}`)
      : (entity.prompt || `前往${entity.name}`);
    if (entity.kind === "questBoard") return entity.boardId === "deck-loadout" ? "面板配置" : "查看公會委託";
    if (entity.kind === "wishPool") return "喺古怪水池許願";
    return "睇下";
  }

  function findInteractionEntity(id) {
    if (!id) return null;
    const candidates = [
      ...(world.npcs || []), ...(world.boards || []), ...(world.signs || []),
      ...(world.chests || []), ...(world.portals || []),
    ];
    return candidates.find((entity) => entity?.id === id) || null;
  }

  function interact() {
    if (mapTransitionPending) return;
    if (mode === "dialogue") return advanceDialogue();
    if (mode !== "playing" || !nearestInteraction) return;
    const entity = nearestInteraction;
    if (entity.kind === "npc") interactNpc(entity);
    else if (entity.kind === "chest") openChest(entity);
    else if (entity.kind === "portal") usePortal(entity);
    else if (entity.kind === "questBoard") entity.boardId === "deck-loadout" ? openFacility("deck", "deck") : openFacility("guild");
    else if (entity.kind === "wishPool") interactWishPool(entity);
    else if (entity.kind === "sign") startDialogue({ speaker: entity.name, color: "#9a7653", lines: [entity.text] });
  }

  function interactNpc(npc) {
    if (npc.id === "clinic-healer-siu-moon") interactHealer(npc);
    else if (npc.id === "store-merchant-gin") interactGeneralStore(npc);
    else if (npc.id === "inn-keeper") interactInn(npc);
    else if (["guild-eris", "guild-roxy"].includes(npc.id)) interactGuildSocialNpc(npc);
    else if (["guildmaster-yin", "guild-clerk-po"].includes(npc.id)) openFacility("guild");
    else if (["merchant-gin", "armorer-yuet"].includes(npc.id)) interactEquipmentShop(npc);
    else startDialogue({ speaker: npc.name, color: npc.color, lines: [npc.chatter || "米克雷帝國今晚比平時熱鬧，多得你周圍探索。"] });
  }

  async function interactDeliveryRecipient(npc) {
    const commission = activeGuildCommission();
    if (!commission || commission.type !== "delivery") {
      return startDialogue({ speaker: npc.name, color: npc.color, lines: [npc.chatter || "山路北面風大，信件交畀我保管就唔會畀濕氣浸壞。"] });
    }
    if (guildCommissionState.status === "ready_to_report" && guildCommissionState.deliveryCompleted) {
      return startDialogue({ speaker: npc.name, color: npc.color, lines: ["公會封信我已經收妥喇。你返公會回報，就可以領取委託報酬。"] });
    }
    if (!ServerApi?.quest) return showToast("伺服器任務指令尚未就緒。", "danger");
    if (!beginGuildQuestMutation()) return;

    const predicted = Guild.deliver(guildCommissionState, npc.id);
    if (!predicted?.changed) {
      endGuildQuestMutation();
      return startDialogue({ speaker: npc.name, color: npc.color, lines: ["你手上而家冇要交畀我嘅公會信件。"] });
    }

    const optimisticSnapshot = captureGuildQuestOptimisticState();
    guildCommissionState = predicted.state;
    renderGuildQuestOptimisticState();
    sound.crystal();
    showToast(`信件已送達：${commission.title} · 返公會回報`, "good");
    startDialogue({ speaker: npc.name, color: npc.color, lines: ["收到了，封印完整，沿途辛苦你喇。", "信件已送達；返公會向接待員回報，就可以領取技能書信封。"] });

    try {
      const result = await runGuildQuestServerCommand("delivery", { npcId: npc.id });
      if (!result?.ok) {
        restoreGuildQuestOptimisticState(optimisticSnapshot);
        startDialogue({ speaker: npc.name, color: npc.color, lines: ["今次送信未能由伺服器確認，封信仍然喺你手上；請再試一次。"] });
        return showToast("送信未能確認，進度已復原。", "danger");
      }
      applyAuthoritativeState(result.state);
    } catch (error) {
      restoreGuildQuestOptimisticState(optimisticSnapshot);
      startDialogue({ speaker: npc.name, color: npc.color, lines: ["今次送信未能由伺服器確認，封信仍然喺你手上；請再試一次。"] });
      serverCommandError(error, "伺服器暫時未能記錄送信任務；進度已復原。");
    } finally {
      endGuildQuestMutation();
    }
  }

  async function interactWishPool(pool) {
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
    if (!ServerApi?.quest) return showToast("伺服器任務指令尚未就緒。", "danger");
    if (!beginGuildQuestMutation()) return;

    const predicted = Guild.recordInteraction(guildCommissionState, pool.id);
    if (!predicted?.changed) {
      endGuildQuestMutation();
      return startDialogue({ speaker: pool.name || "古怪水池", color: "#a88cff", lines: ["而家似乎冇需要喺呢度代人許願。"] });
    }

    const optimisticSnapshot = captureGuildQuestOptimisticState();
    guildCommissionState = predicted.state;
    renderGuildQuestOptimisticState();
    sound.crystal();
    showToast(`委託完成：${commission.title} · 返公會回報`, "good");
    addSystemMessage("quest", `委託完成：${commission.title} · 返公會回報`);
    startDialogue({
      speaker: pool.name || "古怪水池",
      color: "#a88cff",
      lines: ["你替委託人認真許咗個願。", "至於靈唔靈……交畀個水池自己負責。"],
    });

    try {
      const result = await runGuildQuestServerCommand("interaction", { interactionId: pool.id });
      if (!result?.ok) {
        restoreGuildQuestOptimisticState(optimisticSnapshot);
        startDialogue({ speaker: pool.name || "古怪水池", color: "#a88cff", lines: ["今次許願未能記錄落伺服器，進度已復原；請再試一次。"] });
        return showToast("伺服器未能確認今次許願，進度已復原。", "danger");
      }
      applyAuthoritativeState(result.state);
    } catch (error) {
      restoreGuildQuestOptimisticState(optimisticSnapshot);
      startDialogue({ speaker: pool.name || "古怪水池", color: "#a88cff", lines: ["今次許願未能記錄落伺服器，進度已復原；請再試一次。"] });
      serverCommandError(error, "伺服器暫時未能記錄任務互動；進度已復原。");
    } finally {
      endGuildQuestMutation();
    }
  }

  function usePortal(portal) {
    const arrival = MapTransitions.resolveArrival(maps, portal) || { position: null, facing: null };
    const targetPosition = arrival.position;
    transitionMap(portal.targetMap, targetPosition, arrival.facing);
  }

  function updateAutomaticPortal() {
    if (mode !== "playing" || mapTransitionPending) return false;
    const portal = world.portals.find((candidate) => {
      if (candidate.navigationRegion && typeof world.navigation?.isFeetInRegion === "function") {
        return world.navigation.isFeetInRegion(candidate.navigationRegion, player);
      }
      if (candidate.navigationRegion && typeof world.navigation?.isInRegion === "function") {
        return world.navigation.isInRegion(candidate.navigationRegion, {
          x: player.x,
          y: player.y,
          radius: Number(world.navigation.feetRadiusPx) || 3,
        });
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

  const MAP_TRANSITION_MIN_COVER_MS = reducedMotion ? 0 : 180;
  const MAP_TRANSITION_SETTLE_MS = reducedMotion ? 0 : 48;
  const MAP_TRANSITION_FADE_OUT_MS = reducedMotion ? 0 : 220;

  function showMapTransitionOverlay(targetName) {
    if (!mapTransitionOverlay) return performance.now();
    if (mapTransitionName) mapTransitionName.textContent = targetName || "前往下一區域";
    mapTransitionOverlay.hidden = false;
    mapTransitionOverlay.setAttribute("aria-hidden", "false");
    mapTransitionOverlay.classList.remove("is-leaving");
    // Two frames ensure the hidden->visible transition is observable even on
    // fast local map changes and when the browser has just resumed rendering.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!mapTransitionOverlay.hidden) mapTransitionOverlay.classList.add("is-visible");
    }));
    return performance.now();
  }

  async function waitForMapTransitionCover(startedAt, minimumCoverMs = MAP_TRANSITION_MIN_COVER_MS) {
    const elapsed = performance.now() - Number(startedAt || 0);
    const remaining = Math.max(0, Math.max(0, Number(minimumCoverMs) || 0) - elapsed);
    if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
  }

  async function hideMapTransitionOverlay() {
    if (!mapTransitionOverlay || mapTransitionOverlay.hidden) return;
    mapTransitionOverlay.classList.add("is-leaving");
    mapTransitionOverlay.classList.remove("is-visible");
    if (MAP_TRANSITION_FADE_OUT_MS > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, MAP_TRANSITION_FADE_OUT_MS));
    }
    mapTransitionOverlay.hidden = true;
    mapTransitionOverlay.setAttribute("aria-hidden", "true");
    mapTransitionOverlay.classList.remove("is-leaving");
  }

  async function transitionMap(targetMapId, targetPosition, targetFacing = null, options = {}) {
    const target = maps[targetMapId];
    if (!target) return false;
    const destination = targetPosition && Number.isFinite(targetPosition.x) ? targetPosition : target.start;
    if (target.navigation?.authoritative && isBlocked({ x: destination.x, y: destination.y, radius: target.navigation.feetRadiusPx || player.radius }, target, targetMapId)) {
      console.error("Authoritative map transition arrival is not a valid navigation position", { targetMapId, destination });
      return false;
    }

    const serverVerified = options.serverVerified === true;
    if (!serverVerified && mapTransitionPending) return false;
    if (serverVerified) mapTransitionPending = false;

    const transitionSerial = ++mapTransitionSerial;
    const sourceMapId = currentMapId;
    mapTransitionPending = true;
    clearExplorePointerGesture();
    clearExploreMovePath();
    pendingClickInteractionId = null;
    pendingClickInteractionPoint = null;
    player.moving = false;
    const overlayStartedAt = showMapTransitionOverlay(target.name);

    let transitionSucceeded = false;
    try {
      if (!serverVerified) {
        if (!ServerApi?.map) {
          await hideMapTransitionOverlay();
          showToast("伺服器地圖驗證尚未就緒。", "danger");
          return false;
        }
        try {
          await flushForServerCommand();
          const verified = await ServerApi.map("transition", { targetMapId });
          // Ignore any late reply from a transition that has already been
          // superseded or whose source map changed while the request was away.
          if (transitionSerial !== mapTransitionSerial || currentMapId !== sourceMapId) return false;
          if (!verified?.ok) {
            await hideMapTransitionOverlay();
            showToast("呢個地圖轉移而家唔合法。", "danger");
            return false;
          }
        } catch (error) {
          if (transitionSerial === mapTransitionSerial) {
            await hideMapTransitionOverlay();
            serverCommandError(error, "伺服器暫時未能驗證地圖轉移。");
          }
          return false;
        }
      }

      if (transitionSerial !== mapTransitionSerial && !serverVerified) return false;
      // If the server answered almost instantly, still give the fade enough
      // time to read as an intentional scene transition rather than a flash.
      await waitForMapTransitionCover(overlayStartedAt);
      if (transitionSerial !== mapTransitionSerial && !serverVerified) return false;

      clearExplorePointerGesture();
      clearAllFacilityWindows();
      setSystemSettingsOpen(false);
      closeBattleHud();
      currentMapId = targetMapId;
      world = target;
      bgm.setMap(currentMapId);
      clearExploreMovePath();
      pendingClickInteractionId = null;
      pendingClickInteractionPoint = null;
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
      // Snap the render history to the destination in the same task. This keeps
      // a late pre-transition frame from interpolating the hero back toward the
      // old map/spawn point for one or more frames.
      capturePreviousExplorationRenderState();
      renderInterpolationAlpha = 1;
      showLocation(zoneForPosition(player), true);
      screenFlash = .22;
      sound.tone(330, .14, { to: 540, gain: .025 });
      showToast(target.name, "good");
      updateHud(true);
      syncRealtimeMap();
      saveImportant(false);
      transitionSucceeded = true;

      // Keep the cover up for at least one rendered frame after the map swap so
      // the player never sees an in-between camera/spawn state.
      if (MAP_TRANSITION_SETTLE_MS > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, MAP_TRANSITION_SETTLE_MS));
      }
      await hideMapTransitionOverlay();
      canvas.focus({ preventScroll: true });
      return true;
    } finally {
      if (!transitionSucceeded && mapTransitionOverlay && !mapTransitionOverlay.hidden && transitionSerial === mapTransitionSerial) {
        await hideMapTransitionOverlay();
      }
      if (transitionSerial === mapTransitionSerial) mapTransitionPending = false;
    }
  }

  function interactSmith(npc) {
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: ["齋磨同一把舊刀始終有限。我同帝都裝備坊嘅裝備工匠搬晒新貨入工房：短刀夠快、重刃破甲，護甲仲會改你行幾多格。"],
      choices: [
        {
          label: "入帝都裝備坊",
          action: () => transitionMap("shop", expansionMaps.shop.start),
        },
        { label: "等我準備吓先", action: () => {} },
      ],
    });
  }

  async function healAtClinicCommand() {
    if (recoveryCommandPending) return;
    if (!ServerApi?.recoverPlayer) return showToast("伺服器治療指令尚未就緒。", "danger");
    if (!beginOptimisticUiMutation()) return;

    const optimisticSnapshot = captureOptimisticUiState();
    const maxHp = playerStats().maxHp;
    recoveryCommandPending = true;

    // Healing at the nurse is overwhelmingly expected to succeed once the
    // player is already inside the clinic. Reflect it immediately, then let the
    // server either confirm the canonical HP or roll the client back.
    player.hp = maxHp;
    renderOptimisticUiState();
    sound.heal();

    try {
      const result = await ServerApi.recoverPlayer("clinic");
      if (!result?.ok) {
        restoreOptimisticUiState(optimisticSnapshot);
        if (result?.reason === "wrong-map") return showToast("你而家唔喺帝都醫療院。", "danger");
        return showToast("今次未能完成治療。", "danger");
      }

      const hp = Number(result.player?.hp);
      if (!Number.isFinite(hp)) throw new Error("recoverPlayer returned an invalid clinic HP state.");
      player.hp = Core.clamp(hp, 1, playerStats().maxHp);
      renderOptimisticUiState();
      showToast("HP 已完全恢復", "good");
      addSystemMessage("system", "護士治療完成 · HP 已完全恢復", "good");
      saveImportant(false);
    } catch (error) {
      restoreOptimisticUiState(optimisticSnapshot);
      console.warn("Everrealm server clinic recovery command failed.", error);
      const code = String(error?.code || "");
      if (code.includes("unauthenticated")) showToast("登入狀態已失效，請重新登入。", "danger");
      else if (code.includes("failed-precondition")) showToast("雲端角色資料尚未準備好，請稍後再試。", "danger");
      else showToast("伺服器暫時未能處理治療。", "danger");
    } finally {
      recoveryCommandPending = false;
      endOptimisticUiMutation();
    }
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
          action: () => { void healAtClinicCommand(); },
        },
        { label: "不用了", buttonStyle: "secondary", action: () => {} },
      ],
    });
  }

  function interactGeneralStore(npc) {
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: ["你好呀！今日想買定賣嘢呀？"],
      choiceLayout: "compact",
      choices: [
        { label: "買嘢", buttonStyle: "primary", action: () => openGeneralStore("buy") },
        { label: "賣嘢", buttonStyle: "secondary", action: () => openGeneralStore("sell") },
        { label: "等陣先", buttonStyle: "secondary", action: () => {} },
      ],
    });
  }

  function openGeneralStore(tradeMode = "buy") {
    const nextTradeMode = tradeMode === "sell" ? "sell" : "buy";
    const opened = openFacility("shop", "general-store");
    if (!opened) return false;
    shopTradeMode = nextTradeMode;
    selectedShopItemId = null;
    renderFacility();
    return true;
  }

  function openEquipmentShop(tradeMode = "buy") {
    const nextTradeMode = tradeMode === "sell" ? "sell" : "buy";
    const opened = openFacility("shop", "shop");
    if (!opened) return false;
    shopTradeMode = nextTradeMode;
    selectedShopItemId = null;
    renderFacility();
    return true;
  }

  function interactEquipmentShop(npc) {
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: ["你好呀！今日想買定賣嘢呀？"],
      choiceLayout: "compact",
      choices: [
        { label: "買裝備", buttonStyle: "primary", action: () => openEquipmentShop("buy") },
        { label: "賣裝備", buttonStyle: "secondary", action: () => openEquipmentShop("sell") },
        { label: "等陣先", buttonStyle: "secondary", action: () => {} },
      ],
    });
  }

  function interactInn(npc) {
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: ["歡迎來到旅館！不過我哋仲準備緊，暫時未正式營業呢。"],
    });
  }

  function mainQuestIntroLines(quest) {
    if (!quest) return ["暫時冇新嘢要你做。"];
    if (quest.id === "main-1") return [
      "想喺公會企穩陣腳，淨係識打架仲未夠。先由唔同類型嘅委託做起，等我睇下你點應付。",
      "完成一星、二星同三星委託各一次，再返嚟搵我。",
    ];
    if (quest.id === "main-2") return [
      "做過幾輪委託，下一步就睇你係咪真係明白戰場規則。",
      "我會問你五條問題。答錯唔緊要，諗清楚再答。",
    ];
    return [
      "你而家已經唔係淨係跟住人行嘅新人。下一步，我想你親自取得會長洛琪希嘅認同。",
      "由而家開始重新做出一次足以令佢畀你特別獎勵嘅表現，再返嚟搵我。",
    ];
  }

  async function startMainQuestFromEris(npc, questId) {
    if (!ServerApi?.quest) return showToast("伺服器主線指令尚未就緒。", "danger");
    if (!beginGuildQuestMutation()) return;
    try {
      const result = await runGuildQuestServerCommand("main-start", { questId });
      if (!result?.ok) return showToast(result?.reason === "level" ? "等級仲未足夠。" : "暫時未能開始主線。", "danger");
      applyAuthoritativeState(result.state);
      const quest = result.quest || MainQuest.activeQuest(mainQuestState);
      addSystemMessage("quest", `主線開始：${quest?.title || "新任務"}`);
      sound.crystal();
      startDialogue({ speaker: npc.name, color: npc.color, lines: mainQuestIntroLines(quest) });
    } catch (error) {
      serverCommandError(error, "伺服器暫時未能開始主線。");
    } finally {
      endGuildQuestMutation();
    }
  }

  function showMainQuestQuiz(npc) {
    const question = MainQuest.currentQuizQuestion(mainQuestState);
    if (!question) return interactMainQuestNpc(npc);
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: [`第 ${MainQuest.normalizeState(mainQuestState).progress.quizIndex + 1} 題。${question.prompt}`],
      choiceLayout: "compact",
      choices: question.choices.map((label, answerIndex) => ({
        label,
        buttonStyle: "secondary",
        action: () => answerMainQuestQuiz(npc, question.id, answerIndex),
      })),
    });
  }

  async function answerMainQuestQuiz(npc, questionId, answerIndex) {
    if (!ServerApi?.quest) return showToast("伺服器主線指令尚未就緒。", "danger");
    if (!beginGuildQuestMutation()) return;
    try {
      const result = await runGuildQuestServerCommand("main-answer", { questionId, answerIndex });
      if (!result?.ok) return showToast("題目狀態已更新，請再同艾利斯傾偈。", "danger");
      applyAuthoritativeState(result.state);
      if (!result.correct) {
        return startDialogue({
          speaker: npc.name,
          color: npc.color,
          lines: ["唔啱。", result.explanation || "再諗清楚戰場規則。"],
          choices: [{ label: "再答一次", buttonStyle: "primary", action: () => showMainQuestQuiz(npc) }],
        });
      }
      if (result.completedObjective) {
        sound.level();
        return startDialogue({ speaker: npc.name, color: npc.color, lines: ["好，基本功你算係掌握到。獎勵你自己揀一本啱用嘅技能書。"], choices: [{ label: "選擇獎勵", buttonStyle: "primary", action: () => showMainQuestRewardChoices(npc) }] });
      }
      return startDialogue({
        speaker: npc.name,
        color: npc.color,
        lines: ["答啱。下一題。"],
        choices: [{ label: "繼續", buttonStyle: "primary", action: () => showMainQuestQuiz(npc) }],
      });
    } catch (error) {
      serverCommandError(error, "伺服器暫時未能提交答案。");
    } finally {
      endGuildQuestMutation();
    }
  }

  function showMainQuestRewardChoices(npc) {
    const quest = MainQuest.activeQuest(mainQuestState);
    const pool = MainQuest.rewardSkillPool(mainQuestState, skillState);
    if (!quest || !pool.length) return startDialogue({ speaker: npc.name, color: npc.color, lines: ["獎勵名單暫時整理唔到，遲少少再搵我。"] });
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: [`主線${quest.number}完成。揀一本 ${Skills.formatSkillBookRank(quest.reward.manualStar)} 技能書；呢本係公會發畀你本人，唔可以交易。`],
      choiceLayout: "compact",
      choices: pool.map((skill) => ({
        label: skill.name,
        buttonStyle: "secondary",
        action: () => claimMainQuestReward(npc, skill.id),
      })),
    });
  }

  async function claimMainQuestReward(npc, skillId) {
    if (!ServerApi?.quest) return showToast("伺服器主線指令尚未就緒。", "danger");
    if (!beginGuildQuestMutation()) return;
    try {
      const result = await runGuildQuestServerCommand("main-claim", { skillId });
      if (!result?.ok) return showToast("獎勵暫時未能領取，請再試一次。", "danger");
      applyAuthoritativeState(result.state);
      const quest = result.quest;
      const skillName = result.reward?.skill?.name || Skills.getSkill(skillId)?.name || "技能書";
      const panelName = result.reward?.panel?.name || quest?.reward?.panelName || "新面板";
      selectedLoadoutPanelId = panelState.equippedPanelId;
      sound.level();
      showToast(`主線完成 · ${skillName}（綁定）＋${panelName}`, "good");
      addSystemMessage("quest", `主線完成：${quest?.title || "主線任務"}`);
      addSystemMessage("reward", `獲得技能書：${skillName}（綁定）・獲得「${panelName}」`);
      startDialogue({
        speaker: npc.name,
        color: npc.color,
        lines: ["做得唔錯。呢本技能書同新面板都係你嘅。技能書已經放入物品欄；面板可以去城門配置。"],
      });
    } catch (error) {
      serverCommandError(error, "伺服器暫時未能領取主線獎勵。");
    } finally {
      endGuildQuestMutation();
    }
  }

  function interactMainQuestNpc(npc) {
    const view = MainQuest.view(mainQuestState, player.level);
    const quest = view.quest;
    if (view.state === "available" && quest) {
      return startDialogue({
        speaker: npc.name,
        color: npc.color,
        lines: [`有新嘢畀你做。——「${quest.title}」`, ...mainQuestIntroLines(quest).slice(0, 1)],
        choiceLayout: "compact",
        choices: [
          { label: "接受主線", buttonStyle: "primary", action: () => startMainQuestFromEris(npc, quest.id) },
          { label: "遲啲先", buttonStyle: "secondary", action: () => {} },
        ],
      });
    }
    if (view.state === "locked" && quest) {
      return startDialogue({ speaker: npc.name, color: npc.color, lines: [`你而家先專心磨練下。等去到 Lv.${quest.requiredLevel}，我再有嘢畀你做。`] });
    }
    if (view.state === "complete") {
      return startDialogue({ speaker: npc.name, color: npc.color, lines: ["暫時要教你嘅就到呢度。繼續行遠啲，之後自然仲有新考驗。"] });
    }
    if (!quest) return startDialogue({ speaker: npc.name, color: npc.color, lines: ["暫時冇新嘢要你做。"] });
    if (view.ready) {
      return startDialogue({
        speaker: npc.name,
        color: npc.color,
        lines: ["要求你已經做晒。今次獎勵由你自己揀。"],
        choices: [{ label: "選擇獎勵", buttonStyle: "primary", action: () => showMainQuestRewardChoices(npc) }],
      });
    }
    if (quest.objectiveType === "quiz") return showMainQuestQuiz(npc);
    if (quest.id === "main-1") {
      const p = MainQuest.normalizeState(mainQuestState).progress.commissionStars;
      const missing = [1, 2, 3].filter((star) => !p[star]);
      return startDialogue({ speaker: npc.name, color: npc.color, lines: [`仲差啲火候。未完成嘅委託級別：${missing.map((star) => `${star}★`).join("、")}。做完再返嚟搵我。`] });
    }
    return startDialogue({ speaker: npc.name, color: npc.color, lines: ["今次唔係我畀答案你。去做出一輪足以令會長洛琪希親自畀你特別獎勵嘅表現，再返嚟。"] });
  }

  async function interactGuildSocialNpc(npc) {
    const isEris = npc.id === "guild-eris";
    if (isEris) return interactMainQuestNpc(npc);

    const progress = Guild.normalizeState(guildCommissionState).fourStarProgress;
    const rewardReady = Guild.FOUR_STAR_PROGRESS_STARS.every((star) => progress[star]);
    if (!rewardReady) {
      const nextStar = Guild.FOUR_STAR_PROGRESS_STARS.find((star) => !progress[star]);
      const hint = nextStar === 1
        ? "最近城外啲小雞又開始周圍搞事。你如果順手幫公會處理下，我可能有啲好嘢畀你。"
        : nextStar === 2
          ? "最近有啲人將心願交咗畀公會。你有空去幫佢哋完成下，我會記住你嘅。"
          : "灰紋紅嗰邊最近又有啲麻煩。如果你肯幫手討伐，我會準備份獎勵畀你。";
      return startDialogue({ speaker: npc.name, color: npc.color, lines: [hint] });
    }

    if (!ServerApi?.quest) return startDialogue({ speaker: npc.name, color: npc.color, lines: ["我本來準備咗份獎勵畀你，不過而家公會記錄暫時連唔上。遲啲再搵我啦。"] });
    if (!beginGuildQuestMutation()) return;
    const optimisticSnapshot = captureGuildQuestOptimisticState();
    const predicted = Guild.claimFourStarReward(guildCommissionState);
    if (!predicted.ok) {
      endGuildQuestMutation();
      return startDialogue({ speaker: npc.name, color: npc.color, lines: ["再幫公會處理多啲委託先啦，我會留意住你嘅表現。"] });
    }

    guildCommissionState = predicted.state;
    renderGuildQuestOptimisticState();
    sound.level();
    startDialogue({
      speaker: npc.name,
      color: npc.color,
      lines: [
        "呢排你替公會分擔咗唔少事情，由零碎瑣事到較麻煩嘅委託，都見到你有份幫手。",
        "呢份獎勵，算係我私人畀你嘅。",
      ],
    });
    showToast("洛琪希特別獎勵・4★技能書信封 ×1", "good");

    try {
      const result = await runGuildQuestServerCommand("claim-four-star", {});
      if (!result?.ok) {
        restoreGuildQuestOptimisticState(optimisticSnapshot);
        return showToast(guildQuestServerRejectMessage(result?.reason, "四星獎勵暫時未能領取，請再試一次。"), "danger");
      }
      applyAuthoritativeState(result.state);
      addSystemMessage("reward", "洛琪希特別獎勵・4★技能書信封 ×1");
    } catch (error) {
      restoreGuildQuestOptimisticState(optimisticSnapshot);
      serverCommandError(error, "伺服器暫時未能領取四星獎勵。");
    } finally {
      endGuildQuestMutation();
    }
  }

  function openChest(chest) {
    if (openedChests.has(chest.id)) return;
    if (chest.lockedBy && enemies.some((enemy) => enemy.id === chest.lockedBy && enemy.alive)) {
      showToast("寶箱畀守門者嘅魔力鎖住。", "danger");
      return;
    }
    openedChests.add(chest.id);
    PlayerStateActions.grantCoins(player, chest.reward.coins || 0);
    PlayerStateActions.grantHealingPotions(player, chest.reward.potions || 0, { maxPotions: 9 });
    const treasureEquipment = null;
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


  function startDialogue(config) {
    mode = "dialogue";
    stage.dataset.gameState = mode;
    syncExploreSidebarVisibility();
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
      gender: player.gender,
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
      gender: pendingPlayerGender,
      x: preview.width / 2,
      y: preview.height - 26,
      scale: 2.05,
      state: "idle",
      facing: "down",
      phase: elapsed,
      bitmap: true,
    });
  }

  function updateGenderChoiceUi() {
    for (const button of document.querySelectorAll("[data-gender-choice]")) {
      const selected = normalizeGender(button.dataset.genderChoice) === pendingPlayerGender;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
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
    syncExploreSidebarVisibility();
    canvas.focus({ preventScroll: true });
    if (runCallback) callback?.();
    updateHud(true);
  }

  function guildRankInfo() {
    if (guildMarks >= 18) return { name: "金章領航員", next: null, icon: "✦" };
    if (guildMarks >= 10) return { name: "銀章巡路者", next: 18, icon: "◇" };
    if (guildMarks >= 4) return { name: "銅章冒險者", next: 10, icon: "◆" };
    return { name: "見習冒險者", next: 4, icon: "·" };
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
    const weapon = equipmentItem(equipped.weapon)?.name || "見習拳套";
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

  function getMissionFacilityViewData() {
    const active = activeGuildCommission();
    const commission = active ? (() => {
      const progressMax = active.type === "hunt" ? active.objective.count : 1;
      const progressValue = guildCommissionProgressValue(active);
      return {
        active: true,
        ready: guildCommissionState.status === "ready_to_report",
        title: active.title,
        objectiveText: guildCommissionObjectiveText(active),
        progressText: guildCommissionProgressText(active),
        progressMax,
        progressValue,
        progressPercent: Math.min(100, progressValue / Math.max(1, progressMax) * 100),
      };
    })() : { active: false };
    const mainView = MainQuest.view(mainQuestState, player.level);
    return {
      main: {
        ...mainView,
        title: mainView.quest?.title || (mainView.state === "complete" ? "目前主線已完成" : "下一段主線"),
      },
      commission,
    };
  }
  const renderMissionFacility = () => FacilityBasicViews.renderMissionFacility({
    content: facilityContent,
    setFacilityFooter,
    view: getMissionFacilityViewData(),
  });

  function guildRewardText(commission) {
    const coins = Math.max(0, Math.floor(Number(commission?.reward?.coins) || 0));
    return `${skillBookRewardText(commission)} + ${coins.toLocaleString("zh-HK")} 金幣`;
  }

  function renderGuildFacility() {
    const active = activeGuildCommission();
    const offers = Guild.DEFAULT_COMMISSIONS || currentContractOffers();
    FacilityProgressionViews.renderGuildFacility({
      content: facilityContent,
      setFacilityFooter,
      offers,
      activeId: active?.id || null,
      status: guildCommissionState.status,
      formatSkillBookRank: Skills.formatSkillBookRank,
    });
  }

  function renderGuildCommissionDetail(commissionId) {
    const commission = Guild.getCommission(commissionId) || currentContractOffers().find((offer) => offer.id === commissionId) || activeGuildCommission();
    if (!commission || !guildCommissionDetailContent) return false;
    const active = activeGuildCommission();
    const isActive = active?.id === commission.id;
    const ready = isActive && guildCommissionState.status === "ready_to_report";
    const objective = guildCommissionObjectiveText(commission);
    const progress = isActive ? guildCommissionProgressText(commission, guildCommissionState) : (commission.type === "hunt" ? `0 / ${commission.objective.count}` : "尚未完成");
    const questActionState = guildQuestMutationPending ? ' disabled aria-busy="true"' : "";
    const action = isActive
      ? ready
        ? `<button class="facility-action-button" type="button" data-guild-detail-action="claim" data-contract-id="${guildCommissionState.cycle}:${commission.id}"${questActionState}>回報並領取</button>`
        : `<button class="facility-action-button is-quiet" type="button" data-guild-detail-action="abandon" data-contract-id="${guildCommissionState.cycle}:${commission.id}"${questActionState}>放棄委託</button>`
      : active
        ? `<button class="facility-action-button" type="button" disabled>已有進行中委託</button>`
        : `<button class="facility-action-button" type="button" data-guild-detail-action="accept" data-offer-id="${commission.id}"${questActionState}>接受委託</button>`;
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
    return Guild.ENVELOPE_STARS.reduce((total, star) => total + (guildCommissionState.envelopes[star] || 0), 0)
      + Skills.BOOK_STARS.reduce((total, star) => total + (state.books[star] || 0), 0)
      + Object.values(state.manualCounts || {}).reduce((total, count) => total + count, 0)
      + Object.values(state.boundManualCounts || {}).reduce((total, count) => total + count, 0);
  }

  function updateMenuBadges() {
    const inventoryLabel = "打開物品欄（I）";
    if (inventoryButton.getAttribute("aria-label") !== inventoryLabel) inventoryButton.setAttribute("aria-label", inventoryLabel);

    const mainView = MainQuest.view(mainQuestState, player.level);
    const missionReady = Boolean(
      (activeGuildCommission() && guildCommissionState.status === "ready_to_report")
      || mainView.ready
      || mainView.state === "available"
    );
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
    const equipmentCounts = new Map();
    for (const id of ownedEquipment) equipmentCounts.set(id, (equipmentCounts.get(id) || 0) + 1);
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
        quantity: equipmentCounts.get(item.id) || 1,
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
      description: `回復 ${POTION_HEAL} HP；探索同戰鬥都用得到。`,
      detail: player.hp >= maxHp ? "目前生命已全滿" : `目前 HP ${Math.ceil(player.hp)} / ${maxHp}`,
      action: "use-potion", actionLabel: player.hp >= maxHp ? "生命已滿" : "使用", disabled: player.hp >= maxHp,
      destroyable: true,
    });
    const weakPotionCount = Math.max(0, Math.floor(Number(inventory.weak_potion) || 0));
    if (weakPotionCount > 0) items.push({
      id: "weak_potion", name: "弱氣之藥", category: "消耗品", quantity: weakPotionCount,
      categoryKey: "consumable",
      description: ItemData?.getItem?.("weak_potion")?.description || "一瓶來歷可疑的藥氣之藥。據說喝下後會令人變得孱弱，但身上散出的怪味，卻會令附近魔物蠢蠢欲動。",
      detail: weakPotionStepsRemaining > 0 ? "怪味仲纏住你，附近怪物似乎更加躁動。" : "喝下後，這股古怪氣味會跟住你一段路。",
      action: "use-weak-potion", actionLabel: weakPotionStepsRemaining > 0 ? "重新使用" : "使用",
      destroyable: true,
    });
    for (const star of Guild.ENVELOPE_STARS) {
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
      const pool = playerClassId === "fighter"
        ? Skills.getFighterGuildBookPool(star)
        : Skills.getSkillsByStar(star, { classId: playerClassId });
      const apBand = Skills.AP_BANDS[star] || null;
      items.push({
        id: `skill_book_${star}`,
        name: `${Skills.formatSkillBookRank(star)} 技能書`,
        rankLabel: Skills.formatSkillBookRank(star),
        category: `${Skills.formatSkillBookRank(star)} 技能書`,
        categoryKey: "skillbook",
        quantity: count,
        description: `開封後會抽出 ${pool.length} 本對應職業技能書；唔會直接學識。`,
        detail: playerClassId === "fighter"
          ? `格鬥士公會技能書 · Rank ${star}`
          : apBand ? `技能消耗範圍 ${apBand.min}–${apBand.max} AP` : "目前職業沒有對應技能池",
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
        iconItemId: `skill_book_${skill.classId === "fighter" ? (skill.guildBookStars?.[0] || skill.star || 1) : (skill.star || 1)}`,
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
    for (const [skillId, count] of Object.entries(skillState.boundManualCounts || {})) {
      if (!count) continue;
      const skill = Skills.getSkill(skillId);
      if (!skill) continue;
      const classLocked = skill.classId !== playerClassId;
      const learnability = classLocked ? { status: "conditionLocked" } : Skills.skillLearnability(skillState, skill.id);
      items.push({
        id: `bound_manual_${skill.id}`,
        iconItemId: `skill_book_${skill.classId === "fighter" ? (skill.guildBookStars?.[0] || skill.star || 1) : (skill.star || 1)}`,
        name: `技能書：${skill.name}（綁定）`,
        rankLabel: skill.classId === "fighter" ? fighterGuildBookRankText(skill) : skillStars(skill.star),
        category: `${skill.classId === "fighter" ? fighterGuildBookRankText(skill) : skillStars(skill.star)} 技能書 · 綁定`,
        categoryKey: "skillbook",
        quantity: count,
        description: skill.description,
        detail: `${skillRangeText(skill)} · 速度 ${skill.speedGrade} · 不可交易`,
        action: "use-bound-manual",
        actionLabel: learnability.status === "learned" ? "已學習" : learnability.status === "canLearn" ? "學習" : "無法學習",
        disabled: learnability.status !== "canLearn",
        manualSkillId: skill.id,
        destroyable: false,
        bound: true,
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
      const fixtureNames = ["晶石碎片", "舊銅齒輪", "潮濕苔絲", "微光粉末", "山徑玻璃", "巡夜羽片"];
      for (let index = 0; index < inventoryFixtureCount; index += 1) {
        items.push({ id: `fixture_material_${index + 1}`, name: `${fixtureNames[index % fixtureNames.length]} ${index + 1}`, category: "素材 · 測試", categoryKey: "material", quantity: 1, iconId: 4 + (index % 11), description: "只供版面壓力測試使用，不會寫入存檔。", detail: "UI fixture" });
      }
    }
    const filteredItems = items.filter((item) => inventoryCategory === "all" || item.categoryKey === inventoryCategory);
    const pageCount = Math.max(1, Math.ceil(filteredItems.length / INVENTORY_PAGE_SIZE));
    inventoryPage = Core.clamp(inventoryPage, 0, pageCount - 1);
    const visibleItems = filteredItems.slice(inventoryPage * INVENTORY_PAGE_SIZE, (inventoryPage + 1) * INVENTORY_PAGE_SIZE);
    if (!items.some((item) => item.id === selectedInventoryItemId)) {
      selectedInventoryItemId = null;
      pendingInventoryDestroyItemId = null;
    }
    const selectedItem = items.find((item) => item.id === selectedInventoryItemId) || null;
    FacilityBagView.renderBagFacility({
      content: facilityContent,
      setFacilityFooter,
      filteredItems,
      visibleItems,
      selectedItem,
      pendingDestroyItemId: pendingInventoryDestroyItemId,
      inventoryCategory,
      inventoryPage,
      pageCount,
      coins: player.coins,
      equipmentIconHtml,
      paperdollSlotHtml,
      envelopeIconHtml,
      itemIconHtml,
      atlasIconHtml,
      coinAmountHtml,
    });
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
    Art.drawCharacter(dollCtx, { actor: "player", classId: playerClassId, gender: player.gender, x: doll.width / 2, y: doll.height - 8, scale: 1.8, state: "idle", facing: "down", phase: elapsed, bitmap: true });
  }

  function renderEquipmentFacility() {
    FacilityCatalogViews.renderEquipmentFacility({
      content: facilityContent,
      setFacilityFooter,
      stats: playerStats(),
      level: player.level,
      displayName: playerDisplayName(),
      ownedEquipment,
      equipped,
      catalog: Expansion.DEFAULT_EQUIPMENT_CATALOG,
      equipmentMatchesClass,
      isEquipmentEquipped: Expansion.isEquipmentEquipped,
      statText,
      equipmentIconHtml,
      paperdollSlotHtml,
      drawEquipmentPaperdoll,
    });
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

  function shopSellItems() {
    const sellItems = [];
    const equipmentCounts = new Map();
    for (const id of ownedEquipment) equipmentCounts.set(id, (equipmentCounts.get(id) || 0) + 1);
    for (const item of Expansion.DEFAULT_EQUIPMENT_CATALOG) {
      const quantity = equipmentCounts.get(item.id) || 0;
      const sellPrice = equipmentSellPrice(item);
      if (!quantity || sellPrice <= 0) continue;
      sellItems.push({
        id: item.id,
        name: item.name,
        description: item.description,
        quantity,
        equipment: item,
        isEquipped: Expansion.isEquipmentEquipped({ equipped }, item.id),
        sellPrice,
        statText: statText(item.stats),
      });
    }
    if (player.potions > 0) {
      sellItems.push({
        id: "healing_potion",
        name: "小型回復藥",
        quantity: player.potions,
        description: GENERAL_STORE_GOODS_BY_ID.get("healing_potion")?.description || `回復 ${POTION_HEAL} HP。`,
        sellPrice: generalStoreSellPrice("healing_potion"),
      });
    }
    for (const [id, quantity] of Object.entries(inventory).filter(([, amount]) => Number(amount) > 0)) {
      const item = ItemData?.getItem?.(id);
      if (!item || ["ui", "currency", "quest"].includes(item.kind) || item.sellable === false) continue;
      sellItems.push({
        id,
        name: item.name || inventoryItemName(id),
        quantity: Number(quantity),
        description: item.description || materialDescription(id),
        sellPrice: generalStoreSellPrice(id),
      });
    }
    return sellItems
      .filter((item) => item.sellPrice > 0)
      .sort((left, right) => left.name.localeCompare(right.name, "zh-HK"));
  }

  function renderShopFacility() {
    const atShop = currentMapId === "shop";
    const discountRate = guildDiscountRate();
    if (!["buy", "sell"].includes(shopTradeMode)) shopTradeMode = "buy";
    if (!FacilityCatalogViews.SHOP_CATEGORY_KEYS.includes(equipmentShopCategory)) equipmentShopCategory = "weapon";
    FacilityCatalogViews.renderShopFacility({
      content: facilityContent,
      setFacilityFooter,
      mode: shopTradeMode,
      tradeTabs: shopTradeTabsHtml(),
      atShop,
      category: equipmentShopCategory,
      discountRate,
      guildRankName: discountRate ? guildRankInfo().name : "",
      coins: player.coins,
      level: player.level,
      selectedShopItemId,
      catalog: Expansion.DEFAULT_EQUIPMENT_CATALOG,
      fighterShopItemIdSet: FIGHTER_SHOP_ITEM_ID_SET,
      equipmentMatchesClass,
      statText,
      equipmentIconHtml,
      itemIconHtml,
      coinAmountHtml,
      sellItems: shopSellItems(),
    });
  }

  function renderGeneralStoreFacility() {
    if (!["buy", "sell"].includes(shopTradeMode)) shopTradeMode = "buy";
    FacilityCatalogViews.renderGeneralStoreFacility({
      content: facilityContent,
      setFacilityFooter,
      mode: shopTradeMode,
      tradeTabs: shopTradeTabsHtml(),
      coins: player.coins,
      potions: player.potions,
      inventory,
      goods: GENERAL_STORE_GOODS,
      goodsById: GENERAL_STORE_GOODS_BY_ID,
      selectedShopItemId,
      sellItems: shopSellItems(),
      equipmentIconHtml,
      statText,
      itemIconHtml,
      coinAmountHtml,
    });
  }

  async function buyGeneralStoreItem(itemId) {
    const item = GENERAL_STORE_GOODS_BY_ID.get(itemId);
    if (!item || currentMapId !== "general-store") return showToast("呢件商品而家買唔到。", "danger");
    if (!ServerApi?.economy) return showToast("伺服器交易指令尚未就緒。", "danger");
    if (player.coins < item.price) return showToast("金幣唔夠。", "danger");
    if (itemId === "healing_potion" && player.potions >= 9) return showToast("已經帶到上限。", "danger");
    if (itemId !== "healing_potion" && Math.max(0, Math.floor(Number(inventory[itemId]) || 0)) >= 999) return showToast("已經帶到上限。", "danger");
    if (!beginOptimisticUiMutation()) return;

    const optimisticSnapshot = captureOptimisticUiState();
    player.coins = Core.clamp(player.coins - item.price, 0, 99999);
    if (itemId === "healing_potion") player.potions = Core.clamp(player.potions + 1, 0, 9);
    else inventory[itemId] = Math.max(0, Math.floor(Number(inventory[itemId]) || 0)) + 1;
    renderOptimisticUiState();
    sound.coin();

    try {
      await flushForServerCommand();
      const result = await ServerApi.economy("buy-store-item", { itemId });
      if (!result?.ok) {
        restoreOptimisticUiState(optimisticSnapshot);
        if (result?.reason === "coins") return showToast("金幣唔夠。", "danger");
        if (result?.reason === "full") return showToast("已經帶到上限。", "danger");
        return showToast("呢件商品而家買唔到。", "danger");
      }
      applyAuthoritativeState(result.state);
      showToast(`買到 ${item.name}`, "good");
      addSystemMessage("item", `購買 ${item.name} · -${result.price ?? item.price} 金幣`);
      renderFacility();
    } catch (error) {
      restoreOptimisticUiState(optimisticSnapshot);
      serverCommandError(error, "伺服器暫時未能完成購買。");
    } finally {
      endOptimisticUiMutation();
    }
  }

  async function sellEquipmentItem(itemId) {
    if (!["shop", "general-store"].includes(currentMapId)) return showToast("出售物品要親身去商店。", "danger");
    const item = equipmentItem(itemId);
    if (!item) return showToast("你冇呢件裝備。", "danger");
    if (!ServerApi?.economy) return showToast("伺服器交易指令尚未就緒。", "danger");
    const ownedCount = ownedEquipment.filter((id) => id === item.id).length;
    if (ownedCount <= 0) return showToast("你冇呢件裝備。", "danger");
    if (Expansion.isEquipmentEquipped({ equipped }, item.id) && ownedCount <= 1) return showToast("請先卸下裝備。", "danger");
    const predictedPrice = equipmentSellPrice(item);
    if (predictedPrice <= 0) return showToast("呢件裝備唔可以出售。", "danger");
    if (!beginOptimisticUiMutation()) return;

    const optimisticSnapshot = captureOptimisticUiState();
    ownedEquipment.splice(ownedEquipment.indexOf(item.id), 1);
    player.coins = Core.clamp(player.coins + predictedPrice, 0, 99999);
    renderOptimisticUiState();
    sound.coin();

    try {
      await flushForServerCommand();
      const result = await ServerApi.economy("sell-equipment", { itemId });
      if (!result?.ok) {
        restoreOptimisticUiState(optimisticSnapshot);
        if (result?.reason === "equipped") return showToast("請先卸下裝備。", "danger");
        if (result?.reason === "missing") return showToast("你冇呢件裝備。", "danger");
        return showToast("呢件裝備唔可以出售。", "danger");
      }
      applyAuthoritativeState(result.state);
      selectedShopItemId = null;
      showToast(`已出售：${item.name} · +${result.price} 金幣`, "good");
      addSystemMessage("item", `出售 ${item.name} · +${result.price} 金幣`);
      renderFacility();
    } catch (error) {
      restoreOptimisticUiState(optimisticSnapshot);
      serverCommandError(error, "伺服器暫時未能完成出售。");
    } finally {
      endOptimisticUiMutation();
    }
  }

  async function sellGeneralStoreItem(itemId) {
    if (!["shop", "general-store"].includes(currentMapId)) return showToast("出售物品要親身去商店。", "danger");
    if (!ServerApi?.economy) return showToast("伺服器交易指令尚未就緒。", "danger");
    const itemName = inventoryItemName(itemId);
    const predictedPrice = generalStoreSellPrice(itemId);
    if (predictedPrice <= 0) return showToast("呢件物品唔可以出售。", "danger");
    const currentQuantity = itemId === "healing_potion"
      ? Math.max(0, Math.floor(Number(player.potions) || 0))
      : Math.max(0, Math.floor(Number(inventory[itemId]) || 0));
    if (currentQuantity <= 0) return showToast("你冇呢件物品。", "danger");
    if (!beginOptimisticUiMutation()) return;

    const optimisticSnapshot = captureOptimisticUiState();
    if (itemId === "healing_potion") player.potions = Math.max(0, currentQuantity - 1);
    else if (currentQuantity > 1) inventory[itemId] = currentQuantity - 1;
    else delete inventory[itemId];
    player.coins = Core.clamp(player.coins + predictedPrice, 0, 99999);
    renderOptimisticUiState();
    sound.coin();

    try {
      await flushForServerCommand();
      const result = await ServerApi.economy("sell-store-item", { itemId });
      if (!result?.ok) {
        restoreOptimisticUiState(optimisticSnapshot);
        if (result?.reason === "missing") return showToast("你冇呢件物品。", "danger");
        return showToast("呢件物品唔可以出售。", "danger");
      }
      applyAuthoritativeState(result.state);
      selectedShopItemId = null;
      showToast(`已出售：${itemName} · +${result.price} 金幣`, "good");
      addSystemMessage("item", `出售 ${itemName} · +${result.price} 金幣`);
      renderFacility();
    } catch (error) {
      restoreOptimisticUiState(optimisticSnapshot);
      serverCommandError(error, "伺服器暫時未能完成出售。");
    } finally {
      endOptimisticUiMutation();
    }
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

  function getStatusFacilityViewData() {
    const stats = playerStats();
    const hp = Math.ceil(player.hp);
    const xpNeeded = Core.xpRequired(player.level);
    return {
      displayName: playerDisplayName(),
      className: playerClassId === "fighter" ? "格鬥士" : playerClassId === "elementalist" ? "精靈魔導師" : "冒險者",
      level: player.level,
      hp,
      maxHp: stats.maxHp,
      hpPercent: Core.clamp((player.hp / stats.maxHp) * 100, 0, 100),
      xp: player.xp,
      xpNeeded,
      xpPercent: Core.clamp((player.xp / xpNeeded) * 100, 0, 100),
      attack: stats.attack,
      defence: stats.defence,
      moveRange: battleMoveCapacityForPlayer(stats),
    };
  }
  const renderStatusFacility = () => FacilityBasicViews.renderStatusFacility({
    content: facilityContent,
    setFacilityFooter,
    view: getStatusFacilityViewData(),
  });

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
    const states = new Map(classSkills.map((skill) => [skill.id, Skills.skillLearnability(skillState, skill.id)]));
    FacilityProgressionViews.renderSkillsFacility({
      content: facilityContent,
      setFacilityFooter,
      classSkills,
      layout,
      states,
      stateLabel: skillTreeStateLabel,
    });
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
      untargetable: () => "半透明／不可直接選取",
      stealth: () => "半透明／不可直接選取",
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
    const manualCount = (skillState.manualCounts?.[skill.id] || 0) + (skillState.boundManualCounts?.[skill.id] || 0);
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
    const bound = !(skillState.manualCounts?.[skillId] > 0) && (skillState.boundManualCounts?.[skillId] > 0);
    closeSkillDetail(false);
    learnSkillManualImmediately(skillId, { bound });
  }

  function renderDeckFacilityForState(state) {
    if (!state?.content) return;
    panelState = Panels.normalizeState(panelState, skillState);
    skillState = Panels.syncSkillState(panelState, skillState);
    if (!panelState.panels[selectedLoadoutPanelId]) selectedLoadoutPanelId = panelState.equippedPanelId;
    const canEdit = state.context === "deck" && currentMapId === "world";
    const panels = Panels.listOwned(panelState, skillState).map((panel) => ({
      ...panel,
      slots: panel.slots.map((skillId) => skillId ? Skills.getSkill(skillId) : null),
    }));
    const learnedSkills = canEdit
      ? Skills.getSkillsByClass(playerClassId).filter((skill) => skillState.unlockedSkillIds.some((id) => Skills.canonicalSkillId(id) === skill.id) && !skill.tags.includes("passive"))
      : [];
    FacilityProgressionViews.renderDeckFacility({
      content: state.content,
      setFacilityFooter: (message) => UiDom.setFacilityFooter(state.footer, message),
      canEdit,
      panels,
      selectedPanelId: selectedLoadoutPanelId,
      equippedPanelId: panelState.equippedPanelId,
      pendingEquipPanelId: pendingPanelEquipId,
      learnedSkills,
      skillBadgeMarkup,
    });
  }

  function renderDeckFacility() {
    skillState = Skills.normalizeSkillState(skillState, { classId: playerClassId });
    panelState = Panels.normalizeState(panelState, skillState);
    skillState = Panels.syncSkillState(panelState, skillState);
    renderDeckFacilityForState(activeFacilityWindow);
  }

  function refreshOpenDeckWindows() {
    if (!facilityWindows.size) return;
    skillState = Skills.normalizeSkillState(skillState, { classId: playerClassId });
    panelState = Panels.normalizeState(panelState, skillState);
    skillState = Panels.syncSkillState(panelState, skillState);
    for (const state of facilityWindows.values()) {
      if (state.tab !== "deck" || state === activeFacilityWindow) continue;
      renderDeckFacilityForState(state);
    }
  }

  function selectLoadoutPanel(panelId) {
    panelState = Panels.normalizeState(panelState, skillState);
    if (!panelState.panels?.[panelId]) return false;
    selectedLoadoutPanelId = panelId;
    pendingPanelEquipId = null;
    renderDeckFacility();
    refreshOpenDeckWindows();
    return true;
  }

  function requestEquipLoadoutPanel(panelId) {
    if (!(facilityContext === "deck" && currentMapId === "world")) return showToast("只可以喺舊港城門更換面板。", "danger");
    if (!panelState.panels?.[panelId] || panelId === panelState.equippedPanelId) return false;
    selectedLoadoutPanelId = panelId;
    pendingPanelEquipId = panelId;
    renderDeckFacility();
    return true;
  }

  function cancelEquipLoadoutPanel() {
    pendingPanelEquipId = null;
    renderDeckFacility();
  }

  async function confirmEquipLoadoutPanel(panelId) {
    if (!(facilityContext === "deck" && currentMapId === "world")) return showToast("只可以喺舊港城門更換面板。", "danger"), false;
    if (pendingPanelEquipId !== panelId) return false;
    if (!ServerApi?.economy) return showToast("伺服器面板指令尚未就緒。", "danger"), false;
    const prediction = Panels.equipPanel(panelState, panelId, skillState);
    if (!prediction.ok) return showToast("未能更換呢塊面板。", "danger"), false;
    if (!beginOptimisticUiMutation()) return false;
    const optimisticSnapshot = captureOptimisticUiState();
    panelState = prediction.state;
    skillState = prediction.skills;
    pendingPanelEquipId = null;
    selectedLoadoutPanelId = panelId;
    renderOptimisticUiState();
    try {
      await flushForServerCommand();
      const result = await ServerApi.economy("equip-panel", { panelId });
      if (!result?.ok) {
        restoreOptimisticUiState(optimisticSnapshot);
        return showToast(result?.reason === "interaction-too-far" ? "要行近城門面板先可以更換。" : "未能更換呢塊面板。", "danger"), false;
      }
      applyAuthoritativeState(result.state);
      sound.crystal();
      showToast(`已換成「${panelState.panels?.[panelId]?.name || "戰技面板"}」`, "good");
      saveImportant(false);
      return true;
    } catch (error) {
      restoreOptimisticUiState(optimisticSnapshot);
      serverCommandError(error, "暫時未能更換面板。");
      return false;
    } finally {
      endOptimisticUiMutation();
    }
  }

  async function openGuildSkillBook(star) {
    if (!ServerApi?.economy) return showToast("伺服器技能指令尚未就緒。", "danger");
    try {
      await flushForServerCommand();
      const result = await ServerApi.economy("open-skill-book", { star });
      if (!result?.ok) return showToast("你冇呢個星級嘅技能書，或者目前職業冇對應技能池。", "danger");
      applyAuthoritativeState(result.state);
      sound.crystal();
      const openedBookRank = Skills.formatSkillBookRank(star);
      const skillName = result.skill?.name || "未知技能";
      const openedBookMessage = `獲得技能書：${openedBookRank}「${skillName}」`;
      showToast(`抽到 ${openedBookRank}「${skillName}」技能書，已放入物品欄。`, "good");
      addSystemMessage("reward", openedBookMessage);
      announce(openedBookMessage);
      renderFacility();
      saveImportant(false);
    } catch (error) {
      serverCommandError(error, "暫時未能打開技能書。");
    }
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

  async function learnSkillManualImmediately(skillId, { bound = false } = {}) {
    if (!skillId) return false;
    if (!ServerApi?.economy) return showToast("伺服器技能指令尚未就緒。", "danger"), false;
    skillState = Skills.normalizeSkillState(skillState, { classId: playerClassId });
    const learnability = Skills.skillLearnability(skillState, skillId);
    if (learnability.status === "learned") return showToast("已學習", "good"), false;
    if (learnability.status !== "canLearn") return showToast("無法學習", "danger"), false;
    const predicted = Skills.learnSkillFromManual(skillState, skillId, { bound });
    if (!predicted?.ok) return showToast(predicted?.reason === "already-learned" ? "已學習" : "無法學習", predicted?.reason === "already-learned" ? "good" : "danger"), false;
    if (!beginOptimisticUiMutation()) return false;

    const optimisticSnapshot = captureOptimisticUiState();
    const skillName = predicted.skill?.name || Skills.getSkill(skillId)?.name || skillId;
    skillState = Panels.syncSkillState(panelState, predicted.state);
    pendingManualSkillId = null;
    skillBookConfirmPanel.hidden = true;
    renderOptimisticUiState();
    sound.crystal();

    try {
      const result = await ServerApi.economy("learn-skill-manual", { skillId, bound });
      if (!result?.ok) {
        restoreOptimisticUiState(optimisticSnapshot);
        showToast(result?.reason === "already-learned" ? "已學習" : "伺服器未能確認學習，技能書已復原。", result?.reason === "already-learned" ? "good" : "danger");
        return false;
      }
      applyAuthoritativeState(result.state);
      showToast(`已學識「${skillName}」；去城門面板配置先可出戰。`, "good");
      addSystemMessage("reward", `學會新技能：${skillName}`);
      if (facilityWindows.size) renderFacility();
      return true;
    } catch (error) {
      restoreOptimisticUiState(optimisticSnapshot);
      serverCommandError(error, "暫時未能學習技能；技能書已復原。");
      return false;
    } finally {
      endOptimisticUiMutation();
    }
  }

  function useSkillManualFromBag(skillId, bound = false) {
    const skill = Skills.getSkill(skillId);
    if (!skill) return;
    skillState = Skills.normalizeSkillState(skillState, { classId: playerClassId });
    const count = bound ? skillState.boundManualCounts?.[skill.id] : skillState.manualCounts?.[skill.id];
    if (!(count > 0)) return showToast("物品欄搵唔到呢本技能書。", "danger");
    const learnability = Skills.skillLearnability(skillState, skill.id);
    if (learnability.status === "learned") {
      showToast("已學習", "good");
      return;
    }
    if (learnability.status !== "canLearn") {
      showToast("無法學習", "danger");
      return;
    }
    learnSkillManualImmediately(skill.id, { bound });
  }

  function confirmSkillManualLearning() {
    if (!pendingManualSkillId) return;
    learnSkillManualImmediately(pendingManualSkillId);
  }

  function useBagPotion() {
    return useHealingPotionCommand({ fromBag: true });
  }

  async function changeSkillLoadout(skillId, equip, options = {}) {
    if (!options.force && !(facilityContext === "deck" && currentMapId === "world")) {
      return showToast("而家只可查看；要去舊港城門面板配置先可以換技。", "danger");
    }
    if (!ServerApi?.economy) return showToast("伺服器技能指令尚未就緒。", "danger");

    panelState = Panels.normalizeState(panelState, skillState);
    const panelId = options.force ? panelState.equippedPanelId : selectedLoadoutPanelId;
    const prediction = equip
      ? Panels.configureSkill(panelState, skillState, panelId, skillId)
      : Panels.removeSkill(panelState, skillState, panelId, skillId);
    if (!prediction.ok) {
      const capacity = panelState.panels?.[panelId]?.slotCount || skillState.deckCapacity;
      return showToast(prediction.reason === "full" ? `呢塊面板只有 ${capacity} 格。` : "未能更改技能配置。", "danger");
    }
    if (!beginOptimisticUiMutation()) return;

    const optimisticSnapshot = captureOptimisticUiState();
    panelState = prediction.state;
    skillState = prediction.skills;
    renderOptimisticUiState();

    try {
      await flushForServerCommand();
      const result = options.force
        ? await ServerApi.economy(equip ? "equip-skill" : "unequip-skill", { skillId })
        : await ServerApi.economy(equip ? "equip-panel-skill" : "unequip-panel-skill", { panelId, skillId });
      if (!result?.ok) {
        restoreOptimisticUiState(optimisticSnapshot);
        const capacity = optimisticSnapshot.panelState?.panels?.[panelId]?.slotCount || optimisticSnapshot.skillState.deckCapacity;
        return showToast(result?.reason === "full" ? `呢塊面板只有 ${capacity} 格。` : "未能更改技能配置。", "danger");
      }
      applyAuthoritativeState(result.state);
      showToast(`${equip ? "已配置" : "已移除"}：${Skills.getSkill(skillId)?.name || skillId}`, "good");
      renderFacility();
      saveImportant(false);
    } catch (error) {
      restoreOptimisticUiState(optimisticSnapshot);
      serverCommandError(error, "暫時未能更改技能配置。");
    } finally {
      endOptimisticUiMutation();
    }
  }

  async function configureSkillInDeckSlot(skillId, slotIndex) {
    if (!(facilityContext === "deck" && currentMapId === "world")) return false;
    if (!ServerApi?.economy) return showToast("伺服器技能指令尚未就緒。", "danger"), false;

    panelState = Panels.normalizeState(panelState, skillState);
    const panelId = selectedLoadoutPanelId;
    const prediction = Panels.configureSkill(panelState, skillState, panelId, skillId, slotIndex);
    if (!prediction.ok) {
      const capacity = panelState.panels?.[panelId]?.slotCount || skillState.deckCapacity;
      showToast(prediction.reason === "full" ? `呢塊面板只有 ${capacity} 格。` : "未能更改技能配置。", "danger");
      return false;
    }
    if (!beginOptimisticUiMutation()) return false;

    const optimisticSnapshot = captureOptimisticUiState();
    panelState = prediction.state;
    skillState = prediction.skills;
    renderOptimisticUiState();

    try {
      await flushForServerCommand();
      const result = await ServerApi.economy("equip-panel-skill", { panelId, skillId, slot: slotIndex });
      if (!result?.ok) {
        restoreOptimisticUiState(optimisticSnapshot);
        const capacity = optimisticSnapshot.panelState?.panels?.[panelId]?.slotCount || optimisticSnapshot.skillState.deckCapacity;
        showToast(result?.reason === "full" ? `呢塊面板只有 ${capacity} 格。` : "未能更改技能配置。", "danger");
        return false;
      }
      applyAuthoritativeState(result.state);
      showToast(`已配置：${Skills.getSkill(skillId)?.name || skillId}`, "good");
      renderFacility();
      saveImportant(false);
      return true;
    } catch (error) {
      restoreOptimisticUiState(optimisticSnapshot);
      serverCommandError(error, "暫時未能更改技能配置。");
      return false;
    } finally {
      endOptimisticUiMutation();
    }
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

  function renderCodexFacility() {
    FacilityCatalogViews.renderCodexFacility({
      content: facilityContent,
      setFacilityFooter,
      ids: ExpansionWorld.CANONICAL_MONSTER_IDS,
      monsterKills,
      monsterBlueprint: ExpansionWorld.monsterBlueprint,
    });
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
    const state = FacilityWindowShell.createWindow({
      template: facilityPanelTemplate,
      stage,
      key,
      tab,
      context,
    });
    facilityWindows.set(key, state);
    wireFacilityWindow(state);
    return state;
  }

  function topFacilityWindow() {
    return FacilityWindowShell.topWindow(facilityWindows.values());
  }

  function restoreFacilityTemplateBindings() {
    const bindings = FacilityWindowShell.templateBindings(facilityPanelTemplate);
    facilityPanel = bindings.panel;
    facilityContent = bindings.content;
    facilityTabs = bindings.tabs;
    facilityFooter = bindings.footer;
    facilityHelpButton = bindings.helpButton;
    facilityHelpPopover = bindings.helpPopover;
    facilityHelpText = bindings.helpText;
  }

  function clearAllFacilityWindows() {
    selectedInventoryItemId = null;
    pendingInventoryDestroyItemId = null;
    selectedShopItemId = null;
    for (const state of facilityWindows.values()) state.panel.remove();
    facilityWindows.clear();
    activeFacilityWindow = null;
    restoreFacilityTemplateBindings();
    facilityPanelTemplate.hidden = true;
  }

  function renderFacility() {
    const availableTabs = availableFacilityTabs();
    facilityTab = facilityTab === "missions" && availableTabs.includes("missions")
      ? "missions"
      : Expansion.normalizeFacilityTab(facilityTab, facilityContext, currentMapId);
    FacilityWindowShell.renderWindowChrome({
      stage,
      panel: facilityPanel,
      tabs: facilityTabs,
      helpButton: facilityHelpButton,
      helpText: facilityHelpText,
      tab: facilityTab,
      context: facilityContext,
      availableTabs,
      coins: player.coins,
    });
    setFacilityHelpOpen(false);
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
    refreshOpenDeckWindows();
  }

  function openFacility(tab = "bag", requestedContext) {
    if (!["playing", "facility"].includes(mode)) return false;
    const request = FacilityWindowShell.resolveOpenRequest({
      tab,
      requestedContext,
      currentMapId,
      facilityTabs: FACILITY_TABS,
      facilityTabsForContext,
      normalizeFacilityTab: Expansion.normalizeFacilityTab,
    });
    if (!request.allowed) {
      showToast(request.message, "danger");
      return false;
    }
    const normalizedContext = request.context;
    const normalizedTab = request.tab;
    const key = request.key;
    const existing = facilityWindows.get(key);
    if (existing) {
      activateFacilityWindow(existing);
      syncFacilityMovementMode();
      renderFacility();
      existing.closeButton?.focus({ preventScroll: true });
      return true;
    }

    const state = createFacilityWindow(normalizedTab, normalizedContext);
    if (normalizedTab === "shop") {
      shopTradeMode = "buy";
      selectedShopItemId = null;
    }
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
    if (state.tab === "shop") selectedShopItemId = null;
    if (state.tab === "deck") pendingPanelEquipId = null;
    if (state.context === "guild" || state.tab === "guild") closeGuildCommissionDetail();
    if (state === activeFacilityWindow) {
      cancelDeckDrag();
      setFacilityHelpOpen(false, state);
    }
    const removal = FacilityWindowShell.removeWindow({ windows: facilityWindows, state });
    if (!removal.removed) return;
    if (activeFacilityWindow === state) activeFacilityWindow = null;
    if (removal.next) {
      activateFacilityWindow(removal.next, { bringToFront: false });
      syncFacilityMovementMode();
    } else {
      restoreFacilityTemplateBindings();
      mode = "playing";
      stage.dataset.gameState = mode;
      updateHud(true);
        canvas.focus({ preventScroll: true });
    }
  }

  function closeGuildFacility() {
    const guildWindow = [...facilityWindows.values()].find((state) => state.tab === "guild" || state.context === "guild");
    if (guildWindow) closeFacility(guildWindow);
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

  async function acceptGuildOffer(offerId) {
    if (currentMapId !== "guild") return showToast("要親身返公會先接到委託。", "danger");
    if (!ServerApi?.quest) return showToast("伺服器任務指令尚未就緒。", "danger");
    if (!beginGuildQuestMutation()) return;

    const optimisticSnapshot = captureGuildQuestOptimisticState();
    const predicted = Guild.accept(guildCommissionState, offerId);
    if (!predicted?.ok) {
      endGuildQuestMutation();
      if (predicted?.reason === "already-active") return showToast("同一時間只可以接一份委託。", "danger");
      return showToast("搵唔到呢份委託。", "danger");
    }

    guildCommissionState = predicted.state;
    renderGuildQuestOptimisticState();
    sound.crystal();
    showToast(`已接委託：${predicted.commission.title}`, "good");
    closeGuildCommissionDetail();
    closeGuildFacility();

    try {
      const result = await runGuildQuestServerCommand("accept", { commissionId: offerId });
      if (!result?.ok) {
        restoreGuildQuestOptimisticState(optimisticSnapshot);
        console.warn("Guild accept rejected by server:", result?.reason || "unknown", result);
        return showToast(guildQuestServerRejectMessage(result?.reason, "伺服器未能接取呢份委託，請再試一次。"), "danger");
      }
      applyAuthoritativeState(result.state);
      addSystemMessage("quest", `已接委託：${result.commission.title}`);
    } catch (error) {
      restoreGuildQuestOptimisticState(optimisticSnapshot);
      serverCommandError(error, "伺服器暫時未能接取委託。");
    } finally {
      endGuildQuestMutation();
    }
  }

  async function claimGuildContract(contractId) {
    if (currentMapId !== "guild") return showToast("要返公會先可以回報。", "danger");
    const active = activeGuildCommission();
    const expectedId = active ? `${guildCommissionState.cycle}:${active.id}` : null;
    if (contractId && expectedId && contractId !== expectedId) return showToast("委託資料已更新，請重新查看公會委託。", "danger");
    if (!ServerApi?.quest) return showToast("伺服器任務指令尚未就緒。", "danger");
    if (!beginGuildQuestMutation()) return;

    const predicted = Guild.report(guildCommissionState);
    if (!predicted?.ok) {
      endGuildQuestMutation();
      if (predicted?.reason === "not-ready") return showToast("委託仲未完成。", "danger");
      if (predicted?.reason === "already-claimed") return showToast("呢份委託已經回報過喇。", "danger");
      if (predicted?.reason === "not-active") return showToast("目前冇可回報嘅委託。", "danger");
      return showToast("委託狀態已更新，請重新查看。", "danger");
    }

    const optimisticSnapshot = captureGuildQuestOptimisticState();
    const previewCoins = Math.max(0, Math.floor(Number(predicted.reward?.coins) || 0));
    const previewText = `委託回報完成 · ${Skills.formatSkillBookRank(predicted.reward.skill_envelope_star)} 技能書信封 × 1 + ${previewCoins.toLocaleString("zh-HK")} 金幣`;
    guildCommissionState = predicted.state;
    player.coins = Core.clamp(player.coins + previewCoins, 0, 99999);
    renderGuildQuestOptimisticState();
    sound.level();
    showToast(previewText, "good");
    closeGuildCommissionDetail();
    renderFacility();

    try {
      const result = await runGuildQuestServerCommand("report", {});
      if (!result?.ok) {
        restoreGuildQuestOptimisticState(optimisticSnapshot);
        console.warn("Guild report rejected by server:", result?.reason || "unknown", result);
        return showToast(guildQuestServerRejectMessage(result?.reason, "伺服器未能回報呢份委託，請再試一次。"), "danger");
      }
      applyAuthoritativeState(result.state);
      const rewardCoins = Math.max(0, Math.floor(Number(result.reward?.coins) || 0));
      const rewardText = `委託回報完成 · ${Skills.formatSkillBookRank(result.reward.skill_envelope_star)} 技能書信封 × 1 + ${rewardCoins.toLocaleString("zh-HK")} 金幣`;
      addSystemMessage("reward", rewardText);
      renderFacility();
    } catch (error) {
      restoreGuildQuestOptimisticState(optimisticSnapshot);
      serverCommandError(error, "伺服器暫時未能回報委託。");
    } finally {
      endGuildQuestMutation();
    }
  }

  function openAbandonCommission(contractId) {
    if (guildQuestMutationPending) return;
    const active = activeGuildCommission();
    const expectedId = active ? `${guildCommissionState.cycle}:${active.id}` : null;
    if (!active || !expectedId || contractId !== expectedId) return showToast("委託資料已更新，請重新查看公會委託。", "danger");
    pendingAbandonContractId = expectedId;
    document.getElementById("abandonCommissionTitle").textContent = `放棄「${active.title}」`;
    abandonCommissionPanel.hidden = false;
    resetDraggableWindowPosition(abandonCommissionPanel.querySelector(".ui-modal-window"));
    document.getElementById("abandonCommissionConfirmButton").focus({ preventScroll: true });
  }

  function closeAbandonCommission(restoreFocus = true) {
    pendingAbandonContractId = null;
    abandonCommissionPanel.hidden = true;
    if (restoreFocus && facilityWindows.size) facilityContent.focus({ preventScroll: true });
  }

  async function confirmAbandonCommission() {
    const active = activeGuildCommission();
    const expectedId = active ? `${guildCommissionState.cycle}:${active.id}` : null;
    if (!pendingAbandonContractId || pendingAbandonContractId !== expectedId) {
      closeAbandonCommission(false);
      return showToast("委託資料已更新，請重新查看公會委託。", "danger");
    }
    if (!ServerApi?.quest) return showToast("伺服器任務指令尚未就緒。", "danger");
    if (!beginGuildQuestMutation()) return;

    const predicted = Guild.abandon(guildCommissionState);
    if (!predicted?.ok) {
      endGuildQuestMutation();
      closeAbandonCommission(false);
      return showToast("呢份委託而家冇可放棄嘅進度。", "danger");
    }

    const optimisticSnapshot = captureGuildQuestOptimisticState();
    guildCommissionState = predicted.state;
    closeAbandonCommission(false);
    renderGuildQuestOptimisticState();
    showToast(`已放棄委託：${predicted.commission.title} · 進度已清除`, "good");
    closeGuildCommissionDetail();
    renderFacility();

    try {
      const result = await runGuildQuestServerCommand("abandon", {});
      if (!result?.ok) {
        restoreGuildQuestOptimisticState(optimisticSnapshot);
        console.warn("Guild abandon rejected by server:", result?.reason || "unknown", result);
        return showToast(guildQuestServerRejectMessage(result?.reason, "伺服器未能放棄呢份委託，請再試一次。"), "danger");
      }
      applyAuthoritativeState(result.state);
      addSystemMessage("quest", `已放棄委託：${result.commission.title}`);
      renderFacility();
    } catch (error) {
      restoreGuildQuestOptimisticState(optimisticSnapshot);
      serverCommandError(error, "伺服器暫時未能放棄委託。");
    } finally {
      endGuildQuestMutation();
    }
  }

  async function openGuildEnvelope(star) {
    const safeStar = Number(star);
    if (!ServerApi?.economy) return showToast("伺服器獎勵指令尚未就緒。", "danger");
    if (guildEnvelopeOpenPending) return;
    guildEnvelopeOpenPending = true;
    const overlayStartedAt = showMapTransitionOverlay("開封中");
    try {
      const result = await ServerApi.economy("open-envelope", { star: safeStar });
      await waitForMapTransitionCover(overlayStartedAt, reducedMotion ? 0 : 650);
      await hideMapTransitionOverlay();
      if (!result?.ok && result?.reason === "no-envelope") return showToast("你冇呢一星級嘅技能書信封。", "danger");
      if (!result?.ok) return showToast("呢個星級暫時冇可抽取嘅技能。", "danger");
      applyAuthoritativeState(result.state);
      sound.crystal();
      const skillName = result.skill?.name || result.skill?.id || "技能書";
      const envelopeMessage = `獲得格鬥士技能書：${Skills.formatSkillBookRank(safeStar)}「${skillName}」`;
      showToast(`開封抽到「${skillName}」技能書；仍須符合前置先可以學習。`, "good");
      addSystemMessage("reward", envelopeMessage);
      announce(envelopeMessage);
      if (facilityWindows.size) renderFacility();
    } catch (error) {
      await hideMapTransitionOverlay();
      serverCommandError(error, "伺服器暫時未能開啟技能書信封。");
    } finally {
      guildEnvelopeOpenPending = false;
    }
  }

  async function changeEquipment(itemId, buyFirst = false) {
    const requestedItem = equipmentItem(itemId);
    if (!requestedItem) return showToast("搵唔到呢件裝備。", "danger");
    if (!equipmentMatchesClass(requestedItem)) return showToast("呢件裝備唔適合目前職業。", "danger");
    if (!ServerApi?.economy) return showToast("伺服器裝備指令尚未就緒。", "danger");
    if (buyFirst && currentMapId !== "shop") return showToast("購買裝備要親身去帝都裝備坊。", "danger");

    let predictedPrice = 0;
    let equipmentPrediction = null;
    if (buyFirst) {
      if (requestedItem.purchasable === false) return showToast("呢件裝備而家買唔到。", "danger");
      predictedPrice = Math.max(0, Math.floor((Number(requestedItem.cost) || 0) * (1 - guildDiscountRate())));
      if (player.coins < predictedPrice) return showToast("金幣唔夠。", "danger");
    } else {
      equipmentPrediction = Expansion.equipItem({
        coins: player.coins,
        level: player.level,
        classId: playerClassId,
        ownedEquipment,
        equipped,
      }, itemId);
      if (!equipmentPrediction.ok) {
        if (equipmentPrediction.reason === "level") return showToast("等級未足夠裝備呢件物品。", "danger");
        if (equipmentPrediction.reason === "class") return showToast("呢件裝備唔適合目前職業。", "danger");
        return showToast("未可以裝備呢件物品。", "danger");
      }
    }
    if (!beginOptimisticUiMutation()) return;

    const optimisticSnapshot = captureOptimisticUiState();
    if (buyFirst) {
      player.coins = Core.clamp(player.coins - predictedPrice, 0, 99999);
      ownedEquipment = [...ownedEquipment, requestedItem.id];
    } else {
      equipped = { ...equipmentPrediction.state.equipped };
      player.hp = Core.clamp(player.hp, 0, playerStats().maxHp);
    }
    renderOptimisticUiState();
    sound.coin();

    try {
      await flushForServerCommand();
      const result = await ServerApi.economy(buyFirst ? "buy-equipment" : "equip", { itemId });
      if (!result?.ok) {
        restoreOptimisticUiState(optimisticSnapshot);
        if (result?.reason === "coins") return showToast("金幣唔夠。", "danger");
        if (result?.reason === "level") return showToast("等級未足夠裝備呢件物品。", "danger");
        if (result?.reason === "class") return showToast("呢件裝備唔適合目前職業。", "danger");
        return showToast(buyFirst ? "呢件裝備而家買唔到。" : "未可以裝備呢件物品。", "danger");
      }
      applyAuthoritativeState(result.state);
      showToast(`${buyFirst ? "已購買" : "已裝備"}：${requestedItem.name || itemId}`, "good");
      renderFacility();
    } catch (error) {
      restoreOptimisticUiState(optimisticSnapshot);
      serverCommandError(error, "伺服器暫時未能處理裝備操作。");
    } finally {
      endOptimisticUiMutation();
    }
  }

  async function unequipEquipment(itemId) {
    const item = equipmentItem(itemId);
    if (!item) return showToast("呢件裝備目前冇裝備緊。", "danger");
    if (!ServerApi?.economy) return showToast("伺服器裝備指令尚未就緒。", "danger");
    const slot = item.occupiesSlots?.find((candidate) => equipped[candidate] === item.id);
    const prediction = slot ? Expansion.unequipItem({
      coins: player.coins,
      level: player.level,
      classId: playerClassId,
      ownedEquipment,
      equipped,
    }, slot) : { ok: false, reason: "not-equipped" };
    if (!prediction.ok) return showToast("未能卸下呢件裝備。", "danger");
    if (!beginOptimisticUiMutation()) return;

    const optimisticSnapshot = captureOptimisticUiState();
    equipped = { ...prediction.state.equipped };
    player.hp = Core.clamp(player.hp, 0, playerStats().maxHp);
    renderOptimisticUiState();
    sound.coin();

    try {
      await flushForServerCommand();
      const result = await ServerApi.economy("unequip", { itemId });
      if (!result?.ok) {
        restoreOptimisticUiState(optimisticSnapshot);
        return showToast("未能卸下呢件裝備。", "danger");
      }
      applyAuthoritativeState(result.state);
      selectedInventoryItemId = null;
      pendingInventoryDestroyItemId = null;
      showToast(`已卸下：${item.name}`, "good");
      if (facilityWindows.size) renderFacility();
    } catch (error) {
      restoreOptimisticUiState(optimisticSnapshot);
      serverCommandError(error, "伺服器暫時未能處理卸裝。");
    } finally {
      endOptimisticUiMutation();
    }
  }

  function predictDestroyInventoryItem(itemId) {
    const id = String(itemId || "").trim();
    if (!id) return { ok: false, reason: "invalid-item" };
    const equipment = equipmentItem(id);
    if (equipment && ownedEquipment.includes(equipment.id)) {
      if (Expansion.isEquipmentEquipped({ equipped }, equipment.id)) return { ok: false, reason: "equipped" };
      ownedEquipment.splice(ownedEquipment.indexOf(equipment.id), 1);
      return { ok: true, itemName: equipment.name };
    }
    if (id === "healing_potion") {
      if (player.potions <= 0) return { ok: false, reason: "missing" };
      player.potions = Math.max(0, player.potions - 1);
      return { ok: true, itemName: "小型回復藥" };
    }
    if (id === "weak_potion") {
      const count = Math.max(0, Math.floor(Number(inventory.weak_potion) || 0));
      if (count <= 0) return { ok: false, reason: "missing" };
      if (count > 1) inventory.weak_potion = count - 1;
      else delete inventory.weak_potion;
      return { ok: true, itemName: inventoryItemName(id) };
    }
    const envelope = /^skill_envelope_(\d+)$/.exec(id);
    if (envelope) {
      const star = Number(envelope[1]);
      const count = Math.max(0, Math.floor(Number(guildCommissionState.envelopes?.[star]) || 0));
      if (count <= 0) return { ok: false, reason: "missing" };
      guildCommissionState = Guild.normalizeState({
        ...guildCommissionState,
        envelopes: { ...guildCommissionState.envelopes, [star]: count - 1 },
      });
      return { ok: true, itemName: `${Skills.formatSkillBookRank(star)} 技能書信封` };
    }
    const book = /^skill_book_(\d+)$/.exec(id);
    if (book) {
      const star = Number(book[1]);
      const count = Math.max(0, Math.floor(Number(skillState.books?.[star]) || 0));
      if (count <= 0) return { ok: false, reason: "missing" };
      skillState = Skills.normalizeSkillState({
        ...skillState,
        books: { ...skillState.books, [star]: count - 1 },
      }, { classId: playerClassId });
      return { ok: true, itemName: `${Skills.formatSkillBookRank(star)} 技能書` };
    }
    const manual = /^manual_(.+)$/.exec(id);
    if (manual) {
      const skillId = manual[1];
      const count = Math.max(0, Math.floor(Number(skillState.manualCounts?.[skillId]) || 0));
      if (count <= 0) return { ok: false, reason: "missing" };
      const manualCounts = { ...skillState.manualCounts, [skillId]: count - 1 };
      if (manualCounts[skillId] <= 0) delete manualCounts[skillId];
      skillState = Skills.normalizeSkillState({ ...skillState, manualCounts }, { classId: playerClassId });
      return { ok: true, itemName: `技能書：${Skills.getSkill(skillId)?.name || skillId}` };
    }
    const data = ItemData?.getItem?.(id);
    const count = Math.max(0, Math.floor(Number(inventory[id]) || 0));
    if (!data || ["ui", "currency", "quest"].includes(data.kind) || data.destroyable === false || count <= 0) return { ok: false, reason: "protected" };
    if (count > 1) inventory[id] = count - 1;
    else delete inventory[id];
    return { ok: true, itemName: data.name || id };
  }

  async function destroyInventoryItem(itemId) {
    const id = String(itemId || "").trim();
    if (!id) return showToast("呢件物品唔可以銷毀。", "danger");
    if (!ServerApi?.economy) return showToast("伺服器物品指令尚未就緒。", "danger");
    if (!beginOptimisticUiMutation()) return;

    const optimisticSnapshot = captureOptimisticUiState();
    const previousSelectedItemId = selectedInventoryItemId;
    const previousPendingDestroyItemId = pendingInventoryDestroyItemId;
    const predicted = predictDestroyInventoryItem(id);
    if (!predicted.ok) {
      endOptimisticUiMutation();
      if (predicted.reason === "equipped") return showToast("請先卸下裝備。", "danger");
      return showToast("呢件物品唔可以銷毀。", "danger");
    }

    pendingInventoryDestroyItemId = null;
    selectedInventoryItemId = null;
    renderOptimisticUiState();
    if (facilityTab === "bag") renderBagFacility();

    try {
      const result = await ServerApi.economy("destroy-item", { itemId: id });
      if (!result?.ok) {
        restoreOptimisticUiState(optimisticSnapshot);
        selectedInventoryItemId = previousSelectedItemId;
        pendingInventoryDestroyItemId = previousPendingDestroyItemId;
        if (facilityTab === "bag") renderBagFacility();
        if (result?.reason === "equipped") return showToast("請先卸下裝備。", "danger");
        return showToast("伺服器未能確認銷毀，物品已復原。", "danger");
      }
      applyAuthoritativeState(result.state);
      const itemName = result.itemName || predicted.itemName || inventoryItemName(id);
      showToast(`已銷毀：${itemName}`, "good");
      addSystemMessage("item", `銷毀 ${itemName}`);
      if (facilityTab === "bag") renderBagFacility();
    } catch (error) {
      restoreOptimisticUiState(optimisticSnapshot);
      selectedInventoryItemId = previousSelectedItemId;
      pendingInventoryDestroyItemId = previousPendingDestroyItemId;
      if (facilityTab === "bag") renderBagFacility();
      serverCommandError(error, "伺服器暫時未能銷毀物品；物品已復原。");
    } finally {
      endOptimisticUiMutation();
    }
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
  const BATTLE_ACTION_STRIKE_INTERVAL_SECONDS = reducedMotion ? .18 : .5;
  const BATTLE_SIDE_DAMAGE_BONUS = .15;
  const BATTLE_REAR_DAMAGE_BONUS = .35;
  const BATTLE_UNTARGETABLE_ALPHA = .5;
  const BATTLE_MISS_COLOR = "#ffc857";

  function battleMoveCapacityForPlayer(stats) {
    const baseMoveRange = Math.max(0, Number(stats?.moveRange) || 0);
    return baseMoveRange + (playerClassId === "fighter" ? BATTLE_FINAL_FACING_RESERVE : 0);
  }

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
      frog: [[3, 3], [5, 1], [5, 5]],
      coyote: [[3, 2], [3, 4], [5, 1], [5, 5]],
      turtle: [[3, 2], [3, 4], [5, 1], [5, 5]],
      snake: [[3, 1], [3, 5], [5, 3]],
      bear: [[3, 1], [3, 5], [5, 1], [5, 5]],
    };
    return (layouts[source.type] || layouts.raccoon || [[4, 1], [4, 5], [5, 3]]).map(([x, y]) => ({ x, y }));
  }

  function battleFieldContextFor(mapId) {
    const map = maps[mapId];
    if (map?.biome !== "mountain") return null;
    const authored = mapId === "mountain-southeast"
      ? (maps.field?.battlefield || map?.battlefield || {})
      : (map?.battlefield || {});
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

  const BATTLE_ENTRY_TRANSITION_MIN_MS = 1800;

  function showBattleEntryTransition(source) {
    if (!battleEntryTransition) return;
    battleEntryTransition.hidden = false;
    battleEntryTransition.setAttribute("aria-hidden", "false");
    battleEntryTransition.dataset.encounterToken = String(battleToken + 1);
    if (battleEntryName) battleEntryName.textContent = source?.name || "遭遇戰";
    playEncounterTransitionSfx();
  }

  function hideBattleEntryTransition() {
    if (!battleEntryTransition) return;
    battleEntryTransition.hidden = true;
    battleEntryTransition.setAttribute("aria-hidden", "true");
    delete battleEntryTransition.dataset.encounterToken;
  }

  async function holdBattleEntryTransition(startedAt) {
    const elapsed = performance.now() - Number(startedAt || 0);
    const remaining = Math.max(0, BATTLE_ENTRY_TRANSITION_MIN_MS - elapsed);
    if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
  }

  function startBattle(source, instant = false, options = {}) {
    const resumeSnapshot = options?.serverSnapshot && typeof options.serverSnapshot === "object"
      ? options.serverSnapshot
      : null;
    const localResumeSnapshot = options?.localResumeSnapshot && typeof options.localResumeSnapshot === "object"
      ? options.localResumeSnapshot
      : null;
    const localVisualOnly = options?.localVisualOnly === true;
    const resumingServerBattle = Boolean(resumeSnapshot?.id && resumeSnapshot?.status === "active");
    if (!source?.alive || mode !== "playing" || battle || source.encounterCooldown > 0) return false;
    // HP=0 is a real persisted death state, not a missing value. A normal new
    // encounter must never hydrate it back to max HP. The only exception is a
    // persisted active server battle being reconstructed after reload; that
    // session may itself contain the final 0-HP round and must be settled.
    if (Number(player.hp) <= 0 && !resumingServerBattle && !localVisualOnly) {
      showToast("角色已倒下，請先復活。", "danger");
      playerDeath();
      return false;
    }
    hideAllOverlays();
    activeBattleTouches.clear();
    battlePinchGesture = null;
    suppressBattleTouchTap = false;
    battleView = { zoom: 1, offsetX: 0, offsetY: 0 };
    const stats = playerStats();
    const battleMoveCapacity = battleMoveCapacityForPlayer(stats);
    const battlefield = battleFieldContextFor(currentMapId);
    const dimensions = battleDimensionsFor(battlefield);
    const heroSpawn = battleDeploymentCell(battlefield, "ally", 0);
    if (!resumingServerBattle && !localResumeSnapshot) showBattleEntryTransition(source);
    else hideBattleEntryTransition();
    const entryTransitionStartedAt = performance.now();
    battleToken += 1;
    const hero = {
      id: "battle-player",
      side: "ally",
      type: "player",
      name: playerDisplayName(),
      level: player.level,
      cell: { ...heroSpawn },
      hp: Math.max(0, Math.ceil(player.hp)),
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
      alive: Number(player.hp) > 0,
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
      selectedEnemyId: null,
      autoTimer: .35,
      serverBattleId: null,
      serverReady: false,
      serverSyncPending: false,
      predictedRoundPending: false,
      entryTransitionStartedAt,
    };
    mode = "battle";
    stage.dataset.gameState = mode;
    syncRealtimeState("battle");
    keys.clear();
    interactionPrompt.hidden = true;
    battleHud.hidden = true;
    window.EverrealmFootstepsRuntime?.suspend();
    bgm.setEnabled(false);
    announce(resumingServerBattle ? `重新連接${source.name}戰鬥。` : `遇上${source.name}。進入格仔回合戰。`);
    maintainGodModeState();
    if (resumingServerBattle) restorePersistedBattleSession(battle, resumeSnapshot, { localSnapshot: localResumeSnapshot });
    else if (localResumeSnapshot) {
      applyLocalBattleSnapshot(battle, localResumeSnapshot, { visualOnly: localVisualOnly });
      battle.serverReady = !localVisualOnly && Boolean(localResumeSnapshot.battleId);
      battle.serverBattleId = localResumeSnapshot.battleId || null;
      if (localVisualOnly) {
        battleHud.hidden = true;
      } else {
        battleHud.hidden = false;
        startBattleBgm();
        addSystemMessage("system", `已重新連接上一場戰鬥 · 第 ${battle.round} 輪`, "info");
        announce(`已重新連接第 ${battle.round} 輪戰鬥。`);
      }
      schedulePersistBattleResumeState({ delayMs: 0 });
    } else {
      authorizeBattleSession(battle, source);
    }
    return true;
  }

  function syncServerBattleSnapshot(targetBattle, snapshot, options = {}) {
    if (!targetBattle || !snapshot || typeof snapshot !== "object") return false;
    if (snapshot.id) targetBattle.serverBattleId = String(snapshot.id);
    if (Number.isFinite(Number(snapshot.round))) targetBattle.round = Math.max(1, Math.floor(Number(snapshot.round)));
    if (Number.isFinite(Number(snapshot.heroHp))) {
      targetBattle.hero.hp = Core.clamp(Number(snapshot.heroHp), 0, targetBattle.hero.maxHp);
      targetBattle.hero.alive = targetBattle.hero.hp > 0;
      player.hp = targetBattle.hero.hp;
    }
    if (snapshot.heroCell && Tactics.isInside(targetBattle.grid, snapshot.heroCell)) {
      targetBattle.hero.cell = copyBattleCell(snapshot.heroCell);
    }
    if (["up", "right", "down", "left"].includes(String(snapshot.heroFacing || ""))) {
      targetBattle.hero.facing = String(snapshot.heroFacing);
    }
    if (snapshot.heroStatusEffects && typeof snapshot.heroStatusEffects === "object") {
      targetBattle.hero.statusEffects = Object.fromEntries(Object.entries(snapshot.heroStatusEffects).map(([key, value]) => [key, { ...(value || {}) }]));
    }
    if (Number.isFinite(Number(snapshot.ap))) targetBattle.ap = Core.clamp(Math.floor(Number(snapshot.ap)), 0, BATTLE_AP_MAX);
    if (Array.isArray(snapshot.enemies)) {
      for (let index = 0; index < targetBattle.enemies.length; index += 1) {
        const canonical = snapshot.enemies[index];
        const local = targetBattle.enemies[index];
        if (!canonical || !local) continue;
        if (Number.isFinite(Number(canonical.maxHp))) local.maxHp = Math.max(1, Number(canonical.maxHp));
        if (Number.isFinite(Number(canonical.hp))) local.hp = Core.clamp(Number(canonical.hp), 0, local.maxHp);
        local.alive = canonical.alive !== false && local.hp > 0;
        if (canonical.cell && Tactics.isInside(targetBattle.grid, canonical.cell)) local.cell = copyBattleCell(canonical.cell);
        if (["up", "right", "down", "left"].includes(String(canonical.facing || ""))) local.facing = String(canonical.facing);
        if (Number.isFinite(Number(canonical.ap))) local.ap = Core.clamp(Math.floor(Number(canonical.ap)), 0, BATTLE_AP_MAX);
        if (canonical.statusEffects && typeof canonical.statusEffects === "object") {
          local.statusEffects = Object.fromEntries(Object.entries(canonical.statusEffects).map(([key, value]) => [key, { ...(value || {}) }]));
        }
        local.defenceDown = Math.max(0, Number(canonical.defenceDown) || 0);
        local.defenceDownUntilRound = Math.max(0, Math.floor(Number(canonical.defenceDownUntilRound) || 0));
        local.moveDown = Math.max(0, Number(canonical.moveDown) || 0);
        local.moveDownUntilRound = Math.max(0, Math.floor(Number(canonical.moveDownUntilRound) || 0));
      }
    }
    if (options.render !== false) {
      updateHud(true);
      updateBattleUi();
      schedulePersistBattleResumeState();
    }
    return true;
  }

  function battleSourceFromServerSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null;
    const type = ExpansionWorld.normalizeMonsterId(snapshot.monsterType) || String(snapshot.monsterType || "").trim();
    const blueprint = type ? ExpansionWorld.monsterBlueprint(type) : null;
    const base = type ? enemyTypes[type] : null;
    if (!type || (!blueprint && !base)) return null;
    const level = Core.clamp(Math.floor(Number(snapshot.level) || blueprint?.baseLevel || 1), 1, 45);
    const stats = blueprint ? ExpansionWorld.monsterStatsAtLevel(type, level) : null;
    const encounterId = String(snapshot.encounterId || snapshot.id || `resume-${type}`);
    return {
      id: encounterId,
      instanceId: encounterId,
      alive: true,
      encounterCooldown: 0,
      type,
      name: blueprint?.name_zh || base?.name || type,
      level,
      damage: stats?.attack || base?.damage || 1,
      defence: stats?.defense ?? base?.defence ?? 0,
      xp: blueprint?.rewards?.baseXp ?? base?.xp ?? 0,
      coins: blueprint?.rewards?.coins ?? base?.coins ?? 0,
      moveRange: blueprint?.moveRange ?? stats?.moveRange ?? base?.moveRange ?? 4,
      // The original exploration encounter entity no longer exists after a
      // page reload. Keep a harmless local stand-in at the player's saved
      // position so victory/flee presentation helpers still have valid coords.
      x: Number(player.x) || 0,
      y: Number(player.y) || 0,
      color: base?.color || "#ffc857",
    };
  }

  function restorePersistedBattleSession(targetBattle, snapshot, options = {}) {
    if (!targetBattle || !snapshot || typeof snapshot !== "object") return false;
    targetBattle.serverBattleId = String(snapshot.id || "");
    targetBattle.serverReady = Boolean(targetBattle.serverBattleId);
    syncServerBattleSnapshot(targetBattle, snapshot, { render: false });
    hideBattleEntryTransition();
    stopEncounterTransitionSfx();
    battleHud.hidden = false;
    startBattleBgm();

    // The server snapshot is captured after the previous resolved action and
    // before the next-round AP grant. Rebuild the same planning state that a
    // continuously connected client would already have predicted locally.
    targetBattle.ap = godModeActive
      ? BATTLE_AP_MAX
      : Math.min(BATTLE_AP_MAX, Math.max(0, Number(snapshot.ap) || 0) + BATTLE_AP_GAIN);
    for (const enemy of targetBattle.enemies) {
      enemy.ap = enemy.alive ? Math.min(BATTLE_AP_MAX, Math.max(0, Number(enemy.ap) || 0) + BATTLE_AP_GAIN) : 0;
    }

    if (!targetBattle.hero.alive || targetBattle.hero.hp <= 0) {
      targetBattle.phase = "resolving_action";
      finishBattleDefeat();
      return true;
    }
    if (livingBattleEnemies().length === 0) {
      targetBattle.phase = "resolving_action";
      finishBattleVictory();
      return true;
    }

    targetBattle.phase = "planning_move";
    targetBattle.hero.moveRange = FighterEffects?.isDisabled(targetBattle.hero, targetBattle.round, "move") ? 0
      : Math.max(0, targetBattle.hero.baseMoveRange - (FighterEffects?.movementPenalty(targetBattle.hero, targetBattle.round) || 0));
    targetBattle.moveBonusNext = 0;
    targetBattle.evasion = 0;
    targetBattle.moved = false;
    targetBattle.guard = false;
    targetBattle.guardReduction = 0;
    targetBattle.selectedAction = "move";
    targetBattle.cursor = { ...targetBattle.hero.cell };
    targetBattle.enemyPlans = planEnemyRound();
    targetBattle.heroMoveDraft = [{ ...targetBattle.hero.cell }];
    targetBattle.heroMoveCommands = [];
    targetBattle.heroMovePlan = null;
    targetBattle.awaitingFacing = true;
    targetBattle.movementResolution = null;
    targetBattle.actionResolution = null;
    targetBattle.message = "已重新連接上一場戰鬥。";
    targetBattle.messageDanger = false;
    targetBattle.actingUnitId = null;
    targetBattle.actingUnitIds = [];
    targetBattle.predictedRoundPending = false;
    targetBattle.serverSyncPending = false;
    // Server tactical v1 owns cells/facing. LocalStorage is only a migration
    // fallback for battles created by an older server schema.
    if (options.localSnapshot && Number(snapshot.tacticalVersion || 0) < 1) {
      applyLocalBattleSnapshot(targetBattle, options.localSnapshot, { authorityLocked: true });
    }
    updateHud(true);
    updateBattleUi();
    schedulePersistBattleResumeState({ delayMs: 0 });
    addSystemMessage("system", `已重新連接上一場戰鬥 · 第 ${targetBattle.round} 輪`, "info");
    announce(`已重新連接第 ${targetBattle.round} 輪戰鬥。`);
    canvas.focus({ preventScroll: true });
    return true;
  }

  function resumeBattleFromServerSnapshot(snapshot) {
    if (!snapshot || snapshot.status !== "active" || !snapshot.id) return false;
    const source = battleSourceFromServerSnapshot(snapshot);
    if (!source) return false;
    const localSnapshot = Number(snapshot.tacticalVersion || 0) < 1
      ? readPersistedBattleResumeSnapshot(snapshot.id)
      : null;
    return startBattle(source, true, { serverSnapshot: snapshot, localResumeSnapshot: localSnapshot });
  }

  async function authorizeBattleSession(targetBattle, source) {
    if (!targetBattle || !source || !ServerApi?.battle) {
      showToast("伺服器戰鬥指令尚未就緒。", "danger");
      if (battle === targetBattle) {
        closeBattleHud();
        restoreExplorationUiAfterBattle();
      }
      return false;
    }
    const token = targetBattle.token;
    targetBattle.message = "正在向伺服器確認戰鬥…";
    updateBattleUi();
    try {
      const startPayload = {
        monsterType: source.type,
        level: source.level,
        encounterId: source.instanceId || source.id || "",
      };
      let result = await ServerApi.battle("start", startPayload);
      if (!battle || battle.token !== token || battle !== targetBattle) return false;

      if (!result?.ok && result?.reason === "battle-active" && result?.battle?.id) {
        console.warn("Recovering orphaned server battle before starting a new encounter.", result.battle);
        addSystemMessage("system", "偵測到上一場未清除嘅戰鬥狀態，正在自動修復。", "warning");
        try {
          await ServerApi.battle("cancel", { battleId: result.battle.id });
          if (!battle || battle.token !== token || battle !== targetBattle) return false;
          result = await ServerApi.battle("start", startPayload);
        } catch (recoveryError) {
          console.warn("Orphaned battle recovery failed.", recoveryError);
        }
      }

      if (!battle || battle.token !== token || battle !== targetBattle) return false;
      if (!result?.ok || !result.battle?.id) {
        const reason = String(result?.reason || "unknown");
        console.warn("Battle start rejected by server.", { reason, result, source: startPayload });
        const reasonText = ({
          "battle-active": "上一場戰鬥狀態尚未清除",
          "player-dead": "角色仍然處於倒下狀態",
          "wrong-map": "伺服器判定目前地圖不符合呢場戰鬥",
          "invalid-encounter-zone": "目前位置唔屬於隨機遇怪區域",
          "monster-not-in-encounter-zone": "呢種怪物唔屬於目前遇怪區域",
          "encounter-level-mismatch": "怪物等級同目前遇怪區域唔一致",
          "invalid-monster-level": "怪物等級資料無效",
          "unknown-monster": "伺服器搵唔到呢種怪物",
        })[reason] || "伺服器未能建立戰鬥";
        showToast(`伺服器未能建立戰鬥：${reasonText}。`, "danger");
        source.encounterCooldown = Math.max(source.encounterCooldown || 0, 1.5);
        hideBattleEntryTransition();
        stopEncounterTransitionSfx();
        closeBattleHud();
        if (reason === "player-dead") {
          player.hp = 0;
          playerDeath();
        } else {
          restoreExplorationUiAfterBattle();
        }
        return false;
      }
      targetBattle.serverBattleId = result.battle.id;
      targetBattle.serverReady = true;
      syncServerBattleSnapshot(targetBattle, result.battle, { render: false });
      await holdBattleEntryTransition(targetBattle.entryTransitionStartedAt);
      if (!battle || battle.token !== token || battle !== targetBattle) return false;
      hideBattleEntryTransition();
      battleHud.hidden = false;
      startBattleBgm();
      beginPlayerRound();
      schedulePersistBattleResumeState({ delayMs: 0 });
      return true;
    } catch (error) {
      if (!battle || battle.token !== token || battle !== targetBattle) return false;
      serverCommandError(error, "暫時未能建立戰鬥。");
      source.encounterCooldown = Math.max(source.encounterCooldown || 0, 1.5);
      hideBattleEntryTransition();
      stopEncounterTransitionSfx();
      closeBattleHud();
      restoreExplorationUiAfterBattle();
      return false;
    }
  }

  function beginPlayerRound() {
    if (!battle || mode !== "battle" || !["intro", "resolving_action"].includes(battle.phase)) return;
    if (battle.phase === "intro" && !battle.serverReady) return;
    for (const unit of battleUnits()) {
      if (unit.alive) showFighterEffectEvents(FighterEffects?.tickStatuses(unit, battle.round, unit === battle.hero ? learnedFighterPassives() : {}));
    }
    maintainGodModeState();
    if (!battle.hero.alive || battle.hero.hp <= 0) return finishBattleDefeat();
    if (livingBattleEnemies().length === 0) return finishBattleVictory();
    battle.phase = "planning_move";
    battle.ap = godModeActive ? BATTLE_AP_MAX : Math.min(BATTLE_AP_MAX, battle.ap + BATTLE_AP_GAIN);
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
      if (FighterEffects?.isDisabled(actual, battle.round, "move")) {
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
        canDirectTarget: battleCanDirectTarget,
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
    // status system only for temporary evasion stances, then add
    // the one-resolution battle stance (e.g. 舞葉) on top.
    const base = Math.max(0, Number(unit.evasion) || 0);
    const status = (FighterEffects?.statusEvasion(unit, battle?.round || 0, {}) || 0) * 100;
    const battleStance = unit === battle?.hero ? Math.max(0, Number(battle.evasion) || 0) * 100 : 0;
    return Math.max(0, base + status + battleStance);
  }

  function battleCanDirectTarget(unit) {
    if (!unit || typeof FighterEffects?.isDirectTargetable !== "function") return true;
    return FighterEffects.isDirectTargetable(unit, battle?.round || 0);
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
      isFriendlyUnit: (actor, other) => Boolean(actor && other
        && (actor.side || actor.team)
        && (other.side || other.team)
        && (actor.side || actor.team) === (other.side || other.team)),
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
            canDirectTarget: battleCanDirectTarget,
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

  function selectedBattleEnemy() {
    if (!battle || battle.selectedEnemyId == null) return null;
    return battle.enemies.find((unit) => String(unit.id) === String(battle.selectedEnemyId)) || null;
  }

  function syncBattleEnemyRowSelection() {
    if (!battleUi.enemyRows || !battle) return;
    for (const row of battleUi.enemyRows.querySelectorAll("[data-battle-enemy-id]")) {
      const selected = String(row.dataset.battleEnemyId) === String(battle.selectedEnemyId);
      row.classList.toggle("is-selected", selected);
      row.setAttribute("aria-pressed", selected ? "true" : "false");
    }
  }

  function renderBattleEnemyRows() {
    if (!battleUi.enemyRows || !battle) return;
    const rows = battle.enemies.map((enemy) => {
      const defeated = !enemy.alive || enemy.hp <= 0;
      const maxHp = Math.max(1, Number(enemy.maxHp) || 1);
      const hpRatio = Core.clamp((Number(enemy.hp) || 0) / maxHp, 0, 1);
      const level = Math.max(1, Math.floor(Number(enemy.level) || 1));
      const row = document.createElement("button");
      row.type = "button";
      row.className = `battle-enemy-row${defeated ? " is-defeated" : ""}`;
      row.dataset.battleEnemyId = enemy.id;
      row.setAttribute("aria-pressed", "false");
      row.setAttribute("aria-label", `${enemy.name || "敵人"} LV. ${level}，${defeated ? "已倒下" : "HP 狀態"}`);

      const identity = document.createElement("span");
      identity.className = "battle-enemy-identity";
      const name = document.createElement("strong");
      name.textContent = enemy.name || "敵人";
      const levelLabel = document.createElement("b");
      levelLabel.textContent = `LV. ${level}`;
      identity.append(name, levelLabel);

      const hpBar = document.createElement("span");
      hpBar.className = "battle-enemy-hp-bar";
      const hpFill = document.createElement("i");
      hpFill.style.width = `${hpRatio * 100}%`;
      hpBar.append(hpFill);
      row.append(identity, hpBar);
      return row;
    });
    battleUi.enemyRows.replaceChildren(...rows);
    syncBattleEnemyRowSelection();
  }

  function selectBattleEnemy(enemyId) {
    if (!battle || mode !== "battle") return;
    const enemy = battle.enemies.find((unit) => String(unit.id) === String(enemyId));
    if (!enemy) return;
    battle.selectedEnemyId = enemy.id;
    syncBattleEnemyRowSelection();
  }

  function clearBattleEnemySelection() {
    if (!battle || battle.selectedEnemyId == null) return;
    battle.selectedEnemyId = null;
    const focusedRow = document.activeElement?.closest?.("[data-battle-enemy-id]");
    focusedRow?.blur();
    syncBattleEnemyRowSelection();
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
      if (!enemy?.alive || enemy.hp <= 0 || FighterEffects?.isDisabled(enemy, battle.round)) {
        plan.willAttack = false;
        plan.targetCells = [];
        continue;
      }
      plan.facing = enemy.facing;
      plan.move = copyBattleCell(enemy.cell);
      const action = MonsterAI?.planCurrentAttack
        ? MonsterAI.planCurrentAttack({
            grid: battle.grid,
            enemy,
            targets: [battle.hero],
            units: battleUnits(),
            skills: enemy.skills,
            canDirectTarget: battleCanDirectTarget,
          })
        : null;
      const skill = action?.skill || null;
      plan.skill = skill;
      plan.skillId = skill?.id || null;
      plan.skillName = skill?.name || enemy.skills?.[0]?.name || enemy.skillName || "普通攻擊";
      plan.apCost = skill?.apCost || 0;
      plan.speedGrade = skill?.speedGrade || enemy.speedGrade || "C";
      plan.reason = action?.reason || "move";
      plan.setupSkillId = null;
      plan.willAttack = Boolean(action?.attackTargetId && skill);
      plan.targetCells = plan.willAttack
        ? Skills.patternCells(skill, enemy.cell, battle.hero.cell, {
            grid: battle.grid,
            battlefield: battle.battlefield,
            heightMap: battle.battlefield?.heightMap,
            facing: action.attackFacing || enemy.facing,
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
    if (!route?.commands) return false;
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

  function battleFacingBounds() {
    const pickerWidth = Math.max(1, battleFacingPicker?.offsetWidth || 136);
    const pickerHeight = Math.max(1, battleFacingPicker?.offsetHeight || 136);
    const margin = Math.max(12, Math.round(Math.min(width, height) * .035));
    return {
      pickerWidth,
      pickerHeight,
      minX: pickerWidth / 2 + margin,
      maxX: Math.max(pickerWidth / 2 + margin, width - pickerWidth / 2 - margin),
      minY: pickerHeight / 2 + margin,
      maxY: Math.max(pickerHeight / 2 + margin, height - pickerHeight / 2 - margin),
    };
  }

  function clampBattleFacingPosition(x, y) {
    const bounds = battleFacingBounds();
    return {
      x: Core.clamp(Number(x) || 0, bounds.minX, bounds.maxX),
      y: Core.clamp(Number(y) || 0, bounds.minY, bounds.maxY),
    };
  }

  function battleFacingPositionOverlapsCommandDock(x, y) {
    if (!battleActionDock || battleActionDock.hidden) return false;
    const stageRect = stage.getBoundingClientRect();
    const dockRect = battleActionDock.getBoundingClientRect();
    const bounds = battleFacingBounds();
    const facingRect = {
      left: stageRect.left + x - bounds.pickerWidth / 2,
      right: stageRect.left + x + bounds.pickerWidth / 2,
      top: stageRect.top + y - bounds.pickerHeight / 2,
      bottom: stageRect.top + y + bounds.pickerHeight / 2,
    };
    return !(facingRect.right + 10 <= dockRect.left || facingRect.left - 10 >= dockRect.right
      || facingRect.bottom + 10 <= dockRect.top || facingRect.top - 10 >= dockRect.bottom);
  }

  function defaultBattleFacingPosition() {
    const bounds = battleFacingBounds();
    const candidates = [
      { x: bounds.maxX, y: height * .56 },
      { x: bounds.maxX, y: height * .3 },
      { x: bounds.maxX, y: height * .8 },
      { x: bounds.minX, y: height * .56 },
    ].map((candidate) => clampBattleFacingPosition(candidate.x, candidate.y));
    return candidates.find((candidate) => !battleFacingPositionOverlapsCommandDock(candidate.x, candidate.y)) || candidates[0];
  }

  function updateBattleFacingPositionRatios() {
    const bounds = battleFacingBounds();
    const spanX = Math.max(1, bounds.maxX - bounds.minX);
    const spanY = Math.max(1, bounds.maxY - bounds.minY);
    battleFacingPosition.xRatio = Core.clamp((battleFacingPosition.x - bounds.minX) / spanX, 0, 1);
    battleFacingPosition.yRatio = Core.clamp((battleFacingPosition.y - bounds.minY) / spanY, 0, 1);
  }

  function saveBattleFacingPosition() {
    if (!battleFacingPosition.manual) return;
    updateBattleFacingPositionRatios();
    try {
      localStorage.setItem(BATTLE_FACING_POSITION_KEY, JSON.stringify({
        xRatio: battleFacingPosition.xRatio,
        yRatio: battleFacingPosition.yRatio,
      }));
    } catch (_) {}
  }

  function syncBattleFacingPosition() {
    const bounds = battleFacingBounds();
    let next;
    if (battleFacingPosition.manual) {
      if (battleFacingPosition.pointerId != null) {
        next = clampBattleFacingPosition(battleFacingPosition.x, battleFacingPosition.y);
      } else if (Number.isFinite(battleFacingPosition.xRatio) && Number.isFinite(battleFacingPosition.yRatio)) {
        next = clampBattleFacingPosition(
          bounds.minX + battleFacingPosition.xRatio * Math.max(1, bounds.maxX - bounds.minX),
          bounds.minY + battleFacingPosition.yRatio * Math.max(1, bounds.maxY - bounds.minY),
        );
      } else {
        next = defaultBattleFacingPosition();
        battleFacingPosition.manual = false;
      }
    } else {
      next = defaultBattleFacingPosition();
    }
    battleFacingPosition.x = next.x;
    battleFacingPosition.y = next.y;
    battleFacingPicker.style.left = `${Math.round(next.x)}px`;
    battleFacingPicker.style.top = `${Math.round(next.y)}px`;
    battleFacingPicker.dataset.positionMode = battleFacingPosition.manual ? "saved" : "default";
  }

  function beginBattleFacingDrag(event) {
    if (!battle || mode !== "battle" || battleFacingPicker.hidden || battleFacingPicker.dataset.detached !== "true" || event.button !== 0) return;
    const rect = battleFacingPicker.getBoundingClientRect();
    battleFacingPosition.pointerId = event.pointerId;
    battleFacingPosition.offsetX = event.clientX - (rect.left + rect.width / 2);
    battleFacingPosition.offsetY = event.clientY - (rect.top + rect.height / 2);
    battleFacingPosition.manual = true;
    battleFacingPicker.classList.add("is-dragging");
    try { battleFacingDragHandle?.setPointerCapture?.(event.pointerId); } catch (_) {}
    event.preventDefault();
    event.stopPropagation();
  }

  function moveBattleFacingDrag(event) {
    if (battleFacingPosition.pointerId !== event.pointerId || battleFacingPicker.dataset.detached !== "true") return;
    const stageRect = stage.getBoundingClientRect();
    const next = clampBattleFacingPosition(
      event.clientX - stageRect.left - battleFacingPosition.offsetX,
      event.clientY - stageRect.top - battleFacingPosition.offsetY,
    );
    battleFacingPosition.x = next.x;
    battleFacingPosition.y = next.y;
    updateBattleFacingPositionRatios();
    syncBattleFacingPosition();
    event.preventDefault();
  }

  function finishBattleFacingDrag(event) {
    if (battleFacingPosition.pointerId == null || (event && event.pointerId !== battleFacingPosition.pointerId)) return;
    try { battleFacingDragHandle?.releasePointerCapture?.(battleFacingPosition.pointerId); } catch (_) {}
    battleFacingPosition.pointerId = null;
    battleFacingPicker.classList.remove("is-dragging");
    saveBattleFacingPosition();
    syncBattleFacingPosition();
  }

  function syncBattleFacingPicker() {
    if (!battleFacingPicker) return;
    const visible = Boolean(battle && mode === "battle" && battle.phase === "planning_move" && battle.awaitingFacing);
    battleFacingPicker.hidden = !visible;
    if (!visible) return;
    const layout = battleLayout();
    const projected = Boolean(layout.projected);
    battleFacingPicker.dataset.projected = projected ? "true" : "false";
    const coarseBattlePointer = Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    const touchSizedPicker = coarseBattlePointer || width <= 820;
    const mobileTrianglePicker = touchSizedPicker;
    const projectedMobilePicker = projected && mobileTrianglePicker;
    const labels = projectedMobilePicker
      ? { up: "右上", right: "右下", down: "左下", left: "左上" }
      : projected
        ? { up: "左上", right: "右上", down: "右下", left: "左下" }
      : { up: "上", right: "右", down: "下", left: "左" };
    const detachedPicker = touchSizedPicker;
    battleFacingPicker.dataset.detached = detachedPicker ? "true" : "false";
    battleFacingPicker.dataset.mobileArrows = mobileTrianglePicker ? "true" : "false";
    const pickerRadius = mobileTrianglePicker
      ? 0
      : projected
        ? 44
        : touchSizedPicker
          ? Core.clamp(layout.cell * .54, 38, 46)
          : Core.clamp(layout.cell * .48, 31, 45);
    const mobileFacingOffsets = mobileTrianglePicker
      ? (() => {
        const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const renderedTriangleSize = Math.min(rootFontSize * 2.25, Math.max(rootFontSize * 1.625, width * .08));
        const ringRadius = renderedTriangleSize * .86;
        return {
          up: { x: 0, y: -ringRadius },
          right: { x: ringRadius, y: 0 },
          down: { x: 0, y: ringRadius },
          left: { x: -ringRadius, y: 0 },
        };
      })()
      : null;
    const mobileTriangleRotations = { up: 180, right: -90, down: 0, left: 90 };
    const currentCommands = battle.heroMoveCommands || [];
    const currentCost = battleMoveCost(currentCommands);
    const endpoint = battleMoveDraftState().endpoint || battle.hero.cell;
    const projectedDesktopFacingOffsets = projected && !detachedPicker
      ? (() => {
        const corners = battleCellCorners(endpoint, layout, battleRenderHeight(endpoint));
        const centre = battleCellCentre(endpoint, layout);
        const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const triangleHalf = rootFontSize * .36;
        const edgeInset = rootFontSize * .25;
        const edgePoints = {
          up: [corners[0], corners[1]],
          right: [corners[1], corners[2]],
          down: [corners[2], corners[3]],
          left: [corners[3], corners[0]],
        };
        return Object.fromEntries(Object.entries(edgePoints).map(([facing, [first, second]]) => {
          const edgeX = second.x - first.x;
          const edgeY = second.y - first.y;
          const edgeLength = Math.hypot(edgeX, edgeY) || 1;
          const edge = {
            x: (first.x + second.x) / 2 - centre.x,
            y: (first.y + second.y) / 2 - centre.y,
          };
          const vector = battleFacingScreenVector(facing, layout);
          return [facing, {
            x: edge.x + vector.x * (triangleHalf - edgeInset),
            y: edge.y + vector.y * (triangleHalf - edgeInset),
            edgeTangent: { x: edgeX / edgeLength, y: edgeY / edgeLength },
          }];
        }));
      })()
      : null;
    for (const button of battleFacingPicker.querySelectorAll("[data-battle-facing]")) {
      const facing = button.dataset.battleFacing;
      const label = labels[facing] || facing;
      const vector = mobileTrianglePicker ? Tactics.facingVector(facing) : battleFacingScreenVector(facing, layout);
      const angle = Math.atan2(vector.y, vector.x) * 180 / Math.PI;
      const position = mobileFacingOffsets?.[facing]
        || projectedDesktopFacingOffsets?.[facing]
        || { x: vector.x * pickerRadius, y: vector.y * pickerRadius };
      const commandFacing = projectedMobilePicker
        ? MOBILE_PROJECTED_FACING_MAP[facing] || facing
        : facing;
      button.innerHTML = '<span class="facing-arrow" aria-hidden="true"></span>';
      const arrow = button.querySelector(".facing-arrow");
      if (projectedDesktopFacingOffsets?.[facing]?.edgeTangent) {
        const tangent = projectedDesktopFacingOffsets[facing].edgeTangent;
        arrow.style.transform = `matrix(${vector.x},${vector.y},${tangent.x},${tangent.y},0,0)`;
      } else {
        arrow.style.removeProperty("transform");
        if (mobileTrianglePicker) {
          arrow.style.setProperty("--battle-facing-rotation", `${mobileTriangleRotations[facing] || 0}deg`);
        } else {
          arrow.style.removeProperty("--battle-facing-rotation");
        }
      }
      button.style.left = detachedPicker ? `calc(50% + ${position.x}px)` : `${position.x}px`;
      button.style.top = detachedPicker ? `calc(50% + ${position.y}px)` : `${position.y}px`;
      button.style.setProperty("--battle-facing-angle", `${angle}deg`);
      button.dataset.battleFacingCommand = commandFacing;
      const candidateCommands = [...currentCommands, { type: "face", facing: commandFacing }];
      const candidateCost = battleMoveCost(candidateCommands);
      const actionCost = Math.max(0, candidateCost - currentCost);
      const affordable = candidateCost <= battle.hero.moveRange + 1e-9;
      button.disabled = !affordable;
      button.classList.toggle("is-unaffordable", !affordable);
      button.setAttribute("aria-label", `面向${label}；消耗 ${formatRemainingMove(actionCost)} 移動力`);
      button.title = affordable ? `消耗 ${formatRemainingMove(actionCost)} 移動力` : "剩餘移動力不足";
    }
    if (detachedPicker) {
      syncBattleFacingPosition();
      return;
    }
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
    const starterId = Skills.CLASS_STARTER_SKILLS[playerClassId]?.[0] || "kentotsu";
    const id = action.startsWith("skill:") ? action.slice(6) : action === "slash" ? starterId : null;
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
        const pathTrace = damaging ? battleSkillAttackPathTrace(skill, cell) : null;
        if (Skills.isTargetInRange(skill, battle.hero.cell, cell, { facing: battle.hero.facing })
          && Skills.isSkillHeightValid(skill, battle.hero.cell, cell, { battlefield: battle.battlefield, grid: battle.grid })
          && (!damaging || skillArcAllowsCell(skill, cell))
          && pathTrace?.stoppedReason !== "terrain") cells.push(cell);
      }
    }
    return cells;
  }

  function battleSkillAttackPathTrace(skill, cell) {
    if (!battle || !skill || !cell || !Tactics.usesAttackPath(skill.deliveryMode)) return null;
    const path = Tactics.facingOrthogonalPriority(battle.hero.cell, cell, battle.hero.facing);
    return Tactics.traceAttackPath({
      origin: battle.hero.cell,
      target: cell,
      path,
      facing: battle.hero.facing,
      grid: battle.grid,
      units: battleUnits(),
      actorId: battle.hero.id,
      deliveryMode: skill.deliveryMode,
      blocksByTerrain: skill.blocksByTerrain,
      blocksByUnits: skill.blocksByUnits,
      arcHeight: skill.arcHeight,
      piercing: skill.piercing,
      maxPierce: skill.maxPierce,
      friendlyFire: Tactics.FRIENDLY_FIRE,
    });
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
      canDirectTarget: battleCanDirectTarget,
    });
    const damaging = skill?.effects?.some((effect) => effect.type === "damage");
    if (validation.ok && damaging && !skillArcAllowsCell(skill, cell)) {
      return { ok: false, reason: "rear-target", cells: [] };
    }
    if (validation.ok && damaging) {
      const pathTrace = battleSkillAttackPathTrace(skill, cell);
      if (pathTrace?.stoppedReason === "terrain") return { ok: false, reason: "blocked-path", cells: [] };
    }
    return validation;
  }

  function selectBattleAction(action) {
    if (!battle || mode !== "battle") return;
    if (!["planning_move", "planning_action"].includes(battle.phase)) return;
    if (action === "basic-attack" || action === "slash") {
      const starter = equippedBattleSkills()[0] || Skills.getSkill(Skills.CLASS_STARTER_SKILLS[playerClassId]?.[0]);
      action = starter ? `skill:${starter.id}` : "";
    }
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
      if (!godModeActive && battle.ap < skill.apCost) return setBattleMessage(`${skill.name}要 ${skill.apCost} AP；可以待機儲力。`, true);
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
          : validation.reason === "blocked-path"
            ? "攻擊路線被高障礙物擋住，唔可以出招。"
          : validation.reason === "untargetable"
            ? "呢個單位而家唔可以直接點選；可以用範圍或攻擊路線命中。"
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
    battle.message = heroPath.length > 1 ? `路線確認——${battle.hero.name}同敵人同步移動！` : `${battle.hero.name}留喺原位；敵人開始行動。`;
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
      unit.locomotion = Locomotion.sampleMovement(movement, id, movement.elapsed, unit.facing, unit.type);
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
    const completedHeroCommands = (battle.heroMovePlan?.commands || battle.heroMoveCommands || []).map((command) => ({
      ...command,
      to: command.to ? copyBattleCell(command.to) : undefined,
    }));
    battle.heroMovePlan = {
      path: pathFor(battle.hero.id),
      commands: completedHeroCommands,
      move: copyBattleCell(battle.hero.cell),
      facing: battle.hero.facing,
    };
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
    battle.message = stoppedUnits.length
      ? "移動 STOP；按實際企位揀招。"
      : "移動完成；揀一招，棋盤會顯示合法目標。";
    battle.autoTimer = .28;
    updateBattleUi();
    announce(stoppedUnits.length ? "有單位被卡住，移動停止。請選擇今輪行動。" : "移動完成。請選擇今輪行動。");
  }

  function resolvePlayerBattleSkill(skill, targetCell, targetUnit = null, pattern = null) {
    if (!battle || battle.phase !== "planning_action") return;
    if (!skill || (!godModeActive && battle.ap < skill.apCost)) return setBattleMessage("AP 唔夠。", true);
    if (!godModeActive) battle.ap -= skill.apCost;
    const centre = targetCell || battle.hero.cell;
    const attackPath = Tactics.usesAttackPath(skill.deliveryMode)
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
    const skill = Skills.getSkill(Skills.CLASS_STARTER_SKILLS[playerClassId]?.[0] || "kentotsu");
    const cell = target.cell || target;
    resolvePlayerBattleSkill(skill, cell, target.cell ? target : null);
  }

  function applyBattleHit(unit, amount, color, hitIndex = 0, hitCount = 1, showEffect = true) {
    const result = Tactics.applyDamage(unit, amount);
    unit.hp = result.hpAfter;
    unit.alive = !result.defeated;
    unit.hitFlash = .32;
    if (showEffect) {
      const spread = (hitIndex - (hitCount - 1) / 2) * .18;
      const offsetX = hitCount > 1 ? spread : 0;
      const offsetY = .16 + Math.floor(hitIndex / 2) * .42;
      battle.effects.push({ cell: { ...unit.cell }, text: `-${result.requestedDamage}`, color, life: .9, maxLife: .9, kind: "damage", offsetX, offsetY });
    }
    return result;
  }

  function previewBattleDamage(unit, amount) {
    const hpBefore = Math.max(0, Math.trunc(Number(unit?.hp) || 0));
    const requestedDamage = Math.max(0, Math.trunc(Number(amount) || 0));
    const appliedDamage = Math.min(hpBefore, requestedDamage);
    return {
      requestedDamage,
      appliedDamage,
      hpBefore,
      hpAfter: hpBefore - appliedDamage,
      defeated: hpBefore > 0 && hpBefore - appliedDamage === 0,
    };
  }

  function presentHeroHitEvent(event) {
    if (!battle || !event) return;
    for (const miss of event.misses || []) {
      battle.effects.push({ cell: { ...miss.cell }, text: "MISS", color: BATTLE_MISS_COLOR, life: .9, maxLife: .9, offsetY: .16 });
      addSystemMessage("combat", `${event.skillName || "攻擊"}對${miss.targetName || "目標"}未命中`);
    }
    for (const hit of event.hits || []) {
      const hitResult = hit.target
        ? applyBattleHit(hit.target, hit.damage, hit.color, hit.hitIndex, hit.hitCount, false)
        : null;
      if (!hitResult) continue;
      Tactics.applyInterrupt(
        battle.actionResolution?.pendingActions?.find((entry) => entry.actorId === hit.target.id),
        hit.interrupt || 0,
      );
      if (hit.hitIndex === 0 && hit.position === "rear") battle.effects.push({ cell: { ...hit.cell }, text: "背擊 +35%", color: "#ff9dd3", life: 1, maxLife: 1, kind: "positionBonus", offsetY: -.4 });
      else if (hit.hitIndex === 0 && hit.position === "side") battle.effects.push({ cell: { ...hit.cell }, text: "側擊 +15%", color: "#a9c9ff", life: 1, maxLife: 1, kind: "positionBonus", offsetY: -.4 });
      const spread = (hit.hitIndex - (hit.hitCount - 1) / 2) * .18;
      const offsetX = hit.hitCount > 1 ? spread : 0;
      const offsetY = .16 + Math.floor(hit.hitIndex / 2) * .42;
      battle.effects.push({ cell: { ...hit.cell }, text: `-${hitResult.requestedDamage}`, color: hit.color, life: .9, maxLife: .9, kind: "damage", offsetX, offsetY });
      addSystemMessage("combat", `${event.skillName || "攻擊"}對${hit.targetName || "目標"}造成 ${hitResult.requestedDamage} 傷害`);
    }
    player.hp = battle.hero.hp;
    updateHud();
    updateBattleUi();
    if (event.soundKind === "magic") sound.crystal();
    else sound.swing();
    for (const hit of event.hits || []) sound.hit();
  }

  function advanceHeroHitPresentation(resolution) {
    const presentation = resolution?.heroHitPresentation;
    if (!presentation) return;
    while (presentation.nextIndex < presentation.events.length
      && resolution.actionElapsed + 1e-6 >= presentation.nextAt) {
      presentHeroHitEvent(presentation.events[presentation.nextIndex]);
      presentation.nextIndex += 1;
      presentation.nextAt += presentation.interval;
    }
    if (presentation.nextIndex >= presentation.events.length) resolution.heroHitPresentation = null;
  }

  function showFighterEffectEvents(result) {
    if (!battle || !result) return;
    for (const event of result.events || []) {
      if (event.status === "untargetable" || event.status === "stealth") continue;
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
    if (battle.serverSyncPending) {
      setBattleMessage("戰況同步中；可以先揀招，伺服器確認後即刻出手。", false);
      return;
    }
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
      piercing: heroSkill?.piercing,
      maxPierce: heroSkill?.maxPierce,
      friendlyFire: Tactics.FRIENDLY_FIRE,
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
        piercing: plan.skill?.piercing,
        maxPierce: plan.skill?.maxPierce,
        friendlyFire: Tactics.FRIENDLY_FIRE,
        avoidFriendlyImpact: true,
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
      serverRound: battle.round,
      actionIndex: 0,
      applied: false,
      completed: false,
      heroAction,
      moveCommands: (battle.heroMovePlan?.commands || battle.heroMoveCommands || []).map((command) => ({
        ...command,
        to: command.to ? copyBattleCell(command.to) : undefined,
      })),
      finalFacing: battle.hero.facing,
      actionOrder,
      pendingActions: [heroPending, ...enemyPending],
      resolvedActorIds: [],
      heroSummary: "",
      enemySummaries: [],
      cancelledActors: [],
      actionHitCount: Math.max(1, Math.floor(Number(heroSkill?.hitResolution?.hit_count) || 1)),
    };
    battle.actingUnitId = actionOrder[0]?.actorId || null;
    battle.actingUnitIds = [];
    battle.message = `${heroAction.label}已確認（速度 ${heroSpeedGrade}）——按 S → A → B → C → D → E → F 順序出手。`;
    updateBattleUi();
  }

  function updateActionResolution(dt) {
    const resolution = battle?.actionResolution;
    if (!resolution || battle.phase !== "resolving_action") return;
    resolution.elapsed += dt;
    resolution.actionElapsed += dt;
    const current = resolution.actionOrder?.[resolution.actionIndex] || null;
    const currentSkill = current?.actorId === battle.hero.id && resolution.heroAction?.type === "skill"
      ? Skills.getSkill(resolution.heroAction.skillId)
      : null;
    const currentResolved = Boolean(current && resolution.resolvedActorIds.includes(current.actorId));
    if (!currentResolved) {
      resolution.actionHitCount = Math.max(1, Math.floor(Number(currentSkill?.hitResolution?.hit_count) || 1));
    }
    const strikeCount = current?.actorId === battle.hero.id && resolution.heroAction?.type === "skill"
      ? currentResolved ? Math.max(0, Number(resolution.actionHitCount) || 0) : Math.max(1, Number(resolution.actionHitCount) || 1)
      : 1;
    const duration = current?.actorId === battle.hero.id && resolution.heroAction?.type === "skill"
      ? currentResolved && strikeCount <= 0
        ? Math.max(.01, BATTLE_ACTION_WINDUP_SECONDS + BATTLE_ACTION_LINGER_SECONDS)
        : Math.max(.01, BATTLE_ACTION_WINDUP_SECONDS + strikeCount * BATTLE_ACTION_STRIKE_INTERVAL_SECONDS)
      : Math.max(.01, BATTLE_ACTION_WINDUP_SECONDS + BATTLE_ACTION_LINGER_SECONDS);
    let skippedCurrent = false;
    if (current && !currentResolved) {
      const pending = resolution.pendingActions.find((entry) => entry.actorId === current.actorId);
      const validation = pending ? revalidateBattlePendingAction(pending) : { ok: true };
      if (!validation.ok) {
        pending && (pending.status = "cancelled");
        const cancelledUnit = battleUnits().find((unit) => unit.id === current.actorId);
        if (cancelledUnit?.name && !resolution.cancelledActors.includes(cancelledUnit.name)) {
          resolution.cancelledActors.push(cancelledUnit.name);
        }
        resolution.resolvedActorIds.push(current.actorId);
        skippedCurrent = true;
        resolution.actionElapsed = duration;
      }
    }
    advanceHeroHitPresentation(resolution);
    battle.actingUnitId = skippedCurrent ? null : current?.actorId || null;
    battle.actingUnitIds = [];

    if (!skippedCurrent && current && !resolution.resolvedActorIds.includes(current.actorId) && resolution.actionElapsed >= BATTLE_ACTION_WINDUP_SECONDS) {
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

      maintainGodModeState();
      resolution.completed = true;
      resolution.applied = true;
      battle.actingUnitId = null;
      battle.actingUnitIds = [];
      battle.evasion = 0;
      const summaries = [resolution.heroSummary, ...(resolution.enemySummaries || [])].filter(Boolean);
      const cancelled = [...new Set(resolution.cancelledActors || [])];
      if (cancelled.length) summaries.push(`${cancelled.join("、")}因倒下或異常狀態取消行動`);
      if (summaries.length) battle.message = `${summaries.join("；")}。`;
      beginPredictedNextRoundWhileSyncing(resolution);
      syncBattleRoundAuthority(resolution);
    }
  }

  function beginPredictedNextRoundWhileSyncing(resolution) {
    if (!battle || !resolution || battle.phase !== "resolving_action") return false;
    if (battle.hero.hp <= 0 || livingBattleEnemies().length === 0) return false;
    battle.round = Math.max(1, battle.round + 1);
    battle.predictedRoundPending = true;
    beginPlayerRound();
    return battle.phase === "planning_move";
  }

  async function syncBattleRoundAuthority(resolution) {
    if (!battle || !resolution || resolution.serverSyncPending) return false;
    if (!battle.serverReady || !battle.serverBattleId || !ServerApi?.battle) {
      showToast("伺服器戰鬥狀態未就緒。", "danger");
      return false;
    }
    resolution.serverSyncPending = true;
    battle.serverSyncPending = true;
    const token = battle.token;
    const action = resolution.heroAction || {};
    try {
      const result = await ServerApi.battle("act", {
        battleId: battle.serverBattleId,
        round: Math.max(1, Math.floor(Number(resolution.serverRound) || battle.round)),
        tacticalVersion: 1,
        moveCommands: (resolution.moveCommands || []).map((command) => ({
          type: command.type,
          ...(command.to ? { to: copyBattleCell(command.to) } : {}),
          ...(command.facing ? { facing: command.facing } : {}),
        })),
        finalFacing: resolution.finalFacing || undefined,
        heroAction: action.type || "wait",
        skillId: action.skillId || undefined,
        targetCell: action.targetCell ? copyBattleCell(action.targetCell) : undefined,
        targetIndexes: Array.isArray(resolution.serverTargetIndexes) ? resolution.serverTargetIndexes : [],
        // Kept for older deployed Functions during rolling updates; tactical v1
        // Functions ignore this report and calculate incoming damage themselves.
        heroHp: battle.hero.hp,
      });
      if (!battle || battle.token !== token) return false;
      if (!result?.ok || !result.battle) {
        console.warn("Battle authority rejected round.", result);
        showToast("伺服器拒絕咗今個回合，戰鬥已中止。", "danger");
        try { await ServerApi.battle("cancel", { battleId: battle.serverBattleId }); } catch (_) {}
        const source = battle.source;
        if (source) source.encounterCooldown = Math.max(source.encounterCooldown || 0, 1.5);
        closeBattleHud();
        restoreExplorationUiAfterBattle();
        return false;
      }
      const predictedNextRound = Boolean(battle.predictedRoundPending);
      applyAuthoritativeState(result.state);
      syncServerBattleSnapshot(battle, result.battle, { render: false });
      battle.round = Math.max(1, Math.floor(Number(result.battle.round) || battle.round));
      battle.serverSyncPending = false;
      if (battle.hero.hp <= 0) {
        battle.predictedRoundPending = false;
        return finishBattleDefeat(), true;
      }
      if (livingBattleEnemies().length === 0) {
        battle.predictedRoundPending = false;
        return finishBattleVictory(), true;
      }
      if (predictedNextRound) {
        // The local UI already opened the next movement phase while this request
        // was in flight. Rebuild the displayed AP from the canonical previous
        // round result plus the next-round gain instead of snapping backwards.
        battle.ap = godModeActive
          ? BATTLE_AP_MAX
          : Math.min(BATTLE_AP_MAX, Math.max(0, Number(result.battle.ap) || 0) + BATTLE_AP_GAIN);
        battle.predictedRoundPending = false;
        if (battle.phase === "planning_move") battle.enemyPlans = planEnemyRound();
        updateHud(true);
        updateBattleUi();
      } else {
        beginPlayerRound();
      }
      return true;
    } catch (error) {
      if (!battle || battle.token !== token) return false;
      battle.serverSyncPending = false;
      serverCommandError(error, "戰鬥同步失敗，已中止今場戰鬥。");
      const source = battle.source;
      if (source) source.encounterCooldown = Math.max(source.encounterCooldown || 0, 1.5);
      closeBattleHud();
      restoreExplorationUiAfterBattle();
      return false;
    } finally {
      if (resolution) resolution.serverSyncPending = false;
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
    const heroHitPresentationEvents = [];
    const pendingHeroDamageByTarget = new Map();
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
      let affectedUnits = enemiesAtStart.filter((unit) => pattern.has(Tactics.cellKey(unit.cell)));
      const projectileTrace = Tactics.usesAttackPath(skill?.deliveryMode)
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
          piercing: skill.piercing,
          maxPierce: skill.maxPierce,
          friendlyFire: Tactics.FRIENDLY_FIRE,
        })
        : null;
      // Linear and ballistic deliveries resolve terrain/unit impacts along the
      // actual route; pathless/area skills retain their authored effect area.
      if (projectileTrace) {
        const tracedUnits = projectileTrace.piercing
          ? projectileTrace.impactedUnits
          : projectileTrace.actualTarget ? [projectileTrace.actualTarget] : [];
        affectedUnits = tracedUnits;
      }
      resolution.serverTargetIndexes = [...new Set(affectedUnits
        .map((unit) => battle.enemies.indexOf(unit))
        .filter((index) => index >= 0))];
      effectTargets = skill.targeting.team === "ally" ? [battle.hero].filter((unit) => pattern.has(Tactics.cellKey(unit.cell))) : affectedUnits;
      if (damageEffect) {
        const hitCount = Math.max(1, Math.floor(Number(skill.hitResolution?.hit_count || damageEffect.hits) || 1));
        const recheck = Boolean(skill.hitResolution?.recheck_attack_path_each_hit);
        const totalDamageByTarget = new Map();
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
          let split = totalDamageByTarget.get(target);
          if (!split) {
            const totalDamage = Tactics.calculateDamage(battle.hero, target, {
              defence,
              multiplier: authoredMultiplier * positional.multiplier,
              critical: skill.area.shape === "single" && battleRandom() < playerStats().critChance,
              minimum: Tactics.MIN_DIRECT_DAMAGE,
            });
            split = Skills.splitDamageLaterHits(totalDamage, hitCount);
            totalDamageByTarget.set(target, split);
          }
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
          const initialTargets = projectileTrace.candidateUnits
            || (projectileTrace.actualTarget ? [projectileTrace.actualTarget] : []);
          heroHitResolvers.push({
            hitCount,
            recheck,
            path: projectileTrace.path,
            initialTarget: initialTargets[0] || null,
            initialTargets,
            piercing: projectileTrace.piercing,
            deliveryMode: skill.deliveryMode,
            arcHeight: skill.arcHeight,
            maxPierce: skill.maxPierce,
            friendlyFire: Tactics.FRIENDLY_FIRE,
            makeHeroHit,
          });
        } else {
          for (const target of affectedUnits) {
            heroHitResolvers.push({
              hitCount,
              recheck: false,
              path: [],
              initialTarget: target,
              initialTargets: [target],
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
        for (const target of affectedUnits) statusTargets.push({ target, defenceDownEffect, moveDownEffect });
      }
    } else if (heroAction.type === "potion") {
      heroHeal = POTION_HEAL;
    }

    const enemyHits = [];
    const missedCells = [];
    for (const plan of battle.enemyPlans) {
      const enemy = enemiesAtStart.find((unit) => unit.id === plan.enemyId);
      if (!enemy || !plan.willAttack || !plan.targetCells.length) continue;
      const skill = plan.skill || enemy.skill;
      const hit = Boolean(skill)
        && (MonsterAI?.validateSkillFrom
          ? MonsterAI.validateSkillFrom(skill, enemy, enemy.cell, enemy.facing, battle.hero, battle.grid, battleUnits(), { canDirectTarget: battleCanDirectTarget })
          : Skills.validateSkillTarget(skill, enemy.cell, battle.hero.cell, {
              grid: battle.grid,
              battlefield: battle.battlefield,
              heightMap: battle.battlefield?.heightMap,
              facing: enemy.facing,
              actorTeam: "enemy",
              actorId: enemy.id,
              targetUnit: { ...battle.hero, team: "ally" },
              canDirectTarget: battleCanDirectTarget,
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
        for (const resolver of heroHitResolvers) {
          const routedDelivery = Tactics.usesAttackPath(resolver.deliveryMode);
          const traceCandidates = (trace) => trace?.candidateUnits
            || trace?.impactedUnits
            || (trace?.actualTarget ? [trace.actualTarget] : []);
          const predictedHeroHp = (unit) => Math.max(0, (Number(unit?.hp) || 0) - (pendingHeroDamageByTarget.get(unit?.id) || 0));
          const heroTraceUnits = () => battleUnits().map((unit) => {
            const hp = predictedHeroHp(unit);
            return hp === unit.hp ? unit : { ...unit, hp, alive: hp > 0 };
          });
          const actualHeroTarget = (candidate) => battleUnits().find((unit) => String(unit.id) === String(candidate?.id)) || candidate;
          const traceNow = () => routedDelivery
            ? Tactics.traceAttackPath({
                origin: battle.hero.cell,
                target: heroAction.targetCell,
                path: resolver.path,
                facing: battle.hero.facing,
                grid: battle.grid,
                units: heroTraceUnits(),
                actorId: battle.hero.id,
                deliveryMode: resolver.deliveryMode,
                blocksByTerrain: skill.blocksByTerrain,
                blocksByUnits: skill.blocksByUnits,
                arcHeight: resolver.arcHeight,
                piercing: resolver.piercing,
                maxPierce: resolver.maxPierce,
                friendlyFire: Tactics.FRIENDLY_FIRE,
              })
            : null;
          const stableTrace = routedDelivery && !resolver.recheck ? traceNow() : null;
          const initialTargets = resolver.initialTargets || (resolver.initialTarget ? [resolver.initialTarget] : []);
          for (let hitIndex = 0; hitIndex < resolver.hitCount; hitIndex += 1) {
            // each_hit re-scans after the previous hit has already changed HP
            // and occupancy. initial_only keeps its original route candidates.
            const trace = resolver.recheck ? traceNow() : stableTrace;
            const routedTargets = resolver.recheck ? traceCandidates(trace) : initialTargets;
            const presentation = resolver.hitCount > 1
              ? {
                  skillName: skill?.name,
                  soundKind: skill?.tags?.includes("magic") ? "magic" : "attack",
                  hitIndex,
                  performed: false,
                  misses: [],
                  hits: [],
                }
              : null;
            for (const candidate of routedTargets) {
              const target = actualHeroTarget(candidate);
              if (!target.alive || target.hp <= 0) continue;
              if (predictedHeroHp(target) <= 0) continue;
              const hit = resolver.makeHeroHit(target, hitIndex, trace?.path || resolver.path);
              if (!hit) continue;
              if (presentation) presentation.performed = true;
              const hitRoll = Tactics.rollHit({
                accuracy: battle.hero.accuracy,
                accuracyMultiplier: skill?.accuracyMultiplier ?? 1,
                evasion: battleTargetEvasion(target),
                accuracyPenalties: [(FighterEffects?.accuracyPenalty(battle.hero, battle.round) || 0) * 100],
              }, battleRandom);
              if (!hitRoll.hit) {
                // A miss is not an impact: keep scanning the same attack path
                // so an evading front unit does not protect a unit behind it.
                heroMissCount += 1;
                if (presentation) presentation.misses.push({ cell: { ...target.cell }, targetName: target.name });
                else {
                  battle.effects.push({ cell: { ...target.cell }, text: "MISS", color: BATTLE_MISS_COLOR, life: .9, maxLife: .9, offsetY: .16 });
                  addSystemMessage("combat", `${skill?.name || "攻擊"}對${target.name}未命中`);
                }
                continue;
              }
              const hitCell = { ...target.cell };
              if (Tactics.FRIENDLY_FIRE || target.side !== "ally") {
                const hitResult = presentation
                  ? previewBattleDamage({ ...hit.target, hp: predictedHeroHp(hit.target), alive: predictedHeroHp(hit.target) > 0 }, hit.damage)
                  : applyBattleHit(hit.target, hit.damage, hit.color, hit.hitIndex, hit.hitCount, true);
                if (presentation) {
                  pendingHeroDamageByTarget.set(hit.target.id, (pendingHeroDamageByTarget.get(hit.target.id) || 0) + hitResult.appliedDamage);
                  presentation.hits.push({
                    target: hit.target,
                    damage: hit.damage,
                    cell: hitCell,
                    targetName: hit.target.name,
                    requestedDamage: hitResult.requestedDamage,
                    color: hit.color,
                    hitIndex: hit.hitIndex,
                    hitCount: hit.hitCount,
                    position: hit.position,
                    interrupt: battleNumber(skill.interrupt),
                  });
                } else addSystemMessage("combat", `${skill?.name || "攻擊"}對${hit.target.name}造成 ${hitResult.requestedDamage} 傷害`);
                if (!presentation) Tactics.applyInterrupt(
                    battle.actionResolution.pendingActions.find((entry) => entry.actorId === hit.target.id),
                    battleNumber(skill.interrupt),
                  );
                executedHeroHits.push(hit);
              }
              // A successful unit is the impact for a normal delivery, even
              // when friendly-fire is disabled. Piercing deliveries continue.
              if (!resolver.piercing) break;
            }
            if (presentation?.performed) heroHitPresentationEvents.push(presentation);
          }
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
        if (heroHitPresentationEvents.length) {
          resolution.actionHitCount = heroHitPresentationEvents.length;
          resolution.heroHitPresentation = {
            events: heroHitPresentationEvents,
            nextIndex: 0,
            interval: BATTLE_ACTION_STRIKE_INTERVAL_SECONDS,
            nextAt: resolution.actionElapsed,
          };
          advanceHeroHitPresentation(resolution);
        } else if ((skill?.hitResolution?.hit_count || 0) > 1) {
          resolution.actionHitCount = 0;
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
      const enemySkillName = hit.plan.skillName || hit.plan.skill?.name || hit.enemy.skillName || "普通攻擊";
      if (!hitRoll.hit) {
        missedCells.push({ cell: { ...battle.hero.cell }, enemy: hit.enemy, skillName: hit.plan.skillName || hit.enemy.skillName || "攻擊" });
        addSystemMessage("combat", `${hit.enemy.name}使用「${enemySkillName}」對你未命中`, "incoming");
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
      const result = Tactics.applyDamage(battle.hero, godModeActive ? 0 : hit.damage);
      hit.appliedDamage = result.appliedDamage;
      hit.damage = result.requestedDamage;
      addSystemMessage("combat", `${hit.enemy.name}使用「${enemySkillName}」對你造成 ${hit.damage} 傷害`, "incoming");
      battle.hero.hp = result.hpAfter;
      battle.hero.alive = !result.defeated;
      if (hit.plan.skill && FighterEffects && hit.plan.skill.effects?.length && battle.hero.alive) {
        const effectResult = FighterEffects.applySkillEffects({ skill: hit.plan.skill, caster: hit.enemy, targets: [battle.hero], units: battleUnits(), grid: battle.grid, round: battle.round, random: battleRandom });
        showFighterEffectEvents(effectResult);
      }
      maintainGodModeState();
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
        if (heroHitPresentationEvents.length) { /* each strike owns its sound */ }
        else if (skill.tags.includes("heal")) sound.heal();
        else if (skill.tags.includes("magic")) sound.crystal();
        else if (executedHeroHits.length) { sound.swing(); sound.hit(); }
        else sound.tone(430, .13, { to: 680, gain: .025 });
      } else if (heroAction.type === "potion" && heroExecuted) {
        battle.effects.push({ cell: { ...battle.hero.cell }, text: `+${heroHeal}`, color: "#87db82", life: 1, maxLife: 1, burst: true });
        addSystemMessage("item", `使用小型回復藥，恢復 ${heroHeal} HP`);
        sound.heal();
      } else if (!heroExecuted) {
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
        ? `${actorUnit?.name || "敵人"}用${usedSkills.length ? `「${usedSkills.join("／")}」` : "技能"}${enemyPosition}造成 ${totalEnemyDamage} 傷害`
        : missedCells.length
          ? `${actorUnit?.name || "敵人"}技能落空`
          : `${actorUnit?.name || "敵人"}未能出招`;
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

  let battleVictoryPresenter = null;

  function ensureBattleVictoryPresenter() {
    if (battleVictoryPresenter) return battleVictoryPresenter;
    battleVictoryPresenter = BattleVictory.createPresenter({
      root: window,
      overlay: battleVictoryOverlay,
      xpRequired: Expansion.xpRequired,
      levelCap: Expansion.LEVEL_CAP,
      reducedMotion,
      onLevelUp: () => {
        if (sfxEnabled) sound.level();
      },
    });
    return battleVictoryPresenter;
  }

  async function settleBattleVictoryRewards(finished) {
    if (!finished) return null;
    if (finished.victoryResult) return finished.victoryResult;
    if (finished.victorySettlementPending) return finished.victorySettlementPending;
    if (!finished.serverReady || !finished.serverBattleId || !ServerApi?.battle) {
      showToast("伺服器戰鬥獎勵尚未就緒。", "danger");
      return null;
    }
    const token = finished.token;
    finished.victorySettlementPending = (async () => {
      try {
        const result = await ServerApi.battle("settle", {
          battleId: finished.serverBattleId,
          outcome: "victory",
        });
        if (!battle || battle.token !== token || battle !== finished) return null;
        if (!result?.ok || result.outcome !== "victory") {
          console.warn("Battle settlement rejected.", result);
          showToast("伺服器未能確認戰鬥勝利。", "danger");
          return null;
        }
        applyAuthoritativeState(result.state);
        finished.hero.hp = player.hp;
        killEnemy(finished.source, { grantXp: false, recordDefeat: false });
        if (result.earnedXp > 0) addSystemMessage("reward", `獲得 ${result.earnedXp} EXP`);
        if (result.coins > 0) addSystemMessage("reward", `獲得 ${result.coins} 金幣`);
        if (result.questProgress?.changed) {
          const active = activeGuildCommission();
          const questText = guildCommissionState.status === "ready_to_report" && active
            ? `委託完成：${active.title} · 返公會回報`
            : active ? `${active.title} ${guildCommissionState.progress} / ${active.objective.count}` : "委託進度已更新";
          showToast(questText, "good");
          addSystemMessage("quest", questText);
        }
        const presentation = {
          earnedXp: Math.max(0, Number(result.earnedXp) || 0),
          coins: Math.max(0, Number(result.coins) || 0),
          drops: Array.isArray(result.drops) ? result.drops : [],
          beforeLevel: Math.max(1, Number(result.beforeLevel) || player.level),
          beforeXp: Math.max(0, Number(result.beforeXp) || 0),
          afterLevel: Math.max(1, Number(result.afterLevel) || player.level),
          afterXp: Math.max(0, Number(result.afterXp) || player.xp),
        };
        finished.victoryResult = presentation;
        finished.serverReady = false;
        updateHud(true);
        saveImportant(false);
        return presentation;
      } catch (error) {
        if (battle && battle.token === token) serverCommandError(error, "戰鬥獎勵同步失敗。");
        return null;
      } finally {
        if (finished) finished.victorySettlementPending = null;
      }
    })();
    return finished.victorySettlementPending;
  }

  function exitBattleVictory() {
    if (!battle || battle.phase !== "victory" || !battle.victoryResult) return false;
    battleVictoryPresenter?.hide();
    clearBattlePersistenceSnapshots();
    closeBattleHud();
    restoreExplorationUiAfterBattle();
    encounterGrace = 1;
    syncAccountStatus(savePersistence?.getCloudStatus?.());
    canvas.focus({ preventScroll: true });
    return true;
  }

  function advanceBattleVictory() {
    if (!battle || battle.phase !== "victory" || battleVictoryOverlay.hidden) return false;
    const action = ensureBattleVictoryPresenter().advance();
    if (action.exit) return exitBattleVictory();
    return action.handled;
  }

  function finishBattleVictory() {
    if (!battle || battle.phase === "victory") return;
    battle.phase = "victory";
    battle.message = "敵人全數倒下——戰鬥勝利！";
    battle.messageDanger = false;
    addSystemMessage("combat", "戰鬥獲勝！", "good");
    const token = battle.token;
    const finished = battle;
    startVictoryBgm();
    updateBattleUi();

    // Start authoritative settlement now instead of after the victory beat. The
    // existing presentation delay masks normal network latency without changing
    // reward authority or letting the client grant anything early.
    const settlement = settleBattleVictoryRewards(finished);
    scheduleBattle(async () => {
      if (!battle || battle.token !== token || battle.phase !== "victory") return;
      const result = await settlement;
      if (!battle || battle.token !== token || battle.phase !== "victory" || !result) return;
      ensureBattleVictoryPresenter().show(result);
      battleVictoryContinue?.focus({ preventScroll: true });
    }, reducedMotion ? 40 : 520);
  }

  async function settleBattleDefeatState(finished) {
    if (!finished?.serverReady || !finished.serverBattleId || !ServerApi?.battle) return false;
    try {
      const result = await ServerApi.battle("settle", { battleId: finished.serverBattleId, outcome: "defeat" });
      if (result?.ok) {
        applyAuthoritativeState(result.state);
        finished.serverDefeatSettled = true;
        return true;
      }
      // A dropped response can leave the client unsure even though the first
      // transaction committed. In the defeat flow, no-battle means there is no
      // longer an active authoritative battle; recoverPlayer will still verify
      // HP before applying any penalty, so it is safe to continue.
      if (result?.reason === "no-battle") {
        finished.serverDefeatSettled = true;
        return true;
      }
      console.warn("Battle defeat settlement rejected.", result);
      return false;
    } catch (error) {
      console.warn("Battle defeat settlement failed.", error);
      return false;
    }
  }

  function finishBattleDefeat() {
    if (!battle) return;
    const token = battle.token;
    const finished = battle;
    battle.phase = "defeat";
    battle.message = "你倒下了……";
    battle.messageDanger = true;
    addSystemMessage("combat", "戰鬥失敗。", "danger");
    persistBattleResumeState({ defeat: true, battle: finished });
    updateBattleUi();

    // Start the authoritative settle immediately. Keep the promise on the
    // battle object so recovery can wait for the same request rather than
    // issuing a duplicate settlement while it is still pending.
    const settlement = settleBattleDefeatState(finished);
    finished.defeatSettlementPromise = settlement;

    scheduleBattle(async () => {
      try {
        await withClientTimeout(settlement, DEFEAT_SETTLEMENT_WAIT_MS, "battle-defeat-settle");
      } catch (error) {
        console.warn("Battle defeat settlement is still pending while opening recovery UI.", error);
      }
      if (!battle || battle.token !== token || battle !== finished) return;
      player.hp = 0;
      playerDeath();
      if (!finished.serverDefeatSettled) {
        addSystemMessage("system", "戰敗狀態仍在同步；復活時會先等伺服器確認。", "warning");
      }
    }, 620);
  }

  function fleeBattle() {
    if (!battle || !["planning_move", "planning_action"].includes(battle.phase)) return;
    const chance = RETREAT_CHANCE_OVERRIDE ?? ExpansionWorld.retreatChance(player.level, livingBattleEnemies());
    if (battleRandom() >= chance) {
      const retreatMessage = `撤退失敗 · 成功率 ${Math.round(chance * 100)}%`;
      setBattleMessage(`${retreatMessage}，敵人逼近咗！`, true);
      showToast(retreatMessage, "danger");
      battle.phase = "planning_action";
      return updateBattleUi();
    }
    const source = battle.source;
    const serverBattleId = battle.serverBattleId;
    if (battle.serverReady && serverBattleId && ServerApi?.battle) {
      ServerApi.battle("cancel", { battleId: serverBattleId }).catch((error) => console.warn("Battle cancel sync failed.", error));
    }
    const away = Core.normalize({ x: player.x - source.x, y: player.y - source.y });
    source.encounterCooldown = 3;
    moveEntity(player, (away.x || -1) * 54, away.y * 54);
    clearBattlePersistenceSnapshots();
    closeBattleHud();
    restoreExplorationUiAfterBattle();
    encounterGrace = 1.4;
    addSystemMessage("combat", "撤退成功。", "good");
    showToast("撤退成功", "good");
    canvas.focus({ preventScroll: true });
  }

  function closeBattleHud() {
    hideBattleEntryTransition();
    stopEncounterTransitionSfx();
    battleVictoryPresenter?.hide();
    battleVictoryOverlay.hidden = true;
    stopBattleBgm();
    activeBattleTouches.clear();
    battlePinchGesture = null;
    suppressBattleTouchTap = false;
    battleView = { zoom: 1, offsetX: 0, offsetY: 0 };
    battleToken += 1;
    battleHud.hidden = true;
    battleFacingPicker.hidden = true;
    delete stage.dataset.battlePhase;
    keys.clear();
    battle = null;
  }

  function updateBattle(dt) {
    if (!battle) return;
    maintainGodModeState();
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
      const loadingLabel = battle.phase === "intro" ? "正在同步戰鬥…" : battle.phase === "resolving_move" ? "移動中" : "行動中";
      buttons.innerHTML = `<span class="battle-actions-loading">${loadingLabel}</span>`;
      battleUi.potionCount = null;
      return;
    }
    const selectedSkill = battleSkillFromAction(battle.selectedAction);
    const skillButtons = equippedBattleSkills().map((skill) => {
      const id = "";
      const selected = Boolean(selectedSkill && Skills.canonicalSkillId(selectedSkill.id) === Skills.canonicalSkillId(skill.id));
      const className = `${skill.tags.includes("magic") ? "magic-skill" : "attack-skill"}${selected ? " is-selected" : ""}`;
      const action = `skill:${skill.id}`;
      const disabled = battle.ap < skill.apCost;
      const apLabel = disabled ? `AP不足，需要 ${skill.apCost} AP` : `消耗 ${skill.apCost} AP`;
      return `<button${id} class="battle-command-skill ${className}" type="button" data-battle-action="${action}" ${disabled ? "disabled" : ""} aria-pressed="${selected ? "true" : "false"}" title="${apLabel}" aria-label="${skill.name}，${apLabel}">
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
    const authorizing = battle.phase === "intro";
    for (const panel of battleHud.querySelectorAll("[data-battle-panel]")) panel.hidden = false;
    battleHud.dataset.battlePhase = battle.phase;
    stage.dataset.battlePhase = battle.phase;
    battleUi.round.textContent = `ROUND ${battle.round}`;
    const phaseCopy = {
      intro: ["戰鬥準備", "同步中"],
      planning_move: ["移動", "選擇位置"],
      resolving_move: ["移動中", ""],
      planning_action: ["戰鬥指令", "選擇招式"],
      resolving_action: ["行動中", ""],
      victory: ["戰鬥勝利！", "敵人全數倒下"],
      defeat: ["戰鬥失敗", "選擇復活方式"],
    };
    battleUi.turn.textContent = phaseCopy[battle.phase]?.[0] || "戰鬥";
    battleUi.phase.textContent = phaseCopy[battle.phase]?.[1] || "";
        battleUi.unitLevel.textContent = `LV. ${battle.hero.level}`;
    battleUi.unitName.textContent = battle.hero.name || playerDisplayName();
    battleUi.hpFill.style.width = `${Core.clamp(battle.hero.hp / battle.hero.maxHp, 0, 1) * 100}%`;
    battleUi.hpText.textContent = `${Math.ceil(battle.hero.hp)} / ${battle.hero.maxHp}`;
    const displayedAp = authorizing ? BATTLE_AP_GAIN : battle.ap;
    battleUi.apFill.style.width = `${Core.clamp(displayedAp / BATTLE_AP_MAX, 0, 1) * 100}%`;
    battleUi.apText.textContent = `${displayedAp} / ${BATTLE_AP_MAX}`;
    if (battleUi.commandAp) {
      const apValue = battleUi.commandAp.querySelector("strong");
      if (apValue) apValue.textContent = `${displayedAp} AP`;
      battleUi.commandAp.setAttribute("aria-label", `目前 ${displayedAp} AP`);
      battleUi.commandAp.classList.toggle("is-low", displayedAp <= 1);
      battleUi.commandAp.classList.toggle("is-full", displayedAp >= BATTLE_AP_MAX);
    }
    renderBattleEnemyRows();
    if (battleUi.potionCount) battleUi.potionCount.textContent = player.potions;
    battleUi.hint.textContent = battle.message;
    battleUi.hint.classList.toggle("danger", Boolean(battle.messageDanger));
    battleUi.hint.hidden = !battle.messageDanger;
    renderBattleActionButtons();
    syncBattleFacingPicker();
    syncBattleCommandMenu();
    schedulePersistBattleResumeState();
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
    syncRealtimeExploration();
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
    return ["frog", "turtle", "snake", "bear"].includes(target) ? "mountain-southeast" : "field";
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
    if (currentMapId === "guild") return "冒險者公會";
    if (currentMapId === "shop") return "帝都裝備坊";
    if (currentMapId === "clinic") return "帝都醫療院";
    if (currentMapId === "general-store") return "帝都道具店";
    if (currentMapId === "inn") return "帝都旅館";
    if (world?.biome === "mountain") return world?.name || "欣梅爾山地";
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

  const SYSTEM_LOG_LABELS = Object.freeze({ world: "世界", combat: "戰鬥", reward: "進度", quest: "進度", item: "進度", system: "系統" });

  const systemFeedback = SystemFeedback.create({
    dom: { toastElement, ariaLive, systemLog, systemLogMessages, systemLogTabs, systemLogToggleButton },
    labels: SYSTEM_LOG_LABELS,
    filterGroups: { world: ["world"], combat: ["combat"], progress: ["reward", "quest", "item"], system: ["system"] },
    escapeUiText,
    storage: { setItem(key, value) { localStorage.setItem(key, value); } },
    storageKey: SYSTEM_LOG_COLLAPSED_KEY,
    setTimeout: window.setTimeout.bind(window),
    state: {
      getFilter: () => systemLogFilter,
      getEntries: () => systemLogEntries,
      getCollapsed: () => systemLogCollapsed,
      setCollapsed: (value) => { systemLogCollapsed = value; },
      nextSerial: () => ++systemLogSerial,
    },
  });
  const {
    showToast,
    announce,
    renderSystemLog,
    addSystemMessage,
    addWorldMessage,
    syncSystemLogCollapsed,
    toggleSystemLogCollapsed,
  } = systemFeedback;

  worldChat = Chat?.create?.({
    firebase: Firebase,
    historyLimit: 500,
    maxMessageLength: 200,
    sendCooldownMs: 650,
    onMessage: (message) => addWorldMessage(message.name, message.text),
    onError: (error) => console.warn("Everrealm world chat failed.", error),
  }) || null;

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

      // Preserve the established mountain / boss presentation.  The oblique
      // height renderer is opt-in per battlefield and must not silently restyle
      // legacy flat encounters.
      ctx.save();
      ctx.globalAlpha = .16;
      for (let index = 0; index < 8; index += 1) {
        const auraX = ((index * 233 + elapsed * (8 + index)) % (width + 240)) - 120;
        const auraY = 80 + ((index * 97) % Math.max(100, height - 170));
        const aura = ctx.createRadialGradient(auraX, auraY, 0, auraX, auraY, 90 + index * 9);
        aura.addColorStop(0, bossFight ? "rgba(174,145,255,.3)" : "rgba(82,220,203,.22)");
        aura.addColorStop(1, "rgba(20,30,50,0)");
        ctx.fillStyle = aura;
        ctx.fillRect(auraX - 140, auraY - 110, 280, 220);
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
    const selectedEnemy = selectedBattleEnemy();
    const selectedEnemyCellKey = selectedEnemy ? Tactics.cellKey(selectedEnemy.cell) : null;
    const areaPreview = new Set();
    if (selectedSkill && battle.phase === "planning_action" && skillTargetValidation(selectedSkill, battle.cursor).ok) {
      for (const cell of Skills.patternCells(selectedSkill, battle.hero.cell, battle.cursor, { grid: battle.grid, facing: battle.hero.facing })) areaPreview.add(Tactics.cellKey(cell));
    }
    const attackPathPreview = Tactics.usesAttackPath(selectedSkill?.deliveryMode)
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
      if (!blocked && selectedEnemyCellKey === key) {
        const defeated = !selectedEnemy.alive || selectedEnemy.hp <= 0;
        const pulse = .62 + Math.sin(elapsed * 4.5) * .12;
        drawBattleCellOverlay(
          cell,
          layout,
          defeated ? "rgba(173,180,195,.08)" : `rgba(255,200,87,${.08 + pulse * .06})`,
          defeated ? "rgba(173,180,195,.62)" : `rgba(255,200,87,${pulse})`,
          2.5,
          .76,
        );
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
    const untargetable = FighterEffects?.isUntargetable?.(unit, battle.round) === true;
    const attackFacing = unit.side === "ally" && acting && battle.actionResolution?.heroAction?.targetCell
      ? Locomotion.facingFromDelta(
          battle.actionResolution.heroAction.targetCell.x - unit.cell.x,
          battle.actionResolution.heroAction.targetCell.y - unit.cell.y,
          renderFacing,
        )
      : renderFacing;
    const baseLocomotion = unit.locomotion || Locomotion.create(renderFacing);
    const locomotion = baseLocomotion.facing === renderFacing
      ? baseLocomotion
      : { ...baseLocomotion, state: "idle", facing: renderFacing, time: 0 };
    const hurt = unit.hitFlash > 0;
    const stopped = !hurt && (unit.stopFlash || 0) > 0;
    const actionResolved = battle.phase === "resolving_action"
      && battle.actionResolution?.resolvedActorIds?.includes(unit.id);
    const actionHitCount = actionResolved
      ? Math.max(0, Number(battle.actionResolution?.actionHitCount) || 0)
      : 1;
    const actionProgress = battle.phase === "resolving_action"
      ? actionResolved
        ? Core.clamp(((battle.actionResolution?.actionElapsed ?? 0) - BATTLE_ACTION_WINDUP_SECONDS) / Math.max(.01, actionHitCount * BATTLE_ACTION_STRIKE_INTERVAL_SECONDS), 0, 1)
        : 0
      : stopped
        ? 1 - Core.clamp((unit.stopFlash || 0) / .48, 0, 1)
        : 0;
    const actionStrikeProgress = actionHitCount <= 0
      ? 0
      : actionHitCount > 1
        ? actionProgress >= .999
          ? 1
          : (actionProgress * actionHitCount) % 1
        : actionProgress;
    const actionStrikeIndex = !actionResolved || actionHitCount <= 0
      ? -1
      : Math.min(actionHitCount - 1, Math.floor(actionProgress * actionHitCount));
    const visualState = hurt ? "hurt" : stopped ? "stop" : acting ? "attack" : locomotion.state;
    if (unit.side === "ally") {
      Art.drawCharacter(ctx, {
        x: point.x,
        y: baseline,
        scale: heroScale,
        actor: "player",
        classId: playerClassId,
        gender: player.gender,
        facing: attackFacing,
        battleDiagonal: layout.projected,
        state: visualState,
        locomotion,
        phase: elapsed,
        progress: actionStrikeProgress,
        actionStrikeIndex,
        actionHitCount,
        alpha: untargetable ? BATTLE_UNTARGETABLE_ALPHA : 1,
        expression: hurt ? "hurt" : acting ? "determined" : "happy",
        // The old selected ring and AP orbit were persistent visual noise; tile
        // overlays/cursor already communicate tactical selection.
        selected: false,
      });
    } else {
      Art.drawEnemy(ctx, {
        x: point.x,
        y: baseline,
        scale: monsterScale * (unit.boss ? .98 : .92),
        type: unit.type,
        facing: renderFacing,
        phase: elapsed,
        state: visualState,
        locomotion,
        battleDiagonal: layout.projected,
        progress: actionStrikeProgress,
        actionStrikeIndex,
        actionHitCount,
        alpha: untargetable ? BATTLE_UNTARGETABLE_ALPHA : 1,
        selected: false,
      });
    }

    // Diagonal battle atlases already communicate facing through the artwork;
    // legacy enemy art still needs the marker as a tactical fallback.
    const hasAuthoredFacing = layout.projected && Boolean(Locomotion.BATTLE_DIAGONAL_ASSETS?.[unit.type]);
    if (unit.side !== "ally" && !hasAuthoredFacing) {
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
      const authoredRegionIndex = typeof world.navigation.regionIndexAt === "function"
        ? world.navigation.regionIndexAt("npc", authoredPoint)
        : null;
      if (Number.isInteger(authoredRegionIndex)) {
        const authoredNpcs = world.npcs.filter((entity) => authoritativeInteractionRegion(entity) === "npc");
        const authoredNpc = authoredNpcs.find((entity) => authoritativeInteractionRegionIndex(entity) === authoredRegionIndex) ||
          (authoredNpcs.length === 1 && authoritativeInteractionRegionIndex(authoredNpcs[0]) === null ? authoredNpcs[0] : null);
        if (authoredNpc) return authoredNpc;
      }
      const authoredInteractionId = world.navigation.interactionAtWorldPoint(authoredPoint);
      if (authoredInteractionId) {
        const authoredInteraction = [...world.npcs, ...world.boards].find((entity) => entity.id === authoredInteractionId);
        if (authoredInteraction) return authoredInteraction;
      }
    }
    const candidates = [
      ...world.npcs.filter((entity) => !(world.navigation?.authoritative && authoritativeInteractionRegion(entity))),
      ...(world.boards || []).filter((entity) => !(world.navigation?.authoritative && authoritativeInteractionRegion(entity))),
      ...(world.signs || []).filter((entity) => !(world.navigation?.authoritative && authoritativeInteractionRegion(entity))),
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
    const regionIndex = authoritativeInteractionRegionIndex(entity);
    const regionPoint = navigation.nearestPointInRegion(region, player, regionIndex);
    if (!regionPoint) return null;
    const navigationRadius = Number(navigation.feetRadiusPx) || 3;
    // The NPC mask stays exact. Find the nearest standable white/cyan point
    // around that region, even when black blocked pixels separate it from the
    // player; the pending click is completed when this reachable point is met.
    return nearestWalkableExploreDestination(regionPoint, navigationRadius);
  }

  function setExploreClickTarget(target, entity = null) {
    explorePortalIntentId = null;
    pendingClickInteractionPoint = null;
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
      if (entity.approachPoint && !authoritativeInteractionRegion(entity)) {
        destination = { x: entity.approachPoint.x, y: entity.approachPoint.y };
        pendingClickInteractionId = entity.id;
      } else {
        const authoredApproach = authoritativeInteractionApproachPoint(entity);
        if (authoredApproach) destination = authoredApproach;
        else if (entity.approachPoint) destination = { x: entity.approachPoint.x, y: entity.approachPoint.y };
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
      return;
    }
    if (pendingClickInteractionId) {
      const finalPathPoint = exploreMovePath[exploreMovePath.length - 1] || exploreMoveTarget;
      pendingClickInteractionPoint = finalPathPoint ? { ...finalPathPoint } : { ...destination };
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

  function resetMobileTouchGestures({ cancelExplore = false } = {}) {
    activeExploreTouches.clear();
    explorePinchGesture = null;
    suppressExploreTouchTap = false;
    activeBattleTouches.clear();
    battlePinchGesture = null;
    suppressBattleTouchTap = false;
    if (cancelExplore) cancelExplorePointerTracking();
    else clearExplorePointerGesture();
  }

  function cleanupEndedTouchPointer(event) {
    if (!event || event.pointerType !== "touch") return false;
    const pointerId = event.pointerId;
    const trackedExplore = activeExploreTouches.delete(pointerId);
    const trackedBattle = activeBattleTouches.delete(pointerId);

    if (explorePinchGesture?.pointerIds?.includes(pointerId) || activeExploreTouches.size < 2) {
      explorePinchGesture = null;
    }
    if (battlePinchGesture?.pointerIds?.includes(pointerId) || activeBattleTouches.size < 2) {
      battlePinchGesture = null;
    }
    if (activeExploreTouches.size === 0) suppressExploreTouchTap = false;
    if (activeBattleTouches.size === 0) suppressBattleTouchTap = false;

    // A release/cancel that escaped the canvas must never leave a latched
    // one-finger gesture behind. Canvas pointerup still gets first chance to
    // commit a normal tap; this fallback only acts if that gesture survived.
    if ((trackedExplore || trackedBattle) && explorePointerGesture?.pointerId === pointerId) {
      clearExplorePointerGesture(pointerId, false);
    }
    return trackedExplore || trackedBattle;
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
    setExploreZoomFromPinch(pinch.startZoom * (distance / pinch.startDistance));
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
    if (mobileChatInputActive()) {
      event.preventDefault();
      stopMobileChatMovement();
      worldChatInput?.blur?.();
      return;
    }
    if (mode === "battle") {
      clearBattleEnemySelection();
      const battleTouch = event.pointerType === "touch" && usesMobileExploreControls();
      if (!battleTouch) return handleBattlePointer(event);
      event.preventDefault();
      if (event.isPrimary && activeBattleTouches.size > 0 && !activeBattleTouches.has(event.pointerId)) {
        resetMobileTouchGestures();
      }
      activeBattleTouches.set(event.pointerId, { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY });
      try { canvas.setPointerCapture?.(event.pointerId); } catch (_) {}
      if (activeBattleTouches.size >= 2) beginBattlePinch();
      return;
    }
    if (mode !== "playing" || event.button > 0 || blockingGameplayOverlayOpen()) return;

    const mobileTouch = event.pointerType === "touch" && usesMobileExploreControls();
    if (mobileTouch) {
      event.preventDefault();
      if (event.isPrimary && activeExploreTouches.size > 0 && !activeExploreTouches.has(event.pointerId)) {
        // Mobile Safari/Chromium can occasionally omit the final pointerup after
        // an interrupted pinch. A fresh primary touch proves that old entry is stale.
        resetMobileTouchGestures();
      }
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
    if (currentMapId === "mountain-southeast") return tile === world.tileTypes.WATER ? "water" : tile === world.tileTypes.WOOD ? "bridge" : "rockFloor";
    return tile === world.tileTypes.GRASS ? "grass" : tile === world.tileTypes.PATH ? "path" : tile === world.tileTypes.WATER ? "water" : tile === world.tileTypes.STONE ? "stone" : tile === world.tileTypes.WOOD ? "bridge" : "rockFloor";
  }

  // Every interior map (guild/shop/clinic/general-store/inn - see maps/interiors/*.js)
  // is tagged kind:"interior" at its definition, so this one check classifies all of
  // them at once - no per-map-id list to maintain as new buildings get added.
  function isInteriorMap() {
    return world.kind === "interior";
  }

  let miniMapWrapHidden = null;
  function setMiniMapWrapHidden(hidden) {
    if (!miniMapWrap || miniMapWrapHidden === hidden) return;
    miniMapWrapHidden = hidden;
    miniMapWrap.style.display = hidden ? "none" : "";
  }

  function drawMiniMap() {
    if (isInteriorMap()) {
      // Indoor buildings are small, fully-known rooms - a navigation minimap
      // doesn't add anything, so hide the whole widget rather than draw one.
      setMiniMapWrapHidden(true);
      return;
    }
    setMiniMapWrapHidden(false);
    const mapWidth = miniMap.width;
    const mapHeight = miniMap.height;
    const centreX = mapWidth / 2;
    const centreY = mapHeight / 2;
    const radius = Math.min(mapWidth, mapHeight) * .485;
    const flattenedMapArt = world.art?.flattened && Boolean(world.art?.backgroundScene);
    // A minimap is a local navigation tool, not a thumbnail of the whole map.
    // Keep the player centred, but show enough nearby roads/buildings to orient the player.
    const visibleTiles = flattenedMapArt ? 192 : 144;
    const scale = Math.min(mapWidth, mapHeight) / (visibleTiles * world.tileSize);
    const halfViewWorld = visibleTiles * world.tileSize * .5;
    // On maps smaller than the minimap's fixed view window, halfViewWorld can exceed
    // (mapDimension - halfViewWorld), which would flip min/max and freeze the camera
    // at a corner regardless of player position. Mirror updateCamera's safeguard by
    // collapsing both bounds to the map centre in that case.
    const minCameraX = Math.min(halfViewWorld, world.pixelWidth * .5);
    const maxCameraX = Math.max(minCameraX, world.pixelWidth - halfViewWorld);
    const minCameraY = Math.min(halfViewWorld, world.pixelHeight * .5);
    const maxCameraY = Math.max(minCameraY, world.pixelHeight - halfViewWorld);
    const cameraWorldX = Core.clamp(player.x, minCameraX, maxCameraX);
    const cameraWorldY = Core.clamp(player.y, minCameraY, maxCameraY);
    const originX = centreX - cameraWorldX * scale;
    const originY = centreY - cameraWorldY * scale;
    const minTileX = flattenedMapArt ? 0 : Core.clamp(Math.floor((player.x - visibleTiles * world.tileSize * .58) / world.tileSize), 0, world.width - 1);
    const maxTileX = flattenedMapArt ? -1 : Core.clamp(Math.ceil((player.x + visibleTiles * world.tileSize * .58) / world.tileSize), 0, world.width - 1);
    const minTileY = flattenedMapArt ? 0 : Core.clamp(Math.floor((player.y - visibleTiles * world.tileSize * .58) / world.tileSize), 0, world.height - 1);
    const maxTileY = flattenedMapArt ? -1 : Core.clamp(Math.ceil((player.y + visibleTiles * world.tileSize * .58) / world.tileSize), 0, world.height - 1);
    miniCtx.clearRect(0, 0, mapWidth, mapHeight);
    miniCtx.save();
    miniCtx.beginPath();
    miniCtx.arc(centreX, centreY, radius, 0, Core.TAU);
    miniCtx.clip();

    miniCtx.fillStyle = "#173d3c";
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

    // Edge fade: blend the true map edge into the ambient backdrop colour
    // instead of a hard cut-off. Anchored to the map's actual rectangle (not
    // the minimap frame), so a small map fades out well inside the circle,
    // while a large map only fades right at its real edge.
    const edgeFadeColourHex = "#173d3c";
    const edgeFadeColourRgb = [1, 3, 5].map((i) => parseInt(edgeFadeColourHex.slice(i, i + 2), 16)).join(",");
    const mapRectHalfWidth = Math.max(1, world.pixelWidth * scale * .5);
    const mapRectHalfHeight = Math.max(1, world.pixelHeight * scale * .5);
    const mapRectCentreX = originX + mapRectHalfWidth;
    const mapRectCentreY = originY + mapRectHalfHeight;
    miniCtx.save();
    miniCtx.translate(mapRectCentreX, mapRectCentreY);
    miniCtx.scale(mapRectHalfWidth, mapRectHalfHeight);
    const edgeFade = miniCtx.createRadialGradient(0, 0, .6, 0, 0, 1.05);
    edgeFade.addColorStop(0, `rgba(${edgeFadeColourRgb},0)`);
    edgeFade.addColorStop(1, `rgba(${edgeFadeColourRgb},1)`);
    miniCtx.fillStyle = edgeFade;
    // Overscan generously in this normalised space so the fill still reaches
    // every corner of the square canvas even when the map rect is tiny or
    // off-centre relative to the minimap frame.
    const edgeFadeOverscanX = (mapWidth * 3) / mapRectHalfWidth;
    const edgeFadeOverscanY = (mapHeight * 3) / mapRectHalfHeight;
    miniCtx.fillRect(-edgeFadeOverscanX, -edgeFadeOverscanY, edgeFadeOverscanX * 2, edgeFadeOverscanY * 2);
    miniCtx.restore();

    // Darken toward the circular frame itself for a subtle vignette, so the
    // minimap reads as a porthole into the world rather than a flat sticker.
    const ringVignette = miniCtx.createRadialGradient(centreX, centreY, radius * .72, centreX, centreY, radius);
    ringVignette.addColorStop(0, "rgba(0,0,0,0)");
    ringVignette.addColorStop(1, "rgba(0,0,0,.55)");
    miniCtx.fillStyle = ringVignette;
    miniCtx.fillRect(0, 0, mapWidth, mapHeight);

    // Marker tracks the player relative to the (possibly clamped) minimap camera,
    // matching how the main-screen camera positions the player on screen. When
    // the camera is centred on the player, the marker sits at the centre; once
    // the camera clamps near a map edge, the marker drifts off-centre to match.
    const markerPoint = mapPoint(player.x, player.y);
    miniCtx.save();
    miniCtx.translate(markerPoint.x, markerPoint.y);
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
    for (const remote of multiplayer?.getRenderPlayers?.(currentMapId) || []) {
      if (inView(remote, 130)) renderables.push(remote);
    }
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
    else if (entity.kind === "sign") drawSign(entity, shakeX, shakeY);
    else if (entity.kind === "chest") drawChest(entity, shakeX, shakeY);
    else if (entity.kind === "npc") drawNpc(entity, shakeX, shakeY);
    else if (entity.kind === "portal") drawPortal(entity, shakeX, shakeY);
    else if (entity.kind === "player") drawPlayer(shakeX, shakeY);
    else if (entity.kind === "remote-player") drawRemotePlayer(entity, shakeX, shakeY);
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
      const indoor = world.kind === "interior";
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
    if (["counter", "bookshelf", "table", "weaponRack", "armourRack", "anvil", "screen", "pillar", "goodsCrate"].includes(prop.kind)) {
      const w = Math.max(16, (prop.w || 28) * scale);
      const h = Math.max(12, (prop.h || 22) * scale);
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
      const authored = region ? world.navigation?.data?.regions?.[region]?.[authoritativeInteractionRegionIndex(npc) ?? 0] : null;
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
        drawNpcName(labelTop.x, labelY, npc.nameLabel || npcDisplayName(npc));
      } else {
        drawNpcName(point.x, point.y - 69 * scale, npc.nameLabel || npcDisplayName(npc));
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
    drawNpcName(anchorX, nameY, npc.nameLabel || npcDisplayName(npc));
  }

  function drawNpcName(x, y, name) {
    const label = typeof name === "string" ? { text: name } : name || {};
    const text = String(label.text || "");
    const prefix = String(label.prefix || "");
    const strong = String(label.name || "");
    if (!text && !prefix && !strong) return;
    const fontSize = Core.clamp(8.5 * camera.zoom, 10, 14);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(7,11,22,.92)";
    ctx.lineWidth = Math.max(2.5, fontSize * .34);
    ctx.fillStyle = "#f5e9ca";
    if (text) {
      ctx.font = `800 ${fontSize}px "Noto Sans HK", "Microsoft JhengHei", sans-serif`;
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    } else {
      const gap = prefix && strong ? Math.max(2, fontSize * .22) : 0;
      ctx.font = `650 ${fontSize}px "Noto Sans HK", "Microsoft JhengHei", sans-serif`;
      const prefixWidth = ctx.measureText(prefix).width;
      ctx.font = `850 ${fontSize}px "Noto Sans HK", "Microsoft JhengHei", sans-serif`;
      const strongWidth = ctx.measureText(strong).width;
      let cursor = x - (prefixWidth + gap + strongWidth) / 2;
      ctx.font = `650 ${fontSize}px "Noto Sans HK", "Microsoft JhengHei", sans-serif`;
      ctx.strokeText(prefix, cursor + prefixWidth / 2, y);
      ctx.fillText(prefix, cursor + prefixWidth / 2, y);
      cursor += prefixWidth + gap;
      ctx.font = `850 ${fontSize}px "Noto Sans HK", "Microsoft JhengHei", sans-serif`;
      ctx.strokeText(strong, cursor + strongWidth / 2, y);
      ctx.fillText(strong, cursor + strongWidth / 2, y);
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
    const artBox = Art.drawCharacter(ctx, {
      x: point.x,
      y: point.y + 13 * camera.zoom,
      scale: camera.zoom,
      actor: "player",
      classId: playerClassId,
      gender: player.gender,
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
    if (mode === "playing") drawPlayerExplorationMeters(point, artBox, camera.zoom);
  }

  function drawRemotePlayer(remote, shakeX, shakeY) {
    const point = worldToScreen(remote, shakeX, shakeY);
    const scale = camera.zoom;
    const artBox = Art.drawCharacter(ctx, {
      x: point.x,
      y: point.y + 13 * scale,
      scale,
      actor: "player",
      classId: remote.classId || "fighter",
      gender: remote.gender,
      facing: remote.facing,
      state: remote.moving ? "walk" : "idle",
      locomotion: remote.locomotion,
      phase: elapsed,
      expression: "happy",
    });
    if (artBox) multiplayer?.markRemoteRendered?.(remote.uid);

    // Keep the label centered on the character's fixed world/baseline anchor,
    // but derive the vertical position from the stable locomotion layout box.
    // Do not use frame-specific alpha bounds (nameAnchorX/nameAnchorY), because
    // those vary per walk frame and make the label drift left/right/up/down.
    const stableCenterX = point.x;
    const stableTopY = Number.isFinite(artBox?.y)
      ? artBox.y
      : Number.isFinite(artBox?.top)
        ? artBox.top
        : point.y - 96 * scale;
    const nameX = stableCenterX;
    const nameY = stableTopY + 8 * scale;

    if (remote.state === "battle") {
      const iconSize = Core.clamp(64 * scale, 44, 76);
      const iconDrawn = Art.drawBattleStateIcon(ctx, {
        x: stableCenterX,
        y: nameY - 8 * scale,
        width: iconSize,
        height: iconSize,
        anchorX: .5,
        anchorY: 1,
        alpha: .96,
      });
      if (iconDrawn) multiplayer?.markRemoteBattleIconRendered?.(remote.uid);
    }

    drawNpcName(nameX, nameY, remote.name);
  }

  function drawPlayerExplorationMeters(point, artBox, scale) {
    const stats = playerStats();
    const hpRatio = Core.clamp(player.hp / stats.maxHp, 0, 1);
    const xpNeeded = Expansion.xpRequired(player.level);
    const xpRatio = player.level >= Expansion.LEVEL_CAP
      ? 1
      : Core.clamp(player.xp / xpNeeded, 0, 1);
    const baseline = Number.isFinite(artBox?.bottom)
      ? artBox.bottom
      : point.y + 13 * scale;
    const barWidth = Math.max(28, 54 * scale);
    const barHeight = Math.max(4, 5 * scale);
    const gap = Math.max(1, 2 * scale);
    const x = point.x - barWidth / 2;

    ctx.save();
    const drawMeter = (y, ratio, color) => {
      ctx.fillStyle = "rgba(5,8,18,.86)";
      ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth * ratio, barHeight);
    };
    const hpY = baseline + Math.max(3, 4 * scale);
    drawMeter(hpY, hpRatio, "#ff6b6b");
    drawMeter(hpY + barHeight + gap, xpRatio, "#52dccb");
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
    syncWorldClock();
    multiplayer?.tick?.(rawDelta);
    if (mode !== "playing") {
      cancelExplorePointerTracking();
      window.EverrealmFootstepsRuntime?.update?.({ moving: false });
    }
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
      if (battle.phase === "intro") return;
      if (battle.phase === "victory") {
        if (code === "Enter" || code === "Space") {
          event.preventDefault();
          advanceBattleVictory();
        }
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
      newGame: (classId, gender) => newGame(true, classId, gender),
      snapshot: () => ({
        mode, elapsedSeconds: elapsed, level: player.level, xp: player.xp, hp: player.hp, maxHp: playerStats().maxHp,
        stats: playerStats(),
        classId: playerClassId,
        gender: player.gender,
        x: player.x, y: player.y, facing: player.facing, moving: player.moving, locomotion: player.locomotion ? { ...player.locomotion } : null,
        movementOdometer: { distanceWorldUnits: player.explorationDistance, movingSeconds: player.explorationMoveSeconds },
        currentMapId, bgm: bgm.snapshot(),
        coins: player.coins, ownedEquipment: [...ownedEquipment], equipped: { ...equipped },
        guildCommission: Guild.normalizeState(guildCommissionState),
        guildMarks, guildRenown, monsterKills: { ...monsterKills },
        skills: Skills.normalizeSkillState(skillState), godMode: godModeActive, automaticPortalReady,
        explorePath: { target: exploreMoveTarget ? { ...exploreMoveTarget } : null, remaining: exploreMovePath.length, portalIntentId: explorePortalIntentId },
        exploreZoom, cameraZoom: camera.zoom, targetCameraZoom: targetZoom(), hudCollapsed,
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
      setZoom: (value) => {
        setExploreZoom(value, { announceChange: false, immediate: true });
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
        updateHud(true);
        return window.__RPG_DEBUG__.snapshot();
      },
      setGuildMarks: (value) => {
        guildMarks = Core.clamp(Math.floor(Number(value) || 0), 0, 99999);
        syncDeckCapacityMilestones({ silent: true });
        if (facilityWindows.size) renderFacility();
        return window.__RPG_DEBUG__.snapshot();
      },
      save: () => saveGame(false, true),
      load: loadGame,
      enterMap: (id) => transitionMap(id, maps[id]?.start),
      forceDeath: () => { player.hp = 0; playerDeath(); },
      respawn,
      interactWith: (id) => {
        const target = world.npcs.find((item) => item.id === id) || world.portals.find((item) => item.id === id) || world.boards.find((item) => item.id === id) || world.chests.find((item) => item.id === id);
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
      grantAllSkillBooks: (quantity = 1) => {
        const result = Skills.grantAllSkillManuals(skillState, quantity);
        if (result.ok) {
          skillState = result.state;
          markPersistenceDirty();
        }
        if (facilityWindows.size) renderFacility();
        return window.__RPG_DEBUG__.snapshot();
      },
      godMode: (enabled = true) => {
        const result = setGodMode(enabled);
        return result.ok ? window.__RPG_DEBUG__.snapshot() : result;
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
  for (const button of document.querySelectorAll("[data-gender-choice]")) {
    button.addEventListener("click", () => {
      pendingPlayerGender = rememberPlayerGender(button.dataset.genderChoice);
      updateGenderChoiceUi();
      drawClassSelectionPreviews();
    });
  }
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
  sidebarToggle?.addEventListener("click", () => {
    const mobilePortrait = usesMobilePortraitSidebar();
    setHudCollapsed(!hudCollapsed, { persist: !mobilePortrait });
  });
  exploreSidebar?.addEventListener("pointerdown", (event) => {
    if (!usesMobilePortraitSidebar()) return;
    if (!event.target.closest?.(".sidebar-primary")) return;
    scheduleMobileHudAutoHide();
  }, { passive: true });
  document.addEventListener("pointerdown", (event) => {
    if (!usesMobilePortraitSidebar() || hudCollapsed || exploreSidebar?.hidden) return;
    if (exploreSidebar?.contains(event.target)) return;
    setHudCollapsed(true, { persist: false });
  }, { capture: true, passive: true });
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

  const facilityActionHandlers = Object.freeze({
    "select-item": ({ itemId }) => {
      selectedInventoryItemId = itemId;
      pendingInventoryDestroyItemId = null;
      renderBagFacility();
    },
    "inventory-filter": ({ category }) => {
      inventoryCategory = category;
      inventoryPage = 0;
      selectedInventoryItemId = null;
      pendingInventoryDestroyItemId = null;
      renderBagFacility();
    },
    "inventory-prev": () => {
      inventoryPage = Math.max(0, inventoryPage - 1);
      selectedInventoryItemId = null;
      pendingInventoryDestroyItemId = null;
      renderBagFacility();
    },
    "inventory-next": () => {
      inventoryPage += 1;
      selectedInventoryItemId = null;
      pendingInventoryDestroyItemId = null;
      renderBagFacility();
    },
    "shop-category": ({ category }) => {
      equipmentShopCategory = category;
      selectedShopItemId = null;
      renderShopFacility();
    },
    "shop-trade-mode": ({ mode: tradeMode }) => {
      shopTradeMode = tradeMode;
      selectedShopItemId = null;
      facilityContext === "general-store" ? renderGeneralStoreFacility() : renderShopFacility();
    },
    "select-shop-item": ({ itemId }) => {
      selectedShopItemId = itemId;
      renderFacility();
    },
    "commission-detail": ({ offerId }) => renderGuildCommissionDetail(offerId),
    accept: ({ offerId }) => acceptGuildOffer(offerId),
    claim: ({ contractId }) => claimGuildContract(contractId),
    abandon: ({ contractId }) => openAbandonCommission(contractId),
    buy: ({ itemId }) => changeEquipment(itemId, true),
    equip: ({ itemId }) => changeEquipment(itemId, false),
    unequip: ({ itemId }) => unequipEquipment(itemId),
    "sell-equipment": ({ itemId }) => sellEquipmentItem(itemId),
    "sell-store-item": ({ itemId }) => sellGeneralStoreItem(itemId),
    "destroy-item": ({ itemId }) => {
      pendingInventoryDestroyItemId = itemId;
      renderBagFacility();
    },
    "cancel-destroy-item": () => {
      pendingInventoryDestroyItemId = null;
      renderBagFacility();
    },
    "confirm-destroy-item": ({ itemId }) => destroyInventoryItem(itemId),
    "use-potion": () => useBagPotion(),
    "use-weak-potion": () => useWeakPotion(),
    "buy-store-item": ({ itemId }) => buyGeneralStoreItem(itemId),
    "open-book": ({ star }) => openGuildSkillBook(star),
    "open-envelope": ({ star }) => openGuildEnvelope(star),
    "use-manual": ({ skillId }) => useSkillManualFromBag(skillId, false),
    "use-bound-manual": ({ skillId }) => useSkillManualFromBag(skillId, true),
    "skill-detail": ({ skillId, button }) => openSkillDetail(skillId, button),
    "select-panel": ({ panelId }) => selectLoadoutPanel(panelId),
    "equip-panel": ({ panelId }) => requestEquipLoadoutPanel(panelId),
    "confirm-equip-panel": ({ panelId }) => confirmEquipLoadoutPanel(panelId),
    "cancel-equip-panel": () => cancelEquipLoadoutPanel(),
    "equip-skill": ({ skillId }) => changeSkillLoadout(skillId, true),
    "unequip-skill": ({ skillId }) => changeSkillLoadout(skillId, false),
  });

  function handleFacilityContentClick(event, state) {
    if (guildEnvelopeOpenPending) {
      event.preventDefault();
      return;
    }
    if (!activateFacilityWindow(state)) return;
    const click = FacilityActionRouter.resolveContentClick({
      event,
      facilityTab,
      hasSelectedInventoryItem: Boolean(selectedInventoryItemId),
      suppressSkillTreeClickUntil,
      now: performance.now(),
    });
    if (click.preventDefault) event.preventDefault();
    if (click.dismissInventoryDetail) {
      selectedInventoryItemId = null;
      pendingInventoryDestroyItemId = null;
      if (click.renderAfterDismiss) {
        renderBagFacility();
        return;
      }
    }
    if (!click.command) return;
    FacilityActionRouter.dispatch(click.command, facilityActionHandlers);
    syncActiveFacilityWindowState();
  }

  function wireFacilityWindow(state) {
    FacilityWindowShell.wireWindow(state, {
      close: closeFacility,
      activate: activateFacilityWindow,
      toggleHelp: toggleFacilityHelp,
      closeHelp: (windowState) => setFacilityHelpOpen(false, windowState),
      availableTabs: availableFacilityTabs,
      selectTab: (tab) => {
        facilityTab = tab;
        renderFacility();
      },
      contentClick: handleFacilityContentClick,
      isActive: (windowState) => activeFacilityWindow === windowState,
      beginSkillTreePan,
      beginDeckDrag,
      moveSkillTreePan,
      moveDeckDrag,
      finishSkillTreePan,
      finishDeckDrag,
      cancelSkillTreePan,
      cancelDeckDrag,
    });
  }

  systemLogTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-log-filter]");
    if (!button) return;
    const next = button.dataset.logFilter;
    systemLogFilter = ["all", "world", "combat", "progress", "system"].includes(next) ? next : "all";
    renderSystemLog();
  });
  worldChatForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const text = String(worldChatInput?.value || "").trim();
    if (!text) return;
    if (!worldChat?.isActive?.()) {
      showToast("世界頻道尚未連線。", "danger");
      return;
    }
    try {
      const result = await worldChat.send(text);
      if (result?.ok) {
        worldChatInput.value = "";
      } else if (result?.reason === "cooldown") {
        showToast("訊息傳送得太快，請等一等。", "danger");
      } else if (result?.reason === "too-long") {
        showToast(`世界頻道每句最多 ${result.maxLength || 200} 字。`, "danger");
      } else {
        showToast("世界頻道暫時未能傳送訊息。", "danger");
      }
    } catch (error) {
      console.warn("Everrealm world chat send failed.", error);
      showToast("世界頻道暫時未能傳送訊息。", "danger");
    } finally {
      worldChatInput?.focus?.({ preventScroll: true });
    }
  });
  worldChatInput?.addEventListener("focus", () => {
    // On touch devices the software keyboard can cover a large part of the
    // playfield. Cancel any in-flight click-to-move route as soon as chat starts
    // so the hero never keeps walking behind the keyboard. Desktop is unchanged.
    if (!usesMobileExploreControls()) return;
    stopMobileChatMovement();
  });
  worldChatInput?.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    worldChatForm?.requestSubmit?.();
  });
  worldChatForm?.addEventListener("pointerdown", (event) => event.stopPropagation());
  worldChatForm?.addEventListener("click", (event) => event.stopPropagation());
  worldChatForm?.addEventListener("keydown", (event) => event.stopPropagation());
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
    if (event.target.closest("[data-victory-continue]")) {
      advanceBattleVictory();
      return;
    }
    const enemyRow = event.target.closest("[data-battle-enemy-id]");
    if (enemyRow) {
      selectBattleEnemy(enemyRow.dataset.battleEnemyId);
      return;
    }
    clearBattleEnemySelection();
    const facingButton = event.target.closest("[data-battle-facing]");
    if (facingButton && !facingButton.disabled) {
      chooseBattleFacing(facingButton.dataset.battleFacingCommand || facingButton.dataset.battleFacing);
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
  battleFacingDragHandle?.addEventListener("pointerdown", beginBattleFacingDrag);
  battleFacingPicker?.addEventListener("pointermove", moveBattleFacingDrag, { passive: false });
  battleFacingPicker?.addEventListener("pointerup", finishBattleFacingDrag);
  battleFacingPicker?.addEventListener("pointercancel", finishBattleFacingDrag);
  canvas.addEventListener("pointerdown", handleCanvasPointer);
  canvas.addEventListener("contextmenu", (event) => {
    if (mode === "battle") event.preventDefault();
  });
  canvas.addEventListener("pointermove", handleCanvasPointerMove);
  canvas.addEventListener("pointerleave", clearExploreHoverPointer);
  canvas.addEventListener("pointerup", finishCanvasPointer);
  canvas.addEventListener("pointercancel", cancelExploreTouchPointer);
  // Fallback for mobile browsers that end a captured touch outside the canvas
  // or drop the canvas pointerup during a pinch/OS gesture transition.
  document.addEventListener("pointerup", cleanupEndedTouchPointer);
  document.addEventListener("pointercancel", cleanupEndedTouchPointer);
  canvas.addEventListener("wheel", handleExploreWheelZoom, { passive: false });
  canvas.addEventListener("lostpointercapture", (event) => {
    cleanupEndedTouchPointer(event);
    if (explorePointerGesture?.pressed) cancelExplorePointerTracking(event.pointerId, false);
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
    setMusicEnabled(!musicEnabled);
  });
  soundEffectsMuteButton?.addEventListener("click", () => {
    const enabled = setSfxEnabled(!sfxEnabled);
    if (enabled) sound.tone(520, .1, { to: 760, gain: .03 });
  });
  musicVolumeSlider?.addEventListener("input", () => {
    const nextVolume = Core.clamp(Number(musicVolumeSlider.value) / 100, 0, 1);
    setBgmVolume(nextVolume);
  });
  soundEffectsVolumeSlider?.addEventListener("input", () => {
    const nextVolume = Core.clamp(Number(soundEffectsVolumeSlider.value) / 100, 0, 1);
    setSfxVolume(nextVolume);
  });
  document.addEventListener("pointerdown", unlockGameAudioFromGesture, { capture: true, passive: true });
  window.addEventListener("keydown", unlockGameAudioFromGesture, { capture: true });
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("blur", () => {
    keys.clear();
    resetMobileTouchGestures({ cancelExplore: true });
  });
  document.addEventListener("visibilitychange", () => {
    keys.clear();
    resetMobileTouchGestures({ cancelExplore: true });
    previousTime = performance.now();
    if (document.visibilityState === "visible") resumeGameAudio();
    else suspendGameAudio();
  });
  window.addEventListener("pagehide", suspendGameAudio);
  window.addEventListener("pageshow", () => {
    resetMobileTouchGestures();
    if (document.visibilityState === "visible") resumeGameAudio();
  });
  window.addEventListener("beforeunload", () => {
    if (mode !== "title" && isGameplayAuthorized()) persistence?.flush();
    void multiplayer?.stop?.();
    worldChat?.stop?.();
  });
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("resize", syncMobileHudAutoHideMode, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

  titleScreen.hidden = false;
  titleActions.hidden = true;
  continueButton.hidden = true;
  restoreSystemLogPosition();
  syncSystemLogCollapsed();
  renderSystemLog();
  syncAccountStatus();
  syncSystemSoundControl();
  startTitleBgm();
  syncHudCollapse();
  syncMobileHudAutoHideMode();
  resetEnemies();
  drawPlayerHudPortrait();
  window.addEventListener("everrealm-art-ready", () => {
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
