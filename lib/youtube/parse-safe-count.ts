import { YoutubeError } from "./errors";

const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/;

/**
 * Safely parses a YouTube API count field (viewCount/likeCount/commentCount)
 * from string to number. undefined (field hidden/absent) is a normal case
 * and returns null. A present-but-malformed or unsafely-large value means
 * something is wrong with the response itself, so it throws rather than
 * silently coercing or losing precision.
 */
export function parseSafeYoutubeCount(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  if (!NON_NEGATIVE_INTEGER_PATTERN.test(value)) {
    throw new YoutubeError(
      "INVALID_RESPONSE_SCHEMA",
      `Expected a non-negative integer count, received: ${value}`,
    );
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    throw new YoutubeError(
      "INVALID_RESPONSE_SCHEMA",
      "Count value exceeds the safely representable integer range",
    );
  }

  return parsed;
}
