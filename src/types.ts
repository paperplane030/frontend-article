export type Lang = 'zh' | 'en';

/** 中文區或英文區裡的小分類，決定在 Discord 訊息中的段落 */
export type Section = 'hot' | 'new' | 'official' | 'community';

export interface Article {
  url: string;
  title: string;
  lang: Lang;
  section: Section;
  /** 來源名稱，例如「掘金」「dev.to」 */
  source: string;
  author?: string;
  publishedAt?: Date;
  /** 同一個來源內比較用的熱度分數，越高越熱門 */
  hot: number;
  /** 顯示在標題下方的數據，例如「🔥 1.2k · 👍 30」 */
  stats?: string;
}

export interface SourceResult {
  name: string;
  articles: Article[];
  error?: string;
}
