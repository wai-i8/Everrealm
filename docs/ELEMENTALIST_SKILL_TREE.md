# EVERREALM 精靈魔導師職業規格

> 現行 Everrealm 精靈魔導師（runtime id：`elementalist`）技能規格及資料契約。原作資料來源係《幸福 Online／STRUGARDEN》；本文件將原作資料整理成 Everrealm 可執行嘅技能圖、範圍、效果同取得規則。動畫唔屬於本文件範圍。

## 1. 職業定位

精靈魔導師係後排元素魔法專家：以遠距離、大範圍同高 AP 魔法清場，代價係低防禦、低移動力同較容易受詠唱干擾。原作武器限制為杖；Everrealm 目前只先落實職業同技能資料，杖類裝備及職業選擇 UI 仍保持未開放。

原作嘅上位職業係召喚天導師，副職方向係守護魔導師同黑印魔導師。原作技能按四種路線處理障礙：

| delivery | 規則 |
|---|---|
| `summon` | 直接指定角色／地面發動，唔受施術者與目標之間一般障礙影響。Everrealm runtime 以 `delivery_mode: null` 表達 pathless。 |
| `linear` | 使用共同 `facingOrthogonalPriority` 路徑；地形及單位可以攔截。 |
| `arc` | 使用共同弧線投射／高低差接口；可以越過合資格嘅低障礙。 |
| `direct` | 近距離魔法；使用共同正交 attack path，唔另外建立一套 melee resolver。 |

### Everrealm 改編邊界

- 所有普通傷害技能以 `sqrt(AP / 3)` 計算總傷害倍率；帶有控制、擊退、狀態等 utility 時再乘 `0.8`。
- 唔引入獨立 `MAG`、Magic Attack、Magic Defense 或炎／冷／雷專屬攻防矩陣；元素保留喺資料及狀態條件，普通傷害仍使用共同 ATK 對 DEF resolver。
- 原作「物理屏障／魔法屏障」先以通用 barrier metadata 保存，runtime 以通用傷害減免表達，唔拆兩套傷害防禦系統。
- 原作動畫、詠唱畫面、投射物美術同獨有粒子效果暫不處理；技能資料只保存 delivery、範圍、效果同 `source_special_notes`。
- 所有技能都係 data-driven；runtime 入口係 `data/skills/elementalist.js`，由 `skill-core.js` 統一建立 immutable catalog。

## 2. 技能樹與前置

`display.layout.grid` 係 authored 顯示位置；連線只由 `requires[]` 產生。相鄰唔代表有前置。PSV 係一條獨立縱向鏈；五條主動魔法支線由初始技能開始，守護／黑印副職則以 `requirements.side_job` 及 `side_job_level` 保存額外條件。

```text
PSV  弱炎 → 弱冷 → 弱雷 → 弱毒 → 弱心 → 火精靈 → 水精靈 → 土精靈 → 風精靈 → 魔力強化

火：實念／火球 → 炎箭 → 爆彈 → 熱能觸手 → 火炎柱 → 火柱陣 → 自燃 → 爆炎彈 → 熔岩
風：風刀 → 疾風干擾 → 大氣淨化 → 真空爆 → 驚異之風 → 異界之風 → 颶風 → 雙重颶風 → 三重颶風
水：水球 → 大水球 → 幻影 → 冰箭 → 水柱陣 → 鑽石塵 → 絕對零度
地：泥手 → 岩箭 → 石槍 → 落石 → 小隕石 → 地震 → 隕石 → 隕石連降
衍生：火刃／水刀／砂風暴／灼熱旋風／雷球／雷箭／雷擊／落雷／葉刃／藤蔓束縛／綠意爆發
副職：回復術 → 回復之地 → 回復光球／物理屏障／魔法屏障；蜘蛛網 → 隱身結界 → 惡夢衝擊／跌倒陷阱 → 假術式
```

初期持有三招：`little_force`、`fireball`、`wind_edge`。原作公開職業介紹亦列出呢三招為精靈魔導師初期技能；Everrealm 將 `aqua_ball`、`mud_hand` 保留為 Rank 1 可取得技能。

## 3. 完整 CMD 技能資料

欄位簡寫：`L` = linear、`A` = arc、`S` = summon/pathless、`D` = direct；`—` 代表純 utility 或不適用。Rank 係技能書 rank，唔係 Everrealm 等級。

### 初始及主動元素技能

