"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import {
  getPageMetadata,
  isNavigationItemActive,
  isProductRoute,
  NAVIGATION_SECTIONS,
  type NavigationItem,
} from "./navigation";

interface AppShellProps {
  readonly children: ReactNode;
}

interface ProductNavigationProps {
  readonly pathname: string;
  readonly onNavigate?: (href: string) => void;
}

const DRAWER_FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])';

function getStatusLabel(item: NavigationItem): string | undefined {
  if (item.status === "coming-soon") {
    return "Soon";
  }
  if (item.status === "embedded") {
    return "Inside research results";
  }
  return undefined;
}

function ProductNavigation({ pathname, onNavigate }: ProductNavigationProps) {
  return (
    <nav aria-label="Product navigation" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
      {NAVIGATION_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            {section.label}
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {section.items.map((item) => {
              const active = isNavigationItemActive(item, pathname);
              const statusLabel = getStatusLabel(item);
              const itemClassName = `flex min-h-9 items-center justify-between rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-950 ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                  : item.status === "available"
                    ? "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                    : "cursor-default text-zinc-500 dark:text-zinc-400"
              }`;

              return (
                <li key={item.label}>
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

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center px-6 py-5 text-sm font-semibold tracking-tight text-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-inset dark:text-zinc-50 dark:focus-visible:ring-zinc-100"
    >
      YouTube Creator OS
    </Link>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const shouldRestoreFocusRef = useRef(true);
  const mobileNavigationOpenRef = useRef(false);

  const removeFocusFromDrawer = useCallback(() => {
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement && drawerRef.current?.contains(activeElement)) {
      activeElement.blur();
    }
  }, []);

  const closeMobileNavigation = useCallback(
    (restoreFocus = true) => {
      removeFocusFromDrawer();
      shouldRestoreFocusRef.current = restoreFocus;
      setMobileNavigationOpen(false);
    },
    [removeFocusFromDrawer],
  );

  // Closing the drawer via a mobile navigation link must not depend on the
  // timing of Next.js's own Link click handling or route transition: blur,
  // mark "don't restore focus", and flush the drawer-closed state to a
  // committed render synchronously, then navigate.
  const navigateFromMobileDrawer = useCallback(
    (href: string) => {
      removeFocusFromDrawer();
      shouldRestoreFocusRef.current = false;

      flushSync(() => {
        setMobileNavigationOpen(false);
      });

      router.push(href);
    },
    [removeFocusFromDrawer, router],
  );

  useEffect(() => {
    mobileNavigationOpenRef.current = mobileNavigationOpen;
  }, [mobileNavigationOpen]);

  useEffect(() => {
    if (mobileNavigationOpen) {
      previouslyFocusedElementRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      closeButtonRef.current?.focus();
      return;
    }

    const previouslyFocused = previouslyFocusedElementRef.current;
    previouslyFocusedElementRef.current = null;
    if (previouslyFocused !== null && shouldRestoreFocusRef.current) {
      previouslyFocused.focus();
    }
    shouldRestoreFocusRef.current = true;
  }, [mobileNavigationOpen]);

  // Safety net for browser back/forward and other route changes that bypass a
  // drawer link. closeMobileNavigation() blurs any focused drawer descendant
  // before the state update that hides the drawer, so no element can retain
  // focus while an ancestor becomes hidden.
  useEffect(() => {
    if (!mobileNavigationOpenRef.current) {
      return;
    }

    closeMobileNavigation(false);
  }, [closeMobileNavigation, pathname]);

  useEffect(() => {
    if (!mobileNavigationOpen) {
      return;
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        closeMobileNavigation();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeMobileNavigation, mobileNavigationOpen]);

  function handleDrawerKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const drawer = drawerRef.current;
    if (drawer === null) {
      return;
    }

    const focusable = drawer.querySelectorAll<HTMLElement>(DRAWER_FOCUSABLE_SELECTOR);
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!isProductRoute(pathname)) {
    return children;
  }

  const page = getPageMetadata(pathname);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <a
        href="#product-content"
        className="sr-only z-50 rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 dark:bg-zinc-50 dark:text-zinc-950"
      >
        Skip to content
      </a>

      <div className="flex min-h-screen" aria-hidden={mobileNavigationOpen ? true : undefined}>
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:flex">
          <Brand />
          <ProductNavigation pathname={pathname} />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 sm:px-6 lg:px-10">
            <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
              <button
                ref={openButtonRef}
                type="button"
                aria-label="Open navigation"
                aria-controls="mobile-product-navigation"
                aria-expanded={mobileNavigationOpen}
                onClick={() => setMobileNavigationOpen(true)}
                className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-950 lg:hidden"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                </svg>
              </button>
              <div>
                <h1 className="text-base font-semibold tracking-tight">{page.title}</h1>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{page.description}</p>
              </div>
            </div>
          </header>

          <main id="product-content" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </main>
        </div>
      </div>

      {mobileNavigationOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => closeMobileNavigation()}
          className="fixed inset-0 z-40 bg-zinc-950/30 lg:hidden"
        />
      ) : null}

      <aside
        ref={drawerRef}
        id="mobile-product-navigation"
        aria-label="Mobile product navigation"
        onKeyDown={handleDrawerKeyDown}
        className={`fixed inset-y-0 left-0 z-50 h-full w-[min(19rem,calc(100vw-3rem))] flex-col border-r border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950 lg:hidden ${
          mobileNavigationOpen ? "flex" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
          <Brand />
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close navigation"
            onClick={() => closeMobileNavigation()}
            className="mr-3 inline-flex size-9 items-center justify-center rounded-md text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <ProductNavigation pathname={pathname} onNavigate={navigateFromMobileDrawer} />
      </aside>
    </div>
  );
}
