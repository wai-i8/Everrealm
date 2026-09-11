# 霧燈旅店 · Inn

- `map_id: inn`
- 類型：主城 flattened interior；主題：旅店／休息空間。
- 目的：暫作旅館場景與 NPC 對話；正式旅店／任務功能尚未開放。

入口由主城 authored navigation package 的 `Inn` physical-door trigger 連入，`inn-to-world` 以 cyan exit region 驗證精準 threshold 返回門外安全 spawn；不使用魔法圓陣或室內 marker。可見場景由 `assets/inn/inn.png` 提供，`assets/inn/inn_walkable.png` 只作 authoring source，兩者固定 `1672 × 941`。旅館接待員係 master art 內唯一可見服務 NPC，地圖／互動標籤及普通對話 speaker 都使用功能角色名；舊個人身份只保留作 internal compatibility metadata，普通對話不使用肖像。runtime 只保留 `inn-keeper` semantic entity；前台、房匙／名冊、行李櫃、lounge、床位及壁爐全由背景提供，唔重畫 procedural props 或 marker。

精確 NPC/service、transition metadata 與 scene wiring 由 `maps/interiors/inn.js` 定義；像素 walkability 由 `map/inn-navigation.generated.js`／共用 resolver 提供。

接待員服務使用共用 authored-region interaction：由 NPC magenta region 最近點計算 `160 px` reach，點擊命中再加 `18 px` padding。


## V1 暫未營業

現階段旅館唔提供住宿、回血或其他 service action。玩家與 `inn-keeper` 對話只顯示：

> 歡迎來到旅館！不過我哋仲準備緊，暫時未正式營業呢。

對話係單向訊息，唔顯示「1. 住一晚」「2. 再諗下」或費用括號等舊選項；正式髮型／任務／旅店功能留待之後加入。
