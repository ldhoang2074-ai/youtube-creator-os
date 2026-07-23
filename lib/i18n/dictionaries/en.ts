import type { ShellMessages } from "../messages";

export const enMessages = {
  brand: "YouTube Creator OS",
  navigation: {
    ariaLabel: "Product navigation",
    mobileAriaLabel: "Mobile product navigation",
    sections: {
      research: "Research",
      comingSoon: "Coming soon",
    },
    statuses: {
      soon: "Soon",
      embedded: "Inside research results",
    },
    items: {
      analyzer: {
        label: "Channel Analyzer",
        title: "Channel Analyzer",
        description: "Analyze recent channel performance and identify outlier videos.",
      },
      compare: {
        label: "Channel Compare",
        title: "Channel Compare",
        description: "Compare recent channel performance side by side.",
      },
      opportunities: {
        label: "Opportunities",
        title: "Opportunities",
        description: "Compare high-performing videos across multiple channels.",
      },
      workspace: {
        label: "Research Workspace",
        title: "Research Workspace",
        description: "Save and revisit channel research sessions.",
      },
      transcript: {
        label: "Transcript Intelligence",
        title: "Transcript Intelligence",
        description: "Fetch and review timestamped YouTube transcripts.",
      },
      titlePatterns: {
        label: "Title Patterns",
        title: "Title Patterns",
        description: "Available in opportunity and saved research results.",
      },
      contentGaps: {
        label: "Content Gaps",
        title: "Content Gaps",
        description: "Content gap analysis is planned for a later stage.",
      },
      ideaGenerator: {
        label: "Idea Generator",
        title: "Idea Generator",
        description: "Idea generation is planned for a later stage.",
      },
    },
  },
  accessibility: {
    skipToContent: "Skip to content",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    closeNavigationOverlay: "Close navigation overlay",
  },
  fallbackPage: {
    title: "YouTube Creator OS",
    description: "Channel research for creators.",
  },
} as const satisfies ShellMessages;
