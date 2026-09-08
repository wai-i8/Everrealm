# Everrealm Fighter Skill Tree

> 現行 Everrealm 格鬥士（Fighter）技能規格。呢份文件係 gameplay source of truth；原作／研究證據保留喺 `docs/references/STRUGARDEN_FIGHTER_SKILL_TREE.md`，但唔覆蓋本文件。

## Runtime source

完整 machine-readable data 由根目錄 `fighter-skill-data.js` 載入 `LanternFighterSkillData`，再由 `skill-core.js` 建立 immutable `SKILL_CATALOG`。`skills[]` 每一招均保存：

- `id`、`name_zh`、`type`、`category`、explicit `requires[]`、`requires_status`；
- `original_reference.ap`、`speed`、`interrupt`、`durability`、`range.range_cells_relative`、`range.height_difference`、`effect_area`、`acquisition`；
- `everrealm.action_kind`、`deals_damage`、`delivery_mode`、`path_mode`、`utility_effects`、`damage`、`hit_resolution`；
- `damage` 的 `formula_applied`、`raw_multiplier`、`utility_multiplier`、`final_total_multiplier` 或 explicit fixed-HP `model`；
- `hit_resolution.hit_count`、`hit_judgement_mode`、`recheck_attack_path_each_hit`、`rounding_remainder_priority`；
- `display.layout.grid` 提供 authored `treeRow`／`treeColumn`，connector 只由 `requires[]` 產生。

Runtime 唔從 pattern 文字猜範圍：`skill-core.js` 旋轉 `range_cells_relative`，`tactics-core.js` 以共同 `facingOrthogonalPriority` 解析 Linear attack path。原始未知值會保留 `status: uncertain` 或 `down: unlimited`，唔會被轉成假定數值。

## Skill Book rank notation

所有 player-facing 技能書 rank 都由 `skill-core.js` 的 `formatSkillBookRank()` 產生，使用以下唯一對照：

| rank | notation |
| ---: | :--- |
| 1 | ☆ |
| 2 | ☆☆ |
| 3 | ☆☆☆ |
| 4 | ☆☆☆☆ |
| 5 | ★ |
| 6 | ★☆ |
| 7 | ★☆☆ |
| 8 | ★☆☆☆ |
| 9 | ★☆☆☆☆ |
| 10 | ★★ |

委託卡、技能書信封、物品欄、技能樹、戰鬥按鈕、toast 同 debug-facing labels 必須呼叫同一個 formatter；唔可以以 `★` 重複次數代替 rank notation。

## Authored visual layout

Grid 係 row-major；第 0 行係最上方，第 0 列係最左方。空格係 `null`，唔代表 prerequisite。正拳 `kentotsu` 位於迅拳 `jinken` 正上方（同為 column 3），唔係背拳上方。

```text
PSV  ·  ·  正拳 · · · · · ·
PSV  ·  背拳 迅拳 · 舞葉 咆哮 · 防禦 痺除點穴
PSV  ·  寸勁 連擊 轉砲腳 先之先 無鬥氣 · 電拳擊 心著點穴
PSV  ·  拳砲 時差正拳 地平腳 跳彈腳 集氣術 不動縛 留下半氣拳 快目點穴
PSV  ·  岩牙突 散彈 風刃腳 龍眼 裂閃光 集氣秘術 留下後一拳 謀眠打破
PSV 岩牙列陣 岩牙方陣 虎連擊 豪砲腳 · 指彈 · 拳瞬 氣孔解毒
PSV 地碎崩 九影琥 紅流星 · · 氣功彈 · · ·
PSV 天裂崩 烈震九影琥 殘充拳 · 風神氣功腳 激氣功彈 氣功砲 · ·
PSV · 毒手拳 百虎連擊 · · · 激氣功巨彈 氣功炸裂彈 · ·
PSV · ルセデス古流奧義「墮」 ルセデス古流奧義「哭」 ルセデス古流奧義「嘆」 · · 龍彈 · · ·
```

The exact JSON equivalent is `display.layout.grid` in the runtime data, so the glyph view above is explanatory only.

## Complete skill manifest

The following is the complete 65-skill audit. `requires` is the only learning edge; `range` is the selectable relative-cell set (`[lateral, depth]`, where depth `+` is forward); `height` is `up/down` and preserves source uncertainty; `damage` is the total skill multiplier before actor defence/position modifiers.

