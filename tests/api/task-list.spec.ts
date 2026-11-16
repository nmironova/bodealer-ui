import { expect, test } from "@playwright/test";
import {
  readTaskList,
  taskSummary,
  recentTasks,
} from "../../app/lib/task-list";

test("task list whitelists real fields and counts each active/completed state", () => {
  const tasks = readTaskList([
    {
      id: "one",
      status: "running",
      createdAt: "2026-11-16T10:00:00Z",
      pid: 123,
      error: "private",
      dir: "/private",
    },
    { id: "two", status: "queued", createdAt: "2026-11-16T11:00:00Z" },
    { id: "three", status: "completed", createdAt: "2026-11-16T12:00:00Z" },
    { id: "four", status: "failed", createdAt: "2026-11-16T13:00:00Z" },
    { id: "five", status: "cancelled", createdAt: "2026-11-16T14:00:00Z" },
  ])!;
  expect(taskSummary(tasks)).toEqual({ running: 1, queued: 1, completed: 1 });
  expect(tasks[0]).toEqual({
    id: "one",
    status: "running",
    createdAt: "2026-11-16T10:00:00Z",
  });
  expect(readTaskList([])).toEqual([]);
});

test("malformed or unsupported lists are unavailable rather than empty", () => {
  for (const value of [
    null,
    {},
    { tasks: [] },
    [{ id: "x", status: "unknown" }],
    [{ status: "running" }],
    [{ id: "", status: "running" }],
    [null],
    [
      { id: "x", status: "running" },
      { id: "x", status: "running" },
    ],
  ])
    expect(readTaskList(value)).toBeNull();
});

test("recent analyses sort by creation time, limit to five, and handle unavailable dates", () => {
  const tasks = readTaskList(
    Array.from({ length: 7 }, (_, index) => ({
      id: String(index),
      status: "completed",
      createdAt: `2026-11-16T${String(index + 10).padStart(2, "0")}:00:00Z`,
    })),
  )!;
  expect(recentTasks(tasks).map((task) => task.id)).toEqual([
    "6",
    "5",
    "4",
    "3",
    "2",
  ]);
  expect(tasks[0].id).toBe("0");
  expect(
    readTaskList([
      { id: "unknown-date", status: "queued", createdAt: "bad" },
    ])![0].createdAt,
  ).toBeNull();
});
