# RPG 美術資產管線

## 用途分離

- 地圖 NPC：`assets/npc-map-chibi-v4.png`，4 × 3。只用成年 Q 版全身像；阿澄係紫／白毛領星術師原裝，唔再縮細角色立繪。
- 對話 NPC：`assets/npc-dialogue-portraits-v4.png`，4 × 3。每格係獨立頭肩大頭照，採用透明 RGB 清理版，唔再由全身像硬裁。
- 場景物件：`assets/environment-atlas-v5.png`，1536 × 1920、4 × 5。由 `tools/repack-environment-atlas.ps1` 重排；每件物件的底座、根部及接地陰影都完整收納於單格，修正 v4 跨格及上下裁切。
- 地面：`assets/terrain-atlas-v1.png`，4 × 3。草地、泥路、河水、石路、公會／商店地板與地毯、坑道地面、河岸及木橋全部使用 bitmap tile。
- 室內／坑道物件：`assets/interior-props-v2.png`，4 × 3。室內委託板、長桌、屏風、人偶、旗幟、壁爐、壁燈、符文燈、菇叢、瓦礫、裂地及石柱。
- 霧獸舊版四方向靜態圖：`assets/monster-facing-core-v1.png` 及 `assets/monster-facing-depths-v1.png`。呢兩張只屬 **locomotion standard 遷移前嘅 legacy runtime/fallback**；普通細至中型怪物完成新標準圖後，探索及戰鬥移動都應改用下文 `Standard Mobile Unit Locomotion Contract`，唔再以靜態 facing sprite 水平滑行。
- 格鬥士舊版：`assets/fighter-atlas-v2.png` 及 `assets/fighter-walk-atlas-v4.png` 只保留作現有兼容／造型參考。新正式 locomotion 唔再逐格 patch 舊 `4 × 4` walk atlas，而係按下文統一 `4 rows × 7 columns = 28 frames` 標準重新生成、normalize、repack，再由探索及戰鬥共用。
- 小地圖外框：`assets/minimap-frame-v1.png`。真正透明圓形華麗框，疊在小地圖 Canvas 上；內容必須裁進內圓，不可再顯示方形底板。地形、樹、建築、石、寶箱、神龕及室內家具必須縮繪自現有 terrain／environment／interior atlas，不可用幾何方格、圓點或矩形代替場景美術。
- 地圖標記：`assets/marker-atlas-v1.png`，2 × 2。任務問號、回報感嘆號、互動菱形及 legacy 傳送門；flattened interior runtime 不把 marker 畫喺場景上。
- 主城建築獨立 bitmap：`assets/guild-building-v1.png`、`assets/equipment-shop-v2.png`、`assets/clinic-building-v1.png`、`assets/general-store-building-v1.png`、`assets/inn-building-v1.png`。五張都以透明底單檔載入，唔再用 procedural house 代替有名字嘅服務建築；主城主要服務建築統一遵守下文「主城服務建築統一外觀規格」。
- 主城實體轉場：普通建築門同東側 passage 使用 semantic physical-door／physical-passage hit region；`assets/town-door-marker-v1.png` 同 `assets/town-gate-east-v1.png` 只保留作歷史／製作來源，不屬普通 transition runtime art。runtime 不顯示門口菱形、入口 label 或 talk prompt。
- UI：`assets/ui/ui-visual-atlas-v1.png` 係共用 fantasy window、button、tab、slot、skill-node 嘅 bitmap source atlas；HTML/CSS 負責 9-slice 式可伸縮組合，`docs/UI_SYSTEM.md` 負責玩家可見嘅組合與狀態規則。
- 探索 HUD pull-tab：`assets/ui/ui-sidebar-toggle-v1.png` 係 genuinely transparent、單一 bitmap 三角收合／展開控制；runtime 只可縮放佢嘅 hit area，唔可以用 CSS border、文字 glyph 或額外暗色 rail 代替 collapsed state。
- 旅店／療癒床：`assets/inn-bed-v1.png` 係可重用嘅透明 bitmap 床鋪；室內 bed prop 優先使用此正式資產，Canvas 床形只作載入前 fallback。
- 物品圖示：`assets/item-icon-atlas-v1.png`，4 × 4。藥水、技能書、素材及貨幣；每格都係真正透明 PNG。
- 裝備圖示：`assets/equipment-icon-atlas-v1.png`，4 × 4。依裝備 catalog 順序排列十五件裝備，最後一格保留透明。
- 主角舊版多動作 atlas：`hero-anim-down-v3.png`、`hero-anim-up-v3.png`、`hero-anim-right-v3.png` 可保留作 attack／death／特殊動作兼容；**Idle + Walk locomotion 由新統一 28-frame locomotion atlas 接管**。新標準四方向必須各自有正式 frame，唔以向右圖鏡像假扮全部方向。

## Main Town flattened navigation package

主城使用一對同尺寸、同座標空間嘅 flattened scene 圖：`assets/main-town/maintown.jpg` 係唯一玩家可見 master art；`assets/main-town/maintown_walkable.jpg` 係唯一 navigation／interaction authoring source。兩張供應圖固定為 `7680 × 4320` 原圖 pixel space，唔存在另外一層 foreground／occlusion navigation art。

