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
| secondary text | readable grey-blue `#c7c9d3` |
| positive / active | lantern teal `#52dccb` |
| warning / danger | 低飽和紅 `#ff6b6b` |
| body text | cream `#f5e9ca` |

畫面可以有少量霧、光暈、石材紋理，但內容優先；禁止每個系統自行發明一套
顏色、圓角、陰影或「霓虹 app」語言。

### 2.1 Text contrast contract

正文、次要說明、disabled copy、gold button text 同 teal button text 使用
`styles.css` 的 shared semantic tokens。深色背景上的次要／disabled 文字不可
回退到低對比 `#a6adc4` 或透明白；淺色 gold／teal surface 上的文字必須使用
深色 `on-accent`／`on-teal` token。所有狀態除顏色外仍要有文字、border、aria
或 disabled semantics，確保 keyboard、窄屏及低亮度環境都讀得到。

## 3. Shared bitmap skin

正式共用 bitmap source atlas 為 `assets/ui/ui-visual-atlas-v1.png`。它提供
frame corners、straight edges、inset panels、button、tab、slot 同 skill-node
狀態。runtime 由單一 `styles.css` 用 CSS background layers 組合，HTML 文字及
controls 疊在上面。`styles.css` 係唯一 runtime stylesheet；舊有 inventory / UI /
responsive stylesheet 已按原 cascade 次序整合入同一檔案，避免後載入 override 令
修改表面上「冇反應」。新增 UI 規則必須放返相關 section，禁止再新增 catch-all
final override stylesheet。

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

所有 `ui-window` major popup 與 shared modal 預設可拖動：desktop 用 pointer/mouse，mobile 用 touch；標題、文字及非互動空白位可以作 drag surface，button、link、input、select、textarea、技能節點／技能 drag source 等 interactive control 不可劫持成 window drag。Skill Tree 桌面空白位可以拖動整個 window，但技能節點 click 必須直接打開 Skill Detail；touch 裝置可保留 tree pan。拖動位置要限制到 viewport 仍保留可操作部分。Overlay 只作輕微 dim，禁止 `backdrop-filter: blur(...)`，玩家仍應清楚睇到正常遊戲背景。

探索左側六個主功能（狀態、物品、面板、技能、任務、系統）採 desktop-style multi-window contract：開啟 major window 後左側 launcher 保持可用；不同功能可以同時存在，同一功能再次開啟只 focus 現有 instance，唔建立 duplicate。新開或被點擊嘅 window 升到最高 z-layer；各 window 可獨立拖動。功能 window 自身嘅 full-stage positioning layer 必須 transparent 並讓 pointer 穿透到未被 window 覆蓋嘅遊戲／launcher 區域。系統設定亦係同一種可拖 major window，唔再依附喺 sidebar icon 旁邊。

## 4. Hierarchy and components

### Header

每個 major window 只有一個主標題。header 以 compact token 保持約 56–72px
usable height，主標題放左側，右上角以 close button 為必要控制；只有真正有可用說明內容
嘅頁面先顯示 shared bitmap-backed info 入口，Inventory、Guild 等冇額外說明內容嘅頁面
唔保留空殼 `[i]`。English taxonomy eyebrow 只在真正增加辨識價值時保留，唔可以同中文
頁名形成第二個 headline。長說明如存在先放入可點開的 help popover，唔喺永久標頭重複 subtitle。close button 由
`ui-close-button`/`facility-close-button` 共用，使用 `assets/ui/ui-close-v2.png`；
info 使用 `assets/ui/ui-info-v1.png`，兩者保持約 40px hit target，但 info visible
art 約 21–25px，close visible art 約 30–34px；X 永遠係 primary action。裝飾 bitmap 與可
keyboard focus 嘅 HTML hit area 分離；不可由各頁自行畫 plain `×`、圓圈或 ESC
位置，close control 亦不可顯示可見 ESC。標題不可依賴裝飾 glyph 才能辨識功能；
裝飾唔可以佔用 content 空間。Top-level facility header 使用深海軍藍資訊帶；
Skill Detail 等 nested modal 使用同一 bitmap X 但較輕量層級，唔重複整個
top-level page header。Info/X sizing 由 shared component 統一，唔按頁分叉。

