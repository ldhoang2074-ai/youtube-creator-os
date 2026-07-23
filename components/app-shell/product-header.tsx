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
    <header className="sticky top-0 z-30 border-b border-ui-border bg-ui-bg/90 px-ui-4 py-ui-4 backdrop-blur sm:px-ui-6 lg:px-ui-10">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-ui-3">
        <button
          ref={openButtonRef}
          type="button"
          aria-label={openNavigationLabel}
          aria-controls="mobile-product-navigation"
          aria-expanded={mobileNavigationOpen}
          onClick={onOpenNavigation}
          className="inline-flex size-9 items-center justify-center rounded-ui-control border border-ui-border bg-ui-panel text-ui-text-secondary outline-none hover:bg-ui-surface-muted hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-bg lg:hidden"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
        <div>
          <h1 className="text-ui-section font-semibold tracking-tight text-ui-text sm:text-ui-page">{title}</h1>
          <p className="mt-ui-1 text-ui-body-sm text-ui-text-muted">{description}</p>
        </div>
      </div>
    </header>
  );
}
