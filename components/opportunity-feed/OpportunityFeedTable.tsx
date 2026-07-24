import type { OpportunityFeedItem } from "@/lib/channel-analyzer/types";
import { buildYoutubeWatchUrl, formatDuration } from "@/lib/format/video";
import { Grid } from "@/components/ui/Grid";

function formatMultiplier(ratio: number): string {
  return `${ratio.toFixed(1)}×`;
}

const LEVEL_LABELS: Record<OpportunityFeedItem["outlierLevel"], string> = {
  outlier: "Outlier",
  "strong-outlier": "Strong outlier",
};

const LEVEL_STYLES: Record<OpportunityFeedItem["outlierLevel"], string> = {
  outlier: "border-ui-warning/40 bg-ui-warning/10 text-ui-warning",
  "strong-outlier": "border-ui-danger/50 bg-ui-danger/10 font-semibold text-ui-danger",
};

interface OpportunityFeedTableProps {
  readonly items: readonly OpportunityFeedItem[];
  readonly showThumbnails?: boolean;
  readonly onViewDetails?: (item: OpportunityFeedItem) => void;
}

interface MetricProps {
  readonly label: string;
  readonly value: string | number;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="min-w-0">
      <dt className="text-ui-label font-semibold uppercase tracking-[0.1em] text-ui-text-muted">
        {label}
      </dt>
      <dd className="mt-ui-1 break-words text-ui-body-sm text-ui-text-secondary">{value}</dd>
    </div>
  );
}

export function OpportunityFeedTable({
  items,
  showThumbnails = true,
  onViewDetails,
}: OpportunityFeedTableProps) {
  return (
    <Grid className="gap-ui-4 lg:gap-ui-6">
      {items.map((item) => {
        const watchUrl = buildYoutubeWatchUrl(item.videoId);
        return (
          <article
            key={item.videoId}
            className="flex h-full min-w-0 flex-col overflow-hidden rounded-ui-panel border border-ui-border bg-ui-panel transition-colors hover:border-ui-focus/50"
          >
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${item.title} on YouTube`}
              className="group flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-focus"
            >
              {showThumbnails ? (
                <div className="aspect-video w-full shrink-0 overflow-hidden bg-ui-surface-muted">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
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
              ) : null}

              <div className="flex flex-1 flex-col gap-ui-3 p-ui-4">
                <h3 className="line-clamp-2 text-ui-body font-semibold text-ui-text transition-colors group-hover:text-ui-text-secondary">
                  {item.title}
                </h3>

                <span
                  className={`inline-flex w-fit items-center rounded-ui-pill border px-ui-2 py-ui-1 text-ui-label font-medium ${LEVEL_STYLES[item.outlierLevel]}`}
                >
                  {LEVEL_LABELS[item.outlierLevel]}
                </span>

                <dl className="grid grid-cols-2 gap-x-ui-4 gap-y-ui-3">
                  <Metric label="Channel" value={item.channelTitle} />
                  <Metric label="Published" value={new Date(item.publishedAt).toLocaleDateString()} />
                  <Metric label="Duration" value={formatDuration(item.durationSeconds)} />
                  <Metric label="Views" value={item.viewCount} />
                  <Metric label="Channel median views" value={item.channelMedianViews} />
                  <Metric label="Outlier multiplier" value={formatMultiplier(item.outlierRatio)} />
                </dl>
              </div>
            </a>

            {onViewDetails ? (
              <div className="border-t border-ui-border bg-ui-panel-elevated px-ui-4 py-ui-3">
                <button
                  type="button"
                  aria-label={`View details for ${item.title}`}
                  onClick={() => onViewDetails(item)}
                  className="w-full rounded-ui-control border border-ui-border bg-ui-panel px-ui-3 py-ui-2 text-ui-body-sm font-semibold text-ui-text-secondary outline-none transition-colors hover:bg-ui-surface-muted hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel-elevated"
                >
                  View details
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </Grid>
  );
}