### Buttons and tabs

- primary action 可以使用 gold bitmap-backed button，但文字必須保持高對比淺色／cream；禁止金色底配黑色或近黑文字。hover 只提高亮度／少量上移，focus 使用明顯 teal/gold outline。bitmap button 本身已經係完整 surface，背後不可再疊額外深藍矩形、glow plate 或 shadow panel；按鈕寬度由文字內容驅動，長文案以 9-slice／`border-image` 只延伸中段，左右裝飾端帽保持原比例。
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
selected item detail 不重複列出另一行「持有數量」；數量只保留於 icon badge 及
accessible label。
DECK slot number 只作細小 secondary index；read-only viewer 只顯示 index、CMD/PSV
badge 同技能名，empty slot 的 content 必須完全 blank，唔顯示「空」、「沒有技能」或
「尚未裝設」。配置頁左右兩欄各自維持單欄 list，`可裝入 DECK` 等 redundant copy
省略，`裝入`／`卸下` 只用 compact、high-contrast action。配置頁左右兩欄仍可保留，
但 list row 要按內容密度收窄，唔可以用 feature-card 高度留大塊空白；學習技能列
同目前配置列只保留 badge、技能名、slot index（如適用）及 action。容量只喺右欄
標題旁顯示一次，唔再顯示「可裝入 DECK」或「可裝入 N 格」等上下文重複文案。

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

### Exploration HUD

探索左側 HUD 係 compact mobile-game function menu，而唔係常駐角色資料表。expanded
state 只保留四個 primary entry：`狀態`、`物品欄`、`戰技面板`、`技能樹`，以及底部
`遠／中／近` 視角控制同 close control。角色頭像、名稱、Level、HP／XP、金錢、藥水、
目前武器及公會委託摘要唔喺 expanded rail 常駐顯示；詳細資料由相應 Status、Inventory、
Guild 等 feature panel 擁有。primary entries 使用純文字，唔加 icon、英文副標、右箭嘴或
獨立 card frame；項目只用低對比分隔同 hover/focus highlight 表達可點擊性。

左上 collapse control 係貼齊 panel top／left edge 嘅直角三角形 corner tab，以 CSS
繪製並保留清楚 chevron affordance；唔使用 detached bitmap badge。collapsed state 只保留
呢個 corner tab，唔留暗色 strip。collapse 係 UI preference，仍儲存於 localStorage，跨
map/interior/refresh 保留，唔改變 movement、keyboard、combat、commission 或 progression。

窄屏／touch runtime 要以 installed mobile-game shell 處理：game stage 貼 viewport edge，
唔保留 desktop outer gutter、rounded frame 或額外深藍邊。sidebar 亦貼左上 safe edge，
內容高度由四個 primary entries 加 secondary controls 自然決定，禁止用固定高 panel
製造大面積留白。

### Dialogue action language

Dialogue continuation button 由 actual line state 決定：仍有下一句顯示「繼續」，最後一
句只會關閉對話時顯示「確定」。E／Enter keyboard binding 可以保留，但 shortcut 唔需要
永久印喺 player-facing button。

### Anchored dialogue overlay

Dialogue 係獨立嘅 anchored gameplay overlay，唔套用 Inventory、Status、Skill Tree
嗰種 generic major window。普通 NPC dialogue portrait-free，唔保留 portrait column、
空白身份欄或 portrait asset space。桌面版固定於 viewport lower portion，world 保持可見；
panel width 同 height 由 text／choice count content-driven，設合理 min/max，短句只佔
所需高度，超出時只喺內部 scroll。speaker 只顯示功能角色名，唔以個人姓名或「姓名｜
職稱」作 ordinary runtime identity；choices 預設單欄直向排列。click、touch、keyboard、
numeric shortcut 同既有 branching/service action 必須保持。

