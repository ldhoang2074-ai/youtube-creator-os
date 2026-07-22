export type NavigationStatus = "available" | "embedded" | "coming-soon";
export type NavigationMatch = "exact" | "prefix";

export interface NavigationItem {
  readonly label: string;
  readonly href?: string;
  readonly match?: NavigationMatch;
  readonly status: NavigationStatus;
  readonly title: string;
  readonly description: string;
}

export interface NavigationSection {
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

export const NAVIGATION_SECTIONS: readonly NavigationSection[] = [
  {
    label: "Research",
    items: [
      {
        label: "Channel Analyzer",
        href: "/analyzer",
        match: "prefix",
        status: "available",
        title: "Channel Analyzer",
        description: "Analyze recent channel performance and identify outlier videos.",
      },
      {
        label: "Channel Compare",
        href: "/compare",
        match: "prefix",
        status: "available",
        title: "Channel Compare",
        description: "Compare recent channel performance side by side.",
      },
      {
        label: "Opportunities",
        href: "/opportunities",
        match: "prefix",
        status: "available",
        title: "Opportunities",
        description: "Compare high-performing videos across multiple channels.",
      },
      {
        label: "Research Workspace",
        href: "/workspace",
        match: "prefix",
        status: "available",
        title: "Research Workspace",
        description: "Save and revisit channel research sessions.",
      },
      {
        label: "Title Patterns",
        status: "embedded",
        title: "Title Patterns",
        description: "Available in opportunity and saved research results.",
      },
    ],
  },
  {
    label: "Coming soon",
    items: [
      {
        label: "Transcript Intelligence",
        status: "coming-soon",
        title: "Transcript Intelligence",
        description: "Transcript research tools are planned for a later stage.",
      },
      {
        label: "Content Gaps",
        status: "coming-soon",
        title: "Content Gaps",
        description: "Content gap analysis is planned for a later stage.",
      },
      {
        label: "Idea Generator",
        status: "coming-soon",
        title: "Idea Generator",
        description: "Idea generation is planned for a later stage.",
      },
    ],
  },
];

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

export function getPageMetadata(pathname: string): Pick<NavigationItem, "title" | "description"> {
  const [activeItem] = getActiveNavigationItems(pathname);

  if (activeItem !== undefined) {
    return {
      title: activeItem.title,
      description: activeItem.description,
    };
  }

  return {
    title: "YouTube Creator OS",
    description: "Channel research for creators.",
  };
}

export function isProductRoute(pathname: string): boolean {
  return pathname !== "/" && getActiveNavigationItems(pathname).length === 1;
}
