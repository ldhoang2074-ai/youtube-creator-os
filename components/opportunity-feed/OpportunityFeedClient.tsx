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
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="opportunity-inputs" className="sr-only">
          Channel URLs or handles, one per line
        </label>
        <textarea
          id="opportunity-inputs"
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
          {status === "loading" ? "Finding standout videos..." : "Find opportunities"}
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

      {status === "success" && result ? (
        <div className="flex flex-col gap-4">
          {successfulInputs ? (
            <SaveResearchButton inputs={successfulInputs} result={result} />
          ) : null}

          {channels.length > 0 ? (
            <section aria-labelledby="channel-overview-heading" className="flex flex-col gap-3">
              <h2
                id="channel-overview-heading"
                className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
              >
                Channel overview
              </h2>
              <Grid>
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
            <div className="rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
              No recent analyzed videos reached the 2× outlier threshold.
            </div>
          ) : null}

          {status === "success" && result !== null && result.items.length > 0 ? (
            <TitlePatternPanel report={titlePatternReport} />
          ) : null}

          {result.failures.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {result.failures.map((failure) => (
                <li
                  key={failure.input}
                  role="alert"
                  className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"
                >
                  <span className="font-medium">{failure.input}</span>: {failure.error.message}
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
