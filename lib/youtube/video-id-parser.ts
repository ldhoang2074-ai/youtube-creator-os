const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const SCHEME_PATTERN = /^[A-Za-z][A-Za-z\d+.-]*:/;

type YouTubeHostKind = "standard" | "short" | "nocookie";

const YOUTUBE_VIDEO_HOSTS = Object.freeze([
  { hostname: "youtube.com", kind: "standard" as const },
  { hostname: "www.youtube.com", kind: "standard" as const },
  { hostname: "m.youtube.com", kind: "standard" as const },
  { hostname: "music.youtube.com", kind: "standard" as const },
  { hostname: "youtu.be", kind: "short" as const },
  { hostname: "youtube-nocookie.com", kind: "nocookie" as const },
  { hostname: "www.youtube-nocookie.com", kind: "nocookie" as const },
]);

export type YoutubeVideoReferenceErrorCode =
  | "EMPTY_YOUTUBE_REFERENCE"
  | "INVALID_YOUTUBE_REFERENCE"
  | "UNSUPPORTED_YOUTUBE_HOST"
  | "UNSUPPORTED_YOUTUBE_PATH"
  | "MISSING_VIDEO_ID"
  | "INVALID_VIDEO_ID";

export class YoutubeVideoReferenceError extends Error {
  readonly code: YoutubeVideoReferenceErrorCode;

  constructor(code: YoutubeVideoReferenceErrorCode, message: string) {
    super(message);
    this.name = "YoutubeVideoReferenceError";
    this.code = code;
  }
}

function getHostKind(hostname: string): YouTubeHostKind | undefined {
  return YOUTUBE_VIDEO_HOSTS.find((host) => host.hostname === hostname)?.kind;
}

function invalidReference(): never {
  throw new YoutubeVideoReferenceError(
    "INVALID_YOUTUBE_REFERENCE",
    "Reference must be a raw video ID or an HTTP(S) YouTube video URL",
  );
}

function validateVideoId(candidate: string): string {
  if (!VIDEO_ID_PATTERN.test(candidate)) {
    throw new YoutubeVideoReferenceError(
      "INVALID_VIDEO_ID",
      "Video ID must contain exactly 11 URL-safe characters",
    );
  }
  return candidate;
}

function getRequiredPathVideoId(pathname: string, route: string): string {
  const routePath = `/${route}`;

  if (pathname === routePath || pathname === `${routePath}/`) {
    throw new YoutubeVideoReferenceError("MISSING_VIDEO_ID", "Video ID is missing from the URL path");
  }

  if (!pathname.startsWith(`${routePath}/`)) {
    throw new YoutubeVideoReferenceError(
      "UNSUPPORTED_YOUTUBE_PATH",
      "URL path is not a supported YouTube video route",
    );
  }

  const segments = pathname.slice(routePath.length + 1).split("/");
  const [candidate, trailingSegment] = segments;

  if (candidate.length === 0) {
    throw new YoutubeVideoReferenceError("MISSING_VIDEO_ID", "Video ID is missing from the URL path");
  }
  if (segments.length > 2 || (segments.length === 2 && trailingSegment !== "")) {
    throw new YoutubeVideoReferenceError(
      "UNSUPPORTED_YOUTUBE_PATH",
      "URL path is not a supported YouTube video route",
    );
  }

  return validateVideoId(candidate);
}

function getRawWatchVideoId(search: string): string | undefined {
  const parameters = search.length === 0 ? [] : search.slice(1).split("&");

  for (const parameter of parameters) {
    const separatorIndex = parameter.indexOf("=");
    const key = separatorIndex === -1 ? parameter : parameter.slice(0, separatorIndex);

    if (key === "v") {
      return separatorIndex === -1 ? "" : parameter.slice(separatorIndex + 1);
    }
  }

  return undefined;
}

