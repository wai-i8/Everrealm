# 霧草療癒所 · Clinic

- `map_id: clinic`
- 類型：主城 interior；主題：草藥療癒所。
- 目的：恢復角色與提供療癒服務。

入口由主城 authored navigation package 的 `Hospital / Clinic` physical-door trigger 連入，`clinic-to-world` 以精準 threshold 返回可見建築外側；不使用魔法圓陣。動線由入口先到配藥／reception 櫃台，再經兩側候診長凳進入南側成對的 treatment 床位；藥草架與藥瓶架沿兩面牆作 medical storage，處置桌留在治療區。小滿在櫃台後兼顧接待與療癒服務，中央通道保持暢通。

精確家具、NPC 與 collision 由 `maps/interiors/clinic.js` 定義。
