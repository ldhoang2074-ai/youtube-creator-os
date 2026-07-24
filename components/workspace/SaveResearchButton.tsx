"use client";

import { useState } from "react";
import Link from "next/link";
import type { OpportunityFeedResult } from "@/lib/channel-analyzer/types";
import { getStorageSafely, saveSession, type SaveSessionFailureReason } from "@/lib/workspace/storage";

type ButtonState = "idle" | "editing" | "saving" | "saved" | "error";

interface SaveResearchButtonProps {
  readonly inputs: readonly string[];
  readonly result: OpportunityFeedResult;
}

function describeSaveError(reason: SaveSessionFailureReason): string {
  if (reason === "storage-unavailable") {
    return "Saving is not available in this browser session.";
  }
  if (reason === "storage-full") {
    return "Browser storage is full. Delete an older saved research and try again.";
  }
  return "Could not save this research. Please try again.";
}

export function SaveResearchButton({ inputs, result }: SaveResearchButtonProps) {
  const [state, setState] = useState<ButtonState>("idle");
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleStartEditing() {
    setState("editing");
    setErrorMessage(null);
  }

  function handleCancel() {
    setState("idle");
    setName("");
    setErrorMessage(null);
  }

  function handleSave() {
    setState("saving");

    const storage = getStorageSafely(typeof window === "undefined" ? undefined : window);
    if (storage === null) {
      setState("error");
      setErrorMessage("Saving is not available in this browser session.");
      return;
    }

    const outcome = saveSession(storage, { name, inputs, result });

    if (!outcome.ok) {
      setState("error");
      setErrorMessage(describeSaveError(outcome.reason));
      return;
    }

    setState("saved");
  }

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={handleStartEditing}
        className="self-start rounded-ui-control border border-ui-border bg-ui-panel px-ui-4 py-ui-2 text-ui-body-sm font-semibold text-ui-text-secondary outline-none transition-colors hover:bg-ui-surface-muted hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-bg"
      >
        Save this research
      </button>
    );
  }

  if (state === "editing") {
    return (
      <div className="flex min-w-0 flex-col gap-ui-2 rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4">
        <label
          htmlFor="workspace-session-name"
          className="text-ui-body-sm font-medium text-ui-text"
        >
          Name this research (optional)
        </label>
        <input
          id="workspace-session-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          className="min-w-0 rounded-ui-control border border-ui-border bg-ui-surface-muted px-ui-3 py-ui-2 text-ui-body text-ui-text outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel"
        />
        <p className="text-ui-body-sm text-ui-text-muted">
          Saved research stays only in this browser. It will not appear on other
          devices, and clearing browser data will remove it.
        </p>
        <div className="flex flex-wrap gap-ui-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-ui-control bg-ui-accent px-ui-3 py-ui-2 text-ui-body-sm font-semibold text-ui-text transition-colors hover:bg-ui-accent-hover focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-ui-control border border-ui-border px-ui-3 py-ui-2 text-ui-body-sm text-ui-text-secondary outline-none transition-colors hover:bg-ui-surface-muted hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state === "saving") {
    return (
      <p role="status" className="flex items-center gap-ui-2 text-ui-body-sm text-ui-text-secondary">
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin rounded-ui-pill border-2 border-ui-border border-t-ui-accent"
        />
        <span>Saving...</span>
      </p>
    );
  }

  if (state === "saved") {
    return (
      <p role="status" className="text-ui-body-sm text-ui-text-secondary">
        Saved.{" "}
        <Link
          href="/workspace"
          className="rounded-sm text-ui-accent underline underline-offset-2 outline-none transition-colors hover:text-ui-accent-hover focus-visible:ring-2 focus-visible:ring-ui-focus"
        >
          View in Research Workspace
        </Link>
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-ui-2 rounded-ui-control border border-ui-danger/40 bg-ui-danger/10 p-ui-3">
      <p role="alert" className="text-ui-body-sm text-ui-danger">
        {errorMessage}
      </p>
      <button
        type="button"
        onClick={handleStartEditing}
        className="self-start rounded-sm text-ui-body-sm text-ui-danger underline underline-offset-2 outline-none transition-colors hover:text-ui-danger/80 focus-visible:ring-2 focus-visible:ring-ui-focus"
      >
        Try again
      </button>
    </div>
  );
}
