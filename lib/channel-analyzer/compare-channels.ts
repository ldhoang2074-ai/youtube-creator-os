import { YoutubeError } from "../youtube/errors";
import { analyzeChannel, type AnalyzeChannelOptions } from "./analyze-channel";
import { calculateOutlierRate } from "./outlier-rate";
import type { ChannelCompareEntry, CompareChannelsResult } from "./types";

export type CompareChannelsOptions = AnalyzeChannelOptions;

/**
 * Analyzes each input channel independently (one failure never affects the
 * others) and returns results in the same order as `inputs`. Callers are
 * responsible for trimming/validating `inputs` before calling this —
 * this function assumes it already received a valid, normalized list.
 */
export async function compareChannels(
  inputs: readonly string[],
  options: CompareChannelsOptions = {},
): Promise<CompareChannelsResult> {
  const settled = await Promise.allSettled(inputs.map((input) => analyzeChannel(input, options)));

  const results: ChannelCompareEntry[] = settled.map((outcome, index) => {
    const input = inputs[index];

    if (outcome.status === "fulfilled") {
      const report = outcome.value;
      return {
        input,
        status: "success",
        report: { ...report, outlierRate: calculateOutlierRate(report.videos) },
      };
    }

    const reason: unknown = outcome.reason;
    if (reason instanceof YoutubeError) {
      return {
        input,
        status: "error",
        error: { code: reason.code, message: reason.message },
      };
    }

    // Never surface an unknown error's own message/stack to the client.
    return {
      input,
      status: "error",
      error: { code: "UNKNOWN_ERROR", message: "Unexpected error while analyzing this channel" },
    };
  });

  return { results };
}
