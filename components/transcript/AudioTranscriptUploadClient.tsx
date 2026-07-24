"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { isApiErrorBody } from "@/lib/http/api-error";
import type {
  TranscriptDocument,
  TranscriptGenerationKind,
  TranscriptSegment,
} from "@/lib/transcript/types";
import { TranscriptDownloadButton } from "./TranscriptDownloadButton";
import { TranscriptSegmentList } from "./TranscriptSegmentList";

type Status = "idle" | "loading" | "success" | "empty" | "error";

const ACCEPTED_EXTENSIONS =
  ".flac,.mp3,.mp4,.mpeg,.mpga,.m4a,.ogg,.wav,.webm";
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const GENERATION_KINDS: readonly TranscriptGenerationKind[] = [
  "manual",
  "auto-generated",
  "unknown",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function isTranscriptSegment(
  value: unknown,
): value is TranscriptSegment {
  return (
    isRecord(value) &&
    isNonNegativeFiniteNumber(value.index) &&
    isNonNegativeFiniteNumber(value.startSeconds) &&
    isNonNegativeFiniteNumber(value.durationSeconds) &&
    typeof value.text === "string"
  );
}

function isAudioTranscriptDocument(
  value: unknown,
): value is TranscriptDocument {
  return (
    isRecord(value) &&
    typeof value.videoId === "string" &&
    typeof value.languageCode === "string" &&
    value.source === "audio-transcription" &&
    typeof value.generationKind === "string" &&
    GENERATION_KINDS.some(
      (kind) => kind === value.generationKind,
    ) &&
    Array.isArray(value.segments) &&
    value.segments.every(isTranscriptSegment)
  );
}

function isSuccessBody(
  value: unknown,
): value is { readonly transcript: TranscriptDocument } {
  return (
    isRecord(value) &&
    isAudioTranscriptDocument(value.transcript)
  );
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

  return {
    code: error.code,
    message: error.message,
  };
}

export function AudioTranscriptUploadClient() {
  const [selectedFile, setSelectedFile] = useState<File | null>(
    null,
  );
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] =
    useState<TranscriptDocument | null>(null);
  const [feedbackMessage, setFeedbackMessage] =
    useState<string | null>(null);

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

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.currentTarget.files?.[0] ?? null;

    setSelectedFile(file);
    setTranscript(null);
    setFeedbackMessage(null);
    setStatus("idle");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (status === "loading" || selectedFile === null) {
      return;
    }

    if (selectedFile.size > MAX_FILE_BYTES) {
      setTranscript(null);
      setStatus("error");
      setFeedbackMessage(
        "The selected file exceeds the 25 MiB limit.",
      );
      return;
    }

    setStatus("loading");
    setTranscript(null);
    setFeedbackMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    let response: Response;

    try {
      response = await fetch("/api/transcript/audio", {
        method: "POST",
        body: formData,
      });
    } catch {
      setStatus("error");
      setFeedbackMessage(
        "Could not reach the server. Please try again.",
      );
      return;
    }

    let json: unknown;

    try {
      json = await response.json();
    } catch {
      setStatus("error");
      setFeedbackMessage(
        "The server returned an invalid response.",
      );
      return;
    }

    if (!response.ok) {
      const apiError = getSafeApiError(json);

      if (apiError === null) {
        setStatus("error");
        setFeedbackMessage(
          "Something went wrong while transcribing this file.",
        );
        return;
      }

      setFeedbackMessage(apiError.message);

      if (apiError.code === "AUDIO_TRANSCRIPT_NOT_FOUND") {
        setStatus("empty");
        return;
      }

      setStatus("error");
      return;
    }

    if (!isSuccessBody(json)) {
      setStatus("error");
      setFeedbackMessage(
        "The server returned an invalid transcript response.",
      );
      return;
    }

    setTranscript(json.transcript);
    setFeedbackMessage(null);
    setStatus("success");
  }

  return (
    <div className="flex min-w-0 flex-col gap-ui-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-ui-3 rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4 sm:p-ui-6"
      >
        <label
          htmlFor="audio-transcript-file"
          className="text-ui-body-sm font-medium text-ui-text"
        >
          Audio or video file
        </label>

        <div className="flex flex-col gap-ui-3 sm:flex-row sm:items-center">
          <input
            id="audio-transcript-file"
            name="file"
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            aria-describedby="audio-transcript-file-help"
            disabled={status === "loading"}
            onChange={handleFileChange}
            className="min-w-0 flex-1 rounded-ui-control border border-ui-border bg-ui-surface-muted px-ui-3 py-ui-2 text-ui-body-sm text-ui-text file:mr-ui-3 file:rounded-ui-control file:border-0 file:bg-ui-accent file:px-ui-3 file:py-ui-1 file:font-semibold file:text-ui-text disabled:cursor-not-allowed disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={
              selectedFile === null || status === "loading"
            }
            className="w-full rounded-ui-control bg-ui-accent px-ui-4 py-ui-2 text-ui-body-sm font-semibold text-ui-text transition-colors hover:bg-ui-accent-hover focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {status === "loading"
              ? "Transcribing file..."
              : "Transcribe file"}
          </button>
        </div>

        <p
          id="audio-transcript-file-help"
          className="text-ui-body-sm text-ui-text-muted"
        >
          Supports FLAC, MP3, MP4, MPEG, MPGA, M4A, OGG, WAV,
          and WEBM files up to 25 MiB.
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
          <span>Transcribing file...</span>
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

      {status === "empty" && feedbackMessage ? (
        <div
          ref={emptyRef}
          role="status"
          aria-live="polite"
          tabIndex={-1}
          className="rounded-ui-panel border border-dashed border-ui-border bg-ui-panel px-ui-4 py-ui-5 outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
        >
          <h2 className="font-semibold text-ui-text">
            No speech transcript found
          </h2>
          <p className="mt-ui-1 text-ui-body-sm text-ui-text-secondary">
            {feedbackMessage}
          </p>
        </div>
      ) : null}

      {status === "success" && transcript ? (
        <div
          ref={resultRef}
          role="region"
          aria-label="Audio transcript result"
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
