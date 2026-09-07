# 霧都主城 · Main Town

- `map_id: world`
- 類型：主城／服務型探索地圖；Biome：`town`
- runtime owner：`maps/main-town.js`
- navigation package：`assets/main-town/main-town-navigation.json`

## 1. Final authored package

主城嘅最終視覺與導航以同一套 authored package 為準：

```yaml
source:
  width: 1536
  height: 1152
  tile_size_px: 32
  coordinate_system: original image pixels; origin top-left; x right, y down
rendering: flattened; no foreground or depth sorting
movement:
  walkable: assets/main-town/main-town-walkable-mask.png
  collision: assets/main-town/main-town-collision-mask.png
  triggers: assets/main-town/main-town-trigger-mask.png
  feet_radius_px: 3
```

`main-town-final.png` 係完整 flattened master art；建築、道路、城牆、植被同其他環境視覺已經烘焙入圖。runtime 唔應再用舊 house／tree／tile primitive 疊畫同一批主城視覺。

導航規則係：玩家 feet disk 必須完全留喺 walkable mask 白色 allowlist 之內；collision mask 只係 supplemental solid objects，唔係完整 blocked map，亦唔可以由 collision mask inversion 推算可行走區域。所有矩形採 half-open `[x,x+width), [y,y+height)`。

## 2. Navigation package files

以下檔案必須保持同一個 `1536 × 1152` source canvas：

- `assets/main-town/main-town-final.png` — final flattened master art
- `assets/main-town/main-town-walkable-mask.png` — binary walkable allowlist
- `assets/main-town/main-town-collision-mask.png` — binary supplemental collision
- `assets/main-town/main-town-trigger-mask.png` — binary doorway／east-exit review mask
- `assets/main-town/main-town-navigation-review.png` — 人工檢查 overlay
- `assets/main-town/main-town-navigation.json` — authored coordinates、connectivity、QA metadata
- `map/main-town-navigation.js` — browser-loadable projection，供同步 map registry 使用

`maps/main-town.js` 只負責將 package 接入既有 map／transition API；唔應複製另一套主城 geometry。mask 圖片載入前可以使用 compatibility tile data 建立 map shape，但 runtime movement 一旦 mask ready，就必須使用 package mask。

## 3. Authored building entrances

五個服務入口都係實體 `physical-door`。以下數值全部係原圖 pixel 座標；`trigger` 同 `threshold` 使用同一個 authored rectangle，`example_anchor` 係 connectivity analysis 中已驗證可到達嘅 feet anchor。

| 服務 | runtime portal | doorway center x | trigger / threshold `[x,y,w,h]` | example anchor |
| --- | --- | ---: | --- | --- |
| 銀火裝備店 | `world-to-shop` | 378 | `[358,427,40,8]` | `[358,430]` |
| 拾燈公會 | `world-to-guild` | 687 | `[665,350,44,8]` | `[665,353]` |
| 霧草療癒所 | `world-to-clinic` | 1016 | `[996,430,40,8]` | `[996,433]` |
| 霧穀雜貨舖 | `world-to-general-store` | 378 | `[358,766,40,8]` | `[358,769]` |
| 霧燈旅店 | `world-to-inn` | 1004 | `[984,768,40,8]` | `[984,772]` |

規則：

- 建築係 master art 入面嘅 semantic doorway data；唔再以舊 bitmap footprint 或建築中心點推導入口。
- 玩家必須以有效 feet anchor 進入 authored trigger；行過門旁邊唔會被 proximity 吸入。
- 點擊門附近時，探索 path 先行到 authored connectivity anchor，再由 physical threshold 觸發入屋。
- transition layer 必須保留 exact `trigger`、`threshold`、`approachPoint`、`entryFacing`、`returnFacing` 及 interior spawn contract。
- 五個服務入口分別連到既有 `guild`、`shop`、`clinic`、`general-store`、`inn` interior map；回程由 `*-to-world` physical exit 處理。

## 4. East passage

東側對外出口係唯一 authored outdoor exit：

```yaml
id: world-to-field
interaction_mode: passage
transition_type: physical-passage
trigger: [1180, 518, 12, 28]
destination: field
target_spawn: westGate
direction: east
```

出口係 master art 中嘅實體路口／城牆開口，唔使用 magic-circle VFX，亦唔需要另畫大型 gate façade。trigger 只負責 transition activation；movement 仍然先由 walkable feet-disk resolver 驗證。

## 5. Semantic runtime objects

以下物件仍然由 `maps/main-town.js` 暴露，供既有 UI、quest、interaction 同 transition code 使用：

- `npcs`：阿澄、鐵叔、草姨；
- `shrine`：中央燈龕；
- `boards`：`harbour-gate-deck-console`，連接 `deck-loadout`；
- `houses`：五個 service doorway semantic records；
- `portals`／`exits`：五個 physical doors 加 `world-to-field` passage；
- `enemySpawns`：空陣列；主城一般唔產生普通野外遭遇。

呢啲 semantic records 可以有 exact gameplay coordinates，但唔應將 render-only object 當成第二套地圖視覺。主城如需特殊戰鬥，必須明確指定 `town` battle theme。

## 6. Ownership and change rule

- package 內嘅 source dimensions、walkable／collision／trigger masks、building rectangles、east exit 同 connectivity metadata 係本地 authored source of truth。
- `docs/MAP_SYSTEM.md` 只保留 map-system 層級規則；本文件負責主城 package contract。
- `maps/main-town.js` 負責 runtime object shape、map registry compatibility、portal linkage，同 package 座標接駁。
- `game.js`／`character-art.js` 負責使用 shared mask movement、flattened rendering、minimap rendering；唔應重新發明主城碰撞或入口座標。
- 如果要改主城永久 geometry，必須同時更新 package assets、JSON、browser projection、runtime owner、相關測試及本文件，並重新做 automated／runtime／visual QA。
