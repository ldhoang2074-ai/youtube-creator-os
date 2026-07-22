"use client";

import { OutlierBadge } from "@/components/channel-analyzer/OutlierBadge";
import type { OpportunityFeedItem, VideoAnalysis } from "@/lib/channel-analyzer/types";
import { formatDuration } from "@/lib/format/video";
import { DetailDialog } from "@/components/ui/DetailDialog";
import type { ReactNode } from "react";

export type VideoDetailSource =
  | {
      readonly kind: "analyzer";
      readonly video: VideoAnalysis;
    }
  | {
      readonly kind: "feed";
      readonly item: OpportunityFeedItem;
    };

interface VideoDetailDialogProps {
  readonly source: VideoDetailSource | null;
  readonly onClose: () => void;
}

interface MetricProps {
  readonly label: string;
  readonly value: ReactNode;
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

function formatMultiplier(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}×`;
}

export function VideoDetailDialog({ source, onClose }: VideoDetailDialogProps) {
  if (source === null) {
    return null;
  }

  const video = source.kind === "analyzer" ? source.video : source.item;
  const detailMetrics =
    source.kind === "analyzer"
      ? [
          { label: "Views", value: source.video.viewCount ?? "—" },
          { label: "Likes", value: source.video.likeCount ?? "—" },
          { label: "Comments", value: source.video.commentCount ?? "—" },
          { label: "Outlier multiplier", value: formatMultiplier(source.video.outlierRatio) },
        ]
      : [
          { label: "Channel", value: source.item.channelTitle },
          { label: "Views", value: source.item.viewCount },
          { label: "Channel median views", value: source.item.channelMedianViews },
          { label: "Outlier multiplier", value: formatMultiplier(source.item.outlierRatio) },
        ];

  return (
    <DetailDialog
      open
      onClose={onClose}
      title={video.title}
      description="Details from the current analyzed result. No new data has been fetched."
    >
      <div className="flex flex-col gap-5">
        <div className="aspect-video w-full overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800">
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt=""
              width={640}
              height={360}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div aria-hidden="true" className="h-full w-full bg-zinc-200 dark:bg-zinc-800" />
          )}
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <Metric label="Published" value={new Date(video.publishedAt).toLocaleDateString()} />
          <Metric label="Duration" value={formatDuration(video.durationSeconds)} />
          {detailMetrics.map((metric) => (
            <Metric key={metric.label} label={metric.label} value={metric.value} />
          ))}
          <Metric label="Outlier" value={<OutlierBadge level={video.outlierLevel} />} />
        </dl>
      </div>
    </DetailDialog>
  );
}
