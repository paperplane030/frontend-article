// 想調整篇數、比例或來源，改這個檔案就好。

export const config = {
  /** 每天最多發幾篇 */
  maxTotal: 20,

  /** 中英文配額（加起來等於 maxTotal）。某一邊不夠時，另一邊會補上。 */
  quota: {
    zh: 14,
    en: 6,
  },

  juejin: {
    /** 掘金「前端」分類 ID */
    categoryId: '6809637767543259144',
    /** 中文配額裡，最多幾篇來自熱榜（熱門優先），其餘從最近 24 小時新文章挑互動最多的（最新為輔） */
    maxFromHotRank: 10,
    /** 「新文章」往回看幾小時 */
    newWithinHours: 24,
  },

  devto: {
    /**
     * 從這些標籤抓近期熱門文章。
     * 不用 webdev 這種太廣的標籤，否則會混進很多後端、創業心得之類的文章。
     */
    tags: [
      'javascript', 'typescript', 'vue', 'vite', 'nuxt', 'css', 'html', 'tailwindcss',
      'react', 'nextjs', 'svelte', 'angular', 'frontend', 'webperf', 'a11y',
    ],
    /** 往回看幾天 */
    topDays: 3,
    /** 至少要有幾個 reactions 才收錄，避免沒人看的文章 */
    minReactions: 5,
  },

  /** 官方 blog：有新文章時優先放進英文區 */
  officialFeeds: [
    { name: 'Vue 官方 Blog', url: 'https://blog.vuejs.org/feed.rss' },
    { name: 'Vite 官方 Blog', url: 'https://vite.dev/blog.rss' },
  ],
  /** 官方 blog 文章在幾天內都算新消息 */
  officialWithinDays: 7,

  /** JavaScript Weekly 每週一期，發行後幾天內會收錄最新一期 */
  jsWeekly: { url: 'https://javascriptweekly.com/rss', withinDays: 7 },

  /** 發過的文章記錄保留幾天（用來去重） */
  historyDays: 30,

  timeZone: 'Asia/Taipei',
} as const;
