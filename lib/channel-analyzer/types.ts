import type { OutlierLevel } from "../analysis/outlier";

export interface VideoAnalysis {
  readonly videoId: string;
  readonly title: string;
  readonly publishedAt: string;
  readonly thumbnailUrl: string | null;
  readonly durationSeconds: number;
  readonly viewCount: number | null;
  readonly likeCount: number | null;
  readonly commentCount: number | null;
  readonly outlierRatio: number | null;
  readonly outlierLevel: OutlierLevel;
}

export interface ChannelAnalysisReport {
  readonly channelId: string;
  readonly title: string;
  readonly thumbnailUrl: string | null;
  readonly subscriberCount: string;
  readonly totalViewCount: string;
  readonly videoCount: string;
  readonly medianViews: number | null;
  readonly analyzedVideoCount: number;
  readonly videos: readonly VideoAnalysis[];
}
