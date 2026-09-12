# 《永恆國度 · Everrealm》遊戲設計綱要

## 設計北極星

本作以《幸福 Online》（日版《ストラガーデン／Strugarden》）的戰棋式戰鬥節奏、技能配置及左側介面為首要參考。遇到戰鬥規則、技能成長或介面取捨時，先查核日版／港版資料，再決定是否沿用；不可只憑一般 RPG 慣例自行補完。

下文以兩個標記區分資料性質：

- **參考已核實**：可由文末來源直接支持的原作行為。
- **本作採用／改編**：本專案為可讀性、單人流程、滑鼠及手機操作而定的實作規則，不宣稱與原作完全相同。

### 文件分工

- 本文件定義全局遊戲方向、探索、介面、技能／DECK、成長及跨系統設計；複雜獨立系統以 `docs/` 內專用規格為準。
- PNG alpha、atlas 分格／裁切、透明安全邊、semantic anchor、rowCuts／columnCuts、sprite 對位及美術資產驗收等技術規格，統一以 `ART_PIPELINE.md` 為唯一準則，避免兩份文件重複維護。
- 戰棋 movement、collision、攻擊路線、projectile、AP、戰鬥 AI 及戰鬥高低差規則，統一以 `docs/BATTLE_SYSTEM.md` 為唯一詳細規格。
- 地圖 registry、入口／傳送、探索 collision、encounter zone、biome，以及探索環境如何生成戰鬥場景，統一以 `docs/MAP_SYSTEM.md` 為唯一詳細規格。
- Guild 委託目錄、討伐／許願 state、技能書信封及回報流程，統一以 `docs/GUILD_COMMISSION_SYSTEM.md` 為唯一詳細規格。
- 裝備 schema、canonical slots 及裝備側 stat modifiers，統一以 `docs/EQUIPMENT_SYSTEM.md` 為唯一詳細規格；battle formulas 仍由 `docs/BATTLE_SYSTEM.md` 擁有。

## 探索、角色與介面

### 參考已核實

- 原作主要功能（`STATUS`、`ITEM`、`DECK`、`SKILL` 等）集中在畫面左側，右上保留圓形小地圖；場景角色頭頂顯示名稱。
- 格鬥士是原作職業之一，以拳套及拳腳技能作戰；「正拳／拳突」屬早期基本拳技。

### 本作採用／改編

