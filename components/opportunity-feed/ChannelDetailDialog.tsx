"use client";

import type { OpportunityChannelSummary } from "@/lib/channel-analyzer/types";
import { DetailDialog } from "@/components/ui/DetailDialog";

interface ChannelDetailDialogProps {
  readonly channel: OpportunityChannelSummary | null;
  readonly onClose: () => void;
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
      <dd className="mt-ui-1 break-words text-ui-body-sm tabular-nums text-ui-text-secondary">
        {value}
      </dd>
    </div>
  );
}

function formatOutlierRate(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

export function ChannelDetailDialog({ channel, onClose }: ChannelDetailDialogProps) {
  if (channel === null) {
    return null;
  }

  return (
    <DetailDialog
      open
      onClose={onClose}
      title={channel.title}
      description="Details from the current analyzed result. No new data has been fetched."
    >
      <div className="flex flex-col gap-ui-5">
        <div className="flex items-center gap-ui-4">
          {channel.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.thumbnailUrl}
              alt=""
              width={96}
              height={96}
              loading="lazy"
              decoding="async"
              className="size-24 shrink-0 rounded-full border border-ui-border object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="size-24 shrink-0 rounded-full border border-ui-border bg-ui-surface-muted"
            />
          )}
          <p className="min-w-0 break-words text-ui-body-sm text-ui-text-muted">
            Channel performance in the current analyzed recent-video set.
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-x-ui-6 gap-y-ui-4 sm:grid-cols-2">
          <Metric label="Subscribers" value={channel.subscriberCount} />
          <Metric label="Total views" value={channel.totalViewCount} />
          <Metric label="Video count" value={channel.videoCount} />
          <Metric label="Median views" value={channel.medianViews ?? "—"} />
          <Metric label="Analyzed videos" value={channel.analyzedVideoCount} />
          <Metric label="Recent-video outlier rate" value={formatOutlierRate(channel.outlierRate)} />
        </dl>
      </div>
    </DetailDialog>
  );
}
