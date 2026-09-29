import {
  Car,
  Clock3,
  KeyRound,
  Navigation,
  Search,
  Shield,
  Tag,
  type LucideIcon,
} from "lucide-react";

export const HOMEPAGE_INFO_ICON_KEYS = [
  "shield",
  "tag",
  "clock",
  "search",
  "key",
  "car",
  "navigation",
] as const;

export type HomepageInfoIconKey = (typeof HOMEPAGE_INFO_ICON_KEYS)[number];

export const HOMEPAGE_INFO_ICONS: Record<HomepageInfoIconKey, LucideIcon> = {
  shield: Shield,
  tag: Tag,
  clock: Clock3,
  search: Search,
  key: KeyRound,
  car: Car,
  navigation: Navigation,
};

export function resolveHomepageInfoIcon(key: string): LucideIcon {
  if ((HOMEPAGE_INFO_ICON_KEYS as readonly string[]).includes(key)) {
    return HOMEPAGE_INFO_ICONS[key as HomepageInfoIconKey];
  }
  return Shield;
}

export const HOMEPAGE_INFO_ICON_LABELS: Record<HomepageInfoIconKey, string> = {
  shield: "Shield",
  tag: "Tag / Price",
  clock: "Clock / Support",
  search: "Search",
  key: "Key / Book",
  car: "Car",
  navigation: "Navigation",
};
