"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { isApiErrorBody } from "@/lib/http/api-error";
import { usePersistentDraft } from "@/lib/drafts/use-persistent-draft";
import type {
  TranscriptDocument,
  TranscriptGenerationKind,
  TranscriptSegment,
} from "@/lib/transcript/types";
import { TranscriptDownloadButton } from "./TranscriptDownloadButton";
import { TranscriptSegmentList } from "./TranscriptSegmentList";

type Status = "idle" | "loading" | "success" | "empty" | "error";

const GENERATION_KINDS: readonly TranscriptGenerationKind[] = [
  "manual",
  "auto-generated",
  "unknown",
];

const DRAFT_STORAGE_KEY = "youtube-creator-os:draft:transcript:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isTranscriptSegment(value: unknown): value is TranscriptSegment {
  return (
    isRecord(value) &&
    isNonNegativeFiniteNumber(value.index) &&
    isNonNegativeFiniteNumber(value.startSeconds) &&
    isNonNegativeFiniteNumber(value.durationSeconds) &&
    typeof value.text === "string"
  );
}

function isTranscriptDocument(value: unknown): value is TranscriptDocument {
  return (
    isRecord(value) &&
    typeof value.videoId === "string" &&
    typeof value.languageCode === "string" &&
    value.source === "youtube-captions" &&
    typeof value.generationKind === "string" &&
    GENERATION_KINDS.some(
      (generationKind) => generationKind === value.generationKind,
    ) &&
    Array.isArray(value.segments) &&
    value.segments.every(isTranscriptSegment)
  );
}

function isTranscriptSuccessBody(
  value: unknown,
): value is { readonly transcript: TranscriptDocument } {
  return isRecord(value) && isTranscriptDocument(value.transcript);
}

function getSafeApiError(
  value: unknown,
): { readonly code: string; readonly message: string } | null {
  if (!isApiErrorBody(value)) {
    return null;
  }

  const error = value.error;
  if (
    typeof error !== "object" ||
    error === null ||
    typeof error.code !== "string" ||
    typeof error.message !== "string"
  ) {
    return null;
  }

  return { code: error.code, message: error.message };
}

export function TranscriptIntelligenceClient() {
  const [input, setInput] = usePersistentDraft(DRAFT_STORAGE_KEY);
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState<TranscriptDocument | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [emptyHeading, setEmptyHeading] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "error") {
      errorRef.current?.focus();
    } else if (status === "empty") {
      emptyRef.current?.focus();
    } else if (status === "success") {
      resultRef.current?.focus();
    }
  }, [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") {
      return;
    }

    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) {
      setTranscript(null);
      setEmptyHeading(null);
      setStatus("error");
      setFeedbackMessage("Enter a YouTube URL or video ID.");
      return;
    }

    setStatus("loading");
    setTranscript(null);
    setFeedbackMessage(null);
    setEmptyHeading(null);

    let response: Response;
    try {
      response = await fetch("/api/transcript", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: trimmedInput }),
      });
    } catch {
      setStatus("error");
      setTranscript(null);
      setEmptyHeading(null);
      setFeedbackMessage("Could not reach the server. Please try again.");
      return;
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      setStatus("error");
      setTranscript(null);
      setEmptyHeading(null);
      setFeedbackMessage("The server returned an invalid response.");
      return;
    }

    if (!response.ok) {
      const apiError = getSafeApiError(json);
      if (apiError === null) {
        setStatus("error");
        setTranscript(null);
        setEmptyHeading(null);
        setFeedbackMessage("Something went wrong while fetching this transcript.");
        return;
      }

      setTranscript(null);
      setFeedbackMessage(apiError.message);

      if (apiError.code === "TRANSCRIPT_NOT_FOUND") {
        setStatus("empty");
        setEmptyHeading("No transcript found");
        return;
      }

      if (apiError.code === "TRANSCRIPT_UNAVAILABLE") {
        setStatus("empty");
        setEmptyHeading("Transcript unavailable");
        return;
      }

      setStatus("error");
      setEmptyHeading(null);
      return;
    }

    if (!isTranscriptSuccessBody(json)) {
      setStatus("error");
      setTranscript(null);
      setEmptyHeading(null);
      setFeedbackMessage("The server returned an invalid transcript response.");
      return;
    }

    setTranscript(json.transcript);
    setStatus("success");
    setFeedbackMessage(null);
    setEmptyHeading(null);
  }

  return (
    <div className="flex min-w-0 flex-col gap-ui-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-ui-3 rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4 sm:p-ui-6"
      >
        <label
          htmlFor="transcript-input"
          className="text-ui-body-sm font-medium text-ui-text"
        >
          YouTube video URL or ID
        </label>
        <div className="flex flex-col gap-ui-3 sm:flex-row sm:items-center">
          <input
            id="transcript-input"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            disabled={status === "loading"}
            aria-describedby="transcript-input-help"
            className="min-w-0 flex-1 rounded-ui-control border border-ui-border bg-ui-surface-muted px-ui-3 py-ui-2 text-ui-body text-ui-text outline-none placeholder:text-ui-text-muted focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-ui-control bg-ui-accent px-ui-4 py-ui-2 text-ui-body-sm font-semibold text-ui-text transition-colors hover:bg-ui-accent-hover focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {status === "loading" ? "Fetching transcript..." : "Fetch transcript"}
          </button>
        </div>
        <p id="transcript-input-help" className="text-ui-body-sm text-ui-text-muted">
          Supports YouTube watch URLs, youtu.be URLs, Shorts URLs, and raw 11-character video IDs.
        </p>
      </form>

      {status === "loading" ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-ui-3 rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4 text-ui-body-sm text-ui-text-secondary sm:p-ui-6"
        >
          <span
            aria-hidden="true"
            className="size-5 shrink-0 animate-spin rounded-ui-pill border-2 border-ui-border border-t-ui-accent"
          />
          <span>Fetching transcript...</span>
        </div>
      ) : null}

      {status === "error" && feedbackMessage ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-ui-panel border border-ui-danger/40 bg-ui-danger/10 px-ui-4 py-ui-3 text-ui-body-sm text-ui-danger outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
        >
          {feedbackMessage}
        </div>
      ) : null}

      {status === "empty" && emptyHeading && feedbackMessage ? (
        <div
          ref={emptyRef}
          role="status"
          aria-live="polite"
          tabIndex={-1}
          className="rounded-ui-panel border border-dashed border-ui-border bg-ui-panel px-ui-4 py-ui-5 outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
        >
          <h2 className="font-semibold text-ui-text">{emptyHeading}</h2>
          <p className="mt-ui-1 text-ui-body-sm text-ui-text-secondary">{feedbackMessage}</p>
        </div>
      ) : null}

      {status === "success" && transcript ? (
        <div
          ref={resultRef}
          role="region"
          aria-label="Transcript result"
          tabIndex={-1}
          className="flex min-w-0 flex-col gap-ui-4 outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
        >
          <div className="flex flex-col gap-ui-3 sm:flex-row sm:items-center sm:justify-end">
            <TranscriptDownloadButton transcript={transcript} />
          </div>
          <TranscriptSegmentList transcript={transcript} />
        </div>
      ) : null}
    </div>
  );
}
