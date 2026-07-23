import Link from "next/link";
import type { MouseEvent } from "react";
import type { ShellMessages } from "@/lib/i18n/messages";
import {
  getLocalizedNavigationSections,
  isNavigationItemActive,
} from "./navigation";

interface ProductNavigationProps {
  readonly pathname: string;
  readonly messages: ShellMessages;
  readonly onNavigate?: (href: string) => void;
}

export function ProductNavigation({ pathname, messages, onNavigate }: ProductNavigationProps) {
  return (
    <nav aria-label={messages.navigation.ariaLabel} className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
      {getLocalizedNavigationSections(messages).map((section) => (
        <div key={section.messageKey}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            {section.label}
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {section.items.map((item) => {
              const active = isNavigationItemActive(item, pathname);
              const statusLabel =
                item.status === "coming-soon"
                  ? messages.navigation.statuses.soon
                  : item.status === "embedded"
                    ? messages.navigation.statuses.embedded
                    : undefined;
              const itemClassName = `flex min-h-9 items-center justify-between rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-950 ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                  : item.status === "available"
                    ? "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                    : "cursor-default text-zinc-500 dark:text-zinc-400"
              }`;

              return (
                <li key={item.messageKey}>
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
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={itemClassName}>
                      <span>{item.label}</span>
                      {statusLabel !== undefined ? (
                        <span className="rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                          {statusLabel}
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
