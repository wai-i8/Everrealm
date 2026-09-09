# 戰棋對戰系統 · BATTLE_SYSTEM

## 1. 文件定位

本文件係《永恆國度 · Everrealm》戰棋戰鬥嘅 **唯一詳細規格來源（source of truth）**。

`GAME_DESIGN.md` 只保留戰鬥設計概要；以下細節全部由本文件負責：

- 戰鬥流程
- 同步移動
- movement cost
- 轉向
- 佔格與碰撞
- 怪物 AI
- 技能範圍
- 朝向限制
- 攻擊路線
- Line of Sight / Line of Effect
- 單位／地形阻擋
- 投射物攔截
- AP
- 技能速度
- 傷害方向倍率
- 高低差接口
- 戰鬥 UI
- regression tests

如本文件與 `GAME_DESIGN.md` 戰鬥概要有衝突，以本文件為準；當前使用者明確要求永遠優先。

### 跨系統責任

- `docs/MAP_SYSTEM.md` 決定 battlefield 來自邊個 biome、生成邊啲 terrain／obstacle、位置、height context 及 visual theme。
- 本文件只決定嗰啲 terrain／obstacle／height **喺戰鬥規則上有咩效果**。
- `ART_PIPELINE.md` 決定 battlefield background、ground tile、props、grid visual overlay，以及 Standard Mobile Unit 28-frame Idle／Walk locomotion contract。
- 禁止 battle resolver 用圖片 filename／pixel alpha 直接判斷 walkable、LOS、projectile blocking 或 height。


---

## 2. 設計北極星

戰鬥以《幸福 Online／STRUGARDEN》式同步戰棋為核心：

> 玩家規劃移動與朝向 → 敵我同步移動 → 再按位置、朝向、攻擊路線及速度同步結算行動。

戰鬥唔係「點中邊個就保證打中邊個」。

所有攻擊都必須先回答：

1. 目標係咪喺合法範圍？
2. 朝向啱唔啱？
3. 攻擊路線有冇被牆、地形或其他單位阻擋？
4. 技能本身係直線、投射、穿透、拋物線、範圍、近戰定其他類型？
5. 實際第一個接觸到嘅單位／格係邊個？

因此：

> **選取目標 ≠ 最終命中目標。**

最終命中結果必須由 battle resolver 根據戰場狀態重新解算。

---

## 3. 戰鬥開始

- 玩家接近敵人後直接進入戰鬥。
- 不設額外「是否進入戰鬥」確認彈窗。
- 戰鬥開始時建立 battle snapshot：
  - 地圖格
  - 地形
  - 單位
  - 位置
  - 朝向
  - HP
  - AP
  - status
  - movement
- 戰鬥所有 deterministic resolver 必須以 battle state 為準，唔可以直接依賴畫面 DOM／Canvas 狀態。

---

## 4. 戰鬥回合流程

每輪分四個主要階段：

1. **同步移動規劃**
2. **同步逐格移動**
3. **技能／行動規劃**
4. **同步行動結算**

---

## 5. 同步移動規劃

### 5.1 玩家可見資料

部署畫面只顯示：

- 玩家自己可行格
- 玩家自己規劃路線
- 玩家終點朝向選擇

唔顯示：

- 敵人預定路線
- 敵人預定終點
- 敵人攻擊格
- 敵人 targeting intention

敵方資料只存在 battle state / AI plan。

### 5.2 移動成本

```text
移動 1 格 = 1 步
每次改變行進方向 = 額外 0.5 步
```

包括：

- 第一格如果同角色當前朝向不同 → +0.5
- 路線途中每次轉彎 → +0.5

例如：

```text
角色 movement = 3

向左 1 格 = 1
轉向上 = 0.5
向上 1 格 = 1

總成本 = 2.5
剩餘 = 0.5
不可再移動 1 格
```

玩家、怪物、Familiar 全部使用同一套 movement-cost resolver。

### 5.3 路線編輯

- 玩家每次點一個「下一個路點」；路點可以係目前終點剩餘移動力內嘅較遠格，系統會由**目前路線終點**展開該段合法格路徑，所以直線行幾格只需點一次，唔需要逐格 click。
- 已排嘅路線永遠保留為時間軸歷史：之後點返舊格代表由目前終點再行返去嗰格，照新增並扣實際成本；系統唔會由本輪起點重新 shortest-path、唔會 truncate、唔會退款。
- 地圖上點目前路線終點本身唔消耗移動力；四個朝向控制先係原地 `0.5` footwork／等待命令，同一方向重複輸入亦照扣 `0.5`。
- 只有 `重新移動` 會清除本輪未確認嘅完整移動序列、回復本輪起點草稿同完整 movement budget。
- `結束移動` 可以喺零步、部分移動或完整移動後隨時確認。
- 同成本 path choice 時，auto pathfinding 優先保持直線，延後轉彎。

### 5.4 終點朝向

玩家揀終點後：

- 終點格四邊仍可顯示細型朝向箭嘴，作為可選嘅戰術朝向 override。
- 玩家直接撳 `結束移動` 時，使用已排命令序列最後實際 facing；零步且未輸入 footwork 時保留目前朝向。
- 如果玩家明確揀朝向箭嘴，就按既有 movement cost 規則處理額外轉向成本。
- 完整走完路線先套用合法終點朝向。
- 中途被 block → 保留最後實際完成移動後嘅朝向。

---

## 6. 同步逐格移動

### 6.1 單格佔用

```text
每格最多 1 個單位
```

禁止：

- 重疊
- 穿過另一單位
- 交換位置
- 同時停喺同一格

### 6.2 Timeline

所有單位沿計劃路線按相同 movement timeline 執行。

轉向 `0.5` 步期間：

- 單位仍佔用原格。
- 唔視為已進入下一格。

### 6.3 爭格

如果兩個或以上單位同一時間嘗試進入同一格：

- 該格唔會畀任何一方穿過。
- 受阻單位取消之後未完成路線。
- 顯示 `STOP!`
- 單位停留喺最後合法格。

### 6.4 迎頭／交換

例如：

```text
A → B 原本格
B → A 原本格
```

不可直接交換。

兩邊未完成移動取消，停喺合法相鄰位置。

### 6.5 連鎖阻塞

如果 A 被 B 阻擋，而 C 又準備行入 A 仍然佔用嘅格：

resolver 必須按 timeline 重新判斷 occupancy。

禁止只根據「最初計劃終點」判斷。


### 6.6 戰鬥移動動畫

戰鬥 movement resolver 決定：

- 單位幾時開始移動。
- 當前由邊格去邊格。
- 實際方向。
- 位置 interpolation。
- 幾時完成一格。
- 幾時轉向／被 block／STOP。

Sprite animation controller 只讀以上狀態，**唔可以反過來改 movement timing 或 collision**。

所有已完成 `ART_PIPELINE.md` Standard Mobile Unit Locomotion Contract 嘅：

- 玩家
- 普通怪物
- Familiar

戰鬥移動時必須播放同探索地圖共用嘅 directional `Walk W1–W6` cycle。

例如：

```text
Grid A → Grid B
方向 = Right
```

