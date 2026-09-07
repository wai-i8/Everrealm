# 地圖與場景系統 · MAP_SYSTEM

## 1. 文件定位

本文件係《永恆國度 · Everrealm》地圖、場景、入口、傳送、探索碰撞、遭遇環境，以及「探索地圖 → 戰鬥場景」映射嘅詳細 source of truth。

本文件負責回答：

- 世界目前有邊啲主要探索區域？
- 地圖之間點樣連接？
- 入口、出口、傳送點、NPC／物件互動點點樣定義？
- 探索碰撞同可行走區域點樣保存？
- 玩家喺邊個 biome／位置遇敵？
- 遇敵後應該產生咩類型嘅戰鬥地台？
- 戰鬥地台應該繼承附近邊啲環境特徵？
- 戰鬥場景可以出現邊類地面、障礙物及高度資料？

責任分工：

- `docs/MAP_SYSTEM.md`：決定 **戰場係咩地方、由咩環境產生、放咩 terrain／obstacle**。
- `docs/BATTLE_SYSTEM.md`：決定 **terrain／obstacle／height 對移動、LOS、攻擊路線、projectile 有咩規則影響**。
- `ART_PIPELINE.md`：決定 **地面 tile、背景、石、樹、水、戰場 props 實際點畫、點切、點 render 同點驗收**。
- `GAME_DESIGN.md`：只保留世界方向同玩家可感知嘅高層概要。

如果內容跨越以上幾個系統，唔好將同一條規則複製去幾份文件；由真正擁有該責任嘅文件定義，其他文件只引用。

## 1.1 Runtime ownership and source-of-truth routing

地圖採用零 build、瀏覽器原生 JavaScript。責任分層如下：

| 層 | 責任 |
| --- | --- |
| `docs/MAP_SYSTEM.md` | 共用地圖系統規則、入口／碰撞／Biome／遭遇語意 |
| `docs/maps/*.md` | 單張地圖的語意與設計真相，不記錄逐格 tile database |
| `maps/**/*.js` | 單張地圖的精確 runtime 尺寸、tile、物件、NPC、spawn、layout |
| `map/*` | 共用常數、map-building helpers、registry、door anchor 與 transition linking |
| `game.js` | 地圖 registry 的 gameplay consumer；只執行已解析的 transition，不 author 或 patch 地圖 |

目前 registry 由 `map/map-registry.js` 建立 `world`、`field`、`dungeon`、`guild`、`shop`、`clinic`、`general-store`、`inn`，再交給 `map/map-transitions.js` 完成互相連接。`world.js` 與 `expansion-world.js` 只保留舊 API 的薄兼容入口，真正的 runtime 定義不在其中。

修改 shared map behavior 時，先讀本文件；修改特定地圖時，讀本文件加上對應 `docs/maps/*.md`；修改 exact runtime layout 時，只編輯該地圖的 owning JS。永久語意／layout rule 改動要同步更新對應 Markdown。

---

## 2. 核心原則

探索地圖同戰鬥地圖唔係兩個互不相關嘅世界。

核心規則：

> **玩家喺咩環境遇敵，戰鬥場景就應該保留嗰個環境嘅身份。**

例如：

- 山地野外遇敵 → 山地／泥土／草地戰場，石、樹、灌木等合理障礙。
- 沉燈坑道遇敵 → 洞穴岩地，石柱、碎岩、裂地、礦石等。
- 將來海邊遇敵 → 沙地／濕沙／淺水，礁石、水灘、漂流木等。
- 將來森林遇敵 → 草地／泥地，樹、樹根、灌木等。

禁止：

> 無論玩家喺邊度遇敵，都傳送去同一個 generic 灰色棋盤，再隨機擺幾個完全無關嘅障礙物。

戰鬥棋盤可以為可讀性作抽象化，但必須令人一眼感受到「我仍然喺頭先嗰個地方打緊」。

### 2.1 服務室內的功能分區與動線