| id | 名稱 | 分類 | AP | 速度 | delivery | Rank | Everrealm 效果／邏輯 | 前置 |
|---|---|---:|---:|:---:|:---:|---:|---|---|
| `little_force` | 實念攻擊 | basic | 3 | D | S | 初期 | 指定點範圍傷害；pathless | — |
| `fireball` | 火球 | fire | 6 | D | L | 初期 | 線性傷害；油狀態目標可燃燒 | — |
| `fire_shoot` | 炎箭 | fire | 18 | D | A | ☆☆ | 曲線穿透傷害；油狀態目標可燃燒 | `fireball` |
| `lil_bomb` | 爆彈 | fire | 24 | D | S | ☆☆☆ | 範圍傷害；低機率跌倒 | `fire_shoot` |
| `heat_touch` | 熱能觸手 | fire | 18 | D | D | ☆☆☆☆ | 近距離魔法傷害 | `lil_bomb` |
| `grand_flame` | 火炎柱 | fire | 34 | D | S | ★ | 最多三個地面目標傷害 | `heat_touch` |
| `flame_pole` | 火柱陣 | fire | 42 | D | S | ★☆☆☆ | 指定地面十字範圍傷害 | `grand_flame` |
| `self_burning` | 自燃 | fire | 14 | C | S | ★★ | 自身附近傷害；擊退一格 | `flame_pole` |
| `ex_bomb` | 爆炎彈 | fire | 36 | D | A | ★★☆ | 範圍傷害；擊退兩格；油狀態可燃燒 | `self_burning` |
| `magma` | 熔岩 | fire | 70 | F | S | ★★☆☆☆ | 大範圍全敵傷害 | `ex_bomb` |
| `wind_edge` | 風刀 | wind | 6 | C | D | 初期 | 近身三段傷害；不受投射無效及反擊架式影響 | — |
| `wind_jammer` | 疾風干擾 | wind | 7 | C | — | ☆☆ | 自身投射反擊／無效架式 | `wind_edge` |
| `air_clear` | 大氣淨化 | wind | 12 | D | S | ☆☆☆ | 範圍友方命中提升六回合 | `wind_jammer` |
| `vacuum` | 真空爆 | wind | 32 | D | S | ☆☆☆☆ | 指定範圍傷害 | `air_clear` |
| `amazing_wind` | 驚異之風 | wind | 34 | D | S | ★☆☆☆ | 範圍傷害並按傷害回復施術者 | `vacuum` |
| `demation_wind` | 異界之風 | wind | 34 | F | S | ★☆☆☆☆ | 按目標 AP 造成特殊傷害；普通戰 AP×6、對人 AP×3 | `amazing_wind` |
| `hurricane` | 颶風 | wind | 14 | D | S | ★★☆ | 範圍傷害 | `demation_wind` |
| `double_hurricane` | 雙重颶風 | wind | 30 | D | S | ★★☆☆ | 兩個不同目標各受一次傷害 | `hurricane` |
| `triple_hurricane` | 三重颶風 | wind | 40 | D | S | ★★☆☆☆☆ | 三個不同目標各受一次傷害 | `double_hurricane` |
| `aqua_ball` | 水球 | water | 6 | D | A | ☆ | 曲線傷害；施加濕身兩回合 | — |
| `aqua_service_ball` | 大水球 | water | 18 | D | A | ☆☆ | 範圍傷害；施加濕身兩回合 | `aqua_ball` |
| `mirage` | 幻影 | water | 9 | D | S | ☆☆☆ | 範圍敵人命中下降兩回合 | `aqua_service_ball` |
| `ice_missile` | 冰箭 | water | 28 | D | A | ☆☆☆☆ | 曲線穿透傷害；濕身目標有機會凍結 | `mirage` |
| `water_line` | 水柱陣 | water | 34 | D | S | ★☆☆☆ | 長列範圍傷害；濕身四回合 | `ice_missile` |
| `diamond_dust` | 鑽石塵 | water | 63 | E | S | ★☆☆☆☆ | 延遲兩回合大範圍傷害；濕身目標可凍結 | `water_line` |
| `absolute_zero` | 絕對零度 | water | 75 | F | S | ★★☆☆☆☆ | 超大範圍傷害；濕身目標高機率凍結 | `diamond_dust` |
| `mud_hand` | 泥手 | earth | 8 | D | S | ☆ | 傷害；有機會令目標一回合不能移動 | — |
| `rock_missile` | 岩箭 | earth | 18 | D | A | ☆☆ | 曲線穿透傷害 | `mud_hand` |
| `rock_lance` | 石槍 | earth | 24 | D | S | ☆☆☆ | 召喚石柱傷害；低機率跌倒 | `rock_missile` |
| `fall_stone` | 落石 | earth | 28 | D | S | ☆☆☆☆ | 範圍傷害；低機率跌倒 | `rock_lance` |
| `petit_meteor` | 小隕石 | earth | 36 | E | S | ★★ | 延遲兩回合傷害；低機率跌倒 | `fall_stone` |
| `earthquake` | 地震 | earth | 48 | D | S | ★★☆ | 範圍控制；不造成傷害，令敵人跌倒 | `petit_meteor` |
| `meteor` | 隕石 | earth | 65 | F | S | ★★☆☆☆ | 延遲兩回合範圍傷害；低機率跌倒 | `earthquake` |
| `meteor_rush` | 隕石連降 | earth | 88 | F | S | ★★☆☆☆☆ | 延遲兩回合三段範圍傷害 | `meteor` |

