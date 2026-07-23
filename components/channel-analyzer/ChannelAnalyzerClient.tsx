"use client";

import { useState, type FormEvent } from "react";
import type { ChannelAnalysisReport, VideoAnalysis } from "@/lib/channel-analyzer/types";
import { isApiErrorBody } from "@/lib/http/api-error";
import { Grid } from "@/components/ui/Grid";
import { VideoDetailDialog } from "@/components/video/VideoDetailDialog";
import { ChannelSummary } from "./ChannelSummary";
import { VideoCard } from "./VideoCard";

type Status = "idle" | "loading" | "success" | "error";

export function ChannelAnalyzerClient() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [report, setReport] = useState<ChannelAnalysisReport | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSelectedVideo(null);
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
    <div className="flex min-w-0 flex-col gap-ui-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-ui-4 rounded-ui-panel border border-ui-border bg-ui-panel p-ui-4 sm:flex-row sm:items-center sm:p-ui-6"
      >
        <label htmlFor="channel-input" className="sr-only">
          Channel URL or @handle
        </label>
        <input
          id="channel-input"
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Channel URL or @handle"
          className="min-w-0 flex-1 rounded-ui-control border border-ui-border bg-ui-surface-muted px-ui-3 py-ui-2 text-ui-body text-ui-text outline-none placeholder:text-ui-text-muted focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-ui-control bg-ui-accent px-ui-4 py-ui-2 text-ui-body-sm font-semibold text-ui-text transition-colors hover:bg-ui-accent-hover focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-panel disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {status === "loading" ? "Analyzing..." : "Analyze channel"}
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
          <span>Analyzing channel...</span>
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

      {status === "success" && report ? (
        <div className="flex min-w-0 flex-col gap-ui-4">
          <ChannelSummary report={report} />
          {report.videos.length === 0 ? (
            <div className="rounded-ui-panel border border-dashed border-ui-border bg-ui-panel px-ui-4 py-ui-8 text-center text-ui-body-sm text-ui-text-muted">
              This channel has no videos we could analyze yet.
            </div>
          ) : (
            <Grid className="gap-ui-4 lg:gap-ui-6">
              {report.videos.map((video) => (
                <VideoCard key={video.videoId} video={video} onViewDetails={setSelectedVideo} />
              ))}
            </Grid>
          )}
          <VideoDetailDialog
            source={selectedVideo ? { kind: "analyzer", video: selectedVideo } : null}
            onClose={() => setSelectedVideo(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