五個主城服務 interior（公會、療癒所、旅店、裝備店、雜貨舖）先按房間用途，再按玩家動線 author：入口 → 主要服務點 → 對應功能區。櫃台／服務 NPC 必須形成可理解的工作組；牆邊優先放置書架、貨架、櫃與儲物，中央地面只保留有用途的候位、展示、治療或休憩家具。主要行走路線要保持清楚，不以無關 props 填滿空位；每張 interior 的功能區語意與 NPC 角色由對應 `docs/maps/*.md` 及 owning runtime map 保存。

---

## 3. 現有主要世界區域

目前主要探索區域只有三個；公會、裝備店、療癒所、雜貨舖及旅店等室內場景屬主城附屬 interior，唔計成獨立大區域。

### 3.1 主城

用途：

- NPC
- 公會
- 裝備／商店
- 療癒所
- 雜貨舖
- 旅店
- 戰技面板台
- 任務交收
- 生產相關工作台／教學入口

主要特徵：

- 主城詳細 blueprint、block、道路、城牆、東門、建築尺寸及門口 anchor 以 `docs/maps/MAIN_TOWN.md` 為 canonical；本節只保留 map-system 層級規則。
- 城牆包圍。
- 東門連接山地野外西口。
- 城內以石路、建築、街道、少量裝飾物為主。
- 城內採用固定嘅六個 block 配置：北列為拾燈公會、霧草療癒所及霧燈旅店；南列為銀火裝備店、中央石砌廣場及霧穀雜貨舖。
- 五個服務建築使用同一套標準建築模組與實體門互動；唔因為公會係地標而任意放大，亦唔因為商店係服務點而任意縮細。
- 城內由一條中央 Main Street 組成連續步行路網；樹木集中於城牆邊緣作框景，唔另設平行服務街。完整幾何以 `docs/maps/MAIN_TOWN.md` 為準。
- 一般情況唔產生普通野外 random encounter。
- 劇情／特殊戰鬥可以明確指定 `town` battle theme。

主城普通建築使用 `interactionMode: "door"` 嘅入口資料：玩家行到門檻／門口觸發實體入門互動，唔使用魔法圓陣。東側出口使用 `interactionMode: "passage"`，以城牆開口及出口 trigger 表達離城；魔法圓陣只保留畀真正超自然傳送或特殊入口。

主城目前有五個服務建築入口：`world-to-guild`、`world-to-shop`、`world-to-clinic`、`world-to-general-store`、`world-to-inn`。五個入口均進入對應嘅真實室內 map；室內設有櫃台／貨架／床／餐桌等家具、專屬 NPC 同對應服務，並由 `*-to-world` 實體出口返回主城。門口使用 `marker-atlas-v1` 左下角（`interact`）實體互動 marker，唔使用魔法傳送圓陣。

建築入口座標由 `maps/main-town.js` 保存 bitmap `doorAnchor`，再由 `map/map-transitions.js` 的 `resolveHouseDoorAnchor()` 統一推導成 world-space doorway。建築圖片係視覺層，house collision 係物理層；`doorDepth` 只負責讓角色半徑能通過門洞，唔會改變室內 map 或 spawn 目標。東側則保留清楚嘅 passage 開口及 `world-to-field` 出口，唔再依賴大型 East Gate bitmap；城牆其餘邊界保持實體。

### 3.2 山地野外

目前主要戶外探索地圖。

主要特徵：

- 西面接主城。
- 主要道路由西向東，再通往北面坑道。
- 山地／泥土／草地／岩石環境。
- 樹林可以構成真正不可通行邊界；主路下緣保留較闊 canopy visual buffer，避免樹冠遮住玩家。
- 普通怪物可以喺合理區域活動及觸發遭遇。
- 戰鬥場景預設使用 `mountain` biome。

### 3.3 沉燈坑道

主要洞穴／地下探索地圖。

主要特徵：

- 岩地。
- 石柱、瓦礫、裂地、礦石、洞穴物件。
- 可以包含較狹窄通道。
- 可放置較高階怪物、採掘資源及 Boss／任務內容。
- 戰鬥場景預設使用 `cave` biome。

---

## 4. Map Registry

所有探索場景使用 data-driven registry。

最低結構：