### 衍生技能

| id | 名稱 | AP | 速度 | delivery | Rank | Everrealm 效果／邏輯 | 前置 |
|---|---|---:|:---:|:---:|---:|---|---|
| `flame_edge` | 火刃 | 14 | C | D | ★ | 近身傷害並擊退一格 | `fireball` + `wind_edge` |
| `sandstorm` | 砂風暴 | 48 | E | S | ★☆ | 延遲範圍傷害；低機率黑暗 | `flame_edge` + `vacuum` |
| `santana` | 灼熱旋風 | 75 | F | S | ★★☆☆ | 指定地面範圍傷害 | `sandstorm` + `grand_flame` |
| `water_edge` | 水刀 | 14 | D | D | ★ | 近身三段傷害並濕身一回合 | `aqua_ball` + `wind_edge` |
| `spark_ball` | 雷球 | 18 | D | L | ★★ | 線性傷害；低機率麻痺 | `water_line` |
| `thunder_shoot` | 雷箭 | 55 | E | A | ★★☆ | 曲線穿透傷害；低機率麻痺 | `spark_ball` |
| `thunder_impact` | 雷擊 | 90 | D | S | ★★☆☆☆☆ | 指定範圍強力傷害 | `thunder_shoot` |
| `thunder_bolt` | 落雷 | 45 | D | S | ★★☆☆ | 範圍強力傷害 | `thunder_impact` |
| `leaf_blade` | 葉刃 | 24 | D | S | ★☆ | 範圍植物傷害 | `rock_lance` |
| `bind_ivy` | 藤蔓束縛 | 38 | D | S | ★☆☆ | 範圍傷害；低機率麻痺 | `leaf_blade` |
| `green_green` | 綠意爆發 | 34 | D | S | ★☆☆☆☆ | X 字範圍傷害；擊退兩格；低機率跌倒 | `bind_ivy` |

### 守護魔導師副職

| id | 名稱 | AP | 速度 | Rank | Everrealm 效果／邏輯 | 額外條件 |
|---|---|---:|:---:|---:|---|---|
| `repair` | 回復術 | 8 | D | ☆☆ | 單一友方小量回復 | `side_job=guardian` |
| `repair_square` | 回復之地 | 24 | D | ☆☆☆☆ | 範圍友方小量回復 | `guardian` Lv10，前置 `repair` |
| `repair_ball` | 回復光球 | 16 | D | ★☆ | 曲線遠距友方回復 | `guardian` Lv15，前置 `repair_square` |
| `physical_defeat` | 物理屏障 | 24 | D | ★★☆ | 友方通用傷害減免 barrier | `guardian` Lv20，前置 `repair` |
| `magical_defeat` | 魔法屏障 | 24 | D | ★★☆☆☆ | 友方通用傷害減免 barrier | `guardian` Lv25，前置 `repair` |

### 黑印魔導師副職

