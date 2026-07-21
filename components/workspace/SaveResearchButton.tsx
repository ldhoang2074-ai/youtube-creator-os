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
        className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        Save this research
      </button>
    );
  }

  if (state === "editing") {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
        <label
          htmlFor="workspace-session-name"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Name this research (optional)
        </label>
        <input
          id="workspace-session-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Saved research stays only in this browser. It will not appear on other
          devices, and clearing browser data will remove it.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state === "saving") {
    return (
      <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
        Saving...
      </p>
    );
  }

  if (state === "saved") {
    return (
      <p role="status" className="text-sm text-zinc-700 dark:text-zinc-300">
        Saved.{" "}
        <Link href="/workspace" className="underline underline-offset-2">
          View in Research Workspace
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p role="alert" className="text-sm text-red-700 dark:text-red-300">
        {errorMessage}
      </p>
      <button
        type="button"
        onClick={handleStartEditing}
        className="self-start text-sm text-zinc-700 underline underline-offset-2 dark:text-zinc-300"
      >
        Try again
      </button>
    </div>
  );
}
