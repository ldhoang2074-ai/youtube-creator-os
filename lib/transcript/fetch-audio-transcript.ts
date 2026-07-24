import "server-only";

import type {
  AudioTranscriptProvider,
  AudioTranscriptProviderPayload,
} from "./audio-provider";
import { AudioTranscriptError } from "./audio-errors";
import { validateAudioFile } from "./audio-file";
import {
  createTranscriptDocument,
  TranscriptDomainError,
} from "./domain";
import { openAiAudioTranscriptProvider } from "./providers/openai-audio";
import type {
  TranscriptDocument,
  TranscriptSegmentInput,
} from "./types";

export const DEFAULT_AUDIO_TRANSCRIPT_TIMEOUT_MS = 120000;
export const MAX_AUDIO_TRANSCRIPT_SEGMENTS = 5000;
export const MAX_AUDIO_TRANSCRIPT_NORMALIZED_CHARACTERS = 500000;

export interface FetchAudioTranscriptOptions {
  readonly provider?: AudioTranscriptProvider;
  readonly timeoutMs?: number;
}

function validateTimeoutMs(timeoutMs: number): void {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new AudioTranscriptError(
      "AUDIO_TRANSCRIPTION_PROVIDER_ERROR",
    );
  }
}

function validateTranscriptLimits(
  segments: unknown,
): asserts segments is TranscriptSegmentInput[] {
  if (!Array.isArray(segments)) {
    throw new AudioTranscriptError(
      "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
    );
  }

  if (segments.length === 0) {
    throw new AudioTranscriptError(
      "AUDIO_TRANSCRIPT_NOT_FOUND",
    );
  }

  if (segments.length > MAX_AUDIO_TRANSCRIPT_SEGMENTS) {
    throw new AudioTranscriptError(
      "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
    );
  }

  let normalizedCharacterCount = 0;

  for (const [index, segment] of segments.entries()) {
    if (
      typeof segment !== "object" ||
      segment === null ||
      !("text" in segment) ||
      typeof segment.text !== "string"
    ) {
      throw new AudioTranscriptError(
        "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
      );
    }

    normalizedCharacterCount += segment.text.trim().length;

    if (index > 0) {
      normalizedCharacterCount += 1;
    }

    if (
      normalizedCharacterCount >
      MAX_AUDIO_TRANSCRIPT_NORMALIZED_CHARACTERS
    ) {
      throw new AudioTranscriptError(
        "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
      );
    }
  }
}

function normalizeProviderPayload(
  payload: AudioTranscriptProviderPayload,
): TranscriptDocument {
  try {
    validateTranscriptLimits(payload.segments);

    return createTranscriptDocument({
      videoId: "audio-upload",
      languageCode: payload.languageCode,
      source: "audio-transcription",
      generationKind: payload.generationKind,
      segments: payload.segments,
    });
  } catch (error) {
    if (error instanceof AudioTranscriptError) {
      throw error;
    }

    if (error instanceof TranscriptDomainError) {
      throw new AudioTranscriptError(
        "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
      );
    }

    throw new AudioTranscriptError(
      "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
    );
  }
}

async function fetchProviderPayload(
  provider: AudioTranscriptProvider,
  file: File,
  timeoutMs: number,
): Promise<AudioTranscriptProviderPayload> {
  const controller = new AbortController();

  let rejectTimeout!: (error: AudioTranscriptError) => void;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    rejectTimeout = reject;
  });

  const timeoutId = setTimeout(() => {
    controller.abort();
    rejectTimeout(
      new AudioTranscriptError("AUDIO_TRANSCRIPTION_TIMEOUT"),
    );
  }, timeoutMs);

  try {
    let payload: AudioTranscriptProviderPayload;

    try {
      payload = await Promise.race([
        provider.transcribe({
          file,
          signal: controller.signal,
        }),
        timeoutPromise,
      ]);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new AudioTranscriptError(
          "AUDIO_TRANSCRIPTION_TIMEOUT",
        );
      }

      if (error instanceof AudioTranscriptError) {
        throw error;
      }

      throw new AudioTranscriptError(
        "AUDIO_TRANSCRIPTION_PROVIDER_ERROR",
      );
    }

    if (controller.signal.aborted) {
      throw new AudioTranscriptError(
        "AUDIO_TRANSCRIPTION_TIMEOUT",
      );
    }

    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchAudioTranscriptDocument(
  value: unknown,
  options: FetchAudioTranscriptOptions = {},
): Promise<TranscriptDocument> {
  const file = validateAudioFile(value);
  const timeoutMs =
    options.timeoutMs ?? DEFAULT_AUDIO_TRANSCRIPT_TIMEOUT_MS;

  validateTimeoutMs(timeoutMs);

  const provider =
    options.provider ?? openAiAudioTranscriptProvider;

  const payload = await fetchProviderPayload(
    provider,
    file,
    timeoutMs,
  );

  return normalizeProviderPayload(payload);
}
