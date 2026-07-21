import type { ZodType } from "zod";
import { YoutubeError } from "./errors";
import { googleApiErrorSchema } from "./schemas";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const DEFAULT_TIMEOUT_MS = 8000;

export interface YoutubeRequestOptions {
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

function getApiKey(): string {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new YoutubeError("MISSING_API_KEY", "YOUTUBE_API_KEY is not set");
  }
  return apiKey;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function buildUrl(path: string, searchParams: Record<string, string>): string {
  const url = new URL(`${YOUTUBE_API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function parseErrorReason(response: Response): Promise<string | undefined> {
  const rawBody: unknown = await response.json().catch(() => undefined);
  const parsedError = googleApiErrorSchema.safeParse(rawBody);
  return parsedError.success ? parsedError.data.error.errors?.[0]?.reason : undefined;
}

async function buildHttpError(response: Response): Promise<YoutubeError> {
  const reason = await parseErrorReason(response);

  if (response.status === 403 && reason === "quotaExceeded") {
    return new YoutubeError("QUOTA_EXCEEDED", "YouTube API quota exceeded");
  }

  return new YoutubeError(
    "YOUTUBE_API_ERROR",
    `YouTube API request failed with status ${response.status}`,
  );
}

/**
 * Shared GET helper for all YouTube Data API v3 endpoints used by this app.
 * Reads the API key lazily (only when actually invoked), sends it via the
 * x-goog-api-key header (never in the URL), and never attaches a raw
 * network error as `cause` since it may embed the request URL or headers.
 */
export async function youtubeApiGet<T>(
  path: string,
  searchParams: Record<string, string>,
  schema: ZodType<T>,
  options: YoutubeRequestOptions = {},
): Promise<T> {
  const apiKey = getApiKey();
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const requestUrl = buildUrl(path, searchParams);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(requestUrl, {
      signal: controller.signal,
      headers: { "x-goog-api-key": apiKey },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new YoutubeError("TIMEOUT", `YouTube API request timed out after ${timeoutMs}ms`);
    }
    throw new YoutubeError(
      "YOUTUBE_API_ERROR",
      `Failed to reach YouTube API (${describeError(error)})`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw await buildHttpError(response);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new YoutubeError("INVALID_RESPONSE_SCHEMA", "YouTube API response was not valid JSON", {
      cause: error,
    });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new YoutubeError(
      "INVALID_RESPONSE_SCHEMA",
      "YouTube API response did not match the expected schema",
      { cause: parsed.error },
    );
  }

  return parsed.data;
}
