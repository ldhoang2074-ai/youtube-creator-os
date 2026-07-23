import Link from "next/link";

interface BrandProps {
  readonly brand: string;
}

export function Brand({ brand }: BrandProps) {
  return (
    <Link
      href="/"
      className="flex h-[4.5rem] items-center gap-ui-3 border-b border-ui-border px-ui-6 text-ui-text outline-none hover:bg-ui-panel focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-focus"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-ui-control bg-ui-accent text-ui-text">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
          <path d="m7 7 5 5-5 5M13 7l4 5-4 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-ui-body font-semibold tracking-tight">{brand}</span>
    </Link>
  );
}
