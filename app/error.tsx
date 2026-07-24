"use client";

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly unstable_retry: () => void;
}

export default function ErrorPage({ unstable_retry }: ErrorPageProps) {
  return (
    <section className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center gap-ui-2 rounded-ui-panel border border-ui-danger/40 bg-ui-danger/10 px-ui-6 py-12 text-center">
      <h2 className="text-ui-section font-semibold text-ui-text">
        Something went wrong
      </h2>
      <p className="text-ui-body-sm text-ui-text-secondary">
        We could not load this page. Please try again.
      </p>
      <button
        type="button"
        onClick={unstable_retry}
        className="mt-ui-3 rounded-ui-control bg-ui-accent px-ui-4 py-ui-2 text-ui-body-sm font-semibold text-ui-text outline-none transition-colors hover:bg-ui-accent-hover focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-bg"
      >
        Try again
      </button>
    </section>
  );
}
