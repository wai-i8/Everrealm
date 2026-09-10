# 公會委託系統

本文件是 Everrealm Guild Commission System 的現行設計與資料契約。V1 只提供固定、可重複的討伐與送信委託；公會委託不是限時任務，也不使用程序生成或伺服器配額。

## 委託身份與 V1 目錄

每份委託以穩定 `id` 識別；`star`、`type`、`recommendedLevel`、`repeatable`、`objective` 與 `reward.skill_envelope_star` 由 `data/quests.js` 的中央目錄擁有；`guild-commission-core.js` 只負責 state／accept／progress／report logic。V1 必須而且只可以有以下五份：

| rank | ID | 類型 | 目標 | 推薦等級 | 報酬 |
| --- | --- | --- | --- | --- | --- |
| ☆ | `guild_hunt_chick_1star` | hunt | `monster_id: chick` × 5 | Lv.1 | ☆ 技能書信封 |
| ☆☆ | `guild_delivery_mountain_2star` | delivery | `recipient_npc_id: mountain_delivery_recipient` | Lv.3 | ☆☆ 技能書信封 |
| ☆☆☆ | `guild_hunt_coyote_3star` | hunt | `monster_id: coyote` × 5 | Lv.4 | ☆☆☆ 技能書信封 |
| ☆☆☆☆ | `guild_hunt_bear_4star` | hunt | `monster_id: bear` × 5 | Lv.7 | ☆☆☆☆ 技能書信封 |
| ★ | `guild_hunt_snake_5star` | hunt | `monster_id: snake` × 5 | Lv.8 | ★ 技能書信封 |

推薦等級只作玩家指引，不是額外的接任門檻。`coyote` 是 Monster System 的郊狼，不是 `fox`；其他現有魔物不會因為存在於圖鑑而自動變成委託。

## 類型與流程

討伐委託以 canonical Monster ID 及每次生成的穩定 `instanceId` 記錄擊殺。只有接受後、符合目標 ID 的活躍委託會增加進度；錯誤魔物、接受前擊殺，以及同一個生成實例的重複事件都不計算。多個符合目標的戰鬥單位各自以實例計算一次。

送信委託以 token 形式存在委託 state，不需要佔用一般物品欄。玩家必須到 `field` 與穩定 ID `mountain_delivery_recipient` 互動；只有該 NPC 可以完成目標。地圖／互動標籤及角色對話 speaker 都顯示「山地收件員」；舊個人身份只保留於 internal compatibility data。NPC 使用獨立成年男性山地信使 bitmap，位於遠離主城東門、靠近山路北段的可達區域，精確位置由 `maps/mountain-field.js` 擁有。沒有活躍送信時只顯示 ambient 對話；送信進行中會收信並完成 objective；已送達後只提示玩家回公會回報；錯誤 NPC 或重複點擊不會改變 state。

狀態流程是：

`available → active → ready_to_report → available`

`objectiveCompleted` 與 `deliveryCompleted` 是 state 內的明確旗標；討伐進度達標或送信成功後只會變成 `ready_to_report`，玩家仍要回到 `guild` 向公會回報。回報是一次性、原子操作，會清除活躍委託、增加 cycle，並把一個與委託星級相同的技能書信封加入 state。重複回報不能重複領獎；同一份委託完成回報後會再次出現在固定目錄中。

接受後的委託可在尚未領取報酬前放棄：`active` 或 `ready_to_report` 都可從公會委託卡按下「放棄委託」，並必須先通過遊戲內確認視窗。放棄會清除進度、objective／delivery 完成旗標及擊殺實例，增加 cycle 使舊卡片失效，回到 `available`；不扣金幣、聲望、階級，也不設 cooldown。重新接受必須從 0 開始。已經回報並領取信封的 cycle 沒有可放棄內容。

放棄送信同時移除送信 token；收件人不會接受已放棄的信，`ready_to_report` 也會被清除。放棄不會減少既有信封，且保存／載入後仍維持可用狀態，不會復原舊進度或舊完成旗標。