| ID | 名稱 | Type / category | Requires | AP · speed · interrupt · durability | Range / height | Action · delivery · damage · hits |
|---|---|---|---|---|---|---|
| `psv_tesshin` | 鐵身 | PSV / body_passive | — | PSV | — / N/A | passive_buff · — · 0 · 0 |
| `psv_ukimi` | 浮身 | PSV / body_passive | `psv_tesshin` | PSV | — / N/A | passive_buff · — · 0 · 0 |
| `psv_koushin` | 鋼身 | PSV / body_passive | `psv_ukimi` | PSV | — / N/A | passive_buff · — · 0 · 0 |
| `psv_shintou_mekkyaku` | 心頭滅卻 | PSV / body_passive | `psv_koushin` | PSV | — / N/A | passive_buff · — · 0 · 0 |
| `psv_seishin_touitsu` | 精神統一 | PSV / body_passive | `psv_shintou_mekkyaku` | PSV | — / N/A | passive_buff · — · 0 · 0 |
| `psv_soshin_sokutai` | 狙身捉體 | PSV / body_passive | `psv_seishin_touitsu` | PSV | — / N/A | passive_buff · — · 0 · 0 |
| `psv_hishin_jutai` | 避身柔體 | PSV / body_passive | `psv_soshin_sokutai` | PSV | — / N/A | passive_buff · — · 0 · 0 |
| `psv_koushin_gekitai` | 功身擊體 | PSV / body_passive | `psv_hishin_jutai` | PSV | — / N/A | passive_buff · — · 0 · 0 |
| `psv_boushin_goutai` | 防身剛體 | PSV / body_passive | `psv_koushin_gekitai` | PSV | — / N/A | passive_buff · — · 0 · 0 |
| `psv_sokushin_keitai` | 速身輕體 | PSV / body_passive | `psv_boushin_goutai` | PSV | — / N/A | passive_buff · — · 0 · 0 |
| `kentotsu` | 正拳 | CMD / root | — | 3 · B · 1 · 10 | `[-1,1],[0,1],[1,1],[-1,0],[1,0]` / 1·1 | damage · linear · 1.0000 · 1 |
| `haiken` | 背拳 | CMD / kentotsu_line | `kentotsu` | 12 · B · 1 · 6 | `[-1,-1],[0,-1],[1,-1]` / 1·1 | damage · linear · 2.0000 · 1 |
| `sunkei` | 寸勁 | CMD / kentotsu_line | `haiken` | 18 · D · 6 · 6 | `[0,1],[-1,0],[1,0]` / 1·1 | damage_control · linear · 1.9596 · 1 |
| `kenpou` | 拳砲 | CMD / kentotsu_line | `sunkei` | 32 · D · 12 · 10 | `[0,1]` / 1·1 | damage_control · linear · 2.6128 · 1 |
| `gangatotsu` | 岩牙突 | CMD / kentotsu_line | `kenpou` | 30 · D · 1 · 10 | `0,2;-1,1;1,1;-2,0;2,0;-1,-1;1,-1` / 2·2 | damage_control · pathless · 2.5298 · 1 |
| `gangaretsujin` | 岩牙列陣 | CMD / kentotsu_line | `gangatotsu` | 45 · D · 1 · 6 | `[0,0]` / N/A | area_damage · pathless · 3.8730 · 1 |
| `gangahoujin` | 岩牙方陣 | CMD / kentotsu_line | `gangatotsu` | 30 · D · 1 · 6 | `[0,0]` / N/A | area_damage_control · pathless · 2.5298 · 1 |
| `chisaihou` | 地碎崩 | CMD / kentotsu_line | `gangaretsujin` | 30 · C · 12 · 6 | `[0,1],[-1,0],[1,0]` / 1·1 | damage_control · linear · 2.5298 · 1 |
| `kueiku` | 九影琥 | CMD / kentotsu_line | `gangahoujin` | 49 · D · 12 · 6 | `[0,0]` / N/A | area_damage_control · pathless · 3.2332 · 1 |
| `tenretsuhou` | 天裂崩 | CMD / kentotsu_line | `chisaihou` | 85 · C · 12 · 4 | `[0,1]` / 1·1 | damage_control · linear · 4.2583 · 1 |
| `resshin_kueiku` | 烈震九影琥 | CMD / kentotsu_line | `kueiku` | 56 · D · 12 · 6 | `[0,0]` / N/A | area_damage_control · pathless · 3.4564 · 1 |
| `jinken` | 迅拳 | CMD / jinken_line | `kentotsu` | 6 · A · 1 · 10 | `[0,1],[-1,0],[1,0]` / 1·1 | damage · linear · 1.4142 · 1 |
| `rendan` | 連擊 | CMD / jinken_line | `jinken` | 12 · B · 1×2 · 10 | `[-1,1],[0,1],[1,1],[-1,0],[1,0]` / 1·1 | multi_hit_damage · linear · 2.0000 · 2, each_hit/recheck |
| `jisa_kentotsu` | 時差正拳 | CMD / jinken_line | `rendan` | 7 · C · 1 · 10 | `[-1,1],[0,1],[1,1],[-1,0],[1,0]` / 1·1 | damage_control · linear · 1.2220 · 1 |
| `sandan` | 散彈 | CMD / jinken_line | `jisa_kentotsu` | 16 · C · 1 · 6 | `[0,0]` / N/A | area_damage · pathless · 2.3094 · 1 |
| `korendan` | 虎連擊 | CMD / jinken_line | `sandan` | 24 · C · 1×3 · 6 | `[0,1],[-1,0],[1,0]` / 1·1 | multi_hit_damage · linear · 2.8284 · 3, each_hit/recheck |
| `kouryuusei` | 紅流星 | CMD / jinken_line | `korendan` | 28 · D · 1 · 10 | `[0,3],[0,2],[0,1]` / 1·1 | line_damage · linear · 3.0551 · 1 |
| `zanjuken` | 殘充拳 | CMD / jinken_line | `kouryuusei` | 18 · S · 1 · 6 | `[0,1]` / 1·1 | damage · linear · 2.4495 · 1 |
| `dokushuken` | 毒手拳 | CMD / jinken_line | `zanjuken` | 25 · D · 1 · 10 | `[0,1],[-1,0],[1,0]` / 1·1 | damage_control · linear · 2.3094 · 1 |
| `byakkorendan` | 百虎連擊 | CMD / jinken_line | `zanjuken` | 42 · C · 1×5 · 6 | `[0,1]` / 1·1 | multi_hit_damage · linear · 3.7417 · 5, each_hit/recheck |
| `tenpoukyaku` | 轉砲腳 | CMD / kick | `jinken` | 22 · D · 4 · 6 | `[0,2],[0,1],[-1,0],[1,0]` / 1·1 | damage_control · linear · 2.1664 · 1 |
| `chiheikyaku` | 地平腳 | CMD / kick | `tenpoukyaku` | 25 · C · 12 · 6 | `[0,1],[-1,0],[1,0]` / 0·0 uncertain | damage_control · linear · 2.3094 · 1 |
| `fuujinkyaku` | 風刃腳 | CMD / kick | `chiheikyaku` | 25 · C · 1 · 6 | `[0,3],[-1,2],[0,2],[1,2],[-1,1],[1,1]` / 2·2 | damage · arc · 2.8868 · 1 |
| `gouhoukyaku` | 豪砲腳 | CMD / kick | `fuujinkyaku` | 36 · D · 12 · 4 | `[0,1],[-1,0],[1,0]` / 1·1 | damage_control · linear · 2.7713 · 1 |
| `fuujin_kikoukyaku` | 風神氣功腳 | CMD / kick_ki_hybrid | `gouhoukyaku` + `kikoudan` | 55 · D · 1 · 6 | 9-cell authored set / up2·down∞ uncertain-up | damage · linear · 4.2817 · 1 |
| `buyou` | 舞葉 | CMD / evade_counter | `kentotsu` | 7 · A · — · 10 | `[0,0]` / N/A | self_buff · — · 0 · 0 |
| `sen_no_sen` | 先之先 | CMD / evade_counter | `buyou` | 18 · B · — · 10 | `[0,0]` / N/A | counter_stance · — · 0 · 0 |
| `choudankyaku` | 跳彈腳 | CMD / evade_counter | `sen_no_sen` + `tenpoukyaku` | 18 · B · — · 6 | `[0,0]` / N/A | counter_stance · — · 0 · 0 |
| `ryuugan` | 龍眼 | CMD / evade_counter | `choudankyaku` | 16 · A · — · 10 | `[0,0]` / N/A | self_buff · — · 0 · 0 |
| `houkou` | 咆哮 | CMD / ki_ranged | `kentotsu` | 38 · B · 12 · 6 | `[0,0]` / N/A | area_control · — · 0 · 0 |
| `mutouki` | 無鬥氣 | CMD / ki_ranged | `houkou` | 35 · B · — · 6 | `[0,0]` / N/A | self_buff · — · 0 · 0 |
| `shuukijutsu` | 集氣術 | CMD / ki_ranged | `mutouki` | 20 · C · — · 6 | `[0,0]` / N/A | heal · — · 0 · 0 |
| `fudoushibari` | 不動縛 | CMD / ki_ranged | `mutouki` | 35 · D · — · 6 | `[0,2],[-2,0],[2,0]` / 3·3 | single_target_control · linear · 0 · 0 |
| `retsusenkou` | 裂閃光 | CMD / ki_ranged | `shuukijutsu` | 35 · D · — · 6 | `[0,0]` / N/A | area_control · — · 0 · 0 |
| `shuuki_hijutsu` | 集氣秘術 | CMD / ki_ranged | `shuukijutsu` | 38 · C · — · 6 | `[0,0]` / N/A | heal · — · 0 · 0 |
| `shidan` | 指彈 | CMD / ki_ranged | `retsusenkou` | 12 · C · 1 · 6 | 8-cell authored set / up1·down∞ | damage · linear · 2.0000 · 1 |
| `kikoudan` | 氣功彈 | CMD / ki_ranged | `shidan` | 32 · D · 1 · 6 | 8-cell authored set / up1·down∞ | damage · linear · 3.2660 · 1 |
| `gekikoudan` | 激氣功彈 | CMD / ki_ranged | `kikoudan` | 45 · D · 1 · 4 | 8-cell authored set / up1·down∞ | damage · linear · 3.8730 · 1 |
| `kikouhou` | 氣功砲 | CMD / ki_ranged | `kikoudan` | 42 · D · 1 · 6 | `[0,5],[0,4],[0,3],[0,2],[0,1]` / up1·down∞ | line_damage · linear · 3.7417 · 1 |
| `gekikou_kyodan` | 激氣功巨彈 | CMD / ki_ranged | `gekikoudan` | 63 · E · — · — | 8-cell authored set / up1·down∞ | damage · linear · 4.5826 · 1 |
| `kikou_sakuretsudan` | 氣功炸裂彈 | CMD / ki_ranged | `gekikoudan` | 55 · D · 1 · 4 | `[0,3],[-1,2],[1,2],[-2,1],[2,1]` / up2·down∞ | area_damage · arc · 4.2817 · 1 |
| `ryudan` | 龍彈 | CMD / ki_ranged | `gekikou_kyodan` | 90 · E · — · — | `[0,5],[0,4],[0,3],[0,2],[0,1]` / up1·down∞ | line_damage · linear · 5.4772 · 1 |
| `bougyo` | 防禦 | CMD / side_warrior | `kentotsu` | 2 · A · — · 10 | `[0,0]` / N/A | self_buff · — · 0 · 0 |
| `denkangeki` | 電拳擊 | CMD / side_warrior | `bougyo` | 42 · D · 1 · 10 | `[0,1],[-1,0],[1,0]` / 1·1 | damage_control · linear · 2.9933 · 1 |
| `ruka_hanki_ken` | 留下半氣拳 | CMD / side_warrior | `denkangeki` | 47 · D · — · — | `[0,1]` / 1·1 | fixed_damage · linear · fixed fraction · 1 |
| `ruka_kouitsu_ken` | 留下後一拳 | CMD / side_warrior | `ruka_hanki_ken` | 77 · D · — · — | `[0,1]` / 1·1 | fixed_damage · linear · fixed value · 1 |
| `kenshaku` | 拳瞬 | CMD / side_warrior | `ruka_kouitsu_ken` | 48 · S · — · 10 | `[0,1]` / 1·1 | damage · linear · 4.0000 · 1 |
| `hijo_tenketsu` | 痺除點穴 | CMD / side_guardian | `kentotsu` | 3 · D · — · — | `[0,1],[-1,0],[1,0]` / ?·? uncertain | cleanse · — · 0 · 0 |
| `shincha_tenketsu` | 心著點穴 | CMD / side_guardian | `hijo_tenketsu` | 4 · D · — · — | — / ?·? uncertain | cleanse · — · 0 · 0 |
| `kaimoku_tenketsu` | 快目點穴 | CMD / side_guardian | `shincha_tenketsu` | 3 · D · — · — | — / ?·? uncertain | cleanse · — · 0 · 0 |
| `boumin_daha` | 謀眠打破 | PSV / side_guardian | `kaimoku_tenketsu` | PSV | — / N/A | passive_cleanse · — · 0 · 0 |
| `kikou_gedoku` | 氣孔解毒 | PSV / side_guardian | `boumin_daha` | PSV | — / N/A | passive_cleanse · — · 0 · 0 |
| `lusedes_da` | ルセデス古流奧義「墮」 | CMD / ultimate | `byakkorendan` | 100 · D · 12 · 4 | `0,2;-1,1;1,1;-2,0;2,0` / 0·0 | multi_hit_damage · linear · 5.7735 · 3 |
| `lusedes_koku` | ルセデス古流奧義「哭」 | CMD / ultimate | `byakkorendan` | 100 · D · 12 · 4 | `[-1,1],[0,1],[1,1]` / 1·0 | multi_hit_damage · linear · 5.7735 · 8 |
| `lusedes_tan` | ルセデス古流奧義「嘆」 | CMD / ultimate | `byakkorendan` + `gouhoukyaku` | 100 · D · — · — | `[0,1],[-1,0],[1,0]` / 0·0 | multi_hit_damage_control · linear · 4.6188 · 6 |