Main Town runtime 直接以呢個 `7680 × 4320` native world coordinate space 繪製 master art；地圖尺寸係 1:1 world pixels，唔可以再加一層 legacy compact-map scale、CSS 放大或 per-map image transform。相機係 viewport window：每幀以 camera center 同 viewport world size 從 native image 取 source crop，直接 draw 到 final Canvas backing output，唔先將全圖 downsample 到中間 gameplay canvas。相機 zoom 只負責玩家視角（far／mid／near）與 viewport responsive framing，必須同 navigation、feet pivot、click-to-world inverse 使用同一個 camera transform；DPR 只按 CSS viewport 放大 backing store／輸出採樣密度，唔改變 world size 或 crop。

`maintown_walkable.jpg` 以白色定義 walkable ground、青色定義六個固定 transition、粉紅色定義城門 DECK configuration interaction；其他顏色全部 blocked。`tools/generate-main-town-navigation.js`（由 `tools/compile-main-town-navigation.py` 執行 JPG 分類）將 pair deterministic 編譯成 `map/main-town-navigation.generated.js`。generated data 明確標示不可手改；browser runtime 唔載入 authoring JPG、唔使用 Canvas／OffscreenCanvas pixel readback，亦唔由 visible art alpha、舊 bitmap 或物件位置推導 collision。

主城玩家定位採用 shared exploration feet pivot；`feet_radius_px` 由 authored package 提供，目前係 3 px。視覺 sprite 可以伸入建築上方，但 feet disk 必須由 shared navigation resolver 驗證。pathfinding、line-clear、實際 movement substeps、六個 transition arrival 同粉紅 deck region interaction 都使用同一 resolver；navigation 缺失／驗證失敗時 default blocked。舊 Main Town masks、deck sign／bitmap 同舊 trigger coordinates 不再係 canonical source。

## Flattened interior scene contract

Guild、Weapon Shop、Inn、General Store 同 Hospital 五個室內場景使用同一套可重用 flattened-scene contract。每個場景有一對同尺寸、同像素對位嘅 PNG：

- visible master art：`assets/{guild|weapon|inn|item|hospital}/{scene}.png`，所有地板、牆、家具、裝飾及可見 NPC 都已烘焙入畫面；runtime 只顯示呢張圖。
- authoring navigation art：同一資料夾嘅 `{scene}_walkable.png`，只供開發期生成器讀取，唔會由 browser runtime 載入；白色係 walkable allowlist、洋紅色係 NPC occupancy、青色係 exit／door region。
- 每張圖固定為 `1672 × 941`，只接受精確不透明 `#ffffff`、`#ff00ff`、`#00ffff` authored colors；其他像素唔會被推導成 collision。

`tools/generate-flattened-navigation.js` 以 deterministic generator 將 authoring PNG 編譯成 `map/*-navigation.generated.js`；`map/flattened-navigation.js` 提供所有場景共用嘅 fail-closed feet-disk resolver（半徑 `3 px`）。NPC／exit region、anchor、bbox、centroid 同 source hash 都保留喺 generated package，map factory 只接入 semantic interaction、service data 同 transition contract。瀏覽器唔應掃描 PNG、由 visible art alpha 推導 collision，亦唔應把 authoring overlay 顯示畀玩家。

室內正式 runtime 只保留一個 authored service NPC；NPC bitmap 係背景內已烘焙嘅視覺，map NPC entity 只負責互動及服務，不再重畫第二個角色。家具、裝飾、委託板等可保留 metadata 供系統查詢，但 flattened 場景一律 `render: false`、唔以舊 procedural prop 或 marker 覆蓋 master art。出口仍然係正常 semantic physical door，玩家可以按住門區／點擊門區自然行入，離開時由 cyan exit region 驗證，整個流程唔顯示 talk／transition marker。

Service NPC 的 authored magenta region 係 interaction geometry，唔係可見 sprite bounds；runtime 以 feet pivot 到 region 最近點判斷 `160 px` reach，並以 `18 px` hit padding 處理點擊命中。這套 geometry 由共用 flattened-navigation resolver 提供，不能因角色圖片透明邊、NPC centroid 或不同 interior 而另造 offset。

## 主城服務建築統一外觀規格

呢一節係主城 Guild／Equipment Shop／Clinic／General Store／Inn，以及將來同級主要服務建築嘅正式 exterior bitmap contract。目的係令方正街區城市保持清晰、整齊、可重用，避免每棟建築自行發明比例、方向同入口位置。

### 統一尺寸／街區 envelope

- 所有同級主要服務建築使用同一套標準 exterior canvas／footprint envelope；唔可以因「公會重要」就任意放大，亦唔可以因「商店細」就任意縮細。
- 主城 Guild／Equipment Shop／Clinic／General Store／Inn 五棟主要服務建築 exterior 必須 fit 入同一個 **`8 × 7 tiles` 標準 visual box**，並維持同級視覺重量。
- 建築屋頂、煙囪、旗幟、招牌等可以有造型差異，但主體視覺寬度、接地 footprint、門前留白及整體畫面重量必須保持同級。
- renderer／map data 應以共用 building profile 保存標準 `spriteWidth`、`spriteHeight`、底座 anchor 及 entrance geometry；新服務建築優先套用同一 profile，而唔係新增一組 magic scale。
- 若某建築設計無法合理塞入標準 envelope，應重新設計／重新生成 asset；唔好用 runtime 非等比壓縮、拉闊或特殊 offset 硬塞。

### 正面朝向與中央正門

