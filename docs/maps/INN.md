# 霧燈旅店 · Inn

- `map_id: inn`
- 類型：主城 interior；主題：旅店／休息空間。
- 目的：休息、恢復與提供旅店服務。

入口由主城東南旅店街的實體門連入，`inn-to-world` 以精準 threshold 返回門外安全 spawn；入口及室內出口只使用共用 bitmap 門標記，沒有 legacy 紫色 magic-circle。旅店櫃台是服務點；名冊、兩張客房床、餐桌、壁爐與旅店旗幟建立房間角色。朵姨是主要服務 NPC。

精確家具、NPC 與 collision 由 `maps/interiors/inn.js` 定義。
