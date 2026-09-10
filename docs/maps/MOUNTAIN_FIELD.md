# 霧梅爾山地 · Mountain Field

- `map_id: field`
- 類型：山地野外；Biome：`mountain`
- 目的：主城外野外路線、坑道入口、公會送信與 Lv1–27 初中段遭遇。

## 拓撲

西側連接 `world`。主要路線大致由西向東，後段在山路彎向北，北端連接 `dungeon`。路線以少量清楚道路與開闊 clearings 組成；路線外大部分空間由密集森林／樹團封閉，不能當作可通行捷徑。

山地敵人配置在 authored route 與 clearings，避免遮蔽主要導航。山地遭遇沿用既有 `mountain` battlefield context；同一張圖的森林密度與道路可讀性是固定 layout 規則。

入口／出口為 `field-to-world`、`field-to-dungeon`；兩者都是正常可達 physical passage。精確 route、forest mass、enemy spawn、chest 由 `maps/mountain-field.js` 定義。

山地永久 NPC `mountain_delivery_recipient` 為「山地收件員」，位於遠離主城、靠近北段山路嘅可達 clearing，作為公會送信委託收件人。

## Monster ecology

World spawn 只使用 canonical IDs：`chick` (Lv1)、`fox` (Lv5)、`raccoon` (Lv10)、`wild_boar` (Lv15)、`coyote` (Lv27)。每次進入戰場嘅固定同種數量由 `data/monsters.js -> encounter.count` 決定。舊 monster IDs 只供 save compatibility。
