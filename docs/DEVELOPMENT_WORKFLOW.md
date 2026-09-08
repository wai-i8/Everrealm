# Everrealm 開發 Git／主工作樹流程

本文件是 Everrealm 的 canonical Git、queue、提交及隔離流程。正常單線工作直接使用乾淨的 `main`；worktree 只係明確需要隔離時才使用。

## 1. 預設：clean-main workflow

除非用戶明確要求 worktree／feature branch／並行隔離，正常 task 一律：

1. 在 `C:\Users\lauka\Projects\Everrealm` 執行 Git preflight；
2. 確認 branch 係 `main` 而且 `git status --short` 冇輸出；
3. 直接在 `main` 修改；
4. 完成相關 automated tests、runtime smoke 同視覺 QA；
5. 檢查 `git diff`、`git diff --check`，再 commit 到 `main`；
6. 再次執行 `git status --short`，必須恢復乾淨；
7. 除非用戶明確要求，唔 push。

每個正常 task 都必須喺同一個 task 內完成驗證及提交；「直接改 main」唔代表可以跳過 QA。

## 2. Queue 係順序，不係並行

同一 thread／queue 內嘅 task 依次執行。Task B 只可以喺 Task A 完成、commit 並恢復 clean `main` 後開始，並以當時最新嘅已提交 `main` 作為 source。唔可以因為多個 prompt 已排隊、backlog 存在或其他 task 出現，就推斷需要另建 worktree。

如果前一個 task 未完成、`main` 未 clean，後一個 task 必須停下並回報，唔可以吸收未知修改。

## 3. 修改前 Git preflight

任何會新增、修改、移動、刪除或格式化專案檔案嘅 task，第一次編輯前必須喺 project root 執行並讀完：

```powershell
git status --short
git branch --show-current
git worktree list
```

只做研究、閱讀、diff review 或回答問題，唔需要 commit，亦唔需要建立 worktree。

## 4. Dirty-main stop rule

如果正常 task 開始時 `main` 有任何未提交修改：

- 停止修改並列出 dirty files；
- 唔可以 stash、reset、clean、強制 checkout／restore、覆蓋檔案，或者替用戶 commit 未知內容；
- 等用戶處理，或者由用戶明確指定下一步。

唔可以只因修改「睇落似乎相關」就接管 dirty work。

## 5. Worktree／feature branch opt-in

只有以下情況先建立 worktree：

- 用戶明確要求 worktree 或 feature branch；
- 用戶明確要求真正並行而且互相隔離嘅工作；
- 用戶已批准 task 必須使用 branch isolation。

建立前仍要做 preflight，並檢查 path／branch 未被其他工作使用。預設命名可用：

```text
worktree: C:\Users\lauka\Projects\Everrealm-worktrees\<slug>
branch:   task/<slug>
```

隔離 task 只可以編輯自己嘅 worktree，完成自己嘅 tests／runtime／visual QA 後 commit，並清楚回報 branch、worktree、commit 及是否等待整合。不可接管其他 task 的 worktree。

## 6. 提交及破壞性操作

- 正常完成嘅 task 必須 commit；除非係明確 read-only task，唔應把完成工作留喺 dirty tree。
- commit 前後都要檢查 `git diff --check`、`git status --short` 同 intended files。
- 絕不使用 `git reset --hard`、`git clean -fd`、強制 checkout／restore 或強制刪 branch，除非用戶明確要求該 exact 破壞性操作。
- 唔 push，除非用戶明確要求。

## 7. 驗證責任

驗證深度按風險決定：

- code／data：相關 automated tests；
- UI、sprite、map、battle、animation：實際遊戲 runtime smoke 及 screenshot visual inspection；
- persistence／schema：save、load、legacy migration 驗證；
- cross-system 或 shared/core 改動：需要時擴大 regression。

本環境若 restricted Node/npm 或 CDP 遇到已知 Windows sandbox error，按 `AGENTS.md` 指定嘅 elevated local fallback 執行一次；唔可以用 fallback 掩蓋真正嘅 test／runtime failure。

## 8. 明確隔離工作嘅整合

只有 task 明確採用 worktree／branch，先需要由 branch 整合到 `main`。整合前重新確認 `main` clean、branch 已提交，並確保同一時間只有一個操作使用 main worktree。每條 branch merge 後做 `git diff --check` 同針對性 smoke；全部 selected branches 完成後做一次 `npm test`、combined game-load smoke、`runtimeErrors: 0` 及 clean-main 檢查。

Git 自動 merge 唔代表語意一定正確，必須 review diff。真正 conflict 唔可以靜默揀 `ours`／`theirs`、覆蓋 binary 或丟失任何 branch。若兩邊設計意圖有歧義，保留兩條 branch 並停下請用戶決定。

## 9. 完成回報

正常 clean-main task 至少回報：

- branch（通常係 `main`）及 commit hash／message；
- preflight 同 final `git status --short`；
- tests、runtime／visual QA 結果；
- 是否建立 worktree（預設係「否」）；
- 是否 push（未獲要求時係「否」）；
- 如有 conflict 或已知限制，清楚列出。
