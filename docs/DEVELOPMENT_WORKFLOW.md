# Everrealm 開發 Git／Worktree 安全流程

本文件是 Everrealm 所有平行 Codex task 的共用操作流程。它只規範 Git、worktree、提交及整合安全，不改變任何遊戲玩法或 runtime 行為。

## 不可違反的安全不變量

- 主專案工作樹 `C:\Users\lauka\Projects\Everrealm` 固定作為 `main` 的穩定整合工作樹。
- 預設 worktree parent 是 `C:\Users\lauka\Projects\Everrealm-worktrees\`。
- 一般功能、較大修改及任何平行開發都使用獨立 worktree + branch；不同 thread 絕不共用同一個實體工作目錄。
- `main` 主要用於有意識的整合；只有符合本文件「direct-main 小改」全部條件的單線低風險小修改，才可直接編輯並立即 commit。
- 已存在的未提交工作屬於使用者或其他 task。不可把它當成可丟棄的暫存物，也不可用任何命令覆蓋它。
- 發生真正衝突時，兩條已提交的 task branch 都必須保留；不可用 `ours`／`theirs`、強制 checkout 或其他手段靜默丟掉一方。

## 1. 先判斷工作類型

純讀取、研究、檢視 diff 或回答問題，不需要新建 worktree。

會新增、修改、移動、刪除或格式化專案檔案，就屬於修改 task。修改 task **預設** 使用獨立 feature branch + worktree；不能只因「看起來沒有其他 thread」就自行跳過隔離。

### Direct-main 小改例外

只有在以下條件 **全部成立** 時，才可有意識地選擇直接在 `main` 完成一個小修改：

- 開始前 `git status --short` 為空，`main` 完全乾淨；
- 目前 branch 明確是 `main`；
- 沒有平行 feature 工作正在依賴同一個 `main` 狀態，亦沒有另一個操作同時使用主工作樹；
- task 明確是單線進行；
- 變更很小、低風險且範圍清楚，例如純文件小改或同等級的局部調整；
- 修改完成後會立即檢查 diff、執行適當驗證並直接 commit，不會把 `main` 留在 dirty 狀態。

Direct-main 必須是有意識的例外，而不是 agent 自己因為猜測「應該沒有其他工作」而採用。只要任一條件不成立，改用正常 dedicated worktree + branch 流程。

## 2. 修改 task 的 Git preflight

在任何編輯、產生檔案或會改變工作樹的工具之前，於目前專案根目錄執行：

```powershell
git status --short
git branch --show-current
git worktree list
```

三項輸出都要讀完：

- `git status --short` 用來確認目前是否有既有未提交修改；不可覆蓋它們。
- `git branch --show-current` 用來確認目前 branch；一般 feature 修改不應停留在 `main` 編輯。若明確採用 direct-main 小改，則必須確認 branch 正是 `main` 且工作樹乾淨。
- `git worktree list` 用來查看已有 worktree、路徑及 branch，避免重用其他 task 的工作目錄，亦協助確認 direct-main 是否真的適合。

如果主工作樹不乾淨，direct-main 小改必須停止。一般 feature task 仍可從當前已提交的 `main` 建立新的隔離 worktree，但要明確說明：主工作樹的未提交修改不會帶入新 task。不可替使用者 stash、reset、clean 或刪除這些修改。

## 3. 建立或識別一般 task worktree

### 命名

使用簡短、由 task 意圖導出的 slug：

```text
worktree: C:\Users\lauka\Projects\Everrealm-worktrees\<slug>
branch:   task/<slug>
```

例如：

```text
C:\Users\lauka\Projects\Everrealm-worktrees\main-town-v4
task/main-town-v4
```

先以 `git worktree list`、`git branch --list` 及檔案系統檢查 slug 是否已被使用。若 branch 或資料夾已存在而屬於另一個 active／未完成 task，不可接管；改用安全的數字 suffix，例如 `main-town-v4-2`。不要建立 nested Git repository。

### 建立新 worktree

確認 slug 未被使用後，可從 `main` 的已提交狀態建立：

```powershell
$slug = "main-town-v4"
$worktreeRoot = "C:\Users\lauka\Projects\Everrealm-worktrees"
$worktreePath = Join-Path $worktreeRoot $slug
$branchName = "task/$slug"

