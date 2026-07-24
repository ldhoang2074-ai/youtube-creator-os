"use client";

import type { TranscriptDocument } from "@/lib/transcript/types";
import {
  createTranscriptDownloadFilename,
  createTranscriptDownloadText,
} from "@/lib/transcript/create-transcript-download";

interface TranscriptDownloadButtonProps {
  readonly transcript: TranscriptDocument;
}

export function TranscriptDownloadButton({
  transcript,
}: TranscriptDownloadButtonProps) {
  function handleDownload() {
    let objectUrl: string | null = null;
    let anchor: HTMLAnchorElement | null = null;
    let anchorAppended = false;

    try {
      const text = createTranscriptDownloadText(transcript);
      const filename = createTranscriptDownloadFilename(transcript.videoId);
      const blob = new Blob(["\uFEFF", text], {
        type: "text/plain;charset=utf-8",
      });

      objectUrl = URL.createObjectURL(blob);
      anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;

      document.body.appendChild(anchor);
      anchorAppended = true;
      anchor.click();
    } finally {
      try {
        if (anchorAppended && anchor !== null) {
          anchor.remove();
        }
      } finally {
        if (objectUrl !== null) {
          URL.revokeObjectURL(objectUrl);
        }
      }
    }
  }

  return (
    <button
      type="button"
      aria-label="Download transcript as TXT"
      onClick={handleDownload}
      className="w-full rounded-ui-control border border-ui-border bg-ui-panel px-ui-4 py-ui-2 text-ui-body-sm font-semibold text-ui-text-secondary outline-none transition-colors hover:bg-ui-surface-muted hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel sm:w-auto"
    >
      Download TXT
    </button>
  );
}