```js
{
  id,
  name,
  type,
  biome,

  width,
  height,

  playerSpawn,

  collision,
  entrances,
  interactions,
  encounterZones,

  battleTheme,

  art
}
```

其中：

```text
type:
world
interior
dungeon
special
```

禁止將：

- map ID
- 出入口座標
- teleport 目的地
- encounter theme
- collision 特例

散落喺 UI event handler。

實作上，`map/map-registry.js` 係唯一負責構造／暴露 map collection 的入口。每張 map 只由一個 owning file 建立：

| map id | owning JS |
| --- | --- |
| `world` | `maps/main-town.js` |
| `field` | `maps/mountain-field.js` |
| `dungeon` | `maps/mine.js` |
| `guild` | `maps/interiors/guild.js` |
| `shop` | `maps/interiors/equipment-shop.js` |
| `clinic` | `maps/interiors/clinic.js` |
| `general-store` | `maps/interiors/general-store.js` |
| `inn` | `maps/interiors/inn.js` |

共用 `TILE`、`TILES`、`MAP_IDS` 只在 `map/map-constants.js` 定義；`point()`、tile generation、deterministic `mulberry32()`、`makeExit()`、collection normalization、`tileAt()` 等只在 `map/map-helpers.js` 共用。怪物 blueprint／hydration 屬獨立的 `map/monster-blueprints.js`，不再由某張 map 擁有。

新增地圖的流程是：新增自己的 `maps/**/*.js` factory → 在 `map/map-registry.js` 註冊 → 在 `map/map-transitions.js` 定義 connection/linking → 新增 `docs/maps/*.md` → 加入 registry/transition tests。不得把新 map definition 加回 monolithic compatibility wrapper。

### 4.1 Transition linking

`map/map-transitions.js` 擁有 connection authoring 與 link resolution。它會：

- 讀取主城 house 的 `doorAnchor`、`spriteWidth`、`spriteHeight`、`spriteAnchorY`。
- 將 semantic anchor 解析成實際 doorway，建立 physical `interactionMode: "door"` transition。
- 建立主城五個服務入口與室內 `*-to-world` 回程的對應。
- 將 `field ↔ world`、`field ↔ dungeon` 保持為 physical gate/cave passage。
- 以 `targetSpawn` 優先解析 arrival；`targetPosition` 只作兼容 fallback。
- 建築門口 transition 另保存可見 doorway anchor、精準 threshold、approach point、`returnSpawn`、`returnPosition` 與 `returnFacing`；城外返回位置由 owning map 明確提供，不能用通用 `door.y + 34` 類像素偏移推算。

`portal` 仍是舊 runtime/render API 名稱，但不代表魔法效果。每個 transition 必須使用明確的 `transitionType`：

- `physical-door`：建築門口與室內門。
- `physical-gate`：城門或具有門閘語意的出入口。
- `physical-passage`：洞口、坑道或普通通道。
- `magic-teleport`：真正的超自然瞬間傳送。

Renderer 先讀 `transitionType`，再決定實體門／通道或魔法 marker；舊 `kind: "portal"` 不會自行觸發 magic VFX。真正魔法傳送若日後加入，必須明確使用 `magic-teleport`。

`game.js` 只讀 registry，透過 `MapTransitions.resolveArrival()` 取得合法 destination 與可選 arrival facing，再執行 `transitionMap()`；它不再找 town houses、不再 upsert building portal、不再改寫 interior spawn。

---

## 5. Scene / Biome 分離

`scene` 同 `biome` 唔係同一樣嘢。

例如：

```text
scene = mountain-west
biome = mountain
```

將來可能：

```text
scene = north-cliff
biome = mountain

scene = coastal-path
biome = coast
```

幾張不同探索 map 可以共用同一 biome，但有不同：

- layout
- NPC
- encounter
- obstacle density
- story state

---

## 6. 初始 Biome Registry

第一階段至少：

```text
town
mountain
cave
```

將來可加入：

```text
coast
forest
snow
swamp
ruins
volcanic
```

Biome data 最低：

```js
{
  id,

  explorationTheme,
  battleTheme,

  battleGroundTypes,
  battleObstaclePool,

  defaultHeightProfile
}
```

