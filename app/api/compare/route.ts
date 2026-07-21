import { NextResponse } from "next/server";
import { z } from "zod";
import { compareChannels } from "@/lib/channel-analyzer/compare-channels";

const requestBodySchema = z.object({
  inputs: z.array(z.string()).min(2).max(5),
});

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
      "Request body must be an object with an 'inputs' array of 2 to 5 strings",
      400,
    );
  }

  const trimmed = parsed.data.inputs.map((value) => value.trim());

  if (trimmed.some((value) => value.length === 0)) {
    return errorResponse(
      "INVALID_INPUT",
      "Channel inputs must not be empty or whitespace-only",
      400,
    );
  }

  if (new Set(trimmed).size !== trimmed.length) {
    return errorResponse("INVALID_INPUT", "Channel inputs must not contain duplicates", 400);
  }

  const result = await compareChannels(trimmed);
  return NextResponse.json(result, { status: 200 });
}
