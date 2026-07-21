import type { OpportunityFeedResult } from "../channel-analyzer/types";
import { parseStoredSessions } from "./guards";
import {
  MAX_SAVED_SESSIONS,
  MAX_SESSION_NAME_LENGTH,
  WORKSPACE_SCHEMA_VERSION,
  type SavedResearchSession,
} from "./types";

export const WORKSPACE_STORAGE_KEY = "youtube-creator-os:research-workspace:v1";

/**
 * Minimal subset of the DOM Storage interface this module depends on.
 * Letting callers inject any compatible object (instead of reaching for
 * `window.localStorage` inside this module) keeps this file testable
 * without jsdom.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Anything shaped like `window` for the purposes of reaching its
 * `localStorage`. Accepting this shape (instead of `Window` directly) keeps
 * `getStorageSafely` testable without a DOM environment.
 */
export interface StorageHost {
  readonly localStorage: StorageLike;
}

/**
 * Safely resolves a StorageLike from a host (typically `window`), never
 * throwing. `host.localStorage` is a property access that can itself throw
 * (e.g. SecurityError in some browsers with storage disabled) *before* any
 * method on it is ever called — reading it directly at a call site (like
 * `saveSession(window.localStorage, ...)`) would crash the component before
 * saveSession's own try/catch ever runs. Routing every access through this
 * function is the single place that risk is contained.
 */
export function getStorageSafely(host: StorageHost | undefined): StorageLike | null {
  if (host === undefined) {
    return null;
  }
  try {
    return host.localStorage ?? null;
  } catch {
    return null;
  }
}

export type ListSessionsResult =
  | { readonly ok: true; readonly sessions: readonly SavedResearchSession[]; readonly skippedCount: number }
  | { readonly ok: false; readonly reason: "storage-unavailable" };

export interface SaveSessionInput {
  readonly name: string;
  readonly inputs: readonly string[];
  readonly result: OpportunityFeedResult;
}

export type SaveSessionFailureReason =
  | "invalid-inputs"
  | "storage-unavailable"
  | "storage-full"
  | "unknown-error";

export type SaveSessionResult =
  | { readonly ok: true; readonly session: SavedResearchSession }
  | { readonly ok: false; readonly reason: SaveSessionFailureReason };

export type DeleteSessionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "storage-unavailable" }
  | { readonly ok: false; readonly reason: "unknown-error" };

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID. Only needs to be
  // unique within this browser's local workspace, not a security token.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSessionName(rawName: string): string {
  const trimmed = rawName.trim();
  const name = trimmed.length > 0 ? trimmed : `Research ${new Date().toLocaleString()}`;
  return name.length > MAX_SESSION_NAME_LENGTH ? name.slice(0, MAX_SESSION_NAME_LENGTH) : name;
}

function normalizeSessionInputs(rawInputs: readonly string[]): string[] | null {
  const trimmed = rawInputs.map((value) => value.trim());
  const isValid =
    trimmed.length >= 2 && trimmed.length <= 5 && trimmed.every((value) => value.length > 0);

  return isValid ? trimmed : null;
}

/**
 * Deterministic "oldest-saved-session eviction": when more than
 * MAX_SAVED_SESSIONS are present, sort by savedAt ascending (tie-broken by
 * id ascending) and drop from the front until at most MAX_SAVED_SESSIONS
 * remain. This is not LRU — opening/viewing a session never changes this
 * order, only savedAt does.
 */
export function applyRetentionPolicy(
  sessions: readonly SavedResearchSession[],
): SavedResearchSession[] {
  if (sessions.length <= MAX_SAVED_SESSIONS) {
    return [...sessions];
  }

  const oldestFirst = [...sessions].sort((a, b) => {
    const savedAtDiff = Date.parse(a.savedAt) - Date.parse(b.savedAt);
    if (savedAtDiff !== 0) {
      return savedAtDiff;
    }
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  return oldestFirst.slice(oldestFirst.length - MAX_SAVED_SESSIONS);
}

function classifyStorageError(error: unknown): "storage-unavailable" | "storage-full" | "unknown-error" {
  if (error instanceof DOMException) {
    if (error.name === "QuotaExceededError") {
      return "storage-full";
    }
    if (error.name === "SecurityError") {
      return "storage-unavailable";
    }
  }
  return "unknown-error";
}

/**
 * Lists saved sessions, newest first for display. This ordering is purely
 * presentational and never feeds back into applyRetentionPolicy.
 */
export function listSessions(storage: StorageLike): ListSessionsResult {
  let raw: string | null;
  try {
    raw = storage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return { ok: false, reason: "storage-unavailable" };
  }

  const { sessions, skippedCount } = parseStoredSessions(raw);
  const newestFirst = [...sessions].sort((a, b) => {
    const savedAtDiff = Date.parse(b.savedAt) - Date.parse(a.savedAt);
    if (savedAtDiff !== 0) {
      return savedAtDiff;
    }
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  return { ok: true, sessions: newestFirst, skippedCount };
}

export function saveSession(storage: StorageLike, input: SaveSessionInput): SaveSessionResult {
  const inputs = normalizeSessionInputs(input.inputs);
  if (inputs === null) {
    return { ok: false, reason: "invalid-inputs" };
  }

  const session: SavedResearchSession = {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    id: createSessionId(),
    name: normalizeSessionName(input.name),
    savedAt: new Date().toISOString(),
    inputs,
    result: input.result,
  };

  let raw: string | null;
  try {
    raw = storage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return { ok: false, reason: "storage-unavailable" };
  }

  const { sessions: existing } = parseStoredSessions(raw);
  const nextSessions = applyRetentionPolicy([...existing, session]);

  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(nextSessions));
  } catch (error) {
    return { ok: false, reason: classifyStorageError(error) };
  }

  return { ok: true, session };
}

export function deleteSession(storage: StorageLike, id: string): DeleteSessionResult {
  let raw: string | null;
  try {
    raw = storage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return { ok: false, reason: "storage-unavailable" };
  }

  const { sessions: existing } = parseStoredSessions(raw);
  const remaining = existing.filter((session) => session.id !== id);

  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(remaining));
  } catch (error) {
    const reason = classifyStorageError(error);
    return { ok: false, reason: reason === "storage-full" ? "unknown-error" : reason };
  }

  return { ok: true };
}
