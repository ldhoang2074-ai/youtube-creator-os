import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-ui-bg px-ui-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-ui-text sm:text-5xl">
        YouTube Creator OS
      </h1>
      <p className="mt-ui-4 max-w-xl text-ui-body text-ui-text-secondary">
        Discover breakout channels, analyze video outliers, and find content
        opportunities.
      </p>
      <Link
        href="/analyzer"
        className="mt-ui-8 rounded-ui-pill bg-ui-accent px-ui-6 py-ui-3 text-ui-body font-semibold text-ui-text outline-none transition-colors hover:bg-ui-accent-hover focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-bg"
      >
        Get Started
      </Link>
    </div>
  );
}
