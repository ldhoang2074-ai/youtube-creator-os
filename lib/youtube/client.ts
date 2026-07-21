import { YoutubeError } from "./errors";
import { googleApiErrorSchema, youtubeChannelsListResponseSchema, type YoutubeChannelItem } from "./schemas";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const DEFAULT_TIMEOUT_MS = 8000;

export interface FetchChannelParams {
  readonly channelId?: string;
  readonly handle?: string;
}

export interface YoutubeClientOptions {
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

function buildChannelsUrl(params: FetchChannelParams): string {
  const url = new URL(`${YOUTUBE_API_BASE_URL}/channels`);
  url.searchParams.set("part", "snippet,statistics,contentDetails");

  if (params.channelId) {
    url.searchParams.set("id", params.channelId);
  } else if (params.handle) {
    url.searchParams.set("forHandle", params.handle);
  } else {
    throw new YoutubeError("INVALID_INPUT", "Either channelId or handle must be provided");
  }

  return url.toString();
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export async function fetchChannel(
  params: FetchChannelParams,
  options: YoutubeClientOptions = {},
): Promise<YoutubeChannelItem | null> {
  const apiKey = getApiKey();
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const requestUrl = buildChannelsUrl(params);

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
    // Do not attach the raw error as `cause`: it may embed the request URL,
    // headers, or other sensitive detail. Only its name is safe to surface.
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

  const parsed = youtubeChannelsListResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new YoutubeError(
      "INVALID_RESPONSE_SCHEMA",
      "YouTube API response did not match the expected schema",
      { cause: parsed.error },
    );
  }

  return parsed.data.items[0] ?? null;
}

async function buildHttpError(response: Response): Promise<YoutubeError> {
  const rawBody: unknown = await response.json().catch(() => undefined);
  const parsedError = googleApiErrorSchema.safeParse(rawBody);
  const reason = parsedError.success ? parsedError.data.error.errors?.[0]?.reason : undefined;

  if (response.status === 403 && reason === "quotaExceeded") {
    return new YoutubeError("QUOTA_EXCEEDED", "YouTube API quota exceeded");
  }

  return new YoutubeError(
    "YOUTUBE_API_ERROR",
    `YouTube API request failed with status ${response.status}`,
  );
}