git worktree add -b $branchName $worktreePath main
Set-Location $worktreePath
```

如果同一個 task 已有專用 worktree，先確認它的 branch、路徑及 `git status --short`，然後只在該 worktree 繼續；不要因為它看似閒置就重用或改名。建立後再確認目前位置及 branch，之後所有編輯、測試、runtime／visual QA、diff review 及 commit 都必須在這個 worktree 內進行。

## 4. Task lifecycle

標準順序如下：

1. 完成 Git preflight。
2. 建立或識別唯一的 task worktree 及 `task/<slug>` branch。
3. 只在該 worktree 編輯。
4. 執行相關 automated tests；如涉及 UI、sprite、map、battlefield、animation 或其他視覺行為，按 `AGENTS.md` 要求執行 runtime／visual verification。
5. 檢查 `git diff --check`、`git diff` 及 `git status --short`，確認沒有無意的檔案或生成物。
6. 在 branch 上提交完成的 task：

   ```powershell
   git add <intended-files>
   git commit -m "<concise task summary>"
   ```

   Git identity／設定允許時，不要把完成的修改留成未提交狀態。

7. 回報 branch name、worktree path、commit hash，以及 test／runtime verification 結果。

提交前後都不要使用 `git reset --hard`、`git clean -fd`、強制 checkout／restore 或強制刪 branch 來「整理」工作樹。除非用戶明確要求該項 exact destructive action，任何既有工作都必須保留。

### Direct-main 小改 lifecycle

當第 1 節全部 direct-main 條件都成立，而且 task 明確選擇此模式時：

1. 在 `C:\Users\lauka\Projects\Everrealm` 執行 preflight，確認 `main` 且工作樹乾淨。
2. 只修改這個小 task 明確需要的檔案，不順手加入 unrelated cleanup。
3. 檢查 `git diff`、`git diff --check` 及 `git status --short`。
4. 執行與變更風險相稱的驗證；純文件修改通常只需 diff／格式／文件一致性檢查，不需 unrelated gameplay runtime smoke。
5. 直接在 `main` `git add` 並 commit。
6. 再次執行 `git status --short`，必須恢復乾淨狀態。

此流程不建立 feature branch、worktree 或後續 merge。若修改途中 scope 擴大、出現平行工作或發現 main 狀態不再符合條件，停止 direct-main 流程並重新選擇安全的隔離方式。

## 5. 驗證責任與整合層級

本流程的目的不是「少測試」，而是把深度驗證放在最適合的位置，避免平行開發最後被重複的全量回歸抵消時間收益。

### A. Feature verification

每條修改 feature branch 在宣稱 ready for integration 前，負責深度驗證自己的功能。按實際影響包括：

- relevant automated tests；
- feature-specific runtime smoke；
- UI／sprite／map／battlefield／animation 等視覺變更的實際 runtime／visual verification；
- 影響 persistence 時的 save/load 驗證；
- 影響 battle 時的相關 battle smoke；
- 文件與 runtime source-of-truth 一致性；
- 回報已知限制；
- 最後保持 worktree clean 且完成 commit。

Feature thread 擁有自己功能最昂貴、最詳細的驗證；不能只因「code 寫完」就視為 ready。

### B. Normal integration verification

正常整合一批已完成 branch 時，逐條 merge，但每條只做與該 branch 有關的快速整合檢查：

```text
Branch A
→ merge
→ git diff --check
→ targeted smoke for A

Branch B
→ merge
→ git diff --check
→ targeted smoke for B

