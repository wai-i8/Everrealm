# 公會委託系統

本文件是 Everrealm Guild Commission System 的現行設計與資料契約。V1 只提供固定、可重複的討伐與送信委託；公會委託不是限時任務，也不使用程序生成或伺服器配額。

## 委託身份與 V1 目錄

每份委託以穩定 `id` 識別；`star`、`type`、`recommendedLevel`、`repeatable`、`objective` 與 `reward.skill_envelope_star` 由 `guild-commission-core.js` 的中央目錄擁有。V1 必須而且只可以有以下五份：

| 星級 | ID | 類型 | 目標 | 推薦等級 | 報酬 |
| --- | --- | --- | --- | --- | --- |
| ★ | `guild_hunt_chick_1star` | hunt | `monster_id: chick` × 5 | Lv.1 | 1★ 技能書信封 |
| ★★ | `guild_delivery_mountain_2star` | delivery | `recipient_npc_id: mountain_delivery_recipient` | Lv.3 | 2★ 技能書信封 |
| ★★★ | `guild_hunt_coyote_3star` | hunt | `monster_id: coyote` × 5 | Lv.4 | 3★ 技能書信封 |
| ★★★★ | `guild_hunt_bear_4star` | hunt | `monster_id: bear` × 5 | Lv.7 | 4★ 技能書信封 |
| ★★★★★ | `guild_hunt_snake_5star` | hunt | `monster_id: snake` × 5 | Lv.8 | 5★ 技能書信封 |

推薦等級只作玩家指引，不是額外的接任門檻。`coyote` 是 Monster System 的郊狼，不是 `fox`；其他現有魔物不會因為存在於圖鑑而自動變成委託。

## 類型與流程

討伐委託以 canonical Monster ID 及每次生成的穩定 `instanceId` 記錄擊殺。只有接受後、符合目標 ID 的活躍委託會增加進度；錯誤魔物、接受前擊殺，以及同一個生成實例的重複事件都不計算。多個符合目標的戰鬥單位各自以實例計算一次。

送信委託以 token 形式存在委託 state，不需要佔用一般物品欄。玩家必須到 `field` 與 `mountain_delivery_recipient` 互動；只有該穩定 NPC ID 可以完成目標。收件人位於遠離主城東門、靠近山路北段的可達區域，精確位置由 `maps/mountain-field.js` 擁有。

狀態流程是：

`available → active → ready_to_report → available`

`objectiveCompleted` 與 `deliveryCompleted` 是 state 內的明確旗標；討伐進度達標或送信成功後只會變成 `ready_to_report`，玩家仍要回到 `guild` 向公會回報。回報是一次性、原子操作，會清除活躍委託、增加 cycle，並把一個與委託星級相同的技能書信封加入 state。重複回報不能重複領獎；同一份委託完成回報後會再次出現在固定目錄中。

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

載入時會以 state normalizer 修正數字、未知委託與不完整舊資料；舊版只有 `activeContracts` 的存檔會安全地回到可用的 V1 委託板，不會沿用舊的固定金幣／XP／物品獎勵路徑。現有 `activeContracts` 欄位只保留為舊 UI／測試的相容投影，並非新的資料來源。

## Guild UI 與互動

Guild 委託板一次顯示固定五份可接委託；接任後只顯示當前一份，並呈現星級、標題、類型、推薦等級、目標、進度、技能書信封報酬與狀態。接受及回報只能在 `guild` 進行；送信只能在山地收件人處完成。完成後公會職員顯示回報提示，山地收件人則在送信前後使用簡短的狀態對話。

## 系統 ownership

- 本文件及 `guild-commission-core.js`：委託目錄、討伐／送信 objective、狀態、回報與信封獎勵。
- `docs/MONSTER_SYSTEM.md`、`map/monster-blueprints.js`：canonical Monster ID、等級、屬性、生態與戰鬥資料。
- `docs/FIGHTER_SKILL_TREE.md`、`fighter-skill-data.js`、`skill-core.js`：Fighter skill ID、星級／取得 eligibility、前置與學習規則。
- `docs/BATTLE_SYSTEM.md`：戰鬥單位、擊殺與戰鬥結算。
- `docs/MAP_SYSTEM.md`、`docs/maps/MOUNTAIN_FIELD.md`、`maps/**/*.js`：地圖語意、NPC 穩定 ID 與 exact runtime placement。
- `game.js`：把現有探索／戰鬥／NPC／save UI 接到以上 resolver；不重新建立 Monster 或 Fighter catalog。

V1 不包含收集委託、強者 NPC 對決、Boss 委託、每日／每週期限、聲望／公會階級、procedural generation、server quota 或 6★ 以上內容。
