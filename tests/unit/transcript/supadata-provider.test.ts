import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { TranscriptError } from "@/lib/transcript/errors";
import { supadataTranscriptProvider } from "@/lib/transcript/providers/supadata";

const VIDEO_ID = "dQw4w9WgXcQ";

interface SupadataSegmentFixture {
  readonly text: string;
  readonly offset: number;
  readonly duration: number;
  readonly lang: string;
}

let testCredential = "";

function makeTranscriptBody(
  content: readonly SupadataSegmentFixture[] = [
    { text: "Hello world", offset: 1250, duration: 2500, lang: "en" },
  ],
  lang = "en",
): unknown {
  return { content, lang, availableLangs: [lang] };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installFetchMock(): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function fetchTranscript(signal = new AbortController().signal) {
  return supadataTranscriptProvider.fetchTranscript({ videoId: VIDEO_ID, signal });
}

async function captureError(action: () => Promise<unknown>): Promise<TranscriptError> {
  try {
    await action();
  } catch (error) {
    if (error instanceof TranscriptError) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected action to throw TranscriptError");
}

beforeEach(() => {
  testCredential = `unit-test-${randomUUID()}`;
  vi.stubEnv("SUPADATA_API_KEY", testCredential);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  testCredential = "";
});

describe("supadataTranscriptProvider", () => {
  it("maps a valid English transcript and converts milliseconds to seconds", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse(200, makeTranscriptBody()));

    await expect(fetchTranscript()).resolves.toEqual({
      languageCode: "en",
      generationKind: "unknown",
      segments: [{ startSeconds: 1.25, durationSeconds: 2.5, text: "Hello world" }],
    });
  });

  it("preserves Spanish and Unicode transcript text", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        200,
        makeTranscriptBody(
          [{ text: "  ¡Hola, señor! 你好 🌎  ", offset: 0, duration: 1000, lang: "es" }],
          "es",
        ),
      ),
    );

    const result = await fetchTranscript();

    expect(result.languageCode).toBe("es");
    expect(result.segments[0]?.text).toBe("¡Hola, señor! 你好 🌎");
  });

  it("sends only the approved URL parameters and authentication header", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse(200, makeTranscriptBody()));

    await fetchTranscript();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [input, init] = fetchMock.mock.calls[0];
    const requestUrl = new URL(String(input));
    const canonicalVideoUrl = new URL(requestUrl.searchParams.get("url") ?? "");

    expect(`${requestUrl.origin}${requestUrl.pathname}`).toBe(
      "https://api.supadata.ai/v1/transcript",
    );
    expect(canonicalVideoUrl.toString()).toBe(
      `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    );
    expect(requestUrl.searchParams.get("text")).toBe("false");
    expect(requestUrl.searchParams.get("mode")).toBe("native");
    expect(requestUrl.searchParams.has("lang")).toBe(false);
    expect(requestUrl.toString()).not.toContain(testCredential);
    expect(new Headers(init?.headers).get("x-api-key")).toBe(testCredential);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("preserves source order, duplicate timestamps, and overlapping segments", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        200,
        makeTranscriptBody([
          { text: "First", offset: 1000, duration: 5000, lang: "en" },
          { text: "Second", offset: 1000, duration: 1000, lang: "en" },
          { text: "Third", offset: 3000, duration: 1000, lang: "en" },
        ]),
      ),
    );

    const result = await fetchTranscript();

    expect(result.segments).toEqual([
      { startSeconds: 1, durationSeconds: 5, text: "First" },
      { startSeconds: 1, durationSeconds: 1, text: "Second" },
      { startSeconds: 3, durationSeconds: 1, text: "Third" },
    ]);
    expect(result.generationKind).toBe("unknown");
  });

  it.each([undefined, "   "])(
    "rejects missing or blank provider configuration",
    async (configuration) => {
      vi.stubEnv("SUPADATA_API_KEY", configuration);
      const fetchMock = installFetchMock();

      const error = await captureError(fetchTranscript);

      expect(error.code).toBe("MISSING_TRANSCRIPT_PROVIDER_CONFIGURATION");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("maps empty content to transcript not found", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse(200, makeTranscriptBody([])));

    expect((await captureError(fetchTranscript)).code).toBe("TRANSCRIPT_NOT_FOUND");
  });

  it("maps HTTP 404 to transcript not found", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: "not-found" }));

    expect((await captureError(fetchTranscript)).code).toBe("TRANSCRIPT_NOT_FOUND");
  });

  it("maps Supadata's transcript-unavailable response without exposing its body", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(206, {
        error: "transcript-unavailable",
        message: "provider detail must stay private",
      }),
    );

    const error = await captureError(fetchTranscript);

    expect(error.code).toBe("TRANSCRIPT_UNAVAILABLE");
    expect(error.message).not.toContain("provider detail");
  });

  it("maps other HTTP errors to a stable provider error", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "internal provider detail", requestId: "private-request" }),
    );

    const error = await captureError(fetchTranscript);

    expect(error.code).toBe("TRANSCRIPT_PROVIDER_ERROR");
    expect(error.message).not.toContain("internal provider detail");
    expect(error.message).not.toContain("private-request");
  });

  it("maps network failures to a stable provider error", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockRejectedValueOnce(new Error("network detail must stay private"));

    const error = await captureError(fetchTranscript);

    expect(error.code).toBe("TRANSCRIPT_PROVIDER_ERROR");
    expect(error.message).not.toContain("network detail");
  });

  it("maps an AbortError from the passed aborted signal to provider timeout", async () => {
    const fetchMock = installFetchMock();
    const controller = new AbortController();
    const abortError = new Error("abort detail must stay private");
    abortError.name = "AbortError";
    controller.abort();
    fetchMock.mockRejectedValueOnce(abortError);

    const error = await captureError(() => fetchTranscript(controller.signal));

    expect(error.code).toBe("TRANSCRIPT_PROVIDER_TIMEOUT");
    expect(error.message).not.toContain("abort detail");
  });

  it("rejects invalid JSON as an invalid provider response", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(new Response("{not-json", { status: 200 }));

    expect((await captureError(fetchTranscript)).code).toBe("INVALID_PROVIDER_RESPONSE");
  });

  it("rejects an invalid response schema", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { content: [], availableLangs: [] }));

    expect((await captureError(fetchTranscript)).code).toBe("INVALID_PROVIDER_RESPONSE");
  });

  it("rejects whitespace-only segment text", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        200,
        makeTranscriptBody([{ text: "   ", offset: 0, duration: 1000, lang: "en" }]),
      ),
    );

    expect((await captureError(fetchTranscript)).code).toBe("INVALID_PROVIDER_RESPONSE");
  });

  it("rejects a negative segment offset", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        200,
        makeTranscriptBody([{ text: "Invalid", offset: -1, duration: 1000, lang: "en" }]),
      ),
    );

    expect((await captureError(fetchTranscript)).code).toBe("INVALID_PROVIDER_RESPONSE");
  });

  it("rejects a negative segment duration", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        200,
        makeTranscriptBody([{ text: "Invalid", offset: 0, duration: -1, lang: "en" }]),
      ),
    );

    expect((await captureError(fetchTranscript)).code).toBe("INVALID_PROVIDER_RESPONSE");
  });

  it("rejects a 202 job response without exposing or polling its job ID", async () => {
    const fetchMock = installFetchMock();
    const jobId = `private-job-${randomUUID()}`;
    fetchMock.mockResolvedValueOnce(jsonResponse(202, { jobId }));

    const error = await captureError(fetchTranscript);

    expect(error.code).toBe("TRANSCRIPT_PROVIDER_ERROR");
    expect(error.message).not.toContain(jobId);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not expose the credential in thrown provider errors", async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockRejectedValueOnce(new Error(testCredential));

    const error = await captureError(fetchTranscript);

    expect(error.message).not.toContain(testCredential);
    expect(error.stack).not.toContain(testCredential);
  });
});
