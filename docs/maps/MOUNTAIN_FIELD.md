# 霧梅爾山地 · Mountain Field

- `map_id: field`
- 類型：山地野外；Biome：`mountain`
- 目的：主城外的野外路線、霧晶收集、坑道入口與山地遭遇。

## 拓撲

西側連接 `world`。主要路線大致由西向東，後段在山路彎向北，北端連接 `dungeon`。路線以少量清楚的道路與開闊 clearings 組成；路線外大部分空間由密集森林／樹團封閉，不能當作可通行捷徑。

山地敵人配置在 authored route 與 clearings，避免遮蔽主要導航。山地遭遇沿用既有 `mountain` battlefield context；同一張圖的森林密度與道路可讀性是固定 layout 規則。

入口／出口為 `field-to-world`、`field-to-dungeon`；精確 route、forest mass、enemy spawn、chest 與 gate 由 `maps/mountain-field.js` 定義。
# Monster ecology

Runtime enemy spawns use the canonical Monster System IDs: `chick`, `fox`, `raccoon`, `turtle`, `wild_boar`, and `coyote`; the story gatekeeper is a `bear` spawn with map-owned `mainBoss: true`. Old IDs are save compatibility aliases only.