## Rules consumed by runtime

### Graph and learning

`requires[]` is the sole graph. Learning is `missingPrereq` until **all** parents are learned; adjacent nodes never count as a parent. The corrected high-risk edges are therefore:

- `kentotsu` root; `jinken → kentotsu`; `rendan → jinken`; `jisa_kentotsu → rendan` only;
- `choudankyaku → sen_no_sen + tenpoukyaku`;
- `fuujin_kikoukyaku → gouhoukyaku + kikoudan`;
- `lusedes_tan → byakkorendan + gouhoukyaku`;
- `shuuki_hijutsu → shuukijutsu` only; `kikouhou → kikoudan` only; `kikou_sakuretsudan → gekikoudan` only;
- `fudoushibari → mutouki`.

### Damage and hit resolution

For ordinary damaging skills:

```text
raw_multiplier = sqrt(AP / 3)
final_total_multiplier = raw_multiplier × utility_multiplier
```

`kentotsu` is `3 AP = 1.0×`. Only an authored non-damage control/status utility applies `0.8`; multi-hit count, range, speed, delivery and height do not. Fixed HP skills use their explicit `source_defined_fixed_damage` model and never also apply the square-root formula. Multi-hit totals are calculated once, then split with remainder assigned to later hits (`splitDamageLaterHits`).