---

## 7. 入口與傳送

每個入口／出口都係獨立 data。探索保持連續平滑移動；門口幾何則使用 tile-authored、可解析成 world-space 的精準語意。

```js
{
  id,
  sourceMapId,

  trigger,
  targetMapId,
  targetSpawn,

  interactionMode
}
```

`trigger` 代表世界座標／collision trigger，而唔係圖片外框。

普通實體門使用共用 entrance contract：

```js
{
  doorAnchor,      // 可見建築門口的 world-space anchor
  approachPoint,   // 點擊入口後先行到的安全接近點
  threshold,       // 小型 rect：x、y、w、h、shape: "rect"
  exteriorSpawn,   // 離開室內後的 owning-map 安全出生點
  entryFacing,
  returnFacing,
  marker           // 共用 bitmap 門口標記
}
```

`threshold` 以門錨為中心、以 tile 寬深 authored；角色的 feet/world pivot 進入矩形後才可以觸發 physical door。鄰近距離、建築圖片外框、label 或 transparent padding 都不會觸發普通門。室內出口沿用同一 contract；它們仍然是 physical door，絕不使用 magic-circle VFX。

### 7.1 核心規則

- 建築圖片變大／變細，不可改變入口真正世界座標。
- door sprite／門框 alpha 改動，不可令 teleport 漂移。
- 玩家明確點擊入口 marker／門口時，可以自動尋路去 `approachPoint`，再自然走入 threshold；點擊附近普通地面只會建立地面路徑。
- 單純經過門旁邊不會入屋；手動移動穿過精準 threshold 才會觸發。
- 目的地 spawn 必須係合法可行走位置。
- `exteriorSpawn` 必須在可見建築 footprint 之外，並配合 authored `returnFacing`，確保回程角色立即可見。
- 同一入口不可因 renderer scale 改變而出現「畫面門口一個位、實際 trigger 另一個位」。

美術 anchor 詳細規格由 `ART_PIPELINE.md` 負責。

---

## 8. Exploration Collision

探索 collision 係地圖邏輯資料，唔係由 PNG alpha 自動決定。

每個障礙／地形可以有：

```js
{
  collisionId,
  shape,
  x,
  y,
  width,
  height
}
```

或者 tile-based collision。

核心：

- 樹、牆、建築、大岩石可以阻擋。
- 視覺外伸部分唔一定等於 collision。
- 角色 sprite 白邊／透明 padding 改動唔可以改 collision。
- collision fix 唔可以用「將玩家 teleport 過障礙」掩蓋。

---

## 9. Interaction Point

NPC、門、工作台、委託板、寶箱等都使用 interaction point／range。

```js
{
  targetId,
  interactionPoint,
  interactionRadius
}
```

玩家點擊後：

1. 檢查已在互動距離內？
2. 否 → 使用探索 pathfinding 行去最近合法 interaction position。
3. 到達後先觸發。
4. 如果中途場景切換／玩家取消 → 中止。

Production 工作台嘅「可以製作」條件由 `docs/PRODUCTION_SYSTEM.md` 定義；本文件只負責佢喺地圖邊度、點樣接近及互動。

---

## 10. Encounter Zone

遇敵唔應只保存「呢張 map 可以打邊隻怪」。

每個 encounter zone 最低：

```js
{
  id,
  mapId,

  bounds,
  biome,

  encounterTable,

  battleContextProfile
}
```

可以令同一張大 map 不同位置有不同：

- 怪物
- terrain flavour
- obstacle pool
- 高低差
- 戰場背景

---

## 11. Exploration Encounter Position

當探索怪物同玩家觸發戰鬥時，battle context 必須記錄：

```js
{
  sourceMapId,
  encounterWorldX,
  encounterWorldY,
  biome,
  nearbyEnvironment,
  seed
}
```

`nearbyEnvironment` 可以包含語意資料，例如：

```js
{
  nearTrees: true,
  nearRocks: true,
  nearWater: false,
  localGround: "dirt"
}
```

唔需要直接將探索地圖逐 pixel 搬入戰棋。

目的係保留環境連續性。

