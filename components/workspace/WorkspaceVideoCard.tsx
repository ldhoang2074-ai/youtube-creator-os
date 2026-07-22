import { OutlierBadge } from "@/components/channel-analyzer/OutlierBadge";
import { VideoCardBase } from "@/components/video/VideoCardBase";
import type { OpportunityFeedItem } from "@/lib/channel-analyzer/types";

interface WorkspaceVideoCardProps {
  readonly item: OpportunityFeedItem;
  readonly onViewDetails?: (item: OpportunityFeedItem) => void;
}

export function WorkspaceVideoCard({ item, onViewDetails }: WorkspaceVideoCardProps) {
  return (
    <VideoCardBase
      videoId={item.videoId}
      title={item.title}
      thumbnailUrl={item.thumbnailUrl}
      publishedAt={item.publishedAt}
      durationSeconds={item.durationSeconds}
      metrics={[
        { label: "Channel", value: item.channelTitle },
        { label: "Views", value: item.viewCount },
        { label: "Channel median views", value: item.channelMedianViews },
        { label: "Outlier multiplier", value: `${item.outlierRatio.toFixed(1)}×` },
        { label: "Outlier", value: <OutlierBadge level={item.outlierLevel} /> },
      ]}
      detailAction={
        onViewDetails ? (
          <button
            type="button"
            aria-label={`View details for ${item.title}`}
            onClick={() => onViewDetails(item)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100"
          >
            View details
          </button>
        ) : undefined
      }
    />
  );
}
