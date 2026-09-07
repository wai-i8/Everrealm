# 霧穀雜貨舖 · General Store

- `map_id: general-store`
- 類型：主城 flattened interior；主題：市集雜貨店。
- 目的：購買日常物品、素材與消耗品。

入口由主城 authored navigation package 的 `Item / General Store` physical-door trigger 連入，`general-store-to-world` 以 cyan exit region 驗證精準 threshold 返回門外安全 spawn；不使用魔法圓陣。可見場景由 `assets/item/item.png` 提供，`assets/item/item_walkable.png` 只作 authoring source，兩者固定 `1672 × 941`。穀嬸係 master art 內唯一可見服務 NPC，runtime 只保留 `store-merchant-gin` semantic entity；貨架、展示桌、貨箱與顧客 aisle 全由背景提供，唔重畫 procedural props 或 marker。

精確 NPC/service、transition metadata 與 scene wiring 由 `maps/interiors/general-store.js` 定義；像素 walkability 由 `map/item-navigation.generated.js`／共用 resolver 提供。
