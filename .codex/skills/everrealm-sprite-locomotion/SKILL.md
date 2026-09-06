---
name: everrealm-sprite-locomotion
description: Use for 永恆國度 · Everrealm player, ordinary-monster, or Familiar locomotion sprite work: generating or rebuilding the standardized 4×7 / 28-frame Idle+Walk atlas, normalizing/repacking frames, integrating exploration and battle movement animation, fixing cut feet/cross-cell bleed/white edges/anchor drift, or performing runtime visual QA. 觸發情境包括：重做角色／怪物行路圖、28張 sprites、sprite sheet、切圖、anchor、戰鬥靜止滑行、探索／戰鬥共用動畫。
---

# Everrealm Sprite Locomotion Workflow

呢個 Skill 只定義「每次做 locomotion sprite 任務應該點做」嘅可重用 workflow。

佢唔係規格 source of truth。

正式規格仍然以：

- `AGENTS.md`
- `ART_PIPELINE.md`
- `docs/BATTLE_SYSTEM.md`
- `docs/PET_SYSTEM.md`（只有 Familiar 任務先需要）

為準。

如果 Skill 內容同上述文件衝突，跟 `AGENTS.md` 定義嘅 priority。

## 1. 先限制今次 Scope

先確認今次係以下邊一類：

- 新增一個 Standard Mobile Unit locomotion asset。
- 重做 legacy / 錯誤 atlas。
- 修正 cut feet、cross-cell contamination、white edge、frame drift、anchor / baseline 問題。
- 將探索 movement 接入 standardized locomotion。
- 將戰鬥 grid movement 由 static sliding 改成真正 directional walk animation。
- 將普通怪物 / Familiar 接入同一套 runtime locomotion contract。

唔好因為 project 入面存在其他 system spec 就順手實作：

- `docs/PET_SYSTEM.md`
- `docs/PRODUCTION_SYSTEM.md`
- 其他未被今次要求嘅 future systems。

除非今次 task 明確涉及佢哋。

## 2. 只讀必要文件

開始前：

1. 讀 `AGENTS.md`。
2. 讀 `ART_PIPELINE.md` 入面：
   - `Standard Mobile Unit Locomotion Contract`
   - animation alignment / atlas / transparency / visual QA 相關段落。
3. 如果會改戰鬥移動，讀 `docs/BATTLE_SYSTEM.md` 相關 movement + battle animation 段落。
4. 如果係 Familiar，先額外讀 `docs/PET_SYSTEM.md`。
5. 只喺真正需要 global player-facing design 時先讀 `GAME_DESIGN.md`。

唔好為咗一個 sprite 任務 bulk-read 全部 docs。

## 3. 先 Inspect，唔好即刻重新生成

先檢查：

- runtime 而家實際引用邊張 asset；
- 舊 atlas 係咪 legacy；
- renderer / animation controller 點讀 row / column；
- 有冇 shared sprite metadata；
- 有冇現成 repack / alpha audit / validation 工具；
- exploration 同 battle 係咪用咗兩套重複 animation logic；
- tests 而家覆蓋咗乜。

如果同一個 task 已經生成過候選圖或中間產物：

> 先檢查同重用現有產物，唔好無原因由頭 regenerate。

## 4. 判斷「修」定「重做」

如果只係單一輕微來源錯誤，而且 atlas 本身已符合 standardized contract，可以修 source frame 後重新 repack。

如果出現以下問題：

- 分格本身唔平均；
- 上一行隻腳跌入下一行；
- 多格 cut 腳；
- cross-cell contamination；
- 各 frame 大小 / anchor 明顯唔一致；
- runtime 要靠大量 `+3px / -5px` offset；
- legacy atlas 結構唔符合新 28-frame contract；

就：

> 重建 standardized locomotion asset，唔好繼續逐格 patch 舊 atlas。

舊圖可以用作：

- character identity reference；
- costume / silhouette reference；
- legacy fallback；

但唔當成可信任 runtime grid。

## 5. Standard Runtime Contract

具體尺寸數值以 `ART_PIPELINE.md` 現行 metadata 為準。

結構固定：

```text
4 rows × 7 columns = 28 frames

          Idle  W1  W2  W3  W4  W5  W6
Down       ■     ■   ■   ■   ■   ■   ■
Right      ■     ■   ■   ■   ■   ■   ■
Up         ■     ■   ■   ■   ■   ■   ■
Left       ■     ■   ■   ■   ■   ■   ■
```

所有 Standard Mobile Unit 共用：

- `cellWidth`
- `cellHeight`
- `anchorX`
- `anchorY`
- row order
- column meaning

禁止為正常玩家 / 普通怪物 / Familiar：

- per-frame magic offset；
- per-unit runtime anchor hack；
- alpha-bounding-box auto-centering；
- 用 image filename / pixel alpha 決定 gameplay；
- 用 mirror 假扮本身應該存在嘅正式方向 frame。

## 6. Source → Normalize → Repack

AI / artist 生成嘅大 sheet 只係 source。

正式流程：

```text
source
↓
取得 28 個完整 frame
↓
驗證每格人物 / 動物完整
↓
normalize 到固定 transparent canvas
↓
使用相同 semantic foot anchor / baseline
↓
按 4×7 contract 自動 repack
↓
atlas validation
↓
contact sheet
↓
runtime integration
```

