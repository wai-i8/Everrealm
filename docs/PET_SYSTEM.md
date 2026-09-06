# 寵物／ファミリア系統 · PET_SYSTEM

## 設計北極星

本系統以《幸福 Online／STRUGARDEN》的 **ファミリア（Familiar）** 為主要參考，再配合《永恆國度 · Everrealm》現有單人探索、同步戰棋、Lv.40 成長、生產及存檔架構作改編。

核心循環：

> 在戰鬥中捕獲普通怪物 → 命名／收集 → 餵食、玩耍、使喚及休息 → 形成不同育成方向 → 學習ファミリア技能 → 選一隻同行 → 探索跟隨／同步戰鬥 → 部分ファミリア支援生產。

ファミリア唔應該只係裝飾或被動加能力；佢應該係真正可以：

- 由敵方怪物捕獲而來；
- 有獨立成長；
- 因育成方式不同而學到不同技能；
- 進入同步戰棋成為真正單位；
- 用身位、朝向、技能、支援能力影響戰局；
- 部分種類可以同生產系統產生有限度互動。

---

# 1. 原作已核實規則

以下內容可由 STRUGARDEN 舊官方／媒體資料、Wiki 及玩家攻略交叉支持。

## 1.1 ファミリア係由敵方怪物捕獲

- STRUGARDEN 嘅ファミリア唔係商店直接買返來嘅普通寵物。
- 玩家可以將平時遇到嘅敵方怪物 **封印／捕獲**，令佢成為自己嘅ファミリア。
- 舊資料明確提到以 **Sealing Card／シーリングカード** 封印怪物。
- 玩家攻略亦顯示實戰捕獲時通常會先將怪物 HP 壓低，再嘗試捕獲；但完整官方捕獲率公式已無法可靠還原。
- 原作存在不同「怪物知識／○○の知識」類別，ファミリア亦按種族分類。

已見到嘅主要分類包括：

- 飛行系
- 動物系
- 亜人系
- 両生系
- 妖精系
- 魔生系

另外亦有部分特殊ファミリア並非普通捕獲取得，而係透過任務／活動等特殊方法取得。

## 1.2 ファミリア可以跟玩家一齊戰鬥

- ファミリア可以加入戰鬥。
- 玩家會利用ファミリア攻擊、回復、妨害，亦會利用佢嘅身體佔格作「牆」或封路。
- 舊對戰資料亦反映ファミリア會實際參與格仔位置及碰撞策略，而唔係純粹背景動畫。

## 1.3 ファミリア有獨立技能

- ファミリア唔係升級就必定自動學固定技能。
- Wiki 明確指出需要使用育成指令培養。
- 玩家育成記錄顯示，升級時技能取得同兩個育成傾向數值有關，玩家通常稱為：
  - `Cool`
  - `Wild`
- 同一種ファミリア，可以因為育成方向不同，成為偏：
  - 物理
  - 魔法
  - 回復
  - 妨害
  - 防守
  - 生產支援
  等唔同路線。
- ファミリア技能資料可見 `CMD`（主動指令）同 `PSV`（被動）類型，亦有 AP、速度等戰鬥資訊。

## 1.4 原作有餵食／玩耍／使喚／休息等育成

玩家 Wiki／攻略記錄到嘅育成流程包括：

- 餵食
- 玩耍
- 使喚／跑腿
- 休息

ファミリア亦有疲勞概念。

玩家記錄指出：

- 過度反覆召喚、令ファミリア疲勞，會令經驗成長變差。
- 餵食後可以令育成活動持續得更順。
- `Cool / Wild` 之類育成數值會影響升級時學到邊啲技能。

原作完整數值公式已無可靠資料，因此本作唔直接聲稱還原原作精確公式。

## 1.5 可以命名及在地圖顯示

- ファミリア可以命名。
- 舊玩家資料亦記錄可以將ファミリア放喺 field 上。
- 原作後期曾將「連れ歩くファミリア」放入 Premium Service，但本作係單機遊戲，**不保留任何付費限制**。

## 1.6 ファミリア可以支援生產

官方／媒體資料明確提到：

- ファミリア除咗可以戰鬥，亦可以支援物品合成。
- 某些ファミリア會提高合成成功率，或者影響生產結果。
- 個別ファミリア技能資料可見會同生產精靈／親密度產生作用。

因此：

> 「ファミリア」同「生產精靈」係相關但唔係同一樣嘢。

本作必須保持兩個系統分離。

## 1.7 ファミリア可重置育成

原作曾推出：

`ファミリアリセットエッグ`

用途係將已育成ファミリア嘅 Lv／成長狀態重置到初始狀態。

本作可保留成非課金遊戲內物品。