- 開始新遊戲時先選 **戰士** 或 **格鬥士**。戰士使用刀劍；格鬥士使用拳套，初始技能為「正拳」。職業會限制可裝備武器、初始技能及可學技能分支。
- 非戰鬥移動統一使用滑鼠點擊或觸控地面；角色使用碰撞感知最短可行路線繞過牆、樹與建築。若精確點選位置不可站立或不可到達，改以前往距離該點最近的可達空地。滑鼠按住地圖 `0.5` 秒後放開，即啟用游標跟隨，之後移動游標即可改變行走目標；再次短按則退出跟隨，執行單次點擊。觸控長按可拖動選擇目標，放開後地面目標保留最後位置，角色／設施目標則繼續追至遇敵或互動。連續追蹤最多每 `150 ms` 重算一次路線；取消觸控、切換場景、開啟彈窗或視窗失焦時清除追蹤。移除 WASD、方向鍵、手機虛擬方向盤及 `K` 快閃。
- 非戰鬥鏡頭提供遠／中／近三級；一般情況以玩家為畫面中心，接近地圖邊界時 camera 只 clamp 到 native world bounds，容許玩家偏離中心。地圖尺寸不得反過來提高 camera zoom：細型 interior 亦保持同一套 authored zoom／world scale，唔可以為填滿 viewport 自動放大場景。Desktop 探索可用滑鼠滾輪在遠／中／近三級切換，手機則保留雙指 pinch zoom。右上圓形小地圖採玩家置中嘅 local view，現行視野直徑約為舊版四倍；狀態、物品、裝備、DECK、技能樹等入口全部放在左側。
- 主城可見 artwork、native gameplay world 同 authored navigation 都固定為 `7680 × 4320`；玩家約 `128 × 192` 嘅可見 sprite body proportion 係以呢個原生尺度 authored，標準玩家 locomotion frame 保持 `256 × 256` world units，唔使用 `worldScale`／`entityScale`／`unitScale` migration factor。camera 係圍繞玩家裁切 viewport 嘅 window，唔係將全張主城 fit 入 gameplay viewport；全局遠／中／近 native-world zoom 固定為 `0.46176`／`0.592`／`0.72224`，8K source 尺寸亦唔會自動改變所選 view mode。background、entity、collision 同 screen／world conversion 共用同一 camera transform，DPR 只提高 Canvas output resolution，唔改變 world viewport。
- 每張 supplied map image 都係自己嘅 gameplay world：一個 native scene pixel 就係一個 world unit，native image width／height 就係 world bounds。大地圖會真實較耐行，小型 interior 會真實較快行，兩者唔會 normalize 到共同尺寸或舊 logical world。玩家、NPC 同各 monster 嘅 authored render dimensions、`330` world-units/sec 基礎探索移速及遠／中／近 camera preset 全部係 global contract，唔由地圖尺寸、場景身份或解析度推導；細地圖不足以覆蓋 viewport 時亦唔使用 cover-zoom floor，場景保持原有比例並置中／clamp 於 native world bounds，background、entity、collision 同 click conversion 必須繼續共用同一 camera transform。
- 世界目前由 **主城、山地野外、沉燈坑道** 三個主要探索區域組成；公會、裝備店、療癒所、雜貨舖及旅店等屬主城附屬 interior。主城東門連接山地野外，山地再通往坑道。入口、傳送、探索 collision、encounter zone、biome，以及探索位置如何生成對應戰鬥場景，全部見 `docs/MAP_SYSTEM.md`。
- 物品欄統一呈現裝備與背包：左邊角色紙娃娃使用 canonical slots `head`、`weapon`、`upperBody`、`lowerBody`、`hands`、`feet`、`charm`，右邊固定每頁 `5 × 3`、最多 15 格列出藥水、技能書、素材及裝備；每件物品只用一層 outer slot frame，icon 上、名稱下，左邊裝備板亦唔再額外加最外層 shell。`upperBody`／`lowerBody` 取代舊 `body`／`armor` 別名；全身裝備可同時佔用上身及下身，互斥部位由裝備資料的 `occupiesSlots` 定義。玩家先選取物品，再喺獨立詳情區查看描述、數量及可用動作；已裝備物品可直接「卸下」，一般可棄物品可經確認後「銷毀」，detail popup 點外層背景或關閉物品欄時 action state 必須一齊清除。物品 action 只用金色主要／確認同藍色次要／返回兩級，唔用紅色 destroy skin；銷毀確認只保留金色「確定銷毀」＋藍色「取消」，卸下後清除 selection，唔即時彈返「裝備」。換裝、使用及技能書流程仍沿用現有規則，未有對應裝備的部位亦須明示空位。
- 左側功能列保持原作式窄身、單欄及極簡；每個彈出頁只處理當前主題，不再重複放公會摘要或跨頁分頁列。開啟狀態、物品、面板、技能、任務或系統時左側功能列繼續顯示，玩家可以同時開多個不同功能 window；同一功能只維持一個 instance。新開／重新點擊嘅 window 置頂，點擊其他已開 window 會將其帶回前景。系統設定同其他五個主功能使用同一套可拖動、可疊放 window 行為，唔再固定黐住 system icon。
- 所有一般彈出視窗右上角永遠提供清楚可見、bitmap-backed 的 shared close control。阻塞式 modal／confirmation 可以點半透明背景關閉；可並存嘅主功能 window 則使用 transparent positioning layer，點 window 外唔會自動關閉，並容許玩家繼續操作左側 launcher。Popup backdrop 唔使用 blur；major window／modal 可用滑鼠或觸控由標題、文字或其他非互動區域拖動，button、input、link、可拖技能等 interactive control 本身唔啟動視窗拖動。
- 玩家長時間無操作不會再開啟阻塞式「停一停／Night Watch Paused」視窗；持久化改用無干擾的 dirty-state autosave checkpoint。狀態有意義地改變時標記 dirty，約每 5 秒只檢查並保存一次有變更的狀態；重要場景轉移、交易、技能取得、裝備或任務狀態轉移會即時保存，保存失敗會保留 dirty 等待重試。這是 client persistence checkpoint，唔預設未來 authoritative server 行為。
- 五個主城服務 interior 的核心 NPC 使用 resolution-aware authored-region interaction：`1672 × 941` 基準為 `160 px` service reach／`18 px` hit padding，高解析度同尺度場景按 source resolution 等比例放大（`3344 × 1882` 公會為 `320 / 36 px`）。互動距離由 NPC authored magenta region 到玩家 feet pivot 的最近點計算；玩家可以由 region 任一側接近，唔需要走到單一 centroid 或 NPC entity point。
- 探索 launcher／系統／物品 detail 等非戰鬥 window 可以並存，但一旦 encounter 正式切入戰鬥，所有探索 window 同 popup 必須即時關閉，唔可以帶入 battle scene。門口／transition hotspot 仍可點擊行入，但 hover cursor 保持普通羽毛；手指 cursor 只畀真正 UI／NPC／可操作物件。
- 系統音量控制只保留 slider 右邊一個 speaker：按一下 mute 到 `0%`，再按恢復 mute 前音量；不再另外提供「音樂」toggle。
- 正常 refresh 如果有 valid save 會自動載入並直接返回探索；冇 valid save 就停留標題畫面。玩家明確選擇「返回標題」時先保存再返回標題；save load 失敗只顯示錯誤並保留現狀，唔可以靜默覆蓋存檔或開新遊戲。
- 角色死亡提供兩個清楚選項：「原地復活」與「返回主城」。戰鬥中倒下時直接停留喺戰場畫面彈出「你倒下了」，唔先退回探索地圖；原地復活只回復至 `1 HP`，返回主城按正常主城 spawn 重生。兩者都扣除「死亡當刻目前等級升下一級所需 XP」的 `5%`（四捨五入為整數），選擇前唔顯示預計扣除量，完成選擇後先以 toast 顯示實際失去 EXP。EXP 可以跨級扣減：目前級 EXP 扣至 `0` 後仍有餘額，就跌回上一級並由上一級 EXP bar 尾端繼續扣；最低只可跌至 Lv1 / 0 EXP。降級後任何 `requiredLevel` 高於新等級嘅已裝備物品必須自動卸下並保留喺背包。不再扣金幣。
- 遊戲畫面文字預設不可被 browser drag-select／highlight；button、popup copy、HUD 等都要保持 app/game interaction feel。真正文字輸入 control（input／textarea／contenteditable）例外，仍可正常選取編輯。
- 標題畫面只保留遊戲標誌與開始／繼續核心 action；移除舊副標語及底部操作教學列。主要 action 必須保持高對比，唔可再用金色底配黑色／近黑文字造成難讀。
- 點擊左上角色狀態可開啟狀態欄，顯示職業、等級、XP／HP progress、攻擊、防禦、戰棋移動及 DECK；不顯示行動速度、探索移速或暴擊率。
- 所有可互動 NPC 頭頂置中顯示名稱；任務問號／感嘆號若存在，必須以 NPC 身體中心線定位。不得把名稱燒進角色圖，避免縮放、換圖或四方向動畫後失去清晰度。角色圖點樣裁切、對齊及以 semantic anchor 維持中心線，統一依 `ART_PIPELINE.md`。flattened interior 嘅 NPC 視覺已烘焙入 master art，runtime 只顯示一個 semantic NPC entity，唔重畫角色。
- NPC 的法杖、槌、寵物、托盤等外伸裝飾不得令人物世界座標、名稱或任務標記漂移；具體 atlas／anchor 實作規格見 `ART_PIPELINE.md`。正式 flattened interior 不顯示 talk／互動菱形或 transition marker。
- 公會、裝備店、療癒所、雜貨舖及旅店嘅入口使用可見 master art 對應嘅 semantic physical door；門區只要在鏡頭內就可以直接點擊／按住行入，但唔常駐繪製 marker 或入口 label。Flattened scene 可以由「正式顯示圖 + 配對 authoring 圖」定義；authoring 圖擁有 walkability、transition 同 special interaction geometry，建築圖片尺寸不得改變入口傳送點、點擊目標或碰撞門廊的設計位置；具體 contract 見 `ART_PIPELINE.md`，transition geometry 見 `docs/MAP_SYSTEM.md`。
- 玩家、普通怪物及 Familiar 正式移動時都要有四方向行走動畫；探索地圖唔接受靜止 sprite 純平移。普通怪物接近斜角時保留原軸向，改向需要短暫確認及冷卻，避免碰牆或微小路徑修正造成左右高速閃爍。具體 28-frame locomotion atlas、anchor、repack 及 animation QA 規格見 `ART_PIPELINE.md`。
- 探索地圖不顯示怪物血條；只有戰鬥場景在角色腳下顯示血條。
- 公會任務只可在公會開啟；裝備交易只可在裝備店開啟，道具交易只可在道具店開啟。一般物品、狀態、裝備及技能可由左側選單隨時查看。

