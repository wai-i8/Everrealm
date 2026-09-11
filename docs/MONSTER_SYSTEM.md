# Monster System

## Purpose / source of truth

怪物固定資料只由 `data/monsters.js` 擁有；怪物技能只由 `data/skills/monster.js` 擁有。`map/monster-blueprints.js` 只負責 runtime hydration、level stats、舊 ID migration 及 map/save boundary。`monster-ai.js` 只負責戰場決策，唔可以重新定義怪物 stats 或技能。

探索地圖追蹤／遊蕩 AI 今次不重設；日後探索遭遇會另行改成碰撞式 encounter。以下 AI 規則全部只指格仔戰場。

## Canonical roster / progression

現行 roster 固定為 9 種普通怪，**沒有 Boss、Elite 或混合 encounter party**。每次 encounter 只生成同一 species，數量由怪物資料固定。

| Rank | ID | 名稱 | Lv | 每場數量 | Battle Move |
| ---: | --- | --- | ---: | ---: | ---: |
| 1 | `chick` | 山野小雞 | 1 | 1 | 5 |
| 2 | `fox` | 赤尾狐 | 5 | 2 | 6 |
| 3 | `raccoon` | 灰紋浣熊 | 10 | 1 | 4 |
| 4 | `wild_boar` | 荒原野豬 | 15 | 3 | 4 |
| 5 | `frog` | 霧沼蛙 | 21 | 1 | 4 |
| 6 | `coyote` | 灰原郊狼 | 27 | 3 | 5 |
| 7 | `turtle` | 苔甲龜 | 33 | 1 | 2 |
| 8 | `snake` | 毒霧蛇 | 39 | 2 | 5 |
| 9 | `bear` | 岩穴熊 | 45 | 1 | 3 |

呢個 Lv 係 species / authored map progression，唔跟玩家等級或 dungeon clear 次數動態提升。怪物 level cap 獨立為 45。


## Canonical combat stats / encounter scaling

普通怪 Base ATK／DEF 以「同 Level 格鬥士著正常對應裝備」做共同校準基準；**encounter 數量唔會再削 ATK／DEF**。只有怪物定位先可作 role adjustment，例如龜偏高 DEF、蛇偏高 ATK／較薄防、熊屬重型高攻防。

| 怪物 | Lv | 數量 | Base HP | 實戰每隻 HP | ATK | DEF | 定位修正 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 山野小雞 | 1 | 1 | 24 | 24 | 19 | 3 | 教學近戰 |
| 赤尾狐 | 5 | 2 | 60 | 51 | 28 | 10 | 敏捷／雙怪 |
| 灰紋浣熊 | 10 | 1 | 90 | 90 | 34 | 11 | 平衡近戰 |
| 荒原野豬 | 15 | 3 | 150 | 105 | 39 | 15 | 三怪＋直線衝鋒 |
| 霧沼蛙 | 21 | 1 | 160 | 160 | 45 | 16 | 中距離控制 |
| 灰原郊狼 | 27 | 3 | 200 | 140 | 55 | 21 | 三怪包位／高速 |
| 苔甲龜 | 33 | 1 | 280 | 280 | 71 | 38 | 坦克，高 DEF |
| 毒霧蛇 | 39 | 2 | 240 | 204 | 84 | 26 | 高攻、遠程毒 |
| 岩穴熊 | 45 | 1 | 520 | 520 | 100 | 40 | 重型高攻防 |

`stats.hp` 保存未按 encounter 數量縮放的 Base HP；進戰鬥時才用：

```text
1 隻：Base HP × 1.00
2 隻：Base HP × 0.85
3 隻：Base HP × 0.70
```

最後四捨五入成整數。呢個倍率只作用於 HP，**唔作用於 ATK / DEF / AP / Move / Skill Speed**。

## Battle EXP

每種 canonical monster 的 `rewards.baseXp` 固定為 `100`，對應《幸福 Online／STRUGARDEN》「玩家與同級怪 1 對 1 = 100 EXP」基準。現行 encounter 只有同 species，因此 reward level 就係該場怪物 Lv；如果將來重新出現混合 encounter，仍以場上最高怪 Lv 做基準。

