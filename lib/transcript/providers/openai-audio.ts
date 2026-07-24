import "server-only";

import { z } from "zod";

import { AudioTranscriptError } from "../audio-errors";
import type {
  AudioTranscriptProvider,
  AudioTranscriptProviderPayload,
  AudioTranscriptProviderRequest,
} from "../audio-provider";

const OPENAI_TRANSCRIPTION_ENDPOINT =
  "https://api.openai.com/v1/audio/transcriptions";

const openAiSegmentSchema = z
  .object({
    start: z.number().finite().nonnegative(),
    end: z.number().finite().nonnegative(),
    text: z.string().refine((text) => text.trim().length > 0),
  })
  .refine((segment) => segment.end >= segment.start);

const openAiTranscriptSchema = z.object({
  language: z.string().trim().min(1),
  segments: z.array(openAiSegmentSchema),
});

function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new AudioTranscriptError(
      "MISSING_AUDIO_TRANSCRIPTION_CONFIGURATION",
    );
  }

  return apiKey;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new AudioTranscriptError(
      "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
    );
  }
}

async function transcribeOpenAiAudio(
  request: AudioTranscriptProviderRequest,
): Promise<AudioTranscriptProviderPayload> {
  const apiKey = getApiKey();
  const formData = new FormData();

  formData.append("file", request.file);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");

  let response: Response;

  try {
    response = await fetch(OPENAI_TRANSCRIPTION_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: request.signal,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError" &&
      request.signal.aborted
    ) {
      throw new AudioTranscriptError(
        "AUDIO_TRANSCRIPTION_TIMEOUT",
      );
    }

    throw new AudioTranscriptError(
      "AUDIO_TRANSCRIPTION_PROVIDER_ERROR",
    );
  }

  if (!response.ok) {
    throw new AudioTranscriptError(
      "AUDIO_TRANSCRIPTION_PROVIDER_ERROR",
    );
  }

  const rawBody = await parseJson(response);
  const parsed = openAiTranscriptSchema.safeParse(rawBody);

  if (!parsed.success) {
    throw new AudioTranscriptError(
      "INVALID_AUDIO_TRANSCRIPTION_RESPONSE",
    );
  }

  if (parsed.data.segments.length === 0) {
    throw new AudioTranscriptError(
      "AUDIO_TRANSCRIPT_NOT_FOUND",
    );
  }

  const segments = parsed.data.segments.map((segment) =>
    Object.freeze({
      startSeconds: segment.start,
      durationSeconds: segment.end - segment.start,
      text: segment.text.trim(),
    }),
  );

  return Object.freeze({
    languageCode: parsed.data.language,
    generationKind: "auto-generated",
    segments: Object.freeze(segments),
  });
}

export const openAiAudioTranscriptProvider: AudioTranscriptProvider =
  Object.freeze({
    id: "openai-audio",
    transcribe: transcribeOpenAiAudio,
  });
