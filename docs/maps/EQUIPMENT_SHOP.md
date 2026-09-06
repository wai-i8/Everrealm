# 銀火裝備店 · Equipment Shop

- `map_id: shop`
- 類型：主城 interior；主題：鍛造／裝備店。
- 目的：購買及比較武器、防具與裝備。

入口由主城南列西側 B1 裝備 block 的實體門連入，`shop-to-world` 以精準 threshold 返回門外安全 spawn；不使用魔法圓陣。武器與防具櫃台、陳列架、鐵砧、試身屏風及鍛爐構成兩側服務區；銀姐、阿月與莎菲提供相應服務。

精確家具、NPC 與 collision 由 `maps/interiors/equipment-shop.js` 定義。
