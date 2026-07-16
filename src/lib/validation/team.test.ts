import { describe, expect, it } from "vitest";
import { createTeamMemberSchema } from "./team";

describe("createTeamMemberSchema", () => {
  it("accepts a valid cleaner", () => {
    const result = createTeamMemberSchema.safeParse({
      full_name: "Carla Cleaner",
      email: "carla@example.com",
      password: "Demo1234!",
      role: "cleaner",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid admin", () => {
    const result = createTeamMemberSchema.safeParse({
      full_name: "Bernd Besitzer",
      email: "bernd@example.com",
      password: "Demo1234!",
      role: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown role", () => {
    const result = createTeamMemberSchema.safeParse({
      full_name: "X",
      email: "x@example.com",
      password: "Demo1234!",
      role: "superuser",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing role", () => {
    const result = createTeamMemberSchema.safeParse({
      full_name: "X",
      email: "x@example.com",
      password: "Demo1234!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = createTeamMemberSchema.safeParse({
      full_name: "Carla Cleaner",
      email: "carla@example.com",
      password: "short",
      role: "cleaner",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = createTeamMemberSchema.safeParse({
      full_name: "Carla Cleaner",
      email: "not-an-email",
      password: "Demo1234!",
      role: "cleaner",
    });
    expect(result.success).toBe(false);
  });
});
