/**
 * Minimal subset of the DOM Storage interface this module depends on.
 * Accepting any compatible object (instead of reaching for
 * `window.localStorage` inside this module) keeps this file testable
 * without a DOM environment.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Anything shaped like `window` for the purposes of reaching its
 * `localStorage`. Accepting this shape (instead of `Window` directly) keeps
 * `getStorageSafely` testable without a DOM environment, and lets callers
 * pass `undefined` during server rendering instead of touching `window`.
 */
export interface StorageHost {
  readonly localStorage: StorageLike;
}

/**
 * Safely resolves a StorageLike from a host (typically `window`), never
 * throwing. `host.localStorage` is a property access that can itself throw
 * (e.g. SecurityError with storage disabled/blocked) *before* any method on
 * it is ever called, so routing every access through this function is the
 * single place that risk is contained.
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

/**
 * Reads a draft value, never throwing. Returns `null` when nothing is
 * stored or when storage access itself fails.
 */
export function readDraft(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Persists a draft value, never throwing. A blank (whitespace-only) value
 * removes the key entirely instead of storing an empty string, so a
 * fully-cleared input leaves no trace in localStorage.
 */
export function writeDraft(storage: StorageLike, key: string, value: string): void {
  try {
    if (value.trim().length === 0) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, value);
    }
  } catch {
    // Storage may be full, blocked, or otherwise unavailable. Drafts are
    // best-effort and must never break the input experience.
  }
}

export type DraftRestoreAction =
  | { readonly kind: "keep" }
  | { readonly kind: "restore"; readonly value: string }
  | { readonly kind: "persist"; readonly value: string };

/**
 * Decides what should happen to a draft field on mount, given an optional
 * caller-supplied value that must take priority over any stored draft (e.g.
 * Opportunity Feed's `initialInputs` from the query string or Workspace).
 *
 * - `priorityValue` non-empty: it wins outright, and must overwrite whatever
 *   draft was previously stored ("persist").
 * - otherwise, a non-empty stored draft should be applied to the field
 *   ("restore").
 * - otherwise there is nothing to do ("keep").
 */
export function resolveDraftRestore(
  priorityValue: string,
  storedValue: string | null,
): DraftRestoreAction {
  if (priorityValue.length > 0) {
    return { kind: "persist", value: priorityValue };
  }
  if (storedValue !== null && storedValue.length > 0) {
    return { kind: "restore", value: storedValue };
  }
  return { kind: "keep" };
}