- 所有主要服務建築 exterior 必須以**正面朝向 Main Street** 嘅正交構圖呈現；北排建築面向南，南排建築面向北。
- **正式可用正門固定喺面向 Main Street 嘅建築邊中央。** 門中心 X 必須與建築 semantic centerline 對齊。
- 禁止將主要入口設計成偏左、偏右、側門、斜門或藏喺附屬攤位後面；呢啲構圖即使美術上有特色，都唔適合標準主城服務建築。
- `doorAnchor`、threshold、approachPoint 同 exteriorSpawn 必須沿同一條 building centerline 配置，並按所屬街道側推導；門口 marker 只屬 legacy／debug art，正式 flattened runtime 不顯示。
- 門前台階／平台／地墊可以有風格差異，但必須保持中央入口清晰，並預留足夠透明／地面空間畀角色接近。
- 如果畫面包含其他裝飾門、側門或開口，必須明顯次要且不可誤導為主要可互動入口；若會造成混淆，應從 final runtime asset 移除。

### 生成與驗收

新生成／重畫主城主要服務建築時，prompt／驗收必須同時確認：

1. genuinely transparent PNG alpha；
2. front-facing to Main Street exterior；
3. single primary entrance at exact Main Street-facing edge center；
4. standardized building envelope／visual scale；
5. complete foundation、steps、door shadow 同接地像素；
6. 左右輪廓可以唔完全對稱，但門中心不可漂移；
7. runtime 截圖中 semantic threshold 必須對正可見門洞；正式畫面唔應出現門口 marker。

如果現有建築 asset 違反中央正門或統一尺寸規格，應重新生成／重畫正式 bitmap，而唔係長期保留 per-building entrance offset 作補救。主城主要服務建築不得以任意 per-building entrance offset 取代共用 contract。

## 透明底硬規格

- 生成 prompt 必須寫明「genuinely transparent PNG alpha」，禁止棋盤格、白／灰／黑背景、外框光暈。
- 灰白棋盤格只可以係檢視器背景，絕對唔可以畫死喺 RGB 像素。生成檔先保存為 `*-source-vN.png`；通過 alpha 清理及稽核後，才可命名為 runtime 資產。
- 新圖唔可以只靠肉眼睇檔案縮圖；啟用前執行 `powershell -File .\tools\audit-transparent-assets.ps1`。
- 稽核會檢查四角 alpha、透明像素比例，同 alpha=0 像素有冇殘留 RGB；有殘留就會喺縮放時滲出白／彩邊。
- 舊圖如有畫死棋盤格，可先用 `clean-alpha-matte.ps1 -Mode checker` 另存新版，再重新稽核；唔直接覆蓋原圖。

## Atlas 裁切與接地硬規格

- 每格以 atlas 的 `columns × rows` 數學切割；任何非透明像素都不可伸入相鄰格。生成圖尺寸未必可整除時，程式與驗收工具必須採用同一浮點分格規則，禁止手寫另一組像素邊界。
- 人物、NPC、物品等獨立素材預設一件一檔；確實需要 atlas 時，每格四邊至少留約 `8–10%` 真透明安全間距，人物頭髮、武器、法杖、羽毛及裙擺都不可貼住分格線。舊版緊密 NPC atlas 只可透過 renderer 安全 gutter 過渡，任何新版本不得再依賴程式裁走鄰格污染。
- 建築、樹、燈柱及室內台座的最底像素、地基和接地陰影必須完整留在該格；四邊預留安全透明 padding。禁止以負 source offset 補救被裁走的內容。
- 繪製定位一律用「腳底／底座中心 anchor」。視覺可向上伸展，但碰撞箱及傳送點不得跟隨圖片外框漂移。
- 獨立建築圖另外保存 `spriteWidth`、`spriteHeight`、`spriteAnchorY` 同 `doorAnchor {x,y}`。一般獨立建築門座標由同一張 bitmap 的可見門洞推導；**主城主要服務建築必須按上文 contract 使用面向 Main Street 嘅正中央正門，`doorAnchor` 與 building centerline 對齊**。禁止用圖片右下角或任意 per-building offset 猜門位。若 bitmap 門洞高於原始 house 碰撞底線，`doorDepth` 必須同步打開實體門洞，確保玩家半徑可以走入。
- 新版場景資產要先在 atlas 單格預覽，再在戶外、公會、商店三種場景各做一次實機截圖；確認無截頂、無截底、無白邊、無跨格污染才可替換舊版。
- `environment-atlas-v4.png`、`monster-atlas-v1.png` 及各 `*-source-*`／`*-edit-*` 只屬舊版或製作來源；新程式只引用 v5 場景、四方向怪物、清理後格鬥士及小地圖框。

## Everrealm UI bitmap skin contract

`assets/ui/ui-visual-atlas-v1.png` is the reusable source atlas for major
player-facing window skins. It contains authored stone/metal frame corners,
edges, inset panels, buttons and slot/node states in one transparent bitmap.
The runtime must compose it with HTML/CSS backgrounds so the same skin can
stretch across status, inventory, equipment, guild and skill windows.

UI atlas rules:

- keep corners and ornament inside fixed safe areas; only centre fills and
  straight edges may stretch or repeat;
- export genuinely transparent PNG alpha and audit the four corners before
  runtime use; checkerboard or matte backgrounds are never part of final art;
- keep text, values and controls in HTML/CSS, not baked into the bitmap;
- preserve a minimum clear inset around the frame so dynamic content never
  collides with ornaments;
- selected, hover, disabled and locked states may use separate atlas states or
  restrained CSS tinting, but must remain legible at small viewport sizes;
- retain the atlas as source material and document any crop coordinates in the
  UI system stylesheet rather than creating fixed-size per-window backgrounds.

