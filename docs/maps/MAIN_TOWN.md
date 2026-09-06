# 霧都主城 · Main Town

- `map_id: world`
- 類型：主城／服務型探索地圖；Biome：`town`
- 目的：提供任務、拾燈公會、裝備、療癒、雜貨、旅店及戰技面板等主要服務。
- 規劃方向：參考《幸福 Online／STRUGARDEN》米克雷帝國首都嗰種**方正、正交、街區式城市規劃語言**；只參考規劃方法，不作 1:1 地圖或美術複製。

## 1. Canonical planning principle

主城採用**固定模組街區 + 正交道路骨架**，唔再容許以「邊度有空位就擺建築」嘅自由散放方式設計。

永久原則：

- **一個服務街區 = 一棟主要服務建築。**
- 公會、裝備店、療癒所、雜貨舖、旅店各自擁有獨立街區；不可兩棟主要建築共用同一街區，亦不可跨入相鄰街區。
- 城市先定街區、道路、廣場、城牆同城門；建築物只可以填入已定義街區。
- 主要道路全部正交，只沿 X／Y 軸；唔使用斜向、蛇形或自由曲線主路。
- 東側係第一階段唯一主要對外出口，經一條簡單、實體嘅城牆通道直接連接山地。
- 由東側出口入城必須一眼見到一條清楚、連續嘅 Main Street。
- 將來擴建優先以「新增完整街區／街區列 → 接入既有道路骨架 → 放一棟新建築」方式進行，唔靠擠窄舊街、搬動既有建築或臨時塞物件。
- 樹、花圃、長櫈及其他 props 只屬 dressing；佢哋服從城市骨架，唔可以反過來決定道路或建築位置。

## 2. Coordinate system

本文件以下 Blueprint 使用 **tile（地圖格）**，唔係米。

- `tile_size: 40 px`
- 原點 `(0, 0)` = 地圖左上角。
- `+X` = 向東／右。
- `+Y` = 向南／下。
- 所有 Blueprint 座標都以 tile 為單位；必要時可使用 `.5` 半格座標。
- `rect: [x, y, width, height]`，即由左上角 `(x, y)` 起計嘅矩形範圍。

例如一個 `12 × 12 tiles` 街區，代表 runtime 世界空間 `480 × 480 px`；呢個只係遊戲邏輯格，**唔代表現實 12 米 × 12 米**。

## 3. Canonical Main Town Blueprint v1

### 3.1 固定尺寸

```yaml
blueprint_version: 1

tile_size_px: 40

map:
  width_tiles: 50
  height_tiles: 42

block_module:
  width_tiles: 12
  height_tiles: 12

road_module:
  main_street_width_tiles: 5
  frontage_apron_depth_tiles: 4
```

第一階段主城使用 **3 columns × 2 rows = 6 個 canonical blocks**。其中五個係服務建築街區，一個係中央廣場 civic block；六個 block 以同一條 Main Street 分隔南北兩側。

### 3.2 Block allocation

```yaml
blocks:
  A1:
    rect: [4, 4, 12, 12]
    use: guild

  A2:
    rect: [19, 4, 12, 12]
    use: clinic

  A3:
    rect: [34, 4, 12, 12]
    use: inn

  B1:
    rect: [4, 26, 12, 12]
    use: equipment_shop

  B2:
    rect: [19, 26, 12, 12]
    use: central_plaza
    civic_block: true

  B3:
    rect: [34, 26, 12, 12]
    use: general_store
```

`B2` 係唯一第一階段 civic-block exception：佢係完整中央廣場，**唔放主要服務建築**。其他服務 block 每個只可以有一棟主要建築。

### 3.3 Road skeleton

```yaml
roads:
  main_street:
    rect: [2, 18, 46, 5]
    role: primary
    connects_directly_to: east_passage

frontage_aprons:
  north: [[10, 13, 1, 5], [25, 13, 1, 5], [40, 13, 1, 5]]
  south: [[10, 23, 1, 4], [40, 23, 1, 4]]
```

道路層級必須清楚：

- `main_street` 係全城唯一主要道路，亦係東側出口入城後嘅主要 boulevard。
- 五棟服務建築分佈於 Main Street 南北兩側；每棟只由短 entrance apron 接駁，唔新增另一條平行街。
- Main Street 唔可以畫成巨大泥地／耕地質感；應使用一致、可讀、真正道路感嘅鋪面。
- 中央 civic block 直接作為道路旁嘅廣場空間，唔另畫成第二層道路。

### 3.4 East-side passage / city wall

```yaml
city_wall:
  north: [0, 0, 50, 2]
  west:  [0, 0, 2, 42]
  south: [0, 40, 50, 2]
  east_north: [48, 0, 2, 18]
  east_south: [48, 23, 2, 19]

east_passage:
  corridor: [46, 18, 4, 5]
  opening: [48, 18, 2, 5]
  exit_direction: east
  destination: field
```

