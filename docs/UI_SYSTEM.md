# Everrealm UI Visual System

## 1. 文件定位

本文件係 Everrealm 主要玩家視窗、popup、panel 同 reusable UI component 嘅
現行視覺與版面 source of truth。佢只定義 UI 點樣呈現、點樣伸縮同點樣表達
狀態；角色、技能、委託、裝備及地圖規則仍由各自 system document 擁有。

主要適用範圍：

- Character Status
- Inventory / Bag
- Equipment
- Guild Commission
- Fighter Skill Tree
- Fighter Skill Detail
- 同以上介面共用嘅 modal、header、button、tab、slot、inset panel。

## 2. Visual direction

Everrealm UI 係暗色 fantasy RPG：

| 用途 | 規格 |
| --- | --- |
| 主背景 | deep blue-grey / dark stone，避免純黑 |
| frame / border | aged metal、carved stone、暖金細節 |
| primary highlight | warm gold `#ffc857` |
| secondary text | muted grey-blue `#a6adc4` |
| positive / active | lantern teal `#52dccb` |
| warning / danger | 低飽和紅 `#ff6b6b` |
| body text | cream `#f5e9ca` |

畫面可以有少量霧、光暈、石材紋理，但內容優先；禁止每個系統自行發明一套
顏色、圓角、陰影或「霓虹 app」語言。

## 3. Shared bitmap skin

正式共用 bitmap source atlas 為 `assets/ui/ui-visual-atlas-v1.png`。它提供
frame corners、straight edges、inset panels、button、tab、slot 同 skill-node
狀態。runtime 由 `ui-system.css` 用 CSS background layers 組合，HTML 文字及
controls 疊在上面。

### 3.1 Stretchable frame

所有 major window 使用 `ui-window` base family：

```text
┌──────┬────────────────┬──────┐
│  TL  │      TOP       │  TR  │
├──────┼────────────────┼──────┤
│  L   │     CENTER     │  R   │
├──────┼────────────────┼──────┤
│  BL  │     BOTTOM     │  BR  │
└──────┴────────────────┴──────┘
```

四角保留原比例；直邊只作 repeat / stretch；中心填充可以延伸。唔為 Status、
Inventory、Guild 或 Skill Detail 各自製作固定尺寸背景。窗口需要同時具備：

- `min-width` / `min-height` 只保證最小可讀性；
- `max-width: min(66rem, 100vw - 2rem)`；
- `max-height: min(44rem, 100vh - 2rem)`；
- header、footer 固定喺 frame 內，content 以 `minmax(0, 1fr)` 伸縮；
- content 超過 viewport 時只由 content scroll，唔令 frame 或 controls 被推出畫面；
- padding 以 `.5rem`、`.75rem`、`1rem`、`1.25rem` 節奏遞進，唔用任意 magic offset。

`facility-window` 係現有 major-window base；`ui-window` class 係新 skin hook。
兩者可以同時存在以維持既有 JS 行為，視覺不可再退回 flat Canvas rectangle。

## 4. Hierarchy and components

### Header

每個 major window 只有一個主標題。header 依次包含小型 uppercase kicker、
主標題、短 subtitle 同一個清晰 close button。標題不可依賴裝飾 glyph 才能辨識
功能；裝飾唔可以佔用 content 空間。

### Buttons and tabs

- primary action 使用 gold bitmap-backed button，文字為 HTML，hover 只提高亮度／
  少量上移，focus 使用明顯 teal/gold outline。
- secondary action 使用 dark inset button；danger action 使用低飽和紅。
- tab 只喺同一窗口內有多個同級內容時使用；active tab 以 gold underline 和 inset
  glow 表達，唔靠顏色以外嘅符號。
- disabled button 保留可讀文字與原因，不使用過度透明令使用者以為消失。

### Inset panels and separators

資訊分組使用 `ui-inset` / `facility-*` card，frame 內再加一層深色石材 inset。
分隔線用低對比 cream 或 gold，唔以大量標籤、emoji 或重複邊框製造噪音。

