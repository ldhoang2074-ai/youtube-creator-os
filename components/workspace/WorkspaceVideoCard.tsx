import { OutlierBadge } from "@/components/channel-analyzer/OutlierBadge";
import { VideoCardBase } from "@/components/video/VideoCardBase";
import type { OpportunityFeedItem } from "@/lib/channel-analyzer/types";

interface WorkspaceVideoCardProps {
  readonly item: OpportunityFeedItem;
}

export function WorkspaceVideoCard({ item }: WorkspaceVideoCardProps) {
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
    />
  );
}
