# 沉燈坑道 · Mine

- `map_id: dungeon`
- 類型：洞穴／地城；Biome：`cave`
- 目的：沉燈坑道的探索、寶藏、回音燈 checkpoint 與 boss progression。

## 拓撲與進程

坑道採房間與走廊結構：廢棄入口通往回音燈室，再連接沉沒中庭、苔石窟、殘燈迴廊、封存庫及最北側深霧核心。可玩的房間／走廊外由 blocked rock walls 包圍，水窪、石柱與碎岩提供局部阻塞但不切斷主要進程。

入口由山地北端連入，出口 `dungeon-to-field` 返回山地。回音燈龕是目前 waypoint／save／heal 點；寶箱散佈於苔石窟、封存庫、迴廊及 boss 區，部分由指定敵人鎖定。深霧看守者所在的 boss chamber 是主要終點。

精確房間、走廊、家具／裝飾、敵人、寶箱及 spawn 由 `maps/mine.js` 定義。

坑道內的永久提示 NPC `lost-explorer-kai` 使用「坑道探索者」作為地圖／互動標籤；對話肖像保留已建立的個人身份「露娜」。其服務為 `dungeon-tip`，只提供路線與回音燈提示。
# Monster ecology

Runtime enemy spawns use `raccoon`, `frog`, `wild_boar`, `turtle`, `snake`, and `bear`. The final bear is a map-owned boss flag, while species combat and reward data remain in `map/monster-blueprints.js`.
