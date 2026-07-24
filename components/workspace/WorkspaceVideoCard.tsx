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
            className="w-full rounded-ui-control border border-ui-border bg-ui-panel px-ui-3 py-ui-2 text-ui-body-sm font-semibold text-ui-text-secondary outline-none transition-colors hover:bg-ui-surface-muted hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel-elevated"
          >
            View details
          </button>
        ) : undefined
      }
    />
  );
}
