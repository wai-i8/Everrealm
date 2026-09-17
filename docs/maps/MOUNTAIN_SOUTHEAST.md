# 欣梅爾山地東南部 · Mountain Southeast

- `map_id: mountain-southeast`
- Runtime: `maps/mountain-southeast.js`
- 背景：`assets/field/vanmer-mountains-2.jpg`
- Walkable authoring：`assets/field/vanmer-mountains-2_walkable.png`
- 目的：Lv21–45 山地探索與中後段普通怪遭遇。

地圖使用 authored mountain-road scene，同第一張山地一樣由 walkable mask 決定可行區域，並直接沿用現行山地探索／戰鬥流程。

南端 passage 雙向連接 `field`，西側 passage 雙向連接 `mountain-south`。兩邊 passage 都由 server authoritative map transition 驗證位置及 arrival point。

目前主要怪物包括沼澤蛙、灰原郊狼、苔甲龜及噴毒蛇；精確 spawn、route、navigation package 以 `maps/mountain-southeast.js` 為準。
