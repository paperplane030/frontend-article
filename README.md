# 前端日報 frontend-article

每天台灣時間早上 8 點左右，自動整理前端熱門文章清單（最多 20 篇、以中文為主），發到 Discord。

## 內容
| 區塊 | 來源 | 規則 |
|---|---|---|
| 🔥 熱榜 | 掘金・前端熱榜 | 依熱度排序，最多 10 篇 |
| 🆕 今日新文 | 掘金・前端最近 24 小時 | 依按讚、收藏、留言、瀏覽排序，補滿中文 14 篇 |
| 📢 官方消息 | Vue / Vite 官方 Blog、JavaScript Weekly | 有新文章或新一期時優先放入 |
| 💡 社群熱門 | dev.to 前端相關標籤 | 近 3 天、5 個 reactions 以上，補滿英文 6 篇 |

- 簡體中文會自動轉成台灣正體（含用語，例如「软件」→「軟體」）。
- 發過的文章會記在 `data/history.json`，30 天內不會重複出現。
- 某一邊文章不夠時，由另一邊補滿 20 篇。
- 某個來源抓取失敗時，其他來源照常發送，失敗的來源會列在訊息最下方。

篇數、比例、標籤等設定都在 [`src/config.ts`](src/config.ts)。

## 設定（只需要做一次）
1. 到 repo 的 **Settings → Secrets and variables → Actions → New repository secret**，新增：
   - Name：`DISCORD_WEBHOOK_URL`
   - Secret：Discord webhook 網址
2. 到 **Actions** 分頁，選「每日前端文章」→ **Run workflow**，手動跑一次確認 Discord 有收到。

之後每天會自動執行。

> GitHub 的排程常延遲 5～15 分鐘，所以排在 07:50，實際送達約 8 點。
> repo 每天都會有 bot 推送的紀錄，所以不會因為「60 天沒活動」被 GitHub 自動停用排程。

## 本機執行
```bash
npm install
npm run preview   # 只在終端機預覽，不發送也不記錄
DISCORD_WEBHOOK_URL=... npm start   # 實際發送
```
