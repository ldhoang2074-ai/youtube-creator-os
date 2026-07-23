import type { VideoAnalysis } from "@/lib/channel-analyzer/types";
import { VideoCardBase } from "@/components/video/VideoCardBase";
import { OutlierBadge } from "./OutlierBadge";

interface VideoCardProps {
  readonly video: VideoAnalysis;
  readonly onViewDetails?: (video: VideoAnalysis) => void;
}

export function VideoCard({ video, onViewDetails }: VideoCardProps) {
  return (
    <VideoCardBase
      videoId={video.videoId}
      title={video.title}
      thumbnailUrl={video.thumbnailUrl}
      publishedAt={video.publishedAt}
      durationSeconds={video.durationSeconds}
      metrics={[
        { label: "Views", value: video.viewCount ?? "—" },
        { label: "Likes", value: video.likeCount ?? "—" },
        { label: "Comments", value: video.commentCount ?? "—" },
        { label: "Outlier", value: <OutlierBadge level={video.outlierLevel} /> },
      ]}
      detailAction={
        onViewDetails ? (
          <button
            type="button"
            aria-label={`View details for ${video.title}`}
            onClick={() => onViewDetails(video)}
            className="w-full rounded-ui-control border border-ui-border bg-ui-panel px-ui-3 py-ui-2 text-ui-body-sm font-semibold text-ui-text-secondary outline-none transition-colors hover:bg-ui-surface-muted hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel-elevated"
          >
            View details
          </button>
        ) : undefined
      }
    />
  );
}
