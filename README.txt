Everrealm fix package — base commit 66dbb47
===============================================

修正三樣：
1) 主城 refresh 後固定返 Guild 前
   原因係 rpg-core.js 仲將座標 clamp 喺舊 2760×1800 地圖範圍。
   而家會保留新大地圖真正座標，再由 active map navigation 驗證。

2) 戰鬥怪物名牌（尤其山野小雞）太低
   改為由所有 locomotion frames 計一個固定 sprite top anchor。
   唔係跟當前 frame，所以行路/轉向個名唔會上下震，亦唔使逐隻怪寫 CSS offset。

3) 音樂 / 音效
   兩行各自有 slider + 喇叭：
   - 音樂喇叭只 mute BGM
   - 音效喇叭只 mute footsteps / combat / UI SFX
   兩邊完全分開。

使用方法
--------
將 ZIP 入面 4 個檔放入：
C:\Users\lauka\Projects\Everrealm

然後 double-click：
APPLY_FIX.bat

或者 CMD：
python apply_everrealm_fix.py .

腳本會先確認 HEAD 係：
66dbb471df8901a942f0ddc0252cc431623daffe

修改前會自動備份去：
.everrealm-fix-backup-66dbb47\

之後會跑 focused Node tests。

完成後建議：
git diff
npm test
git add -A
git commit -m "Fix save position, monster labels and audio controls"
git push

GitHub connector 備註
---------------------
我已經用你連接咗嘅 GitHub 讀取並核對 66dbb47。
但 connector 嘗試開新 branch 時 GitHub 回 403：
"Resource not accessible by integration"
所以我冇冒險直接寫 main，改用呢個可重現 patch package。
