import { formatTranscriptTimestamp } from "./format-timestamp";
import type { TranscriptDocument } from "./types";

export function createTranscriptDownloadText(
  transcript: TranscriptDocument,
): string {
  const text = transcript.segments
    .map(
      (segment) =>
        `[${formatTranscriptTimestamp(segment.startSeconds)}] ${segment.text}`,
    )
    .join("\n");

  return text.length === 0 ? "" : `${text}\n`;
}

export function createTranscriptDownloadFilename(
  transcript: TranscriptDocument,
): string {
  if (transcript.source === "audio-transcription") {
    return "audio-transcript.txt";
  }

  return `youtube-transcript-${transcript.videoId}.txt`;
}