視覺應係：

```text
Right W1 → W2 → W3 → W4 → W5 → W6 ...
```

同時 unit position 由 A interpolation 去 B。

正式 runtime **禁止**：

```text
Right Idle sprite
↓
整張圖片水平滑去下一格
↓
Right Idle sprite
```

即「靜止人仔滑行」。

### 6.7 方向切換／STOP 動畫

如果路線：

```text
→ → ↑ ↑
```

視覺狀態：

```text
Right Walk
→ Right Walk
→ Up Walk
→ Up Walk
```

轉向所需 `0.5` movement cost 仍然由 battle resolver 計。

視覺上可以：

- 喺轉向 phase 顯示新方向 Idle；
- 然後開始新方向 Walk。

未有專用 turn animation 前，唔需要額外生成轉身 frames。

如果 unit：

- 完成路線；
- 待機；
- 被 collision 阻擋；
- 顯示 `STOP!`；

動畫 controller 必須：

1. 停止 Walk cycle。
2. 保留最後實際 facing。
3. 切回該方向 Idle frame。

不得因 animation frame 未播完而令單位多行半格、延遲 collision 或改變實際 facing。

---

## 7. 怪物移動 AI

- 所有普通怪物基礎 movement 最少 `4`。
- AI 目標通常係縮短同玩家／友軍嘅有效攻擊距離，而唔係單純改朝向。
- 如果 AI 嘗試追玩家所在格，但該格被玩家佔用：
  - pathfinding 應尋找最接近目標嘅合法相鄰格。
  - 唔可以因終點不可佔用而只原地轉身。
- AI movement 使用同玩家完全相同：
  - movement cost
  - +0.5 turn cost
  - occupancy
  - collision
  - STOP
- 低智能怪物移動完成後保留最後實際行走方向。
- 唔免費自動面向玩家。
- 移動後重新按實際位置／朝向／攻擊路線判斷技能。

禁止為怪物另寫簡化 movement rules。

---

## 8. 技能攻擊模型

戰鬥系統必須先分清楚：

> **玩家選擇嘅目標，只係 intended target；技能實際點樣由施術者去到目標，係由技能嘅「攻擊傳遞方式」決定。**

所有攻擊技能至少要屬於以下三大類之一：

1. **線性攻擊（Linear）**
2. **拋物線／弧線攻擊（Arc / Ballistic）**
3. **無路線攻擊（Pathless / Remote Effect）**

呢三類技能嘅阻擋規則完全不同，禁止用同一個「點中 target 就直接扣 target HP」方法處理。

---

## 9. 技能資料模型

每張戰鬥技能至少定義：

```js
{
  id,
  name,
  ap,
  speed,

  targetingMode,

  deliveryMode,
  range,
  heightDifference,
  allowedDirections,

  pathMode,
  canHitBehind,

  stopOnFirstUnit,
  piercing,
  maxPierce,

  blocksByUnits,
  blocksByTerrain,

  requiresLOS,
  requiresLOE,

  arcHeight,
  impactMode,

  friendlyFire,

  actionKind,
  dealsDamage,
  damageModel,
  hitCount,
  hitJudgementMode,
  utilityEffects,

  effect
}
```

### 9.1 targetingMode

玩家點樣指定技能：

```text
unit
tile
direction
self
area
```

### 9.2 `range`

正式 battle skill range 必須使用 machine-readable relative cells，而唔係由 UI 圖形反推。

施術者面向基準 local coordinate：

```text
[lateral, depth]

caster = [0, 0]

左 = lateral -1
右 = lateral +1
前 = depth +1
後 = depth -1
```

例如：

```text
左前 = [-1, +1]
正前 = [ 0, +1]
右前 = [+1, +1]
左   = [-1,  0]
右   = [+1,  0]
左後 = [-1, -1]
正後 = [ 0, -1]
右後 = [+1, -1]
```

skill data 概念：

```js
range: {
  cellsRelative: [
    [-1, 1],
    [0, 1],
    [1, 1],
    [-1, 0],
    [1, 0]
  ]
}
```

World battle-grid coordinates 由 resolver 根據 caster facing 旋轉。

UI 可以另外保存／生成原作式：

```text
■■■
■↑■
```

但 resolver 唔可以靠字元圖、pixel、DOM 排版去猜 range。

### 9.3 deliveryMode

技能實際點樣由施術者去到效果位置：

```text
linear
arc
pathless
```

### `linear`

代表攻擊沿一條實際直線／格路徑前進。

例如：

- 拳風
- 延伸拳
- 槍刺
- 劍氣
- 箭
- 普通火球
- 魔法彈
- 雷射／光束

呢類技能一定要檢查中途經過嘅：

- 其他怪物
- 玩家
- Familiar
- NPC battle unit
- 牆
- 地形障礙

### `arc`

代表攻擊沿拋物線／弧線飛行。

例如：

- 水球
- 投石
- 榴彈
- 高拋魔法彈

呢類技能 **唔係沿地面直線逐格撞人**，而係要按弧線高度判斷有冇真正同中途單位／地形相交。

### `pathless`

代表效果唔需要由施術者沿空間路線飛去目標。

例如：

- 指定地面召喚石柱
- 地底爆刺
- 指定格落雷
- 直接喺目標格召喚魔法陣
- 詛咒／標記類效果
- 從地面／空間直接生成嘅攻擊

呢類技能冇「中間飛行路線」，所以中間有人企住 **唔會代替目標食咗招**。

但技能仍然可以另外要求：

- target tile 必須合法
- 需要 LOS
- 需要可見地面
- 目標格不可係某類地形

由 skill data 決定。

### 9.4 `heightDifference`

平面射程合法唔代表高低差一定合法。

每個有高度限制嘅技能可以保存：

```js
heightDifference: {
  up: 1,
  down: 1
}
```

例如原作資料寫：

```text
上1・下1
```

即代表：

- 目標地面高度最多比施術者高 `1` 層；
- 目標地面高度最多比施術者低 `1` 層；
- 高低差去到 `2` 層就唔可以選取。

Resolver 先計：

```text
deltaHeight = targetCell.height - casterCell.height
```

合法條件：

```text
deltaHeight <= up
AND
-deltaHeight <= down
```

如果原資料係：

```text
上1・下∞
```

就用：

```js
heightDifference: {
  up: 1,
  down: Infinity
}
```

如果 source 自己有 `?`，資料層必須保留 `uncertain` 狀態，唔可以擅自當 confirmed。

呢個 **target height limit** 同以下概念分開：

- Arc projectile 飛行高度；
- blocker / bodyHeight；
- terrain 對 projectile trajectory 嘅攔截。

即：

> 「招技可唔可以揀到嗰個高地目標」同「攻擊飛過去途中會唔會撞到嘢」係兩次不同判定。

### 9.5 `pathMode`

普通 `linear` 技能預設：

```js
pathMode: "facingOrthogonalPriority"
```

代表 attack path 使用下面第 10 節嘅共用正交 routing resolver。

一般技能資料 **唔需要逐個 target cell hard-code attack path**。

只有日後真正存在特殊路線技能時，先可以定義另一個具名 `pathMode`；禁止用 per-skill magic cell list 補一般 Linear 技能。