---

# 2. 原作未能可靠核實的部分

以下資料現時無足夠可靠來源完整還原：

- 官方完整捕獲率公式。
- HP 百分比、角色 Lv、怪物 Lv 對捕獲率嘅精確係數。
- 原作全部ファミリア最大 Lv。
- `Cool / Wild` 精確上下限及每個育成指令增加量。
- 每種食物精確效果。
- 疲勞精確公式。
- 所有ファミリア技能完整學習門檻。
- 原作同時可部署幾多隻ファミリア嘅所有版本差異。
- ファミリア逃走／離隊嘅完整條件。
- 所有生產支援技能精確公式。

以下所有精確數值都屬 **《永恆國度》採用／改編**，唔可以當成 STRUGARDEN 原作史實。

---

# 3. 本作第一版範圍

第一版ファミリア系統包含：

1. ファミリア解鎖任務。
2. シーリングカード。
3. 六種知識分類。
4. 普通怪物捕獲。
5. ファミリア圖鑑／管理。
6. 命名。
7. 一隻 active familiar 跟隨玩家。
8. Lv.1–40。
9. EXP。
10. HP／攻擊／防禦／戰棋移動。
11. `Cool / Wild` 育成。
12. Energy／疲勞。
13. 餵食／玩耍／使喚／休息。
14. 技能學習。
15. `CMD / PSV` 技能。
16. 同步戰棋部署。
17. ファミリア獨立 AP。
18. 生產支援接口。
19. Familiar Reset Egg。
20. Save migration。
21. Automated tests。
22. 實際 gameplay／visual verification。

---

# 4. 解鎖

## 4.1 Familiar Contract

使用原作概念：

`Familiar Contract / ファミリアコントラクト`

本作由一個主線／公會 milestone 解鎖。

資料：

```js
familiarUnlocked: false
```

取得 Contract 後：

```js
familiarUnlocked = true
```

並解鎖左側：

`FAMILIAR`

中文顯示：

`寵物`

### 實作要求

- 實際由邊個 NPC／邊一個任務派發，必須使用現有 quest system data-driven 定義。
- 唔好喺 Familiar UI code hard-code 某個 NPC 或座標。
- 舊 save 冇此欄位時預設 `false`，但如果已有後續 Familiar 資料則 migration 自動設成 `true`。

---

# 5. Familiar 分類

第一版使用原作六大類：

```text
flying
animal
demihuman
amphibious
fairy
magical
```

顯示：

| ID | 中文 |
|---|---|
| `flying` | 飛行系 |
| `animal` | 動物系 |
| `demihuman` | 亜人系 |
| `amphibious` | 両生系 |
| `fairy` | 妖精系 |
| `magical` | 魔生系 |

每種可捕獲怪物資料加入：

```js
{
  familiarEligible: true,
  familiarCategory: "animal"
}
```

Boss／任務限定怪：

```js
familiarEligible: false
```

特殊任務 Familiar 可以：

```js
captureMethod: "quest"
```

而唔需要由戰鬥普通捕獲。

---

# 6. 怪物知識

保留原作「○○の知識」概念。

玩家要先學懂相應分類知識，先可以對該類怪物使用 Sealing Card。

Save：

```js
familiarKnowledge: {
  flying: false,
  animal: false,
  demihuman: false,
  amphibious: false,
  fairy: false,
  magical: false
}
```

例如：

```text
動物系怪物 + animal knowledge = 可以捕獲
動物系怪物 + 未有 animal knowledge = 不可捕獲
```

## 6.1 知識取得

知識可以來自：

- Familiar 教學。
- 公會委託。
- 主線。
- Boss。
- 寶箱。
- 特殊 NPC。

第一版 Familiar 教學至少解鎖一種同現有初期怪物相符嘅知識，確保玩家可以即時試玩捕獲。

其他分類逐步解鎖。

---

# 7. Sealing Card

正式物品：

`シーリングカード`

中文：

`封印卡`

Item catalog：

```js
{
  id: "sealing-card",
  type: "familiar_capture",
  stackable: true
}
```

## 7.1 入手

可由：

- Familiar 教學少量派發。
- 商店購買。
- 公會任務獎勵。
- 寶箱。
- 生產系統製作。

如 `docs/PRODUCTION_SYSTEM.md` 已啟用，建議由鍊金術加入一張中低 Lv recipe：

```text
封印卡
```

但 recipe 詳細材料由 `docs/PRODUCTION_SYSTEM.md` 管理。

## 7.2 使用

戰鬥選單加入：

`封印`

只有以下全部成立先可使用：

