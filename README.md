# 永恆國度 · Everrealm

一隻零依賴、即開即玩嘅探索＋同步戰棋 RPG。

## 開始玩

可以直接 double-click：

`index.html`

或者由 Everrealm 根目錄啟動本地伺服器：

```powershell
npm start
```

然後打開：

`http://localhost:4173/`

## 測試

由 Everrealm 根目錄執行：

```powershell
npm test
```

## Project structure

- `data/`：固定 Game Data 唯一資料層；職業、物品、裝備、怪物、任務及玩家技能定義集中喺呢度。
- 玩家 progression：`data/classes.js` 擁有 Lv45 cap、Lv1–45 HP／Base ATK-DEF=0 及《幸福 Online／STRUGARDEN》升級 EXP 表；`rpg-core.js` 保留相同 runtime fallback／grant logic。
- 怪物本體資料：`data/monsters.js`；怪物技能：`data/skills/monster.js`；戰場技能驅動 AI：`monster-ai.js`；同級攻防校準、encounter HP／EXP 規則見 `docs/MONSTER_SYSTEM.md`。
- `assets/`：正式 runtime 美術資產，包括角色、NPC、怪物、動畫、terrain、battlefield、場景物件、UI、物品及裝備圖示。
- `tests/`：自動 regression / gameplay tests。
- `tools/`：資產清理、atlas 重排、透明 alpha audit 等開發工具。
- `docs/`：大型獨立系統嘅詳細規格。
- `docs/DATA_ARCHITECTURE.md`：固定 Game Data ownership、stable ID／legacy migration 同 Firebase boundary。
- `docs/PLAYER_DATA_SCHEMA.md`：玩家永久 state／save boundary，同日後 Firestore／RTDB 分工。
- `docs/FIGHTER_SKILL_TREE.md`：現行 Everrealm 格鬥士完整技能規格；runtime data contract 由 `data/skills/fighter.js` 實作。
- `map/`：共用 map constants、generation helpers、registry、door-anchor resolver 同 transition linker。
- `maps/`：每張地圖唯一 owning JS definition；`maps/interiors/` 放主城室內地圖。
- `docs/maps/`：每張地圖的語意／設計文件，不是 runtime tile database；其中 `docs/maps/MAIN_TOWN.md` 是主城 authored navigation package contract。
- `docs/references/`：原作／歷史研究資料；用作參考及核對，唔會覆蓋 Everrealm 現行 system spec。
- `.codex/skills/`：Codex 可重用 workflow；Skill 定義「點做」，唔取代設計規格 source of truth。

## 文件索引

- Codex / Agent 工作規則、文件 routing、folder 用途：`AGENTS.md`
- 平行 task 的 Git／worktree 隔離、提交、整合及衝突安全流程：`docs/DEVELOPMENT_WORKFLOW.md`
- 全局玩法、探索 UX、UI、技能／DECK、成長及跨系統設計：`GAME_DESIGN.md`
- 戰棋戰鬥、同步移動、戰鬥行走動畫狀態、碰撞、面向基準正交攻擊路線、Projectile、AP、技能高低差、AI、高低差戰鬥規則：`docs/BATTLE_SYSTEM.md`
- 地圖、場景、入口、傳送、探索碰撞、Biome、遭遇及探索 → 戰場生成：`docs/MAP_SYSTEM.md`
- 寵物／Familiar、捕獲、育成、同行及戰鬥／生產接口：`docs/PET_SYSTEM.md`
- 怪物 canonical roster、同級攻防校準、1/2/3 隻 HP／EXP scaling、棲地、戰鬥技能、遷移及 Codex：`docs/MONSTER_SYSTEM.md`
- Guild 委託目錄、討伐／送信流程、技能書信封與保存契約：`docs/GUILD_COMMISSION_SYSTEM.md`
- 採集、生產、Recipe、生產精靈及品質：`docs/PRODUCTION_SYSTEM.md`
- Shared Everrealm bitmap-backed windows、popups、responsive layout 同 UI states：`docs/UI_SYSTEM.md`
- 裝備 schema、格鬥士 STRUGARDEN 衝攻／衝防轉換、canonical slots、ATK／DEF／Accuracy／Evasion／Weight／Move modifiers：`docs/EQUIPMENT_SYSTEM.md`
- 所有美術相關規格，包括 NPC、戰場、Standard Mobile Unit `4×7 / 28-frame` locomotion Sprite、Atlas、透明底、裁切、Anchor、repack、動畫及視覺驗收：`ART_PIPELINE.md`
- 現行 Everrealm 格鬥士技能樹、完整 65 招資料、explicit prerequisite graph、exact range／高低差／傷害／hit／path 規則：`docs/FIGHTER_SKILL_TREE.md`
- 幸福 Online / STRUGARDEN 原版資料、來源證據及研究 provenance：`docs/references/STRUGARDEN_FIGHTER_SKILL_TREE.md`


