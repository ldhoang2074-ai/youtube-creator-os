"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { ShellMessages } from "@/lib/i18n/messages";
import { Brand } from "./brand";
import { ProductHeader } from "./product-header";
import { ProductNavigation } from "./product-navigation";
import { getPageMetadata, isProductRoute } from "./navigation";

interface AppShellProps {
  readonly children: ReactNode;
  readonly messages: ShellMessages;
}

const DRAWER_FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])';

export function AppShell({ children, messages }: AppShellProps) {
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

  const page = getPageMetadata(pathname, messages);

  return (
    <div className="min-h-screen overflow-x-hidden bg-ui-bg text-ui-text">
      <a
        href="#product-content"
        className="sr-only z-50 rounded-ui-control bg-ui-accent px-ui-3 py-ui-2 text-ui-body-sm font-semibold text-ui-text focus:not-sr-only focus:fixed focus:left-ui-4 focus:top-ui-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-bg"
      >
        {messages.accessibility.skipToContent}
      </a>

      <div className="flex min-h-screen bg-ui-bg" aria-hidden={mobileNavigationOpen ? true : undefined}>
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ui-border bg-ui-sidebar lg:flex">
          <Brand brand={messages.brand} />
          <ProductNavigation pathname={pathname} messages={messages} />
        </aside>

        <div className="min-w-0 flex-1 bg-ui-bg">
          <ProductHeader
            title={page.title}
            description={page.description}
            openNavigationLabel={messages.accessibility.openNavigation}
            mobileNavigationOpen={mobileNavigationOpen}
            openButtonRef={openButtonRef}
            onOpenNavigation={() => setMobileNavigationOpen(true)}
          />

          <main id="product-content" className="mx-auto w-full max-w-[1600px] px-ui-4 py-ui-6 sm:px-ui-6 lg:px-ui-10 lg:py-ui-8">
            {children}
          </main>
        </div>
      </div>

      {mobileNavigationOpen ? (
        <button
          type="button"
          aria-label={messages.accessibility.closeNavigationOverlay}
          onClick={() => closeMobileNavigation()}
          className="fixed inset-0 z-40 bg-ui-bg/80 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        ref={drawerRef}
        id="mobile-product-navigation"
        aria-label={messages.navigation.mobileAriaLabel}
        onKeyDown={handleDrawerKeyDown}
        className={`fixed inset-y-0 left-0 z-50 h-full w-[min(19rem,calc(100vw-3rem))] flex-col border-r border-ui-border bg-ui-sidebar shadow-2xl lg:hidden ${
          mobileNavigationOpen ? "flex" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between">
          <Brand brand={messages.brand} />
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={messages.accessibility.closeNavigation}
            onClick={() => closeMobileNavigation()}
            className="mr-ui-3 inline-flex size-9 items-center justify-center rounded-ui-control border border-ui-border bg-ui-panel text-ui-text-secondary outline-none hover:bg-ui-surface-muted hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-sidebar"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <ProductNavigation
          pathname={pathname}
          messages={messages}
          onNavigate={navigateFromMobileDrawer}
        />
      </aside>
    </div>
  );
}