- Familiar system 已解鎖。
- 玩家持有 Sealing Card。
- 目標 `familiarEligible = true`。
- 已取得目標 category knowledge。
- 目標仍然生存。
- 目標未被其他捕獲流程鎖定。

Boss 預設不可捕獲。

---

# 8. 本作捕獲率

原作精確公式未能可靠還原，因此本作使用清楚、可測試、data-driven 公式。

```text
captureRate =
  baseCaptureRate
  + hpBonus
  + levelBonus
  + cardBonus
```

最後：

```text
5% ≤ captureRate ≤ 90%
```

## 8.1 基礎捕獲率

每種怪物可以有：

```js
baseCaptureRate
```

普通怪預設：

```text
20%
```

稀有普通怪可降低。

## 8.2 HP bonus

目標愈瀕死，愈容易捕獲。

```text
hpRatio = currentHP / maxHP

hpBonus = floor((1 - hpRatio) * 50)
```

例如：

| 目標 HP | HP bonus |
|---:|---:|
| 100% | 0 |
| 75% | +12 |
| 50% | +25 |
| 25% | +37 |
| 10% | +45 |

因此玩家會自然形成原作攻略常見玩法：

> 先打到低 HP，再封印。

## 8.3 Level bonus

```text
levelBonus =
  clamp((playerLevel - monsterLevel) * 2, -20, 20)
```

避免高 Lv 玩家捕捉低 Lv 怪仍然極度困難，但亦唔令高 Lv 直接 100%。

## 8.4 Card bonus

普通卡：

```text
0
```

將來可以有：

```text
精良封印卡
高階封印卡
```

但唔喺第一版加入，避免一次做太多 item tier。

## 8.5 捕獲成功

成功：

1. 消耗 1 張 Sealing Card。
2. 目標立即退出戰鬥。
3. 建立 Familiar instance。
4. Familiar 初始 Lv 採用捕獲怪物嘅實際 Lv，但最高不超過玩家 Lv。
5. 新 Familiar 初始 Energy = 70。
6. 新 Familiar 初始 Bond = 10。
7. 顯示命名畫面。
8. 加入 Familiar collection。

## 8.6 捕獲失敗

失敗：

- Sealing Card 照常消耗。
- 目標繼續戰鬥。
- 不跳過敵方正常行動。
- UI 顯示「封印失敗」。

捕獲 RNG 必須支援 seeded test。

---

# 9. Familiar Instance

每一隻捕獲 Familiar 都係獨立 instance。

即使兩隻係同 species，都可以有不同：

- 名字
- Lv
- EXP
- HP
- 攻擊
- 防禦
- Cool
- Wild
- Energy
- Bond
- 已學技能
- Active skill slots
- 生產支援能力

資料：

```js
{
  id,
  instanceId,
  speciesId,
  nickname,

  level,
  exp,

  currentHP,
  maxHP,
  attack,
  defense,
  movement,

  cool,
  wild,
  energy,
  bond,

  learnedSkills: [],
  activeSkills: [],

  capturedAt,
  capturedMapId,

  productionSupport: null
}
```

---

# 10. Familiar Lv／EXP

第一版 Familiar：

```text
Lv.1 – Lv.40
```

同目前角色 Lv cap 一致。

## 10.1 EXP 取得

Active Familiar 只要：

- 有參與該場戰鬥；
- 戰鬥勝利；
- 未處於完全 exhausted 狀態；

就取得 Familiar EXP。

Familiar 唔需要最後一擊先有 EXP。

## 10.2 疲勞影響 EXP

```text
energy >= 50:
  expMultiplier = 1.00

energy 20–49:
  expMultiplier = 0.75

energy 1–19:
  expMultiplier = 0.40

energy = 0:
  expMultiplier = 0.10
```

保留原作：

> 過度疲勞 → 成長效率下降

但避免完全禁止玩家使用自己鍾意嘅 Familiar。

---

# 11. Familiar 數值

每個 species data 定義：

```js
{
  baseStats: {
    hp,
    attack,
    defense,
    movement
  },

  growth: {
    hp,
    attack,
    defense
  }
}
```

Lv 計算：

```text
stat(level) =
  baseStat + growthPerLevel * (level - 1)
```

最後再加入育成傾向 modifier。

## 11.1 Cool／Wild 對成長影響

`Cool` 偏向：

- 防禦
- 回復
- 魔法／支援
- 生產支援

`Wild` 偏向：

- 攻擊
- 近戰
- 妨害
- 爆發

但唔使用固定「Cool 一定法師、Wild 一定物理」規則。

每種 species 有自己：

```js
growthProfile
skillTable
```

所以同一隻怪可以有自己特色。

## 11.2 Movement

捕獲後 Familiar 嘅基礎 movement 跟 species。