對雙足角色：

- anchor = 兩腳接地中心。

對四足普通動物：

- anchor = 接地 footprint 視覺中心。

對細型雞仔等：

- 角色可以細，但仍使用同一 canvas anchor contract。

頭髮、尾巴、翼、武器、法杖、伸腳唔可以改變世界定位 anchor。

## 7. Repacker / Validator

優先重用 `tools/` 既有工具。

如果 project 未有足夠工具，而今次 task 需要建立：

- 將工具放 `tools/`；
- 做成之後其他 unit 都可以重用；
- 唔好只寫一個角色專用 script。

最少應檢查：

- 28 frames 齊全；
- frame canvas 一致；
- row / column 次序正確；
- transparent alpha；
- 無相鄰 cell bleed；
- 無 white matte edge；
- 無 cut feet / cut head；
- anchor / baseline metadata 一致。

Renderer、repacker、QA 應共用同一份 sprite metadata，避免三套 hard-coded constants。

## 8. Exploration Integration

探索移動：

- 根據真實 movement direction 選 Down / Right / Up / Left。
- 移動時循環 W1–W6。
- 停止時回當前 facing Idle。
- 避免 path 微調造成高速左右閃 direction。

唔接受：

> 一張 Idle sprite 直接平移當正式行路動畫。

## 9. Battle Integration

戰鬥 movement resolver 仍然負責：

- grid path；
- movement timing；
- occupancy；
- collision；
- STOP；
- facing；
- interpolation。

animation controller 只讀 movement state。

佢唔可以反過來改 battle mechanics。

戰鬥逐格移動時：

- 根據實際移動方向播 W1–W6；
- 同 exploration 共用同一 locomotion atlas；
- 轉向跟 battle resolver 實際 facing；
- 到達目的地後回最後 facing Idle；
- `STOP!` 後立即停止 Walk，回最後實際 facing Idle。

禁止正式 runtime：

```text
static Idle sprite
→ 水平／垂直滑去下一格
→ static Idle sprite
```

## 10. Animation Controller

優先共用一套 unit animation controller。

避免：

```text
explorationPlayerAnimation()
battlePlayerAnimation()
monsterAnimation()
familiarAnimation()
```

各自重寫一套相同規則。

理想輸入概念：

```js
{
  spriteSet,
  facing,
  state,       // idle / walk
  elapsedTime
}
```

由同一 controller 決定 frame。

探索同戰鬥只係 movement source 不同，唔係 sprite contract 不同。

## 11. Automated Tests

改 code 後跑 relevant tests。

至少覆蓋涉及今次改動嘅：

- direction → row mapping；
- Idle → Column 0；
- Walk → Column 1–6 cycle；
- movement completion → facing Idle；
- STOP → facing Idle；
- animation state 唔改 occupancy / collision / movement timing；
- 玩家 / 怪物 / Familiar 如共享 controller，唔會互相產生特殊例外。

Bug fix 只係恢復既有 spec 時，唔好為咗記錄 bug 歷史去改 design docs。

## 12. Runtime Visual QA

視覺 task 唔可以淨係 tests pass 就完成。

必須 run game，實際睇：

### Exploration

逐方向至少睇幾個完整 cycle：

- Down
- Right
- Up
- Left

### Battle

逐方向檢查 grid movement：

- Down
- Right
- Up
- Left

並檢查：

- 無 cut feet；
- 無 cut head；
- 無上一格殘影；
- 無 cross-cell contamination；
- 無 white edge；
- baseline 穩定；
- body / hip center 無不自然 lateral drift；
- visual scale 無忽大忽細；
- walk cycle 首尾自然；
- 雙足角色左右腳交替合理；
- 四足 / 動物步態合理；
- STOP / 到位後 Idle 正確；
- exploration 同 battle 角色 identity / scale / anchor 一致。

見到問題就繼續 iterate。

唔好喺：

- 生成候選圖；
- repack 完；
- tests pass；

任何一個中間點提早停。

## 13. Completion Gate

只有以下全部完成先可以話 task 完成：

- 正式 runtime asset 已接入；
- standardized 28-frame contract 正確；
- shared anchor / baseline 正確；
- exploration movement 正常；
- battle movement 正常；
- battle 唔再 static sliding；
- relevant tests pass；
- runtime visual QA pass；
- 無明顯 cut / bleed / white edge / drift；
- 無新增不必要 per-unit / per-frame hack。

## 14. Documentation Maintenance

如果今次只係：

> 修正 implementation 令佢重新符合現有 spec

唔需要修改 design docs。

如果今次永久改變：

- 28-frame contract；
- anchor / canvas standard；
- sprite pipeline；
- battle locomotion visual rule；

就按 `AGENTS.md` routing 更新相關完整文件。

唔好喺 Skill 入面複製一份新嘅 design source of truth。

## 15. 回覆格式

全程用繁體中文回覆使用者。

程式碼、檔名、API、class / function 名稱、技術關鍵字可以保留英文。

完成時簡潔報告：

1. 改咗咩；
2. runtime 用緊邊個新 asset / controller；
3. 跑咗咩 tests；
4. 做咗咩 exploration / battle visual QA；
5. 如果仍有真正未完成項目，直接列明，唔好假裝完成。