Dialogue frame、button、CMD/PSV badge、close/info control 用 HTML/CSS 加 bitmap；
Canvas 唔負責 ordinary dialogue portrait 或 generic dialogue chrome。細節 bitmap 只能用 border-image、9-slice
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
主內容永久顯示教學條。Inventory 左側紙娃娃區必須以 contained grid 保持七個 canonical 部位完整可見，右側物品格
只顯示圖示與短名稱，完整描述及動作集中喺 selected detail。一般左側選單嘅
`戰技面板` 係唯讀 current-loadout viewer：只顯示目前 DECK slots，使用窄身
直向列表、slot number、CMD/PSV badge（按實際可裝技能規則）同技能名；唔顯示
已學技能 catalogue、裝入／移除控制、AP／速度／range 或完整描述。真正技能配置
只喺主城東門戰技面板台管理。可出戰指令標示 `CMD`，被動技能標示 `PSV`，PSV
永遠唔提供裝入動作。 配置畫面嘅 drag-and-drop 若落到已佔用 slot，必須交換 source／target 兩格；只有落到空槽先係純移動，任何情況都唔可以因 drop 覆蓋而遺失原技能。

### Guild variant

Guild 委託主列表使用 compact Status-tier footprint；每個委託 summary row 內容整組置中，順序固定為「委託名稱 → 星級 →（如有）進行狀態」，避免星級先行令短標題視覺偏左。左側 launcher 開出嘅 `任務` 同唯讀 `面板` window 同樣使用 Status-tier compact width；城門真正可編輯嘅面板配置保持約 `17rem` 窄窗，但「技能／面板」兩個管理區固定左右並排，唔因窄身而堆成上下。

Guild window 可以有非常克制嘅金色 guild accent、委託星級同 progress meter，
但仍然使用相同 base frame、字級、padding、button 和 scroll rules。正式頁面身份
為「公會委託」；公會內接受前／詳情頁可以按需要顯示 recommendation、reward 同 contextual action。左側 launcher 開出嘅已接受「任務」卡則只保留任務名稱／狀態、objective、progress 同 progress bar；已完成時底部只顯示提示文字「請返回公會回報任務」，唔顯示建議等級、完成獎勵或可令人誤會會自動傳送嘅回報 button。卡片不可因 decorative frame
或固定高度令操作被裁切，窄屏則自然堆疊。Guild action 採深色 inset surface 配暖金細框／hover，
唔使用大面積金色填滿；文字一律保持 cream／white 高對比。視窗高度由內容決定，唔為短內容保留大幅空白。放棄委託確認框同樣使用 compact content-driven layout。

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
- game-stage 內一般 HUD、button、label、popup copy 預設禁止 browser text
  selection／touch callout，避免拖動時出現藍色反白；真正文字輸入 control
  (`input` / `textarea` / `contenteditable`) 例外並保留正常選取；
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


## 6. Current inventory, log and authentication contracts

### Inventory pagination / currency

Inventory 左側 canonical equipment paperdoll 係固定區域；右側物品 grid 固定每頁 `5 × 3 = 15` 件。
超過 15 件先顯示上一頁／下一頁及 `current / total`，切頁只更新右側物品 grid，左側裝備區唔移位、
唔重新變成另一頁。分類切換後由該分類第 1 頁開始。Inventory toolbar 同時顯示玩家現有「金幣」；
金額顯示使用共用金幣 icon + 數字，唔重複印「金幣」兩字。道具店餘額同商品價格沿用同一 currency treatment。
全 game player-facing currency 名稱仍然係「金幣」（例如說明、toast、獎勵文案）。Inventory 冇額外 help copy，因此 header 唔顯示 `[i]`。

### Bottom-left system / battle log

探索與戰鬥共用半透明 persistent system log，預設擺喺左側探索功能列右邊，避免遮住角色／狀態 controls。新訊息由底部加入、舊訊息向上推；訊息唔因 timeout 自動消失，runtime 保留較長 history。展開狀態可直接 scroll 完整 history，並提供縮細／展開 control；縮細時只顯示最新少量訊息。drag handle 支援 mouse／touch，位置保存於 localStorage，下一次進入遊戲沿用。

filter 固定為：`全部`、`戰鬥`、`獎勵`、`任務`、`物品`、`系統`。訊息格式使用
`[分類] 內容`，例如 `[戰鬥] 正拳對山野小雞造成 38 傷害`。tag 以低噪音顏色區分：戰鬥橙紅、
敵方傷害淺紅、獎勵金黃、物品青綠、任務淺藍、系統灰白／淡藍；正文保持較淺 neutral 色。
戰鬥每次傷害、EXP、委託進度、物品使用、療癒、藥效完結等都可流入同一 log。重要中央 toast 可同時存在。

