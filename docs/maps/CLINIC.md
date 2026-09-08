# 霧草療癒所 · Clinic

- `map_id: clinic`
- 類型：主城 flattened interior；主題：草藥療癒所。
- 目的：恢復角色與提供療癒服務。

入口由主城 authored navigation package 的 `Hospital / Clinic` physical-door trigger 連入，`clinic-to-world` 以 cyan exit region 驗證精準 threshold 返回可見建築外側；不使用魔法圓陣或室內 marker。可見場景由 `assets/hospital/hospital.png` 提供，`assets/hospital/hospital_walkable.png` 只作 authoring source，兩者固定 `1672 × 941`。醫療所護士係 master art 內唯一可見服務 NPC，地圖／互動標籤使用功能角色名；其已建立的對話身份「小滿」只保留於 dialogue layer。runtime 只保留 `clinic-healer-siu-moon` semantic entity；櫃台、候診長凳、治療床、藥草架、藥瓶架及處置桌全由背景提供，唔重畫 procedural props 或 marker。

精確 NPC/service、transition metadata 與 scene wiring 由 `maps/interiors/clinic.js` 定義；像素 walkability 由 `map/hospital-navigation.generated.js`／共用 resolver 提供。

護士服務使用共用 authored-region interaction：由 NPC magenta region 最近點計算 `160 px` reach，點擊命中再加 `18 px` padding。
