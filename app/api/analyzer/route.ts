import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeChannel } from "@/lib/channel-analyzer/analyze-channel";
import { YoutubeError, type YoutubeErrorCode } from "@/lib/youtube/errors";

const requestBodySchema = z.object({
  input: z.string().min(1),
});

const ERROR_STATUS: Record<YoutubeErrorCode, number> = {
  INVALID_INPUT: 400,
  UNSUPPORTED_CHANNEL_FORMAT: 400,
  CHANNEL_NOT_FOUND: 404,
  MISSING_API_KEY: 500,
  QUOTA_EXCEEDED: 429,
  TIMEOUT: 504,
  INVALID_RESPONSE_SCHEMA: 502,
  YOUTUBE_API_ERROR: 502,
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
    const report = await analyzeChannel(parsed.data.input);
    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    if (error instanceof YoutubeError) {
      const status = ERROR_STATUS[error.code] ?? 500;
      return errorResponse(error.code, error.message, status);
    }
    // Never surface an unknown error's own message/stack to the client.
    return errorResponse("UNKNOWN_ERROR", "Unexpected server error", 500);
  }
}
