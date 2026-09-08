# 霧梅爾山地 · Mountain Field

- `map_id: field`
- 類型：山地野外；Biome：`mountain`
- 目的：主城外的野外路線、坑道入口、公會送信與山地遭遇。

## 拓撲

西側連接 `world`。主要路線大致由西向東，後段在山路彎向北，北端連接 `dungeon`。路線以少量清楚的道路與開闊 clearings 組成；路線外大部分空間由密集森林／樹團封閉，不能當作可通行捷徑。

山地敵人配置在 authored route 與 clearings，避免遮蔽主要導航。山地遭遇沿用既有 `mountain` battlefield context；同一張圖的森林密度與道路可讀性是固定 layout 規則。

入口／出口為 `field-to-world`、`field-to-dungeon`；兩者都是正常可達的 physical passage。精確 route、forest mass、enemy spawn、chest 由 `maps/mountain-field.js` 定義，沒有故事封印或額外 gate blocker。

山地另有一名永久 NPC `mountain_delivery_recipient`，地圖／互動標籤為「山地收件員」，作為公會送信委託的收件人。NPC 位於遠離主城東門、靠近山路北段的可達區域；exact runtime 座標只由 `maps/mountain-field.js` 擁有。

該 NPC 使用獨立的成年男性山地信使 bitmap；地圖／互動標籤及普通對話 speaker 都是「山地收件員」，舊個人身份只保留作 internal compatibility metadata，普通對話不使用肖像。沿山路北段駐守在可達的遠端 clearing。位置不在轉場、窄路、敵人 spawn 或碰撞內，玩家必須穿過山地路線才可送信。
# Monster ecology

Runtime enemy spawns use the canonical Monster System IDs: `chick`, `fox`, `raccoon`, `turtle`, `wild_boar`, and `coyote`; the field has no story boss or story-gated spawn. Old IDs are save compatibility aliases only.
