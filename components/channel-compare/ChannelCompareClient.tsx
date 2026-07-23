"use client";

import { useState, type FormEvent } from "react";
import type { CompareChannelsResult } from "@/lib/channel-analyzer/types";
import { isApiErrorBody } from "@/lib/http/api-error";
import { usePersistentDraft } from "@/lib/drafts/use-persistent-draft";
import { ComparisonTable } from "./ComparisonTable";

type Status = "idle" | "loading" | "success" | "error";

const MIN_CHANNELS = 2;
const MAX_CHANNELS = 5;
const DRAFT_STORAGE_KEY = "youtube-creator-os:draft:compare:v1";

export function ChannelCompareClient() {
  const [rawInput, setRawInput] = usePersistentDraft(DRAFT_STORAGE_KEY);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CompareChannelsResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") {
      return;
    }

    const inputs = rawInput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (inputs.length < MIN_CHANNELS) {
      setStatus("error");
      setErrorMessage(`Enter at least ${MIN_CHANNELS} channels (one per line).`);
      return;
    }
    if (inputs.length > MAX_CHANNELS) {
      setStatus("error");
      setErrorMessage(`Enter at most ${MAX_CHANNELS} channels (one per line).`);
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inputs }),
      });

      const json: unknown = await response.json();

      if (!response.ok) {
        const message = isApiErrorBody(json)
          ? json.error.message
          : "Something went wrong while comparing these channels.";
        setStatus("error");
        setErrorMessage(message);
        return;
      }

      setResult(json as CompareChannelsResult);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Could not reach the server. Please try again.");
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-ui-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-ui-3 rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4 sm:p-ui-6"
      >
        <div>
          <label htmlFor="compare-inputs" className="text-ui-body-sm font-medium text-ui-text">
            Channel URLs or handles, one per line
          </label>
          <p className="mt-ui-1 text-ui-body-sm text-ui-text-muted">
            Enter 2 to 5 channel URLs or handles, one per line.
          </p>
        </div>
        <textarea
          id="compare-inputs"
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
          placeholder={"One channel per line, e.g.\n@channel1\n@channel2"}
          rows={5}
          disabled={status === "loading"}
          className="min-w-0 rounded-ui-control border border-ui-border bg-ui-surface-muted px-ui-3 py-ui-2 text-ui-body text-ui-text outline-none placeholder:text-ui-text-muted focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="self-start rounded-ui-control bg-ui-accent px-ui-4 py-ui-2 text-ui-body-sm font-semibold text-ui-text transition-colors hover:bg-ui-accent-hover focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Comparing..." : "Compare channels"}
        </button>
      </form>

      {status === "loading" ? (
        <div
          role="status"
          className="flex items-center gap-ui-3 rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4 text-ui-body-sm text-ui-text-secondary sm:p-ui-6"
        >
          <span
            aria-hidden="true"
            className="size-5 shrink-0 animate-spin rounded-ui-pill border-2 border-ui-border border-t-ui-accent"
          />
          <span>Comparing channels...</span>
        </div>
      ) : null}

      {status === "error" && errorMessage ? (
        <p
          role="alert"
          className="rounded-ui-panel border border-ui-danger/40 bg-ui-danger/10 px-ui-4 py-ui-3 text-ui-body-sm text-ui-danger"
        >
          {errorMessage}
        </p>
      ) : null}

      {status === "success" && result ? <ComparisonTable results={result.results} /> : null}
    </div>
  );
}
