import type { RefObject } from "react";

interface ProductHeaderProps {
  readonly title: string;
  readonly description: string;
  readonly openNavigationLabel: string;
  readonly mobileNavigationOpen: boolean;
  readonly openButtonRef: RefObject<HTMLButtonElement | null>;
  readonly onOpenNavigation: () => void;
}

export function ProductHeader({
  title,
  description,
  openNavigationLabel,
  mobileNavigationOpen,
  openButtonRef,
  onOpenNavigation,
}: ProductHeaderProps) {
  return (
    <header className="border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
        <button
          ref={openButtonRef}
          type="button"
          aria-label={openNavigationLabel}
          aria-controls="mobile-product-navigation"
          aria-expanded={mobileNavigationOpen}
          onClick={onOpenNavigation}
          className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-950 lg:hidden"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
        <div>
          <h1 className="text-base font-semibold tracking-tight">{title}</h1>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        </div>
      </div>
    </header>
  );
}
