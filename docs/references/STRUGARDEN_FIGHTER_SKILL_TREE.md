# 幸福 Online / STRUGARDEN 格鬥士技能樹參考

> 類型：Historical Reference / Research Data  
> 用途：保存《幸福 Online / ストラガーデン》格鬥士技能樹嘅前置關係，供 Everrealm 長期設計參考。  
> **呢份文件唔係 Everrealm 現行技能平衡規格。** Everrealm 真正技能／DECK 設計仍以 `GAME_DESIGN.md` 及相關 system docs 為準。

## 命名原則

本文件主要顯示名統一改用**繁體中文**。

已按目前確認用法改名，例如：

```text
拳突       → 正拳
時差拳突   → 時差正拳
連弾       → 連擊
虎連弾     → 虎連擊
百虎連弾   → 百虎連擊
転砲脚     → 轉砲腳
跳弾脚     → 跳彈腳
気         → 氣
脚         → 腳
体         → 體
撃         → 擊
弾         → 彈
竜         → 龍
鉄         → 鐵
軽         → 輕
点穴       → 點穴
奥義       → 奧義
```

注意：

> 未搵到已核實嘅香港／台灣官方譯名時，本文件只做繁體字形同明確常用術語整理，**唔聲稱全部名稱都係官方中文版譯名**。

為方便日後返查原 Wiki，每招仍保留：

```yaml
source_name_ja:
```

---

# 資料來源

主要來源：

- STRUGARDEN Wiki：`職業/格闘士`
  - https://wiki.strugarden.pluslake.net/%E8%81%B7%E6%A5%AD/%E6%A0%BC%E9%97%98%E5%A3%AB/

原 Wiki 以：

```text
┃ ━ ┣ ┫ ┳ ┏ ┓ ┛ ┗ ╋
```

等 box-drawing characters 畫技能樹。

## 重要判讀規則

**相鄰唔等於有前置關係。**

只有 connector 真正接入該技能嘅路徑，先可以加入 `requires`。

例如：

```text
連擊
↓
時差正拳
```

`時差正拳` 上面係直接由 `連擊` 落嚟，**冇跨欄分支符號接入**，所以：

```yaml
時差正拳:
  requires:
    - 連擊
```

唔可以因為隔離有 `轉砲腳` connector 就自行加：

```yaml
- 轉砲腳
```

相反：

```text
先之先 ────┐
            ├── 跳彈腳
轉砲腳 ────┘
```

原 tree 喺 `跳彈腳` 上方明確有 `┫` 跨欄接入，因此：

```yaml
跳彈腳:
  requires:
    - 先之先
    - 轉砲腳
```

---

# 顯示位置修正

`正拳`（原 `拳突`）喺本整理版嘅 visual layout：

> **右移一欄，放喺 `迅拳` 嗰欄上方。**

即：

```text
                    正拳
                     │
                 ┌───┴───...
                 │
                迅拳
```

而唔再將 `正拳` 畫喺 `背拳` 嗰欄正上方。

呢個係 **display / layout 修正**；前置 graph 仍以 explicit `requires` 為準。

---

# `requires` 規則

```yaml
requires: []
```

語義：

```text
requires: []
= 冇技能前置要求

requires:
  - A
= 必須先學 A

requires:
  - A
  - B
= A AND B
= A、B 兩招全部都要先學
```

**`requires` 永遠係 AND list。**


---

# 戰鬥技能詳細資料欄位

技能樹只解決「點樣學到一招技」。

要真正長期用作 Everrealm 實作參考，每個 CMD 技能仲要保存：

```yaml
original_reference:
  ap:
  speed:
  interrupt:
  durability:

  range:
    type:
    source_pattern:
    range_description:
    range_cells_relative: []
    height_difference:
      up:
      down:
      source_text:
      status:

  effect_area:
    type:
    source_pattern:
    coordinate_origin:
    area_description:
    cells_relative: []

  acquisition:
    initial:
    shop_price:
    guild_reward_books: []
    rarity:
    quests: []
    drops: []
    other_sources: []

  description_zh:
  description_status: traditional_chinese_functional_translation

  hit_count:
  source_hit_judgement:
  source_special_notes: []
  source_effects: []

everrealm:
  action_kind:
  deals_damage:
  delivery_mode:
  path_mode:
  utility_effects: []

  damage:
    formula_applied:
    formula:
    model:
    raw_multiplier:
    utility_multiplier:
    final_total_multiplier:

  hit_resolution:
    hit_count:
    hit_judgement_mode:
    recheck_attack_path_each_hit:
    rounding_remainder_priority:
```

## 射程圖

原版 Wiki 嘅：

```text
■ = 可以選取／作用嘅格
口 = 唔可以選取嘅格
↑ = 施放者位置同面向
```

長期資料保留三層表示，三樣一齊存在：

```yaml
range:
  source_pattern: |
    ■■■
    ■↑■

  range_description: >
    前方一排左、中、右 3 格，加同橫排左、右各 1 格，共 5 格。

  range_cells_relative:
    - [-1,  1]  # 左前
    - [ 0,  1]  # 正前
    - [ 1,  1]  # 右前
    - [-1,  0]  # 左
    - [ 1,  0]  # 右
```

三層分工：

```text
source_pattern
= 保存原版視覺資料

range_description
= 俾人／AI 快速閱讀

range_cells_relative
= machine-readable 真值，避免 spacing / 字型造成歧義
```

本文件所有 `range_cells_relative` 統一使用**施術者面向基準 local coordinate**：

```text
caster = [0, 0]

[lateral, depth]

左 = lateral -1
右 = lateral +1
前 = depth +1
後 = depth -1
```

因此：

```text
左前 = [-1,  1]
正前 = [ 0,  1]
右前 = [ 1,  1]

左   = [-1,  0]
右   = [ 1,  0]

左後 = [-1, -1]
正後 = [ 0, -1]
右後 = [ 1, -1]
```

世界實際上／下／左／右由 battle resolver 根據 caster facing 旋轉。

**唔可以只寫「近戰」或者「兩格」**，因為唔同技能可能有：

- 前方直線；
- 左右兩邊；
- 斜角；
- 扇形；
- 自己中心；
- 指定目標前整條路線。

`range_cells_relative` 係正式 machine-readable 範圍；`source_pattern` 只保留原版視覺證據，唔需要 runtime 再靠字元圖猜座標。

---

# 高低差 / Vertical Range

原版射程下面嘅：

```text
上1・下1
```

係戰鬥地形高低差限制。

本 project 統一記成：

```yaml
height_difference:
  up: 1
  down: 1
  source_text: "上1・下1"
  status: confirmed
```

語義：

> 目標相對施放者最多可以高 1 層或者低 1 層。

例如施放者高度：

```text
height = 5
```

合法：

```text
target height = 4, 5, 6
```

唔合法：

```text
target height = 3
target height = 7
```

即係：

```text
abs height difference 2
```

已經超出呢招技能射程。

## 非對稱高低差

例如：

```text
上1・下0
```

保存：

```yaml
height_difference:
  up: 1
  down: 0
```

代表：

- 可以打一層高；
- 唔可以打一層低。

## 無限向下

例如：

```text
上1・下∞
```

保存：

```yaml
height_difference:
  up: 1
  down: unlimited
```

唔好將 `∞` 擅自換成某個大數字。

## 原 Wiki 本身有問號

例如：

```text
上0?・下0?
```

必須保留不確定性：

```yaml
height_difference:
  up: 0
  down: 0
  source_text: "上0?・下0?"
  status: uncertain
```

禁止將 Wiki 自己都未確定嘅值扮成 confirmed。

## 自身技能

如果：

```text
射程 = 自己
效果 = 自分のみ
```

而原資料冇列高低差，記：

```yaml
height_difference:
  status: not_applicable
```

---

# 入手方法 / 技能書星級

入手方式係長期資料一部分，唔可以只記 skill tree prerequisite。

每招可以同時有多種來源：

```yaml
acquisition:
  initial: false
  shop_price: null

  guild_reward_books: []

  quests: []
  drops: []
  other_sources: []
```

## 公會任務獎品技能書星級

本文件按目前確認規則：

```text
☆ = 1 星
★ = 5 星
```

所以：

```text
☆☆☆☆      = 4 星
★         = 5 星
★☆        = 6 星
★☆☆       = 7 星
★☆☆☆      = 8 星
★☆☆☆☆     = 9 星
★★        = 10 星
★★☆       = 11 星
★★☆☆      = 12 星
★★☆☆☆     = 13 星
★★☆☆☆☆    = 14 星
```

計法固定：

```text
star_value = (★ 數量 × 5) + ☆ 數量
```

例如：

```yaml
guild_reward_books:
  - notation: "★☆☆"
    star_value: 7
```

即代表：

> 7 星級公會任務獎品技能書／對應權利書池可以開到呢招技能。

## 同一招可以出現喺多個星級池

唔好假設：

> 一招技能永遠只屬一個星級。

如果原資料顯示同一技能可以喺多個星級／稀有度位置出現，就全部保存：

```yaml
guild_reward_books:
  - notation: "★☆"
    star_value: 6
  - notation: "★★☆"
    star_value: 11
```

## 稀有標記

如果來源寫：

```text
準レア
レア
```

另外保存：

```yaml
rarity_note: quasi_rare
```

或者：

```yaml
rarity_note: rare
```

星級同稀有度係兩個欄位，唔好混埋。

---

# 效果範圍

要分清：

```yaml
range:
```

= 可以揀邊個目標／格。

```yaml
effect_area:
```

= 真正作用到邊啲格／單位。

例如：

```text
射程範圍 = 自己
效果範圍 = 身邊 3×3
```

代表：

> 唔係「只作用自己」，而係以自己做中心產生 AoE。

亦有：

```text
指定對象のみ
```

即只作用指定目標。

同之前 `docs/BATTLE_SYSTEM.md` 原則一致：

> Target selection ≠ actual affected cells / impact.

---

# Linear Attack Path 唔逐招重複保存

`range_cells_relative` 只表示：

> 邊啲格係合法 intended target。

普通 Linear 技能嘅 attack path **唔需要每招／每個 target 重複寫**。

Everrealm 統一由 `docs/BATTLE_SYSTEM.md` 共用：

```text
facingOrthogonalPriority
```

resolver 生成路線。

規則：

```text
Target 喺前半面：
Forward → Left/Right

Target 同橫排：
Left/Right only

Target 喺後半面：
Left/Right → Back
```

例子，連擊揀左前：

```text
range target = [-1, +1]

attack path:
[0, +1]   正前
↓
[-1, +1]  左前
```

如果正前有單位：

> 正前單位先被截中，唔會穿過佢直接打左前 intended target。

如果技能打左邊兩格：

```text
target = [-2, 0]
path = 左 → 左
```

如果 target 係左後：

```text
target = [-1, -1]
path = 左 → 後
```

呢個係共用 battle rule，唔係每招特例。

除非原作／Everrealm 將來有明確「特殊路線」技能，否則 reference data 唔新增 per-target `attack_path` array。

---

# Everrealm 傷害倍率與技能分類

原作 Wiki 嘅 AP、Speed、說明、Hit 數、特殊效果等屬 historical reference。

**Everrealm 傷害倍率唔追原作不完整嘅相對威力資料。**

現行規則統一使用一條 deterministic formula。

## 1. 先判斷係咪傷害技能

每招都要先寫：

```yaml
everrealm:
  action_kind:
  deals_damage:
```

例：

```text
連擊       → multi_hit_damage / true
百虎連擊   → multi_hit_damage / true
無鬥氣     → self_buff / false
咆哮       → area_control / false
```

如果：

```yaml
deals_damage: false
```

就：

```yaml
damage:
  formula_applied: false
  final_total_multiplier: 0
```

AP 幾高都唔會憑空產生傷害。

---

## 2. 標準傷害公式

正拳：

```text
AP = 3
總技能傷害 = 1.00×
```

普通傷害技能：

```text
raw_multiplier = sqrt(AP / 3)
```

例：

```text
3 AP  = 1.0000×
12 AP = 2.0000×
42 AP = 3.7417×
48 AP = 4.0000×
```

**呢個 multiplier 代表整招技能所有 Hits 加埋嘅總傷害。**

---

## 3. 有額外 Utility 嘅傷害技能 ×0.8

如果技能說明除咗 damage，仲明確有：

- 擊退／吹飛；
- 轉倒；
- 中毒；
- 麻痺；
- 暗闇；
- 其他非傷害控制／狀態效果；

就：

```text
utility_multiplier = 0.8
```

最終：

```text
final_total_multiplier
= sqrt(AP / 3) × utility_multiplier
```

例：拳砲

```text
AP = 32
raw = sqrt(32 / 3)
    ≈ 3.2660×

3 格擊退 = 額外 utility

final
= 3.2660 × 0.8
≈ 2.6128×
```

以下**唔當額外 utility**：

- multi-hit 次數；
- AP；
- Speed；
- 普通射程；
- 高低差；
- Linear / Arc / Pathless delivery mode。