## 戰棋戰鬥概要

本作採用《幸福 Online／STRUGARDEN》式同步戰棋。

核心設計：

- 玩家、怪物及 Familiar 使用同一套同步 movement timeline；戰棋逐格移動視覺亦要播放同探索共用嘅 directional walk animation，唔用靜止 sprite 滑格。
- 移動 1 格 = 1 步；每次改變行進方向額外消耗 0.5 步。
- 每格最多一個單位；不可穿過、交換或重疊，爭格／撞位會停止未完成移動。
- 角色有上、下、左、右四方向；技能範圍、側擊／背擊及最終命中受實際位置與朝向影響。
- 戰鬥 AP 初始 10、每輪 +10、上限 200；技能按 `S > A > B > C > D > E > F` 速度順序結算。
- Everrealm 遵守 **SIMPLE NUMBERS, DEEP TACTICS**：通用戰鬥數值係 HP、ATK、DEF、Accuracy、Evasion、AP、Weight、Move；Skill Speed、Interrupt、Skill Durability、facing、range 同 attack path 保留作戰術深度。唔引入 MAG、獨立 Magic Attack／Defense，亦唔建立 slash／impact／piercing／elemental 攻防矩陣。
- 基礎 Accuracy 為 `99%`、基礎 Evasion 為 `0%`；最終命中率統一使用 `(Effective Accuracy / 100) × Skill Accuracy Multiplier × (1 - Effective Evasion / 100)`。普通技能 multiplier 預設 `1.0`，Miss 戰場浮字使用黃色 `MISS`，左下 Battle Log 保留出手方原本訊息顏色。格鬥士「舞葉」當次 action resolution 提供 `50%` Evasion，下一回合前清除。
- Everrealm 標準傷害技能以正拳 `3 AP = 1.0×` 為 baseline，總技能傷害倍率使用 `sqrt(AP / 3)`；技能說明如包含擊退、轉倒、中毒等額外非傷害 utility，最終傷害再 `×0.8`。`dealsDamage=false` 技能完全唔套用傷害公式；原作明確屬固定剩餘 HP 型嘅特殊傷害（例如留下半氣拳／留下後一拳）使用 explicit damage model，唔重複套標準倍率公式。
- Multi-hit 技能先計整招總傷害，再拆成每 Hit；除唔盡嘅整數 remainder 永遠優先分畀後面 Hits。原作標記「判定：毎回」嘅連擊類技能，每 Hit 都按更新後 battle state 重新掃同一 attack path，因此前一 Hit 擊倒／擊殺 blocker 後，下一 Hit 可以繼續打到路線後方單位。
- 攻擊唔係「點中邊個就必定打中邊個」。Linear 攻擊使用共用 deterministic 正交 attack-path resolver：目標喺前半面時先向前再左右轉；同橫排直接左右；目標喺後半面時先左右、再向後。實際路線上第一個合法單位／地形可以攔截。Arc 攻擊按弧線高度判斷；Pathless 攻擊冇中途 interception。詳細規則見 `docs/BATTLE_SYSTEM.md`。
- 戰鬥引擎由一開始預留 Line of Sight、Line of Effect 及地形高度接口；戰場嘅 biome、terrain、obstacle 及 height context 來源由 `docs/MAP_SYSTEM.md` 定義。
- PC 初始山地戰場採用《幸福 Online／STRUGARDEN》式左下→右上 2.5D 斜視構圖；邏輯仍然係 2D grid + authored elevation。第一個 teaching battlefield 為 `8×3` 小場；projected X/Y grid axis 必須等長，logical 1×1 tile 要保持等邊菱形／正方格感。Level-0 主棋盤係同一平面並只有薄地台厚度；scrub 後方只升起一個約 2×2 格嘅單級高台，唔可以整塊場變成逐級上斜嘅樓梯。一棵 high tree 阻 Linear + Arc，一叢 low scrub 只阻 Linear。 Projected 畫面四向固定讀作左上／右上／右下／左下；內部 resolver 可以繼續使用 up/right/down/left，但 UI 同 directional art 必須按斜視座標呈現。
- 戰鬥角色／怪物 sprite 保持直立；名稱跟實際 sprite semantic head anchor，而唔跟 tile 上緣。Floating command menu 唔跟隨玩家；首次按 viewport／棋盤 geometry 優先放喺棋盤左側嘅非遮擋位置，玩家拖動後會保存 normalized X/Y 並於之後戰鬥沿用。
- 戰鬥 command UI 採用「資訊簡潔、美術精緻」：技能主列表只顯示技能名，唔長駐顯示技能 AP、快捷鍵、圓點或說明；AP 不足直接灰化，選中技能後先顯示 AP／射程／delivery 詳情。`待機` 喺行動 phase 使用同技能一樣嘅全闊按鈕；`撤退` 保留喺移動 phase utility row；暫時取消獨立飲藥按鈕。移動 phase 用 full／half／empty pips 顯示剩餘步數，提供 `重新移動`／`結束移動`；玩家以路點逐段排 movement sequence，直線多格可以一次點終點，之後再點舊格會新增真實回程而照扣成本。系統只由「目前路線終點」規劃新一段，絕不重算／縮短／退款已排歷史；朝向箭嘴可原地消耗 0.5 footwork。

