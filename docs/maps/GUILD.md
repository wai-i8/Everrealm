# 公會 · Guild

- `map_id: guild`
- 類型：主城 flattened interior；主題：暖色公會大廳。
- 目的：委託、回報、聲望與技能書服務。

入口由主城 authored navigation package 的 `Guild` physical-door trigger 連入，出口 `guild-to-world` 以 cyan exit region 驗證同一套精準 physical-door threshold，返回對應門外 spawn；不使用魔法圓陣。可見場景由 `assets/guild/guild.png` 提供，`assets/guild/guild_walkable.png` 只作 authoring source，兩者固定 `1672 × 941`。公會接待員係 master art 內唯一可見服務 NPC，地圖／互動標籤使用功能角色名；其已建立的對話身份「妍姐」只保留於 dialogue layer。runtime 只保留 `guildmaster-yin` semantic entity；西側公會委託資料板保留為隱藏 metadata，供委託系統查詢。家具、書架、長桌及中央動線都已烘焙入背景，唔重畫 procedural props 或 marker。

精確 NPC/service、transition metadata 與 scene wiring 由 `maps/interiors/guild.js` 定義；像素 walkability 由 `map/guild-navigation.generated.js`／共用 resolver 提供。

接待員服務使用共用 authored-region interaction：由 NPC magenta region 最近點計算 `160 px` reach，點擊命中再加 `18 px` padding。
