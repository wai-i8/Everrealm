# 欣梅爾山地南部 · Mountain South

- `map_id: mountain-south`
- 類型：山地野外；Biome：`mountain`
- 可見 master：`assets/field/vanmer-mountains-south.jpg`
- Authoring navigation：`assets/field/vanmer-mountains-south_walkable.png`

## 拓撲

東面 authored cyan passage 雙向連接 `dungeon`（欣梅爾山地東南部）西面 cyan passage。兩邊 cyan 只係 transition trigger；玩家到達另一張圖時必須落在相鄰白色道路的安全 spawn，而不是 cyan 區內。

北面 cyan passage 現階段保留作未來連接，不建立 runtime transition。

## Navigation

南部使用 flattened mountain contract：master JPEG 係唯一玩家可見環境；同尺寸 PNG 只作 authoritative navigation。白色主道路可行、兩個 cyan passage 可行並提供出口語意、其他位置全部 blocked。小地圖使用同一個 flattened background scene，同主地圖共享座標，玩家 marker 必須跟玩家位置而唔係固定喺地圖中心。