為咗同現有戰鬥規格一致：

```text
普通 Familiar movement 最少 4
```

除非某個特殊 Familiar data 明確設計成低移動但有其他強力能力。

---

# 12. Cool／Wild

本作改編為：

```text
Cool: 0–100
Wild: 0–100
```

新捕獲：

```text
Cool = 20
Wild = 20
```

兩個數值 **可以同時高**，唔係一條左右拉扯 slider。

原因：

原作玩家記錄曾同時使用高 Cool + 高 Wild 門檻去學技能。

---

# 13. Energy／疲勞

```text
Energy: 0–100
```

用途：

- 控制育成活動。
- 影響戰鬥 EXP。
- 避免玩家無限 spam 育成 command。

## 13.1 Energy 消耗

建議：

| 行為 | Energy |
|---|---:|
| 普通戰鬥完成 | -5 |
| 玩耍 | -20 |
| 使喚 | -20 |
| 特訓 | -25 |

最低 0。

## 13.2 Energy 回復

- 餵食：按食物回復。
- 休息：回復大量 Energy。
- Familiar 未 active 時，完成若干場戰鬥亦可慢慢回復少量 Energy。

唔使用 real-time 幾個鐘 waiting。

---

# 14. Bond／親密

ファミリア同玩家嘅感情使用：

```text
Bond: 0–100
```

Bond 同生產系統嘅 **生產精靈親密度** 完全係兩套資料。

## 14.1 Bond 增加

- 餵食：+1
- 玩耍：+2
- Familiar 參與並完成戰鬥：+1
- 首次贏 Boss／重要戰鬥：可 data-driven 加 bonus

## 14.2 Bond 效果

Bond 只提供小幅效果：

- 高 Bond 稍微提高育成效率。
- 高 Bond 可解鎖部分 Familiar skill requirement。
- 高 Bond 可解鎖 cosmetic interaction／對話。

**唔加入永久逃走。**

原作玩家資料有提及 Familiar 可能逃走，但單機版永久刪除玩家花時間養成嘅 Familiar 太懲罰，因此本作取消永久逃走。

---

# 15. 育成 Command

Familiar 詳細頁加入：

```text
餵食
玩耍
使喚
特訓
休息
```

## 15.1 餵食

選擇可食用 item。

食物 data：

```js
{
  familiarFood: {
    energy: 20,
    cool: 0,
    wild: 0,
    bond: 1
  }
}
```

不同食物可以有不同偏向。

例如：

```text
肉類：
Energy +25
Wild +2
Bond +1

魚類：
Energy +20
Cool +1
Wild +1
Bond +1

水果／甜食：
Energy +15
Cool +2
Bond +1
```

具體 item mapping 放 item data，唔 hard-code Familiar UI。

## 15.2 玩耍

```text
Energy -20
Wild +5
Bond +2
Familiar EXP + small amount
```

用途：

- 偏 Wild。
- 增加感情。

## 15.3 使喚

代表原作「おつかいさせる」。

```text
Energy -20
Cool +5
Bond +1
Familiar EXP + small amount
```

第一版唔真的令 Familiar 離開幾分鐘再返來。

直接用短動畫／結果完成，避免 real-time waiting。

## 15.4 特訓

```text
Energy -25
Cool +3
Wild +3
Bond +1
Familiar EXP + medium amount
```

## 15.5 休息

```text
Energy +60
```

最多 100。

休息唔推進 real-world timer。

---

# 16. Familiar Skill

Familiar skills 分：

```text
CMD
PSV
```

## 16.1 CMD

主動戰鬥技能，例如：

- 近戰攻擊
- 側面攻擊
- 遠距離技能
- 回復
- STOP／擊退／妨害
- 狀態異常

資料沿用現有戰鬥技能概念：

```js
{
  id,
  name,
  type: "CMD",
  ap,
  speed,
  range,
  directions,
  effect
}
```

## 16.2 PSV

被動技能，例如：

- 生產支援
- 自身防禦
- 狀態抗性
- 特定條件 bonus

PSV 不需要放入 active slot。

---

# 17. 技能學習

原作特色係：

> Familiar 技能唔係單純「Lv 到就固定自動學」。

因此每個 species 使用：

```js
skillTable: [
  {
    skillId,
    minLevel,
    minCool,
    minWild,
    minBond
  }
]
```

Familiar **升 Lv 時** 檢查 skill table。

全部條件達成：

```text
學習技能
```

唔達成：

```text
唔學
```

## 17.1 避免永久錯過

原作偏 hardcore，但本作唔需要迫玩家因一次育成錯誤重養整隻。

如果某技能 Lv requirement 已經過咗：

