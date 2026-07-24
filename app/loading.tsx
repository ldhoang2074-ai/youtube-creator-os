export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-48 items-center justify-center gap-ui-3 px-ui-6 py-12 text-ui-body-sm text-ui-text-secondary"
    >
      <span
        aria-hidden="true"
        className="size-5 shrink-0 animate-spin rounded-ui-pill border-2 border-ui-border border-t-ui-accent"
      />
      <span>Loading page...</span>
    </div>
  );
}
