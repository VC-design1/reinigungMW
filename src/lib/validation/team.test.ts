import { describe, expect, it } from "vitest";
import { createCleanerSchema } from "./team";

describe("createCleanerSchema", () => {
  it("accepts valid cleaner data", () => {
    const result = createCleanerSchema.safeParse({
      full_name: "Carla Cleaner",
      email: "carla@example.com",
      password: "Demo1234!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = createCleanerSchema.safeParse({
      full_name: "Carla Cleaner",
      email: "carla@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = createCleanerSchema.safeParse({
      full_name: "Carla Cleaner",
      email: "not-an-email",
      password: "Demo1234!",
    });
    expect(result.success).toBe(false);
  });
});
