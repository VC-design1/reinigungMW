import { describe, expect, it } from "vitest";
import { issueReportSchema, priorityForCategory } from "./issue";

describe("issueReportSchema", () => {
  it("accepts a valid report", () => {
    const result = issueReportSchema.safeParse({
      category: "damage",
      description: "Spiegel im Bad ist gesprungen",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a too-short description", () => {
    const result = issueReportSchema.safeParse({ category: "damage", description: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown category", () => {
    const result = issueReportSchema.safeParse({ category: "unknown", description: "irgendwas" });
    expect(result.success).toBe(false);
  });
});

describe("priorityForCategory", () => {
  it("treats damage as critical", () => {
    expect(priorityForCategory("damage")).toBe("critical");
  });

  it("treats cleaning_not_possible as critical", () => {
    expect(priorityForCategory("cleaning_not_possible")).toBe("critical");
  });

  it("treats wear, missing_item and other as normal", () => {
    expect(priorityForCategory("wear")).toBe("normal");
    expect(priorityForCategory("missing_item")).toBe("normal");
    expect(priorityForCategory("other")).toBe("normal");
  });
});
