"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { isApiErrorBody } from "@/lib/http/api-error";
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
  const [input, setInput] = useState("");
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
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label
          htmlFor="transcript-input"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          YouTube video URL or ID
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="transcript-input"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            disabled={status === "loading"}
            aria-describedby="transcript-input-help"
            className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500 dark:focus:ring-zinc-700"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {status === "loading" ? "Fetching transcript..." : "Fetch transcript"}
          </button>
        </div>
        <p id="transcript-input-help" className="text-sm text-zinc-600 dark:text-zinc-400">
          Supports YouTube watch URLs, youtu.be URLs, Shorts URLs, and raw 11-character video IDs.
        </p>
      </form>

      {status === "loading" ? (
        <p role="status" aria-live="polite" className="text-sm text-zinc-600 dark:text-zinc-300">
          Fetching transcript...
        </p>
      ) : null}

      {status === "error" && feedbackMessage ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 outline-none focus:ring-2 focus:ring-red-400 dark:bg-red-900/20 dark:text-red-300"
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
          className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-5 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">{emptyHeading}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{feedbackMessage}</p>
        </div>
      ) : null}

      {status === "success" && transcript ? (
        <div
          ref={resultRef}
          role="region"
          aria-label="Transcript result"
          tabIndex={-1}
          className="outline-none focus:ring-2 focus:ring-zinc-400"
        >
          <div className="mb-4 flex justify-end">
            <TranscriptDownloadButton transcript={transcript} />
          </div>
          <TranscriptSegmentList transcript={transcript} />
        </div>
      ) : null}
    </div>
  );
}
