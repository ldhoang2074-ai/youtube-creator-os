"use client";

import { useState, type FormEvent } from "react";
import type { CompareChannelsResult } from "@/lib/channel-analyzer/types";
import { ComparisonTable } from "./ComparisonTable";

interface ApiErrorBody {
  readonly error: { readonly code: string; readonly message: string };
}

type Status = "idle" | "loading" | "success" | "error";

const MIN_CHANNELS = 2;
const MAX_CHANNELS = 5;

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "object"
  );
}

export function ChannelCompareClient() {
  const [rawInput, setRawInput] = useState("");
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
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="compare-inputs" className="sr-only">
          Channel URLs or handles, one per line
        </label>
        <textarea
          id="compare-inputs"
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
          placeholder={"One channel per line, e.g.\n@channel1\n@channel2"}
          rows={5}
          disabled={status === "loading"}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {status === "loading" ? "Comparing..." : "Compare channels"}
        </button>
      </form>

      {status === "error" && errorMessage ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"
        >
          {errorMessage}
        </p>
      ) : null}

      {status === "success" && result ? <ComparisonTable results={result.results} /> : null}
    </div>
  );
}