```text
battleEXP = round(100 × levelMultiplier × encounterMultiplier)
```

Level 差倍率：

```text
怪物 Lv >= 玩家 Lv：
  levelMultiplier = 1 + min(10, 怪Lv - 玩家Lv) × 0.10
  → +1 Lv = 1.10，+10 Lv 或以上 = 2.00 cap

怪物低玩家 1–4 Lv：
  levelMultiplier = 1.00

怪物低玩家 5 Lv 或以上：
  levelMultiplier = 0.9 ^ (玩家Lv - 怪Lv - 4)
  → 低5 Lv = 0.90
  → 低6 Lv = 0.81
  → 低7 Lv = 0.729
```

Encounter 數量倍率：

```text
1 隻 = ×1.0
2 隻 = ×1.5
3 隻 = ×2.0
```

例：Lv10 玩家打 Lv10 浣熊 = `100 EXP`；Lv15 玩家打一場 3 隻 Lv15 野豬 = `200 EXP`；Lv10 玩家打 Lv15 怪 = `150 EXP`；Lv20 玩家打 Lv15 怪 = `90 EXP`。

## Monster record

`data/monsters.js` 每隻怪以同一 schema 保存：

- `id`, `name`, `family`
- `progression.rank / level`
- `encounter.count`
- `stats.hp / attack / defense`
- `combat.moveRange / role / skills[]`
- `rewards`
- `habitat`, `questTags`, `locomotion`, `codex`
- `exploration` 只保留目前探索畫面仍需使用的 presentation/movement metadata；不屬於今次 Battle AI 設計。

同一技能不可喺怪物 record 再抄 AP、range、speed、damage。怪物只引用 skill ID。

## Monster skills

技能 machine-readable source 係 `data/skills/monster.js`。格式跟玩家 Fighter 技能相同思路：唔可以淨係寫 `range: 3`，必須明確寫出 `sourcePattern`、`rangeDescription`、`rangeCellsRelative`，令人同 AI 都可以一眼知道實際可選格。

| 怪物 | 技能 | AP | Speed | 攻擊格 / 效果 |
| --- | --- | ---: | :---: | --- |
| 山野小雞 | 啄擊 | 4 | C | 前左／前／前右／左／右 5 格 |
| 赤尾狐 | 迅咬 | 5 | B | 近身 5 格 |
|  | 飛撲 | 12 | C | 前方第 1–2 格、3 格闊 |
| 灰紋浣熊 | 爪擊 | 5 | C | 近身 5 格 |
|  | 連環抓 | 11 | D | 近身 5 格，高傷 |
| 荒原野豬 | 獠牙撞擊 | 6 | D | 近身 5 格 |
|  | 衝鋒 | 14 | E | 正前方第 1–3 格，擊退 1 |
| 霧沼蛙 | 舌擊 | 7 | C | 正前方第 1–2 格 |
|  | 黏液彈 | 15 | D | 正前方第 1–3 格，Move -1 / 1 turn |
| 灰原郊狼 | 迅咬 | 6 | B | 近身 5 格 |
|  | 獵殺飛撲 | 13 | C | 前方第 1–2 格、3 格闊 |
| 苔甲龜 | 甲殼撞擊 | 6 | D | 近身 5 格 |
|  | 旋殼迴擊 | 16 | E | 自身周圍 8 格 AoE，擊退 1 |
| 毒霧蛇 | 毒牙 | 8 | B | 近身 5 格，中毒 |
|  | 毒液噴吐 | 18 | D | 最遠 4 格的明確前方 pattern，中毒 |
| 岩穴熊 | 重掌 | 7 | C | 近身 5 格 |
|  | 震地掌 | 18 | E | 前方 4 格 AoE |

技能速度沿用全戰鬥共同 `S > A > B > C > D > E > F` resolver；怪物冇另一套 speed system。

## AP contract

怪物同玩家沿用同一 AP 節奏：