The bitmap owns material, border and ornament. CSS/HTML owns scalable layout,
typography and interaction. Canvas remains appropriate for dynamic skill-tree
connectors, range diagrams and targeting grids only.

## Standard Mobile Unit Locomotion Contract

呢一節係所有普通可移動單位嘅正式 Idle／Walk 共用規格。

### 適用範圍

預設適用：

- 玩家角色：戰士、格鬥士、將來魔法師／其他正常體型職業。
- 普通細至中型地面怪物：雞仔、狐狸、熊仔等正常單格動物／怪物。
- 可捕獲後成為 Familiar 嘅同一批普通怪物。
- 將來需要真正移動動畫嘅正常體型 NPC，可選擇接入同一 contract。

唔強制適用：

- 巨型 Boss。
- 超闊／超高 multi-cell 單位。
- 蛇型、巨龍、特殊飛行體等明顯唔適合正常單格 canvas 嘅特殊生物。
- 完全靜止、永遠唔需要 walk animation 嘅 NPC。

特殊單位日後可以另設 contract，但禁止因一兩張來源圖 cut 得唔好就臨時為普通單位開例外。

### 28-frame 固定結構

每個標準 mobile unit 嘅 **locomotion atlas 固定為 `4 rows × 7 columns = 28 frames`**：

```text
          C0     C1    C2    C3    C4    C5    C6
          Idle   W1    W2    W3    W4    W5    W6

R0 Down    ■      ■     ■     ■     ■     ■     ■
R1 Right   ■      ■     ■     ■     ■     ■     ■
R2 Up      ■      ■     ■     ■     ■     ■     ■
R3 Left    ■      ■     ■     ■     ■     ■     ■
```

固定方向：

```text
Row 0 = Down / 正面
Row 1 = Right
Row 2 = Up / 背面
Row 3 = Left
```

固定用途：

```text
Column 0 = Idle
Column 1–6 = Walk cycle W1–W6
```

因此：

```text
4 directional idle frames
+
24 directional walk frames
=
28 locomotion frames
```

Attack、Hit、Cast、Death、Run 等唔計入呢 28 張；需要時放獨立 animation atlas／state，唔好破壞 locomotion atlas row/column contract。

### 全 project 共用 Cell Geometry

所有 standard mobile unit 必須共用同一組中央設定：

```js
STANDARD_MOBILE_UNIT_SPRITE = {
  columns: 7,
  rows: 4,

  cellWidth,
  cellHeight,

  anchorX,
  anchorY,

  directions: {
    down: 0,
    right: 1,
    up: 2,
    left: 3
  },

  idleColumn: 0,
  walkColumns: [1, 2, 3, 4, 5, 6]
}
```

`cellWidth`、`cellHeight`、`anchorX`、`anchorY` 一旦定好，就係整個 standard mobile unit contract 嘅固定值。

禁止：

- 格鬥士一套 anchor。
- 戰士另一套 anchor。
- 雞仔又另一套 runtime offset。
- 某 frame 特別 `+3px`／`-5px` 補位。

正常體型差異只可以靠角色內容喺同一 fixed canvas 內佔用唔同比例表現；**世界定位嘅 foot anchor 仍然係同一個 canvas 座標。**

### Fixed Foot Anchor / Baseline

每一格：

```text
anchorX = 固定身體／接地中心 X
anchorY = 固定腳底／接地 baseline Y
```

對雙足角色：

- anchor 以兩腳之間嘅接地中心為準。

對四足普通動物：

- anchor 以四足接地 footprint 嘅視覺中心為準。

對雞仔等細型怪：

- 身體可以較細，但接地中心仍放喺同一 anchor。

角色頭髮、尾巴、翼、拳套、法杖、腳步伸展，都唔可以令 anchor 跟 alpha bounding box 移動。

### Walk Cycle

每方向 6 個 walk frames 必須構成完整循環：

```text
W1 → W2 → W3 → W4 → W5 → W6 → W1
```

雙足角色至少要有清楚左右腳交替。

四足／動物角色可以使用自己物種自然步態，但仍然：

- 6 個連續 frame。
- 首尾可以自然循環。
- 身體核心唔可以左右亂飄。
- 腳底接地感穩定。
- 唔可以 6 張其實只係同一張圖複製。

正式 walk FPS 由 animation controller 統一設定；單一角色唔自行 hard-code 特殊 FPS，除非係正式特殊狀態。

### Source ≠ Runtime Atlas

**禁止再將 AI 直接生成嘅大 sprite sheet 當成可信任 runtime atlas，然後見到 cut 錯就逐 frame patch。**

標準流程：

```text
AI / artist source
↓
取得 28 個完整 source frames
↓
逐 frame 驗證人物完整
↓
normalize 到固定 cellWidth × cellHeight transparent canvas
↓
套用完全相同 anchorX / anchorY
↓
自動 repack 成 4 × 7 runtime atlas
↓
atlas audit
↓
contact sheet
↓
runtime exploration test
↓
runtime battle test
```

AI 可以一次生成 sheet 作 source，但 **source sheet 唔代表分格可信**。

如果來源 sheet：

- 行高唔平均；
- 有上一行隻腳落到下一行個頭；
- cut 咗腳；
- 相鄰格有殘影；
- frame 本身大小唔一致；

應該先抽取／重做完整 source frame，再 normalize + repack。

禁止用大量 per-frame runtime offset 去補 source atlas。

### Repack 工具

`tools/` 應提供一個共用 standard mobile unit repacker／validator。

佢至少負責：

