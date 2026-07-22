"use client";

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly unstable_retry: () => void;
}

export default function ErrorPage({ unstable_retry }: ErrorPageProps) {
  return (
    <section className="mx-auto flex min-h-64 max-w-xl flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        We could not load this page. Please try again.
      </p>
      <button
        type="button"
        onClick={unstable_retry}
        className="mt-5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:hover:bg-[#ccc]"
      >
        Try again
      </button>
    </section>
  );
}
