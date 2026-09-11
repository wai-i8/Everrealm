# 霧草療癒所 · Clinic

- `map_id: clinic`
- 類型：主城 flattened interior；主題：草藥療癒所。
- 目的：恢復角色與提供療癒服務。

入口由主城 authored navigation package 的 `Hospital / Clinic` physical-door trigger 連入，`clinic-to-world` 以 cyan exit region 驗證精準 threshold 返回可見建築外側；不使用魔法圓陣或室內 marker。可見場景由 `assets/hospital/hospital.png` 提供，`assets/hospital/hospital_walkable.png` 只作 authoring source，兩者固定 `1672 × 941`。護士係 master art 內唯一可見服務 NPC，地圖／互動標籤及普通對話 speaker 都使用功能角色名；舊個人身份只保留作 internal compatibility metadata，普通對話不使用肖像。runtime 只保留 `clinic-healer-siu-moon` semantic entity；櫃台、候診長凳、治療床、藥草架、藥瓶架及處置桌全由背景提供，唔重畫 procedural props 或 marker。

精確 NPC/service、transition metadata 與 scene wiring 由 `maps/interiors/clinic.js` 定義；像素 walkability 由 `map/hospital-navigation.generated.js`／共用 resolver 提供。

護士服務使用共用 authored-region interaction：由 NPC magenta region 最近點計算 `160 px` reach，點擊命中再加 `18 px` padding。


## 護士服務

玩家點擊／接近 `clinic-healer-siu-moon` 後，如 HP 未滿，護士先以簡化 NPC dialogue 詢問是否治療；只有玩家確認後先免費把 HP 回復到目前上限並記錄「HP 已完全恢復」。如 HP 已滿，只提示目前毋須治療並繼續旅程，不能在點擊護士的一刻先偷偷回血。
醫院服務唔收金幣。護士 semantic hit target 要對準 master art 可見護士，並提供可行走 `approachPoint`；點擊護士不可落入普通 blocked-ground click，避免顯示「嗰邊行唔到」。
