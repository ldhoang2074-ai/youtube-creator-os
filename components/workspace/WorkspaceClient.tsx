"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  deleteSession,
  getStorageSafely,
  listSessions,
  WORKSPACE_STORAGE_KEY,
  type ListSessionsResult,
  type StorageHost,
} from "@/lib/workspace/storage";
import { analyzeTitlePatterns } from "@/lib/title-patterns/analyze-title-patterns";
import { TitlePatternPanel } from "@/components/title-patterns/TitlePatternPanel";
import { Grid } from "@/components/ui/Grid";
import { VideoDetailDialog } from "@/components/video/VideoDetailDialog";
import { WorkspaceVideoCard } from "./WorkspaceVideoCard";

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

interface SelectedWorkspaceVideo {
  readonly sessionId: string;
  readonly videoId: string;
}

export function WorkspaceClient() {
  const [, setRefreshTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<SelectedWorkspaceVideo | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<DeleteError | null>(null);

  const subscribeToWorkspace = useCallback((onStoreChange: () => void) => {
    return subscribe(() => {
      setSelectedVideo(null);
      onStoreChange();
    });
  }, []);
  const snapshot = useSyncExternalStore(subscribeToWorkspace, getSnapshot, getServerSnapshot);

  const isInitialServerSnapshot = snapshot === SERVER_SNAPSHOT;
  const resolvedSelectedVideo =
    snapshot.ok && selectedVideo
      ? snapshot.sessions
          .find((session) => session.id === selectedVideo.sessionId)
          ?.result.items.find((item) => item.videoId === selectedVideo.videoId)
      : undefined;

  function refreshSnapshot() {
    cachedRawValue = undefined; // force the next getSnapshot() call to re-read
    setSelectedVideo(null);
    setRefreshTick((tick) => tick + 1); // force a re-render so it actually happens
  }

  function handleSelect(id: string) {
    setSelectedId((current) => (current === id ? null : id));
    setSelectedVideo(null);
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
    setSelectedVideo((current) => (current?.sessionId === id ? null : current));
    refreshSnapshot();
  }

  if (isInitialServerSnapshot) {
    return (
      <div
        role="status"
        className="flex items-center gap-ui-3 rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4 text-ui-body-sm text-ui-text-secondary sm:p-ui-6"
      >
        <span
          aria-hidden="true"
          className="size-5 shrink-0 animate-spin rounded-ui-pill border-2 border-ui-border border-t-ui-accent"
        />
        <span>Loading saved research...</span>
      </div>
    );
  }

  if (!snapshot.ok) {
    return (
      <p
        role="alert"
        className="rounded-ui-panel border border-ui-danger/40 bg-ui-danger/10 px-ui-4 py-ui-3 text-ui-body-sm text-ui-danger"
      >
        Saving is not available in this browser session.
      </p>
    );
  }

  const { sessions, skippedCount } = snapshot;

  if (sessions.length === 0) {
    return (
      <div className="flex min-w-0 flex-col gap-ui-3">
        {skippedCount > 0 ? (
          <p
            role="status"
            className="rounded-ui-panel border border-ui-border bg-ui-panel px-ui-4 py-ui-3 text-ui-body-sm text-ui-text-secondary"
          >
            Some saved research could not be loaded and was skipped.
          </p>
        ) : null}
        <div className="rounded-ui-panel border border-dashed border-ui-border bg-ui-panel px-ui-4 py-ui-8 text-center text-ui-body-sm text-ui-text-muted">
          Nothing saved yet. Save a result from the Opportunity Feed to see it here.
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-ui-4">
      {skippedCount > 0 ? (
        <p
          role="status"
          className="rounded-ui-panel border border-ui-border bg-ui-panel px-ui-4 py-ui-3 text-ui-body-sm text-ui-text-secondary"
        >
          Some saved research could not be loaded and was skipped.
        </p>
      ) : null}

      <ul className="flex min-w-0 flex-col gap-ui-4">
        {sessions.map((session) => {
          const isExpanded = selectedId === session.id;
          const contentId = `workspace-session-${session.id}`;

          return (
            <li
              key={session.id}
              className={`min-w-0 rounded-ui-panel border p-ui-4 sm:p-ui-6 ${
                isExpanded ? "border-ui-focus/60 bg-ui-panel-elevated" : "border-ui-border bg-ui-panel"
              }`}
            >
              <div className="flex min-w-0 flex-col gap-ui-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => handleSelect(session.id)}
                    aria-expanded={isExpanded}
                    aria-controls={contentId}
                    className="min-w-0 break-words text-left text-ui-body font-semibold text-ui-text outline-none transition-colors hover:text-ui-text-secondary focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel"
                  >
                    {session.name}
                  </button>
                  <p className="mt-ui-1 break-words text-ui-body-sm text-ui-text-muted">
                    Saved {new Date(session.savedAt).toLocaleString()} ·{" "}
                    {session.inputs.length} channels · {session.result.items.length} videos
                    {session.result.failures.length > 0
                      ? ` · ${session.result.failures.length} failed`
                      : ""}
                  </p>
                </div>

                <div className="flex min-w-0 flex-col items-stretch gap-ui-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <Link
                    href={buildOpportunitiesHref(session.inputs)}
                    prefetch={false}
                    className="min-w-0 break-words rounded-ui-control border border-ui-border px-ui-3 py-ui-2 text-center text-ui-body-sm text-ui-text-secondary outline-none transition-colors hover:bg-ui-surface-muted hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel"
                  >
                    Open these channels in Opportunity Feed
                  </Link>

                  {pendingDeleteId === session.id ? (
                    <div className="flex flex-col gap-ui-2 rounded-ui-control border border-ui-danger/40 bg-ui-danger/10 p-ui-3 sm:flex-row sm:items-center">
                      <span className="text-ui-body-sm text-ui-danger">
                        Delete this saved research?
                      </span>
                      <div className="flex gap-ui-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(session.id)}
                          className="rounded-ui-control bg-ui-danger px-ui-3 py-ui-2 text-ui-body-sm font-semibold text-ui-text outline-none transition-colors hover:bg-ui-danger/90 focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel"
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          className="rounded-ui-control border border-ui-border px-ui-3 py-ui-2 text-ui-body-sm text-ui-text-secondary outline-none transition-colors hover:bg-ui-surface-muted hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRequestDelete(session.id)}
                      className="rounded-ui-control border border-ui-danger/40 px-ui-3 py-ui-2 text-ui-body-sm font-semibold text-ui-danger outline-none transition-colors hover:bg-ui-danger/10 focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {deleteError && deleteError.sessionId === session.id ? (
                <p
                  role="alert"
                  className="mt-ui-3 rounded-ui-control border border-ui-danger/40 bg-ui-danger/10 px-ui-3 py-ui-2 text-ui-body-sm text-ui-danger"
                >
                  {deleteError.message}
                </p>
              ) : null}

              {isExpanded ? (
                <div
                  id={contentId}
                  className="mt-ui-4 flex min-w-0 flex-col gap-ui-3 border-t border-ui-border pt-ui-4"
                >
                  <p className="text-ui-body-sm text-ui-text-muted">
                    Saved on {new Date(session.savedAt).toLocaleString()}. This is a
                    manually saved snapshot, not live data or growth tracking.
                  </p>

                  {session.result.items.length > 0 ? (
                    <Grid className="gap-ui-4 lg:gap-ui-6">
                      {session.result.items.map((item) => (
                        <WorkspaceVideoCard
                          key={item.videoId}
                          item={item}
                          onViewDetails={() =>
                            setSelectedVideo({ sessionId: session.id, videoId: item.videoId })
                          }
                        />
                      ))}
                    </Grid>
                  ) : (
                    <div className="rounded-ui-panel border border-dashed border-ui-border bg-ui-panel px-ui-4 py-ui-6 text-center text-ui-body-sm text-ui-text-muted">
                      No recent analyzed videos reached the 2× outlier threshold.
                    </div>
                  )}

                  {session.result.items.length > 0 ? (
                    <TitlePatternPanel report={analyzeTitlePatterns(session.result.items)} />
                  ) : null}

                  {session.result.failures.length > 0 ? (
                    <ul className="flex min-w-0 flex-col gap-ui-2">
                      {session.result.failures.map((failure, index) => (
                        <li
                          key={`${failure.input}-${index}`}
                          role="alert"
                          className="min-w-0 break-words rounded-ui-panel border border-ui-danger/40 bg-ui-danger/10 px-ui-4 py-ui-3 text-ui-body-sm text-ui-danger"
                        >
                          <span className="font-semibold">{failure.input}</span>:{" "}
                          {failure.error.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <VideoDetailDialog
        source={resolvedSelectedVideo ? { kind: "feed", item: resolvedSelectedVideo } : null}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}
