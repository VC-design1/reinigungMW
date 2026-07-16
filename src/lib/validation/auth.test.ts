import { describe, expect, it } from "vitest";
import { loginSchema } from "./auth";

describe("loginSchema", () => {
  it("accepts a valid email/password pair", () => {
    const result = loginSchema.safeParse({ email: "admin@example.com", password: "geheim123" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "geheim123" });
    expect(result.success).toBe(false);
  });

  it("rejects a too-short password", () => {
    const result = loginSchema.safeParse({ email: "admin@example.com", password: "123" });
    expect(result.success).toBe(false);
  });
});
