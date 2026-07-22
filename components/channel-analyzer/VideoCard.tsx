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
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100"
          >
            View details
          </button>
        ) : undefined
      }
    />
  );
}