- 驗證恰好 28 frames。
- 驗證所有 frame 尺寸一致。
- 放入固定 transparent canvas。
- 使用同一 anchor。
- 按固定 row / column contract repack。
- 輸出 atlas。
- 輸出 contact sheet／validation report。
- 檢查相鄰 cell bleed。
- 檢查 alpha edge。

Renderer、repacker、QA 必須讀同一份 `STANDARD_MOBILE_UNIT_SPRITE` metadata，唔好各自寫另一組 column／row／anchor。

### Runtime 計算

標準 atlas 唔需要每個角色維護獨立 cut table。

概念：

```js
row = directionIndex;
col = state === "idle" ? 0 : walkFrameIndex; // 1..6

sx = col * cellWidth;
sy = row * cellHeight;
```

draw position 使用同一 fixed anchor。

對已經由工具規整完成嘅新 atlas：

> **禁止再用 alpha bounding box、rowCuts、逐角色 magic offset 去重新猜 frame 邊界。**

`rowCuts`／`columnCuts` 只用於抽取 legacy／不規則 source；唔係新 standard runtime atlas 嘅常態。

### Exploration + Battle 共用

同一 unit 嘅探索同戰鬥：

> **必須共用同一套 directional Idle／Walk locomotion atlas。**

探索行路：

- 根據實際移動方向播相應 W1–W6。

戰棋移動：

- 每段 grid movement 根據實際方向播相應 W1–W6。
- 唔可以用一張 Idle sprite 由 A 格水平滑到 B 格。

停止：

- 回到當前 facing 嘅 Column 0 Idle。

被 `STOP!`：

- 即時停止 walk cycle；
- 保留最後實際 facing；
- 回到該方向 Idle。

Battle movement 嘅 timing／collision 仍然由 `docs/BATTLE_SYSTEM.md` 負責；呢度只定義視覺動畫 contract。

### Legacy Migration

現有：

- `fighter-walk-atlas-v4.png`
- `monster-facing-core-v1.png`
- `monster-facing-depths-v1.png`
- 舊 hero locomotion 相關 atlas

可以暫時保留作：

- 造型參考；
- fallback；
- migration 前兼容。

但新工作方向係：

> **重新建立標準 28-frame locomotion asset，而唔係繼續逐張修補舊 atlas。**

某個 unit 一旦完成新 28-frame atlas 並通過 exploration + battle QA，runtime 應切去新 atlas；舊 locomotion asset 唔再作正式來源。


## 角色動畫 Atlas 對位硬規格

- 同一組動畫所有 frame 必須輸出成完全相同 `width × height`。
- Crop 只負責抽取來源內容；crop 完後必須重新放回固定尺寸透明 canvas。
- 禁止按每格 alpha bounding box 各自自動置中角色。手腳、頭髮、武器或衣物伸展幅度不同時，若每格獨立以 bounding box center 對齊，會造成動畫左右飄移、上下跳動。
- 每個角色動畫必須定義固定 semantic anchor：
  - X：身體／胯部中心線。
  - Y：腳底接地 baseline。
- 同一方向所有 frame 的 semantic anchor 必須落在完全相同 canvas 座標。
- 頭髮、武器、手腳、裙擺、披風及其他外伸裝飾不得改變角色 anchor。
- 不得以 sprite 每格透明內容的 bounding-box center 作 renderer anchor；角色定位必須使用固定 semantic anchor metadata。
- 怪物名稱同樣使用每種體型的 semantic `nameLift`／`nameOffsetX`，由腳底 baseline 推算；不得以 atlas cell top 或透明 padding 決定名牌位置。
- 如果來源 atlas 行高／欄寬不平均，必須使用明確 `rowCuts`／`columnCuts`；禁止直接以平均高度或平均寬度硬切。
- `rowCuts`／`columnCuts`、runtime renderer 及驗收工具必須共用同一組切割資料，禁止各自維護另一套像素邊界。
- 每個 cell 抽取後必須逐格檢查：
  - 頂部無上一行像素；
  - 底部無下一行像素；
  - 左右無相鄰格污染；
  - 頭、腳、武器、髮尾、披風等完整保留；
  - 不可出現上一行角色腳部落到下一行角色頭頂等跨格殘影；
  - 不可因裁切太貼而喺縮放後出現白邊／彩邊。
- 發現鄰格污染或內容被裁斷時，應修正 source crop／repack；禁止以 runtime mask、負 offset、人工遮蓋或逐 frame 特例去掩蓋。
- 同一角色四方向動畫應保持一致視覺比例；不可某一方向頭身比例、身高、腳掌大小或整體 scale 明顯不同。
- 行走動畫步幅需自然；不得因生成 frame 令雙腳突然過度分開、腳部尺寸忽大忽細，或令身體中心喺相鄰 frame 之間大幅偏移。

## 角色動畫視覺驗收

每次新增、重切、清理或修改角色／怪物動畫 atlas 後，必須：

1. 產生逐格 contact sheet，先檢查 crop、透明邊界及跨格污染。
2. 實際用遊戲 runtime renderer 播放動畫，唔可以只睇單張 PNG 或 contact sheet 就判定完成。
3. 每個方向至少連續播放 3 個完整循環。
4. 四方向逐一檢查：
   - 身體有冇左右飄移；
   - 腳底 baseline 有冇上下跳；
   - 頭部高度有冇異常跳動；
   - frame 切換時角色 scale 有冇改變；
   - 有冇上一／下一格殘影；
   - 有冇白邊、彩邊、半透明雜邊；
   - 頭、腳、武器或衣物有冇被裁走；
   - 行走步幅及肢體動作是否自然。