`rendan`, `korendan`, and `byakkorendan` use `each_hit` plus `recheck_attack_path_each_hit: true`, keeping the original intended target/path. `lusedes_da`, `lusedes_koku`, and `lusedes_tan` use `initial_only` and do not rescan.

### Range, height and path

`range_cells_relative` selects the intended target; it never substitutes for attack path. For every facing, runtime rotates `[lateral, depth]` deterministically. Linear skills use shared `facingOrthogonalPriority`: forward-first in the forward half, lateral-first in the rear half, and lateral-only on the same row. `traceAttackPath` checks terrain and the first living unit in order; a friendly unit still blocks even when friendly-fire damage is disabled. Pathless and arc skills do not use ground-cell interception.

Height validation compares `target.height - caster.height` against `up` and `down`. `down: unlimited` remains true unlimited semantics. `status: uncertain` is surfaced in the detail UI and rejects non-zero deltas when a height context is supplied; flat `height=0` battlefields remain playable.

### Effects

Runtime consumes knockback, knockdown, paralysis, poison/self-poison, feint-versus-guard, action interference, blind, invisible, heal, guard/evasion/counter/projectile reflection and cleanse. The ten PSV chain plus the two side guardian PSV skills are converted to passive modifiers or auto-cleanse behavior; they are learnable but never equipable in DECK. The DECK UI labels equipable command skills as `CMD` and passive skills as `PSV`; only the former exposes an equip action.

