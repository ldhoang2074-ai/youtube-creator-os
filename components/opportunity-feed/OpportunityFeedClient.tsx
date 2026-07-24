"use client";

import { useMemo, useState, type FormEvent } from "react";
import type {
  OpportunityChannelSummary,
  OpportunityFeedApiResponse,
  OpportunityFeedResult,
} from "@/lib/channel-analyzer/types";
import { isApiErrorBody } from "@/lib/http/api-error";
import { usePersistentDraft } from "@/lib/drafts/use-persistent-draft";
import { analyzeTitlePatterns } from "@/lib/title-patterns/analyze-title-patterns";
import { SaveResearchButton } from "@/components/workspace/SaveResearchButton";
import { TitlePatternPanel } from "@/components/title-patterns/TitlePatternPanel";
import { Grid } from "@/components/ui/Grid";
import { ChannelCard } from "./ChannelCard";
import { ChannelDetailDialog } from "./ChannelDetailDialog";
import { OpportunityFeedTable } from "./OpportunityFeedTable";
import { VideoDetailDialog } from "@/components/video/VideoDetailDialog";

type Status = "idle" | "loading" | "success" | "error";

const MIN_CHANNELS = 2;
const MAX_CHANNELS = 5;
const DRAFT_STORAGE_KEY = "youtube-creator-os:draft:opportunities:v1";

type SelectedOpportunityDetail =
  | {
      readonly kind: "video";
      readonly item: OpportunityFeedResult["items"][number];
    }
  | {
      readonly kind: "channel";
      readonly channel: OpportunityChannelSummary;
    }
  | null;

function isOpportunityChannelSummary(value: unknown): value is OpportunityChannelSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.channelId === "string" &&
    typeof candidate.title === "string" &&
    (candidate.thumbnailUrl === null || typeof candidate.thumbnailUrl === "string") &&
    typeof candidate.subscriberCount === "string" &&
    typeof candidate.totalViewCount === "string" &&
    typeof candidate.videoCount === "string" &&
    (candidate.medianViews === null ||
      (typeof candidate.medianViews === "number" && Number.isFinite(candidate.medianViews))) &&
    typeof candidate.analyzedVideoCount === "number" &&
    Number.isFinite(candidate.analyzedVideoCount) &&
    candidate.analyzedVideoCount >= 0 &&
    (candidate.outlierRate === null ||
      (typeof candidate.outlierRate === "number" &&
        Number.isFinite(candidate.outlierRate) &&
        candidate.outlierRate >= 0))
  );
}

function isOpportunityFeedApiResponse(value: unknown): value is OpportunityFeedApiResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.feed !== "object" || candidate.feed === null) {
    return false;
  }
  const feed = candidate.feed as Record<string, unknown>;
  return (
    Array.isArray(feed.items) &&
    Array.isArray(feed.failures) &&
    Array.isArray(candidate.channels) &&
    candidate.channels.every(isOpportunityChannelSummary)
  );
}

interface OpportunityFeedClientProps {
  readonly initialInputs?: readonly string[];
}

