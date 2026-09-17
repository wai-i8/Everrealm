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

目前 registry 由 `map/map-registry.js` 建立 `world`、`field`、`dungeon`、`mountain-south`、`guild`、`shop`、`clinic`、`general-store`、`inn`，再交給 `map/map-transitions.js` 完成互相連接。`world.js` 與 `expansion-world.js` 只保留舊 API 的薄兼容入口，真正的 runtime 定義不在其中。

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

五個主城服務 interior（冒險者公會、帝都醫療院、帝都旅館、帝都裝備坊、帝都道具店）先按房間用途，再按玩家動線 author：入口 → 主要服務點 → 對應功能區。櫃台／服務 NPC 必須形成可理解的工作組；牆邊優先放置書架、貨架、櫃與儲物，中央地面只保留有用途的候位、展示、治療或休憩家具。主要行走路線要保持清楚，不以無關 props 填滿空位；每張 interior 的功能區語意與 NPC 角色由對應 `docs/maps/*.md` 及 owning runtime map 保存。

### 2.2 Flattened scene navigation package

Hospital、Guild、Equipment Shop、Inn、Item／General Store 同 Main Town 使用同一套 flattened-scene contract。每張圖至少有一對同尺寸 `master`／`authoring` 圖：master 係唯一玩家可見環境，authoring 只係 development navigation／interaction source，永遠唔喺 browser render。室內仍使用 PNG pair；Main Town 使用供應嘅 JPG pair，兩者都必須保留原圖 pixel coordinate space。

| map | visible master | authoring navigation | generated runtime |
| --- | --- | --- | --- |
| `clinic` | `assets/hospital/hospital.png` | `assets/hospital/hospital_walkable.png` | `map/hospital-navigation.generated.js` |
| `shop` | `assets/weapon/weapon.png` | `assets/weapon/weapon_walkable.png` | `map/weapon-navigation.generated.js` |
| `inn` | `assets/inn/inn.png` | `assets/inn/inn_walkable.png` | `map/inn-navigation.generated.js` |
| `general-store` | `assets/item/item.png` | `assets/item/item_walkable.png` | `map/item-navigation.generated.js` |
| `guild` | `assets/guild/guild.png` | `assets/guild/guild_walkable.png` | `map/guild-navigation.generated.js` |
| `world` Main Town | `assets/main-town/maintown.jpg` | `assets/main-town/maintown_walkable.jpg` | `map/main-town-navigation.generated.js` |

Flattened 室內 pair 必須保持各自 master／authoring 圖完全相同嘅原生 pixel coordinate space；`1672 × 941` 係舊基準尺寸，但高解析度室內可以直接使用自己嘅 native dimensions（例如 Guild `3344 × 1882`、General Store `2508 × 2508`），唔可以 resize 返舊尺寸。Main Town pair 必須保持 `7680 × 4320`。室內 generator 以 exact opaque RGB 讀取 authoring source：白色 `[255,255,255]` 係 walkable allowlist、洋紅／紫色 `[255,0,255]` 係 NPC 或其他 semantic interaction region（region 本身唔可行走）、青色 `[0,255,255]` 係 exit region；其他像素全部唔係 authored movement data。Main Town JPG compiler 以 supplied authoring image 的近色分類：白色係 walkable、六個青色 component 係固定 transition、粉紅／紫色 `[255,0,255]` component 係 interaction region（region 本身唔可行走），其他像素 blocked。兩者都輸出 hash、connected-component bbox／centroid／feet anchor 同 RLE runtime mask；generated file 明確標示不可手改。

完整戶外場景（例如山地）亦使用同尺寸 master／walkable pair。山地類 source contract 為兩張同樣 `4096 × 4096` 嘅圖：可見 master 使用 JPEG；walkable 使用同尺寸 PNG，黑色係不可行區、白色係可行區，必要時再以少量語意顏色標示 interaction／exit。walkable PNG 係導航 source，唔係玩家可見圖；大面積黑色只係令 PNG 檔案容易壓縮、載入較快，唔代表 source pixel dimensions 被縮細。