完整 movement、collision、AI、targeting、attack trace、projectile blocking、AP、速度、高低差接口及戰鬥驗收規格：

`docs/BATTLE_SYSTEM.md`

## 技能書、技能樹與 DECK

### 參考已核實

- 原作技能依前置關係逐級開放，獲得技能物品後仍須符合學習順序。
- 戰鬥只能使用預先放入 DECK 的技能；原作資料記載初期配置格較少，之後可擴充。

### 本作採用／改編

- 任務或抽取只會得到「具名技能書」物品，不會直接學會。玩家在物品欄點擊技能書後，先看到名稱、簡介、平面範圍／射程、高低差、AP、速度及前置技能，再按確認學習。
- 技能書 rank 只使用 shared `skill-core.js` formatter；`1=☆`、`2=☆☆`、`3=☆☆☆`、`4=☆☆☆☆`、`5=★`、`6=★☆`、`7=★☆☆`、`8=★☆☆☆`、`9=★☆☆☆☆`、`10=★★`。委託、物品欄、技能樹、戰鬥、toast 及文件表格不得各自重組星號。
- 學習成功才消耗技能書；前置不足、職業不符或條件未滿時保留物品。重複技能書按既定碎片規則處理。
- 公會委託的固定 V1 目錄、星級信封及討伐／許願流程見 `docs/GUILD_COMMISSION_SYSTEM.md`；信封開出具名技能書，但不會直接學會，亦不繞過 Fighter 前置。公會頁正式身份為「公會委託」，次要規則由 shared `[i]` 說明入口提供。
- 技能樹使用資料驅動的 SVG／DOM 圖，由上向下展開；連線放在節點後方並直接由前置關係產生。不可把整棵樹燒成點陣圖，以便新增技能、響應式排版及互動狀態同步。總覽採用緊湊、名稱為主的節點，點擊名稱才開啟 AP、速度、效果、入手及前置等詳細資料。節點狀態如下：

  | 圖示 | 狀態 | 行為 |
  |---|---|---|
  | CMD 技能圖示 | 已學會 | 可放入 DECK；PSV 技能按被動規則持續生效 |
  | 大星星 | 可學習 | 前置已滿足；持有對應技能書即可學習 |
  | 小星星 | 條件不足 | 預留等級／任務等額外條件，首階段暫不啟用 |
  | 問號 | 前置未解鎖 | 必須先沿連線學會前方技能 |

