# 霧燈旅店 · Inn

- `map_id: inn`
- 類型：主城 flattened interior；主題：旅店／休息空間。
- 目的：休息、恢復與提供旅店服務。

入口由主城 authored navigation package 的 `Inn` physical-door trigger 連入，`inn-to-world` 以 cyan exit region 驗證精準 threshold 返回門外安全 spawn；不使用魔法圓陣或室內 marker。可見場景由 `assets/inn/inn.png` 提供，`assets/inn/inn_walkable.png` 只作 authoring source，兩者固定 `1672 × 941`。旅館接待員係 master art 內唯一可見服務 NPC，地圖／互動標籤使用功能角色名；其已建立的對話身份「朵姨」只保留於 dialogue layer。runtime 只保留 `inn-keeper` semantic entity；前台、房匙／名冊、行李櫃、lounge、床位及壁爐全由背景提供，唔重畫 procedural props 或 marker。

精確 NPC/service、transition metadata 與 scene wiring 由 `maps/interiors/inn.js` 定義；像素 walkability 由 `map/inn-navigation.generated.js`／共用 resolver 提供。
