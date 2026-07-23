import { NextResponse } from "next/server";
import { z } from "zod";
import { TranscriptError, type TranscriptErrorCode } from "@/lib/transcript/errors";
import { fetchTranscriptDocument } from "@/lib/transcript/fetch-transcript";
import { YoutubeVideoReferenceError } from "@/lib/youtube/video-id-parser";

const requestBodySchema = z
  .object({
    input: z.string().trim().min(1),
  })
  .strict();

const ERROR_STATUS: Record<TranscriptErrorCode, number> = {
  TRANSCRIPT_NOT_FOUND: 404,
  TRANSCRIPT_UNAVAILABLE: 422,
  TRANSCRIPT_PROVIDER_TIMEOUT: 504,
  TRANSCRIPT_PROVIDER_ERROR: 502,
  INVALID_PROVIDER_RESPONSE: 502,
  MISSING_TRANSCRIPT_PROVIDER_CONFIGURATION: 500,
};

function errorResponse(code: string, message: string, status: number): Response {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_INPUT", "Request body must be valid JSON", 400);
  }

  const parsed = requestBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "INVALID_INPUT",
      "Request body must be an object with a non-empty string 'input'",
      400,
    );
  }

  try {
    const transcript = await fetchTranscriptDocument(parsed.data.input);
    return NextResponse.json({ transcript }, { status: 200 });
  } catch (error) {
    if (error instanceof YoutubeVideoReferenceError) {
      return errorResponse(
        "UNSUPPORTED_YOUTUBE_REFERENCE",
        "YouTube reference is not supported",
        400,
      );
    }

    if (error instanceof TranscriptError) {
      return errorResponse(error.code, error.message, ERROR_STATUS[error.code]);
    }

    return errorResponse("UNKNOWN_ERROR", "Unexpected server error", 500);
  }
}