- 格鬥士技能樹以 explicit prerequisite graph 保存；合流節點必須同時滿足全部實際 connector 前置，**唔可以因兩招喺版面相鄰就自行加 prerequisite**。例如：`跳彈腳` 需要 `先之先 + 轉砲腳`，但 `時差正拳` 上方只有 `連擊` 直線，所以只需要 `連擊`。原日文 `連弾` 顯示名統一為繁體中文「連擊」，消耗 `12 AP`、速度 `B`，連續出拳兩次。完整現行資料、range／高低差、入手方法、Everrealm damage balance 及 runtime contract 詳見 `docs/FIGHTER_SKILL_TREE.md`；原始來源證據保留於 `docs/references/STRUGARDEN_FIGHTER_SKILL_TREE.md`。
- 一般左側選單嘅 `戰技面板` 係 compact、窄身、直向、唯讀嘅 current-loadout viewer，只顯示目前 DECK slots、細小 secondary slot index、CMD/PSV badge（按實際可裝技能規則）同技能名；唔顯示已學技能 catalogue、裝入／移除控制、AP／速度／range 或完整描述。只可在主城粉紅色 authoring deck-configuration region 編輯；管理流程保留喺該 region。空槽保留框體但 content 完全留白。初始 `3` 格；公會達銀燈階級擴至 `4` 格。配置管理採用 summary-first compact rows，容量只喺目前配置標題旁顯示一次，唔顯示 `可裝入 DECK`／`可裝入 N 格`。獎勵以 milestone 記錄，重複回報或讀舊檔都不會重複加格；未放入 DECK 的已學技能不能在戰鬥使用。DECK 牌面以 `CMD`／`PSV` badge 區分指令與被動；PSV 只可學習並持續生效，永遠不能裝入 DECK。
- 城門粉紅色 authoring region 嘅「戰技配置」係另一個獨立嘅 editable management surface：左邊單欄列出已學且可裝入技能，右邊單欄列出目前 DECK slots；`裝入`、`卸下`、容量、唯一性、職業限制及 CMD／PSV 規則保持不變。粉紅區唔係 NPC、對話點或出口；舊 deck sign／bitmap 不再係 canonical trigger。技能配置支援 drag-and-drop：拖到空槽會移入該槽，拖到已有技能嘅槽位就交換兩格位置，唔可以覆蓋並令原本技能消失。技能樹只負責學習／解鎖及技能詳細資料，唔取代以上兩個 Deck surface。
- 世界／地圖上的 NPC 名稱以功能角色為主，讓玩家一眼知道互動用途；普通服務／提示 NPC 嘅個人身份只保留作 internal compatibility metadata，唔進入 player-facing label、quest copy 或 dialogue speaker。具名劇情 NPC 必須有明確未來設計批准先可例外使用個人名；主城街道維持沒有服務 NPC，核心服務角色放在各自 interior。
- 一般功能頁只用 shared X 關閉，唔顯示「返回標題」；返回標題屬 system/menu-level 操作，保留於標題／系統流程。普通 NPC 對話使用獨立 anchored、portrait-free gameplay overlay：深海軍藍、金色裝飾、只顯示功能角色名，panel 依短句／選項內容收窄，選項預設直向排列並保留滑鼠、觸控及鍵盤操作。
- 對話最後一句只會關閉對話時顯示「確定」，仍有下一句時顯示「繼續」；E／Enter 等 keyboard shortcut 可以保留但唔需要印喺 action button。探索 HUD 由 compact character header、quick resource／weapon strip、primary functions、獨立 secondary 視角／音樂聲效 controls 及公會委託 tracker 組成，係實際 DOM／layout recomposition 而唔係只加裝飾；並可完全收起至一個 bitmap 三角 pull-tab。收起係 UI preference，唔影響 movement、combat、stats、commission 或 progression，並可跨 map／interior／refresh 保留。
- 戰士與格鬥士使用獨立技能分支；轉職系統未實作前，不允許跨職業學習或裝設。

