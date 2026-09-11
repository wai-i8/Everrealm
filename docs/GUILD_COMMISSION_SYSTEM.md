# 公會委託系統

本文件是 Everrealm Guild Commission System 的現行設計與資料契約。V1 只提供固定、可重複的討伐與「代客許願」委託；公會委託不是限時任務，也不使用程序生成或伺服器配額。

## 委託身份與 V1 目錄

每份委託以穩定 `id` 識別；`star`、`type`、`recommendedLevel`、`repeatable`、`objective` 與 `reward.skill_envelope_star` 由 `data/quests.js` 的中央目錄擁有；`guild-commission-core.js` 只負責 state／accept／progress／report logic。V1 必須而且只可以有以下五份，沒有 4★ 或 6★：

| 星級 | ID | 類型 | 目標 | 推薦等級 | 報酬 |
| --- | --- | --- | --- | --- | --- |
| 1★ | `guild_hunt_chick_1star` | hunt | `monster_id: chick` × 5 | Lv.1 | 1★ 技能書信封 |
| 2★ | `guild_wish_pool_2star` | wish | `interaction_id: mountain-wish-pool` × 1 | Lv.3 | 2★ 技能書信封 |
| 3★ | `guild_hunt_raccoon_3star` | hunt | `monster_id: raccoon` × 5 | Lv.10 | 3★ 技能書信封 |
| 5★ | `guild_hunt_frog_5star` | hunt | `monster_id: frog` × 5 | Lv.21 | 5★ 技能書信封 |
| 7★ | `guild_hunt_turtle_7star` | hunt | `monster_id: turtle` × 5 | Lv.33 | 7★ 技能書信封 |

推薦等級只作玩家指引，不是額外的接任門檻。其他現有魔物不會因為存在於圖鑑而自動變成委託。

## 類型與流程

討伐委託以 canonical Monster ID 及每次生成的穩定 `instanceId` 記錄擊殺。只有接受後、符合目標 ID 的活躍委託會增加進度；錯誤魔物、接受前擊殺，以及同一個生成實例的重複事件都不計算。多個符合目標的戰鬥單位各自以實例計算一次。

2★「代客許願」使用山地 authored magenta semantic region，runtime ID 為 `mountain-wish-pool`。玩家接受委託後到山地深處的古怪水池互動一次即可完成 objective；該互動不是 NPC，亦不需要物品 token。玩家文案固定為：

> 有位居民堅信山地深處嗰個古怪水池非常靈驗。只不過……今日佢唔想行咁遠，所以決定請冒險者代佢許願。

舊 `mountain_delivery_recipient` 山地送信 NPC 與送信委託不再屬現行 V1 地圖／目錄。沒有活躍許願委託時，水池只提供簡短 ambient interaction；委託完成後再次互動只提示已經許願並叫玩家返公會回報。

狀態流程是：

`available → active → ready_to_report → available`

`objectiveCompleted` 與 `interactionCompleted` 是現行 objective state 旗標；討伐進度達標或許願互動成功後只會變成 `ready_to_report`，玩家仍要回到 `guild` 向公會回報。回報是一次性、原子操作，會清除活躍委託、增加 cycle，並把一個與委託星級相同的技能書信封加入 state。重複回報不能重複領獎；同一份委託完成回報後會再次出現在固定目錄中。

接受後的委託可在尚未領取報酬前放棄：`active` 或 `ready_to_report` 都可從公會委託卡按下「放棄委託」，並必須先通過遊戲內確認視窗。放棄會清除進度、objective／interaction 完成旗標及擊殺實例，增加 cycle 使舊卡片失效，回到 `available`；不扣金幣、聲望、階級，也不設 cooldown。重新接受必須從 0 開始。已經回報並領取信封的 cycle 沒有可放棄內容。

## 技能書信封

