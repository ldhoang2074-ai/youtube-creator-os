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
      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus:ring-zinc-600"
    >
      Download TXT
    </button>
  );
}