## Codex Skills

- `.codex/skills/everrealm-sprite-locomotion/SKILL.md`
  - Standard Mobile Unit locomotion 可重用 workflow。
  - 用於玩家／普通怪物／Familiar 嘅 `4×7 / 28-frame` Idle+Walk atlas 重建、normalize/repack、anchor/bleed 修正、探索／戰鬥動畫整合及 runtime visual QA。
  - 可喺 Codex prompt 明確用：`$everrealm-sprite-locomotion`
  - Skill 只定操作流程；正式規格仍以 `ART_PIPELINE.md`、`docs/BATTLE_SYSTEM.md` 等 routed docs 為準。

## 文件分工

- `GAME_DESIGN.md`：遊戲整體方向及跨系統玩家體驗。
- `docs/BATTLE_SYSTEM.md`：戰棋規則本身。
- `docs/MAP_SYSTEM.md`：世界／場景同戰鬥場地之間嘅關係。
- `docs/PET_SYSTEM.md`：Familiar 系統；普通 Familiar 嘅探索／戰鬥移動接入共用 locomotion contract。
- `docs/PRODUCTION_SYSTEM.md`：採集／生產系統。
- `docs/UI_SYSTEM.md`：共用 fantasy bitmap UI frame、主要視窗組合、dynamic sizing 同 responsive presentation。
- `docs/BGM_SYSTEM.md`：背景音樂資產、地圖分區 routing、loop／mute／single-instance contract。
- `ART_PIPELINE.md`：遊戲「應該點樣睇」以及所有 runtime 美術資產「技術上點製作、normalize、repack、切割、對位同驗收」；普通玩家／怪物／Familiar 嘅 28-frame Idle+Walk 標準亦以此文件為準。
- `AGENTS.md`：指引 Codex 按當前工作只讀必要文件，並規定測試及文件維護方式。

### 地圖架構 routing

- 修改 shared map behavior、constants、helpers、registry、transition linking → 先讀 `docs/MAP_SYSTEM.md`，再改 `map/`。
- 修改指定地圖 → 讀 `docs/MAP_SYSTEM.md` + 對應 `docs/maps/*.md`。
- 修改 exact runtime layout → 只改該地圖的 owning `maps/**/*.js`。
- 修改永久 semantic/layout rule → 同步更新對應 Markdown。
- `game.js` 只消費 registry／執行已解析 transition；`world.js`、`expansion-world.js` 只屬薄兼容 API。
- `docs/FIGHTER_SKILL_TREE.md`：現行 Everrealm Fighter source of truth；完整 runtime 欄位由 `data/skills/fighter.js` 載入。
- `docs/references/STRUGARDEN_FIGHTER_SKILL_TREE.md`：保存原版格鬥士技能樹、來源證據與研究 provenance；唔覆蓋現行 Everrealm 規格。

## 核心文件原則

同一條規則只應有一份 source of truth。

例如：

- 山地遇敵應該生成山地 battlefield → `docs/MAP_SYSTEM.md`
- 山地石頭會唔會擋火球 → `docs/BATTLE_SYSTEM.md`
- 連擊揀左前時點樣生成 `前 → 左` attack path → `docs/BATTLE_SYSTEM.md`
- Everrealm 格鬥士 exact range／高低差／技能書入手與傷害資料 → `docs/FIGHTER_SKILL_TREE.md`
- 原作來源證據 → `docs/references/STRUGARDEN_FIGHTER_SKILL_TREE.md`
- 山地石頭 sprite 點畫／點切 → `ART_PIPELINE.md`

普通 bug fix 唔需要新增規格文件，亦唔需要將修 bug 歷史寫入設計規格。

## 新增大型系統

日後例如加入：

- `docs/ALCHEMY_SYSTEM.md`
- `docs/WEATHER_SYSTEM.md`

建立新系統文件後，同步：

1. 喺 `AGENTS.md` 加 routing。
2. 喺本 README 文件索引加入一行。
3. 避免將完整規則複製入 `GAME_DESIGN.md`。