所以連擊、虎連擊、百虎連擊唔會因為「打好多 Hits」而自動打八折。

### 固定 HP 型特殊傷害例外

原作如果一招嘅核心效果本身唔係一般倍率傷害，而係明確改變剩餘 HP，例如：

```text
留下半氣拳 → 成功時目標剩餘 HP = 目前 1/2
留下後一拳 → 成功時目標剩餘 HP = 1
```

就保存：

```yaml
damage:
  formula_applied: false
  model:
    type: source_defined_fixed_damage
```

唔可以先套 `sqrt(AP / 3)` 再同時套固定 HP，否則同一招會被重複計傷害。

---

## 4. Multi-hit 先計總傷害，再拆 Hit

例如：

```text
百虎連擊 AP = 42

total multiplier
= sqrt(42 / 3)
= sqrt(14)
≈ 3.7417×
```

呢個係**五拳合共 3.7417×**，唔係每拳 3.7417×。

實際 battle resolver 得出整數總傷害後先拆。

例如：

```text
totalDamage = 373
hitCount = 5
```

拆成：

```text
74
74
75
75
75
```

規則：

> 除唔盡嘅 remainder 永遠優先分畀後面 Hits。

所以後面 Hit 可以比前面高少少，但所有 Hit 加埋必須精確等於整招 `totalDamage`。

---

## 5. `判定：毎回` = 每 Hit 重新掃 Attack Path

原作資料如果寫：

```text
判定：毎回
```

reference 保存：

```yaml
source_hit_judgement: every_hit
```

Everrealm 對應：

```yaml
hit_judgement_mode: each_hit
recheck_attack_path_each_hit: true
```

例如連擊 intended target = 左前：

```text
Caster → 正前 A → 左前 B
```

如果第一拳：

```text
Hit 1 → A
A 死亡
```

第二拳：

```text
重新由同一 attack path 起點掃
正前已空
→ Hit 2 → B
```

如果 A 第一拳未死：

```text
Hit 1 → A
Hit 2 → A
```

如果 path 已完全冇合法 impact：

```text
剩餘 Hit = miss
```

唔會自動揀附近另一個敵人。

完整共用 resolver 規則見：

```text
docs/BATTLE_SYSTEM.md
```

---

# 完整技能資料（65 / 65）

呢一節取代之前嘅「幾招例子」做法。格鬥士技能樹目前 `65` 招全部用同一 schema 完整 backfill：

```text
53 CMD
12 PSV
合計 65
```

每招都包含：

- prerequisite；
- AP / Speed / 妨害值 / 耐久值（原 Wiki 冇值就保留 `null`）；
- `source_pattern`；
- `range_description`；
- `range_cells_relative`；
- 高低差（`?` / `∞` 原樣保留語意）；
- effect area；
- 技能書星級、任務／掉落來源；
- 繁體中文功能說明；
- hit count / 每回判定；
- `action_kind`；
- `deals_damage`；
- utility effect；
- Everrealm damage formula / fixed-damage override；
- multi-hit resolution。

原 Wiki 嘅日文完整句子唔喺每招重複抄錄；`source_name_ja`、本文件頂部 source URL、原版數值／效果欄位保留返回原資料所需定位。`description_zh` 係精簡繁體中文功能翻譯，實作判定以結構化欄位為準。

兩招原作本身係固定 HP 型傷害：

```text
留下半氣拳 → 成功時目標剩餘 HP = 目前 1/2
留下後一拳 → 成功時目標剩餘 HP = 1
```

呢兩招唔硬塞入 `sqrt(AP / 3)`，而係保存明確 `damage.model` override；其餘普通傷害技能使用統一公式。

