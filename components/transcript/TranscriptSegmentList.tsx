import type * as React from "react";

import { formatTranscriptTimestamp } from "@/lib/transcript/format-timestamp";
import type {
  TranscriptDocument,
  TranscriptGenerationKind,
} from "@/lib/transcript/types";

interface TranscriptSegmentListProps {
  readonly transcript: TranscriptDocument;
}

const GENERATION_LABELS: Record<TranscriptGenerationKind, string> = {
  manual: "Manual",
  "auto-generated": "Auto-generated",
  unknown: "Unknown",
};

export function TranscriptSegmentList({
  transcript,
}: TranscriptSegmentListProps): React.ReactElement {
  return (
    <section aria-labelledby="transcript-heading" className="flex min-w-0 flex-col gap-ui-4">
      <div className="flex flex-wrap items-start justify-between gap-ui-3 rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4 sm:p-ui-6">
        <h2
          id="transcript-heading"
          className="text-ui-section font-semibold text-ui-text"
        >
          Transcript
        </h2>

        <dl className="flex flex-wrap gap-ui-2">
          <div className="flex items-center gap-ui-1 rounded-ui-pill border border-ui-border bg-ui-surface-muted px-ui-3 py-ui-1 text-ui-body-sm text-ui-text-secondary">
            <dt className="font-semibold text-ui-text">
              Language:
            </dt>
            <dd>{transcript.languageCode}</dd>
          </div>
          <div className="flex items-center gap-ui-1 rounded-ui-pill border border-ui-border bg-ui-surface-muted px-ui-3 py-ui-1 text-ui-body-sm text-ui-text-secondary">
            <dt className="font-semibold text-ui-text">
              Generation:
            </dt>
            <dd>{GENERATION_LABELS[transcript.generationKind]}</dd>
          </div>
        </dl>
      </div>

      {transcript.segments.length === 0 ? (
        <p className="rounded-ui-panel border border-dashed border-ui-border bg-ui-panel px-ui-4 py-ui-3 text-ui-body-sm text-ui-text-secondary">
          No transcript segments are available.
        </p>
      ) : (
        <ol className="flex min-w-0 max-h-[32rem] flex-col gap-ui-1 overflow-y-auto overflow-x-hidden rounded-ui-panel border border-ui-border bg-ui-panel p-ui-2">
          {transcript.segments.map((segment) => {
            const timestamp = formatTranscriptTimestamp(segment.startSeconds);

            return (
              <li
                key={segment.index}
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-ui-3 rounded-ui-control px-ui-3 py-ui-2 transition-colors hover:bg-ui-surface-muted"
              >
                <span
                  aria-label={`Timestamp ${timestamp}`}
                  className="whitespace-nowrap rounded-ui-pill border border-ui-border bg-ui-surface-muted px-ui-2 py-ui-1 font-mono text-ui-label font-semibold tabular-nums text-ui-text-secondary"
                >
                  {timestamp}
                </span>
                <p className="min-w-0 break-words whitespace-pre-wrap text-ui-body-sm leading-6 text-ui-text-secondary">
                  {segment.text}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
