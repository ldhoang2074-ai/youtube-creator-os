import { NextResponse } from "next/server";

import {
  AudioTranscriptError,
  type AudioTranscriptErrorCode,
} from "@/lib/transcript/audio-errors";
import { fetchAudioTranscriptDocument } from "@/lib/transcript/fetch-audio-transcript";

export const runtime = "nodejs";

const ERROR_STATUS: Record<AudioTranscriptErrorCode, number> = {
  INVALID_AUDIO_FILE: 400,
  UNSUPPORTED_AUDIO_FORMAT: 415,
  AUDIO_FILE_TOO_LARGE: 413,
  AUDIO_TRANSCRIPT_NOT_FOUND: 404,
  AUDIO_TRANSCRIPTION_TIMEOUT: 504,
  AUDIO_TRANSCRIPTION_PROVIDER_ERROR: 502,
  INVALID_AUDIO_TRANSCRIPTION_RESPONSE: 502,
  MISSING_AUDIO_TRANSCRIPTION_CONFIGURATION: 500,
};

function errorResponse(
  code: string,
  message: string,
  status: number,
): Response {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

function invalidUploadResponse(): Response {
  return errorResponse(
    "INVALID_AUDIO_UPLOAD",
    "Request must contain exactly one audio or video file",
    400,
  );
}

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return invalidUploadResponse();
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return invalidUploadResponse();
  }

  const entries = Array.from(formData.entries());

  if (entries.length !== 1) {
    return invalidUploadResponse();
  }

  const [fieldName, value] = entries[0];

  if (fieldName !== "file" || !(value instanceof File)) {
    return invalidUploadResponse();
  }

  try {
    const transcript = await fetchAudioTranscriptDocument(value);

    return NextResponse.json(
      {
        transcript,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof AudioTranscriptError) {
      return errorResponse(
        error.code,
        error.message,
        ERROR_STATUS[error.code],
      );
    }

    return errorResponse(
      "UNKNOWN_ERROR",
      "Unexpected server error",
      500,
    );
  }
}