只要之後 Cool／Wild／Bond 達標，再下一次：

- 升 Lv
- 完成特訓

都可以重新檢查並學習。

因此玩家仍然可以調整育成方向。

## 17.2 Skill slots

第一版：

```text
最多裝備 4 個 CMD 技能
```

PSV 自動生效。

如果 learned CMD > 4：

玩家喺 Familiar 頁自行換技。

Familiar skill slot 同玩家 DECK **完全分開**。

---

# 18. Active Familiar

玩家可以收藏多隻 Familiar，但：

```text
同一時間只可指定 1 隻 Active Familiar
```

目的：

- 保持單人戰棋可讀性。
- 避免玩家 + 多隻 Familiar 令每輪操作過長。
- 更容易做 AI、碰撞及 balance。

Familiar page：

```text
設為同行
取消同行
改名
技能
育成
狀態
```

---

# 19. 探索地圖跟隨

Active Familiar：

- 出現在探索地圖。
- 跟隨玩家。
- 普通細至中型 Familiar 使用 `ART_PIPELINE.md` Standard Mobile Unit Locomotion Contract：`4 × 7 = 28 frames`，四方向各 1 Idle + 6 Walk。
- 探索跟隨移動必須真正播放 directional Walk cycle，唔可以用靜止 sprite 純平移。
- 唔阻擋玩家探索 pathfinding。
- 唔產生探索 collision。
- 唔會自己觸發傳送點／NPC interaction。
- 玩家轉圖時跟住轉圖。

## 19.1 跟隨位置

使用跟隨點／trail history，而唔係每 frame 硬追玩家中心。

目的：

- 避免 Familiar 疊住玩家。
- 避免左右高速抖動。
- 避免因玩家 path 微調不停改 facing。

Familiar sprite 同樣遵守：

`ART_PIPELINE.md`

包括：

- standard `4 rows × 7 columns = 28-frame` locomotion contract（普通細至中型 species）；
- fixed shared cell geometry；
- fixed semantic foot anchor／baseline；
- genuinely transparent alpha；
- normalize + automatic repack；
- exploration + battle 共用同一 locomotion atlas；
- 四方向 Idle／Walk runtime visual QA。

巨型 Boss／特殊形體日後先另設特殊 contract；普通 Familiar 唔因為 cut 圖問題自行開 per-species runtime offset。

---

# 20. Familiar 戰鬥部署

Active Familiar 進入普通戰鬥時：

- 以獨立友軍 unit 加入。
- 預設出生喺玩家旁邊一個合法格。
- 如所有鄰格都不可放置，按最近合法友軍格搜尋。
- 不可同玩家、敵人重疊。

Boss／特殊戰可以 data-driven：

```js
allowFamiliar: false
```

如果禁用，開戰前要清楚顯示。

---

# 21. Familiar 同步移動

Familiar 必須完全遵守 `GAME_DESIGN.md` 現有同步戰棋規則。

包括：

```text
移動 1 格 = 1 步
每次轉方向 = +0.5 步
```

以及：

- 同一格只可以一個 unit。
- 不可穿過其他 unit。
- 不可交換位置。
- 爭格／撞位時按現有 collision timeline 結算。
- 被 block 後取消未完成移動。
- 最終朝向按實際完成路線決定。

**禁止為 Familiar 另寫第二套 movement resolver。**

Familiar、玩家、怪物全部用同一套：

```text
movement-cost
timeline
collision
facing
```

視覺移動亦接入同一 unit animation controller：

```text
idle
directional walk
```

戰鬥移動動畫詳細 timing 以 `docs/BATTLE_SYSTEM.md` 為準；sprite frame contract 以 `ART_PIPELINE.md` 為準。

---

# 22. Familiar 戰鬥控制

本作唔使用全自動 AI Familiar。

每輪：

1. 玩家規劃自己移動。
2. 玩家規劃 Familiar 移動。
3. 玩家／Familiar／敵人同步移動。
4. 玩家選自己 action。
5. 玩家選 Familiar action。
6. 敵方 AI 選 action。
7. 按現有 speed resolver 結算。

如果 Familiar 選：

`待機`

則只結束 Familiar 該輪行動。

---

# 23. Familiar AP

Familiar 使用獨立 AP：

```text
開戰：10 AP
每輪：+10 AP
上限：200 AP
```

同玩家規則一致，方便共用 resolver。

但：

```text
playerAP
familiarAP
```

係兩個獨立 pool。

玩家唔可以將自己 AP 過畀 Familiar。

---

# 24. Familiar Battle Stats

Familiar 戰鬥顯示：

- 名字
- Lv
- HP
- AP
- 攻擊
- 防禦
- 移動

