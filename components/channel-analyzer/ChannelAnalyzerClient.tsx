"use client";

import { useState, type FormEvent } from "react";
import type { ChannelAnalysisReport } from "@/lib/channel-analyzer/types";
import { isApiErrorBody } from "@/lib/http/api-error";
import { ChannelSummary } from "./ChannelSummary";
import { VideoResultsTable } from "./VideoResultsTable";

type Status = "idle" | "loading" | "success" | "error";

export function ChannelAnalyzerClient() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [report, setReport] = useState<ChannelAnalysisReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") {
      return;
    }
    if (input.trim().length === 0) {
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    setReport(null);

    try {
      const response = await fetch("/api/analyzer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });

      const json: unknown = await response.json();

      if (!response.ok) {
        const message = isApiErrorBody(json)
          ? json.error.message
          : "Something went wrong while analyzing this channel.";
        setStatus("error");
        setErrorMessage(message);
        return;
      }

      setReport(json as ChannelAnalysisReport);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Could not reach the server. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="channel-input" className="sr-only">
          Channel URL or @handle
        </label>
        <input
          id="channel-input"
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Channel URL or @handle"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {status === "loading" ? "Analyzing..." : "Analyze channel"}
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

      {status === "success" && report ? (
        <div className="flex flex-col gap-4">
          <ChannelSummary report={report} />
          {report.videos.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
              This channel has no videos we could analyze yet.
            </div>
          ) : (
            <VideoResultsTable videos={report.videos} />
          )}
        </div>
      ) : null}
    </div>
  );
}
