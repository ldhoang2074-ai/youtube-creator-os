"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  deleteSession,
  getStorageSafely,
  listSessions,
  WORKSPACE_STORAGE_KEY,
  type ListSessionsResult,
  type StorageHost,
} from "@/lib/workspace/storage";
import { OpportunityFeedTable } from "@/components/opportunity-feed/OpportunityFeedTable";

const SERVER_SNAPSHOT: ListSessionsResult = { ok: true, sessions: [], skippedCount: 0 };
const STORAGE_UNAVAILABLE_SNAPSHOT: ListSessionsResult = {
  ok: false,
  reason: "storage-unavailable",
};

let cachedRawValue: string | null | undefined;
let cachedSnapshot: ListSessionsResult = SERVER_SNAPSHOT;

function getWindowHost(): StorageHost | undefined {
  return typeof window === "undefined" ? undefined : window;
}

/**
 * Reads localStorage through the same lib/workspace/storage.ts contract
 * used everywhere else, but only recomputes when the raw stored string has
 * actually changed — useSyncExternalStore requires getSnapshot to return a
 * stable reference when nothing changed, or React re-renders forever. When
 * storage is unavailable it always returns the same
 * STORAGE_UNAVAILABLE_SNAPSHOT reference for the same reason.
 */
function getSnapshot(): ListSessionsResult {
  const storage = getStorageSafely(getWindowHost());
  if (storage === null) {
    return STORAGE_UNAVAILABLE_SNAPSHOT;
  }

  let raw: string | null;
  try {
    raw = storage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return STORAGE_UNAVAILABLE_SNAPSHOT;
  }

  if (raw === cachedRawValue) {
    return cachedSnapshot;
  }
  cachedRawValue = raw;
  cachedSnapshot = listSessions(storage);
  return cachedSnapshot;
}

function getServerSnapshot(): ListSessionsResult {
  return SERVER_SNAPSHOT;
}

function subscribe(onStoreChange: () => void): () => void {
  // Fires for changes made in *other* tabs/windows of the same origin.
  // Same-tab writes (Save/Delete here) are reflected via the explicit
  // refreshSnapshot() call below instead, since the native "storage" event
  // never fires in the tab that made the change.
  function handleStorageEvent(event: StorageEvent) {
    // event.key === null means the whole storage area was cleared; only
    // react to that or to changes on this app's own key.
    if (event.key === WORKSPACE_STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  }
  window.addEventListener("storage", handleStorageEvent);
  return () => window.removeEventListener("storage", handleStorageEvent);
}

function buildOpportunitiesHref(inputs: readonly string[]): string {
  const params = new URLSearchParams();
  for (const input of inputs) {
    params.append("channel", input);
  }
  return `/opportunities?${params.toString()}`;
}

interface DeleteError {
  readonly sessionId: string;
  readonly message: string;
}

export function WorkspaceClient() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [, setRefreshTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<DeleteError | null>(null);

  const isInitialServerSnapshot = snapshot === SERVER_SNAPSHOT;

  function refreshSnapshot() {
    cachedRawValue = undefined; // force the next getSnapshot() call to re-read
    setRefreshTick((tick) => tick + 1); // force a re-render so it actually happens
  }

  function handleSelect(id: string) {
    setSelectedId((current) => (current === id ? null : id));
    setPendingDeleteId(null);
  }

  function handleRequestDelete(id: string) {
    setPendingDeleteId(id);
    setDeleteError(null);
  }

  function handleCancelDelete() {
    setPendingDeleteId(null);
    setDeleteError(null);
  }

  function handleConfirmDelete(id: string) {
    const storage = getStorageSafely(getWindowHost());
    if (storage === null) {
      setDeleteError({ sessionId: id, message: "Saving is not available in this browser session." });
      return;
    }

    const outcome = deleteSession(storage, id);

    if (!outcome.ok) {
      setDeleteError({
        sessionId: id,
        message:
          outcome.reason === "storage-unavailable"
            ? "Saving is not available in this browser session."
            : "Could not delete this saved research. Please try again.",
      });
      return;
    }

    setPendingDeleteId(null);
    setDeleteError(null);
    setSelectedId((current) => (current === id ? null : current));
    refreshSnapshot();
  }

  if (isInitialServerSnapshot) {
    return (
      <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
        Loading saved research...
      </p>
    );
  }

  if (!snapshot.ok) {
    return (
      <p role="alert" className="text-sm text-red-700 dark:text-red-300">
        Saving is not available in this browser session.
      </p>
    );
  }

  const { sessions, skippedCount } = snapshot;

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {skippedCount > 0 ? (
          <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
            Some saved research could not be loaded and was skipped.
          </p>
        ) : null}
        <div className="rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Nothing saved yet. Save a result from the Opportunity Feed to see it here.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {skippedCount > 0 ? (
        <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
          Some saved research could not be loaded and was skipped.
        </p>
      ) : null}

      <ul className="flex flex-col gap-4">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <button
                  type="button"
                  onClick={() => handleSelect(session.id)}
                  className="text-left text-base font-semibold text-zinc-950 hover:underline dark:text-zinc-50"
                >
                  {session.name}
                </button>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Saved {new Date(session.savedAt).toLocaleString()} ·{" "}
                  {session.inputs.length} channels · {session.result.items.length} videos
                  {session.result.failures.length > 0
                    ? ` · ${session.result.failures.length} failed`
                    : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={buildOpportunitiesHref(session.inputs)}
                  prefetch={false}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
                >
                  Open these channels in Opportunity Feed
                </Link>

                {pendingDeleteId === session.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-700 dark:text-red-300">
                      Delete this saved research?
                    </span>
                    <button
                      type="button"
                      onClick={() => handleConfirmDelete(session.id)}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
                    >
                      Confirm delete
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelDelete}
                      className="text-sm text-zinc-700 underline underline-offset-2 dark:text-zinc-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestDelete(session.id)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-red-700 dark:border-zinc-700 dark:text-red-300"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {deleteError && deleteError.sessionId === session.id ? (
              <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
                {deleteError.message}
              </p>
            ) : null}

            {selectedId === session.id ? (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Saved on {new Date(session.savedAt).toLocaleString()}. This is a
                  manually saved snapshot, not live data or growth tracking.
                </p>

                {session.result.items.length > 0 ? (
                  <OpportunityFeedTable items={session.result.items} showThumbnails={false} />
                ) : (
                  <div className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
                    No recent analyzed videos reached the 2× outlier threshold.
                  </div>
                )}

                {session.result.failures.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {session.result.failures.map((failure, index) => (
                      <li
                        key={`${failure.input}-${index}`}
                        role="alert"
                        className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"
                      >
                        <span className="font-medium">{failure.input}</span>:{" "}
                        {failure.error.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