Branch C
→ merge
→ git diff --check
→ targeted smoke for C

全部 selected branches 完成後
→ npm test 一次
→ basic combined game-load/runtime smoke
→ runtimeErrors: 0
→ final main clean
```

如果 incoming feature branch 已完成可靠的 feature verification，**不要**在每條 individual merge 後重跑整套 unrelated full regression。例子：

- Monster branch → monster 相關 targeted smoke；
- Guild branch → Guild commission loop targeted smoke；
- Main Town branch → Main Town／transition targeted smoke；
- UI-only branch → affected UI smoke；
- documentation-only branch → 不需 unrelated gameplay smoke。

整批 merge 完後仍必須跑一次完整 `npm test`，再做基本 combined runtime smoke。

### C. Escalated integration verification

只有出現較高整合風險時，才升級到 broader cross-system／full runtime verification，例如：

- 發生 merge conflict 或需要語意 conflict resolution；
- shared/core infrastructure 改動；
- SaveSystem／schema／migration 改動；
- battle foundation 改動；
- map engine／transition foundation 改動；
- 多條 branch 修改同一段 cross-system runtime logic；
- integration 本身需要 code fix；
- automated tests 失敗；
- targeted runtime smoke 暴露 regression；
- incoming feature branch 的驗證不完整或不可靠。

此時較廣泛驗證是風險驅動的必要措施，而不是每次正常 merge 的預設成本。

### D. Documentation-only verification

純文件修改通常只需要：

- 檢查 `git diff`；
- `git diff --check`；
- 文件之間的 source-of-truth／routing／措辭一致性。

除非文件會直接驅動 generated/runtime behaviour 或 executable configuration，否則不需要 unrelated gameplay runtime smoke。

## 6. Main 整合流程

本節描述 feature branch → `main` 的整合流程。整合是獨立且有意識的階段；整合時必須確保只有一個操作正在使用 `main` 工作樹。一般 feature task 應先完成 branch commit，再回報 ready；沒有清楚的整合 ownership 時，不要自行與另一個可能同時進行的整合操作競爭。第 1／4 節允許的 direct-main 小改不屬於此 merge 流程。

開始整合前，在主專案工作樹重新執行 Git preflight：

```powershell
Set-Location C:\Users\lauka\Projects\Everrealm
git status --short
git branch --show-current
git worktree list
```

必須確認：

- branch 是 `main`；
- `main` 工作樹乾淨；
- task branch 已提交；
- 整合目標是當下最新的本地 `main`；
- task worktree 尚未被刪除。

如果另一個已完成 task 先整合了，`main` 可能已經比這個 task 的建立基線更新；必須以更新後的 `main` 重新比較及驗證，必要時在 task worktree 先合併最新 `main` 再測試，並遵守同一套 conflict policy。不可忽略較新的整合結果。

若 `main` 突然出現未提交修改、branch 或 worktree 狀態在檢查後改變，立即停止並報告；不可覆蓋或假設那些修改可丟棄。若主樹一直有未提交修改，仍可另建 task worktree，但該 task 必須注明沒有包含那些 uncommitted main changes。

在確認條件後，整合 task branch（例如 `task/main-town-v4`）並檢查結果：

```powershell
git merge --no-ff task/main-town-v4
git diff --check
git diff HEAD^1 HEAD
```

每條 branch merge 後按第 5 節執行 `git diff --check` 與該 branch 的 targeted smoke；正常情況不要在每條 individual merge 後重跑整套 unrelated full regression。當本批所有 selected branches 都完成後，再跑一次完整 `npm test` 及 basic combined game-load/runtime smoke。確認整批成功前，不要刪除 task worktree 或 branch。

## 7. Merge 結果與衝突處理

### A. Git 可以自動 clean merge

接受 Git 的機械式合併後，仍必須：

1. 檢查整合後的 diff、`git status --short` 及 `git diff --check`；
2. 確認兩個 task 的意圖都仍存在，不能因為 Git 沒報錯就假定語意正確；
3. 按第 5 節重跑受影響的 targeted tests／smoke；只有風險條件成立時才升級 broader runtime／visual verification；
4. 通過後才把整合視為成功，並回報 merge commit／目前 `main` commit。

### B. Git 報告真正的 conflict

不要自動選 `ours` 或 `theirs`，不要強制 checkout 任一方，不要覆蓋 binary asset，也不要猜哪個 task 比較重要。先保留兩個已提交 branch，檢查：

- 所有 conflict files；
- branch A 改了什麼、意圖是什麼；
- branch B 改了什麼、意圖是什麼；
- 相關的 source-of-truth 文件及規則。

只有在衝突純粹是機械性的，而且權威 project specification 明確指定唯一的 combined result 時，才可自行解決；必須在回報中說明曾發生 conflict 及採用的解法，然後完整重跑驗證。

只要存在語意歧義、兩個都合理的設計意圖、需要取捨，或 agent 不確定，就必須停止整合並請用戶決定。回報至少包括：

1. 哪些檔案衝突；
2. branch A 的變更；
3. branch B 的變更；
4. 為什麼不能自動組合；
5. 可選的 resolution choices。

若已開始 merge 而尚未安全解決，且主樹在 merge 前是乾淨的，可用 `git merge --abort` 回到整合前狀態；這不是丟棄任何已提交 branch。若 abort 的前提不明確，先停止並請用戶決定，絕不可用 reset／clean 來消除 conflict。兩條 task branch 及各自 worktree 必須保留。

## 8. Binary asset conflicts

PNG、WebP、audio 及其他 binary 檔案不能作有意義的 line merge。如果兩個 task 修改同一個 runtime binary：

- 不可靜默選一個版本；
- 先保留兩個 branch；
- 檢查 project specification 是否完全清楚指出正確的最終 asset；
- 若不完全清楚，停下來請用戶選擇，或要求建立一個有意識的 rebuilt final asset。

Binary conflict 不可當成普通文字 conflict 處理。

## 9. Shared documentation conflicts

`AGENTS.md`、`README.md`、`GAME_DESIGN.md`、`ART_PIPELINE.md` 及 system docs 可能被多個 task 修改。整合時要合併彼此獨立且有效的文件變更，不可整份盲選某一 branch；同時遵守既有 source-of-truth hierarchy。

若兩個 task 寫入互不相容的永久規則，這是語意衝突：保留兩個 branch，停止整合並請用戶決定，不可由 agent 靜默選擇。

## 10. Main cleanliness 與完成後清理

穩定狀態應該是：

- `main` working tree clean；
- active work 只存在於各自的 task worktree／branch；
- 已整合工作已提交；
- generated test output 按 `.gitignore` 規則處理。

只有在整合已確認成功、task worktree `git status --short` 為空、且沒有需要保留的未提交工作後，才可以考慮清理：

```powershell
git worktree remove C:\Users\lauka\Projects\Everrealm-worktrees\<slug>
git branch -d task/<slug>
```

不可使用 `--force` 清理。若清理前發現任何未提交內容，停止並保留 worktree；不要把「清理」當成刪除工作的理由。

## 11. Agent 結束前回報格式

每個完成的修改 task 至少回報：

- branch name；
- worktree path；
- commit hash；
- automated tests；
- runtime／visual verification（如適用）；
- 是否曾發生 merge conflict，以及如何處理；
- 若尚未整合，明確標示等待整合，不宣稱 `main` 已包含該修改。

除第 1／4 節明確定義的 direct-main 小改例外外，本流程不允許任何 task 以「看起來沒有其他 thread」作為共用 `main` 或別人 worktree 的理由。Direct-main 必須先滿足全部條件、明確選擇該模式，並在同一 task 內立即 commit 及恢復 clean `main`。