委託只負責發放 `skill_envelope_star: N`，不直接指定技能，也不在 Guild 模組複製 Fighter 星級對照表。玩家在物品欄開啟信封時，`skill-core.js` 會讀取 canonical Fighter skill runtime data 的 acquisition eligibility，查詢同星級 pool，以穩定 seed／serial 作隨機抽取，再透過現有技能書狀態 API 加入對應 `skill_id` 的技能書。7★ 同樣必須可以正常抽取 Fighter 7★ 技能書。

取得技能書與學習技能是兩件事。現有 Fighter 前置條件、職業限制、已學技能的重複書／精通碎片處理仍由 Fighter Skill System 負責；委託系統不繞過這些規則。

## 保存契約

中央 save payload 的 `expansion.guildCommission` 保存：

- `activeCommissionId`、`status`、`progress`
- `objectiveCompleted`、`interactionCompleted`
- 已計算的擊殺 `countedDefeatIds`
- `cycle`、`rewardClaimed`
- 1／2／3／5／7★ `envelopes` 數量與 `envelopeDrawSerial`

載入時會以 state normalizer 修正數字、未知委託與不完整舊資料；active Hunt／Wish 的進度及 `ready_to_report` 必須原樣保留。舊 save 若仍帶有 legacy delivery 欄位可被 normalizer 安全容忍，但現行 catalog、UI 與地圖不再產生送信流程。放棄後保存的 `available` state 不會復原舊進度；回報後保存的 envelope 數量仍只可消費一次。

## Guild UI 與互動

公會委託頁的正式身份是「公會委託」。頁面及接受後委託卡遵守 summary-first：卡片先讓玩家看見狀態與任務標題，再顯示目標、推薦等級、進度、技能書信封報酬及當下可用的接受／放棄／回報操作；不把長篇教學塞入每張卡片。接受後只顯示當前一份委託，卡片高度由內容決定，不用固定大框製造多餘留白。

委託列表使用深色/navy content card、克制暖金邊框與 cream 文字；action button 不使用大面積金色填滿配黑字。放棄委託確認視窗保持 compact，清楚顯示會失去目前進度，但不放巨型裝飾 icon 或無用途空白。所有 shared major popup／modal 都遵守 UI System 的 mouse／touch draggable contract，而且 overlay 不 blur 遊戲背景。

同一時間只可進行一份委託；目標完成後仍須返公會回報；五份固定委託都可重複接受。這些次要規則由頁首 shared `[i]` 說明入口提供，不在主要委託內容下永久佔位。

接受、放棄及回報只能在 `guild` 進行；2★ objective 只能在山地 `mountain-wish-pool` 完成；討伐 objective 則由戰鬥擊殺事件更新。放棄確認使用現有 shared modal/window skin，不使用 browser alert。

## 系統 ownership

- 本文件及 `data/quests.js`：委託目錄與固定 objective／reward data；`guild-commission-core.js`：狀態、接受、進度、放棄、回報與信封操作。
- `docs/MONSTER_SYSTEM.md`、`data/monsters.js`、`map/monster-blueprints.js`：canonical Monster ID、等級、屬性、生態與戰鬥資料。
- `docs/FIGHTER_SKILL_TREE.md`、`data/skills/fighter.js`、`skill-core.js`：Fighter skill ID、星級／取得 eligibility、前置與學習規則。
- `docs/BATTLE_SYSTEM.md`：戰鬥單位、擊殺與戰鬥結算。
- `docs/MAP_SYSTEM.md`、`docs/maps/MOUNTAIN_FIELD.md`、`maps/**/*.js`：地圖語意、interaction 穩定 ID 與 exact runtime placement。
- `game.js`：把現有探索／戰鬥／interaction／save UI 接到以上 resolver；不重新建立 Monster 或 Fighter catalog。

V1 不包含收集委託、強者 NPC 對決、Boss 委託、每日／每週期限、聲望／公會階級、procedural generation、server quota 或固定 1／2／3／5／7★ 以外的額外委託星級。