### Slots

Inventory、Equipment、技能書同 DECK slot 共用 slot language：固定 bitmap slot
底、中心放 item/icon、右下顯示數量、HTML 顯示名稱及少量 meta。selected / equipped
用 teal 或 gold ring；locked 用降低飽和度加鎖定 copy；空 slot 保留框但唔放大字元填空。

## 5. Screen variants

### Standard window

Status、Inventory、Equipment 以共用 base frame 為主。Status 左邊係角色 visual
同身份，右邊係 stat groups；Inventory / Equipment 以可捲動 grid/list 表達內容，
兩者嘅 slot、button、selected state 必須一致。

### Guild variant

Guild window 可以有非常克制嘅金色 guild accent、委託星級同 progress meter，
但仍然使用相同 base frame、字級、padding、button 和 scroll rules。

### Skill variant

Skill Tree / Detail 可以使用較冷嘅 blue-violet inset 及節點 state，但 frame、
header、close button 同 action hierarchy 仍屬 shared base。Skill Tree connector
線及 range diagram 係 data-driven dynamic graphics；node 外框和窗口背景必須由
bitmap/CSS 提供。

Skill Detail 必須 content-driven：技能名、rank、prerequisite、damage、hits、
speed、range、height、effects 逐項落入 inset metadata grid；大型 range pattern
可以令 content 變高，但唔得超出 panel，亦唔需要大型「技」字裝飾。

## 6. State language

| 狀態 | 視覺表達 |
| --- | --- |
| default | dark stone fill + aged border |
| hover / focus | gold/teal edge、細微 brightness 或 lift |
| selected | teal inner glow；主動 action 再加 gold edge |
| learned / equipped | teal accent；文字仍保持 cream 可讀 |
| available | warm gold edge / glow |
| locked / missing prerequisite | muted、低飽和、可讀原因、必要時 dashed inset |
| disabled | muted text + reduced contrast，但不移除 layout |
| danger | low-saturation red，只用於錯誤、死亡或不可逆 action |

狀態不可只靠顏色區分；需配合文字、border style、aria 狀態或 disabled semantics。

## 7. Bitmap vs Canvas ownership

Bitmap / CSS / HTML 負責 final visible UI skin、layout、typography、buttons、
slots、nodes、frames 同 interaction states。

Canvas 只保留真正 dynamic、graph-like 或 data-driven 畫面：

- Skill Tree prerequisite connector lines；
- skill range / target diagram；
- battle targeting grid；
- 其他需要即時計算嘅 graph visualization。

Canvas 唔可以作 major window frame、title frame、button、slot、skill node 或
generic popup background。

## 8. Responsive and accessibility rules

- desktop 使用兩欄或多欄內容；窄屏改為單欄，唔縮到文字不可讀；
- window content 以 `overflow-y: auto` containment，horizontal overflow 只限於
  明確需要橫向瀏覽嘅 Skill Tree board；
- close、cancel、primary action 永遠留喺 frame 內並可 keyboard focus；
- modal 背景、標題、controls 保持既有 `aria-labelledby` / `aria-modal` contract；
- focus ring 不可被 bitmap pseudo-element 蓋住；
- reduced-motion 使用者只保留必要狀態轉換，唔依賴動畫傳遞資訊。

## 9. Ownership and production

- 本文件擁有 major UI 組合、層級、狀態、dynamic sizing 同 responsive 規則。
- `ART_PIPELINE.md` 擁有 UI bitmap 透明底、atlas safe area、9-slice crop、export
  同 alpha audit 規則。
- `docs/FIGHTER_SKILL_TREE.md` 擁有技能 data / graph；本文件只決定如何呈現。
- `docs/GUILD_COMMISSION_SYSTEM.md` 擁有委託 state / reward；本文件只決定如何呈現。

任何新增 major popup 先套用 standard `ui-window`，只有明確 gameplay domain
需要時先加 Guild 或 Skill variant；不可複製一張固定尺寸背景解決單一畫面。
