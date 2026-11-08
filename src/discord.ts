import type { Article, Section, SourceResult } from './types.js';

interface Embed {
  title: string;
  description: string;
  color: number;
  footer?: { text: string };
}

export interface DiscordMessage {
  content?: string;
  embeds: Embed[];
  allowed_mentions: { parse: [] };
}

const SECTION_TITLES: Record<Section, string> = {
  hot: '🔥 熱榜',
  new: '🆕 今日新文',
  official: '📢 官方消息',
  community: '💡 社群熱門',
};

/** 避免標題裡的符號打壞 Discord 的 markdown 連結 */
function escapeMarkdown(text: string): string {
  return text.replace(/([\\[\]*_~`|>])/g, '\\$1').replace(/\s+/g, ' ');
}

function renderList(articles: Article[], startIndex: number): string {
  const lines: string[] = [];
  let section: Section | undefined;
  articles.forEach((a, i) => {
    if (a.section !== section) {
      section = a.section;
      lines.push(`${lines.length ? '\n' : ''}**${SECTION_TITLES[section]}**`);
    }
    const meta = [a.source, a.author, a.stats].filter(Boolean).join(' · ');
    lines.push(`**${startIndex + i}.** [${escapeMarkdown(a.title)}](${a.url})\n-# ${escapeMarkdown(meta)}`);
  });
  return lines.join('\n');
}

/** Discord embed 的 description 上限 4096 字，超過就切成多段 */
function splitEmbeds(base: Omit<Embed, 'description'>, articles: Article[], startIndex: number): Embed[] {
  const embeds: Embed[] = [];
  let chunk: Article[] = [];
  let index = startIndex;
  for (const a of articles) {
    if (renderList([...chunk, a], index).length > 3900 && chunk.length) {
      embeds.push({ ...base, description: renderList(chunk, index) });
      index += chunk.length;
      chunk = [];
    }
    chunk.push(a);
  }
  if (chunk.length) embeds.push({ ...base, description: renderList(chunk, index) });
  return embeds.map((e, i) => (i === 0 ? e : { ...e, title: `${e.title}（續）` }));
}

export function buildMessages(articles: Article[], today: string, results: SourceResult[]): DiscordMessage[] {
  const zh = articles.filter((a) => a.lang === 'zh');
  const en = articles.filter((a) => a.lang === 'en');
  const failed = results.filter((r) => r.error).map((r) => r.name);

  const embeds: Embed[] = [
    ...splitEmbeds({ title: `🇹🇼 中文文章（${zh.length} 篇）`, color: 0x1e80ff }, zh, 1),
    ...splitEmbeds({ title: `🌐 英文文章（${en.length} 篇）`, color: 0x42b883 }, en, zh.length + 1),
  ];
  if (embeds.length && failed.length) {
    embeds[embeds.length - 1].footer = { text: `⚠️ 今天抓取失敗的來源：${failed.join('、')}` };
  }

  // 每則訊息的 embed 文字總和上限 6000 字，所以每則只放一個 embed
  const mentions = { parse: [] as [] };
  if (!embeds.length) {
    return [{ content: `📰 **前端日報 ${today}**\n今天沒有新文章。${failed.length ? `（抓取失敗：${failed.join('、')}）` : ''}`, embeds: [], allowed_mentions: mentions }];
  }
  return embeds.map((embed, i) => ({
    ...(i === 0 ? { content: `📰 **前端日報 ${today}**（共 ${articles.length} 篇）` } : {}),
    embeds: [embed],
    allowed_mentions: mentions,
  }));
}

export async function sendToDiscord(webhookUrl: string, messages: DiscordMessage[]): Promise<void> {
  for (const message of messages) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${webhookUrl}?wait=true`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) break;
      // 被限流就照 Discord 給的秒數等一下再送
      if (res.status === 429 && attempt < 3) {
        const body = (await res.json().catch(() => ({}))) as { retry_after?: number };
        await new Promise((r) => setTimeout(r, Math.ceil((body.retry_after ?? 2) * 1000)));
        continue;
      }
      throw new Error(`Discord webhook 失敗：HTTP ${res.status} ${await res.text()}`);
    }
  }
}