### Authentication shell

Firebase 帳戶未通過登入／授權前，左側主功能 launcher 必須完全隱藏；登入成功並正式進入可玩狀態後先顯示。
登入畫面唔可以露出角色、物品、面板、技能、任務或系統 icon，避免未登入已出現 gameplay controls。登入／註冊視窗保持 compact，只保留必要欄位與操作，不顯示「使用 Firebase 帳戶保存你的角色」等冗餘說明。

### NPC dialogue simplification

普通旅館、醫院等 NPC 對話使用單一乾淨 anchored frame：speaker 置頂、正文自然左對齊、留白按內容決定。
單向對話唔硬塞選項；如有 choices，唔顯示 `1.`／`2.` 或其他無意義括號數字，亦唔用拉長金色 bitmap
再疊第二層底框。短 service choice（例如醫院「治療／不用了」）使用內容寬度、橫向 compact buttons，唔拉滿整行。選項只係真正 branching/service action 時先出現。

## 7. 2026-09-11 compact launcher / click-through log update

- Compact launcher-family windows use the narrow trial footprint requested for visual testing: `status`, portable `missions`, portable read-only `deck-view`, and the in-Guild commission list target about `16rem` desktop max width. The city-gate editable Deck configurator targets about `17rem`; its learned-skill and current-panel regions remain side-by-side inside that narrow footprint.
- The six left launcher functions (`status`, `bag`, `deck-view`, `skills`, `missions`, `system`) are non-blocking exploration UI: the player may keep walking while these windows are open. Facility/service UI reached through world interaction (`guild`, `shop`, `general-store`, editable `deck`) and modal confirmations/details remain movement-blocking.
- Inventory remains exactly `5 × 3` per page. Each visible item tile uses one `1:1` outer frame only（icon 上、名稱下），唔再喺 icon 外加第二層卡框；左邊六格裝備板保留，但移除再包住整塊裝備板嘅最外層裝飾框。物品區高度按最多三行內容決定，唔為空白行拉長。Item/equipment detail popup 點擊 popup 外背景即關閉，關閉物品欄亦會清除 selection；已裝備物品嘅 `卸下` 同一般物品嘅 `銷毀` action 都屬 detail popup state，popup 一關就必須一齊消失。`銷毀` 要先進入明確確認狀態；確認狀態只顯示「確定銷毀」同「取消」，唔同時再顯示「裝備」。Inventory action hierarchy 只用金／藍兩級：金色係主要／確定動作（使用、裝備、確定銷毀），藍色係次要／返回動作（卸下、銷毀入口、取消、返回），唔使用紅色 destroy skin。卸下成功後關閉目前 detail selection，唔即時將同一位置變成「裝備」按鈕。短內容 detail popup 自然增高／增闊，唔因幾行內容出現內部 scrollbar；只喺極窄／極矮 viewport 才容許 fallback scroll。
- The persistent System/Battle log is HUD text rather than a panel surface: no message background, no visible scrollbar, and text does not intercept map clicks. Each full message line inherits one category/tone colour from `[tag]` through body text and uses a black outline/shadow for contrast.
- Log history is scrolled only from an invisible strip on the left side of the log: mouse wheel on desktop or vertical finger swipe on touch devices. Tabs, collapse and drag controls remain the only other interactive log controls.
- NPC dialogue always renders above the persistent log HUD.
- Equipment/general-store service UI uses two compact trade tabs: `購買` and `出售`. Selling shows the player's eligible inventory, equipped gear must first be unloaded, and trade controls remain inside the same facility window rather than opening a second full-screen layer.
- System settings use a single 0–100% volume row；移除獨立音樂 toggle 同左側 speaker，只保留 slider 右邊一個 speaker button。按 speaker 會由目前音量切到 `0%` mute，再按一次恢復 mute 前音量。The account section is a compact card that separates email from cloud-sync status and provides a styled logout button. Entering battle forcibly closes all exploration launcher windows and their detail popups.
