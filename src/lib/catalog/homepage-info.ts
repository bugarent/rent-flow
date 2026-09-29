import type { HomepageInfoIconKey } from "@/lib/catalog/homepage-info-icons";

export type HomepageInfoSection = "why" | "how";

export type HomepageInfoBlock = {
  id: string;
  section: HomepageInfoSection;
  title: string;
  body: string;
  titleI18n?: Partial<Record<string, string>>;
  bodyI18n?: Partial<Record<string, string>>;
  iconKey: HomepageInfoIconKey;
  sortOrder: number;
  updatedAt: string;
};

export type HomepageInfoContent = {
  whyTitle: string;
  howTitle: string;
  whyTitleI18n?: Partial<Record<string, string>>;
  howTitleI18n?: Partial<Record<string, string>>;
  blocks: HomepageInfoBlock[];
};
