import { readFile, writeFile } from 'node:fs/promises';
import { config } from './config.js';

const FILE = new URL('../data/history.json', import.meta.url);

/** 記錄每篇文章第一次發送的日期：{ url: 'YYYY-MM-DD' } */
export type History = Record<string, string>;

export async function loadHistory(): Promise<History> {
  try {
    return JSON.parse(await readFile(FILE, 'utf8')) as History;
  } catch {
    return {};
  }
}

export async function saveHistory(history: History, today: string): Promise<void> {
  // 只保留最近 historyDays 天，避免檔案一直變大
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - config.historyDays);
  const keep = cutoff.toISOString().slice(0, 10);
  const pruned = Object.fromEntries(
    Object.entries(history)
      .filter(([, date]) => date >= keep)
      .sort(([, a], [, b]) => b.localeCompare(a)),
  );
  await writeFile(FILE, JSON.stringify(pruned, null, 2) + '\n');
}
