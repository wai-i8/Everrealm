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

四角保留原比例；直邊只作 repeat-safe stretch；中心填充可以延伸。runtime 必須
使用 `border-image` 9-slice、獨立 corner/edge pieces 或同等 stretch-safe 組合，
不可用 `background-size: 100% 100%` 把一張小框圖拉到整個窗口。bitmap 只係
decoration，HTML/CSS 才係內容尺寸、對齊同 scroll 嘅 sizing system。唔為 Status、
Inventory、Guild 或 Skill Detail 各自製作固定尺寸背景。窗口需要同時具備：

- `min-width` / `min-height` 只保證最小可讀性；
- panel width follows its sizing tier; the wide ceiling is `min(66rem, 100vw - 2rem)`；
- `max-height: min(44rem, 100vh - 2rem)`；
- header、footer 固定喺 frame 內，content 以 `minmax(0, 1fr)` 伸縮；
- content 超過 viewport 時只由 content scroll，唔令 frame 或 controls 被推出畫面；
- padding 以 `.5rem`、`.75rem`、`1rem`、`1.25rem` 節奏遞進，唔用任意 magic offset。

`facility-window` 係現有 major-window base；`ui-window` class 係新 skin hook。
兩者可以同時存在以維持既有 JS 行為，視覺不可再退回 flat Canvas rectangle。

## 4. Hierarchy and components

### Header

每個 major window 只有一個主標題。header 依次包含小型 uppercase kicker、
主標題、右上角 shared bitmap-backed 說明入口及 close button；長說明放入可
點開的 help popover，唔喺永久標頭重複 subtitle。close button 由
`ui-close-button`/`facility-close-button` 共用，使用 `assets/ui/ui-close-v2.png`；
info 使用 `assets/ui/ui-info-v1.png`，可保持約 40–44px hit target，但 visible
art 明顯小於 X（約 28–32px），X 永遠係 primary action。裝飾 bitmap 與可
keyboard focus 嘅 HTML hit area 分離；不可由各頁自行畫 plain `×`、圓圈或 ESC
位置，close control 亦不可顯示可見 ESC。標題不可依賴裝飾 glyph 才能辨識功能；
裝飾唔可以佔用 content 空間。Top-level facility header 使用深海軍藍資訊帶；
Skill Detail 等 nested modal 使用同一 bitmap X 但較輕量層級，唔重複整個
top-level page header。Info/X sizing 由 shared component 統一，唔按頁分叉。

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

每個頁面只保留一個清楚的主身份；header 已經提供主標題時，content 不再重複
另一個 page／section title。任務或委託卡遵守 summary-first：先顯示狀態、名稱
及當下最重要的目標，再按需要呈現推薦、進度、報酬與 contextual action。規則、
教學及其他次要說明使用 shared `[i]` progressive disclosure，唔永久佔用主要內容。
Player-facing copy 必須使用自然遊戲語言，唔顯示 implementation、resolver 或
catalogue ownership 術語；世界／互動 label 應以清楚的功能角色說明用途。

### Slots

Inventory、Equipment、技能書同 DECK slot 共用 slot language：固定 bitmap slot
底、中心放 item/icon、右下顯示數量、HTML 顯示名稱及少量 meta。selected / equipped
用 teal 或 gold ring；locked 用降低飽和度加鎖定 copy；空 slot 保留框但唔放大字元填空。

### Panel sizing, identity and progressive disclosure

Panel 唔可以因為 viewport 仲有空位就預設最大寬度；寬度必須按 task complexity
同 content density 決定。共用 sizing tiers 如下：

- `compact`：簡單唯讀資訊、短直向列表、確認；
- `medium`：較豐富但仍然單一主題嘅資料；
- `wide`：真正需要兩欄嘅管理、Inventory、Skill Tree 或 configuration。

`facility-panel` 以 `data-panel-size` 套用同一套 compact／medium／wide max-width。正常左側 `戰技面板` viewer 使用 compact bounded content region；城門 `戰技配置` 先使用 wide 兩欄 shell。短名單或 slot list 要用 `max-width`、`minmax(0, 1fr)`、Grid/Flex containment，唔可以因 screen space 拉成一大片空白。

