import "server-only";

import { createTranscriptDocument, TranscriptDomainError } from "./domain";
import { TranscriptError } from "./errors";
import type {
  TranscriptProvider,
  TranscriptProviderPayload,
} from "./provider";
import { supadataTranscriptProvider } from "./providers/supadata";
import type { TranscriptDocument, TranscriptSegmentInput } from "./types";
import { parseYouTubeVideoId } from "../youtube/video-id-parser";

export const DEFAULT_TRANSCRIPT_TIMEOUT_MS = 8000;
export const MAX_TRANSCRIPT_SEGMENTS = 5000;
export const MAX_TRANSCRIPT_NORMALIZED_CHARACTERS = 500000;

export interface FetchTranscriptOptions {
  readonly provider?: TranscriptProvider;
  readonly timeoutMs?: number;
}

function validateTimeoutMs(timeoutMs: number): void {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TranscriptError("TRANSCRIPT_PROVIDER_ERROR");
  }
}

function validateTranscriptLimits(segments: unknown): asserts segments is TranscriptSegmentInput[] {
  if (!Array.isArray(segments)) {
    throw new TranscriptError("INVALID_PROVIDER_RESPONSE");
  }

  if (segments.length === 0) {
    throw new TranscriptError("TRANSCRIPT_NOT_FOUND");
  }

  if (segments.length > MAX_TRANSCRIPT_SEGMENTS) {
    throw new TranscriptError("INVALID_PROVIDER_RESPONSE");
  }

  let normalizedCharacterCount = 0;

  for (const [index, segment] of segments.entries()) {
    if (
      typeof segment !== "object" ||
      segment === null ||
      !("text" in segment) ||
      typeof segment.text !== "string"
    ) {
      throw new TranscriptError("INVALID_PROVIDER_RESPONSE");
    }

    normalizedCharacterCount += segment.text.trim().length;
    if (index > 0) {
      normalizedCharacterCount += 1;
    }

    if (normalizedCharacterCount > MAX_TRANSCRIPT_NORMALIZED_CHARACTERS) {
      throw new TranscriptError("INVALID_PROVIDER_RESPONSE");
    }
  }
}

function normalizeProviderPayload(
  videoId: string,
  payload: TranscriptProviderPayload,
): TranscriptDocument {
  try {
    validateTranscriptLimits(payload.segments);

    return createTranscriptDocument({
      videoId,
      languageCode: payload.languageCode,
      source: "youtube-captions",
      generationKind: payload.generationKind,
      segments: payload.segments,
    });
  } catch (error) {
    if (error instanceof TranscriptError) {
      throw error;
    }
    if (error instanceof TranscriptDomainError) {
      throw new TranscriptError("INVALID_PROVIDER_RESPONSE");
    }
    throw new TranscriptError("INVALID_PROVIDER_RESPONSE");
  }
}

async function fetchProviderPayload(
  provider: TranscriptProvider,
  videoId: string,
  timeoutMs: number,
): Promise<TranscriptProviderPayload> {
  const controller = new AbortController();
  let rejectTimeout!: (error: TranscriptError) => void;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    rejectTimeout = reject;
  });
  const timeoutId = setTimeout(() => {
    controller.abort();
    rejectTimeout(new TranscriptError("TRANSCRIPT_PROVIDER_TIMEOUT"));
  }, timeoutMs);

  try {
    let payload: TranscriptProviderPayload;

    try {
      payload = await Promise.race([
        provider.fetchTranscript({ videoId, signal: controller.signal }),
        timeoutPromise,
      ]);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new TranscriptError("TRANSCRIPT_PROVIDER_TIMEOUT");
      }
      if (error instanceof TranscriptError) {
        throw error;
      }
      throw new TranscriptError("TRANSCRIPT_PROVIDER_ERROR");
    }

    if (controller.signal.aborted) {
      throw new TranscriptError("TRANSCRIPT_PROVIDER_TIMEOUT");
    }

    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchTranscriptDocument(
  input: string,
  options: FetchTranscriptOptions = {},
): Promise<TranscriptDocument> {
  const videoId = parseYouTubeVideoId(input);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TRANSCRIPT_TIMEOUT_MS;
  validateTimeoutMs(timeoutMs);

  const provider = options.provider ?? supadataTranscriptProvider;
  const payload = await fetchProviderPayload(provider, videoId, timeoutMs);
  return normalizeProviderPayload(videoId, payload);
}
