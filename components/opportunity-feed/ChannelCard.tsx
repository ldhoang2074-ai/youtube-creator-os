import type { OpportunityChannelSummary } from "@/lib/channel-analyzer/types";

interface ChannelCardProps {
  readonly channel: OpportunityChannelSummary;
  readonly onViewDetails?: (channel: OpportunityChannelSummary) => void;
}

function formatOutlierRate(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
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

export function ChannelCard({ channel, onViewDetails }: ChannelCardProps) {
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-ui-panel border border-ui-border bg-ui-panel">
      <div className="flex flex-1 flex-col gap-ui-4 p-ui-4 sm:p-ui-6">
        <div className="flex min-w-0 items-center gap-ui-3">
          {channel.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.thumbnailUrl}
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
            {channel.title}
          </h3>
        </div>

        <dl className="grid grid-cols-2 gap-ui-3">
          <Metric label="Subscribers" value={channel.subscriberCount} />
          <Metric label="Total views" value={channel.totalViewCount} />
          <Metric label="Video count" value={channel.videoCount} />
          <Metric label="Median views" value={channel.medianViews ?? "—"} />
          <Metric label="Analyzed videos" value={channel.analyzedVideoCount} />
          <Metric label="Recent-video outlier rate" value={formatOutlierRate(channel.outlierRate)} />
        </dl>
      </div>

      {onViewDetails ? (
        <div className="border-t border-ui-border bg-ui-panel-elevated px-ui-4 py-ui-3">
          <button
            type="button"
            aria-label={`View channel details for ${channel.title}`}
            onClick={() => onViewDetails(channel)}
            className="w-full rounded-ui-control border border-ui-border bg-ui-panel px-ui-3 py-ui-2 text-ui-body-sm font-semibold text-ui-text-secondary outline-none transition-colors hover:bg-ui-surface-muted hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel-elevated"
          >
            View channel details
          </button>
        </div>
      ) : null}
    </article>
  );
}
