import { describe, expect, it } from "vitest";
import { createTeamMemberSchema, updateTeamMemberSchema } from "./team";

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

  it("accepts a valid landlord", () => {
    const result = createTeamMemberSchema.safeParse({
      full_name: "Vera Vermieterin",
      email: "vera@example.com",
      password: "Demo1234!",
      role: "landlord",
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

describe("updateTeamMemberSchema", () => {
  it("parses the active flag from form strings to boolean", () => {
    const result = updateTeamMemberSchema.safeParse({
      full_name: "Carla",
      role: "cleaner",
      active: "false",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.active).toBe(false);
  });

  it("rejects an unknown role", () => {
    const result = updateTeamMemberSchema.safeParse({
      full_name: "Carla",
      role: "manager",
      active: "true",
    });
    expect(result.success).toBe(false);
  });
});