一個 screen 只保留一個 primary page identity。eyebrow、header、body title 同 footer
唔可以用稍為不同嘅字眼重複同一個頁名；section label 只可用於真正不同嘅 subsection。
Summary-first list／slot 只顯示完成當前 task 所需嘅名稱、狀態同最少 meta。永久教學、
規則同次要解釋放入 shared `[i]`，footer 唔應該變成全寬 help strip。

語意上係 list 嘅 learned skills 同 DECK slots 必須保持單欄直向順序；gallery/grid
只適用於 genuinely grid-like content。CMD／PSV badge 在 Deck viewer、Deck config
同 learned-skill list 都要保持清楚可讀，使用 shared visible-size token。

Return-to-title 係 system/menu-level operation，唔係 Deck、Inventory、Status、Skill
Tree、普通 Guild 或其他 management page 嘅預設 footer action；一般 feature page
只用 shared bitmap-backed X 關閉。

### Anchored dialogue overlay

Dialogue 係獨立嘅 anchored gameplay overlay，唔套用 Inventory、Status、Skill Tree
嗰種 generic major window。桌面版固定於 viewport lower portion，world 保持可見；
panel width 同 height 由 text／choice count content-driven，設合理 min/max，超出時
只喺內部 scroll。portrait 係 supporting identity，desktop 約佔 panel 18–25%，使用
shared dark fantasy/gold portrait frame，唔可以壓過 text/actions。speaker name 同
functional role 整合喺 body heading，choices 預設單欄直向排列；窄屏可縮細 portrait
或將其移到 heading 上方，但不得產生 horizontal overflow。click、touch、keyboard、
numeric shortcut 同既有 branching/service action 必須保持。

Dialogue frame、portrait frame、button、CMD/PSV badge、close/info control 用
HTML/CSS 加 bitmap；Canvas 只負責真正 dynamic portrait artwork 或其他 dynamic
rendering，唔畫 generic dialogue chrome。細節 bitmap 只能用 border-image、9-slice
或 segmented stretch-safe composition，禁止 `background-size: 100% 100%`；dialogue
同其他 panel 都要做 desktop 及 narrow runtime screenshot QA，並實際打開檢查，
`runtimeErrors` 必須為 `0`。

## 5. Screen variants

### Standard window

Status、Inventory、Equipment 以共用 base frame 為主。Status 左邊係角色 visual
同身份，右邊係 stat groups；Inventory / Equipment 以可捲動 grid/list 表達內容，
兩者嘅 slot、button、selected state 必須一致。

Status 顯示角色身份、等級、XP／HP progress、攻防、戰棋移動及 DECK 容量；
戰鬥開場 AP、每輪 AP 增加及速度排序等補充規則只放喺 Status `[i]` help，唔喺
主內容永久顯示教學條。Inventory 左側紙娃娃區必須以 contained grid 保持六個部位完整可見，右側物品格
只顯示圖示與短名稱，完整描述及動作集中喺 selected detail。一般左側選單嘅
`戰技面板` 係唯讀 current-loadout viewer：只顯示目前 DECK slots，使用窄身
直向列表、slot number、CMD/PSV badge（按實際可裝技能規則）同技能名；唔顯示
已學技能 catalogue、裝入／移除控制、AP／速度／range 或完整描述。真正技能配置
只喺主城東門戰技面板台管理。可出戰指令標示 `CMD`，被動技能標示 `PSV`，PSV
永遠唔提供裝入動作。

### Guild variant

Guild window 可以有非常克制嘅金色 guild accent、委託星級同 progress meter，
但仍然使用相同 base frame、字級、padding、button 和 scroll rules。正式頁面身份
為「公會委託」；接受後卡片必須用內容驅動的緊湊 layout 完整容納 status、objective、
recommendation、progress、reward 同 contextual action。卡片不可因 decorative frame
或固定高度令操作被裁切，窄屏則自然堆疊。

### Skill variant