### Fighter V1 equipment

格鬥士 V1 商店只顯示五類：武器、頭部、上身、下身、武道服；戰士武器及其他職業裝備不可跨職業使用。現行拳套數值改以《幸福 Online／STRUGARDEN》原作「衝」攻擊作 Everrealm `ATK`：`metal_knuckles`（Lv6，ATK 23，450）、`giz_armguard`（Lv12，ATK 27，1800）、`heavy_knuckles`（Lv18，ATK 33，4050）、`superheavy_knuckles`（Lv24，ATK 39，7200）。格鬥士防具同樣以原作數據轉換：原作衝攻直接成為該件 Everrealm `ATK`；原作衝防以 `round(衝防 / 5)` 成為 Everrealm `DEF`；required level 與購買價亦盡量跟原作表。例：門人系衝攻 `+2`、衝防 `12 → DEF 2`；練武系 `+3`、`16 → DEF 3`；鍛鍊系 `+4`、`21 → DEF 4`；髮髻帽衝防 `14 → DEF 3`。完整原作式五部位平衡基準（頭、上身、下身、手、腳）為 Lv6 約 `ATK 31 / DEF 11`、Lv14 約 `ATK 39 / DEF 15`；目前 V1 商店仍只露出上／下身，手／腳記錄保留為 legacy compatibility，但怪物同級攻防曲線以完整格鬥士裝備基準校準。完整固定資料由 `data/equipment.js` 保存，購買／裝備驗證由 `expansion-core.js` 負責。購買只增加 owned inventory，唔會自動裝備；等級不足仍然可以預先購買，`requiredLevel` 只喺實際裝備時阻擋。裝備店與道具店提供「購買／出售」模式，已裝備物品必須先卸下先可出售。職業不符仍不可裝備。

## 世界與美術一致性

- 正式遊戲畫面統一使用精緻 Q 版 bitmap 美術；Canvas 幾何圖只可作底層效果、debug 或資產載入失敗時的後備。
- 探索環境同戰鬥場景必須保持 biome 身份連續：玩家喺山地、坑道或將來海岸遇敵，戰鬥地台、背景及障礙物應合理反映原本環境。
- 地圖／biome／encounter／battlefield context 由 `docs/MAP_SYSTEM.md` 定義。
- 戰鬥 terrain／obstacle 對 movement、LOS、Linear／Arc／Pathless 攻擊有咩機械效果，由 `docs/BATTLE_SYSTEM.md` 定義。
- PNG、tile、battlefield background、props、atlas、透明安全邊、anchor、grid visual overlay 及美術 QA，由 `ART_PIPELINE.md` 定義。
- 美術圖片尺寸／透明邊變化不得改變世界座標、collision、傳送點、interaction point 或 battle cell。

## 等級與職業平衡

