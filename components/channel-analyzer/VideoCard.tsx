import type { VideoAnalysis } from "@/lib/channel-analyzer/types";
import { VideoCardBase } from "@/components/video/VideoCardBase";
import { OutlierBadge } from "./OutlierBadge";

interface VideoCardProps {
  readonly video: VideoAnalysis;
}

export function VideoCard({ video }: VideoCardProps) {
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
    />
  );
}