---

## 10. 線性攻擊（Linear）

### 10.1 核心規則

線性攻擊由施術者位置去 intended target 建立一條有次序嘅：

```text
attackPath
```

`linear` 喺本作代表「攻擊沿實際格路徑傳遞」，**唔等於用幾何對角線直接穿去斜角 target**。

普通 Linear 技能使用共用 `facingOrthogonalPriority` resolver 生成正交格路徑。

Resolver 必須沿 `attackPath` 順序逐格檢查每個經過位置。

例如：

```text
玩家 → 怪物 A → 怪物 B
```

玩家揀怪物 B，用普通火球：

```js
deliveryMode: "linear"
stopOnFirstUnit: true
piercing: false
```

實際結果：

> 火球先撞到怪物 A，所以 A 係 actual impact target，B 唔會被打中。

呢個規則唔分敵我。

例如：

```text
玩家 → Familiar → 怪物
```

普通火球都會先撞到 Familiar。

如果：

```js
friendlyFire: false
```

則 Familiar 可以擋住攻擊，但唔一定受到傷害；projectile 仍然喺 Familiar 位置停止。

所以：

> **friendlyFire=false 唔代表友軍係透明。**


### 10.2 共用正交 Attack Path Routing

普通 Linear 攻擊嘅路線規則同戰棋「先直行、需要時先轉彎」概念一致，但由 battle attack-path resolver 獨立計算。

所有 target 先轉成**施術者面向基準嘅 local coordinate**：

```text
caster = [0, 0]

lateral:
  左 = -1
  右 = +1

depth:
  前 = +1
  後 = -1
```

例如：

```text
左前 = [-1, +1]
正前 = [ 0, +1]
右前 = [+1, +1]

左   = [-1,  0]
自己 = [ 0,  0]
右   = [+1,  0]

左後 = [-1, -1]
正後 = [ 0, -1]
右後 = [+1, -1]
```

路線唔行 diagonal，每一步只可以改一個軸。

#### A. Target 喺前半面：Forward 優先

如果：

```text
depth > 0
```

順序固定：

```text
先 Forward
再 Left / Right
```

例如 target = 左前：

```text
[-1, +1]
```

attack path：

```text
[0, +1]   # 正前
↓
[-1, +1]  # 左前 target
```

所以如果正前已經有人／怪：

> 第一格已經發生 impact，左前 intended target 唔會被打中。

例如 target = 右前兩格再右一格：

```text
[+1, +2]
```

路線：

```text
前 → 前 → 右
```

#### B. Target 同施術者同一橫排：Horizontal only

如果：

```text
depth == 0
```

就直接沿 Left / Right 行。

例如 target = 左邊兩格：

```text
[-2, 0]
```

路線：

```text
左 → 左
```

唔會先向前再繞返。

#### C. Target 喺後半面：Left / Right 優先過 Back

如果：

```text
depth < 0
```

而 target 有 lateral offset，順序固定：

```text
先 Left / Right
再 Back
```

例如 target = 左後：

```text
[-1, -1]
```

路線：

```text
[-1, 0]   # 左
↓
[-1, -1]  # 後 / 左後 target
```

即：

```text
左 → 後
```

唔係：

```text
後 → 左
```

如果 target 係正後：

```text
[0, -N]
```

因為冇 lateral component，就直接：

```text
後 → 後 → ...
```

### 10.3 Deterministic Resolver

概念 pseudo-code：

```js
function buildFacingOrthogonalAttackPath(lateral, depth) {
  const path = [];
  let x = 0;
  let y = 0;

  function stepForward() {
    y += 1;
    path.push([x, y]);
  }

  function stepBack() {
    y -= 1;
    path.push([x, y]);
  }

  function stepHorizontal() {
    const dx = Math.sign(lateral);
    while (x !== lateral) {
      x += dx;
      path.push([x, y]);
    }
  }

  if (depth > 0) {
    while (y < depth) stepForward();
    stepHorizontal();
  } else if (depth < 0) {
    stepHorizontal();
    while (y > depth) stepBack();
  } else {
    stepHorizontal();
  }

  return path;
}
```

正式 implementation 可以用其他 code structure，但輸出路線必須等價而且 deterministic。

World 上、下、左、右只係將 local path 按 caster facing 旋轉返 battle-grid coordinates。

### 10.4 Range ≠ Attack Path

技能資料保存：

```text
range cells
```

只代表：

> 玩家可以選邊個 intended target cell。

真正攻擊次序由共用 path resolver 產生：

```text
selected relative cell
↓
facingOrthogonalPriority
↓
ordered attackPath
↓
first-impact resolver
```

所以一般技能唔需要將每個 target 嘅 `attack_path` 重複寫入 skill data。

例如「連擊」可選：

```text
■■■
■↑■
```

如果揀左前，range 只話「左前係合法 target」。

真正路線固定係：

```text
正前 → 左前
```

如果正前有單位，而技能：

```js
stopOnFirstUnit: true
```

就先打正前嗰個單位。

### 10.5 Blocker 同 Friendly Fire

每生成一格 path，都立即按次序檢查：

- unit occupancy；
- terrain blocker；
- 其他 Linear blocking rule。

因此：

```text
Caster → path cell A → intended target B
```

A 有單位就先處理 A。

原有規則保持：

> `friendlyFire=false` 唔代表友軍係透明。

友軍仍然可以截住條攻擊路線，只係 damage effect 可以因 friendly-fire 規則而唔落喺友軍身上。


---

## 11. 線性近戰

拳擊、槍刺、劍刺等只要攻擊範圍跨越多過一格，都屬於線性攻擊。

例如：

```text
玩家 → 怪 A → 怪 B
```

如果某拳技可以向前打 2 格，而玩家揀 B：

```js
deliveryMode: "linear"
stopOnFirstUnit: true
```

就必須：

> 先打 A。

不可隔住 A 直接打 B。

但如果技能只係普通相鄰一格拳擊：

```text
玩家 → 怪物
```

因為中間冇其他空間，所以自然不存在「中途有人擋住」問題。

---

## 12. 線性 Projectile

普通：

- 火球
- 箭
- 魔法彈

預設：

```js
{
  deliveryMode: "linear",
  stopOnFirstUnit: true,
  piercing: false,
  blocksByUnits: true,
  blocksByTerrain: true
}
```

### 12.1 第一接觸

Resolver 必須求：

```text
firstImpact
```

第一個同攻擊路線相交嘅：

- 單位
- 牆
- 地形 blocker

就係真正 impact。

### 12.2 穿透

例如貫穿箭：

```js
piercing: true
maxPierce: 2
```

可以穿過指定數量單位。

但牆／高地等是否可以穿過，要由技能另外定義。

---

## 13. AoE 線性 Projectile

例如火球係：

> 飛到 impact 點 → 爆炸。

玩家原本指定：

```text
遠處 target tile
```

但途中：

```text
玩家 → 怪 A → . → target tile
```

普通火球撞 A：

> 爆炸中心改成 A 所在位置。

AoE 再由 **actual impact point** 計算。

禁止：

