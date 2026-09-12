# 霧穀雜貨舖 · General Store

- `map_id: general-store`
- 類型：主城 flattened interior；主題：市集雜貨店。
- 目的：購買少量基礎消耗品；V1 暫不售賣素材。

入口由主城 authored navigation package 的 `Item / General Store` physical-door trigger 連入，`general-store-to-world` 以 cyan exit region 驗證精準 threshold 返回門外安全 spawn；不使用魔法圓陣。可見場景由 `assets/item/item.png` 提供，`assets/item/item_walkable.png` 只作 authoring source，兩者固定 `2508 × 2508`，runtime 直接使用原生 pixel coordinate space。道具店店員係 master art 內唯一可見服務 NPC，地圖／互動標籤及普通對話 speaker 都使用功能角色名；舊個人身份只保留作 internal compatibility metadata，普通對話不使用肖像。runtime 只保留 `store-merchant-gin` semantic entity；貨架、展示桌、貨箱與顧客 aisle 全由背景提供，唔重畫 procedural props 或 marker。

精確 NPC/service、transition metadata 與 scene wiring 由 `maps/interiors/general-store.js` 定義；像素 walkability 由 `map/item-navigation.generated.js`／共用 resolver 提供。

店員服務使用共用 authored-region interaction：`1672 × 941` 基準為 `160 px` reach／`18 px` hit padding；本場景 `2508 × 2508` 依 source scale 使用 `240 px` reach／`27 px` hit padding，距離由 NPC magenta region 最近點計算。


## V1 商品與介面

道具店直接沿用武器店嘅 shop layout／操作語言，但因 V1 只有兩件貨品，所以唔顯示分類 tabs：

| 商品 | 效果 | 售價 |
| --- | --- | ---: |
| 小型回復藥 | 使用後回復 30 HP | 30 金幣 |
| 弱氣之藥 | 低等級怪遇見率輔助效果；500 虛擬步 | 200 金幣 |

弱氣之藥 runtime effect 以實際 world movement distance 計算：`32 world px = 1 步`，總共 500 步（16,000 world px）。
撞牆而實際位置冇移動唔計；teleport／map transition 唔計；玩家登出即清除效果。行滿 500 步時顯示短暫中央提示
「弱氣之藥的效果已經消失」。未來隨機遇怪啟用後，正常玩家高怪 0–4 Lv 為 100% encounter multiplier，
高 5/6/7/8/9 Lv 分別為 80/60/40/20/10%，高 10 Lv 或以上為 0%；弱氣之藥生效期間把低等級怪 encounter multiplier 恢復為 100%。

## 弱氣之藥 presentation

`弱氣之藥` uses a dedicated standalone transparent icon at `assets/items/weak-potion-v1.png`; it must not reuse the red healing-potion atlas slot. Player-facing shop/inventory copy is intentionally lore-first instead of exposing implementation units such as `world px`:

> 一瓶來歷可疑的藥氣之藥。據說喝下後會令人變得孱弱，但身上散出的怪味，卻會令附近魔物蠢蠢欲動。

The underlying 500-step runtime rule above remains unchanged.
