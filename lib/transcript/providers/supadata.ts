import "server-only";

import { z } from "zod";
import { TranscriptError } from "../errors";
import type {
  TranscriptProvider,
  TranscriptProviderPayload,
  TranscriptProviderRequest,
} from "../provider";

const SUPADATA_TRANSCRIPT_ENDPOINT = "https://api.supadata.ai/v1/transcript";

const supadataSegmentSchema = z.object({
  text: z.string().refine((text) => text.trim().length > 0),
  offset: z.number().finite().nonnegative(),
  duration: z.number().finite().nonnegative(),
  lang: z.string(),
});

const supadataTranscriptSchema = z.object({
  content: z.array(supadataSegmentSchema),
  lang: z.string().trim().min(1),
  availableLangs: z.array(z.string()),
});

const supadataJobSchema = z.object({
  jobId: z.string().trim().min(1),
});

const supadataUnavailableSchema = z.object({
  error: z.literal("transcript-unavailable"),
});

function getApiKey(): string {
  const apiKey = process.env.SUPADATA_API_KEY?.trim();
  if (!apiKey) {
    throw new TranscriptError("MISSING_TRANSCRIPT_PROVIDER_CONFIGURATION");
  }
  return apiKey;
}

function buildRequestUrl(videoId: string): string {
  const canonicalVideoUrl = new URL("https://www.youtube.com/watch");
  canonicalVideoUrl.searchParams.set("v", videoId);

  const requestUrl = new URL(SUPADATA_TRANSCRIPT_ENDPOINT);
  requestUrl.searchParams.set("url", canonicalVideoUrl.toString());
  requestUrl.searchParams.set("text", "false");
  requestUrl.searchParams.set("mode", "native");
  return requestUrl.toString();
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new TranscriptError("INVALID_PROVIDER_RESPONSE");
  }
}

async function fetchSupadataTranscript(
  request: TranscriptProviderRequest,
): Promise<TranscriptProviderPayload> {
  const apiKey = getApiKey();
  let response: Response;

  try {
    response = await fetch(buildRequestUrl(request.videoId), {
      method: "GET",
      headers: { "x-api-key": apiKey },
      signal: request.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError" && request.signal.aborted) {
      throw new TranscriptError("TRANSCRIPT_PROVIDER_TIMEOUT");
    }
    throw new TranscriptError("TRANSCRIPT_PROVIDER_ERROR");
  }

  if (response.status === 404) {
    throw new TranscriptError("TRANSCRIPT_NOT_FOUND");
  }

  if (!response.ok) {
    throw new TranscriptError("TRANSCRIPT_PROVIDER_ERROR");
  }

  const rawBody = await parseJson(response);

  if (response.status === 202) {
    if (!supadataJobSchema.safeParse(rawBody).success) {
      throw new TranscriptError("INVALID_PROVIDER_RESPONSE");
    }
    throw new TranscriptError("TRANSCRIPT_PROVIDER_ERROR");
  }

  if (response.status === 206) {
    if (supadataUnavailableSchema.safeParse(rawBody).success) {
      throw new TranscriptError("TRANSCRIPT_UNAVAILABLE");
    }
    throw new TranscriptError("INVALID_PROVIDER_RESPONSE");
  }

  if (response.status !== 200) {
    throw new TranscriptError("INVALID_PROVIDER_RESPONSE");
  }

  const parsed = supadataTranscriptSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new TranscriptError("INVALID_PROVIDER_RESPONSE");
  }

  if (parsed.data.content.length === 0) {
    throw new TranscriptError("TRANSCRIPT_NOT_FOUND");
  }

  const segments = parsed.data.content.map((segment) =>
    Object.freeze({
      startSeconds: segment.offset / 1000,
      durationSeconds: segment.duration / 1000,
      text: segment.text.trim(),
    }),
  );

  return Object.freeze({
    languageCode: parsed.data.lang,
    generationKind: "unknown",
    segments: Object.freeze(segments),
  });
}

export const supadataTranscriptProvider: TranscriptProvider = Object.freeze({
  id: "supadata",
  fetchTranscript: fetchSupadataTranscript,
});
