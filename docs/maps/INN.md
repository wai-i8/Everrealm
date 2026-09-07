# 霧燈旅店 · Inn

- `map_id: inn`
- 類型：主城 interior；主題：旅店／休息空間。
- 目的：休息、恢復與提供旅店服務。

入口由主城北列東側 A3 旅店 block 的實體門連入，`inn-to-world` 以精準 threshold 返回門外安全 spawn；入口及室內出口只使用共用 bitmap 門標記，沒有 legacy 紫色 magic-circle。朵姨站在前台櫃台後；房匙／名冊與行李櫃靠牆組成 guest-service，中央兩側長凳與茶桌形成 lounge，南側兩張床保留作 guest／rest 區，壁爐作休憩焦點而不堵住入口動線。

精確家具、NPC 與 collision 由 `maps/interiors/inn.js` 定義。
