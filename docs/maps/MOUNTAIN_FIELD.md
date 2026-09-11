# 霧梅爾山地 · Mountain Field

- `map_id: field`
- 類型：山地野外；Biome：`mountain`
- 目的：主城外野外路線、坑道入口、2★「代客許願」互動與 Lv1–27 初中段遭遇。

## 拓撲

西側連接 `world`。主要路線大致由西向東，後段在山路彎向北，北端連接 `dungeon`。路線以少量清楚道路與開闊 clearings 組成；路線外大部分空間由密集森林／樹團封閉，不能當作可通行捷徑。

山地敵人配置在 authored route 與 clearings，避免遮蔽主要導航。山地遭遇沿用既有 `mountain` battlefield context；同一張圖的森林密度與道路可讀性是固定 layout 規則。

入口／出口為 `field-to-world`、`field-to-dungeon`；兩者都是正常可達 physical passage。精確 route、forest mass、enemy spawn 由 `maps/mountain-field.js` 定義；現階段不設寶箱。

## 古怪水池互動

舊山地送信 NPC 已移除。原有 magenta authored semantic region 現改為 invisible interaction `mountain-wish-pool`，代表山地深處的「古怪水池」；runtime 不另外疊畫 NPC 或 marker。2★ 公會委託「代客許願」接受後，玩家到該區互動一次即可完成 objective，再返回公會回報。

該 interaction 使用 authored region 的 approach point／reach，而唔係 NPC sprite centroid。沒有活躍許願委託時只提供 ambient interaction；完成後再次互動只作狀態提示。

山地 runtime 不再擺放道路指示牌。方向可讀性由實際山路、地形邊界、出口與互動目的地本身提供，避免額外 sign props 同 flattened map art 衝突。

## Monster ecology

World spawn 只使用 canonical IDs：`chick` (Lv1)、`fox` (Lv5)、`raccoon` (Lv10)、`wild_boar` (Lv15)、`coyote` (Lv27)。每次進入戰場嘅固定同種數量由 `data/monsters.js -> encounter.count` 決定。舊 monster IDs 只供 save compatibility。

公會討伐目錄中 1★ `chick` 與 3★ `raccoon` 可在山地完成；5★ `frog` 與 7★ `turtle` 由其 canonical 生態／route 導向相應區域，唔因委託而改寫本圖 spawn table。