> projectile 明明中途撞人，但 AoE 仍然喺玩家原本點嘅遠處爆炸。

---

## 14. 拋物線／弧線攻擊（Arc / Ballistic）

呢類係你之後水球等技能嘅正式規則。

### 14.1 核心概念

例如：

```text
玩家                    目標
  \                    /
   \_____ 水球弧線 _____/
```

水球唔係沿地面直線行。

因此：

```text
玩家 → 地面上另一個人 → 目標
```

如果中間嗰個人只係企喺水球弧線下面，而水球實際高度高過佢：

> 水球可以越過佢，繼續打 intended target。

所以弧線攻擊唔可以使用：

```text
「地圖 XY 直線中間有 unit = 一定擋住」
```

呢種簡化判定。

---

## 15. Arc 攻擊與高低差

Arc attack 必須比較：

```text
projectile trajectory height
vs
unit / terrain occupied height
```

例如：

```text
高度 2      水球弧線
              ●
            /   \
高度 1     人A   \
          █       \
高度 0   玩家      目標
```

如果中間 A 企高一格，而佢身體所佔高度同水球弧線相交：

> 水球撞 A，A 變成 actual impact target。

但如果 A 喺低地，而水球弧線喺經過 A 時高過 A 身體：

> 水球越過 A，繼續飛去原本目標。

所以：

> **Arc 唔係「永遠無視中間人」；而係只會撞到真正同弧線軌跡相交嘅人／地形。**

---

## 16. Arc trajectory

每個 arc skill 可以定義：

```js
{
  deliveryMode: "arc",
  arcHeight: 1.5
}
```

實際 projectile trajectory 必須由 battle resolver 計算。

第一版未正式開高低差前：

```text
所有 terrain height = 0
所有普通單位使用統一 bodyHeight
```

因此 arc skill 可以先簡化成：

> 普通平地單位可被合理高度嘅 arc 越過。

但資料結構一定要保留：

```text
height
bodyHeight
arcHeight
```

方便之後真正加入：

- 高台
- 斜坡
- 低牆
- 高牆
- 大型怪物
- 飛行單位

---

## 17. Arc 與地形

例子：

### 低牆

如果：

```text
牆高度 < projectile 經過該點嘅 trajectory height
```

水球可以越過。

### 高牆

如果：

```text
牆高度 >= projectile trajectory height
```

水球撞牆。

### 高地上嘅角色

角色腳底：

```text
terrainHeight = 1
```

再加：

```text
bodyHeight
```

如果佢嘅 body volume 同 projectile arc 相交：

> 佢會擋住水球。

所以 blocker 判斷係真正三維／高度概念，而唔係淨係睇 2D 格仔有冇人。

---

## 18. 無路線攻擊（Pathless / Remote Effect）

有啲攻擊根本冇 projectile 或拳路由 A 去 B。

例如：

### 地底石柱

```text
玩家指定某格
↓
石柱直接由該格地下爆出
```

中間即使：

```text
玩家 → 怪 A → 怪 B → target tile
```

怪 A、怪 B 都唔會因為「企喺玩家同 target 中間」而擋住。

因為根本冇物件沿呢條路線移動。

### 召喚攻擊

例如：

```text
喺敵人腳下召喚魔法陣
天空指定位置落雷
地面爆刺
```

都可以：

```js
deliveryMode: "pathless"
```

---

## 19. Pathless 唔等於無限制

無路線只代表：

> **中途冇 interception。**

但技能仍然可以有其他限制。

例如地底石柱：

```js
{
  deliveryMode: "pathless",
  requiresLOS: false,
  requiresGround: true
}
```

可能規定：

- 只可以喺地面格使用
- 水面不可
- 深坑不可
- 空中單位不可
- target tile 必須喺 range 內

而指定落雷可以：

```js
{
  deliveryMode: "pathless",
  requiresLOS: true
}
```

即：

- 中間有人唔會擋
- 但如果目標完全喺高牆後面、施術者睇唔到，就可能唔可以施法

由技能 data 決定。

---

## 20. 攻擊路線與 Line of Sight / Line of Effect

三樣嘢必須分開：

### Targeting

> 玩家想打邊個／邊格？

### Line of Sight

> 施術者睇唔睇到目標？

### Delivery Path / Line of Effect

> 呢招技能嘅效果實際點樣到達目標？

例如：

### 普通火球

```text
targeting = unit / tile
LOS = required
delivery = linear
```

中間有人：

> 被攔截。

### 水球

```text
targeting = unit / tile
LOS = required
delivery = arc
```

中間低位有人：

> 可能越過。

中間高位有人撞到弧線：

> 被攔截。

### 地底石柱

```text
targeting = tile
delivery = pathless
```

中間任何人：

> 完全無關。

---

## 20.1 Actual Impact Result

所有有實際傳遞路線嘅技能最後都輸出統一結果：

```js
{
  intendedTarget,
  intendedTargetCell,

  deliveryMode,

  path,

  impactCell,
  impactUnit,

  blockedBy,
  reason
}
```

例如：

```text
玩家點 B
但 A 擋住火球
```

結果：

```js
intendedTarget = B
impactUnit = A
reason = "unit-interception"
```

畫面動畫、傷害、狀態效果全部必須使用：

```text
impactUnit
```

而唔係繼續使用：

```text
intendedTarget
```

---

## 20.2 技能執行時重新計算

同步戰棋入面，規劃時同真正出招時位置可能已經不同。

所以每次技能真正執行前：

1. 重新取得施術者實際位置。
2. 重新取得 intended target／target tile。
3. 檢查 range。
4. 檢查 facing。
5. 檢查 LOS（如需要）。
6. 根據 `deliveryMode`：
   - linear → 由目前 caster facing + intended target relative cell 重算 `facingOrthogonalPriority` ordered attackPath
   - arc → 重算弧線 trajectory
   - pathless → 無中途 path
7. 求 actual impact。
8. 先結算 damage／effect。

禁止：

> planning 階段已揀 target，所以 action execution 階段直接對 target 扣血。

---

## 20.3 Homing 係特殊例外

普通：

- 火球
- 箭
- 水球

都唔會因為玩家點過某個人就自動追蹤。

如果將來有真正追蹤魔法：

```js
homing: true
```

先可以喺目標移動後重新追蹤。

否則：

> 技能只按當前 action execution 真正重算出嚟嘅 attack path／trajectory 執行。

## 20.5 Everrealm canonical combat stats and resolution ownership

Everrealm follows **SIMPLE NUMBERS, DEEP TACTICS**. The shared runtime combat
stats are:

```text
HP · ATK · DEF · Accuracy · Evasion · AP · Weight · Move
```

Skill/runtime mechanics add `Skill Speed`, `Interrupt` and `Skill Durability`.
There is deliberately no STR/DEX/AGI/INT/MAG stat, separate Magic Attack or
separate Magic Defense. Physical attacks, punches, weapons and future magic
damage all use the same ATK-versus-DEF resolver unless a future rule explicitly
defines an exception. Elements can remain skill tags or drive statuses and
visuals; they do not create an elemental defense matrix.

### Hit chance

The battle resolver uses percentage points and the following single formula:

