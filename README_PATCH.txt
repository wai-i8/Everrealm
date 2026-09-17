Everrealm Legacy Cleanup Patch

用途：清走舊燈／霧／dungeon／Warrior 系統，同時保留舊 Firestore save ID 的一次性 migration。

套用：
1. 將呢個 patch 內所有檔案解壓到 Everrealm project root，選擇覆蓋同名檔案。
2. 在 project root 執行：
   powershell -ExecutionPolicy Bypass -File .\APPLY_DELETIONS.ps1
3. 驗證：
   node --test
4. functions/ 有修改；請按你現有流程重新 deploy Firebase Functions，web/client 檔案亦要重新發布。

今次 patch：
- modified: 104
- new: 2
- delete: 6

重要：唔需要重建 Firebase project、Firestore 或 Realtime Database。現有舊 mapId=dungeon / classId=warrior 只作 migration input，下一次保存會寫回新 ID；舊 checkpoint/dungeon progression fields 會被清走。
