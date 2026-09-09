# Exploration status/menu redesign

- Removed persistent character identity, level, HP/XP, resource, weapon and commission summary from the visible exploration rail.
- Reduced primary menu to text-only: 狀態 / 物品欄 / 戰技面板 / 技能樹.
- Removed menu icons, English subtitles, badges and card-like row chrome from the visible rail.
- Replaced the bitmap sidebar pull-tab with a CSS right-angle corner triangle that is flush with the panel top/left edges and has a clickable chevron affordance.
- Added a bottom × close control that collapses the rail while preserving the existing persistent collapse state.
- Kept the 遠 / 中 / 近 camera controls directly below the primary menu.
- Compressed spacing so the rail height follows content instead of leaving large blank areas.
- On touch / <=820px layouts, removed outer game-shell gutter and rounded stage frame so the game reaches the viewport edge.
- Updated UI_SYSTEM.md and ui-shell tests to describe/guard the new structure.
