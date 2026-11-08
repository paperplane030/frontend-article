import * as OpenCC from 'opencc-js';
import { config } from './config.js';
import { buildMessages, sendToDiscord } from './discord.js';
import { loadHistory, saveHistory } from './history.js';
import { selectArticles } from './select.js';
import { devto } from './sources/devto.js';
import { juejinHotRank, juejinNew } from './sources/juejin.js';
import { jsWeekly, officialBlogs } from './sources/rss.js';
import type { SourceResult } from './types.js';

const dryRun = process.argv.includes('--dry-run');

// 簡體轉台灣正體，包含常用詞彙轉換（例如 软件 → 軟體）
const toTraditional = OpenCC.Converter({ from: 'cn', to: 'twp' });

/** 台灣時間的今天日期 YYYY-MM-DD */
const today = new Intl.DateTimeFormat('en-CA', { timeZone: config.timeZone }).format(new Date());

async function main() {
  const results: SourceResult[] = (
    await Promise.all([juejinHotRank(), juejinNew(), devto(), jsWeekly(), officialBlogs()])
  ).flat();

  for (const r of results) {
    console.log(`${r.error ? '✗' : '✓'} ${r.name}: ${r.articles.length} 篇${r.error ? `（${r.error}）` : ''}`);
  }

  const history = await loadHistory();
  const articles = selectArticles(
    results.flatMap((r) => r.articles),
    history,
  ).map((a) =>
    a.lang === 'zh'
      ? { ...a, title: toTraditional(a.title), author: a.author && toTraditional(a.author) }
      : a,
  );

  const messages = buildMessages(articles, today, results);

  if (dryRun) {
    console.log(`\n—— 預覽（不會送出、不會記錄）——\n`);
    for (const m of messages) {
      if (m.content) console.log(m.content);
      for (const e of m.embeds) console.log(`\n## ${e.title}\n${e.description}${e.footer ? `\n${e.footer.text}` : ''}`);
    }
    return;
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('缺少環境變數 DISCORD_WEBHOOK_URL');

  await sendToDiscord(webhookUrl, messages);
  for (const a of articles) history[a.url] = today;
  await saveHistory(history, today);
  console.log(`\n已發送 ${articles.length} 篇到 Discord（${today}）`);

  // 所有來源都失敗時讓 workflow 顯示紅燈，方便發現問題
  if (results.every((r) => r.error)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
