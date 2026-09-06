# 霧穀雜貨舖 · General Store

- `map_id: general-store`
- 類型：主城 interior；主題：市集雜貨店。
- 目的：購買日常物品、素材與消耗品。

入口由主城南列東側 B3 雜貨 block 的實體門連入，`general-store-to-world` 以精準 threshold 返回門外安全 spawn；不使用魔法圓陣。雜貨櫃台、乾貨／工具貨架、材料展示桌與待入庫材料區分出店內動線；穀嬸是服務 NPC。

精確家具、NPC 與 collision 由 `maps/interiors/general-store.js` 定義。