```text
Base Accuracy = 100%
Base Evasion  = 0%

Effective Accuracy = Base Accuracy + Accuracy bonuses - Accuracy penalties
Effective Evasion  = Base Evasion + Evasion bonuses - Evasion penalties

rawHitChance = (Effective Accuracy / 100)
               × (1 - Effective Evasion / 100)
Final Hit Chance = clamp(rawHitChance, 0%, 100%)
```

Effective Accuracy is not clamped before Evasion is applied. Thus 120% Accuracy
against 20% Evasion is 96%, while 150% against 30% is a raw 105% and a final
100%. The battle owns one seeded/testable RNG stream per encounter; hit,
critical and authored effect rolls consume that stream rather than ad-hoc
`Math.random()` calls.

### Equipment, Weight and Move

Equipment is the primary source of ATK, DEF, Accuracy, Evasion and Weight.
Total Weight is the sum of currently equipped item records, with full-body
items counted once by stable item ID. Weight primarily affects timing; Move is
the actual grid traversal allowance. Existing explicit equipment `moveRange`
modifiers are the one owner of equipment mobility changes, so light gear can
grant `+1 Move` without introducing a second Weight threshold formula. See
[`docs/EQUIPMENT_SYSTEM.md`](EQUIPMENT_SYSTEM.md) for the item schema.

### Pending actions, Interrupt and Durability

Every queued/prepared action stores its accumulated Interrupt and its skill's
Durability. Each incoming Interrupt is added before execution:

```text
remainingSkillDurability = Skill Durability - accumulated Interrupt
accumulated Interrupt >= Skill Durability  → interrupted/cancelled
```

An action with Durability 10 and Interrupt 6 remains pending after one hit; a
further 6 interrupts it. Durability 6 plus Interrupt 6 interrupts immediately.
Interrupt is not a generic stun status.

Before every queued action executes, the resolver revalidates the current
actor and intended target, alive state, action-preventing statuses, current
positions/facing, structured `range_cells_relative` legality and the current
shared attack path. Knockback therefore cannot make an action execute from a
stale cell: if the new path/range is illegal it cancels, but displacement alone
does not cancel an action that remains legal. Linear skills continue to use
`facingOrthogonalPriority` and `traceAttackPath`. Action-level revalidation is
performed before the skill's explicit hit-by-hit multi-hit rules; multi-hit
path rechecks and preserved intended-target semantics remain active during the
action.

## 21. AP

每場：

```text
初始 AP = 10
每輪 +10
上限 = 200
```

未用 AP 保留。

玩家、Familiar 各自有獨立 AP pool。

敵人亦使用自身 AP state／AI skill cost。

---

## 22. 技能速度

速度：

```text
S > A > B > C > D > E > F
```

雙方完成 command 後：

1. Skill Speed grade, with explicit action-speed modifiers able to advance its
   grade rank;
2. lower total equipment Weight;
3. higher existing initiative／先手值;
4. stable actor ID.

決定執行順序。

The grade ordering is the canonical `S > A > B > C > D > E > F`. The current
repository does not define a final numeric conversion between Weight units and
Skill Speed grades, so the resolver preserves grade ordering and uses Weight
as a deterministic secondary timing input; balance constants remain an explicit
future tuning point rather than an invented continuous formula.

使用 stable actor ID 係為：

- deterministic
- replay
- automated testing

---


## 22.1 技能 Action / Damage 分類

每招技能必須明確保存：

```js
{
  actionKind,
  dealsDamage
}
```

例：

```text
multi_hit_damage
damage_control
area_damage
self_buff
area_control
heal
cleanse
counter
```

`AP > 0` **唔代表一定造成傷害**。

例如：

```text
連擊       → dealsDamage=true
百虎連擊   → dealsDamage=true
無鬥氣     → dealsDamage=false
咆哮       → dealsDamage=false
```

只有：

```js
dealsDamage: true
```

先會進入 Everrealm 標準傷害倍率公式。

---

## 22.2 Everrealm 標準技能傷害倍率

### Baseline

以格鬥士基本「正拳」做基準：

```text
正拳 AP = 3
正拳總傷害倍率 = 1.00×
```

普通造成傷害嘅技能：

```text
rawSkillDamageMultiplier = sqrt(AP / 3)
```

呢個係**成招技能嘅總傷害倍率**，唔係每一 Hit 嘅倍率。

例：

```text
3 AP  → 1.0000×
12 AP → 2.0000×
42 AP → sqrt(14) ≈ 3.7417×
48 AP → 4.0000×
```

目的係令 AP 同傷害有遞減回報：

> AP 愈高仍然愈強，但唔會線性變成「AP 高 10 倍 = 傷害高 10 倍」。

### 額外 Utility 效果

如果一招：

```js
dealsDamage: true
```

而技能說明明確包含**傷害以外嘅額外戰鬥效果**，就套用：

```text
utilityMultiplier = 0.8
```

例如：

- 擊退／吹飛；
- 轉倒；
- 中毒；
- 麻痺；
- 暗闇；
- 其他明確非傷害控制／狀態效果。

最終：

```text
finalSkillDamageMultiplier
= sqrt(AP / 3) × utilityMultiplier
```

例如拳砲：

```text
AP = 32
raw = sqrt(32 / 3)
    ≈ 3.2660×

有 3 格擊退
utilityMultiplier = 0.8

final ≈ 2.6128×
```

### 唔當 Utility Discount 嘅項目

以下**本身唔觸發 0.8 折減**：

- multi-hit 次數；
- AP 本身；
- Speed；
- 普通射程形狀；
- 高低差；
- 普通 Linear / Arc / Pathless delivery mode。

Multi-hit 只係將同一個總傷害拆成多次命中，唔係免費額外 utility。

### 完全唔造成傷害

如果：

```js
dealsDamage: false
```

就：

```text
damageMultiplier = 0
formulaApplied = false
```

例如無鬥氣、咆哮唔會因為 AP 高而自動產生傷害。

### Source-defined fixed damage override

少數技能嘅核心效果本身係固定剩餘 HP，而唔係一般倍率傷害，例如：

```text
留下半氣拳 → 成功時令目標剩餘 HP 變成目前一半
留下後一拳 → 成功時令目標剩餘 HP 變成 1
```

呢類技能：

```js
dealsDamage: true
damageModel: "source_defined_fixed"
formulaApplied: false
```

Resolver 只執行該 explicit damage model，**唔再套 `sqrt(AP / 3)`**。

### 原作傷害資料嘅定位

STRUGARDEN 原作如果有玩家測試／相對威力備註，可以保存喺 historical reference，
但 **Everrealm 唔用原作不完整傷害比例做 balance source of truth**。

Everrealm 現行 standard damage baseline 以本節公式為準。

---

## 22.3 Multi-hit 總傷害拆分

先由上面公式計出：

```text
finalSkillDamageMultiplier
```

再由 normal damage resolver 得出今次技能嘅**整招整數總傷害**：

```text
totalDamage
```

之後先按：

```text
hitCount
```

拆成各 Hit。

### Remainder 永遠優先分畀後面 Hit

例如：