---

## 12. Exploration → Battlefield

戰鬥場景生成流程：

```text
探索遭遇位置
↓
讀取 source map + biome
↓
讀取 encounter zone
↓
分析附近環境語意
↓
建立 BattleContext
↓
選擇 ground theme
↓
建立 terrain / obstacle layout
↓
交俾 BATTLE_SYSTEM 進行戰鬥規則解析
```

Battle context 建議：

```js
{
  biome,
  theme,

  groundSet,
  obstacleSet,

  terrainCells,
  heightMap,

  backgroundId,

  seed
}
```

---

## 13. Battlefield 唔係純 Random

戰場可以有 variation，但唔可以完全隨機到同探索位置無關。

例如山地：

### 喺樹林邊遇敵

提高：

```text
tree
bush
root
```

出現權重。

### 喺岩石附近遇敵

提高：

```text
rock
boulder
```

出現權重。

### 喺道路中央遇敵

降低大型 blocker，保留較開放戰場。

### 將來近河／海邊遇敵

提高：

```text
shallow-water
rock
wet-ground
driftwood
```

---

## 14. Deterministic Battlefield Seed

同一場遭遇嘅 battle layout 應可重現。

Seed 可以由：

```text
sourceMapId
+ encounter zone
+ encounter position
+ encounter instance id
```

產生。

目的：

- automated test
- bug reproduction
- save/reload
- screenshot comparison

禁止使用無法重現嘅完全散亂 random layout。

---

## 15. Battlefield Ground

`MAP_SYSTEM` 決定用咩 ground semantic type。

例如：

### Mountain

```text
dirt
grass
rock-ground
```

### Cave

```text
cave-rock
cracked-rock
dark-stone
```

### Coast

```text
sand
wet-sand
shallow-water
```

實際 PNG、tile atlas、材質風格由 `ART_PIPELINE.md` 定義。

---

## 16. Battlefield Obstacle Pool

Biome 決定可以出現邊啲 obstacle。

例如：

```js
mountain: [
  "rock",
  "boulder",
  "tree",
  "bush"
]

cave: [
  "rock",
  "stone-pillar",
  "rubble",
  "crack",
  "ore"
]

coast: [
  "reef-rock",
  "shallow-water",
  "driftwood"
]
```

但：

> `MAP_SYSTEM` 只負責「可以出現／實際擺咗咩」。

以下由 `docs/BATTLE_SYSTEM.md` 決定：

- 可唔可以行。
- 擋唔擋 Line of Sight。
- 擋唔擋 Linear projectile。
- Arc projectile 可唔可以越過。
- height 幾多。
- 有冇特殊戰鬥效果。

---

## 17. Terrain Semantic ID

Battlefield 唔應該直接用圖片 filename 當戰鬥規則。

錯誤：

```text
if image === "rock-v3.png" then block
```

正確：

```js
{
  terrainType: "boulder",
  artId: "mountain-boulder-a"
}
```

`terrainType` 交俾 battle rules。

`artId` 交俾 renderer／art registry。

咁換圖唔會改 gameplay。

---

## 18. Height Map

地圖系統由一開始預留：

```js
heightMap
```

目前所有既有戰場可以：

```text
height = 0
```

所以第一階段完全唔改現有 battle balance。

將來 exploration map 出現：

- 高台
- 山坡
- 懸崖
- 低地
- 海岸高低落差

BattleContext 先可以將高度語意帶入戰棋。

實際：

- movement elevation cost
- LOS
- Linear attack
- Arc trajectory
- damage modifier

由 `docs/BATTLE_SYSTEM.md` 定義。

---

## 19. Water

水唔應該永遠只係裝飾。

Map data 可以區分：

```text
deep-water
shallow-water
wet-ground
```

例如將來海邊：

- `deep-water`：可能完全不可站立。
- `shallow-water`：可以成為戰棋格。
- `wet-ground`：純視覺或者將來有 gameplay effect。

第一版未設計水地形戰鬥數值前：

> 唔好自行加入減速、雷電加成等新規則。

先只建立 semantic terrain type。

---

## 20. Battlefield Layout Safety

