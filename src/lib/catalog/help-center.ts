export type HelpArticle = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  trending?: boolean;
};

export type HelpTopic = {
  id: string;
  title: string;
  sortOrder: number;
  articles: HelpArticle[];
};

export type HelpCategory = {
  id: string;
  title: string;
  sortOrder: number;
  topics: HelpTopic[];
};

export type HelpCenterConfig = {
  categories: HelpCategory[];
  updatedAt: string;
};

/** Preview how many questions show before “View all”. */
export const HELP_TOPIC_PREVIEW = 5;

export function flattenHelpArticles(config: HelpCenterConfig): HelpArticle[] {
  return config.categories
    .flatMap((c) => c.topics.flatMap((t) => t.articles))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function findHelpArticle(
  config: HelpCenterConfig,
  articleId: string,
): { article: HelpArticle; category: HelpCategory; topic: HelpTopic } | null {
  for (const category of config.categories) {
    for (const topic of category.topics) {
      const article = topic.articles.find((a) => a.id === articleId);
      if (article) return { article, category, topic };
    }
  }
  return null;
}

export function trendingHelpArticles(config: HelpCenterConfig, limit = 8): HelpArticle[] {
  const flagged = flattenHelpArticles(config).filter((a) => a.trending);
  if (flagged.length >= limit) return flagged.slice(0, limit);
  const rest = flattenHelpArticles(config).filter((a) => !a.trending);
  return [...flagged, ...rest].slice(0, limit);
}
