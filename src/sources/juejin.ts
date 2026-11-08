import { config } from '../config.js';
import { compact, fetchJson } from '../http.js';
import type { Article, SourceResult } from '../types.js';

const { categoryId, newWithinHours } = config.juejin;
const postUrl = (id: string) => `https://juejin.cn/post/${id}`;

interface RankResponse {
  err_no: number;
  err_msg: string;
  data: Array<{
    content: { content_id: string; title: string };
    content_counter: { view: number; like: number; collect: number; hot_rank: number; comment_count: number };
    author: { name: string };
  }> | null;
}

interface FeedResponse {
  err_no: number;
  err_msg: string;
  cursor: string;
  has_more: boolean;
  data: Array<{
    article_info: {
      article_id: string;
      title: string;
      ctime: string;
      view_count: number;
      digg_count: number;
      collect_count: number;
      comment_count: number;
    };
    author_user_info: { user_name: string };
  }> | null;
}

/** 掘金前端熱榜（熱門優先） */
export async function juejinHotRank(): Promise<SourceResult> {
  const name = '掘金熱榜';
  try {
    const res = await fetchJson<RankResponse>(
      `https://api.juejin.cn/content_api/v1/content/article_rank?category_id=${categoryId}&type=hot`,
    );
    if (res.err_no !== 0) throw new Error(res.err_msg);
    const articles: Article[] = (res.data ?? []).map((item) => {
      const c = item.content_counter;
      return {
        url: postUrl(item.content.content_id),
        title: item.content.title,
        lang: 'zh',
        section: 'hot',
        source: '掘金',
        author: item.author.name,
        hot: c.hot_rank,
        stats: `🔥 ${compact(c.hot_rank)} · 👍 ${c.like} · ⭐ ${c.collect}`,
      };
    });
    return { name, articles };
  } catch (err) {
    return { name, articles: [], error: String(err) };
  }
}

/** 掘金前端最近 N 小時的新文章，用互動數排序（最新為輔） */
export async function juejinNew(): Promise<SourceResult> {
  const name = '掘金新文章';
  const since = Date.now() - newWithinHours * 3600_000;
  const articles: Article[] = [];
  try {
    let cursor = '0';
    // 依時間由新到舊翻頁，最多 10 頁（200 篇），超過時間範圍就停
    for (let page = 0; page < 10; page++) {
      const res = await fetchJson<FeedResponse>(
        'https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id_type: 2, sort_type: 300, cate_id: categoryId, cursor, limit: 20 }),
        },
      );
      if (res.err_no !== 0) throw new Error(res.err_msg);
      const items = res.data ?? [];
      let reachedOld = false;
      for (const item of items) {
        const a = item.article_info;
        const publishedAt = new Date(Number(a.ctime) * 1000);
        if (publishedAt.getTime() < since) {
          reachedOld = true;
          continue;
        }
        // 互動分數：收藏和按讚比瀏覽更能代表品質
        const hot = a.digg_count * 3 + a.collect_count * 4 + a.comment_count * 2 + a.view_count / 50;
        articles.push({
          url: postUrl(a.article_id),
          title: a.title,
          lang: 'zh',
          section: 'new',
          source: '掘金',
          author: item.author_user_info.user_name,
          publishedAt,
          hot,
          stats: `👀 ${compact(a.view_count)} · 👍 ${a.digg_count} · ⭐ ${a.collect_count}`,
        });
      }
      if (reachedOld || !res.has_more) break;
      cursor = res.cursor;
    }
    return { name, articles };
  } catch (err) {
    // 已經抓到的部分還是可以用
    return { name, articles, error: String(err) };
  }
}