- 等級上限為 `45`。玩家升級本身**不提供 Base ATK / Base DEF**；`data/classes.js` 由 Lv1–45 全部固定 `attack: 0`、`defence: 0`。ATK／DEF 由裝備、PSV、buff/debuff 及暫時戰鬥效果建立，令攻防成長直接反映玩家實際著咩裝。
- 等級主要增加 Max HP、解鎖技能／裝備及推進內容；裝備不提供 Max HP bonus，`maxHp` 裝備欄位只作 legacy compatibility 並在 runtime 忽略。現行 deterministic HP curve：格鬥士 `MaxHP = 88 + 7×(Lv-1) + 3×floor((Lv-1)/5)`；戰士 `MaxHP = 88 + 8×(Lv-1) + 4×floor((Lv-1)/5)`。無裝備基礎戰棋移動為戰士 `3`、格鬥士 `5`，裝備只用 explicit Move modifier 改變可走格數。
- 升級時 HP 立即回復到新上限，並寫入「等級提升」系統訊息；所有舊存檔的待選升級數歸零。
- 主職業每級所需 EXP 跟《幸福 Online／STRUGARDEN》必要經驗表；Everrealm 只使用至 Lv45：

| Lv | 升下一級所需 EXP | Lv | 升下一級所需 EXP | Lv | 升下一級所需 EXP |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 250 | 16 | 2100 | 31 | 8100 |
| 2 | 260 | 17 | 2150 | 32 | 8150 |
| 3 | 270 | 18 | 2200 | 33 | 8200 |
| 4 | 290 | 19 | 4000 | 34 | 10000 |
| 5 | 310 | 20 | 4050 | 35 | 12000 |
| 6 | 340 | 21 | 4100 | 36 | 14500 |
| 7 | 370 | 22 | 4150 | 37 | 17000 |
| 8 | 410 | 23 | 4200 | 38 | 19000 |
| 9 | 450 | 24 | 6000 | 39 | 20500 |
| 10 | 500 | 25 | 6050 | 40 | 21500 |
| 11 | 550 | 26 | 6100 | 41 | 22200 |
| 12 | 610 | 27 | 6150 | 42 | 22900 |
| 13 | 670 | 28 | 6200 | 43 | 23600 |
| 14 | 2000 | 29 | 8000 | 44 | 24300 |
| 15 | 2050 | 30 | 8050 | 45 | 25000* |

`*` Lv45 已係 Everrealm cap，runtime 顯示 `LV.45 MAX` 並停止再升級；`25000` 保留喺 source table 以維持原作表／日後擴展對照。

- 戰鬥 EXP 基準沿用原作「同級 1 對 1 = 100 EXP」，再套 Everrealm 已定修正：1／2／3 隻 encounter 分別 `×1.0 / ×1.5 / ×2.0`；怪物每高玩家 1 Lv `+10%`，到 `+10 Lv` 封頂 `×2.0`；怪物低玩家 1–4 Lv 不減，低 5 Lv 起為 `×0.9`，之後每再低 1 Lv 再乘一次 `0.9`。詳細公式及 encounter HP scaling 由 `docs/MONSTER_SYSTEM.md` 擁有。

## 驗收基準

- 桌面 Chrome `100%` 縮放下，正文及按鈕無需貼近螢幕閱讀；標題只作輕量 topic bar，不可壓縮內容區。
- 電話與桌面採用同一點擊／觸控移動模型；方向提示不可遮住可選格。
- 全局測試至少覆蓋固定 Lv.1–45 成長、技能前置、技能書不自動學習、DECK 唯讀／城門編輯、容量及職業裝備限制；戰棋 regression 以 `docs/BATTLE_SYSTEM.md` 為準，地圖／傳送／encounter／battlefield regression 以 `docs/MAP_SYSTEM.md` 為準。

## 參考來源

以下資料用來核實原作行為；本作的數值、單人流程及操作改編仍以本文件為準。