Main Town runtime 保留 supplied `7680 × 4320` native visible artwork、gameplay world 同 navigation pixels，採用 1:1 world-to-source mapping；呢個係 Main Town 自己嘅 presentation contract，camera 只從 native world 以 viewport world size crop 圍繞玩家取景。其他採用 compact full-map exploration 嘅完整場景地圖唔套用 Main Town 呢個例外；佢哋要將整張 scene fit 入細型 gameplay world。無論採用邊種 contract，background、entity、feet pivot、collision 同 screen-to-world click conversion 都必須共用同一個 transform；far／mid／near 只係相機視角倍率，DPR 只影響 Canvas backing/output resolution。

### 2.3 Native map world and shared camera

Every supplied scene image keeps its own native master／authoring coordinate space. Native width and height remain the map's source `pixelWidth` and `pixelHeight`, and the paired navigation package keeps the same source coordinates. A 7680 × 4320 town can coexist with 1672 × 941, 2508 × 2508, or 4096 × 4096 scenes; source files are never resized or rewritten because of presentation. For compact full-map outdoor scenes, the visible master should be JPEG and the same-size walkable source should be a black／white PNG so the navigation file stays small and fast to load. Runtime gameplay world is selected by the map's presentation contract: Main Town remains native 1:1, while compact full-map scenes expose a smaller logical world that contains the complete scene. NPCs, portals, feet anchors, click targets and movement must all use the selected transform consistently.

For a compact full-map scene, one source pixel is not automatically one gameplay world unit. The runtime applies one uniform source-to-compact transform so the complete master artwork fits inside the compact gameplay bounds; it must not use a player-centred crop as the main exploration presentation. The paired walkable data is queried through the inverse transform or compiled into the same compact coordinate space, and must never be displayed as visible art. Master JPEG compression and walkable PNG compression affect transfer／decode cost only; the explicit compact transform, not file size, determines the smaller gameplay world and faster traversal. No non-uniform stretch, independent input scale, per-entity correction or per-frame coordinate patch is allowed.

Player, NPC and monster authored render dimensions, the base exploration movement speed (`330` world units per second), and the global Far/Mid/Near camera presets (`0.46176` / `0.592` / `0.72224`) remain global contracts. A compact map may map those values into its smaller logical world, but the same map-level transform must apply to background, entity, feet pivot, collision, interaction, movement and click conversion. Source resolution must not create a hidden travel-time multiplier, and a compact map must not be enlarged merely to cover the viewport. Native crop camera behaviour remains available only to maps whose presentation contract explicitly chooses it.

所有 flattened scene 共享 `feet_radius_px: 3` source contract。compact full-map scene 嘅 feet disk 必須經同一個 source-to-compact transform 完整落喺 compiled authored allowlist；室內係 white／cyan 並避開 magenta／紫色 interaction region，Main Town 係 white／cyan 並避開 pink／紫色 interaction region，compiler 只在 painted region 邊界做有限 JPEG seam normalization。越界、非 authored、缺失或 malformed generated data 一律 blocked。pathfinding、movement substeps、authored-hotspot click、exit arrival 同一個 resolver，唔可以回退到 tile、Canvas pixel readback、`fetch()` 或視覺圖 alpha 推導。Main Town click-to-move 使用 1px line-clear sampling 同四向 waypoints；compact map 亦必須喺其 logical world 使用對應嘅 authoritative line-clear，避免縮放後穿過 walkable mask 邊界。呢個 transform 係 map-level contract，唔係 per-entity 或逐 frame 特例。

門、出口同 NPC interaction 仍然存在於 semantic map data，但 runtime 不再畫 talk diamond、quest mark、door／portal marker、浮動入口 label 或 HUD talk prompt；玩家仍可點擊 authored hotspot／門口，或用正常互動鍵完成同一個 action。Transition metadata 只負責 hit region、path、target spawn 同 facing，唔負責再疊畫一層標記。 山地／主城亦唔再放置 runtime 道路指示牌；導航由地形、路徑同 semantic interaction 本身表達。

---

## 3. 現有主要世界區域

目前主要探索區域只有三個；冒險者公會、帝都裝備坊、帝都醫療院、帝都道具店及帝都旅館等室內場景屬主城附屬 interior，唔計成獨立大區域。

