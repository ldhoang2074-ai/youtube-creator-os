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
  readonly detailAction?: ReactNode;
}

export function VideoCardBase({
  videoId,
  title,
  thumbnailUrl,
  publishedAt,
  durationSeconds,
  metrics,
  detailAction,
}: VideoCardBaseProps) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-ui-panel border border-ui-border bg-ui-panel transition-colors hover:border-ui-focus/50">
      <a
        href={buildYoutubeWatchUrl(videoId)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${title} on YouTube`}
        className="group flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-focus"
      >
        <div className="aspect-video w-full shrink-0 overflow-hidden bg-ui-surface-muted">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt=""
              width={320}
              height={180}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div aria-hidden="true" className="h-full w-full bg-ui-surface-muted" />
          )}
        </div>

        <div className="flex flex-1 flex-col p-ui-4">
          <h3 className="line-clamp-2 text-ui-body font-semibold text-ui-text transition-colors group-hover:text-ui-text-secondary">
            {title}
          </h3>

          <dl className="mt-ui-4 grid grid-cols-2 gap-x-ui-4 gap-y-ui-3">
            <div className="min-w-0">
              <dt className="text-ui-label font-semibold uppercase tracking-[0.1em] text-ui-text-muted">
                Published
              </dt>
              <dd className="mt-ui-1 break-words text-ui-body-sm text-ui-text-secondary">
                {new Date(publishedAt).toLocaleDateString()}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-ui-label font-semibold uppercase tracking-[0.1em] text-ui-text-muted">
                Duration
              </dt>
              <dd className="mt-ui-1 break-words text-ui-body-sm text-ui-text-secondary">
                {formatDuration(durationSeconds)}
              </dd>
            </div>
            {metrics.map((metric) => (
              <div key={metric.label} className="min-w-0">
                <dt className="text-ui-label font-semibold uppercase tracking-[0.1em] text-ui-text-muted">
                  {metric.label}
                </dt>
                <dd className="mt-ui-1 break-words text-ui-body-sm text-ui-text-secondary">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </a>
      {detailAction ? (
        <div className="border-t border-ui-border bg-ui-panel-elevated px-ui-4 py-ui-3">
          {detailAction}
        </div>
      ) : null}
    </article>
  );
}