export function OpportunityFeedClient({ initialInputs }: OpportunityFeedClientProps) {
  const [rawInput, setRawInput] = usePersistentDraft(DRAFT_STORAGE_KEY, {
    priorityValue: initialInputs && initialInputs.length > 0 ? initialInputs.join("\n") : "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<OpportunityFeedResult | null>(null);
  const [channels, setChannels] = useState<readonly OpportunityChannelSummary[]>([]);
  const [successfulInputs, setSuccessfulInputs] = useState<readonly string[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<SelectedOpportunityDetail>(null);

  const titlePatternReport = useMemo(
    () => analyzeTitlePatterns(result?.items ?? []),
    [result],
  );

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
      setResult(null);
      setChannels([]);
      setSuccessfulInputs(null);
      setSelectedDetail(null);
      setErrorMessage(`Enter at least ${MIN_CHANNELS} channels (one per line).`);
      return;
    }
    if (inputs.length > MAX_CHANNELS) {
      setStatus("error");
      setResult(null);
      setChannels([]);
      setSuccessfulInputs(null);
      setSelectedDetail(null);
      setErrorMessage(`Enter at most ${MAX_CHANNELS} channels (one per line).`);
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    setResult(null);
    setChannels([]);
    setSuccessfulInputs(null);
    setSelectedDetail(null);

    try {
      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inputs }),
      });

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        setStatus("error");
        setErrorMessage("The server returned an unexpected response. Please try again.");
        return;
      }

      if (!response.ok) {
        const message = isApiErrorBody(json)
          ? json.error.message
          : "Something went wrong while building the opportunity feed.";
        setStatus("error");
        setErrorMessage(message);
        return;
      }

      if (!isOpportunityFeedApiResponse(json)) {
        setStatus("error");
        setErrorMessage("The server returned an unexpected response. Please try again.");
        return;
      }

      setResult(json.feed);
      setChannels(json.channels);
      // Captured from this exact request's closure — never re-read from
      // rawInput later, since the user may have edited the textarea since.
      setSuccessfulInputs(inputs);
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
          <label htmlFor="opportunity-inputs" className="text-ui-body-sm font-medium text-ui-text">
            Channel URLs or handles, one per line
          </label>
          <p className="mt-ui-1 text-ui-body-sm text-ui-text-muted">
            Enter 2 to 5 channel URLs or handles, one per line.
          </p>
        </div>
        <textarea
          id="opportunity-inputs"
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
          {status === "loading" ? "Finding standout videos..." : "Find opportunities"}
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
          <span>Finding standout videos...</span>
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

      {status === "success" && result ? (
        <div className="flex min-w-0 flex-col gap-ui-6">
          {successfulInputs ? (
            <SaveResearchButton inputs={successfulInputs} result={result} />
          ) : null}

          {channels.length > 0 ? (
            <section aria-labelledby="channel-overview-heading" className="flex min-w-0 flex-col gap-ui-3">
              <h2
                id="channel-overview-heading"
                className="text-ui-section font-semibold text-ui-text"
              >
                Channel overview
              </h2>
              <Grid className="gap-ui-4 lg:gap-ui-6">
                {channels.map((channel, index) => (
                  <ChannelCard
                    key={`${channel.channelId}-${index}`}
                    channel={channel}
                    onViewDetails={(selectedChannel) =>
                      setSelectedDetail({ kind: "channel", channel: selectedChannel })
                    }
                  />
                ))}
              </Grid>
            </section>
          ) : null}

          {result.items.length > 0 ? (
            <OpportunityFeedTable
              items={result.items}
              onViewDetails={(item) => setSelectedDetail({ kind: "video", item })}
            />
          ) : result.failures.length === 0 ? (
            <div className="rounded-ui-panel border border-dashed border-ui-border bg-ui-panel px-ui-4 py-ui-8 text-center text-ui-body-sm text-ui-text-muted">
              No recent analyzed videos reached the 2× outlier threshold.
            </div>
          ) : null}

          {status === "success" && result !== null && result.items.length > 0 ? (
            <TitlePatternPanel report={titlePatternReport} />
          ) : null}

          {result.failures.length > 0 ? (
            <ul className="flex min-w-0 flex-col gap-ui-2">
              {result.failures.map((failure) => (
                <li
                  key={failure.input}
                  role="alert"
                  className="min-w-0 break-words rounded-ui-panel border border-ui-danger/40 bg-ui-danger/10 px-ui-4 py-ui-3 text-ui-body-sm text-ui-danger"
                >
                  <span className="font-semibold">{failure.input}</span>: {failure.error.message}
                </li>
              ))}
            </ul>
          ) : null}

          <VideoDetailDialog
            source={
              selectedDetail?.kind === "video"
                ? { kind: "feed", item: selectedDetail.item }
                : null
            }
            onClose={() => setSelectedDetail(null)}
          />
          <ChannelDetailDialog
            channel={selectedDetail?.kind === "channel" ? selectedDetail.channel : null}
            onClose={() => setSelectedDetail(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