### 3.1 主城

用途：

- NPC
- 冒險者公會
- 帝都裝備坊
- 帝都醫療院
- 帝都道具店
- 帝都旅館
- 戰技面板台
- 任務交收
- 生產相關工作台／教學入口

主要特徵：

- 主城詳細 authored package、flattened art、mask、入口 trigger 同東側 passage 以 `docs/maps/MAIN_TOWN.md` 及其列出嘅 package files 為準；本節只保留 map-system 層級規則。
- 主城係服務型探索地圖，視覺上由 authored master art 表達城鎮、城牆、道路、建築、植被及海岸環境。
- 東側 `world-to-field` physical passage 連接山地野外西口。
- 五個服務建築使用 authored 實體門 trigger，分別連接對應室內 map。
- 主城步行路網由 walkable allowlist 決定；唔由 tile inversion、舊 block geometry 或 render-only scenery 推導。
- 一般情況唔產生普通野外 random encounter。
- 劇情／特殊戰鬥可以明確指定 `town` battle theme。

主城普通建築使用 `interactionMode: "door"` 嘅入口資料：玩家行到門檻／門口觸發實體入門互動，唔使用魔法圓陣。東側出口使用 `interactionMode: "passage"`，以城牆開口及出口 trigger 表達離城；魔法圓陣只保留畀真正超自然傳送或特殊入口。入口視覺已經屬於 flattened master art，runtime 不再額外繪製門口 marker、入口 label 或互動菱形。

主城目前有五個服務建築入口：`world-to-guild`、`world-to-shop`、`world-to-clinic`、`world-to-general-store`、`world-to-inn`。五個入口均進入對應嘅真實室內 map；室內設有櫃台／貨架／床／餐桌等家具、專屬核心 NPC 同對應服務，並由 `*-to-world` 實體出口返回主城。門口只保留 semantic physical-door contract，唔再畫 marker。

主城入口、東側 passage 同粉紅／紫色 deck interaction 由 `assets/main-town/maintown_walkable.jpg` authored；`assets/main-town/maintown.jpg` 只係顯示圖。`maps/main-town.js` 將 exact colour-component rectangle／anchor 接入共用 `map/map-transitions.js`。建築視覺係 flattened master art，walkable allowlist 係白色主路網加 authored cyan transition regions；粉紅／紫色 interaction region 只作 interaction target，唔係玩家 standable area。唔可以再由舊 bitmap `doorAnchor`、建築中心點或 visible art 推導主城導航。東側 `world-to-field` 保留清楚嘅 physical passage，唔使用大型 East Gate bitmap 或魔法圓陣。

主城 navigation package 由 JPG authoring input 經 `tools/generate-main-town-navigation.js`／`tools/compile-main-town-navigation.py` 編譯成 `map/main-town-navigation.generated.js`。零 build／`file://` browser runtime 直接同步使用 generated data，唔會以 Canvas、OffscreenCanvas、`fetch()` 或 XHR 讀取 JPG／JSON。`map/main-town-navigation.js` 擁有唯一主城 walkability／region resolver：白色係完整可行走來源，六個 cyan region 係固定 transition，pink region 係 deck configuration；任何未明確 authored 嘅位置都 blocked。runtime data 缺失或初始化失敗時必須 fail closed，唔得 fallback 到舊 grass／tile／house collision。

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
| `mountain-south` | `maps/mountain-south.js` |
| `guild` | `maps/interiors/guild.js` |
| `shop` | `maps/interiors/equipment-shop.js` |
| `clinic` | `maps/interiors/clinic.js` |
| `general-store` | `maps/interiors/general-store.js` |
| `inn` | `maps/interiors/inn.js` |

共用 `TILE`、`TILES`、`MAP_IDS` 只在 `map/map-constants.js` 定義；`point()`、tile generation、deterministic `mulberry32()`、`makeExit()`、collection normalization、`tileAt()` 等只在 `map/map-helpers.js` 共用。怪物固定資料由 `data/monsters.js` 擁有；blueprint hydration／legacy resolver 屬獨立的 `map/monster-blueprints.js`，不再由某張 map 擁有。

