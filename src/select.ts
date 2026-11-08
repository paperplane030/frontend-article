import { config } from './config.js';
import type { History } from './history.js';
import type { Article, Lang } from './types.js';

const byHot = (a: Article, b: Article) => b.hot - a.hot;

/**
 * 從所有候選文章挑出今天要發的清單：
 * - 去掉以前發過的、同一天重複的
 * - 中文：熱榜優先（最多 maxFromHotRank 篇），剩下的用 24 小時內互動最多的新文章補
 * - 英文：官方消息優先，其餘用 dev.to 熱門文章補
 * - 某一邊不夠時，由另一邊補滿 maxTotal
 */
export function selectArticles(candidates: Article[], history: History): Article[] {
  const seen = new Set(Object.keys(history));
  const unique: Article[] = [];
  for (const a of candidates) {
    if (seen.has(a.url)) continue;
    seen.add(a.url);
    unique.push(a);
  }

  const zhHot = unique.filter((a) => a.lang === 'zh' && a.section === 'hot').sort(byHot);
  const zhNew = unique.filter((a) => a.lang === 'zh' && a.section === 'new').sort(byHot);
  const en = unique.filter((a) => a.lang === 'en').sort(byHot);

  const zhOrdered = [
    ...zhHot.slice(0, config.juejin.maxFromHotRank),
    ...zhNew,
    ...zhHot.slice(config.juejin.maxFromHotRank),
  ];

  const pools: Record<Lang, Article[]> = { zh: zhOrdered, en };
  const picked: Record<Lang, Article[]> = {
    zh: pools.zh.slice(0, config.quota.zh),
    en: pools.en.slice(0, config.quota.en),
  };

  // 補位：中文優先補，維持中文多數
  for (const lang of ['zh', 'en'] as const) {
    const room = config.maxTotal - picked.zh.length - picked.en.length;
    if (room <= 0) break;
    picked[lang].push(...pools[lang].slice(picked[lang].length, picked[lang].length + room));
  }

  return [...picked.zh, ...picked.en];
}
