import { expect, test } from "@playwright/test";

import { normalizeTaskStatus } from "../../app/lib/normalize-task-status";

test.describe("task status normalization", () => {
  test("preserves partial output while a task is running", () => {
    expect(
      normalizeTaskStatus({
        status: "running",
        resultText: "partial calculation",
        logTail: "latest Walrus output",
      }),
    ).toEqual({
      status: "running",
      resultText: "partial calculation",
      logTail: "latest Walrus output",
    });
  });

  test("maps the result compatibility alias", () => {
    expect(
      normalizeTaskStatus({ status: "completed", result: "final result" }),
    ).toEqual({
      status: "completed",
      resultText: "final result",
      logTail: undefined,
    });
  });

  test("normalizes failed and cancelled tasks", () => {
    expect(
      normalizeTaskStatus({ status: "failed", error: "bad input" }),
    ).toEqual({ status: "failed", error: "bad input" });
    expect(normalizeTaskStatus({ status: "canceled" })).toEqual({
      status: "cancelled",
    });
  });

  test("rejects a response without a status", () => {
    expect(normalizeTaskStatus({ resultText: "orphaned output" })).toBeNull();
  });
});

test("preserves original whitespace and terminal output", () => {
  const resultText = "  NORTH   EAST\n\tAKQ      -\n" + "x".repeat(5000) + "\n";
  for (const status of ["completed", "failed", "cancelled"]) {
    const result = normalizeTaskStatus({
      status,
      resultText,
      error: "Stopped",
    });
    expect(result && "resultText" in result && result.resultText).toBe(
      resultText,
    );
  }
});
