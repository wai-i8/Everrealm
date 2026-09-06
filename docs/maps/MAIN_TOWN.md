# 霧都主城 · Main Town

- `map_id: world`
- 類型：主城／服務型探索地圖；Biome：`town`
- 目的：提供任務、拾燈公會、裝備、療癒、雜貨、旅店及戰技面板等主要服務。

## 結構與導航

44×30 的城牆格局以中央燈龕廣場作空間核心；廣場縮成可停留的 civic room，主路由西側入城、穿過廣場後一路向東門，南北支路再分流到各服務門口。北側為療癒街，西南為工坊街，南側為市集，東南為旅店街。

重要地標包括中央燈龕、城門戰技面板台、拾燈公會、銀火裝備店、霧草療癒所、霧穀雜貨舖、霧燈旅店及東門。

## 入口與規則

- 普通建築使用看得見的實體門：`world-to-guild`、`world-to-shop`、`world-to-clinic`、`world-to-general-store`、`world-to-inn`。
- 五個實體門共用精準 tile-authored doorway threshold；只係玩家 feet pivot 真正進入門檻先會入屋，單純經過門旁邊不會被 proximity 吸入。
- 明確點擊門口／共用 bitmap marker 會先行到 authored `approachPoint`，再自然跨過 threshold；點擊附近普通地面只會行去地面目標。
- 東門是連往 `field` 的 `physical-gate`，不是 magic circle；東側城牆使用偏側面的 `town-gate-east-v1.png`，城牆由左向右收束，開口與主路同向伸向東側邊界。
- Bitmap 建築的 `doorAnchor` 是門口語意資料；由共用 transition layer 解析，不能退回建築中心點。
- 各服務建築的城外返回位置與面向由 `spawnPoints`、`spawnFacings` 及 `transitionLinks.returnSpawn` 明確定義，不以通用像素偏移推算；回程出生點位於可見 facade 外側。
- 街燈應在道路／廣場邊緣，不放在路線中心線；樹木與 props 用來框住導航，不製造隨機阻塞。樹木統一使用清理後的 `environment-atlas-v5.png`，集中在城牆與街區邊緣。
- 主城一般不產生普通野外遭遇；特殊戰鬥可明確使用 `town` theme。

精確 tile、物件、NPC、spawn 與 layout 由 `maps/main-town.js` 定義；本文件只保存語意與永久視覺／導航規則。