5. 新 standard mobile unit atlas 必須驗證固定 `4 × 7 = 28 frames`、四方向各 1 Idle + 6 Walk，唔可以缺格、重複錯格或方向次序錯。
6. 必須分別喺 **探索地圖** 同 **戰鬥地圖** 播放同一 unit 嘅四方向 walk；兩邊都要有自然腳步動畫，正式 runtime 不接受靜止 sprite 純平移。
7. 普通玩家／怪物／Familiar 必須驗證共用 fixed cell geometry + foot anchor 後，唔需要 per-frame／per-unit magic offset。
8. Legacy atlas 只作 migration/fallback；如果問題根源係來源 atlas 分格唔可靠，優先重建 28-frame standardized locomotion asset，唔好繼續逐格 patch。
9. 如任何一項仍有問題，不可標記完成；必須修正 source frame／repack／anchor metadata 後重新測試。
10. 視覺問題修正後，再做一次 regression test，確認 collision、角色世界座標、名稱／任務標記、戰鬥朝向及其他 renderer 行為未因美術修正而改變。

## 女性 NPC 美術設計

### 固定方向

- 服裝／身份概念參考：`assets/female-npc-sprites-v1.png`；只作角色設計參考，禁止直接縮細用喺地圖。
- 地圖 Q 版正式圖集：`assets/npc-map-chibi-v4.png`（4 欄 × 3 列、12 個互不重複角色）。
- 對話大頭照正式圖集：`assets/npc-dialogue-portraits-v4.png`（4 欄 × 3 列，角色次序必須與地圖圖集一致）。
- 阿澄全身身份參考：`assets/ah-ching-v1.png`；地圖與對話實際分別使用上述 Q 版圖集及大頭照圖集。
- 所有女性 NPC 必須明確設定為成年，角色資料保留 `gender: "female"` 與 `age`。
- 立繪／對話畫風採用精緻日系奇幻 RPG；地圖角色統一為大頭、短身、清晰剪影嘅成年 Q 版，唔可混用 5–6 頭身全身立繪。
- 每位角色要靠顏色、武器與剪影清楚表達職業，避免只換髮色。
- 衣著可華麗、修身、有職業特色，但角色姿勢與地圖 Q 版表現要適合作正式遊戲素材，唔好因造型犧牲可讀性、剪影、動畫安全邊或角色定位。

### 現有角色造型基準

由概念圖由左至右、由上至下：

1. 紅黑金女劍士
2. 金髮綠衣精靈弓手
3. 銀髮藍白冰法師
4. 粉髮小惡魔系魔裝角色
5. 紫髮黑衣忍者／刺客
6. 藍髮兔耳侍從
7. 紅髮海盜女船長
8. 金髮藍白神官／法師

### 阿澄專用外貌基準

- 角色身份：25 歲成年女性「守燈星術師」，保留角色名「阿澄」及既有 `ah-ching`／`keeper` 任務兼容識別。
- 固定外貌：銀藍色長髮、青綠眼睛、成熟日系奇幻女性比例。
- 固定服裝：紫黑金星術法衣、白色羽毛披肩、金色圓環飾物。
- 固定裝備與同伴：頂端帶藍金月輪球體嘅法杖，以及漂浮於身旁嘅藍色精靈。
- 往後製作阿澄嘅地圖像、肖像、表情、戰鬥動作或其他變體，都必須以 `assets/ah-ching-v1.png` 為精確角色參考，維持髮色、眼色、服飾配色、法杖與精靈設計一致。
- 通用女性 NPC 繼續以 `assets/female-npc-sprites-v1.png` 作風格與衣著基準；阿澄唔計入可自由換裝嘅通用角色池。

### NPC 地圖圖集與對話圖集

- 地圖角色圖集固定 4 欄 × 3 列；每格只放一位完整 Q 版角色。
- 地圖角色尺寸、腳底基線及透明安全邊必須一致；頭髮、武器、法杖、披風不可跨格。
- 對話圖集固定 4 欄 × 3 列；每格係獨立繪製嘅頭部至上肩大頭照，面部約佔格高 60%，唔可以由全身圖硬裁。
- 地圖及對話兩張圖集角色次序必須完全一致，並由 `character-art.js` 嘅 `npcArtIndices` 作唯一索引契約；每個具名 NPC 使用唔同 index。
- 背景、裁切、透明 alpha、padding、anchor 及 atlas QA 全部遵守本文件其他硬規格。
- 地圖 Q 版使用高品質平滑縮放並保持原始比例；對話大頭照只做等比例 cover，禁止拉伸。

### 後續生成 Prompt 基底

地圖 Q 版：

> 以角色身份立繪作服裝與配色參考，製作成年奇幻 RPG NPC 嘅 Q 版地圖 sprite。大頭、短身、清晰剪影、完整全身、統一腳底基線，同主角嘅精緻可愛日系遊戲畫風一致；衣著按 Q 版比例作適當簡化。置中、genuinely transparent PNG alpha，不加背景、文字、格線、水印或額外角色，並預留足夠透明安全邊。

對話大頭照：

> 為同一位成年 NPC 獨立繪製頭部至上肩嘅對話大頭照。面部約佔格高 60%，眼睛、髮型及代表性飾物清晰，視線接近鏡頭，頭部置中並留安全邊；唔可以由全身圖裁切。精緻日系奇幻 RPG 卡面畫風、genuinely transparent PNG alpha，不加文字、邊框、水印或額外角色。