```text
totalDamage = 137
hitCount = 3
```

結果：

```text
Hit 1 = 45
Hit 2 = 46
Hit 3 = 46
```

例如：

```text
totalDamage = 373
hitCount = 5
```

結果：

```text
74, 74, 75, 75, 75
```

deterministic algorithm：

```js
function splitDamageLaterHits(totalDamage, hitCount) {
  const base = Math.floor(totalDamage / hitCount);
  const remainder = totalDamage % hitCount;

  const result = Array(hitCount).fill(base);

  for (let i = hitCount - remainder; i < hitCount; i += 1) {
    if (i >= 0) result[i] += 1;
  }

  return result;
}
```

所以：

> 如果總傷害除唔盡，後面 Hits 永遠會比前面 Hits 高少少。

所有 Hit 加埋必須**精確等於** `totalDamage`。

---

## 22.4 Multi-hit Impact / Attack Path 判定

Multi-hit 技能要保存：

```js
hitJudgementMode
```

至少支援：

```text
each_hit
initial_only
```

### `each_hit`

STRUGARDEN 原資料寫：

```text
判定：毎回
```

嘅技能，例如：

- 連擊／連弾；
- 虎連擊／虎連弾；
- 百虎連擊／百虎連弾；

Everrealm 使用：

```js
hitJudgementMode: "each_hit"
```

每一 Hit：

1. 保留同一個 original intended target。
2. 保留同一條 action execution 時生成嘅 ordered attackPath。
3. **重新用目前 battle state 由 path 第一格開始掃。**
4. 找目前第一個合法 impact unit / blocker。
5. 結算嗰一 Hit。
6. 即時更新死亡、occupancy、HP 等 battle state。
7. 下一 Hit 再由 path 起點重新掃一次。

例如連擊揀左前：

```text
Caster → A(正前) → B(左前 intended target)
```

如果：

```text
Hit 1 → A
A 死亡並移除 occupancy
```

第二 Hit：

```text
重新掃同一條 path
正前已空
→ Hit 2 命中 B
```

如果 A 第一 Hit 未死：

```text
Hit 1 → A
Hit 2 → A
```

如果前面所有合法單位都已經消失，而且 path 尾端亦冇合法 impact：

```text
剩餘 Hit = miss
```

**唔可以**：

- 自動改揀附近另一隻怪；
- 自動生成另一條 attack path；
- 因為第一 Hit 點中 A，就將所有後續 Hit 永久鎖死 A。

### `initial_only`

如果 historical source／技能資料明確寫：

```text
判定：初回
```

就使用另一個具名 resolver 行為。

第一版唔應將 `initial_only` 偷換成 `each_hit`；具體後續 Hit target-lock 行為由該技能資料／測試定義。

---

## 23. 死亡取消指令

如果較快技能先令某施術者 HP = 0：

- 該施術者未執行指令取消。

如果 intended target 已經死亡：

- 唔自動將技能轉去另一隻敵人。

但如果係 projectile 已經出手、之後另一單位進入路線：

- 按執行當刻 attack trace／impact 規則處理。

---

## 24. 側擊／背擊

受擊方向倍率：

```text
正面 = 1.00×
側面 = 1.15×
背面 = 1.35×
```

以 **受擊者被命中當刻朝向** 判斷。

唔以：

- 回合開始朝向
- 原本計劃朝向

判斷。

UI 喺確認目標前可以預覽：

```text
側擊
背擊
```

但如果同步移動後位置／朝向改變，最終傷害仍以實際執行狀態為準。

---

## 25. 戰鬥 UI

### 25.1 單位名稱

- 名稱放角色上方。
- X 永遠使用單位所在格仔嘅水平正中心；Y 使用該單位體型固定、略高於頭頂嘅 cell-relative offset。
- 行路 interpolation 可以帶名稱跟隨單位移動，但 sprite bob、attack、hurt 同每幀 visual／alpha bounds 不得改變名稱位置。
- 字體必須正常可讀。
- 使用深色描邊／清晰對比。
- 唔燒入 sprite。

### 25.2 HP bar

- 放角色腳下。
- 不可遮角色本體。
- 使用格仔中心推算嘅固定 cell-relative anchor；不得跟 sprite frame bounds、bob 或 action pose 移動。

### 25.3 攻擊格

- 理論攻擊範圍：淺黃色。
- 當前真正可直接命中敵人格：紅色。
- 不使用「一個無人紅格」去代表抽象目標。
- 空格無實際目標時唔應該顯示「敵人避開」之類假命中結果。

### 25.4 攻擊路線預覽

對 line／projectile skill：

UI 可顯示：

```text
施術者 → projectile path → first impact
```

如果中途有 blocker：

- 清楚顯示 impact 會停喺 blocker。
- 原 intended target 唔再標成「必定命中」。

Preview 必須同實際 resolver 共用同一函數。

### 25.5 Floating command menu

- 戰鬥指令使用 Canvas 上方嘅 compact DOM overlay。
- PC 預設位置固定喺主角**左下外側**：以主角所在 tile 為基準，menu 嘅右上角貼近主角 tile 嘅左下角（亦即左下對角相鄰格嘅右上角），避免遮住由左下向右上延伸嘅主要戰場。
- 玩家可用 mouse／touch pointer events 拖動；手動拖動後停止自動跟隨。
- 提供細型「跟隨／重置位置」控制，將 menu 重新吸回上述主角左下 anchor。
- 每次定位都要 clamp 喺 game viewport 內；如果主角太近 viewport 邊緣，只可因 clamp 而偏移，唔應預設跳返去右側遮住敵方戰場。
- 戰鬥主選單採用「資訊簡潔、美術精緻」原則：技能主列表只顯示技能名；唔長駐顯示技能 AP、快捷鍵、前置圓點或說明句。AP 不足時直接灰化技能，詳細 AP／射程／delivery 只喺選中技能後嘅 target context 顯示。
- `待機` 同 `撤退` 屬於 utility action，固定放喺技能清單底部左右兩格；戰鬥中暫時唔提供獨立飲藥按鈕。
- 移動 phase 只顯示剩餘移動力 pips（full／half／empty）同 `重新移動`／`結束移動`／`撤退`；唔顯示 `0/5`、轉向成本公式、快捷鍵或「返回探索」等說明。玩家以「路點」逐段排路：直線多格可一次點終點，舊格重訪係新增回程而照扣成本；只有 `重新移動` 先會清除草稿。
- AP 只需喺既有角色狀態位置顯示，唔用全寬底 tray 重複，亦唔喺角色身邊畫常駐 AP orbit dots。
- 單位名稱必須跟 rendered sprite 嘅 semantic `nameAnchor`，唔可以用 logical tile 頂部做名稱 Y anchor；不同角色比例、攻擊 frame 或 monster species 都要保持名稱喺實際頭頂上方。

---

## 26. 待機

`待機`：

- 結束該單位本輪 action。
- 不提供免費減傷。
- 不自動改朝向，除非玩家喺移動階段已指定合法終點朝向。

---

## 27. 怪物攻擊 AI

AI 選技能時要評估：

