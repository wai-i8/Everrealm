# 沉燈坑道 · Mine

- `map_id: dungeon`
- 類型：洞穴／地城；Biome：`cave`
- 目的：Lv21–45 深層探索、寶藏、回音燈 checkpoint 與高階普通怪遭遇。

## 拓撲與進程

坑道採房間與走廊結構：廢棄入口通往回音燈室，再連接沉沒中庭、苔石窟、殘燈迴廊、封存庫及最北側深霧核心。可玩的房間／走廊外由 blocked rock walls 包圍，水窪、石柱與碎岩提供局部阻塞但不切斷主要進程。

入口由山地北端連入，出口 `dungeon-to-field` 返回山地。回音燈龕是 waypoint／save／heal 點；寶箱散佈於各房間，部分由指定普通敵人守住。深霧核心係目前最深處，但**沒有 Boss / Elite encounter**。

精確房間、走廊、家具／裝飾、敵人、寶箱及 spawn 由 `maps/mine.js` 定義。

坑道永久提示 NPC `lost-explorer-kai` 使用「坑道探索者」作地圖／互動標籤，服務為 `dungeon-tip`。

## Monster ecology

World spawn 只使用 canonical IDs：`frog` (Lv21)、`coyote` (Lv27)、`turtle` (Lv33)、`snake` (Lv39)、`bear` (Lv45)。每次進入戰場嘅固定同種數量由 `data/monsters.js -> encounter.count` 決定；map 本身唔 author Boss、Elite 或混合怪隊。
