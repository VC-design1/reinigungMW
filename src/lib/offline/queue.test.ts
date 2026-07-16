import { afterEach, describe, expect, it, vi } from "vitest";
import { isNetworkError } from "./queue";

describe("isNetworkError", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats being offline as a network error regardless of the thrown error", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(isNetworkError(new Error("some Supabase error"))).toBe(true);
  });

  it("treats a fetch TypeError as a network error while online", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("does not treat a normal validation error as a network error while online", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(isNetworkError(new Error("duplicate key value"))).toBe(false);
  });
});