| id | 名稱 | AP | 速度 | Rank | Everrealm 效果／邏輯 | 額外條件 |
|---|---|---:|:---:|---:|---|---|
| `sticky` | 蜘蛛網 | 28 | D | ☆ | 範圍三回合不能移動 | `side_job=black` |
| `clarity` | 隱身結界 | 30 | D | ☆☆☆ | 自身隱身四回合 | `black` Lv5，前置 `sticky` |
| `nightmare_impulse` | 惡夢衝擊 | 20 | D | ★ | 只對熟睡目標造成傷害 | `black` Lv10，前置 `clarity` |
| `slip_trap` | 跌倒陷阱 | 15 | D | ★☆☆ | 指定格延遲跌倒陷阱 | `black` Lv15，前置 `sticky` |
| `artificial_spell` | 假術式 | 0 | S | ★★☆☆☆☆ | 純欺敵／假詠唱 utility；不造成傷害 | `black` Lv25，前置 `slip_trap` |

## 4. PSV 技能

PSV AP 為 `0`，放入 DECK 後持續生效。原作嘅元素防禦及魔法攻擊提升，按 Everrealm 簡化規則以 generic DEF／ATK modifier 保存；抗性 blessing 保留為對應狀態免疫／反擊資料。

| id | 名稱 | Rank | 前置 | Everrealm runtime 效果 |
|---|---|---:|---|---|
| `psv_flame_diminish` | 弱炎之法 | ★☆☆☆ | — | generic DEF up（炎熱來源 metadata） |
| `psv_cold_diminish` | 弱冷之法 | ★☆☆☆☆ | `psv_flame_diminish` | generic DEF up（冷氣來源 metadata） |
| `psv_thunder_diminish` | 弱雷之法 | ★★ | `psv_cold_diminish` | generic DEF up（電擊來源 metadata） |
| `psv_poison_diminish` | 弱毒之法 | ★★☆ | `psv_thunder_diminish` | generic DEF up（毒來源 metadata） |
| `psv_mental_diminish` | 弱心之法 | ★★☆☆ | `psv_poison_diminish` | generic DEF up（心來源 metadata） |
| `psv_salamander_blessing` | 火精靈加護 | ★☆☆☆ | `psv_mental_diminish` | 非詠唱狀態直接攻擊反擊 metadata |
| `psv_undine_blessing` | 水精靈加護 | ★☆☆☆☆ | `psv_salamander_blessing` | 麻痺自動解除 |
| `psv_gnome_blessing` | 土精靈加護 | ★★ | `psv_undine_blessing` | 石化自動解除 |
| `psv_sylph_blessing` | 風精靈加護 | ★★☆ | `psv_gnome_blessing` | 移動不能自動解除 |
| `psv_magic_rise` | 魔力強化 | ★★☆☆ | `psv_sylph_blessing` | generic ATK up（魔法來源 metadata） |

## 5. Runtime 契約

完整 machine-readable records 位於 [data/skills/elementalist.js](../data/skills/elementalist.js)。每招保留：

- 原作 `ap`、`speed`、`interrupt`、`durability`、`range`、`effect_area`、技能書 rank 及來源描述；
- Everrealm `action_kind`、`deals_damage`、`target_team`、`delivery_mode`、`path_mode`、`utility_effects`、傷害倍率及 hit resolution；
- `range_cells_relative` 作為真正 target geometry，唔由技能名稱或文字 pattern 推測；
- `requires[]` 作為唯一學習 prerequisite，副職及等級限制放入 `requirements`；
- `display.layout.grid` 只作技能樹排版，唔會改變學習或命中邏輯。

一般傷害技能會由共用 `skill-core.js` 計算倍率，再由共用戰鬥 resolver 處理 ATK、DEF、命中、路徑攔截、高低差及範圍命中。精靈魔導師唔會另起一套魔法戰鬥引擎。

## 6. 來源

- [STRUGARDEN wiki：職業／精霊魔導師](https://wiki.strugarden.pluslake.net/%E8%81%B7%E6%A5%AD/%E7%B2%BE%E9%9C%8A%E9%AD%94%E5%B0%8E%E5%B8%AB/)
- [4Gamer：STRUGARDEN 職業及習得技能介紹](https://www.4gamer.net/specials/strugarden_guide/stru02.html)
- [巴哈姆特：幸福 Online 攻略百科／精靈魔導師](https://wiki2.gamer.com.tw/wiki.php?n=7563%3A%E7%B2%BE%E9%9D%88%E9%AD%94%E5%B0%8E%E5%B8%AB)

原作資料同 Everrealm 改編規則分開保存；若來源之間存在翻譯或版本差異，以本文件嘅 `Everrealm 改編邊界` 同 data 欄位為執行準則。
