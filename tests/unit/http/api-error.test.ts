import { describe, expect, it } from "vitest";
import { isApiErrorBody } from "@/lib/http/api-error";

describe("isApiErrorBody", () => {
  it("accepts the API error response shape", () => {
    expect(
      isApiErrorBody({
        error: { code: "CHANNEL_NOT_FOUND", message: "Channel not found." },
      }),
    ).toBe(true);
  });

  it("rejects null, primitives, and objects without an error property", () => {
    expect(isApiErrorBody(null)).toBe(false);
    expect(isApiErrorBody("error")).toBe(false);
    expect(isApiErrorBody(500)).toBe(false);
    expect(isApiErrorBody({})).toBe(false);
  });

  it("rejects a non-object error property", () => {
    expect(isApiErrorBody({ error: "Channel not found." })).toBe(false);
  });

  it("preserves the existing shallow nested-object check", () => {
    expect(isApiErrorBody({ error: {} })).toBe(true);
  });
});