戰鬥場景生成必須保證：

- 玩家出生格合法。
- 所有敵人出生格合法。
- Familiar 出生時有合法位置。
- 單位唔重疊。
- 不可生成完全封死任何一方嘅 layout。
- 至少存在合理可交戰路線。
- blocker 唔好直接覆蓋 spawn。
- Boss／特殊戰可以使用固定 handcrafted layout，而唔一定 procedural。

---

## 21. Fixed vs Generated Battlefield

支援兩種：

### Generated

普通野外遭遇：

```text
biome + local context + seed
```

生成。

### Fixed

劇情／Boss／教學：

```js
{
  battleLayoutId: "..."
}
```

指定固定地圖。

固定 battlefield 仍然使用同一套 terrain semantic、height、battle resolver。

禁止為 Boss battle 寫另一套碰撞系統。

---

## 22. Battlefield Visual Identity

正式戰場唔應該只係純 Canvas 色塊棋盤。

戰場視覺由以下層組成：

```text
背景／遠景
↓
地面 bitmap tiles
↓
地面 variation / decal
↓
障礙物 bitmap props
↓
淡色 grid overlay
↓
角色／怪物／Familiar
↓
路線、選取、黃格／紅格、技能特效
↓
HUD
```

Canvas 可以繼續做 renderer。

但：

> **Canvas 係畫布／engine；正式場景美術要以 bitmap assets 為主。**

純矩形、純色石頭、debug icon 只可以係 fallback／debug，唔係正式戰場畫風。

完整美術技術規格見 `ART_PIPELINE.md`。

---

## 23. Grid Overlay

戰棋格必須保留清晰可讀，但唔好令正式戰場似 debug spreadsheet。

原則：

- 地面素材本身唔燒死粗格線。
- 正常狀態 grid 較淡。
- 移動／攻擊選擇時先提高相關格可讀性。
- Grid 位置必須精確對齊 battle cell。
- 更換背景／ground tile 唔可以令 grid 尺寸改變。
- Gameplay cell size 唔由圖片尺寸決定。

---

## 24. Current Battlefield Themes

第一階段至少做：

### `mountain`

視覺：

- 啡／綠山地。
- 泥地、草地、碎石地。
- 石、樹、灌木。

### `cave`

視覺：

- 深色岩地。
- 裂紋、石地。
- 石柱、瓦礫、礦石、岩石。

### `town`

只供劇情／特殊戰：

- 石路／街道。
- 木箱、桶、街道物件等合理 props。

唔需要為主城加入普通 random encounter。

---

## 25. Future Battlefield Themes

### Coast

- sand
- wet-sand
- shallow-water
- reef-rock
- driftwood

### Forest

- grass
- dirt
- tree
- root
- bush

### Snow

- snow
- ice
- rock
- snow-bank

加入新 biome 時：

1. `docs/MAP_SYSTEM.md` 增加 biome / battle context。
2. `ART_PIPELINE.md` 增加需要嘅正式素材規格。
3. `docs/BATTLE_SYSTEM.md` **只喺新 terrain 真係有新 gameplay behaviour 時**先需要更新。

如果只係換外觀，唔應該改 battle rules。

---

## 26. Interior Maps

公會、裝備店、療癒所、雜貨舖及旅店等 interior：

- 使用同一 map registry。
- 有自己 collision／interaction／exit。
- 預設唔產生普通 encounter。
- 如有劇情戰鬥，可指定固定 `battleLayoutId`／theme。
- 室內 props 必須合理，唔好將戶外樹、街燈、泥土底座亂塞入室內。

---

## 27. Minimap

Minimap 係探索地圖嘅縮略視圖。

- 玩家保持中心／清晰標記。
- 地形、樹、建築、燈、石、寶箱等應源自真正場景語意／美術縮繪。
- 唔用一堆純幾何方格代替正式場景。
- Minimap 唔係 gameplay collision source。
- 詳細框架／asset 規格由 `ART_PIPELINE.md` 負責。

---

## 28. 與 Production 系統

`docs/PRODUCTION_SYSTEM.md` 決定：

