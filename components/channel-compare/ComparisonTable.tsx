import type { ChannelCompareEntry } from "@/lib/channel-analyzer/types";
import { Grid } from "@/components/ui/Grid";

interface ComparisonTableProps {
  readonly results: readonly ChannelCompareEntry[];
}

function formatOutlierRate(rate: number | null): string {
  if (rate === null) {
    return "—";
  }
  return `${Math.round(rate * 100)}%`;
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
      <dd className="mt-ui-1 break-words text-ui-body font-semibold tabular-nums text-ui-text">
        {value}
      </dd>
    </div>
  );
}

export function ComparisonTable({ results }: ComparisonTableProps) {
  return (
    <Grid className="gap-ui-4 lg:gap-ui-6">
      {results.map((entry, index) => {
        if (entry.status === "success") {
          const { report } = entry;
          return (
            <article
              key={report.channelId}
              className="flex min-w-0 flex-col gap-ui-4 rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4 sm:p-ui-6"
            >
              <div className="flex min-w-0 items-center gap-ui-3">
                {report.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={report.thumbnailUrl}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    decoding="async"
                    className="size-16 shrink-0 rounded-full border border-ui-border object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="size-16 shrink-0 rounded-full border border-ui-border bg-ui-surface-muted"
                  />
                )}
                <h3 className="min-w-0 break-words text-ui-body font-semibold text-ui-text">
                  {report.title}
                </h3>
              </div>

              <dl className="grid grid-cols-2 gap-ui-3">
                <Metric label="Subscribers" value={report.subscriberCount} />
                <Metric label="Total views" value={report.totalViewCount} />
                <Metric label="Video count" value={report.videoCount} />
                <Metric label="Median views" value={report.medianViews ?? "—"} />
                <Metric label="Analyzed videos" value={report.analyzedVideoCount} />
                <Metric label="Recent-video outlier rate" value={formatOutlierRate(report.outlierRate)} />
              </dl>
            </article>
          );
        }

        return (
          <article
            key={`${entry.input}-${index}`}
            className="flex min-w-0 flex-col gap-ui-2 rounded-ui-panel border border-ui-danger/40 bg-ui-danger/10 p-ui-4 sm:p-ui-6"
          >
            <p className="min-w-0 break-words text-ui-body font-semibold text-ui-text">
              {entry.input}
            </p>
            <p className="min-w-0 break-words text-ui-body-sm text-ui-danger">
              {entry.error.message}
            </p>
          </article>
        );
      })}
    </Grid>
  );
}