- AP
- range
- facing
- intended target
- attack trace
- blocker
- expected impact
- side／back opportunity

禁止：

> 只因 target ID 係玩家，就忽略中間另一隻怪／Familiar。

如果怪物 A 嘗試射玩家，但怪物 B 擋住：

- 普通 projectile 應視為 B 係 first impact。
- AI 可以因此改選：
  - 另一技能
  - 另一方向
  - 待機
- 但如果仍選擇射擊，resolver 仍按真實路線執行。

---

## 28. Friendly Fire

第一版：

```text
friendlyFire = false
```

係大部分玩家／敵人普通技能預設。

但：

> `friendlyFire=false` 唔等於友軍不存在。

友軍仍然可以：

- 阻擋 projectile
- 阻擋 line attack
- 影響位置

只係 impact 發生喺友軍時：

- 不造成 damage
- projectile／attack 是否停止按 blockMode 決定

將來個別技能可：

```text
friendlyFire = true
```

---

## 29. 技能例外全部 data-driven

將來如果要：

- 穿透箭
- Chain lightning
- 拋物火球
- 無視友軍 projectile
- 隔牆魔法
- 全方向旋風
- 背後技能
- teleport strike
- ground AoE

全部用 skill data 描述。

禁止：

```text
if (skillId === "fireball") ...
if (skillId === "punch") ...
```

散落 battle UI／resolver。

---

## 30. Resolver 分層

建議至少分：

```text
movementResolver
occupancyResolver
attackRangeResolver
attackTraceResolver
lineOfSightResolver
lineOfEffectResolver
impactResolver
damageResolver
actionOrderResolver
```

UI 只讀 resolver result。

AI 亦使用同一 resolver。

Automated tests 直接測 resolver。

---

## 31. Battle Determinism

所有戰鬥隨機數：

- hit
- random damage
- status
- capture（由 Familiar system 接入）

必須使用可 seed RNG。

同一：

```text
battle state + commands + seed
```

應該可以重播同一結果。

---

## 32. Terrain Height 與 2.5D Battlefield Projection

Height／terrain context 由 `docs/MAP_SYSTEM.md` 提供；本文件定義佢點影響戰鬥。戰鬥邏輯仍然係純 grid coordinates；畫面 projection 同 gameplay coordinates 必須分開。

### 32.1 Opening mountain battlefield

山地初始戰鬥場正式開啟第一個 authored height teaching map：

- logical board：`8 × 3`
- 玩家 deployment zone：左下側
- 敵方 deployment zone：右上側
- PC presentation：左下 → 右上嘅 oblique 2.5D projection；兩條 projected grid axis 必須等長，令 logical 1×1 tile 視覺上保持等邊菱形／正方格感，唔可以拉成長方形
- Projected battlefield 嘅四個 logical facing 仍然保留 `up/right/down/left` 供 resolver 使用，但畫面語意固定映射成 `左上/右上/右下/左下`；facing picker、HUD label 同方向箭嘴必須用呢四個斜向呈現。
- 真正角色／怪物 bitmap 若要視覺上準確朝向四個斜角，需要專門嘅 NW/NE/SE/SW facing art；唔可以只靠旋轉整張 cardinal sprite 代替。
- 普通平地本身有薄而可見嘅 base thickness，唔畫成零厚度紙片；外圍厚度只作地台邊緣，唔可以似厚木板／樓梯
- `heightMap` 大於 `0` 嘅格按 elevation level 向上抬高，並繪製 exposed side faces
- sprite 永遠保持直立／原比例，唔跟棋盤 skew

Renderer 使用單一 projection contract：

```text
(gridX, gridY, elevation)
        ↓
projectTile / battleProjectCorner
        ↓
(screenX, screenY)
```

movement、occupancy、range、AI、attack path 同 save/state 全部仍然使用 logical grid cell；Canvas 只負責視覺投影同 pointer polygon hit-test。

### 32.2 Opening terrain teaching set

初始山地場只放兩個主要 blocker，令玩家第一次就可以分辨 cover 高度：

- **High tree**：`movementBlocked=true`、`blocksLinear=true`、`blocksArc=true`。高身障礙會攔截普通直線同與其 occupied height 相交嘅 ballistic arc。
- **Low scrub**：`movementBlocked=true`、`blocksLinear=true`、`blocksArc=false`。低身障礙會阻擋移動同普通直線，但正常 Arc 可以越過。
- scrub 後方接一個細型單級高台，橫跨約 2×2 格；Level-0 主棋盤保持同一平面，唔可以整塊場由左下逐級升成樓梯。

Arc 是否真正撞到 terrain，仍然由 projectile trajectory height 同 `surfaceHeight + occupiedHeight` 比較；唔可以只因技能叫「Arc」就無條件穿過所有高障礙。

### 32.3 Legacy battlefields

未有 authored `heightMap / projection` 嘅其他現有 battlefield 仍然視為 `height = 0`，沿用舊平面 grid presentation 同原本 balance。之後新增高低差只需要更新 battlefield data、LOS／LOE、projectile arc 同必要嘅 movement elevation cost，唔應推倒現有 battle engine。

---

## 33. 與 Familiar 系統

如果 `docs/PET_SYSTEM.md` 存在：

Familiar：

- 用同一 movement resolver
- 用同一 occupancy resolver
- 用同一 attack trace
- 用同一 AP / speed framework
- 只係另一種 friendly unit

PET system 唔可以複製一套簡化戰棋。

---

## 34. 驗收測試

至少 automated test：

### Movement

- 直線 movement。
- 轉向 +0.5。
- movement 剩 0.5 不可再走 1 格。
- 同成本 path 直行優先。
- 爭格。
- 交換格。
- 連鎖阻塞。
- STOP。
- 怪物追玩家時停合法相鄰格。
- Battle movement state 由實際移動方向驅動正確 directional Walk。
- STOP／完成移動後回到最後 facing 嘅 Idle。
- Sprite animation 不可改變 movement timing、occupancy 或 collision result。

### Facing

- 完整移動後套用終點朝向。
- 中途被 block 保留實際最後朝向。
- 怪物唔免費 auto-face 玩家。

### Range

- 正拳五格。
- 背後三格不可選。
- `上1・下1`：高 1／低 1 合法，高低差 2 不合法。
- 非對稱高低差例如 `上1・下0` 分別測試。
- `down: Infinity` 唔可以被任意 finite constant 截斷。
- 特殊技能可 data override。

### Attack Path Routing

- 左前 target → `前 → 左`。
- 右前 target → `前 → 右`。
- 前 2 + 左 1 → `前 → 前 → 左`。
- 左邊 2 格 → `左 → 左`。
- 右邊 2 格 → `右 → 右`。
- 左後 target → `左 → 後`。
- 右後 target → `右 → 後`。
- 正後 2 格 → `後 → 後`。
- 四個 caster facing 旋轉後，local route semantics 完全一致。
- Range preview / targeting 唔可以自行生成另一條 diagonal / shortest-geometric path。

### Attack Trace

必須新增以下測試：

#### Case A：直線火球無阻擋

```text
P . . E
```

火球命中 E。

#### Case B：中間有另一敵人

```text
P . A E
```

