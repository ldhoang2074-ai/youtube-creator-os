import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import type { ShellMessages } from "@/lib/i18n/messages";
import type { NavigationItemKey } from "./navigation";
import {
  getLocalizedNavigationSections,
  isNavigationItemActive,
} from "./navigation";

interface ProductNavigationProps {
  readonly pathname: string;
  readonly messages: ShellMessages;
  readonly onNavigate?: (href: string) => void;
}

const NAVIGATION_ICONS: Record<NavigationItemKey, ReactNode> = {
  analyzer: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
      <path d="M5 19V11M12 19V5M19 19v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  compare: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
      <path d="M5 6h5v12H5zM14 6h5v12h-5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  opportunities: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
      <path d="m5 16 5-5 3 3 6-7M15 7h4v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  workspace: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
      <path d="M4 7.5h6l1.5 2H20v7.5H4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  transcript: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
      <path d="M7 4h8l3 3v13H7zM10 12h5M10 16h5M10 8h2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  titlePatterns: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
      <path d="M5 6h14M9 6v12M6 18h6M14 12h5M14 17h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  contentGaps: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
      <path d="M4 6h5v5H4zM15 6h5v5h-5zM4 13h5v5H4zM15 13h5v5h-5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ideaGenerator: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
      <path d="M9 18h6M10 21h4M8.5 14.5A6 6 0 1 1 15.5 14.5c-.9.8-1.5 1.7-1.5 2.5h-4c0-.8-.6-1.7-1.5-2.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export function ProductNavigation({ pathname, messages, onNavigate }: ProductNavigationProps) {
  return (
    <nav
      aria-label={messages.navigation.ariaLabel}
      className="flex flex-1 flex-col gap-ui-6 overflow-y-auto px-ui-3 py-ui-4"
    >
      {getLocalizedNavigationSections(messages).map((section) => (
        <div key={section.messageKey}>
          <p className="px-ui-3 text-ui-label font-semibold uppercase tracking-[0.14em] text-ui-text-muted">
            {section.label}
          </p>
          <ul className="mt-ui-2 flex flex-col gap-ui-1">
            {section.items.map((item) => {
              const active = isNavigationItemActive(item, pathname);
              const comingSoonStatusLabel =
                item.status === "coming-soon" ? messages.navigation.statuses.soon : undefined;
              const embeddedStatusLabel =
                item.status === "embedded" ? messages.navigation.statuses.embedded : undefined;
              const itemClassName = `group relative flex min-h-10 w-full items-center gap-ui-3 rounded-ui-control border px-ui-3 py-ui-2 text-ui-body-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-sidebar ${
                active
                  ? "border-ui-border bg-ui-panel-elevated text-ui-text before:absolute before:inset-y-ui-2 before:left-0 before:w-0.5 before:rounded-ui-pill before:bg-ui-accent"
                  : item.status === "available"
                    ? "border-transparent text-ui-text-muted hover:bg-ui-surface-muted hover:text-ui-text"
                    : "cursor-default border-transparent text-ui-text-muted opacity-70"
              }`;
              const iconClassName = `shrink-0 transition-colors ${
                active
                  ? "text-ui-accent"
                  : item.status === "available"
                    ? "text-ui-text-muted group-hover:text-ui-text-secondary"
                    : "text-ui-text-muted"
              }`;

              return (
                <li key={item.messageKey} className="min-w-0">
                  {item.href !== undefined ? (
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={itemClassName}
                      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                        if (onNavigate === undefined) {
                          return;
                        }

                        if (
                          event.defaultPrevented ||
                          event.button !== 0 ||
                          event.metaKey ||
                          event.ctrlKey ||
                          event.shiftKey ||
                          event.altKey
                        ) {
                          return;
                        }

                        event.preventDefault();
                        onNavigate(item.href as string);
                      }}
                    >
                      <span className={iconClassName}>{NAVIGATION_ICONS[item.messageKey]}</span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={itemClassName}>
                      <span className={iconClassName}>{NAVIGATION_ICONS[item.messageKey]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words">{item.label}</span>
                        {embeddedStatusLabel !== undefined ? (
                          <span className="mt-ui-1 block max-w-full whitespace-normal break-words text-ui-label font-semibold uppercase tracking-wide text-ui-text-muted">
                            {embeddedStatusLabel}
                          </span>
                        ) : null}
                      </span>
                      {comingSoonStatusLabel !== undefined ? (
                        <span className="shrink-0 whitespace-nowrap rounded-ui-pill border border-ui-border bg-ui-panel px-ui-2 py-ui-1 text-ui-label font-semibold uppercase tracking-wide text-ui-text-muted">
                          {comingSoonStatusLabel}
                        </span>
                      ) : null}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
