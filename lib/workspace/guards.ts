import type {
  OpportunityFeedFailure,
  OpportunityFeedItem,
  OpportunityFeedResult,
} from "../channel-analyzer/types";
import {
  MAX_SESSION_NAME_LENGTH,
  WORKSPACE_SCHEMA_VERSION,
  type SavedResearchSession,
} from "./types";

const MIN_SESSION_INPUTS = 2;
const MAX_SESSION_INPUTS = 5;

// Requires a full ISO 8601 datetime: date + "T" + time + either "Z" or a
// numeric UTC offset. Rejects bare dates ("2021-01-01"), epoch-like
// numbers-as-strings ("0"), and anything else that isn't shaped like a
// real datetime, even if Date.parse would otherwise be lenient about it.
const ISO_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isIsoDateTimeString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ISO_DATETIME_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isValidOpportunityFeedItem(value: unknown): value is OpportunityFeedItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;

  return (
    isNonEmptyString(item.videoId) &&
    typeof item.title === "string" &&
    (item.thumbnailUrl === null || typeof item.thumbnailUrl === "string") &&
    isIsoDateTimeString(item.publishedAt) &&
    isFiniteNonNegativeNumber(item.durationSeconds) &&
    isFiniteNonNegativeNumber(item.viewCount) &&
    isNonEmptyString(item.channelId) &&
    typeof item.channelTitle === "string" &&
    isFiniteNonNegativeNumber(item.channelMedianViews) &&
    typeof item.outlierRatio === "number" &&
    Number.isFinite(item.outlierRatio) &&
    item.outlierRatio >= 2 &&
    (item.outlierLevel === "outlier" || item.outlierLevel === "strong-outlier")
  );
}

function isValidOpportunityFeedFailure(value: unknown): value is OpportunityFeedFailure {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const failure = value as Record<string, unknown>;

  if (!isNonEmptyString(failure.input)) {
    return false;
  }

  if (typeof failure.error !== "object" || failure.error === null) {
    return false;
  }
  const error = failure.error as Record<string, unknown>;

  return typeof error.code === "string" && typeof error.message === "string";
}

function isValidOpportunityFeedResult(value: unknown): value is OpportunityFeedResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const result = value as Record<string, unknown>;

  return (
    Array.isArray(result.items) &&
    result.items.every(isValidOpportunityFeedItem) &&
    Array.isArray(result.failures) &&
    result.failures.every(isValidOpportunityFeedFailure)
  );
}

function isValidSessionInputs(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length >= MIN_SESSION_INPUTS &&
    value.length <= MAX_SESSION_INPUTS &&
    value.every((entry) => isNonEmptyString(entry))
  );
}

export function isValidSavedResearchSession(value: unknown): value is SavedResearchSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const session = value as Record<string, unknown>;

  return (
    session.schemaVersion === WORKSPACE_SCHEMA_VERSION &&
    isNonEmptyString(session.id) &&
    isNonEmptyString(session.name) &&
    session.name.length <= MAX_SESSION_NAME_LENGTH &&
    isIsoDateTimeString(session.savedAt) &&
    isValidSessionInputs(session.inputs) &&
    isValidOpportunityFeedResult(session.result)
  );
}

export interface ParsedSessionsResult {
  readonly sessions: readonly SavedResearchSession[];
  readonly skippedCount: number;
}

/**
 * Parses the raw string read from localStorage into a list of trusted
 * SavedResearchSession records. Never throws: invalid JSON, a non-array
 * root, or any individual malformed record all resolve to a safe result
 * instead of propagating an exception. localStorage data is never trusted
 * just because this app is the one that wrote it.
 */
export function parseStoredSessions(raw: string | null): ParsedSessionsResult {
  if (raw === null) {
    return { sessions: [], skippedCount: 0 };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { sessions: [], skippedCount: 0 };
  }

  if (!Array.isArray(parsed)) {
    return { sessions: [], skippedCount: 0 };
  }

  const sessions = parsed.filter(isValidSavedResearchSession);

  return { sessions, skippedCount: parsed.length - sessions.length };
}