- [ITmedia：同步移動、路線／朝向及背後攻擊限制（2004）](https://www.itmedia.co.jp/news/article/0404/02/1040402053/)
- [4Gamer：敵方自動移動與同步戰鬥流程（2004）](https://www.4gamer.net/news/history/2004.04/20040402103000detail.html)
- [VIP Strugarden FAQ：撞位取消剩餘移動、自由路線與朝向](https://wikiwiki.jp/vipstr/FAQ)
- [巴哈姆特：AP 起始／累積規則資料](https://forum.gamer.com.tw/Co.php?bPage=0&bsn=7274&sn=60250&subbsn=1)
- [巴哈姆特：速度順序、技能／格鬥士及技能書資料](https://forum.gamer.com.tw/C.php?bsn=7274&snA=8164)
- [巴哈姆特：技能 AP／SPD 與速度字母資料](https://forum.gamer.com.tw/C.php?bsn=7274&snA=8324&tnum=10)
- [4Gamer：技能樹、技能物品及職業攻略](https://www.4gamer.net/specials/strugarden_guide/stru02.html)
- [4Gamer：技能方向例外資料](https://www.4gamer.net/games/014/G001479/20040408182628/)
- [巴哈姆特：左側功能列、圓形小地圖及場景名稱示例](https://forum.gamer.com.tw/Co.php?bPage=0&bsn=7274&sn=60248&subbsn=1)
- [Strugarden Wiki：格鬥士職業與拳技資料](https://wiki.strugarden.pluslake.net/職業/格闘士/)
- [Strugarden Wiki：必要經驗值表及同級 1 對 1 = 100 EXP 基準](https://wiki.strugarden.pluslake.net/%E5%BF%85%E8%A6%81%E7%B5%8C%E9%A8%93%E5%80%A4)
- [Strugarden Wiki：爪／拳套原作攻擊、等級及價格資料](https://wiki.strugarden.pluslake.net/%E3%82%A2%E3%82%A4%E3%83%86%E3%83%A0/%E6%AD%A6%E5%99%A8/%E7%88%AA/)
- [Strugarden Wiki：防具原作攻防資料（胴上例）](https://wiki.strugarden.pluslake.net/%E3%82%A2%E3%82%A4%E3%83%86%E3%83%A0/%E9%98%B2%E5%85%B7/%E8%83%B4(%E4%B8%8A)/)



## Battle V7 visual / fighter phase 1

- Opening mountain battlefield keeps the existing **8 × 3** logical grid. The redesign changes presentation, not tactical dimensions.
- Projection is more top-down and the terrain island has a visibly thicker base; Level 0 remains flat and only authored height-map cells rise.
- Player opens on the second longitudinal row from the bottom, middle lane (`1,1`). High tree cover is on the left flank, low scrub is on the right flank, keeping the centre lane readable.
- Fighter uses a **battle-only four-diagonal atlas** (`↖ / ↗ / ↘ / ↙`) for Idle, Walk, Attack and Hurt. Exploration locomotion remains unchanged.
- Movement planning never rotates the actor sprite. Planned facing stays preview data; the actor turns only when confirmed movement resolution plays.
- Facing-picker geometry comes from the battlefield projection basis instead of hard-coded 45° HUD diagonals.
- Skill names are centred in their command rows.


## V8 整合補充
- 保持開場戰場為 8×3。
- 開場山地戰場維持較厚 2.5D 棋盤視覺。
- 玩家 battle sprite 改為跟原 fighter 造型的 4 斜向版本（待機／行路／攻擊／受擊）。
- 已將新 fighter battle sprite 接回 battle renderer。


## Battle V9 implementation notes
- Opening mountain battlefield stays 8×3. The board uses a slightly larger presentation scale, thicker terrain-island side depth, a lower responsive viewport anchor, and no permanent per-cell grid lines outside move/skill planning.
- Fighter battle movement displays remaining movement power numerically (starts at 6.0 in the current fighter tuning). Walking costs 1.0, a quarter-turn costs 0.5, and a 180° turn costs 1.0. One point is reserved from route extension for final facing; unused reserve expires when movement is committed.
- Battle AP uses a yellow progress bar, starts at 10, gains 10 each round, and caps at 200.
- The sequential turn-order panel is removed because Everrealm uses simultaneous planning/resolution. Timers remain unlimited for the single-player build.
- The player-facing hero name always comes from the canonical saved `player.name`; battle, HUD, status and equipment UI must not hard-code a second display name. New account registration asks for the character name up front; Firebase Auth `displayName` keeps the fresh-account identity available before the first journey, and the first canonical cloud save writes the same value to `players/{uid}.player.name`.
- Mountain high-tree and low-scrub obstacle art now use clean transparent-alpha battle assets with no white matte/halo; the tree is visually tall and the scrub visibly low.
- Battle BGM loops from assets/audio/everrealm_battle_bgm_v2_seamless_loop.mp3 and temporarily replaces map BGM during battle.


### V10 visual / interaction polish
- Battle fighter idle/walk/attack/hurt use one physical render scale; attack no longer enlarges the actor.
- The 8×3 projected board uses slightly larger tile faces while preserving V9 actor sizes via a separate actorCell reference.
- Base tile outlines are not rendered; only movement/skill/selection overlays reveal the logical grid.
- Mountain high-tree and low-scrub battle obstacles use the latest transparent user-supplied cutouts.
- The world skill panel is named 「戰技面板」. Its authored interaction region stays invisible; proximity/hover adds only a subtle warm-gold breathing glow. Desktop exploration uses feather/default and hand/interactive custom cursors.

## UI V11 interaction rules

- The six left exploration launcher windows are overlays, not pauses: Status, Inventory, read-only Deck, Skill Tree, Missions and System may stay open while the hero moves.
- World-service interaction windows and modal UI are movement locks. Guild service, shops, city-gate editable Deck configuration, NPC dialogue and confirmation/detail modals stop exploration movement until dismissed.
- Bottom System/Battle history is click-through HUD text with a left-side invisible scroll gesture strip and no visible scrollbar. NPC dialogue has higher layer priority than this HUD.
