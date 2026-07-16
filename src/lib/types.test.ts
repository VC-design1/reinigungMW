import { describe, expect, it } from "vitest";
import {
  CLEANING_JOB_STATUS_LABELS,
  ISSUE_CATEGORY_LABELS,
  type CleaningJobStatus,
  type IssueCategory,
} from "./types";

const ALL_JOB_STATUSES: CleaningJobStatus[] = [
  "scheduled",
  "in_progress",
  "completed",
  "problem_reported",
];

const ALL_ISSUE_CATEGORIES: IssueCategory[] = [
  "damage",
  "wear",
  "missing_item",
  "cleaning_not_possible",
  "other",
];

describe("label maps", () => {
  it("has a German label for every cleaning job status", () => {
    for (const status of ALL_JOB_STATUSES) {
      expect(CLEANING_JOB_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("has a German label for every issue category", () => {
    for (const category of ALL_ISSUE_CATEGORIES) {
      expect(ISSUE_CATEGORY_LABELS[category]).toBeTruthy();
    }
  });
});
