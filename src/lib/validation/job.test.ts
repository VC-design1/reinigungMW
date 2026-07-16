import { describe, expect, it } from "vitest";
import { jobSchema } from "./job";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("jobSchema", () => {
  it("accepts a job with only apartment and date", () => {
    const result = jobSchema.safeParse({
      apartment_id: VALID_UUID,
      scheduled_date: "2026-08-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID apartment_id", () => {
    const result = jobSchema.safeParse({ apartment_id: "not-a-uuid", scheduled_date: "2026-08-01" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing scheduled_date", () => {
    const result = jobSchema.safeParse({ apartment_id: VALID_UUID, scheduled_date: "" });
    expect(result.success).toBe(false);
  });

  it("allows an empty assigned_to (unassigned job)", () => {
    const result = jobSchema.safeParse({
      apartment_id: VALID_UUID,
      scheduled_date: "2026-08-01",
      assigned_to: "",
    });
    expect(result.success).toBe(true);
  });
});