阿澄變體：

> 以 `assets/ah-ching-v1.png` 為精確角色參考，製作 25 歲成年女性阿澄（守燈星術師）嘅新表情或動作。嚴格保持銀藍長髮、青綠眼、紫黑金星術法衣、白羽披肩、金色圓環飾物、藍金月輪法杖與藍色精靈；只改指定姿勢／表情／視角，不重新設計服裝或角色。沿用精緻日系奇幻 RPG 畫風，genuinely transparent PNG alpha，不加背景、文字、水印或額外角色。

## NPC 共用索引

角色 atlas 共用索引保留既有 art／internal compatibility identity；它不是地圖標籤的來源。正式 runtime NPC 必須另外提供 `displayName` 作世界／互動功能標籤，例如 `guildmaster-yin` 顯示「公會接待員」。普通服務／提示 NPC 嘅個人姓名只留喺 owning map data 供 save、actor index 或舊資料兼容，唔出現在世界 label、quest copy 或 dialogue nameplate；ordinary dialogue 亦唔需要肖像欄。只有明確批准嘅具名劇情角色先可以另行定義 player-facing personal identity。

| Index | Actor | 對話／肖像身份 |
|---:|---|---|
| 0 | `keeper` | 阿澄 |
| 1 | `smith` | 鐵叔 |
| 2 | `healer` | 小滿 |
| 3 | `guildmaster` | 妍姐 |
| 4 | `clerk` | 阿寶 |
| 5 | `adventurer` | 諾拉 |
| 6 | `duelist` | 麗雅 |
| 7 | `merchant` | 銀姐 |
| 8 | `armorer` | 阿月 |
| 9 | `tailor` | 莎菲 |
| 10 | `explorer` | 露娜 |
| 11 | `villager` | 預留新角色 |

地圖同對話 atlas 必須跟同一個次序。`character-art.js` 以 `npcArtIndices` 驗證每個 actor 只佔一格，避免再出現公會 NPC 撞樣。

## 主角／普通單位動畫 State 分工

正式基礎 locomotion：

- `Idle`：由 standard 28-frame atlas 每方向 Column 0 提供。
- `Walk`：由 standard 28-frame atlas 每方向 Column 1–6 提供。

其他 state 可使用獨立 atlas：

- `Run`
- `Attack`
- `Cast`
- `Hit`
- `Death`
- 特殊技能／職業動畫

因此唔需要為咗 attack／death 改變 `4 × 7` locomotion contract。

舊 `hero-anim-*`／`fighter-atlas-*` 內仍有可用 attack／death／特殊 pose 時，可以喺 migration 期間保留；但 Idle／Walk 正式 runtime 應逐步統一到新 locomotion contract。


## 戰鬥場景美術規格

### Renderer 原則

- 戰鬥場景可以繼續使用 Canvas 作 renderer，但正式畫面唔可以只靠純色矩形、幾何圖形、debug icon 或簡單色塊組成。
- **Canvas 係畫布／engine；正式 battlefield 內容以 bitmap art 為主。**
- 純 Canvas 幾何 battlefield 只可作：
  - debug；
  - asset 未載入時 fallback；
  - gameplay overlay；
  - selection／route／range effect。
- 正式地面、背景、石、樹、灌木、水、裂地、石柱等全部應使用正式 bitmap asset。

### Battlefield Layer Order

建議 render 次序：

```text
1. 遠景／battle background
2. ground bitmap tiles
3. ground variation / decals
4. terrain / obstacle bitmap props
5. grid overlay
6. player / monster / Familiar
7. route / selection / range / impact / skill effects
8. floating names / HP bars
9. battle HUD
```

如果某特效需要跨層，可由 renderer 明確定義，但唔好將 grid 或 HUD 燒入 ground bitmap。

### Battle Theme

Biome 同 battle theme mapping 由 `docs/MAP_SYSTEM.md` 決定。

第一階段至少支援：

```text
mountain
cave
town
```

將來：

```text
coast
forest
snow
...
```

`ART_PIPELINE.md` 只負責每個 theme 需要嘅視覺資產同品質。

### Mountain Battlefield

正式視覺方向：

- 啡／綠山地色調。
- 泥土、草、碎石等有自然 variation，唔好每格完全同色。
- blocker 使用真正石頭、樹、灌木等 sprite。
- 遠景／board 外圍要令人感到仍然喺山地，而唔係浮喺純色 UI 背景。

目前山地遭遇戰使用以下正式 runtime 資產／圖層：

```text
assets/battle/mountain/mountain-battle-background-v1.png  遠景 bitmap
assets/battle/mountain/mountain-battle-ground-v2.png       battle board ground bitmap
assets/terrain-atlas-v1.png                               dirt／grass ground tile
assets/environment-atlas-v5.png                           rock obstacle frame
```

Renderer 只喺 `BattleContext.theme === "mountain"` 時啟用呢套 presentation；遠景以低對比 cover 方式鋪滿 viewport，board 內先以 `mountain-battle-ground-v2.png` 作為整塊地表 bitmap，再加低權重碎石／乾草 decal、raised board rim、正式 rock prop 同單位 contact shadow。地表 bitmap 應該以整塊 board 為單位處理，避免逐格重複造成規律條紋；仍可保留正式 terrain atlas 作為 asset 未載入時嘅 fallback。Grid、移動／攻擊範圍、target、名稱、HP 同 skill effect 仍然係獨立 gameplay overlay，唔會燒入任何背景或地面素材。