唔加入：

- 暴擊率
- 探索移速
- 額外玩家不存在嘅雜項 stat

維持 `GAME_DESIGN.md` 簡潔數值方向。

---

# 25. Familiar HP／倒下

Familiar HP = 0：

- 本場戰鬥退出。
- 不會永久死亡。
- 不會失去／逃走。
- 戰後保持 `1 HP`。

需要：

- 食物／治療
- 或休息

先回復。

唔加入寵物永久死亡。

---

# 26. Familiar Balance

Familiar 係額外戰棋單位，因此如果完全等同玩家角色，會令難度崩壞。

第一版目標：

```text
同 Lv Familiar 綜合戰力 ≈ 玩家裸裝戰力 45%–65%
```

不同 species 可以偏：

- Tank
- Damage
- Support
- Control
- Production

但唔應該一隻全部做到。

Boss 戰可因 balance：

```text
enemyScaleWithFamiliar: true
```

例如 Active Familiar 參戰時：

- Boss 加少量 HP
- 或增加小怪

但調整必須 data-driven，唔好直接喺 battle UI hard-code。

---

# 27. Familiar 品種差異

第一版所有可捕獲普通怪物都應有明確 role。

Example：

```text
小型動物：
高 movement
低 HP
妨害／靈活

熊類：
高 HP／防禦
低 speed
Tank

鳥類：
高 movement
遠距離／側面干擾

両生類：
狀態異常
平均數值

亜人類：
較完整技能組
偏戰鬥

魔生／妖精：
魔法／支援／生產
```

呢啲係 design direction，具體 species 數值放 data catalog。

---

# 28. 生產支援

`docs/PRODUCTION_SYSTEM.md` 已預留：

```js
productionHelperId
```

PET 系統正式接管呢個接口。

## 28.1 規則

玩家可以將一隻已擁有 Familiar 設成：

```text
Production Helper
```

Production Helper 可以同 Active Familiar 係同一隻或另一隻。

但：

- 同一時間只可 1 隻 Production Helper。
- Familiar 不會取代生產精靈。
- Recipe 如指定 production spirit，仍然必須使用該 spirit。

## 28.2 支援類型

Familiar `PSV` 可以提供其中一種：

```text
success
quality
speed
spiritAffinity
```

第一版 bonus 必須細。

例如：

```text
success:
+2% 合成成功率

quality:
qualityBoost +1

speed:
製作動畫時間 -10%

spiritAffinity:
該次計算時 production spirit intimacy +5 virtual value
```

每隻 Familiar 最多一種 production support。

## 28.3 Cap

Familiar bonus 套入 `docs/PRODUCTION_SYSTEM.md` 嘅 production resolver。

禁止 UI 自己另加。

合成成功率最後仍然遵守 Production System 嘅總 cap。

---

# 29. Familiar Reset Egg

物品：

`ファミリアリセットエッグ`

中文：

`寵物重生蛋`

用途：

重置選定 Familiar：

```text
Lv → 捕獲時初始 Lv / 或 Lv.1
EXP → 0
Cool → 20
Wild → 20
Energy → 100
learnedSkills → species initial skills
activeSkills → initial
```

保留：

- nickname
- species
- capturedAt
- collection entry

## 29.1 本作取得

唔使用課金。

可由：

- 稀有公會獎勵
- Boss
- 高階生產 recipe

取得。

使用前必須二次確認。

---

# 30. Familiar UI

左側：

`寵物`

主畫面：

```text
[同行 Familiar]
角色圖
名字
Species
Lv
HP
Energy
Bond
Cool
Wild

[技能]
[育成]
[圖鑑]
[收藏]
```

## 30.1 收藏頁

每張 Familiar card 顯示：

- sprite
- nickname
- species
- Lv
- category
- role icon
- active / helper 標記

可以：

- 設同行
- 設生產 Helper
- 改名
- 查看技能
- 育成
- 放回收藏

## 30.2 圖鑑

圖鑑係 species collection。

狀態：

```text
???
已遇見
已捕獲
```

未遇見 Familiar 唔顯示完整資訊。

已遇見但未捕獲：

- 顯示 silhouette／species 名
- 顯示 category
- 唔直接洩露所有 skill requirement

已捕獲：

- 完整基本資訊
- 可能技能列表逐步解鎖

---

# 31. Familiar Art

Familiar 同敵方同一 species 必須共用同一份 species visual definition，唔生成一套「敵人版」再生成另一套「寵物版」。

舊：

```text
assets/monster-facing-core-v1.png
assets/monster-facing-depths-v1.png
```

只可喺新 locomotion asset 未完成前作 legacy fallback。

