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
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 break-words tabular-nums text-zinc-700 dark:text-zinc-300">{value}</dd>
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
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          {channel.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.thumbnailUrl}
              alt=""
              width={96}
              height={96}
              loading="lazy"
              decoding="async"
              className="size-24 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div aria-hidden="true" className="size-24 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          )}
          <p className="min-w-0 break-words text-sm text-zinc-600 dark:text-zinc-400">
            Channel performance in the current analyzed recent-video set.
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
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
