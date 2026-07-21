import { YoutubeError } from "./errors";
import type { ParsedChannelInput } from "./types";

const CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{22}$/;
const HANDLE_PATTERN = /^@[A-Za-z0-9._-]{3,30}$/;
const ALLOWED_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

function isChannelId(value: string): boolean {
  return CHANNEL_ID_PATTERN.test(value);
}

function isHandle(value: string): boolean {
  return HANDLE_PATTERN.test(value);
}

export function parseChannelInput(input: string): ParsedChannelInput {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    throw new YoutubeError("INVALID_INPUT", "Channel input must not be empty");
  }

  if (isChannelId(trimmed)) {
    return { kind: "channelId", value: trimmed };
  }

  if (isHandle(trimmed)) {
    return { kind: "handle", value: trimmed };
  }

  return parseChannelUrl(trimmed);
}

function parseChannelUrl(raw: string): ParsedChannelInput {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new YoutubeError("INVALID_INPUT", `Not a valid channel identifier or URL: ${raw}`);
  }

  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new YoutubeError("INVALID_INPUT", `Unsupported host: ${url.hostname}`);
  }

  const segments = url.pathname.split("/").filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    throw new YoutubeError("INVALID_INPUT", "URL does not contain a channel identifier");
  }

  const [first, second] = segments;

  if (first.startsWith("@")) {
    if (isHandle(first)) {
      return { kind: "handle", value: first };
    }
    throw new YoutubeError("INVALID_INPUT", `Invalid handle in URL: ${first}`);
  }

  if (first === "channel") {
    if (second !== undefined && isChannelId(second)) {
      return { kind: "channelId", value: second };
    }
    throw new YoutubeError("INVALID_INPUT", `Invalid channel ID in URL: ${second ?? ""}`);
  }

  if (first === "c" || first === "user") {
    throw new YoutubeError(
      "UNSUPPORTED_CHANNEL_FORMAT",
      `Channel format "/${first}/" is not supported yet`,
    );
  }

  throw new YoutubeError("INVALID_INPUT", `URL is not a recognized channel URL: ${raw}`);
}