```yaml
schema_version: 3
skill_count: 65
cmd_count: 53
psv_count: 12
skills:
- id: psv_tesshin
  name_zh: 鐵身
  source_name_ja: 鉄身
  type: PSV
  category: body_passive
  requires: []
  requires_status: confirmed
  original_reference:
    ap: null
    speed: null
    interrupt: null
    durability: null
    range:
      type: not_applicable
      source_pattern: null
      range_description: 被動技能，沒有主動選取射程。
      range_cells_relative: null
      height_difference:
        status: not_applicable
    effect_area:
      type: passive
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆
        star_value: 1
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 斬擊防禦小幅提升
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: slash_defense_up
      magnitude: small
  everrealm:
    action_kind: passive_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: slash_defense_up
      magnitude: small
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: psv_ukimi
  name_zh: 浮身
  source_name_ja: 浮身
  type: PSV
  category: body_passive
  requires:
  - 鐵身
  requires_status: confirmed
  original_reference:
    ap: null
    speed: null
    interrupt: null
    durability: null
    range:
      type: not_applicable
      source_pattern: null
      range_description: 被動技能，沒有主動選取射程。
      range_cells_relative: null
      height_difference:
        status: not_applicable
    effect_area:
      type: passive
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆
        star_value: 2
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 衝擊防禦小幅提升
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: impact_defense_up
      magnitude: small
  everrealm:
    action_kind: passive_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: impact_defense_up
      magnitude: small
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: psv_koushin
  name_zh: 鋼身
  source_name_ja: 鋼身
  type: PSV
  category: body_passive
  requires:
  - 浮身
  requires_status: confirmed
  original_reference:
    ap: null
    speed: null
    interrupt: null
    durability: null
    range:
      type: not_applicable
      source_pattern: null
      range_description: 被動技能，沒有主動選取射程。
      range_cells_relative: null
      height_difference:
        status: not_applicable
    effect_area:
      type: passive
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆☆
        star_value: 3
      rarity: null
      quests:
      - 蟹
      drops: []
      other_sources: []
    description_zh: 貫通防禦小幅提升
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: piercing_defense_up
      magnitude: small
  everrealm:
    action_kind: passive_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: piercing_defense_up
      magnitude: small
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: psv_shintou_mekkyaku
  name_zh: 心頭滅卻
  source_name_ja: 心頭滅却
  type: PSV
  category: body_passive
  requires:
  - 鋼身
  requires_status: confirmed
  original_reference:
    ap: null
    speed: null
    interrupt: null
    durability: null
    range:
      type: not_applicable
      source_pattern: null
      range_description: 被動技能，沒有主動選取射程。
      range_cells_relative: null
      height_difference:
        status: not_applicable
    effect_area:
      type: passive
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆☆☆
        star_value: 4
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 炎熱防禦小幅提升
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: heat_defense_up
      magnitude: small
  everrealm:
    action_kind: passive_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: heat_defense_up
      magnitude: small
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: psv_seishin_touitsu
  name_zh: 精神統一
  source_name_ja: 精神統一
  type: PSV
  category: body_passive
  requires:
  - 心頭滅卻
  requires_status: confirmed
  original_reference:
    ap: null
    speed: null
    interrupt: null
    durability: null
    range:
      type: not_applicable
      source_pattern: null
      range_description: 被動技能，沒有主動選取射程。
      range_cells_relative: null
      height_difference:
        status: not_applicable
    effect_area:
      type: passive
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★
        star_value: 5
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 精神防禦小幅提升
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: mental_defense_up
      magnitude: small
  everrealm:
    action_kind: passive_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: mental_defense_up
      magnitude: small
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: psv_soshin_sokutai
  name_zh: 狙身捉體
  source_name_ja: 狙身捉体
  type: PSV
  category: body_passive
  requires:
  - 精神統一
  requires_status: confirmed
  original_reference:
    ap: null
    speed: null
    interrupt: null
    durability: null
    range:
      type: not_applicable
      source_pattern: null
      range_description: 被動技能，沒有主動選取射程。
      range_cells_relative: null
      height_difference:
        status: not_applicable
    effect_area:
      type: passive
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆
        star_value: 6
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 命中力小幅提升
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: accuracy_up
      magnitude: small
    requirements:
      fighter_level_min: 10
  everrealm:
    action_kind: passive_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: accuracy_up
      magnitude: small
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: psv_hishin_jutai
  name_zh: 避身柔體
  source_name_ja: 避身柔体
  type: PSV
  category: body_passive
  requires:
  - 狙身捉體
  requires_status: confirmed
  original_reference:
    ap: null
    speed: null
    interrupt: null
    durability: null
    range:
      type: not_applicable
      source_pattern: null
      range_description: 被動技能，沒有主動選取射程。
      range_cells_relative: null
      height_difference:
        status: not_applicable
    effect_area:
      type: passive
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆
        star_value: 7
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 迴避力小幅提升
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: evasion_up
      magnitude: small
    requirements:
      fighter_level_min: 10
  everrealm:
    action_kind: passive_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: evasion_up
      magnitude: small
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: psv_koushin_gekitai
  name_zh: 功身擊體
  source_name_ja: 功身撃体
  type: PSV
  category: body_passive
  requires:
  - 避身柔體
  requires_status: confirmed
  original_reference:
    ap: null
    speed: null
    interrupt: null
    durability: null
    range:
      type: not_applicable
      source_pattern: null
      range_description: 被動技能，沒有主動選取射程。
      range_cells_relative: null
      height_difference:
        status: not_applicable
    effect_area:
      type: passive
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆☆
        star_value: 8
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 物理攻擊小幅提升
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: physical_attack_up
      magnitude: small
    requirements:
      fighter_level_min: 10
  everrealm:
    action_kind: passive_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: physical_attack_up
      magnitude: small
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: psv_boushin_goutai
  name_zh: 防身剛體
  source_name_ja: 防身剛体
  type: PSV
  category: body_passive
  requires:
  - 功身擊體
  requires_status: confirmed
  original_reference:
    ap: null
    speed: null
    interrupt: null
    durability: null
    range:
      type: not_applicable
      source_pattern: null
      range_description: 被動技能，沒有主動選取射程。
      range_cells_relative: null
      height_difference:
        status: not_applicable
    effect_area:
      type: passive
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆☆☆
        star_value: 9
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 防禦力小幅提升
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: defense_up
      magnitude: small
    requirements:
      fighter_level_min: 10
  everrealm:
    action_kind: passive_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: defense_up
      magnitude: small
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: psv_sokushin_keitai
  name_zh: 速身輕體
  source_name_ja: 速身軽体
  type: PSV
  category: body_passive
  requires:
  - 防身剛體
  requires_status: confirmed
  original_reference:
    ap: null
    speed: null
    interrupt: null
    durability: null
    range:
      type: not_applicable
      source_pattern: null
      range_description: 被動技能，沒有主動選取射程。
      range_cells_relative: null
      height_difference:
        status: not_applicable
    effect_area:
      type: passive
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★
        star_value: 10
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 行動速度小幅提升
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: action_speed_up
      source_equivalent: weight_minus_50
    requirements:
      fighter_level_min: 10
  everrealm:
    action_kind: passive_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: action_speed_up
      source_equivalent: weight_minus_50
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: kentotsu
  name_zh: 正拳
  source_name_ja: 拳突
  type: CMD
  category: root
  requires: []
  requires_status: confirmed
  original_reference:
    ap: 3
    speed: B
    interrupt: 1
    durability: 10
    range:
      type: relative_cells
      source_pattern: |-
        ■■■
        ■↑■
      range_description: 可選 5 格：前1左1、前1、前1右1、左1、右1。
      range_cells_relative:
      - - -1
        - 1
      - - 0
        - 1
      - - 1
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: true
      shop_price: null
      guild_reward_books: []
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 基本拳擊傷害
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects: []
  everrealm:
    action_kind: damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(3 / 3)
      raw_multiplier: 1.0
      utility_multiplier: 1.0
      final_total_multiplier: 1.0
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
  source_note: 初期所持；visual layout 放喺迅拳欄上方。
- id: haiken
  name_zh: 背拳
  source_name_ja: 背拳
  type: CMD
  category: kentotsu_line
  requires:
  - 正拳
  requires_status: confirmed
  original_reference:
    ap: 12
    speed: B
    interrupt: 1
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        口↑口
        ■■■
      range_description: 可選 3 格：後1左1、後1、後1右1。
      range_cells_relative:
      - - -1
        - -1
      - - 0
        - -1
      - - 1
        - -1
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆
        star_value: 1
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 向身後拳擊
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects: []
  everrealm:
    action_kind: damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(12 / 3)
      raw_multiplier: 2.0
      utility_multiplier: 1.0
      final_total_multiplier: 2.0
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: sunkei
  name_zh: 寸勁
  source_name_ja: 寸剄
  type: CMD
  category: kentotsu_line
  requires:
  - 背拳
  requires_status: confirmed
  original_reference:
    ap: 18
    speed: D
    interrupt: 6
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        口■口
        ■↑■
      range_description: 可選 3 格：前1、左1、右1。
      range_cells_relative:
      - - 0
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆
        star_value: 2
      rarity: null
      quests:
      - リョマ
      drops: []
      other_sources: []
    description_zh: 傷害並擊退1格
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: knockback
      cells: 1
  everrealm:
    action_kind: damage_control
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects:
    - type: knockback
      cells: 1
    damage:
      formula_applied: true
      formula: sqrt(18 / 3) * 0.8
      raw_multiplier: 2.4495
      utility_multiplier: 0.8
      final_total_multiplier: 1.9596
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: kenpou
  name_zh: 拳砲
  source_name_ja: 拳砲
  type: CMD
  category: kentotsu_line
  requires:
  - 寸勁
  requires_status: confirmed
  original_reference:
    ap: 32
    speed: D
    interrupt: 12
    durability: 10
    range:
      type: relative_cells
      source_pattern: |-
        ■
        ↑
      range_description: 可選 1 格：前1。
      range_cells_relative:
      - - 0
        - 1
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆☆
        star_value: 3
      rarity: null
      quests:
      - ネギ
      - 球根
      - ハチミツ
      drops: []
      other_sources: []
    description_zh: 傷害並擊退3格
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: knockback
      cells: 3
  everrealm:
    action_kind: damage_control
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects:
    - type: knockback
      cells: 3
    damage:
      formula_applied: true
      formula: sqrt(32 / 3) * 0.8
      raw_multiplier: 3.266
      utility_multiplier: 0.8
      final_total_multiplier: 2.6128
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: gangatotsu
  name_zh: 岩牙突
  source_name_ja: 岩牙突
  type: CMD
  category: kentotsu_line
  requires:
  - 拳砲
  requires_status: confirmed
  original_reference:
    ap: 30
    speed: D
    interrupt: 1
    durability: 10
    range:
      type: relative_cells
      source_pattern: |-
        口口■口口
        口■口■口
        ■口↑口■
        口■口■口
      range_description: 可選 7 格：前2、前1左1、前1右1、左2、右2、後1左1、後1右1。
      range_cells_relative:
      - - 0
        - 2
      - - -1
        - 1
      - - 1
        - 1
      - - -2
        - 0
      - - 2
        - 0
      - - -1
        - -1
      - - 1
        - -1
      height_difference:
        up: 2
        down: 2
        source_text: 上2・下2
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆☆☆
        star_value: 4
      rarity: null
      quests:
      - 墓場
      drops: []
      other_sources: []
    description_zh: 石柱傷害並轉倒
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: knockdown
      duration_turns: 0
  everrealm:
    action_kind: damage_control
    deals_damage: true
    delivery_mode: pathless
    path_mode: null
    utility_effects:
    - type: knockdown
      duration_turns: 0
    damage:
      formula_applied: true
      formula: sqrt(30 / 3) * 0.8
      raw_multiplier: 3.1623
      utility_multiplier: 0.8
      final_total_multiplier: 2.5298
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: gangaretsujin
  name_zh: 岩牙列陣
  source_name_ja: 岩牙列陣
  type: CMD
  category: kentotsu_line
  requires:
  - 岩牙突
  requires_status: confirmed
  original_reference:
    ap: 45
    speed: D
    interrupt: 1
    durability: 6
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: area_all_units
      source_pattern: |-
        ■
        ■
        ■
        ■
        ■
        ■
        ■
        ■
        ↑
      coordinate_origin: caster
      area_description: 影響 8 格：前8、前7、前6、前5、前4、前3、前2、前1。
      cells_relative:
      - - 0
        - 8
      - - 0
        - 7
      - - 0
        - 6
      - - 0
        - 5
      - - 0
        - 4
      - - 0
        - 3
      - - 0
        - 2
      - - 0
        - 1
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆
        star_value: 6
      rarity: null
      quests:
      - メイド(弱)
      - コボルト
      - 死神呪い
      drops: []
      other_sources: []
    description_zh: 直列石柱範圍傷害
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects: []
  everrealm:
    action_kind: area_damage
    deals_damage: true
    delivery_mode: pathless
    path_mode: null
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(45 / 3)
      raw_multiplier: 3.873
      utility_multiplier: 1.0
      final_total_multiplier: 3.873
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: gangahoujin
  name_zh: 岩牙方陣
  source_name_ja: 岩牙方陣
  type: CMD
  category: kentotsu_line
  requires:
  - 岩牙突
  requires_status: confirmed
  original_reference:
    ap: 30
    speed: D
    interrupt: 1
    durability: 6
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: area_all_enemy_units
      source_pattern: |-
        ■■■
        ■↑■
        ■■■
      coordinate_origin: caster
      area_description: 影響 8 格：前1左1、前1、前1右1、左1、右1、後1左1、後1、後1右1。
      cells_relative:
      - - -1
        - 1
      - - 0
        - 1
      - - 1
        - 1
      - - -1
        - 0
      - - 1
        - 0
      - - -1
        - -1
      - - 0
        - -1
      - - 1
        - -1
      height_difference:
        up: 2
        down: 2
        source_text: 上2・下2
        status: confirmed
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★
        star_value: 5
      rarity: null
      quests:
      - 球根
      - たこ焼き
      - コボルト
      drops: []
      other_sources: []
    description_zh: 周身石柱傷害並轉倒
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: knockdown
      duration_turns: 0
  everrealm:
    action_kind: area_damage_control
    deals_damage: true
    delivery_mode: pathless
    path_mode: null
    utility_effects:
    - type: knockdown
      duration_turns: 0
    damage:
      formula_applied: true
      formula: sqrt(30 / 3) * 0.8
      raw_multiplier: 3.1623
      utility_multiplier: 0.8
      final_total_multiplier: 2.5298
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: chisaihou
  name_zh: 地碎崩
  source_name_ja: 地砕崩
  type: CMD
  category: kentotsu_line
  requires:
  - 岩牙列陣
  requires_status: confirmed
  original_reference:
    ap: 30
    speed: C
    interrupt: 12
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        口■口
        ■↑■
      range_description: 可選 3 格：前1、左1、右1。
      range_cells_relative:
      - - 0
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆
        star_value: 7
      - notation: ★★☆
        star_value: 11
      rarity: null
      quests:
      - 死神呪い
      - カエル
      - ハーブ
      drops:
      - グラスマージ
      other_sources: []
    description_zh: 摔技傷害並轉倒
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: knockdown
      probability: high
      duration_turns: 0
  everrealm:
    action_kind: damage_control
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects:
    - type: knockdown
      probability: high
      duration_turns: 0
    damage:
      formula_applied: true
      formula: sqrt(30 / 3) * 0.8
      raw_multiplier: 3.1623
      utility_multiplier: 0.8
      final_total_multiplier: 2.5298
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: kueiku
  name_zh: 九影琥
  source_name_ja: 九影琥
  type: CMD
  category: kentotsu_line
  requires:
  - 岩牙方陣
  requires_status: confirmed
  original_reference:
    ap: 49
    speed: D
    interrupt: 12
    durability: 6
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: area_all_units
      source_pattern: |-
        口口口■口口口
        口口■■■口口
        口■■■■■口
        ■■■↑■■■
        口■■■■■口
        口口■■■口口
        口口口■口口口
      coordinate_origin: caster
      area_description: 影響 24 格：前3、前2左1、前2、前2右1、前1左2、前1左1、前1、前1右1、前1右2、左3、左2、左1、右1、右2、右3、後1左2、後1左1、後1、後1右1、後1右2、後2左1、後2、後2右1、後3。
      cells_relative:
      - - 0
        - 3
      - - -1
        - 2
      - - 0
        - 2
      - - 1
        - 2
      - - -2
        - 1
      - - -1
        - 1
      - - 0
        - 1
      - - 1
        - 1
      - - 2
        - 1
      - - -3
        - 0
      - - -2
        - 0
      - - -1
        - 0
      - - 1
        - 0
      - - 2
        - 0
      - - 3
        - 0
      - - -2
        - -1
      - - -1
        - -1
      - - 0
        - -1
      - - 1
        - -1
      - - 2
        - -1
      - - -1
        - -2
      - - 0
        - -2
      - - 1
        - -2
      - - 0
        - -3
      height_difference:
        up: 2
        down: 2
        source_text: 上2・下2
        status: confirmed
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆
        star_value: 6
      - notation: ★★☆
        star_value: 11
      rarity: null
      quests:
      - 墓場
      - ゴーレム
      - スライム
      - 絵画
      drops:
      - ペングィン
      - ダンディウサギ等
      other_sources: []
    description_zh: 範圍衝擊波傷害並轉倒
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: knockdown
      probability: high
      duration_turns: 0
  everrealm:
    action_kind: area_damage_control
    deals_damage: true
    delivery_mode: pathless
    path_mode: null
    utility_effects:
    - type: knockdown
      probability: high
      duration_turns: 0
    damage:
      formula_applied: true
      formula: sqrt(49 / 3) * 0.8
      raw_multiplier: 4.0415
      utility_multiplier: 0.8
      final_total_multiplier: 3.2332
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: tenretsuhou
  name_zh: 天裂崩
  source_name_ja: 天裂崩
  type: CMD
  category: kentotsu_line
  requires:
  - 地碎崩
  requires_status: confirmed
  original_reference:
    ap: 85
    speed: C
    interrupt: 12
    durability: 4
    range:
      type: relative_cells
      source_pattern: |-
        ■
        ↑
      range_description: 可選 1 格：前1。
      range_cells_relative:
      - - 0
        - 1
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★
        star_value: 10
      - notation: ★★☆☆☆
        star_value: 13
      rarity: null
      quests:
      - カエル
      - 石碑
      - 海賊
      drops: []
      other_sources: []
    description_zh: 摔技傷害並擊退5格
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: knockback
      cells: 5
  everrealm:
    action_kind: damage_control
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects:
    - type: knockback
      cells: 5
    damage:
      formula_applied: true
      formula: sqrt(85 / 3) * 0.8
      raw_multiplier: 5.3229
      utility_multiplier: 0.8
      final_total_multiplier: 4.2583
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: resshin_kueiku
  name_zh: 烈震九影琥
  source_name_ja: 烈震九影琥
  type: CMD
  category: kentotsu_line
  requires:
  - 九影琥
  requires_status: confirmed
  original_reference:
    ap: 56
    speed: D
    interrupt: 12
    durability: 6
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: area_all_units
      source_pattern: |-
        口口■口口
        口■■■口
        ■■↑■■
        口■■■口
        口口■口口
      coordinate_origin: caster
      area_description: 影響 12 格：前2、前1左1、前1、前1右1、左2、左1、右1、右2、後1左1、後1、後1右1、後2。
      cells_relative:
      - - 0
        - 2
      - - -1
        - 1
      - - 0
        - 1
      - - 1
        - 1
      - - -2
        - 0
      - - -1
        - 0
      - - 1
        - 0
      - - 2
        - 0
      - - -1
        - -1
      - - 0
        - -1
      - - 1
        - -1
      - - 0
        - -2
      height_difference:
        up: 2
        down: 2
        source_text: 上2・下2
        status: confirmed
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆☆
        star_value: 8
      - notation: ★★☆☆
        star_value: 12
      rarity: null
      quests:
      - スライム
      - 石碑
      - 海賊
      - 王家の墓
      drops: []
      other_sources: []
    description_zh: 震地範圍傷害並轉倒
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: knockdown
      probability: high
      duration_turns: 0
  everrealm:
    action_kind: area_damage_control
    deals_damage: true
    delivery_mode: pathless
    path_mode: null
    utility_effects:
    - type: knockdown
      probability: high
      duration_turns: 0
    damage:
      formula_applied: true
      formula: sqrt(56 / 3) * 0.8
      raw_multiplier: 4.3205
      utility_multiplier: 0.8
      final_total_multiplier: 3.4564
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: jinken
  name_zh: 迅拳
  source_name_ja: 迅拳
  type: CMD
  category: jinken_line
  requires:
  - 正拳
  requires_status: confirmed
  original_reference:
    ap: 6
    speed: A
    interrupt: 1
    durability: 10
    range:
      type: relative_cells
      source_pattern: |-
        口■口
        ■↑■
      range_description: 可選 3 格：前1、左1、右1。
      range_cells_relative:
      - - 0
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: true
      shop_price: 300
      guild_reward_books:
      - notation: ☆
        star_value: 1
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 高速拳擊傷害
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects: []
  everrealm:
    action_kind: damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(6 / 3)
      raw_multiplier: 1.4142
      utility_multiplier: 1.0
      final_total_multiplier: 1.4142
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
  source_note: 原 Wiki 詳細表亦記為初期所持；初始授予可以視為 acquisition exception。
- id: rendan
  name_zh: 連擊
  source_name_ja: 連弾
  type: CMD
  category: jinken_line
  requires:
  - 迅拳
  requires_status: confirmed
  original_reference:
    ap: 12
    speed: B
    interrupt: 1*2
    durability: 10
    range:
      type: relative_cells
      source_pattern: |-
        ■■■
        ■↑■
      range_description: 可選 5 格：前1左1、前1、前1右1、左1、右1。
      range_cells_relative:
      - - -1
        - 1
      - - 0
        - 1
      - - 1
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: 600
      guild_reward_books:
      - notation: ☆☆
        star_value: 2
      rarity: null
      quests:
      - 旅立ちの決意
      drops: []
      other_sources: []
    description_zh: 2段連續拳擊
    description_status: traditional_chinese_functional_translation
    hit_count: 2
    source_hit_judgement: every_hit
    source_special_notes: []
    source_effects: []
  everrealm:
    action_kind: multi_hit_damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(12 / 3)
      raw_multiplier: 2.0
      utility_multiplier: 1.0
      final_total_multiplier: 2.0
    hit_resolution:
      hit_count: 2
      hit_judgement_mode: each_hit
      recheck_attack_path_each_hit: true
      rounding_remainder_priority: later_hits
      keep_original_intended_target: true
      keep_original_attack_path: true
- id: jisa_kentotsu
  name_zh: 時差正拳
  source_name_ja: 時差拳突
  type: CMD
  category: jinken_line
  requires:
  - 連擊
  requires_status: confirmed
  original_reference:
    ap: 7
    speed: C
    interrupt: 1
    durability: 10
    range:
      type: relative_cells
      source_pattern: |-
        ■■■
        ■↑■
      range_description: 可選 5 格：前1左1、前1、前1右1、左1、右1。
      range_cells_relative:
      - - -1
        - 1
      - - 0
        - 1
      - - 1
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆☆
        star_value: 3
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 對防禦姿態有效的佯攻
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: feint
      effective_against: guarding_target
  everrealm:
    action_kind: damage_control
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects:
    - type: feint
      effective_against: guarding_target
    damage:
      formula_applied: true
      formula: sqrt(7 / 3) * 0.8
      raw_multiplier: 1.5275
      utility_multiplier: 0.8
      final_total_multiplier: 1.222
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
  source_note: 上方只有連擊直線落入；冇跨欄 connector 接入，所以唔需要轉砲腳。
- id: sandan
  name_zh: 散彈
  source_name_ja: 散弾
  type: CMD
  category: jinken_line
  requires:
  - 時差正拳
  requires_status: confirmed
  original_reference:
    ap: 16
    speed: C
    interrupt: 1
    durability: 6
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: area_all_units
      source_pattern: |-
        ■■■
        口↑口
      coordinate_origin: caster
      area_description: 影響 3 格：前1左1、前1、前1右1。
      cells_relative:
      - - -1
        - 1
      - - 0
        - 1
      - - 1
        - 1
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆☆☆
        star_value: 4
      rarity: null
      quests:
      - ネギ
      drops: []
      other_sources: []
    description_zh: 前方範圍衝擊波傷害
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects: []
  everrealm:
    action_kind: area_damage
    deals_damage: true
    delivery_mode: pathless
    path_mode: null
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(16 / 3)
      raw_multiplier: 2.3094
      utility_multiplier: 1.0
      final_total_multiplier: 2.3094
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: korendan
  name_zh: 虎連擊
  source_name_ja: 虎連弾
  type: CMD
  category: jinken_line
  requires:
  - 散彈
  requires_status: confirmed
  original_reference:
    ap: 24
    speed: C
    interrupt: 1*3
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        口■口
        ■↑■
      range_description: 可選 3 格：前1、左1、右1。
      range_cells_relative:
      - - 0
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★
        star_value: 5
      rarity: null
      quests: []
      drops:
      - ウッディーリード
      - ミノゴブロス
      - 一部ゴブリン
      other_sources: []
    description_zh: 3段連續拳擊
    description_status: traditional_chinese_functional_translation
    hit_count: 3
    source_hit_judgement: every_hit
    source_special_notes:
    - 三連続攻撃
    - 特殊：威力の変動
    source_effects: []
  everrealm:
    action_kind: multi_hit_damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(24 / 3)
      raw_multiplier: 2.8284
      utility_multiplier: 1.0
      final_total_multiplier: 2.8284
    hit_resolution:
      hit_count: 3
      hit_judgement_mode: each_hit
      recheck_attack_path_each_hit: true
      rounding_remainder_priority: later_hits
      keep_original_intended_target: true
      keep_original_attack_path: true
- id: kouryuusei
  name_zh: 紅流星
  source_name_ja: 紅流星
  type: CMD
  category: jinken_line
  requires:
  - 虎連擊
  requires_status: confirmed
  original_reference:
    ap: 28
    speed: D
    interrupt: 1
    durability: 10
    range:
      type: relative_cells
      source_pattern: |-
        ■
        ■
        ■
        ↑
      range_description: 可選 3 格：前3、前2、前1。
      range_cells_relative:
      - - 0
        - 3
      - - 0
        - 2
      - - 0
        - 1
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: line_to_selected_target
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆
        star_value: 6
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 直線路徑衝擊波傷害
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects: []
    piercing: true
  everrealm:
    action_kind: line_damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(28 / 3)
      raw_multiplier: 3.0551
      utility_multiplier: 1.0
      final_total_multiplier: 3.0551
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: zanjuken
  name_zh: 殘充拳
  source_name_ja: 残充拳
  type: CMD
  category: jinken_line
  requires:
  - 紅流星
  requires_status: confirmed
  original_reference:
    ap: 18
    speed: S
    interrupt: 1
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        ■
        ↑
      range_description: 可選 1 格：前1。
      range_cells_relative:
      - - 0
        - 1
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆
        star_value: 7
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 超高速拳擊傷害
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects: []
  everrealm:
    action_kind: damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(18 / 3)
      raw_multiplier: 2.4495
      utility_multiplier: 1.0
      final_total_multiplier: 2.4495
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: dokushuken
  name_zh: 毒手拳
  source_name_ja: 毒手拳
  type: CMD
  category: jinken_line
  requires:
  - 殘充拳
  requires_status: cross_confirmed
  original_reference:
    ap: 25
    speed: D
    interrupt: 1
    durability: 10
    range:
      type: relative_cells
      source_pattern: |-
        口■口
        ■↑■
      range_description: 可選 3 格：前1、左1、右1。
      range_cells_relative:
      - - 0
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆☆☆
        star_value: 9
      - notation: ★★☆☆
        star_value: 12
      rarity: null
      quests:
      - 死神呪い
      - 山賊
      - 踊り子
      drops: []
      other_sources: []
    description_zh: 傷害並令雙方中毒
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: self_poison
      duration_turns: 1
    - type: poison
      probability: high
      duration_turns: 5
      status: uncertain
  everrealm:
    action_kind: damage_control
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects:
    - type: self_poison
      duration_turns: 1
    - type: poison
      probability: high
      duration_turns: 5
      status: uncertain
    damage:
      formula_applied: true
      formula: sqrt(25 / 3) * 0.8
      raw_multiplier: 2.8868
      utility_multiplier: 0.8
      final_total_multiplier: 2.3094
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
  source_note: 殘充拳主線喺百虎連擊前分出左支線落毒手拳。
- id: byakkorendan
  name_zh: 百虎連擊
  source_name_ja: 百虎連弾
  type: CMD
  category: jinken_line
  requires:
  - 殘充拳
  requires_status: confirmed
  original_reference:
    ap: 42
    speed: C
    interrupt: 1*5
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        ■
        ↑
      range_description: 可選 1 格：前1。
      range_cells_relative:
      - - 0
        - 1
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★
        star_value: 10
      rarity: レア
      quests:
      - 絵画
      - 踊り子
      - ハーブ
      - 邪教
      drops: []
      other_sources: []
    description_zh: 5段連續拳擊
    description_status: traditional_chinese_functional_translation
    hit_count: 5
    source_hit_judgement: every_hit
    source_special_notes:
    - 五連続攻撃
    - 特殊：威力の変動
    source_effects: []
  everrealm:
    action_kind: multi_hit_damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(42 / 3)
      raw_multiplier: 3.7417
      utility_multiplier: 1.0
      final_total_multiplier: 3.7417
    hit_resolution:
      hit_count: 5
      hit_judgement_mode: each_hit
      recheck_attack_path_each_hit: true
      rounding_remainder_priority: later_hits
      keep_original_intended_target: true
      keep_original_attack_path: true
- id: tenpoukyaku
  name_zh: 轉砲腳
  source_name_ja: 転砲脚
  type: CMD
  category: kick
  requires:
  - 迅拳
  requires_status: cross_confirmed
  original_reference:
    ap: 22
    speed: D
    interrupt: 4
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        口■口
        口■口
        ■↑■
      range_description: 可選 4 格：前2、前1、左1、右1。
      range_cells_relative:
      - - 0
        - 2
      - - 0
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆
        star_value: 7
      rarity: レア
      quests:
      - 種
      - メイド(強)
      - スライム
      - 果実
      drops: []
      other_sources: []
    description_zh: 傷害並擊退1格
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: knockback
      cells: 1
  everrealm:
    action_kind: damage_control
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects:
    - type: knockback
      cells: 1
    damage:
      formula_applied: true
      formula: sqrt(22 / 3) * 0.8
      raw_multiplier: 2.708
      utility_multiplier: 0.8
      final_total_multiplier: 2.1664
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
  source_note: 迅拳右側 connector 轉落轉砲腳。
- id: chiheikyaku
  name_zh: 地平腳
  source_name_ja: 地平脚
  type: CMD
  category: kick
  requires:
  - 轉砲腳
  requires_status: confirmed
  original_reference:
    ap: 25
    speed: C
    interrupt: 12
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        口■口
        ■↑■
      range_description: 可選 3 格：前1、左1、右1。
      range_cells_relative:
      - - 0
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: 0
        down: 0
        source_text: 上0?・下0?
        status: uncertain
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆☆
        star_value: 8
      rarity: null
      quests:
      - メイド(強)
      - コボルト
      - ゴーレム
      - ハーブ
      - 復讐
      drops: []
      other_sources: []
    description_zh: 貼地踢擊並轉倒
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: knockdown
      probability: high
      duration_turns: 0
  everrealm:
    action_kind: damage_control
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects:
    - type: knockdown
      probability: high
      duration_turns: 0
    damage:
      formula_applied: true
      formula: sqrt(25 / 3) * 0.8
      raw_multiplier: 2.8868
      utility_multiplier: 0.8
      final_total_multiplier: 2.3094
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: fuujinkyaku
  name_zh: 風刃腳
  source_name_ja: 風刃脚
  type: CMD
  category: kick
  requires:
  - 地平腳
  requires_status: confirmed
  original_reference:
    ap: 25
    speed: C
    interrupt: 1
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        口■口
        ■■■
        ■口■
        口↑口
      range_description: 可選 6 格：前3、前2左1、前2、前2右1、前1左1、前1右1。
      range_cells_relative:
      - - 0
        - 3
      - - -1
        - 2
      - - 0
        - 2
      - - 1
        - 2
      - - -1
        - 1
      - - 1
        - 1
      height_difference:
        up: 2
        down: 2
        source_text: 上2・下2
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★
        star_value: 10
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 曲射真空刃傷害
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes:
    - 曲射
    source_effects: []
  everrealm:
    action_kind: damage
    deals_damage: true
    delivery_mode: arc
    path_mode: null
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(25 / 3)
      raw_multiplier: 2.8868
      utility_multiplier: 1.0
      final_total_multiplier: 2.8868
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: gouhoukyaku
  name_zh: 豪砲腳
  source_name_ja: 豪砲脚
  type: CMD
  category: kick
  requires:
  - 風刃腳
  requires_status: confirmed
  original_reference:
    ap: 36
    speed: D
    interrupt: 12
    durability: 4
    range:
      type: relative_cells
      source_pattern: |-
        口■口
        ■↑■
      range_description: 可選 3 格：前1、左1、右1。
      range_cells_relative:
      - - 0
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆
        star_value: 11
      rarity: null
      quests:
      - 山賊
      - 海賊
      - 邪教
      drops: []
      other_sources: []
    description_zh: 傷害並擊退4格
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: knockback
      cells: 4
  everrealm:
    action_kind: damage_control
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects:
    - type: knockback
      cells: 4
    damage:
      formula_applied: true
      formula: sqrt(36 / 3) * 0.8
      raw_multiplier: 3.4641
      utility_multiplier: 0.8
      final_total_multiplier: 2.7713
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: fuujin_kikoukyaku
  name_zh: 風神氣功腳
  source_name_ja: 風神気功脚
  type: CMD
  category: kick_ki_hybrid
  requires:
  - 豪砲腳
  - 氣功彈
  requires_status: cross_confirmed
  original_reference:
    ap: 55
    speed: D
    interrupt: 1
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        ■■■■■
        口■■■口
        口口■口口
        口口↑口口
      range_description: 可選 9 格：前3左2、前3左1、前3、前3右1、前3右2、前2左1、前2、前2右1、前1。
      range_cells_relative:
      - - -2
        - 3
      - - -1
        - 3
      - - 0
        - 3
      - - 1
        - 3
      - - 2
        - 3
      - - -1
        - 2
      - - 0
        - 2
      - - 1
        - 2
      - - 0
        - 1
      height_difference:
        up: 2
        down: null
        source_text: 上2?・下∞
        status: uncertain_up
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆☆☆
        star_value: 13
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 直射氣功踢擊
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes:
    - 直射
    - 上2?・下∞
    source_effects: []
  everrealm:
    action_kind: damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(55 / 3)
      raw_multiplier: 4.2817
      utility_multiplier: 1.0
      final_total_multiplier: 4.2817
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
  source_note: 原 tree 用左右兩邊轉入同一節點嘅 connector；足技線同氣功線同時接入。
- id: buyou
  name_zh: 舞葉
  source_name_ja: 舞葉
  type: CMD
  category: evade_counter
  requires:
  - 正拳
  requires_status: confirmed
  original_reference:
    ap: 7
    speed: A
    interrupt: null
    durability: 10
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: self_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆
        star_value: 1
      rarity: 準レア
      quests:
      - ネギ
      - 球根
      drops: []
      other_sources: []
    description_zh: 高迴避姿態
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: evasion_stance
      probability: high
      duration_turns: 0
  everrealm:
    action_kind: self_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: evasion_stance
      probability: high
      duration_turns: 0
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: sen_no_sen
  name_zh: 先之先
  source_name_ja: 先之先
  type: CMD
  category: evade_counter
  requires:
  - 舞葉
  requires_status: confirmed
  original_reference:
    ap: 18
    speed: B
    interrupt: null
    durability: 10
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: self_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆
        star_value: 1
      rarity: レア
      quests:
      - 蟹
      - 地竜
      - 球根
      drops: []
      other_sources: []
    description_zh: 反擊姿態
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: counter_stance
      duration_turns: 0
  everrealm:
    action_kind: counter_stance
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: counter_stance
      duration_turns: 0
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: choudankyaku
  name_zh: 跳彈腳
  source_name_ja: 跳弾脚
  type: CMD
  category: evade_counter
  requires:
  - 先之先
  - 轉砲腳
  requires_status: cross_confirmed
  original_reference:
    ap: 18
    speed: B
    interrupt: null
    durability: 6
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: self_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆
        star_value: 7
      rarity: null
      quests:
      - メイド(弱)
      - コボルト
      - ハチミツ
      - 指輪
      - 絵画
      - 山賊
      drops: []
      other_sources: []
    description_zh: 投射反射姿態
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: projectile_reflect_stance
      duration_turns: 0
  everrealm:
    action_kind: counter_stance
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: projectile_reflect_stance
      duration_turns: 0
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
  source_note: 跳彈腳上方「┫」明確表示轉砲腳支線同先之先直線一齊接入。
- id: ryuugan
  name_zh: 龍眼
  source_name_ja: 竜眼
  type: CMD
  category: evade_counter
  requires:
  - 跳彈腳
  requires_status: confirmed
  original_reference:
    ap: 16
    speed: A
    interrupt: null
    durability: 10
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: self_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆
        star_value: 11
      rarity: レア
      quests:
      - ハーブ
      - 王家の墓
      drops: []
      other_sources: []
    description_zh: 強化高迴避姿態
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: super_evasion_stance
      probability: high
      duration_turns: 0
  everrealm:
    action_kind: self_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: super_evasion_stance
      probability: high
      duration_turns: 0
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: houkou
  name_zh: 咆哮
  source_name_ja: 咆哮
  type: CMD
  category: ki_ranged
  requires:
  - 正拳
  requires_status: confirmed
  original_reference:
    ap: 38
    speed: B
    interrupt: 12
    durability: 6
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: area_all_units
      source_pattern: |-
        ■■■■■■■
        口■■■■■口
        口口■■■口口
        口口口■口口口
        口口口↑口口口
      coordinate_origin: caster
      area_description: 影響 16 格：前4左3、前4左2、前4左1、前4、前4右1、前4右2、前4右3、前3左2、前3左1、前3、前3右1、前3右2、前2左1、前2、前2右1、前1。
      cells_relative:
      - - -3
        - 4
      - - -2
        - 4
      - - -1
        - 4
      - - 0
        - 4
      - - 1
        - 4
      - - 2
        - 4
      - - 3
        - 4
      - - -2
        - 3
      - - -1
        - 3
      - - 0
        - 3
      - - 1
        - 3
      - - 2
        - 3
      - - -1
        - 2
      - - 0
        - 2
      - - 1
        - 2
      - - 0
        - 1
      height_difference:
        up: 2
        down: 2
        source_text: 上2・下2
        status: confirmed
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆
        star_value: 2
      rarity: null
      quests:
      - リョマ
      - ネギ
      - 焼肉
      - 土鍋
      drops: []
      other_sources: []
    description_zh: 範圍行動妨害
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: action_interference
      value: 12
      affects: all_units_in_effect_area
  everrealm:
    action_kind: area_control
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: action_interference
      value: 12
      affects: all_units_in_effect_area
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: mutouki
  name_zh: 無鬥氣
  source_name_ja: 無闘気
  type: CMD
  category: ki_ranged
  requires:
  - 咆哮
  requires_status: confirmed
  original_reference:
    ap: 35
    speed: B
    interrupt: null
    durability: 6
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: self_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆☆
        star_value: 3
      rarity: null
      quests:
      - ネギ
      - 焼肉
      - 土鍋
      - ハチミツ
      drops: []
      other_sources: []
    description_zh: 透明2回合
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: invisible
      duration_turns: 2
  everrealm:
    action_kind: self_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: invisible
      duration_turns: 2
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: shuukijutsu
  name_zh: 集氣術
  source_name_ja: 集気術
  type: CMD
  category: ki_ranged
  requires:
  - 無鬥氣
  requires_status: confirmed
  original_reference:
    ap: 20
    speed: C
    interrupt: null
    durability: 6
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: self_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆☆☆
        star_value: 4
      rarity: null
      quests:
      - 仮面
      - たこ焼き
      drops: []
      other_sources: []
    description_zh: 少量HP回復
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: heal_hp
      magnitude: small
  everrealm:
    action_kind: heal
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: heal_hp
      magnitude: small
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: fudoushibari
  name_zh: 不動縛
  source_name_ja: 不動縛
  type: CMD
  category: ki_ranged
  requires:
  - 無鬥氣
  requires_status: cross_confirmed
  original_reference:
    ap: 35
    speed: D
    interrupt: null
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        口口■口口
        口口口口口
        ■口↑口■
      range_description: 可選 3 格：前2、左2、右2。
      range_cells_relative:
      - - 0
        - 2
      - - -2
        - 0
      - - 2
        - 0
      height_difference:
        up: 3
        down: 3
        source_text: 上3・下3
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆☆☆
        star_value: 9
      rarity: null
      quests:
      - ゴーレム
      - カエル
      - 王家の墓
      - 邪教
      drops: []
      other_sources: []
    description_zh: 指定目標麻痺2回合
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes:
    - 経路が存在する
    source_effects:
    - type: paralysis
      probability: high
      duration_turns: 2
  everrealm:
    action_kind: single_target_control
    deals_damage: false
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects:
    - type: paralysis
      probability: high
      duration_turns: 2
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
  source_note: 無鬥氣右側 branch 轉落不動縛；唔係由集氣術直落。
- id: retsusenkou
  name_zh: 裂閃光
  source_name_ja: 裂閃光
  type: CMD
  category: ki_ranged
  requires:
  - 集氣術
  requires_status: confirmed
  original_reference:
    ap: 35
    speed: D
    interrupt: null
    durability: 6
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: area_all_units
      source_pattern: |-
        ■■■■■
        口■■■口
        口口■口口
        口口↑口口
      coordinate_origin: caster
      area_description: 影響 9 格：前3左2、前3左1、前3、前3右1、前3右2、前2左1、前2、前2右1、前1。
      cells_relative:
      - - -2
        - 3
      - - -1
        - 3
      - - 0
        - 3
      - - 1
        - 3
      - - 2
        - 3
      - - -1
        - 2
      - - 0
        - 2
      - - 1
        - 2
      - - 0
        - 1
      height_difference:
        up: 3
        down: 3
        source_text: 上3?・下3?
        status: uncertain
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★
        star_value: 5
      rarity: 準レア
      quests:
      - 焼肉
      - 人形
      - 仮面
      - パンダ
      - 種
      - 死神呪い
      - スライム
      drops: []
      other_sources: []
    description_zh: 範圍暗闇4回合
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: blind
      probability: high
      duration_turns: 4
  everrealm:
    action_kind: area_control
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: blind
      probability: high
      duration_turns: 4
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: shuuki_hijutsu
  name_zh: 集氣秘術
  source_name_ja: 集気秘術
  type: CMD
  category: ki_ranged
  requires:
  - 集氣術
  requires_status: cross_confirmed
  original_reference:
    ap: 38
    speed: C
    interrupt: null
    durability: 6
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: self_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆☆☆
        star_value: 13
      rarity: null
      quests:
      - 海賊
      - 邪教
      drops: []
      other_sources: []
    description_zh: 大量HP回復
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: heal_hp
      magnitude: large
  everrealm:
    action_kind: heal
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: heal_hp
      magnitude: large
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
  source_note: 集氣術向右分支再落集氣秘術；上方不動縛並冇 connector 直落呢招。
- id: shidan
  name_zh: 指彈
  source_name_ja: 指弾
  type: CMD
  category: ki_ranged
  requires:
  - 裂閃光
  requires_status: confirmed
  original_reference:
    ap: 12
    speed: C
    interrupt: 1
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        ■■■
        ■■■
        口■口
        口■口
        口↑口
      range_description: 可選 8 格：前4左1、前4、前4右1、前3左1、前3、前3右1、前2、前1。
      range_cells_relative:
      - - -1
        - 4
      - - 0
        - 4
      - - 1
        - 4
      - - -1
        - 3
      - - 0
        - 3
      - - 1
        - 3
      - - 0
        - 2
      - - 0
        - 1
      height_difference:
        up: 1
        down: unlimited
        source_text: 上1・下∞
        status: confirmed_down_unlimited
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆
        star_value: 6
      rarity: null
      quests:
      - パンダ
      - 種
      - メイド(弱)
      - 指輪
      - 果実
      drops: []
      other_sources: []
    description_zh: 小型直射氣彈
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes:
    - 直射
    source_effects: []
  everrealm:
    action_kind: damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(12 / 3)
      raw_multiplier: 2.0
      utility_multiplier: 1.0
      final_total_multiplier: 2.0
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: kikoudan
  name_zh: 氣功彈
  source_name_ja: 気功弾
  type: CMD
  category: ki_ranged
  requires:
  - 指彈
  requires_status: confirmed
  original_reference:
    ap: 32
    speed: D
    interrupt: 1
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        ■■■
        ■■■
        口■口
        口■口
        口↑口
      range_description: 可選 8 格：前4左1、前4、前4右1、前3左1、前3、前3右1、前2、前1。
      range_cells_relative:
      - - -1
        - 4
      - - 0
        - 4
      - - 1
        - 4
      - - -1
        - 3
      - - 0
        - 3
      - - 1
        - 3
      - - 0
        - 2
      - - 0
        - 1
      height_difference:
        up: 1
        down: unlimited
        source_text: 上1・下∞
        status: confirmed_down_unlimited
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆☆
        star_value: 8
      rarity: null
      quests:
      - メイド(強)
      - スライム
      - 指輪
      - カエル
      - 山賊
      drops:
      - エンサインオーク
      - ウォーラントオークなど一部オーク
      other_sources: []
    description_zh: 直射氣彈傷害
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes:
    - 直射
    source_effects: []
  everrealm:
    action_kind: damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(32 / 3)
      raw_multiplier: 3.266
      utility_multiplier: 1.0
      final_total_multiplier: 3.266
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: gekikoudan
  name_zh: 激氣功彈
  source_name_ja: 激気功弾
  type: CMD
  category: ki_ranged
  requires:
  - 氣功彈
  requires_status: confirmed
  original_reference:
    ap: 45
    speed: D
    interrupt: 1
    durability: 4
    range:
      type: relative_cells
      source_pattern: |-
        ■■■
        ■■■
        口■口
        口■口
        口↑口
      range_description: 可選 8 格：前4左1、前4、前4右1、前3左1、前3、前3右1、前2、前1。
      range_cells_relative:
      - - -1
        - 4
      - - 0
        - 4
      - - 1
        - 4
      - - -1
        - 3
      - - 0
        - 3
      - - 1
        - 3
      - - 0
        - 2
      - - 0
        - 1
      height_difference:
        up: 1
        down: unlimited
        source_text: 上1・下∞
        status: confirmed_down_unlimited
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆
        star_value: 11
      rarity: null
      quests:
      - 石碑
      - 踊り子
      drops: []
      other_sources: []
    description_zh: 大型直射氣彈
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes:
    - 直射
    source_effects: []
  everrealm:
    action_kind: damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(45 / 3)
      raw_multiplier: 3.873
      utility_multiplier: 1.0
      final_total_multiplier: 3.873
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: kikouhou
  name_zh: 氣功砲
  source_name_ja: 気功砲
  type: CMD
  category: ki_ranged
  requires:
  - 氣功彈
  requires_status: cross_confirmed
  original_reference:
    ap: 42
    speed: D
    interrupt: 1
    durability: 6
    range:
      type: relative_cells
      source_pattern: |-
        ■
        ■
        ■
        ■
        ■
        ↑
      range_description: 可選 5 格：前5、前4、前3、前2、前1。
      range_cells_relative:
      - - 0
        - 5
      - - 0
        - 4
      - - 0
        - 3
      - - 0
        - 2
      - - 0
        - 1
      height_difference:
        up: 1
        down: unlimited
        source_text: 上1・下∞
        status: confirmed_down_unlimited
    effect_area:
      type: line_to_selected_target
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆☆☆
        star_value: 9
      rarity: null
      quests:
      - メイド(強)
      - 絵画
      - 石碑
      - 復讐
      drops: []
      other_sources: []
    description_zh: 直線貫通氣功傷害
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes:
    - 直射
    source_effects: []
    piercing: true
  everrealm:
    action_kind: line_damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(42 / 3)
      raw_multiplier: 3.7417
      utility_multiplier: 1.0
      final_total_multiplier: 3.7417
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
  source_note: 氣功彈下方「╋」向右 branch 落氣功砲；唔需要集氣秘術。
- id: gekikou_kyodan
  name_zh: 激氣功巨彈
  source_name_ja: 激気功巨弾
  type: CMD
  category: ki_ranged
  requires:
  - 激氣功彈
  requires_status: confirmed
  original_reference:
    ap: 63
    speed: E
    interrupt: null
    durability: null
    range:
      type: relative_cells
      source_pattern: |-
        ■■■
        ■■■
        口■口
        口■口
        口↑口
      range_description: 可選 8 格：前4左1、前4、前4右1、前3左1、前3、前3右1、前2、前1。
      range_cells_relative:
      - - -1
        - 4
      - - 0
        - 4
      - - 1
        - 4
      - - -1
        - 3
      - - 0
        - 3
      - - 1
        - 3
      - - 0
        - 2
      - - 0
        - 1
      height_difference:
        up: 1
        down: unlimited
        source_text: 上1・下∞
        status: confirmed_down_unlimited
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★
        star_value: 10
      - notation: ★★☆☆☆☆
        star_value: 14
      rarity: null
      quests:
      - 海賊
      drops: []
      other_sources: []
    description_zh: 巨大直射氣彈
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes:
    - 実際は直射
    source_effects: []
  everrealm:
    action_kind: damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(63 / 3)
      raw_multiplier: 4.5826
      utility_multiplier: 1.0
      final_total_multiplier: 4.5826
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: kikou_sakuretsudan
  name_zh: 氣功炸裂彈
  source_name_ja: 気功炸裂弾
  type: CMD
  category: ki_ranged
  requires:
  - 激氣功彈
  requires_status: cross_confirmed
  original_reference:
    ap: 55
    speed: D
    interrupt: 1
    durability: 4
    range:
      type: relative_cells
      source_pattern: |-
        口口■口口
        口■口■口
        ■口口口■
        口口↑口口
      range_description: 可選 5 格：前3、前2左1、前2右1、前1左2、前1右2。
      range_cells_relative:
      - - 0
        - 3
      - - -1
        - 2
      - - 1
        - 2
      - - -2
        - 1
      - - 2
        - 1
      height_difference:
        up: 2
        down: unlimited
        source_text: 上2・下∞
        status: confirmed_down_unlimited
    effect_area:
      type: impact_area_all_units
      source_pattern: |-
        口■口
        ■■■
        口■口
      coordinate_origin: impact_cell
      area_description: 影響 5 格：前1、左1、自身、右1、後1。
      cells_relative:
      - - 0
        - 1
      - - -1
        - 0
      - - 0
        - 0
      - - 1
        - 0
      - - 0
        - -1
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆☆☆☆
        star_value: 14
      rarity: null
      quests:
      - 海賊
      drops: []
      other_sources: []
    description_zh: 曲射爆炸範圍傷害
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes:
    - 曲射
    source_effects: []
  everrealm:
    action_kind: area_damage
    deals_damage: true
    delivery_mode: arc
    path_mode: null
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(55 / 3)
      raw_multiplier: 4.2817
      utility_multiplier: 1.0
      final_total_multiplier: 4.2817
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
  source_note: 激氣功彈分支向右再落炸裂彈；上方氣功砲並冇直落 connector。
- id: ryudan
  name_zh: 龍彈
  source_name_ja: 龍弾
  type: CMD
  category: ki_ranged
  requires:
  - 激氣功巨彈
  requires_status: confirmed
  original_reference:
    ap: 90
    speed: E
    interrupt: null
    durability: null
    range:
      type: relative_cells
      source_pattern: |-
        ■
        ■
        ■
        ■
        ■
        ↑
      range_description: 可選 5 格：前5、前4、前3、前2、前1。
      range_cells_relative:
      - - 0
        - 5
      - - 0
        - 4
      - - 0
        - 3
      - - 0
        - 2
      - - 0
        - 1
      height_difference:
        up: 1
        down: unlimited
        source_text: 上1・下∞
        status: confirmed_down_unlimited
    effect_area:
      type: line_to_selected_target
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆☆☆☆
        star_value: 14
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 龍形直線貫通傷害
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes:
    - 直射
    source_effects: []
    piercing: true
  everrealm:
    action_kind: line_damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(90 / 3)
      raw_multiplier: 5.4772
      utility_multiplier: 1.0
      final_total_multiplier: 5.4772
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: bougyo
  name_zh: 防禦
  source_name_ja: 防御
  type: CMD
  category: side_warrior
  requires:
  - 正拳
  requires_status: confirmed
  original_reference:
    ap: 2
    speed: A
    interrupt: null
    durability: 10
    range:
      type: self
      source_pattern: 自己
      range_description: 只可選擇自己／以自己作為施放起點。
      range_cells_relative:
      - - 0
        - 0
      height_difference:
        status: not_applicable
    effect_area:
      type: self_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆
        star_value: 2
      rarity: null
      quests:
      - 蟹
      - 地竜
      - 焼肉
      - 球根
      - 人形
      drops: []
      other_sources: []
    description_zh: 減傷姿態
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: damage_reduction_stance
      duration_turns: 0
    requirements:
      job: warrior
      level_min: 5
  everrealm:
    action_kind: self_buff
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: damage_reduction_stance
      duration_turns: 0
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: denkangeki
  name_zh: 電拳擊
  source_name_ja: 電拳撃
  type: CMD
  category: side_warrior
  requires:
  - 防禦
  requires_status: confirmed
  original_reference:
    ap: 42
    speed: D
    interrupt: 1
    durability: 10
    range:
      type: relative_cells
      source_pattern: |-
        口■口
        ■↑■
      range_description: 可選 3 格：前1、左1、右1。
      range_cells_relative:
      - - 0
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆☆☆
        star_value: 4
      rarity: null
      quests:
      - 地竜
      - 人形
      - パンダ
      - 種
      drops: []
      other_sources: []
    description_zh: 傷害並低機率麻痺
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: paralysis
      probability: low
      duration_turns: 1
    requirements:
      job: warrior
      level_min: 10
  everrealm:
    action_kind: damage_control
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects:
    - type: paralysis
      probability: low
      duration_turns: 1
    damage:
      formula_applied: true
      formula: sqrt(42 / 3) * 0.8
      raw_multiplier: 3.7417
      utility_multiplier: 0.8
      final_total_multiplier: 2.9933
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: ruka_hanki_ken
  name_zh: 留下半氣拳
  source_name_ja: 留下半気拳
  type: CMD
  category: side_warrior
  requires:
  - 電拳擊
  requires_status: confirmed
  original_reference:
    ap: 47
    speed: D
    interrupt: null
    durability: null
    range:
      type: relative_cells
      source_pattern: |-
        ■
        ↑
      range_description: 可選 1 格：前1。
      range_cells_relative:
      - - 0
        - 1
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆☆
        star_value: 12
      rarity: null
      quests:
      - 踊り子
      - 復讐
      drops: []
      other_sources: []
    description_zh: 成功時令目標HP減至一半
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects: []
    requirements:
      job: warrior
      level_min: 15
  everrealm:
    action_kind: fixed_damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: false
      model:
        type: set_remaining_hp_fraction
        fraction: 0.5
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: null
      status: source_defined_fixed_damage_override
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: ruka_kouitsu_ken
  name_zh: 留下後一拳
  source_name_ja: 留下後一拳
  type: CMD
  category: side_warrior
  requires:
  - 留下半氣拳
  requires_status: confirmed
  original_reference:
    ap: 77
    speed: D
    interrupt: null
    durability: null
    range:
      type: relative_cells
      source_pattern: |-
        ■
        ↑
      range_description: 可選 1 格：前1。
      range_cells_relative:
      - - 0
        - 1
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆☆☆
        star_value: 9
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 成功時令目標HP剩1
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects: []
    requirements:
      job: warrior
      level_min: 20
  everrealm:
    action_kind: fixed_damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: false
      model:
        type: set_remaining_hp_value
        value: 1
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: null
      status: source_defined_fixed_damage_override
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: kenshaku
  name_zh: 拳瞬
  source_name_ja: 拳瞬
  type: CMD
  category: side_warrior
  requires:
  - 留下後一拳
  requires_status: confirmed
  original_reference:
    ap: 48
    speed: S
    interrupt: null
    durability: 10
    range:
      type: relative_cells
      source_pattern: |-
        ■
        ↑
      range_description: 可選 1 格：前1。
      range_cells_relative:
      - - 0
        - 1
      height_difference:
        up: 1
        down: 1
        source_text: 上1・下1
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆☆☆
        star_value: 13
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 超高速拳擊傷害
    description_status: traditional_chinese_functional_translation
    hit_count: 1
    source_hit_judgement: null
    source_special_notes: []
    source_effects: []
    requirements:
      job: warrior
      level_min: 25
  everrealm:
    action_kind: damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(48 / 3)
      raw_multiplier: 4.0
      utility_multiplier: 1.0
      final_total_multiplier: 4.0
    hit_resolution:
      hit_count: 1
      hit_judgement_mode: single
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: hijo_tenketsu
  name_zh: 痺除點穴
  source_name_ja: 痺除点穴
  type: CMD
  category: side_guardian
  requires:
  - 正拳
  requires_status: confirmed
  original_reference:
    ap: 3
    speed: D
    interrupt: null
    durability: null
    range:
      type: relative_cells
      source_pattern: |-
        口■口
        ■↑■
      range_description: 可選 3 格：前1、左1、右1。
      range_cells_relative:
      - - 0
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: null
        down: null
        source_text: 上??・下??
        status: uncertain
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ☆☆☆
        star_value: 3
      rarity: null
      quests:
      - 蟹
      - 地竜
      - 人形
      - 仮面
      - パンダ
      - たこ焼き
      - 墓場
      drops: []
      other_sources: []
    description_zh: 解除麻痺
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: cleanse
      statuses:
      - paralysis
    requirements:
      job: guardian
      level_min: 5
  everrealm:
    action_kind: cleanse
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: cleanse
      statuses:
      - paralysis
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: shincha_tenketsu
  name_zh: 心著點穴
  source_name_ja: 心着点穴
  type: CMD
  category: side_guardian
  requires:
  - 痺除點穴
  requires_status: confirmed
  original_reference:
    ap: 4
    speed: D
    interrupt: null
    durability: null
    range:
      type: unknown
      source_pattern: '?'
      range_description: 原 Wiki 射程圖標示為「?」，現有來源不足以確認平面射程。
      range_cells_relative: null
      height_difference:
        up: null
        down: null
        source_text: 上??・下??
        status: uncertain
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★
        star_value: 5
      rarity: null
      quests:
      - 土鍋
      - たこ焼き
      - メイド(弱)
      - 指輪
      drops: []
      other_sources: []
    description_zh: 解除放心／混亂／激怒
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: cleanse
      statuses:
      - 放心
      - 混亂
      - 激怒
    requirements:
      job: guardian
      level_min: 10
  everrealm:
    action_kind: cleanse
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: cleanse
      statuses:
      - 放心
      - 混亂
      - 激怒
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: kaimoku_tenketsu
  name_zh: 快目點穴
  source_name_ja: 快目点穴
  type: CMD
  category: side_guardian
  requires:
  - 心著點穴
  requires_status: confirmed
  original_reference:
    ap: 3
    speed: D
    interrupt: null
    durability: null
    range:
      type: unknown
      source_pattern: '?'
      range_description: 原 Wiki 射程圖標示為「?」，現有來源不足以確認平面射程。
      range_cells_relative: null
      height_difference:
        up: null
        down: null
        source_text: 上??・下??
        status: uncertain
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★☆☆☆
        star_value: 8
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 解除暗闇
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: cleanse
      statuses:
      - blind
    requirements:
      job: guardian
      level_min: 15
  everrealm:
    action_kind: cleanse
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: cleanse
      statuses:
      - blind
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: boumin_daha
  name_zh: 謀眠打破
  source_name_ja: 謀眠打破
  type: PSV
  category: side_guardian
  requires:
  - 快目點穴
  requires_status: confirmed
  original_reference:
    ap: null
    speed: null
    interrupt: null
    durability: null
    range:
      type: not_applicable
      source_pattern: null
      range_description: 被動技能，沒有主動選取射程。
      range_cells_relative: null
      height_difference:
        status: not_applicable
    effect_area:
      type: passive
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆☆
        star_value: 12
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 自動解除睡眠
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: auto_cleanse
      statuses:
      - sleep
    requirements:
      job: guardian
      level_min: 20
  everrealm:
    action_kind: passive_cleanse
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: auto_cleanse
      statuses:
      - sleep
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: kikou_gedoku
  name_zh: 氣孔解毒
  source_name_ja: 気孔解毒
  type: PSV
  category: side_guardian
  requires:
  - 謀眠打破
  requires_status: confirmed
  original_reference:
    ap: null
    speed: null
    interrupt: null
    durability: null
    range:
      type: not_applicable
      source_pattern: null
      range_description: 被動技能，沒有主動選取射程。
      range_cells_relative: null
      height_difference:
        status: not_applicable
    effect_area:
      type: passive
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆☆☆☆
        star_value: 14
      rarity: null
      quests: []
      drops: []
      other_sources: []
    description_zh: 自動解除中毒
    description_status: traditional_chinese_functional_translation
    hit_count: 0
    source_hit_judgement: null
    source_special_notes: []
    source_effects:
    - type: auto_cleanse
      statuses:
      - poison
    requirements:
      job: guardian
      level_min: 25
  everrealm:
    action_kind: passive_cleanse
    deals_damage: false
    delivery_mode: null
    path_mode: null
    utility_effects:
    - type: auto_cleanse
      statuses:
      - poison
    damage:
      formula_applied: false
      raw_multiplier: null
      utility_multiplier: null
      final_total_multiplier: 0
    hit_resolution:
      hit_count: 0
      hit_judgement_mode: not_applicable
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: not_applicable
- id: lusedes_da
  name_zh: ルセデス古流奧義「墮」
  source_name_ja: ルセデス古流奥義「堕」
  type: CMD
  category: ultimate
  requires:
  - 百虎連擊
  requires_status: cross_confirmed
  original_reference:
    ap: 100
    speed: D
    interrupt: 12
    durability: 4
    range:
      type: relative_cells
      source_pattern: |-
        口口■口口
        口■口■口
        ■口↑口■
      range_description: 可選 5 格：前2、前1左1、前1右1、左2、右2。
      range_cells_relative:
      - - 0
        - 2
      - - -1
        - 1
      - - 1
        - 1
      - - -2
        - 0
      - - 2
        - 0
      height_difference:
        up: 0
        down: 0
        source_text: 上0・下0
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆☆☆
        star_value: 13
      rarity: レア
      quests: []
      drops: []
      other_sources: []
    description_zh: 3段急降拳擊
    description_status: traditional_chinese_functional_translation
    hit_count: 3
    source_hit_judgement: initial_only
    source_special_notes: []
    source_effects: []
  everrealm:
    action_kind: multi_hit_damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(100 / 3)
      raw_multiplier: 5.7735
      utility_multiplier: 1.0
      final_total_multiplier: 5.7735
    hit_resolution:
      hit_count: 3
      hit_judgement_mode: initial_only
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: later_hits
  source_note: 百虎連擊下方 connector 向左轉落「墮」；毒手拳上方/下方並冇直線接入。
- id: lusedes_koku
  name_zh: ルセデス古流奧義「哭」
  source_name_ja: ルセデス古流奥義「哭」
  type: CMD
  category: ultimate
  requires:
  - 百虎連擊
  requires_status: confirmed
  original_reference:
    ap: 100
    speed: D
    interrupt: 12
    durability: 4
    range:
      type: relative_cells
      source_pattern: |-
        ■■■
        口↑口
      range_description: 可選 3 格：前1左1、前1、前1右1。
      range_cells_relative:
      - - -1
        - 1
      - - 0
        - 1
      - - 1
        - 1
      height_difference:
        up: 1
        down: 0
        source_text: 上1・下0
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆☆
        star_value: 12
      rarity: レア
      quests:
      - 王家の墓
      drops: []
      other_sources: []
    description_zh: 8段高速連擊
    description_status: traditional_chinese_functional_translation
    hit_count: 8
    source_hit_judgement: initial_only
    source_special_notes: []
    source_effects: []
  everrealm:
    action_kind: multi_hit_damage
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects: []
    damage:
      formula_applied: true
      formula: sqrt(100 / 3)
      raw_multiplier: 5.7735
      utility_multiplier: 1.0
      final_total_multiplier: 5.7735
    hit_resolution:
      hit_count: 8
      hit_judgement_mode: initial_only
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: later_hits
  source_note: 百虎連擊主線直接落「哭」。
- id: lusedes_tan
  name_zh: ルセデス古流奧義「嘆」
  source_name_ja: ルセデス古流奥義「嘆」
  type: CMD
  category: ultimate
  requires:
  - 百虎連擊
  - 豪砲腳
  requires_status: cross_confirmed
  original_reference:
    ap: 100
    speed: D
    interrupt: null
    durability: null
    range:
      type: relative_cells
      source_pattern: |-
        口■口
        ■↑■
      range_description: 可選 3 格：前1、左1、右1。
      range_cells_relative:
      - - 0
        - 1
      - - -1
        - 0
      - - 1
        - 0
      height_difference:
        up: 0
        down: 0
        source_text: 上0・下0
        status: confirmed
    effect_area:
      type: selected_target_only
    acquisition:
      initial: false
      shop_price: null
      guild_reward_books:
      - notation: ★★☆☆☆☆
        star_value: 14
      rarity: レア
      quests: []
      drops: []
      other_sources: []
    description_zh: 6段踩踏並擊退1格
    description_status: traditional_chinese_functional_translation
    hit_count: 6
    source_hit_judgement: initial_only
    source_special_notes: []
    source_effects:
    - type: knockback
      cells: 1
  everrealm:
    action_kind: multi_hit_damage_control
    deals_damage: true
    delivery_mode: linear
    path_mode: facingOrthogonalPriority
    utility_effects:
    - type: knockback
      cells: 1
    damage:
      formula_applied: true
      formula: sqrt(100 / 3) * 0.8
      raw_multiplier: 5.7735
      utility_multiplier: 0.8
      final_total_multiplier: 4.6188
    hit_resolution:
      hit_count: 6
      hit_judgement_mode: initial_only
      recheck_attack_path_each_hit: false
      rounding_remainder_priority: later_hits
  source_note: 「嘆」上方「┫」同時接百虎連擊橫支線及豪砲腳垂直線。
```