```text
戰鬥開始 / 第一輪取得 10 AP
每輪 +10 AP
未用 AP 保留
上限 200 AP
```

每隻怪有獨立 AP pool。AI 可選擇今輪唔攻擊，保留 AP 俾下輪較高 AP 技能。

怪物傷害同玩家使用同一標準 damage contract：`sqrt(AP / 3)`；真正 AoE 或帶 knockback／poison／move-down 等額外 utility 的傷害技統一只套一次 `×0.8`。普通直接傷害經共用 `Tactics.calculateDamage()` 後最低為 `5`；Poison／其他 DoT 按自己 status model 結算，唔套 direct-damage floor。詳細公式由 `docs/BATTLE_SYSTEM.md` 擁有。

## Battle AI: skill-driven planner

`monster-ai.js` 唔按 species 寫死「狐狸一定繞側／蛇一定逃走」。每輪由以下資料共同決定：

1. 目前 AP 與下輪可獲得 AP。
2. 所有技能 AP cost、speed、exact range cells、damage / secondary effect。
3. 本輪可達格、movement cost、facing。
4. 玩家實際位置、terrain、其他 unit occupancy / blocker。

核心順序：

```text
現位置可合法出招 → 優先評估直接攻擊
否則評估「移動後可出招」
同時評估「為下輪高 AP / 長射程技企位並儲 AP」
都做唔到 → 追蹤目標
```

因此高 AP 長射程怪唔會無必要衝到玩家身邊。例如毒霧蛇 AP 未夠 `venom_spit` 時，可以先行到下一輪適合 Range 4 出招的位置並待機。

### Range-1 pursuit / 卡位

近戰追蹤時，pathfinding **以玩家目前被佔用的 cell 做 goal**，並使用 `allowGoalOccupied`。完整 movement intent / path **保留玩家最後一格**；真正執行時由 shared occupancy / collision resolver 阻止敵對單位重疊。玩家如果同一輪移走，近戰怪因此可以自然踏入玩家舊格繼續追蹤。

呢個設計刻意唔指定「玩家前面嗰一格」做唯一 goal：如果一隻怪已經卡住玩家其中一邊，第二／第三隻近戰怪仍以玩家格作共同追蹤目標，而唔會因某一個預設鄰格被佔就失去追蹤意圖。

### Shared battle movement collision

同隊／敵對碰撞屬於 `tactics-core.js` 共用 battle movement resolver，**唔屬於 Monster AI**。AI 只提交原本想行嘅 route。

- 敵對單位：不可穿過或重疊；實際 arrival/vacate timing、玩家同時到達優先、pin/STOP 規則全部由 `docs/BATTLE_SYSTEM.md` / shared resolver 擁有。
- 同隊單位爭同一格：以 movement priority 決定，現階段主要以 `weight` 較輕者優先；另一方只作短暫 `friendly-wait`，唔取消原 route。
- 前方隊友之後移走：等待者會 retry 同一 movement step，清路後繼續原本路線。
- 隊友最終停喺必經格：先視為真正 `friendly-route-blocked`。
- 同隊迎面／互換位置：容許 reciprocal pass；較重／低 priority 一方會短暫讓步後繼續，避免雙方永久卡死。

怪物固定 weight 之後可再獨立設定；目前 resolver 已支援 weight，但今次不新增每種怪的固定重量。

## Runtime / migration

`LEGACY_MONSTER_MIGRATION` 只供舊 save / 舊 authored ID 讀取。`deepwarden`, `lantern-golem`, `mossbun` 等名稱唔係現行怪物，亦唔代表現行 Boss / Elite。新 map、quest、save write 只可使用 9 個 canonical IDs。

`hydrateMonsterSpawn()` 會去除舊 `boss`, `elite`, `encounterParty` flags。現行 encounter 數量只讀 `encounter.count`。

## Maps

- Mountain Field：`chick`, `fox`, `raccoon`, `wild_boar`, `coyote`。
- Mine：`frog`, `coyote`, `turtle`, `snake`, `bear`。

Map file 只決定 world placement；species Lv / stats / encounter count / skills 仍由 Monster System 擁有。