## 技能書信封

委託只負責發放 `skill_envelope_star: N`，不直接指定技能，也不在 Guild 模組複製 Fighter 星級對照表。玩家在物品欄開啟信封時，`skill-core.js` 會讀取 canonical Fighter skill runtime data 的 acquisition eligibility，查詢同星級 pool，以穩定 seed／serial 作隨機抽取，再透過現有技能書狀態 API 加入對應 `skill_id` 的技能書。

取得技能書與學習技能是兩件事。現有 Fighter 前置條件、職業限制、已學技能的重複書／精通碎片處理仍由 Fighter Skill System 負責；委託系統不繞過這些規則。

## 保存契約

中央 save payload 的 `expansion.guildCommission` 保存：

- `activeCommissionId`、`status`、`progress`
- `objectiveCompleted`、`deliveryCompleted`
- 已計算的擊殺 `countedDefeatIds`
- `cycle`、`rewardClaimed`
- 各星級 `envelopes` 數量與 `envelopeDrawSerial`

載入時會以 state normalizer 修正數字、未知委託與不完整舊資料；active Hunt／Delivery 的進度及 `ready_to_report` 必須原樣保留。放棄後保存的 `available` state 不會復原舊進度；回報後保存的 envelope 數量仍只可消費一次。舊版只有 `activeContracts`／`contractRotation` 的存檔會安全地忽略呢兩個舊欄位並回到可用的 V1 委託板，不會沿用舊的固定金幣／XP／物品獎勵路徑；新存檔不再寫入呢兩個欄位。

## Guild UI 與互動

公會委託頁的正式身份是「公會委託」，不再使用「拾燈公會」作為 Guild branding。頁面及接受後委託卡遵守 summary-first：卡片先讓玩家看見狀態與任務標題，再顯示目標、推薦等級、進度、技能書信封報酬及當下可用的接受／放棄／回報操作；不把長篇教學塞入每張卡片。接受後只顯示當前一份委託，卡片可在桌面及窄畫面內完整容納操作，不依賴固定截圖尺寸。

同一時間只可進行一份委託；目標完成後仍須返公會回報；五份固定委託都可重複接受。這些次要規則由頁首 shared `[i]` 說明入口提供，不在主要委託內容下永久佔位。玩家面向的頁面、卡片、footer 及 help 不得顯示 `canonical Fighter` 等開發者術語；技能池的實作 ownership 仍保留在 Fighter Skill System。

接受、放棄及回報只能在 `guild` 進行；送信只能在山地收件人處完成。完成後公會接待員顯示回報提示，山地收件員則在送信前後使用簡短的狀態對話。放棄確認使用現有 shared modal/window skin，不使用 browser alert。

## 系統 ownership

- 本文件及 `data/quests.js`：委託目錄與固定 objective／reward data；`guild-commission-core.js`：狀態、接受、進度、放棄、回報與信封操作。
- `docs/MONSTER_SYSTEM.md`、`data/monsters.js`、`map/monster-blueprints.js`：canonical Monster ID、等級、屬性、生態與戰鬥資料。
- `docs/FIGHTER_SKILL_TREE.md`、`data/skills/fighter.js`、`skill-core.js`：Fighter skill ID、星級／取得 eligibility、前置與學習規則。
- `docs/BATTLE_SYSTEM.md`：戰鬥單位、擊殺與戰鬥結算。
- `docs/MAP_SYSTEM.md`、`docs/maps/MOUNTAIN_FIELD.md`、`maps/**/*.js`：地圖語意、NPC 穩定 ID 與 exact runtime placement。
- `game.js`：把現有探索／戰鬥／NPC／save UI 接到以上 resolver；不重新建立 Monster 或 Fighter catalog。

V1 不包含收集委託、強者 NPC 對決、Boss 委託、每日／每週期限、聲望／公會階級、procedural generation、server quota 或 6★ 以上內容。