### Two distinct Deck surfaces

The normal left-menu `戰技面板` is a read-only, compact, vertical current-loadout viewer. It renders only the normalized current `deckSlots`, with slot number, readable CMD/PSV badge and skill name; occupied slots do not show AP, speed, range, long descriptions or edit controls, and the viewer never renders the learned-skill catalogue.

The town-gate `戰技配置` console is the editable management surface. Its left side is the learned, equipable-skill list in one vertical column; its right side is the current Deck in one vertical column. `裝入` and `卸下` continue to use the existing compatibility, uniqueness, capacity, class and CMD/PSV rules. The Skill Tree remains responsible for learning/unlocking and Skill Detail, not either Deck surface.

Both Deck surfaces are content-dense list views: slot numbers use a small secondary index
plate, occupied rows show only CMD/PSV plus the skill name (and the contextual secondary
action on the editable console), and empty slots render a frame with blank content. They do
not render placeholder words such as `空`／`沒有技能`／`尚未裝設`; the configuration list also
omits redundant `可裝入 DECK` copy. These presentation rules do not change equipability,
capacity, passive-skill restrictions or any gameplay data contract.

### Compatibility

The catalog contains exactly the 65 canonical ids above. A read-only legacy alias map in `fighter-skill-data.js` accepts older Everrealm save/debug ids (for example `straight_punch → kentotsu`) without adding duplicate nodes or graph edges.