新增地圖的流程是：新增自己的 `maps/**/*.js` factory → 在 `map/map-registry.js` 註冊 → 在 `map/map-transitions.js` 定義 connection/linking → 新增 `docs/maps/*.md` → 加入 registry/transition tests。不得把新 map definition 加回 monolithic compatibility wrapper。

### 4.1 Transition linking

`map/map-transitions.js` 擁有 connection authoring 與 link resolution。它會：

- 讀取主城 authored navigation package 的 building trigger、threshold、approach anchor。
- 將 exact authored doorway contract 解析成 physical `interactionMode: "door"` transition；舊 bitmap sprite anchor 只保留畀 legacy map consumers。
- 建立主城五個服務入口與室內 `*-to-world` 回程的對應。
- 將 `field ↔ world`、`field ↔ dungeon`、`dungeon ↔ mountain-south` 保持為 physical passage。
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
  trigger,         // optional exact activation rect；可與 threshold 相同
  threshold,       // 小型 rect：x、y、w、h、shape: "rect"
  exteriorSpawn,   // 離開室內後的 owning-map 安全出生點
  entryFacing,
  returnFacing,
  marker           // 共用 bitmap 門口標記
}
```

`threshold` 可以由 legacy tile metadata 推導，亦可以直接使用 authored world-pixel rect；主城 navigation package 採用後者，並以同一個 exact rect 保存 `trigger`。角色的 feet/world pivot 進入矩形後才可以觸發 physical door。鄰近距離、建築圖片外框、label 或 transparent padding 都不會觸發普通門。室內出口沿用同一 contract；它們仍然是 physical door，絕不使用 magic-circle VFX。

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

NPC、門、工作台、委託板、水池、面板配置及其他可點擊物件，都使用同一套 authored interaction contract。紫色／洋紅色 `[255,0,255]` component 係唯一 semantic interaction region；Main Town 現有 JPG compiler 稱為 pink，但係同一個 RGB 語意。region 只係 interaction target，唔可以用大半徑代替，亦唔可以因為 NPC／物件隔住黑色 blocked 位就擴大 clickable area。region 本身預設唔係玩家 standable area；玩家亦唔需要行入 region。

每個 authored interaction entity 必須提供 `navigationRegion`，如一張 source 有多個同類 component，另提供對應 `navigationRegionIndex`。該 map resolver 必須提供 `nearestPointInRegion()`／`distanceToRegion()` 同 exact `interactionAtWorldPoint()`；新 NPC 或物件唔可以只加 `interactionRadius`／`interactionHitRadius` 去補救位置問題。

```js
{
  targetId,
  navigationRegion,
  navigationRegionIndex,
  interactionPoint: "nearest-reachable-white-position"
}
```

玩家點擊後：

1. 只由 exact authored purple／magenta region（或現有 Main Town pink 同義 region）識別 target；唔使用額外 clickable padding。
2. Resolver 先搵 region 最近點，再由共用 exploration pathfinding 搵最近嘅白色可行走位置；黑色／非 authored 位唔會被穿過。
3. 玩家行到最近可達白色位置後，runtime 以 pending target id 恢復正確 NPC／物件並立即觸發 interaction，即使玩家唔能夠直線行入 region。
4. 如果中途場景切換、玩家取消或完全冇可達白色位置，就中止 pending interaction。

呢套 nearest-reachable interaction 係全 game 共用規則，唔應該按 NPC、服務室、物件或 source resolution 寫特別半徑。Exit 仍然保留 cyan transition region 同 physical-door／passage contract；紫色／洋紅色只用於 NPC 及一般 semantic interaction object。

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
  artId: "mountain-boulder-a",
  obstacleHeight: "low"
}
```

`terrainType` 交俾 battle rules。

`artId` 交俾 renderer／art registry。

`obstacleHeight` 必須由地圖資料明確標成 `high` 或 `low`：高障礙係完整攻擊線 blocker；低障礙只保留 movement collision，唔攔截地面線性攻擊。呢個分類同 `heightMap` 嘅地面 elevation 分開，唔可以由圖片尺寸或 filename 推斷。

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

冒險者公會、帝都裝備坊、帝都醫療院、帝都道具店及帝都旅館等 interior：

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