東側出口永久規則：

- 出口位於城市右／東邊界，開口同 Main Street 完全對齊。
- 由城內望過去，Main Street 必須直接導向東側 passage，唔需要繞路或斜切。
- 出口只需要清楚嘅城牆開口、道路延伸同實體 transition；不要求大型 gate façade 或 landmark 建築。
- 城牆、通道、道路係同一個結構，唔係互不相關嘅裝飾物。
- 出口係 `physical-passage`，唔使用 magic-circle VFX。

## 4. Human-readable block plan

```text
                               NORTH WALL
        ┌────────────┬────────────┬────────────┐
        │    A1      │    A2      │    A3      │
        │   公會      │   療癒所     │    旅店      │
        │     ↓      │     ↓      │     ↓      │
        └──────┬─────┴──────┬─────┴──────┬─────┘
               │    entrance aprons    │
          ═══════════ MAIN STREET ════════════════ EAST PASSAGE → 山地
               │                      │
        ┌──────┴─────┬──────┴─────┬──────┴─────┐
        │    B1      │    B2      │    B3      │
        │   裝備店     │  中央廣場    │   雜貨舖     │
        │   ← front  │   CIVIC    │  front →   │
        └────────────┴────────────┴────────────┘

                               SOUTH WALL
```

呢張圖表達嘅唔係大概方向，而係同上面 YAML 對應嘅 **canonical topology**。

## 5. Standard service-building module

五棟主要服務建築必須使用同一套 block／visual／entrance 模板：

```yaml
service_building_template:
  containing_block: [12, 12]

  visual_box:
    offset_from_block: [2, 1]
    size_tiles: [8, 7]

  door_axis:
    x_from_block_left: 6

  door_anchor:
    relative: [6, 8]

  threshold:
    center_relative: [6, 8.25]
    size_tiles: [1.5, 1.0]

  north_front:
    door_anchor_relative: [6, 0]
    approach_point_relative: [6, -2]
    exterior_spawn_relative: [6, -2.5]
    entry_facing: down
    return_facing: up

  south_front:
    door_anchor_relative: [6, 8]
    approach_point_relative: [6, 10]
    exterior_spawn_relative: [6, 10.5]
    entry_facing: up
    return_facing: down
```

### 5.1 建築尺寸硬規格

- 公會、裝備店、療癒所、雜貨舖、旅店喺主城 exterior **使用同一個 `8 × 7 tiles` 標準 visual box**。
- 唔可以再因為「公會重要」就任意放大，或者因為「商店細」就任意縮細。
- 建築 bitmap 可以有唔同屋頂、招牌、窗、煙囪、材質同輪廓細節，但 final runtime presentation 必須 fit 入同一個 standard box，同級視覺重量。
- 如果現有 bitmap 因構圖／比例／門口位置根本唔適合呢個模板，應重新生成／重畫 final bitmap；唔可以靠非等比拉伸、magic offset、mask 或 Canvas patch 補救。
- 屋簷／煙囪等少量透明 visual overhang 可以存在，但唔可以侵入相鄰 block 嘅導航／入口語意，亦唔可以令建築睇落大一個等級。

### 5.2 正門硬規格

- 所有主要服務建築 exterior bitmap 必須採用**正面朝向 Main Street** 嘅正交構圖；北排建築面向南，南排建築面向北。
- **唯一正式正門必須位於面向 Main Street 嘅建築邊中央。**
- 禁止將主要可用入口放喺偏左、偏右、側邊或斜角位置。
- `doorAnchor`、`threshold`、`approachPoint`、bitmap entrance marker 同 `exteriorSpawn` 必須落喺同一條 X 軸。
- 玩家由 Main Street 一側接近正門；北排建築進屋時 `entry_facing: up`、返回時 `return_facing: down`，南排建築進屋時 `entry_facing: down`、返回時 `return_facing: up`。
- 門前由面向 Main Street 嘅 building edge 到 Main Street 嘅空間係 entrance apron；不得擺樹、燈柱、長櫈、招牌底座或其他 collision props。
- 若畫面存在其他門形裝飾，只可以係非互動裝飾，而且唔可以比正式中央正門更似可入入口。

### 5.3 Canonical building anchors

以下係 Blueprint v1 嘅 canonical 門口位置：

```yaml
building_anchors:
  guild:
    block: A1
    door_anchor: [10, 12]
    approach_point: [10, 14]
    exterior_spawn: [10, 14.5]

  clinic:
    block: A2
    door_anchor: [25, 12]
    approach_point: [25, 14]
    exterior_spawn: [25, 14.5]

  inn:
    block: A3
    door_anchor: [40, 12]
    approach_point: [40, 14]
    exterior_spawn: [40, 14.5]

  equipment_shop:
    block: B1
    frontage: north
    door_anchor: [10, 27]
    approach_point: [10, 25]
    exterior_spawn: [10, 23.5]

  general_store:
    block: B3
    frontage: north
    door_anchor: [40, 27]
    approach_point: [40, 25]
    exterior_spawn: [40, 23.5]
```

