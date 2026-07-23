import { formatTranscriptTimestamp } from "./format-timestamp";
import type {
  TranscriptDocument,
  TranscriptGenerationKind,
} from "./types";

const GENERATION_LABELS: Record<TranscriptGenerationKind, string> = {
  manual: "Manual",
  "auto-generated": "Auto-generated",
  unknown: "Unknown",
};

export function createTranscriptDownloadText(
  transcript: TranscriptDocument,
): string {
  const lines = [
    "YouTube Transcript",
    `Video ID: ${transcript.videoId}`,
    `Language: ${transcript.languageCode}`,
    `Generation: ${GENERATION_LABELS[transcript.generationKind]}`,
    "",
    ...transcript.segments.map(
      (segment) =>
        `[${formatTranscriptTimestamp(segment.startSeconds)}] ${segment.text}`,
    ),
  ];

  return `${lines.join("\n")}\n`;
}

export function createTranscriptDownloadFilename(videoId: string): string {
  return `youtube-transcript-${videoId}.txt`;
}
