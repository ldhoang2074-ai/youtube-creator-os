import type { ShellMessages } from "@/lib/i18n/messages";

export type NavigationStatus = "available" | "embedded" | "coming-soon";
export type NavigationMatch = "exact" | "prefix";
export type NavigationItemKey = keyof ShellMessages["navigation"]["items"];
export type NavigationSectionKey = keyof ShellMessages["navigation"]["sections"];

export interface NavigationItem {
  readonly messageKey: NavigationItemKey;
  readonly href?: string;
  readonly match?: NavigationMatch;
  readonly status: NavigationStatus;
}

export interface NavigationSection {
  readonly messageKey: NavigationSectionKey;
  readonly items: readonly NavigationItem[];
}

export interface LocalizedNavigationItem extends NavigationItem {
  readonly label: string;
  readonly title: string;
  readonly description: string;
}

export interface LocalizedNavigationSection
  extends Omit<NavigationSection, "items"> {
  readonly label: string;
  readonly items: readonly LocalizedNavigationItem[];
}

export const NAVIGATION_SECTIONS: readonly NavigationSection[] = [
  {
    messageKey: "research",
    items: [
      {
        messageKey: "analyzer",
        href: "/analyzer",
        match: "prefix",
        status: "available",
      },
      {
        messageKey: "compare",
        href: "/compare",
        match: "prefix",
        status: "available",
      },
      {
        messageKey: "opportunities",
        href: "/opportunities",
        match: "prefix",
        status: "available",
      },
      {
        messageKey: "workspace",
        href: "/workspace",
        match: "prefix",
        status: "available",
      },
      {
        messageKey: "transcript",
        href: "/transcript",
        match: "prefix",
        status: "available",
      },
      {
        messageKey: "titlePatterns",
        status: "embedded",
      },
    ],
  },
  {
    messageKey: "comingSoon",
    items: [
      {
        messageKey: "contentGaps",
        status: "coming-soon",
      },
      {
        messageKey: "ideaGenerator",
        status: "coming-soon",
      },
    ],
  },
];

export function getLocalizedNavigationSections(
  messages: ShellMessages,
): readonly LocalizedNavigationSection[] {
  return NAVIGATION_SECTIONS.map((section) => ({
    messageKey: section.messageKey,
    label: messages.navigation.sections[section.messageKey],
    items: section.items.map((item) => ({
      ...item,
      ...messages.navigation.items[item.messageKey],
    })),
  }));
}

export function getEnabledNavigationItems(): readonly NavigationItem[] {
  return NAVIGATION_SECTIONS.flatMap((section) =>
    section.items.filter((item) => item.status === "available"),
  );
}

export function isNavigationItemActive(item: NavigationItem, pathname: string): boolean {
  if (item.status !== "available" || item.href === undefined) {
    return false;
  }

  if (item.match === "exact") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function getActiveNavigationItems(pathname: string): readonly NavigationItem[] {
  return getEnabledNavigationItems().filter((item) => isNavigationItemActive(item, pathname));
}

export function getPageMetadata(
  pathname: string,
  messages: ShellMessages,
): Pick<LocalizedNavigationItem, "title" | "description"> {
  const [activeItem] = getActiveNavigationItems(pathname);

  if (activeItem !== undefined) {
    const itemMessages = messages.navigation.items[activeItem.messageKey];

    return {
      title: itemMessages.title,
      description: itemMessages.description,
    };
  }

  return messages.fallbackPage;
}

export function isProductRoute(pathname: string): boolean {
  return pathname !== "/" && getActiveNavigationItems(pathname).length === 1;
}
