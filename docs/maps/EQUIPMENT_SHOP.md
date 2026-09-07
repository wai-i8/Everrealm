# 銀火裝備店 · Equipment Shop

- `map_id: shop`
- 類型：主城 flattened interior；主題：鍛造／裝備店。
- 目的：購買及比較武器、防具與裝備。

入口由主城 authored navigation package 的 `Weapon Shop` physical-door trigger 連入，`shop-to-world` 以 cyan exit region 驗證精準 threshold 返回門外安全 spawn；不使用魔法圓陣。可見場景由 `assets/weapon/weapon.png` 提供，`assets/weapon/weapon_walkable.png` 只作 authoring source，兩者固定 `1672 × 941`。銀姐係 master art 內唯一可見服務 NPC，runtime 只保留 `merchant-gin` semantic entity；sales counter、刀劍／護甲架、試身屏風、人偶、鐵砧及鍛爐全由背景提供，唔重畫 procedural props 或 marker。

精確 NPC/service、transition metadata 與 scene wiring 由 `maps/interiors/equipment-shop.js` 定義；像素 walkability 由 `map/weapon-navigation.generated.js`／共用 resolver 提供。
