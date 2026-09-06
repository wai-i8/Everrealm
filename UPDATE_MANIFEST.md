# Update Manifest — Full Fighter Skill Catalog

今次修正上一版只完整示範少量技能嘅問題。

## 完成範圍

`docs/references/STRUGARDEN_FIGHTER_SKILL_TREE.md`：

- 65 / 65 格鬥士技能全部使用同一 detailed schema
- 53 CMD
- 12 PSV
- 每招都有 prerequisite、原版數值欄位、射程／效果格、繁體中文功能說明、入手星級、action_kind、deals_damage、utility、Everrealm damage、hit resolution
- 原 Wiki 空白保留 null
- `?` 保留 uncertain
- `∞` 保留 unlimited
- 所有可解析格仔圖加入 machine-readable relative coordinates
- multi-hit `判定：毎回` 對應 each_hit
- 傷害公式：sqrt(AP / 3)
- 傷害技能有額外非傷害 utility：×0.8
- multi-hit 本身唔觸發 ×0.8
- fixed remaining-HP 技能使用 explicit damage-model override
- 修正 謀眠打破／氣孔解毒 為 PSV

## 另外同步更新

`docs/BATTLE_SYSTEM.md`
- 加入 source-defined fixed damage override 規則及 regression test。

`GAME_DESIGN.md`
- 加入固定 HP 型技能唔重複套標準倍率公式嘅高層規則。

