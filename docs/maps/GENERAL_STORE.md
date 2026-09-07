# 霧穀雜貨舖 · General Store

- `map_id: general-store`
- 類型：主城 interior；主題：市集雜貨店。
- 目的：購買日常物品、素材與消耗品。

入口由主城 authored navigation package 的 `Item / General Store` physical-door trigger 連入，`general-store-to-world` 以精準 threshold 返回門外安全 spawn；不使用魔法圓陣。穀嬸在雜貨櫃台後接待；西側乾貨、東側工具貨架靠牆分組，中央兩張展示桌分別承載乾糧與瓶裝雜貨，南側兩組貨箱作 storage，兩條顧客 aisle 維持從入口到櫃台的可讀動線。

精確家具、NPC 與 collision 由 `maps/interiors/general-store.js` 定義。
