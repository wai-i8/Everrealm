# 霧草療癒所 · Clinic

- `map_id: clinic`
- 類型：主城 interior；主題：草藥療癒所。
- 目的：恢復角色與提供療癒服務。

入口由主城北側療癒所的實體門連入，`clinic-to-world` 以精準 threshold 返回可見建築外側；不使用魔法圓陣。配藥櫃台是服務核心，藥草架、藥瓶架、療癒床與曬草桌構成房間用途；小滿是主要療癒 NPC。

精確家具、NPC 與 collision 由 `maps/interiors/clinic.js` 定義。