---

# 完整度檢查

- [x] 65 / 65 技能有同一份 detailed schema
- [x] 53 CMD 全部有 AP / Speed 欄位；原 Wiki 空白值保留 `null`
- [x] 12 PSV 全部有被動效果、繁中功能說明及入手星級
- [x] 每個已知 range pattern 都有 machine-readable relative cells
- [x] 原 Wiki `?` 保持 uncertain
- [x] 原 Wiki `∞` 保持 unlimited
- [x] 每招都有 `action_kind`
- [x] 每招都有 `deals_damage`
- [x] 普通傷害技使用 `sqrt(AP / 3)`
- [x] 傷害 + 額外非傷害 utility 使用 `×0.8`
- [x] Multi-hit 本身唔當 utility
- [x] `判定：毎回` 對應 `each_hit`
- [x] multi-hit remainder 優先分配畀後面 Hits
- [x] fixed-HP 特殊傷害使用 explicit override
- [x] 技能書星級使用 `★=5`、`☆=1` 計法
- [x] prerequisite graph 保留已確認 connector 規則

---

# 驗證狀態

```text
confirmed
```

= 原 Wiki 直線或清楚 branch 可直接判讀。

```text
cross_confirmed
```

= 原 Wiki 有清楚跨欄 connector，而且可以確認係多前置／跨系關係。

