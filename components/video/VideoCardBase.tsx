import type { ReactNode } from "react";
import { buildYoutubeWatchUrl, formatDuration } from "@/lib/format/video";

interface VideoCardMetric {
  readonly label: string;
  readonly value: ReactNode;
}

interface VideoCardBaseProps {
  readonly videoId: string;
  readonly title: string;
  readonly thumbnailUrl: string | null;
  readonly publishedAt: string;
  readonly durationSeconds: number;
  readonly metrics: readonly VideoCardMetric[];
}

export function VideoCardBase({
  videoId,
  title,
  thumbnailUrl,
  publishedAt,
  durationSeconds,
  metrics,
}: VideoCardBaseProps) {
  return (
    <article className="h-full overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <a
        href={buildYoutubeWatchUrl(videoId)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${title} on YouTube`}
        className="group flex h-full flex-col outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
      >
        <div className="aspect-video w-full shrink-0 overflow-hidden bg-zinc-200 dark:bg-zinc-800">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt=""
              width={320}
              height={180}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div aria-hidden="true" className="h-full w-full bg-zinc-200 dark:bg-zinc-800" />
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 text-sm font-semibold text-zinc-950 group-hover:underline dark:text-zinc-50">
            {title}
          </h3>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Published
              </dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
                {new Date(publishedAt).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Duration
              </dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
                {formatDuration(durationSeconds)}
              </dd>
            </div>
            {metrics.map((metric) => (
              <div key={metric.label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {metric.label}
                </dt>
                <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{metric.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </a>
    </article>
  );
}