普通細至中型 species 正式升級後，敵方怪物同捕獲後 Familiar 共用同一張 standard `4 × 7 = 28-frame` locomotion atlas；只由：

- 名字
- 友軍 UI
- 選取框
- team indicator

區分敵我。

但 Familiar 可以用：

- 小型名字標記
- 友軍 UI
- 選取框

區分敵我。

所有 crop／alpha／anchor／四方向規則：

> 唯一以 `ART_PIPELINE.md` 為準。

---

# 32. Save Data

最低：

```js
familiarSystem: {
  unlocked: false,

  knowledge: {
    flying: false,
    animal: false,
    demihuman: false,
    amphibious: false,
    fairy: false,
    magical: false
  },

  activeFamiliarId: null,
  productionHelperId: null,

  familiars: [
    {
      instanceId,
      speciesId,
      nickname,

      level,
      exp,

      currentHP,
      maxHP,
      attack,
      defense,
      movement,

      cool,
      wild,
      energy,
      bond,

      learnedSkills: [],
      activeSkills: [],

      capturedAt,
      capturedMapId
    }
  ],

  discoveredSpecies: [],
  capturedSpecies: []
}
```

---

# 33. Save Migration

舊 save 冇：

```js
familiarSystem
```

時自動建立 default state。

不得：

- 清空 inventory。
- 改玩家職業。
- 改 quest progress。
- 改 production data。
- 改裝備。
- 改現有 battle data。

如果舊 save 已經有過渡版 Familiar fields：

要寫 migration，而唔係直接丟棄。

---

# 34. Data-driven Catalog

## 34.1 Species

```js
{
  id,
  name,
  category,
  familiarEligible,

  baseCaptureRate,

  baseStats,
  growth,
  role,

  skillTable,
  productionSupport,

  art
}
```

## 34.2 Skill requirement

```js
{
  skillId,
  minLevel,
  minCool,
  minWild,
  minBond
}
```

## 34.3 Familiar food

```js
{
  itemId,
  energy,
  cool,
  wild,
  bond
}
```

禁止將某 species 嘅育成／捕獲規則散落 UI code。

---

# 35. 與現有系統的責任分工

## BATTLE_SYSTEM.md

負責：

- 同步戰鬥
- movement cost
- occupancy / collision
- facing
- AP / speed resolver
- attack path / projectile / terrain combat behaviour

PET_SYSTEM 唔重寫上述底層規則，只描述 Familiar 點接入同一套 battle resolver。

## MAP_SYSTEM.md

負責：

- scene transition
- exploration map context
- Familiar 跟隨時嘅合法 map / spawn context
- battlefield biome / terrain context

PET_SYSTEM 唔自行生成第二套 map／battlefield。

## ART_PIPELINE.md

負責：

- Familiar sprite
- atlas
- crop
- transparent alpha
- anchor
- animation QA

## PRODUCTION_SYSTEM.md

負責：

- recipe
- production spirit
- success resolver
- quality resolver

PET_SYSTEM 只提供 Familiar modifier。

---

# 36. Automated Tests

## 36.1 Capture

至少：

- 未解鎖 Familiar → 不可封印。
- 無 Sealing Card → 不可封印。
- 無相應 knowledge → 不可封印。
- Boss `familiarEligible=false` → 不可封印。
- HP 越低 captureRate 越高。
- Player Lv difference 正確影響 rate。
- captureRate cap = 5–90%。
- seeded RNG 成功／失敗可測。
- 成功後目標退出 battle。
- 成功建立獨立 Familiar instance。
- 失敗後怪物繼續存在。
- 成功／失敗都正確消耗 card。

## 36.2 Growth

- Familiar battle EXP 正確。
- Energy 低時 EXP multiplier 正確。
- Lv cap 40。
- stat growth 正確。
- 兩隻同 species 可以有不同 Cool／Wild／skill。

## 36.3 Training

- 餵食扣正確 item。
- Energy 不超過 100。
- Cool／Wild 不超過 100。
- Bond 不超過 100。
- Energy 不足時不可執行高消耗 training。
- 玩耍／使喚／特訓數值正確。

## 36.4 Skill learning

- 未達 Lv 不學。
- 未達 Cool/Wild/Bond 不學。
- 達標後升 Lv 可學。
- 錯過 Lv 後再特訓達標仍可學。
- CMD active slots 最多 4。
- PSV 唔佔 CMD slot。

## 36.5 Battle

- Familiar 正確出生於合法格。
- 無合法鄰格時搜尋最近合法格。
- Familiar 使用同一 movement resolver。
- 轉向仍然 +0.5。
- Familiar 同玩家／怪物不可重疊。
- Familiar 可參與爭格／STOP。
- AP 同玩家分開。
- Familiar KO 不永久刪除。
- 禁 Familiar 戰鬥正確不部署。