```text
needs_manual_verification
```

= connector 過密或現有純文字版 spacing 仍不足以 100% 確認。

本版原則：

> **唔再因為「位置接近」使用 `cross_inferred` 自行猜 prerequisite。**

如果未能由 connector 確認，就標記：

```text
needs_manual_verification
```

而唔加入未證實嘅前置技能。

---

# Machine-readable skill graph

> 呢一節只負責 prerequisite topology；上面「完整技能資料（65 / 65）」已經係詳細數值／射程／說明／分類／balance source of truth。兩節嘅 `id`／名稱／requires 必須一致。


```yaml
schema_version: 2

game: STRUGARDEN
class:
  id: fighter
  name_zh: 格鬥士
  source_name_ja: 格闘士

requires_semantics: all

display:
  root_skill: 正拳
  root_column: jinken_line
  note: 正拳 visual position 右移一欄，放喺迅拳欄上方。

skills:

  # =========================================================
  # PSV
  # =========================================================

  - id: psv_tesshin
    name_zh: 鐵身
    source_name_ja: 鉄身
    type: PSV
    category: body_passive
    requires: []
    requires_status: confirmed

  - id: psv_ukimi
    name_zh: 浮身
    source_name_ja: 浮身
    type: PSV
    category: body_passive
    requires:
      - 鐵身
    requires_status: confirmed

  - id: psv_koushin
    name_zh: 鋼身
    source_name_ja: 鋼身
    type: PSV
    category: body_passive
    requires:
      - 浮身
    requires_status: confirmed

  - id: psv_shintou_mekkyaku
    name_zh: 心頭滅卻
    source_name_ja: 心頭滅却
    type: PSV
    category: body_passive
    requires:
      - 鋼身
    requires_status: confirmed

  - id: psv_seishin_touitsu
    name_zh: 精神統一
    source_name_ja: 精神統一
    type: PSV
    category: body_passive
    requires:
      - 心頭滅卻
    requires_status: confirmed

  - id: psv_soshin_sokutai
    name_zh: 狙身捉體
    source_name_ja: 狙身捉体
    type: PSV
    category: body_passive
    requires:
      - 精神統一
    requires_status: confirmed

  - id: psv_hishin_jutai
    name_zh: 避身柔體
    source_name_ja: 避身柔体
    type: PSV
    category: body_passive
    requires:
      - 狙身捉體
    requires_status: confirmed

  - id: psv_koushin_gekitai
    name_zh: 功身擊體
    source_name_ja: 功身撃体
    type: PSV
    category: body_passive
    requires:
      - 避身柔體
    requires_status: confirmed

  - id: psv_boushin_goutai
    name_zh: 防身剛體
    source_name_ja: 防身剛体
    type: PSV
    category: body_passive
    requires:
      - 功身擊體
    requires_status: confirmed

  - id: psv_sokushin_keitai
    name_zh: 速身輕體
    source_name_ja: 速身軽体
    type: PSV
    category: body_passive
    requires:
      - 防身剛體
    requires_status: confirmed

  # =========================================================
  # Root
  # =========================================================

  - id: kentotsu
    name_zh: 正拳
    source_name_ja: 拳突
    type: CMD
    category: root
    display_column: jinken_line
    requires: []
    requires_status: confirmed
    source_note: 初期所持；visual layout 放喺迅拳欄上方。

  # =========================================================
  # 正拳 / 背拳分支
  # =========================================================

  - id: haiken
    name_zh: 背拳
    source_name_ja: 背拳
    type: CMD
    category: kentotsu_line
    requires:
      - 正拳
    requires_status: confirmed

  - id: sunkei
    name_zh: 寸勁
    source_name_ja: 寸剄
    type: CMD
    category: kentotsu_line
    requires:
      - 背拳
    requires_status: confirmed

  - id: kenpou
    name_zh: 拳砲
    source_name_ja: 拳砲
    type: CMD
    category: kentotsu_line
    requires:
      - 寸勁
    requires_status: confirmed

  - id: gangatotsu
    name_zh: 岩牙突
    source_name_ja: 岩牙突
    type: CMD
    category: kentotsu_line
    requires:
      - 拳砲
    requires_status: confirmed

  - id: gangaretsujin
    name_zh: 岩牙列陣
    source_name_ja: 岩牙列陣
    type: CMD
    category: kentotsu_line
    requires:
      - 岩牙突
    requires_status: confirmed

  - id: gangahoujin
    name_zh: 岩牙方陣
    source_name_ja: 岩牙方陣
    type: CMD
    category: kentotsu_line
    requires:
      - 岩牙突
    requires_status: confirmed

  - id: chisaihou
    name_zh: 地碎崩
    source_name_ja: 地砕崩
    type: CMD
    category: kentotsu_line
    requires:
      - 岩牙列陣
    requires_status: confirmed

  - id: kueiku
    name_zh: 九影琥
    source_name_ja: 九影琥
    type: CMD
    category: kentotsu_line
    requires:
      - 岩牙方陣
    requires_status: confirmed

  - id: tenretsuhou
    name_zh: 天裂崩
    source_name_ja: 天裂崩
    type: CMD
    category: kentotsu_line
    requires:
      - 地碎崩
    requires_status: confirmed

  - id: resshin_kueiku
    name_zh: 烈震九影琥
    source_name_ja: 烈震九影琥
    type: CMD
    category: kentotsu_line
    requires:
      - 九影琥
    requires_status: confirmed

  # =========================================================
  # 迅拳 / 連擊 line
  # =========================================================

  - id: jinken
    name_zh: 迅拳
    source_name_ja: 迅拳
    type: CMD
    category: jinken_line
    requires:
      - 正拳
    requires_status: confirmed
    source_note: 原 Wiki 詳細表亦記為初期所持；初始授予可以視為 acquisition exception。

  - id: rendan
    name_zh: 連擊
    source_name_ja: 連弾
    type: CMD
    category: jinken_line
    requires:
      - 迅拳
    requires_status: confirmed

  - id: jisa_kentotsu
    name_zh: 時差正拳
    source_name_ja: 時差拳突
    type: CMD
    category: jinken_line
    requires:
      - 連擊
    requires_status: confirmed
    source_note: 上方只有連擊直線落入；冇跨欄 connector 接入，所以唔需要轉砲腳。

  - id: sandan
    name_zh: 散彈
    source_name_ja: 散弾
    type: CMD
    category: jinken_line
    requires:
      - 時差正拳
    requires_status: confirmed

  - id: korendan
    name_zh: 虎連擊
    source_name_ja: 虎連弾
    type: CMD
    category: jinken_line
    requires:
      - 散彈
    requires_status: confirmed

  - id: kouryuusei
    name_zh: 紅流星
    source_name_ja: 紅流星
    type: CMD
    category: jinken_line
    requires:
      - 虎連擊
    requires_status: confirmed

  - id: zanjuken
    name_zh: 殘充拳
    source_name_ja: 残充拳
    type: CMD
    category: jinken_line
    requires:
      - 紅流星
    requires_status: confirmed

  - id: dokushuken
    name_zh: 毒手拳
    source_name_ja: 毒手拳
    type: CMD
    category: jinken_line
    requires:
      - 殘充拳
    requires_status: cross_confirmed
    source_note: 殘充拳主線喺百虎連擊前分出左支線落毒手拳。

  - id: byakkorendan
    name_zh: 百虎連擊
    source_name_ja: 百虎連弾
    type: CMD
    category: jinken_line
    requires:
      - 殘充拳
    requires_status: confirmed

  # =========================================================
  # 足技
  # =========================================================

  - id: tenpoukyaku
    name_zh: 轉砲腳
    source_name_ja: 転砲脚
    type: CMD
    category: kick
    requires:
      - 迅拳
    requires_status: cross_confirmed
    source_note: 迅拳右側 connector 轉落轉砲腳。

  - id: chiheikyaku
    name_zh: 地平腳
    source_name_ja: 地平脚
    type: CMD
    category: kick
    requires:
      - 轉砲腳
    requires_status: confirmed

  - id: fuujinkyaku
    name_zh: 風刃腳
    source_name_ja: 風刃脚
    type: CMD
    category: kick
    requires:
      - 地平腳
    requires_status: confirmed

  - id: gouhoukyaku
    name_zh: 豪砲腳
    source_name_ja: 豪砲脚
    type: CMD
    category: kick
    requires:
      - 風刃腳
    requires_status: confirmed

  - id: fuujin_kikoukyaku
    name_zh: 風神氣功腳
    source_name_ja: 風神気功脚
    type: CMD
    category: kick_ki_hybrid
    requires:
      - 豪砲腳
      - 氣功彈
    requires_status: cross_confirmed
    source_note: 原 tree 用左右兩邊轉入同一節點嘅 connector；足技線同氣功線同時接入。

  # =========================================================
  # 回避 / 反擊
  # =========================================================

  - id: buyou
    name_zh: 舞葉
    source_name_ja: 舞葉
    type: CMD
    category: evade_counter
    requires:
      - 正拳
    requires_status: confirmed

  - id: sen_no_sen
    name_zh: 先之先
    source_name_ja: 先之先
    type: CMD
    category: evade_counter
    requires:
      - 舞葉
    requires_status: confirmed

  - id: choudankyaku
    name_zh: 跳彈腳
    source_name_ja: 跳弾脚
    type: CMD
    category: evade_counter
    requires:
      - 先之先
      - 轉砲腳
    requires_status: cross_confirmed
    source_note: 跳彈腳上方「┫」明確表示轉砲腳支線同先之先直線一齊接入。

  - id: ryuugan
    name_zh: 龍眼
    source_name_ja: 竜眼
    type: CMD
    category: evade_counter
    requires:
      - 跳彈腳
    requires_status: confirmed

  # =========================================================
  # 氣功 / 遠距離
  # =========================================================

  - id: houkou
    name_zh: 咆哮
    source_name_ja: 咆哮
    type: CMD
    category: ki_ranged
    requires:
      - 正拳
    requires_status: confirmed

  - id: mutouki
    name_zh: 無鬥氣
    source_name_ja: 無闘気
    type: CMD
    category: ki_ranged
    requires:
      - 咆哮
    requires_status: confirmed

  - id: shuukijutsu
    name_zh: 集氣術
    source_name_ja: 集気術
    type: CMD
    category: ki_ranged
    requires:
      - 無鬥氣
    requires_status: confirmed

  - id: fudoushibari
    name_zh: 不動縛
    source_name_ja: 不動縛
    type: CMD
    category: ki_ranged
    requires:
      - 無鬥氣
    requires_status: cross_confirmed
    source_note: 無鬥氣右側 branch 轉落不動縛；唔係由集氣術直落。

  - id: retsusenkou
    name_zh: 裂閃光
    source_name_ja: 裂閃光
    type: CMD
    category: ki_ranged
    requires:
      - 集氣術
    requires_status: confirmed

  - id: shuuki_hijutsu
    name_zh: 集氣秘術
    source_name_ja: 集気秘術
    type: CMD
    category: ki_ranged
    requires:
      - 集氣術
    requires_status: cross_confirmed
    source_note: 集氣術向右分支再落集氣秘術；上方不動縛並冇 connector 直落呢招。

  - id: shidan
    name_zh: 指彈
    source_name_ja: 指弾
    type: CMD
    category: ki_ranged
    requires:
      - 裂閃光
    requires_status: confirmed

  - id: kikoudan
    name_zh: 氣功彈
    source_name_ja: 気功弾
    type: CMD
    category: ki_ranged
    requires:
      - 指彈
    requires_status: confirmed

  - id: gekikoudan
    name_zh: 激氣功彈
    source_name_ja: 激気功弾
    type: CMD
    category: ki_ranged
    requires:
      - 氣功彈
    requires_status: confirmed

  - id: kikouhou
    name_zh: 氣功砲
    source_name_ja: 気功砲
    type: CMD
    category: ki_ranged
    requires:
      - 氣功彈
    requires_status: cross_confirmed
    source_note: 氣功彈下方「╋」向右 branch 落氣功砲；唔需要集氣秘術。

  - id: gekikou_kyodan
    name_zh: 激氣功巨彈
    source_name_ja: 激気功巨弾
    type: CMD
    category: ki_ranged
    requires:
      - 激氣功彈
    requires_status: confirmed

  - id: kikou_sakuretsudan
    name_zh: 氣功炸裂彈
    source_name_ja: 気功炸裂弾
    type: CMD
    category: ki_ranged
    requires:
      - 激氣功彈
    requires_status: cross_confirmed
    source_note: 激氣功彈分支向右再落炸裂彈；上方氣功砲並冇直落 connector。

  - id: ryudan
    name_zh: 龍彈
    source_name_ja: 龍弾
    type: CMD
    category: ki_ranged
    requires:
      - 激氣功巨彈
    requires_status: confirmed

  # =========================================================
  # Side 戰士
  # =========================================================

  - id: bougyo
    name_zh: 防禦
    source_name_ja: 防御
    type: CMD
    category: side_warrior
    requires:
      - 正拳
    requires_status: confirmed
    additional_requirement: side_job_warrior_level

  - id: denkangeki
    name_zh: 電拳擊
    source_name_ja: 電拳撃
    type: CMD
    category: side_warrior
    requires:
      - 防禦
    requires_status: confirmed
    additional_requirement: side_job_warrior_level

  - id: ruka_hanki_ken
    name_zh: 留下半氣拳
    source_name_ja: 留下半気拳
    type: CMD
    category: side_warrior
    requires:
      - 電拳擊
    requires_status: confirmed
    additional_requirement: side_job_warrior_level

  - id: ruka_kouitsu_ken
    name_zh: 留下後一拳
    source_name_ja: 留下後一拳
    type: CMD
    category: side_warrior
    requires:
      - 留下半氣拳
    requires_status: confirmed
    additional_requirement: side_job_warrior_level

  - id: kenshaku
    name_zh: 拳瞬
    source_name_ja: 拳瞬
    type: CMD
    category: side_warrior
    requires:
      - 留下後一拳
    requires_status: confirmed
    additional_requirement: side_job_warrior_level

  # =========================================================
  # Side 守護
  # =========================================================

  - id: hijo_tenketsu
    name_zh: 痺除點穴
    source_name_ja: 痺除点穴
    type: CMD
    category: side_guardian
    requires:
      - 正拳
    requires_status: confirmed
    additional_requirement: side_job_guardian_level

  - id: shincha_tenketsu
    name_zh: 心著點穴
    source_name_ja: 心着点穴
    type: CMD
    category: side_guardian
    requires:
      - 痺除點穴
    requires_status: confirmed
    additional_requirement: side_job_guardian_level

  - id: kaimoku_tenketsu
    name_zh: 快目點穴
    source_name_ja: 快目点穴
    type: CMD
    category: side_guardian
    requires:
      - 心著點穴
    requires_status: confirmed
    additional_requirement: side_job_guardian_level

  - id: boumin_daha
    name_zh: 謀眠打破
    source_name_ja: 謀眠打破
    type: PSV
    category: side_guardian
    requires:
      - 快目點穴
    requires_status: confirmed
    additional_requirement: side_job_guardian_level

  - id: kikou_gedoku
    name_zh: 氣孔解毒
    source_name_ja: 気孔解毒
    type: PSV
    category: side_guardian
    requires:
      - 謀眠打破
    requires_status: confirmed
    additional_requirement: side_job_guardian_level

  # =========================================================
  # ルセデス古流奧義
  # =========================================================

  - id: lusedes_da
    name_zh: ルセデス古流奧義「墮」
    source_name_ja: ルセデス古流奥義「堕」
    type: CMD
    category: ultimate
    requires:
      - 百虎連擊
    requires_status: cross_confirmed
    source_note: 百虎連擊下方 connector 向左轉落「墮」；毒手拳上方/下方並冇直線接入。

  - id: lusedes_koku
    name_zh: ルセデス古流奧義「哭」
    source_name_ja: ルセデス古流奥義「哭」
    type: CMD
    category: ultimate
    requires:
      - 百虎連擊
    requires_status: confirmed
    source_note: 百虎連擊主線直接落「哭」。

  - id: lusedes_tan
    name_zh: ルセデス古流奧義「嘆」
    source_name_ja: ルセデス古流奥義「嘆」
    type: CMD
    category: ultimate
    requires:
      - 百虎連擊
      - 豪砲腳
    requires_status: cross_confirmed
    source_note: 「嘆」上方「┫」同時接百虎連擊橫支線及豪砲腳垂直線。
```