所有 doorway threshold 都按 `service_building_template` 由對應 `door_anchor` 同一模板生成，唔為單棟建築另設 magic offset。

## 6. Central Plaza block B2

中央廣場固定佔用 `B2 = [19, 26, 12, 12]`，係一個**完整連續 civic block**。

```yaml
central_plaza:
  rect: [19, 26, 12, 12]
  paved_as_one_space: true
  primary_access:
    north: main_street
  focal_reserve:
    rect: [24, 28, 2, 2]
```

規則：

- 唔可以再拆成幾塊互不連續嘅長方形石地。
- 廣場北側同 Main Street 嘅接駁要係自然完整開口；唔另設平行道路或 avenue。
- `focal_reserve` 可放中央燈龕、噴泉、雕像或其他單一 civic focal point；唔可以塞大型建築。
- focal point 四周必須保留完整可繞行空間。
- 廣場唔應該大到吞噬成座城；`12 × 12` civic block 就係第一階段上限。

## 7. Dressing / vegetation zones

重要結構 100% 由 Blueprint 定死；小型 dressing 保留有限自由度。

### 可自由調整

- 花草、小石、木桶、長櫈、細牌、低矮裝飾。
- 每個 block 內未被 building visual box、entrance apron、道路同 plaza 佔用嘅剩餘空間。

### 半固定規則

- 樹木主要放喺城牆內側、block 外緣或明確綠化角落。
- 正門中心線左右至少 `2 tiles`、由門口向道路方向整條 approach corridor 禁止放任何阻擋物。
- 主城唔放街燈；道路照明由環境 tile、建築窗光及其他合適 dressing 表達。
- 唔使用有白邊、殘底、低品質 alpha cutout 嘅舊樹／prop asset；可見 final art 必須符合 `ART_PIPELINE.md`。

## 8. Entrance / transition runtime rules

- 普通建築使用看得見嘅實體門：`world-to-guild`、`world-to-shop`、`world-to-clinic`、`world-to-general-store`、`world-to-inn`。
- 五個實體門共用精準 tile-authored doorway threshold；只係玩家 feet pivot 真正進入門檻先會入屋，單純經過門旁邊不會被 proximity 吸入。
- 明確點擊門口／共用 bitmap marker 會先行到 authored `approachPoint`，再自然跨過 threshold；點擊附近普通地面只會行去地面目標。
- 東側 passage 是連往 `field` 的 `physical-passage`，不是 magic circle。
- Bitmap 建築的 `doorAnchor` 是門口語意資料；由共用 transition layer 解析，不能退回建築中心點。
- 各服務建築返回位置與面向由 Blueprint anchor + map transition data 明確定義，不以通用像素偏移推算；回程出生點必須位於可見 facade 外側。
- 主城一般不產生普通野外遭遇；特殊戰鬥可明確使用 `town` theme。

## 9. Blueprint authority / runtime ownership

由 Blueprint v1 起，**本文件係 Main Town 結構性 geometry 嘅 canonical design source of truth**。

`maps/main-town.js` 仍然係 runtime implementation owner，但必須照本文件實作以下結構：

- map dimensions；
- block module；
- block allocation；
- road skeleton（只有一條 Main Street）；
- central plaza bounds；
- east-side passage / wall opening geometry；
- service-building standard footprint／door axis；
- canonical building anchors。

`maps/main-town.js` 可以自行擁有以下 exact runtime 細節，而唔需要逐項寫返入本文件：

- 每棵樹／每粒石仔嘅 exact coordinate；
- NPC exact position；
- minor decorative props；
- render-only variation；
- 不改變上述 canonical geometry 嘅細微 visual polish。

如果 runtime implementation 同本 Blueprint 有衝突：

> **Blueprint 優先。**

除非用戶明確批准改變永久主城設計，否則 agent 唔可以以「視覺上覺得更好」為理由自行重排 block、道路、建築、廣場或東門。任何永久 topology／geometry 變更都必須先更新本文件，再同步修改 `maps/main-town.js`。

## 10. Expansion rule

第一階段只實作以上 `3 × 2` blocks，唔需要一開始做到大型首都規模。

日後擴展時：

1. 保留 `12 × 12 tiles` block module。
2. 新增完整 block row／column，而唔係喺舊 block 中間塞多棟建築。
3. 新 block 必須接返現有正交道路骨架。
4. 新主要建築仍然一 block 一棟、同一 visual box、同一 bottom-center entrance template。
5. 如果擴展需要改 map dimensions／現有 block coordinates，先出新版 Blueprint（例如 `blueprint_version: 2`），再改 runtime。

呢套規劃目的係令主城可以由「幾個街區、幾棟建築、一條主要大街」自然擴展成更大型首都，而唔需要每次推倒重來。
