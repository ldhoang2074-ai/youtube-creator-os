import { YoutubeError } from "./errors";

const ISO8601_DURATION_PATTERN = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;

/**
 * Parses the ISO 8601 duration YouTube returns in
 * videos.list contentDetails.duration (e.g. "PT4M13S") into total seconds.
 * Supports days/hours/minutes/seconds, which covers real YouTube video
 * durations (years/months/weeks are not used by YouTube for this field).
 */
export function parseYoutubeDuration(duration: string): number {
  const match = ISO8601_DURATION_PATTERN.exec(duration);

  if (!match) {
    throw new YoutubeError(
      "INVALID_RESPONSE_SCHEMA",
      `Expected an ISO 8601 duration, received: ${duration}`,
    );
  }

  const [, days, hours, minutes, seconds] = match;

  if (days === undefined && hours === undefined && minutes === undefined && seconds === undefined) {
    throw new YoutubeError(
      "INVALID_RESPONSE_SCHEMA",
      `Expected an ISO 8601 duration, received: ${duration}`,
    );
  }

  return (
    Number(days ?? 0) * 86400 +
    Number(hours ?? 0) * 3600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0)
  );
}