---

# 已確認跨系／跨欄前置

## 跳彈腳

```yaml
跳彈腳:
  requires:
    - 先之先
    - 轉砲腳
```

## 風神氣功腳

```yaml
風神氣功腳:
  requires:
    - 豪砲腳
    - 氣功彈
```

## ルセデス古流奧義「嘆」

```yaml
ルセデス古流奧義「嘆」:
  requires:
    - 百虎連擊
    - 豪砲腳
```

---

# 特別排除：唔係多前置

以下係最容易因純文字 spacing 睇錯嘅位置。

## 時差正拳

正確：

```yaml
requires:
  - 連擊
```

錯誤：

```yaml
requires:
  - 連擊
  - 轉砲腳
```

原因：

> `時差正拳` 上面冇跨欄 branch symbol。

---

## 集氣秘術

正確：

```yaml
requires:
  - 集氣術
```

`不動縛` 唔係前置。

---

## 氣功砲

正確：

```yaml
requires:
  - 氣功彈
```

`集氣秘術` 唔係前置。

---

## 氣功炸裂彈

正確：

```yaml
requires:
  - 激氣功彈
```

`氣功砲` 唔係前置。

---

# Runtime / UI 原則

如果 Everrealm 日後參考呢套樹：

```text
skill data
    ↓
explicit prerequisite graph
    ↓
skill-tree UI
```

唔可以：

```text
UI 上見到技能擺得近
    ↓
runtime 猜佢哋有前置關係
```

---

# 原版 Reference vs Everrealm

長期分兩層：

```yaml
original_reference:
  name_zh: 跳彈腳
  source_name_ja: 跳弾脚
  requires:
    - 先之先
    - 轉砲腳

everrealm:
  id:
  requires:
  balance_notes:
```

咁之後可以清楚分辨：

- 幸福 Online 原版資料；
- Everrealm 自己改過嘅技能設計。

