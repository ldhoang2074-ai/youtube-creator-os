import type { Locale } from "./locales";
import { enMessages } from "./dictionaries/en";
import { viMessages } from "./dictionaries/vi";

export interface ShellMessages {
  readonly brand: string;
  readonly navigation: {
    readonly ariaLabel: string;
    readonly mobileAriaLabel: string;
    readonly sections: {
      readonly research: string;
      readonly comingSoon: string;
    };
    readonly statuses: {
      readonly soon: string;
      readonly embedded: string;
    };
    readonly items: {
      readonly analyzer: {
        readonly label: string;
        readonly title: string;
        readonly description: string;
      };
      readonly compare: {
        readonly label: string;
        readonly title: string;
        readonly description: string;
      };
      readonly opportunities: {
        readonly label: string;
        readonly title: string;
        readonly description: string;
      };
      readonly workspace: {
        readonly label: string;
        readonly title: string;
        readonly description: string;
      };
      readonly transcript: {
        readonly label: string;
        readonly title: string;
        readonly description: string;
      };
      readonly titlePatterns: {
        readonly label: string;
        readonly title: string;
        readonly description: string;
      };
      readonly contentGaps: {
        readonly label: string;
        readonly title: string;
        readonly description: string;
      };
      readonly ideaGenerator: {
        readonly label: string;
        readonly title: string;
        readonly description: string;
      };
    };
  };
  readonly accessibility: {
    readonly skipToContent: string;
    readonly openNavigation: string;
    readonly closeNavigation: string;
    readonly closeNavigationOverlay: string;
  };
  readonly fallbackPage: {
    readonly title: string;
    readonly description: string;
  };
}

export const MESSAGES: Readonly<Record<Locale, ShellMessages>> = Object.freeze({
  en: enMessages,
  vi: viMessages,
});

export function getMessages(locale: Locale): ShellMessages {
  return MESSAGES[locale];
}