Skill Tree / Detail 可以使用較冷嘅 blue-violet inset 及節點 state，但 frame、
header、close button 同 action hierarchy 仍屬 shared base。Skill Tree connector
線及 range diagram 係 data-driven dynamic graphics；node 外框和窗口背景必須由
bitmap/CSS 提供。

Skill Detail 必須 content-driven：技能名、rank、prerequisite、damage、hits、
speed、range、height、effects 逐項落入單欄 vertical metadata rows。每行係
bounded label + `minmax(0, 1fr)` value；label 保持完整，value 自然換行，唔用
per-label `<br>`。大型 range pattern 可以令 content 變高，但唔得超出 panel，亦
唔需要大型「技」字裝飾。

Inventory 必須以 contained two-region shell 組合：左側固定 character/equipment
paper doll，右側 compact item slot grid 同 selected-item detail。slot 只顯示 icon、
quantity、rarity/equipped state 及短名稱；description、stats 同 action 只喺
selected detail 出現。兩側都設 `min-width: 0`，grid tracks 使用 `minmax(0, 1fr)`，
右側內容不可用 absolute positioning、z-index 或 margin hack 覆蓋左側；窄屏改為
上下堆疊。

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
- window content 以 `overflow-y: auto` containment；Skill Tree 另有內部可捲動／
  pannable viewport，outer frame 保持穩定，唔因樹內容變大；
- Grid/Flex child 必須設 `min-width: 0`，可換行 value 使用 `minmax(0, 1fr)`，
  避免長中文標籤、item 名稱或 description 造成橫向 overflow；
- close、cancel、primary action 永遠留喺 frame 內並可 keyboard focus；
- modal 背景、標題、controls 保持既有 `aria-labelledby` / `aria-modal` contract；
- focus ring 不可被 bitmap pseudo-element 蓋住；
- reduced-motion 使用者只保留必要狀態轉換，唔依賴動畫傳遞資訊。

## 9. Ownership and production

### 9.1 Focused window patterns

Decorative UI bitmaps are never the sizing system: ornate frames, buttons, tabs,
slots and skill nodes use stretch-safe border composition (9-slice/border-image,
segmented pieces or native-size art); only plain repeat-safe textures may stretch.
HTML/CSS owns layout, typography, containment and scrolling. Major windows share
one top-right bitmap-backed `ui-close-button` and one shell; nested detail dialogs
use the same bitmap X at a lighter hierarchy instead of repeating a page header.
The info bitmap is visibly secondary to X while its wrapper remains an accessible
hit target. Skill Detail metadata is a
single-column label/value row pattern with bounded, non-breaking labels and
wrapping values. Inventory uses a contained character/equipment region beside a
compact item grid and a separate selected-item detail region; grid content must
never overlap the character region. Grid/Flex tracks use `minmax(0, 1fr)` and
narrow layouts stack rather than introduce horizontal overflow. Canvas remains
limited to genuinely dynamic diagrams such as range patterns and prerequisite
connectors; window chrome, slots, rows and buttons remain DOM/CSS. These screens
require desktop and narrow-viewport runtime screenshots, including unselected and
selected Inventory, both inventory stress fixtures, the vertical Deck, Skill Tree,
Skill Detail, another facility header and valid-save refresh/resume; each result
must be opened and inspected and the run must report `runtimeErrors: 0`. Automated
tests alone are insufficient.

- 本文件擁有 major UI 組合、層級、狀態、dynamic sizing 同 responsive 規則。
- `ART_PIPELINE.md` 擁有 UI bitmap 透明底、atlas safe area、9-slice crop、export
  同 alpha audit 規則。
- `docs/FIGHTER_SKILL_TREE.md` 擁有技能 data / graph；本文件只決定如何呈現。
- `docs/GUILD_COMMISSION_SYSTEM.md` 擁有委託 state / reward；本文件只決定如何呈現。

任何新增 major popup 先套用 standard `ui-window`，只有明確 gameplay domain
需要時先加 Guild 或 Skill variant；不可複製一張固定尺寸背景解決單一畫面。