## 36.6 Production

- Production Helper 同 Active Familiar 可以不同。
- 只可一隻 Helper。
- Familiar bonus 經 production resolver。
- 不取代 required production spirit。
- success rate cap 仍然有效。

## 36.7 Save

- 新 save 正常。
- 舊 save migration 正常。
- 多隻 Familiar instance 可保存。
- nickname 可保存。
- Active／Helper id 可保存。
- Cool／Wild／Energy／Bond 可保存。
- learned／active skills 可保存。

---

# 37. Visual / Gameplay QA

## 探索

實際 run game：

- Active Familiar 正確跟隨。
- 唔疊住玩家。
- 四方向轉向自然。
- 行走時真正播放 6-frame directional walk cycle。
- 探索同戰鬥使用同一 locomotion atlas。
- 唔出現「靜止 Familiar sprite 水平滑行」。
- 唔因 path 微調高速左右閃。
- sprite 無白邊。
- 無跨格污染。
- baseline 穩定。
- Familiar 轉圖正常。

## 戰鬥

至少實際測：

- 玩家 + Familiar + 2 隻敵人。
- 玩家與 Familiar 向同一位置移動。
- Familiar 與敵人爭同一格。
- Familiar 被 block。
- Familiar 轉方向 0.5 cost。
- Familiar 戰棋逐格移動期間播放正確方向 Walk，STOP／完成後回 Idle。
- Familiar CMD range／facing。
- Familiar HP bar／名字唔遮角色。
- Familiar KO。
- 捕獲成功後怪物消失並加入 collection。

如畫面有：

- sprite 飄移
- scale 不一致
- white edge
- name 太細
- HP bar 遮住角色
- Familiar 疊住玩家
- path line 顯示錯

必須修正並重新 screenshot 驗證，唔可以只因 automated tests pass 就標記完成。

---

# 38. 第一階段 Familiar Content

第一版唔需要一次畫幾十隻新怪。

優先：

> 將現有普通怪物中適合嘅 species 標記為可捕獲 Familiar。

至少提供：

- 1 隻 animal
- 1 隻 flying 或 amphibious
- 1 隻 tank 型
- 1 隻 attack 型
- 1 隻 support／control 型

如果現有怪物 atlas 已足夠，就直接重用。

特殊 Boss 預設不可捕獲。

完成核心系統後先擴充：

- rare Familiar
- quest Familiar
- special species
- 大量獨立技能
- 額外 Familiar artwork

---

# 39. 第一階段完成定義

以下全部完成先視為 Familiar 第一版完成：

1. Familiar Contract 解鎖。
2. 左側寵物 UI。
3. 六種 knowledge data。
4. Sealing Card。
5. 戰鬥捕獲。
6. Familiar collection。
7. 命名。
8. 一隻 active Familiar。
9. 探索跟隨。
10. Familiar Lv／EXP。
11. Cool／Wild。
12. Energy／Bond。
13. 餵食／玩耍／使喚／特訓／休息。
14. Species skill table。
15. CMD／PSV。
16. 4 CMD slots。
17. Familiar 同步戰鬥。
18. Familiar AP。
19. KO／回復。
20. Production Helper 接口。
21. Familiar Reset Egg。
22. Save migration。
23. Automated tests。
24. Runtime visual QA。

完成核心閉環：

> 捕獲 → 養成 → 學技 → 跟隨 → 戰鬥 → 生產支援

之後先大量增加 Familiar species。

---

# 40. 研究依據

本文件研究時主要交叉核對以下資料：

- STRUGARDEN Wiki：
  - 「はじめに」
  - Familiar 分類
  - Familiar 捕獲相關索引
  - 怪物知識相關索引
- VIPでストラガーデン Wiki：
  - 「ファミリア」
  - パンダ
  - ゴーレム
- GAME Watch（2004）：
  - 戰鬥捕獲、育成、獨立技能。
- 4Gamer（2004）：
  - Familiar 可以戰鬥、合成支援。
  - Familiar 對合成成功率／特殊結果有影響。
- 4Gamer（2006）：
  - Familiar Reset Egg。
- 4Gamer（2012）：
  - 官方明確再次描述 Familiar 係捕獲敵方怪物後育成、協助戰鬥／合成。
- 舊玩家育成日誌：
  - 餵食、玩耍、使喚、疲勞。
  - Cool／Wild 類育成數值對技能學習嘅實際觀察。

可核實到「存在」但無法可靠還原精確公式嘅部分，本文件全部改成 data-driven 本作規則，並喺前文標明為改編。