Height-aware visual contract：目前山地遭遇戰嘅 `heightMap` 仍然全部係 `0`，所以唔以純視覺假造高低差；如果日後 map context 提供非零高度，tile renderer 會喺該 cell 加 top highlight／lower shadow lip，並由 battle rules 使用同一份 height data，保持畫面同實際 tile logic 一致。

### Cave Battlefield

正式視覺方向：

- 深色岩地、洞穴質感。
- 地面可有自然裂紋／岩石 variation。
- blocker 使用石柱、岩石、瓦礫、礦石等。
- 唔混用無關嘅戶外樹、街燈、城鎮物件。

### Future Coast Battlefield

將來海岸 theme：

- sand
- wet sand
- shallow water
- reef rock
- driftwood

水面／沙地係 battlefield art；實際 walkable、height、projectile interaction 由 `docs/BATTLE_SYSTEM.md` 根據 `docs/MAP_SYSTEM.md` 提供嘅 terrain semantic 判斷。

### Ground Tiles

- Ground tile 可以重複鋪，但同一 battlefield 應提供足夠 variation，避免睇落似完全相同嘅 spreadsheet cells。
- Tile 接縫唔可以出現白線／黑線／透明 seam。
- Ground bitmap **唔好燒死粗戰棋格線**。
- Gameplay grid 由 renderer 另外疊上去。
- Ground art 尺寸不得反過來決定 gameplay cell size。

### Grid Overlay

- Grid 必須精確對齊 battle cells。
- 非操作狀態以較淡、較低視覺權重呈現。
- 移動／技能選擇時，先用 overlay 強調相關格。
- Grid 要保持戰棋可讀性，但唔可以令正式場景似 debug board。
- 黃格／紅格／路線／終點朝向等全部係 gameplay overlay，唔燒入 terrain asset。

### Battlefield Props / Obstacles

- 石、樹、石柱、礁石、漂流木等 obstacle 應有真正 Q 版 RPG 場景物件外觀，唔使用抽象 obstacle icon 代替。
- 透明 props 使用 genuinely transparent PNG alpha。
- 每個 prop 有固定底座／接地 anchor。
- 視覺可以超出一格，但 gameplay footprint 由 map / battle semantic data 決定，唔可以從圖片 bounding box 推斷。
- 高大 prop 可以向上伸出，但唔好遮住重要 UI；必要時 renderer 使用合理 depth sorting。
- 圖片更換唔可以改 obstacle 實際所在 battle cell。

### Battle Asset Registry

戰鬥規則禁止直接用 filename 判斷 terrain behaviour。

使用：

```js
{
  terrainType: "boulder",
  artId: "mountain-boulder-a"
}
```

- `terrainType`：由 `docs/MAP_SYSTEM.md`／`docs/BATTLE_SYSTEM.md` 使用。
- `artId`：由 renderer 映射去實際 asset。

換圖／升 v2、v3 時，只更新 art mapping，唔改 gameplay semantic ID。

### 建議資產組織

新 battlefield assets 建議集中於：

```text
assets/battle/
```

例如：

```text
assets/battle/mountain/
assets/battle/cave/
assets/battle/town/
```

可以包含：

```text
background
ground atlas / tiles
props atlas / individual props
decals
```

呢個係新資產建議結構；**唔需要為咗整理而搬走現有仍正常使用嘅舊 asset**。如 runtime 已有既定 asset registry，優先保持兼容並逐步遷移。

### Battlefield Visual QA

新增／替換 battlefield theme 後，必須實機截圖驗收：

1. Normal battle view。
2. Movement deployment。
3. Attack range。
4. 至少一個 obstacle-rich layout。
5. 玩家／怪物站近 obstacle。
6. 不同 screen size / zoom 至少驗證主要 desktop layout。

逐項檢查：

- 一眼睇得出 biome。
- 地面唔係純色 debug board。
- blocker 係正式場景物件。
- Ground tile 無 seam。
- Props 無白邊／彩邊。
- Grid 同 cell 對位。
- Grid 唔過份搶眼。
- Prop 視覺位置同 gameplay blocker cell 一致。
- 名字／HP bar 唔被大型 prop 無理遮住。
- 玩家／怪物／Familiar feet baseline 正常。
- 黃／紅格仍然清楚。
- 背景同 battlefield 唔似兩塊完全無關嘅 panel。

如果畫面仍明顯似 prototype／debug battlefield，即使功能測試全 pass，都唔可以標記正式美術完成。


## 場景索引

| Index | Sprite | Index | Sprite |
|---:|---|---:|---|
| 0 | 公會屋 | 8 | 岩石 |
| 1 | 鍛造／裝備店 | 9 | 燈柱 |
| 2 | 旅店（舊索引槽） | 10 | 路牌 |
| 3 | 港口小屋 | 11 | 寶箱 |
| 4 | 綠葉樹 | 12 | 港口燈龕 |
| 5 | 松樹 | 13 | 委託板 |
| 6 | 秋樹 | 14 | 木桶＋木箱 |
| 7 | 櫻花樹 | 15 | 水井 |
| 16 | 公會櫃台 | 18 | 裝備展示架 |
| 17 | 室內書架 | 19 | 室內鍛造台 |

所有 bitmap 未完成載入或載入失敗時，遊戲可退回簡化 Canvas 佔位圖；佔位圖只作容錯，唔係正式畫風。碰撞箱、傳送點同任務座標完全唔受美術尺寸影響。