function parseStandardYouTubeUrl(url: URL): string {
  if (url.pathname === "/watch" || url.pathname === "/watch/") {
    const candidate = getRawWatchVideoId(url.search);
    if (candidate === undefined || candidate.length === 0) {
      throw new YoutubeVideoReferenceError("MISSING_VIDEO_ID", "Video ID is missing from the watch URL");
    }
    return validateVideoId(candidate);
  }

  for (const route of ["shorts", "embed", "live"]) {
    if (url.pathname === `/${route}` || url.pathname.startsWith(`/${route}/`)) {
      return getRequiredPathVideoId(url.pathname, route);
    }
  }

  throw new YoutubeVideoReferenceError(
    "UNSUPPORTED_YOUTUBE_PATH",
    "URL path is not a supported YouTube video route",
  );
}

function parseShortYouTubeUrl(url: URL): string {
  const segments = url.pathname.slice(1).split("/");
  const [candidate, trailingSegment] = segments;

  if (candidate.length === 0) {
    throw new YoutubeVideoReferenceError("MISSING_VIDEO_ID", "Video ID is missing from the short URL");
  }
  if (segments.length > 2 || (segments.length === 2 && trailingSegment !== "")) {
    throw new YoutubeVideoReferenceError(
      "UNSUPPORTED_YOUTUBE_PATH",
      "URL path is not a supported YouTube video route",
    );
  }

  return validateVideoId(candidate);
}

function getRawPath(raw: string): string {
  const nonPathIndex = raw.search(/[?#]/);
  const referenceWithoutQueryOrFragment =
    nonPathIndex === -1 ? raw : raw.slice(0, nonPathIndex);
  let authorityStart = 0;

  if (referenceWithoutQueryOrFragment.startsWith("//")) {
    authorityStart = 2;
  } else {
    const schemeMatch = referenceWithoutQueryOrFragment.match(SCHEME_PATTERN);
    if (
      schemeMatch !== null &&
      referenceWithoutQueryOrFragment.slice(schemeMatch[0].length).startsWith("//")
    ) {
      authorityStart = schemeMatch[0].length + 2;
    }
  }

  const pathStart = referenceWithoutQueryOrFragment.indexOf("/", authorityStart);
  return pathStart === -1 ? "" : referenceWithoutQueryOrFragment.slice(pathStart);
}

function hasUnsafeRawPathSyntax(raw: string): boolean {
  if (raw.includes("\\")) {
    return true;
  }

  return getRawPath(raw).split("/").some((segment) => segment === "." || segment === "..");
}

function parseYouTubeUrl(raw: string): URL {
  let normalizedUrl = raw;

  if (raw.startsWith("//")) {
    normalizedUrl = `https:${raw}`;
  } else if (SCHEME_PATTERN.test(raw)) {
    if (/^https?:/i.test(raw) && !/^https?:\/\//i.test(raw)) {
      return invalidReference();
    }
  } else {
    normalizedUrl = `https://${raw}`;
  }

  let url: URL;
  try {
    url = new URL(normalizedUrl);
  } catch {
    return invalidReference();
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return invalidReference();
  }

  return url;
}

function isRawVideoIdCandidate(value: string): boolean {
  return !value.includes("/") && !value.includes(":") && !value.includes("?") && !value.includes("#");
}

/**
 * Parses an approved YouTube video URL or raw 11-character video ID without
 * making a network request or attempting to canonicalize invalid references.
 */
export function parseYouTubeVideoId(input: string): string {
  const reference = input.trim();

  if (reference.length === 0) {
    throw new YoutubeVideoReferenceError("EMPTY_YOUTUBE_REFERENCE", "YouTube reference must not be empty");
  }

  if (VIDEO_ID_PATTERN.test(reference)) {
    return reference;
  }

  if (isRawVideoIdCandidate(reference)) {
    return validateVideoId(reference);
  }

  if (hasUnsafeRawPathSyntax(reference)) {
    return invalidReference();
  }

  const url = parseYouTubeUrl(reference);
  const hostKind = getHostKind(url.hostname);

  if (hostKind === undefined) {
    throw new YoutubeVideoReferenceError(
      "UNSUPPORTED_YOUTUBE_HOST",
      "URL host is not an approved YouTube video host",
    );
  }

  if (hostKind === "short") {
    return parseShortYouTubeUrl(url);
  }
  if (hostKind === "nocookie") {
    return getRequiredPathVideoId(url.pathname, "embed");
  }
  return parseStandardYouTubeUrl(url);
}