玩家 intended target = E。

普通 projectile：

> 實際先命中 A。

#### Case C：中間有友軍

```text
P F . E
```

普通 projectile：

> F 阻擋 projectile；
> friendlyFire=false → F 不受傷；
> E 亦不受傷。

#### Case D：穿透

```text
P A E
```

`piercing=true, maxPierce=1`

> 可以穿 A 再命中 E。

#### Case E：牆

```text
P . # E
```

`#` blocksProjectile=true

> projectile 撞牆，E 不受傷。

#### Case F：AoE projectile

```text
P . A . targetCell
```

火球途中撞 A：

> impact 中心改成 A 所在格，再由該格計 AoE。

#### Case G：延伸近戰

```text
P A E
```

直線 2 格拳技 intended target = E：

> 非 piercing → 先打 A。


#### Case H：連擊左前路線

角色面向前方， intended target = 左前：

```text
前方格 A
左前格 E
```

共用 routing：

```text
Caster → A(正前) → E(左前)
```

如果 A 有單位：

> A 係 actual impact target；E 唔會被打中。

如果 A 空：

> 攻擊繼續到 E。

#### Case I：後左路線

intended target = 左後：

```text
Caster → 左 → 左後
```

必須先檢查左邊格，再檢查左後 target。

禁止：

```text
Caster → 後 → 左後
```

### Damage Formula

- `dealsDamage=false` 技能唔套用傷害公式，damage multiplier = 0。
- source-defined fixed HP damage 技能唔套 `sqrt(AP / 3)`，只執行 explicit damage model。
- 正拳 `AP=3` → `1.0×`。
- 連擊 `AP=12`、無額外 utility → `2.0×` total。
- 百虎連擊 `AP=42`、無額外 utility → `sqrt(14) ≈ 3.7417×` total。
- 拳砲 `AP=32` + 擊退 → `sqrt(32/3) × 0.8 ≈ 2.6128×`。
- Multi-hit 本身唔觸發 utility `0.8`。
- 有傷害 + 明確狀態／控制效果 → utility multiplier `0.8`。

### Multi-hit Damage Split

- `137 / 3` → `[45, 46, 46]`。
- `373 / 5` → `[74, 74, 75, 75, 75]`。
- 所有 hits 總和必須等於 original `totalDamage`。
- 有 remainder 時只由後面 hits 優先 +1。

### Multi-hit Attack Trace

- 連擊 intended target = 左前，path = `正前 → 左前`。
- 正前 A 第一 Hit 未死 → 第二 Hit 仍然命中 A。
- 正前 A 第一 Hit 死亡 → 第二 Hit 重新掃 path，命中左前 B。
- 三／五連擊每 Hit 都按 `each_hit` 模式重新掃同一條 path。
- path 已冇合法 impact → 剩餘 Hit miss，唔自動改 target。
- `initial_only` 技能唔可以錯用 `each_hit` resolver。

### Action resolution

- S > A > ... > F。
- 同 speed stable ordering。
- 快技殺死慢技施術者 → 慢技取消。
- target 已死唔自動換人。

### Side/back

- 正面 1.00。
- 側面 1.15。
- 背面 1.35。
- 以 impact 當刻朝向計。

---

## 35. Runtime / Screenshot QA

Automated tests pass 後仍然必須實際 run game。

至少 cap／檢查：

1. 玩家與怪物同步移動，而且玩家／普通怪物正式使用 directional walk frames，唔係靜止 sprite 滑行。
2. 玩家、怪物、Familiar（如已啟用）探索／戰鬥使用同一套 locomotion atlas，方向及腳步一致。
3. 爭格 `STOP!` 後立即停止 walk cycle並回最後 facing Idle。
4. 正拳五格。
5. 紅／黃色格。
6. 名字清楚。
7. HP bar 位於腳下。
8. Projectile attack trace。
9. 中間單位阻擋 projectile。
10. intended target 同 actual impact 不同時：
   - 動畫撞正確單位
   - damage 扣正確單位
   - UI 唔顯示錯誤目標

如果 screenshot／實際動畫顯示：

- projectile 穿人
- projectile 穿牆
- 點邊個就無視 blocker 打邊個
- impact animation 同扣血對象不同
- route preview 同實際 resolver 不同

不可標記完成。

---

## 36. 第一階段改進優先次序

為避免一次改太大，按以下次序：

## Phase 1 — Linear Attack Path

先實作：

- linearAttackResolver
- shared `facingOrthogonalPriority` path builder
- unit interception
- terrain blocking
- first impact
- projectile
- extended melee
- UI preview 共用 resolver
- tests

呢個階段先解決最重要問題：

> 「點遠處敵人，火球／直線攻擊無視中間其他單位直接命中」問題。

## Phase 2 — Arc / Ballistic

加入：

- arc trajectory
- arcHeight
- bodyHeight
- terrain height intersection
- 高低差 blocker
- 水球／投石等弧線技能

## Phase 3 — Pathless

加入：

- 地底石柱
- 落雷
- 召喚
- target tile validation
- requiresGround / LOS 等條件

## Phase 4 — 正式 Height-aware Terrain

已由山地初始 battlefield 開始落地：

- cell height
- 2.5D projected top faces + visible terrain thickness
- Low／High blocker metadata
- 高台／斜坡
- Arc trajectory height intersection

其他未 author height data 嘅 legacy battlefield 仍保持 `height=0`；完整 LOS / LOE height-aware calculation 可按實際技能內容再擴充。

## Phase 5 — 高低差戰鬥擴充

等新地圖真正有：

- 高台
- 斜坡
- 低牆
- 高牆

先再設計：

- elevation movement cost
- range bonus／penalty
- height damage modifier
- 飛行單位高度

未有實際遊戲內容前唔好憑空加入傷害 bonus。

---

## 37. 完成定義

戰棋核心唔應只用「可以打到人」判定完成。

至少要達到：

- 移動係時間軸實體 movement。
- 單位真正佔格。
- 線性攻擊有 deterministic 正交格路徑；前半面 Forward 優先、後半面 Left/Right 優先過 Back，第一個 path cell 上嘅合法單位／地形可以攔截。
- 弧線攻擊按 projectile trajectory 同單位／地形高度判斷攔截。
- 無路線技能不做中途攔截，只檢查技能本身嘅 target／LOS／地面條件。
- Projectile 唔會因 target selection 而無視實際幾何路線。
- Intended target 同 actual impact 分離。
- `dealsDamage` 明確分開傷害技能同純 Buff／Control／Heal 等技能。
- 標準傷害技能使用 `sqrt(AP / 3)`；有明確額外 utility 嘅傷害技能再 `×0.8`。
- Multi-hit 公式結果代表整招總傷害，整數 remainder 優先分配畀後面 Hit。
- `hitJudgementMode=each_hit` 技能每一 Hit 都按更新後 battle state 重新掃同一 attackPath。
- UI preview 同 battle resolver 一致。
- 架構已預留地形高度。
- Automated tests + runtime visual QA 都通過。

最重要原則：

> **戰場上單位、位置、朝向、路線與地形都係戰鬥規則，而唔只係畫面裝飾。**

