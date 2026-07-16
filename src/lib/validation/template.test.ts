import { describe, expect, it } from "vitest";
import { templateSchema } from "./template";

describe("templateSchema", () => {
  it("accepts a template with at least one item", () => {
    const result = templateSchema.safeParse({
      name: "Standard",
      items: [{ room_name: "Küche", label: "Herd gereinigt" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a template with no items", () => {
    const result = templateSchema.safeParse({ name: "Standard", items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an item missing a label", () => {
    const result = templateSchema.safeParse({
      name: "Standard",
      items: [{ room_name: "Küche", label: "" }],
    });
    expect(result.success).toBe(false);
  });
});
