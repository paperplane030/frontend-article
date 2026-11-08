import { config } from '../config.js';
import { fetchJson } from '../http.js';
import type { Article, SourceResult } from '../types.js';

interface DevtoArticle {
  id: number;
  title: string;
  url: string;
  published_at: string;
  positive_reactions_count: number;
  comments_count: number;
  reading_time_minutes: number;
  user: { name: string };
}

/** dev.to 各前端標籤近兩天的熱門文章 */
export async function devto(): Promise<SourceResult> {
  const name = 'dev.to';
  const { tags, topDays, minReactions } = config.devto;
  const byId = new Map<number, DevtoArticle>();
  const errors: string[] = [];

  for (const tag of tags) {
    try {
      const list = await fetchJson<DevtoArticle[]>(
        `https://dev.to/api/articles?tag=${tag}&top=${topDays}&per_page=30`,
      );
      for (const a of list) byId.set(a.id, a);
    } catch (err) {
      errors.push(`${tag}: ${String(err)}`);
    }
  }

  const articles: Article[] = [...byId.values()]
    .filter((a) => a.positive_reactions_count >= minReactions)
    // dev.to 沒有語言欄位：標題含葡、西、法文等常見重音字母的視為非英文，排除
    .filter((a) => !/[ãõçáéíóúâêôàèìòùñ¿¡]/i.test(a.title))
    .map((a) => ({
      url: a.url,
      title: a.title,
      lang: 'en',
      section: 'community',
      source: 'dev.to',
      author: a.user.name,
      publishedAt: new Date(a.published_at),
      hot: a.positive_reactions_count + a.comments_count,
      stats: `❤️ ${a.positive_reactions_count} · 💬 ${a.comments_count} · ⏱ ${a.reading_time_minutes} min`,
    }));

  // 全部標籤都失敗才算錯誤
  const error = errors.length === tags.length ? errors.join('; ') : undefined;
  return { name, articles, error };
}