- 有咩資源點。
- 需要咩工具。
- 採集 Lv。
- drop table。
- 工作台類型。

`docs/MAP_SYSTEM.md` 決定：

- 資源點擺喺邊張 map／邊個位置。
- 玩家點樣行近。
- interaction point。
- 工作台喺邊度。
- 該位置係咪合法。

---

## 29. 與 Familiar 系統

`docs/PET_SYSTEM.md` 決定：

- Active Familiar 跟隨行為嘅寵物規則。
- Familiar collection／battle participation。

`docs/MAP_SYSTEM.md` 提供：

- scene transition。
- exploration walkable context。
- Familiar 轉圖時嘅合法跟隨／spawn context。

Familiar 探索 visual anchor 仍由 `ART_PIPELINE.md` 負責。

---

## 30. Save / Scene State

最低應保存：

```js
{
  currentMapId,
  playerWorldPosition,
  playerFacing
}
```

需要持久化嘅 map state，例如：

- 已開寶箱
- 已解鎖入口
- 一次性 obstacle
- quest scene state

使用既有 save／quest data model。

普通 procedural battlefield 唔需要永久保存全部 tile，除非玩家可以喺戰鬥中 save；如需要重現，保存 seed / BattleContext 已足夠。

---

## 31. Automated Tests

至少測試：

### Map transition

- 主城 → 山地。
- 山地 → 主城。
- 山地 → 坑道。
- 坑道 → 山地。
- target spawn 合法。
- entrance image resize 不改 teleport trigger。

### Exploration collision

- 樹／牆／建築 blocker。
- 最近可達 interaction point。
- 不可達點 fallback。
- collision 唔受 sprite transparent padding 影響。

### Encounter context

- mountain encounter → mountain battle theme。
- cave encounter → cave battle theme。
- town 普通區域唔 random encounter。
- 同 seed 可重現同 layout。
- 不同 local environment 可以改 obstacle weighting。

### Battlefield generation

- spawn 唔同 blocker 重疊。
- 玩家／敵人唔重疊。
- 存在合法交戰路線。
- generated terrain semantic ID 合法。
- fixed layout 可以跳過 generator，但仍輸出同一 BattleContext schema。

---

## 32. Runtime / Screenshot QA

新增或修改 map／battlefield theme 後必須實際 run game。

至少驗證：

### Exploration

- 地圖入口睇落同實際 trigger 對位。
- NPC／建築／工作台 interaction 正常。
- 玩家唔會因圖片透明 padding 卡住。

### Battle continuity

山地實際遇敵：

- 戰場一眼睇到係山地。
- 地面唔再只係純灰色 Canvas 格。
- 石／樹等 blocker 係正式 bitmap prop。
- 障礙物同 grid 對位。
- blocker 視覺位置同 gameplay cell 一致。

坑道實際遇敵：

- 明顯係洞穴／岩地。
- props 唔混入無關嘅戶外街燈／樹。

### Grid

- 正常狀態唔過份搶眼。
- 選路／攻擊時仍清楚。
- grid 唔因 bitmap 尺寸偏移。

如果 automated tests pass，但實際睇落仍然似 debug prototype：

> 唔可以當正式 battlefield art 完成。

---

## 33. 第一階段完成定義

第一階段 Map System 至少完成：

1. 主城、山地、坑道正式登錄 map registry。
2. 入口／出口／teleport data-driven。
3. collision 同圖片外框分離。
4. encounter zone。
5. BattleContext。
6. biome → battle theme。
7. mountain battle theme。
8. cave battle theme。
9. town special battle theme interface。
10. local environment → obstacle weighting。
11. deterministic battlefield seed。
12. semantic terrain／obstacle ID。
13. heightMap interface，現有 map 預設 `0`。
14. generated + fixed battlefield。
15. bitmap battlefield rendering interface。
16. automated tests。
17. runtime screenshot QA。

完成後，再逐步新增 coast／forest／snow 等 biome。

最重要原則：

> **探索地圖決定你身處嘅世界；戰鬥棋盤係嗰個世界嘅戰術化版本，而唔係另一個無關嘅 debug room。**

