import { XMLParser } from 'fast-xml-parser';
import { config } from '../config.js';
import { fetchText } from '../http.js';
import type { Article, SourceResult } from '../types.js';

interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  author?: string;
  'dc:creator'?: string;
}

// 有些 feed（例如 JavaScript Weekly）內文的 HTML 實體非常多，會超過解析器的安全上限，
// 所以關掉自動解析，只對需要的標題和連結自己解碼。
const parser = new XMLParser({ ignoreAttributes: true, processEntities: false });

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return NAMED[code.toLowerCase()] ?? match;
  });
}

async function readFeed(url: string): Promise<RssItem[]> {
  const xml = parser.parse(await fetchText(url));
  const items = xml?.rss?.channel?.item ?? [];
  return (Array.isArray(items) ? items : [items]).map((i: RssItem) => ({
    ...i,
    title: decodeEntities(String(i.title ?? '')).trim(),
    link: decodeEntities(String(i.link ?? '')).trim(),
  }));
}

const daysAgo = (d: number) => Date.now() - d * 86400_000;

/** Vue / Vite 官方 blog 的新文章 */
export async function officialBlogs(): Promise<SourceResult[]> {
  return Promise.all(
    config.officialFeeds.map(async ({ name, url }): Promise<SourceResult> => {
      try {
        const since = daysAgo(config.officialWithinDays);
        const articles: Article[] = (await readFeed(url))
          .map((i) => ({ ...i, date: i.pubDate ? new Date(i.pubDate) : undefined }))
          .filter((i) => i.title && i.link && i.date && i.date.getTime() >= since)
          .map((i) => ({
            url: i.link,
            title: i.title,
            lang: 'en',
            section: 'official',
            source: name,
            publishedAt: i.date,
            // 官方消息永遠排在英文區最前面
            hot: Number.MAX_SAFE_INTEGER,
          }));
        return { name, articles };
      } catch (err) {
        return { name, articles: [], error: String(err) };
      }
    }),
  );
}

/** JavaScript Weekly 最新一期 */
export async function jsWeekly(): Promise<SourceResult> {
  const name = 'JavaScript Weekly';
  try {
    const [latest] = await readFeed(config.jsWeekly.url);
    if (!latest) return { name, articles: [] };
    const publishedAt = latest.pubDate ? new Date(latest.pubDate) : undefined;
    if (publishedAt && publishedAt.getTime() < daysAgo(config.jsWeekly.withinDays)) {
      return { name, articles: [] };
    }
    const issue = latest.link.match(/issues\/(\d+)/)?.[1];
    return {
      name,
      articles: [
        {
          url: latest.link,
          title: `${issue ? `#${issue}：` : ''}${latest.title}`,
          lang: 'en',
          section: 'official',
          source: 'JavaScript Weekly',
          publishedAt,
          hot: Number.MAX_SAFE_INTEGER - 1,
        },
      ],
    };
  } catch (err) {
    return { name, articles: [], error: String(err) };
  }
}
