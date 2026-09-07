# 拾燈公會 · Guild

- `map_id: guild`
- 類型：主城 interior；主題：暖色公會大廳。
- 目的：委託、回報、聲望與技能書服務。

入口由主城的拾燈公會實體門連入，出口 `guild-to-world` 以同一套精準 physical-door threshold 返回對應門外 spawn；不使用魔法圓陣。室內由入口通往中央接待／行政區，妍姐與阿寶在櫃台後處理公會服務；西側委託板是獨立的 notice／commission 區。兩側書架靠牆形成 archive／storage，南側三張有組織的長桌與冒險者組成 waiting／lounge，中央保留直達櫃台的清楚動線。

精確家具、NPC 與 collision 由 `maps/interiors/guild.js` 定義。
