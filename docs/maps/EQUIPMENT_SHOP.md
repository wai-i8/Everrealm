# 銀火裝備店 · Equipment Shop

- `map_id: shop`
- 類型：主城 interior；主題：鍛造／裝備店。
- 目的：購買及比較武器、防具與裝備。

入口由主城 authored navigation package 的 `Weapon Shop` physical-door trigger 連入，`shop-to-world` 以精準 threshold 返回門外安全 spawn；不使用魔法圓陣。左右兩個 sales counter 由銀姐與阿月分別在櫃台後服務；刀劍架與護甲架沿牆放置，中央石地作清楚的 customer route，試身屏風及人偶作防具 showcase，鐵砧／鍛爐集中在後側 work／storage 區，莎菲在該區工作。

精確家具、NPC 與 collision 由 `maps/interiors/equipment-shop.js` 定義。
