"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import type { NewTaskState } from "@/app/lib/actions";
import { createBodealerTask } from "@/app/lib/actions";
import {
  TASK_STATUS,
  type TaskStatus,
  type TaskStatusResponse,
} from "@/app/lib/task-status";
import { Button, ButtonVariant } from "@/app/ui/button";
import HandPicker from "@/app/ui/hand-picker";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-2 text-sm text-red-700">{errors.join(" ")}</p>;
}

function hasSubmittedValues(values: Record<string, string>, prefix: string) {
  return Object.entries(values).some(
    ([key, value]) => key.startsWith(`${prefix}.`) && value !== "",
  );
}

function toDigitsOnly(value: string) {
  return value.replaceAll(/\D/g, "");
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {title}
          </h2>
          <span className="text-sm text-gray-400 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </div>
      </summary>

      <div className="mt-4">{children}</div>
    </details>
  );
}

function CollapsiblePanel({
  title,
  children,
  defaultOpen = false,
  className = "",
  contentClassName = "",
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={[
        "group rounded-lg border border-gray-200 bg-white p-5 shadow-sm",
        className,
      ].join(" ")}
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {title}
          </h2>
          <span className="text-sm text-gray-400 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </div>
      </summary>

      <div className={["mt-4", contentClassName].join(" ")}>{children}</div>
    </details>
  );
}

const RESTRICTION_RANGES = [
  { key: "hcp", label: "HCP", min: 0, max: 37 },
  { key: "spades", label: "Spades", symbol: "♠", min: 0, max: 13 },
  { key: "hearts", label: "Hearts", symbol: "♥", min: 0, max: 13 },
  { key: "diamonds", label: "Diamonds", symbol: "♦", min: 0, max: 13 },
  { key: "clubs", label: "Clubs", symbol: "♣", min: 0, max: 13 },
] as const;

const SUIT_POINT_RANGES = [
  { key: "spadesPoints", label: "Spades points", symbol: "♠", min: 0, max: 10 },
  { key: "heartsPoints", label: "Hearts points", symbol: "♥", min: 0, max: 10 },
  {
    key: "diamondsPoints",
    label: "Diamonds points",
    symbol: "♦",
    min: 0,
    max: 10,
  },
  { key: "clubsPoints", label: "Clubs points", symbol: "♣", min: 0, max: 10 },
] as const;

type RestrictionRange =
  | (typeof RESTRICTION_RANGES)[number]
  | (typeof SUIT_POINT_RANGES)[number];

const TASK_TYPES = [
  { value: "FIXED_ONE_HAND", label: "Fixed one hand", enabled: false },
  { value: "FOUR_HANDS_TASK", label: "Four hands task", enabled: false },
  { value: "FILTERING_ONLY", label: "Filtering only", enabled: false },
  {
    value: "ONE_SIDED_BIDDING_LEVEL",
    label: "One-sided bidding level",
    enabled: true,
  },
  {
    value: "ONE_SIDED_DENOMINATION",
    label: "One-sided denomination",
    enabled: false,
  },
  {
    value: "COMPETITIVE_GENERIC",
    label: "Competitive generic",
    enabled: false,
  },
  { value: "SEEK_OPENING_LEAD", label: "Seek opening lead", enabled: true },
] as const;

const CONTRACT_LEVELS = ["1", "2", "3", "4", "5", "6", "7"] as const;
const CONTRACT_STRAINS = ["S", "H", "D", "C", "NT"] as const;
const POSTMORTEM_MODES = ["AUTO", "SUIT"] as const;

const STRAIN_LABELS: Record<(typeof CONTRACT_STRAINS)[number], string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
  NT: "NT",
};

const STRAIN_COLORS: Record<(typeof CONTRACT_STRAINS)[number], string> = {
  S: "text-gray-950",
  H: "text-red-600",
  D: "text-red-600",
  C: "text-gray-950",
  NT: "text-blue-700",
};

function TextField({
  id,
  name,
  value,
  onValueChange,
  label,
  placeholder,
}: {
  id: string;
  name: string;
  value: string;
  onValueChange: (name: string, value: string) => void;
  label: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={(e) => onValueChange(name, e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function RangeRow({
  prefix,
  field,
  minValue,
  maxValue,
  onValueChange,
}: {
  prefix: string;
  field: RestrictionRange;
  minValue: string;
  maxValue: string;
  onValueChange: (name: string, value: string) => void;
}) {
  const minName = `${prefix}.${field.key}Min`;
  const maxName = `${prefix}.${field.key}Max`;
  const labelId = `${prefix}.${field.key}.label`;

  return (
    <div className="grid grid-cols-[minmax(76px,1fr)_minmax(0,82px)_auto_minmax(0,82px)] items-center gap-2">
      <div
        id={labelId}
        className="flex items-center gap-2 text-sm text-gray-800"
      >
        {"symbol" in field ? (
          <span
            className={[
              "w-4 text-center text-base leading-none",
              field.key.startsWith("hearts") || field.key.startsWith("diamonds")
                ? "text-red-600"
                : "text-gray-950",
            ].join(" ")}
          >
            {field.symbol}
          </span>
        ) : null}
        <span className="truncate">{field.label}</span>
      </div>

      <input
        aria-labelledby={labelId}
        aria-label={`${field.label} min`}
        name={minName}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        placeholder="min"
        value={minValue}
        onChange={(e) => onValueChange(minName, toDigitsOnly(e.target.value))}
        className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-center text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <span className="text-sm text-gray-400">-</span>
      <input
        aria-labelledby={labelId}
        aria-label={`${field.label} max`}
        name={maxName}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        placeholder="max"
        value={maxValue}
        onChange={(e) => onValueChange(maxName, toDigitsOnly(e.target.value))}
        className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-center text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function getRangeSummary(
  values: Record<string, string>,
  prefix: string,
  key: string,
) {
  const min = values[`${prefix}.${key}Min`];
  const max = values[`${prefix}.${key}Max`];

  if (min && max) return `${min}-${max}`;
  if (min) return `${min}+`;
  if (max) return `0-${max}`;
  return null;
}

function restrictionSummary(values: Record<string, string>, prefix: string) {
  const chips: string[] = [];

  for (const field of RESTRICTION_RANGES) {
    const summary = getRangeSummary(values, prefix, field.key);
    if (summary) chips.push(`${field.label} ${summary}`);
  }

  for (const field of SUIT_POINT_RANGES) {
    const summary = getRangeSummary(values, prefix, field.key);
    if (summary) chips.push(`${field.symbol} points ${summary}`);
  }

  if (values[`${prefix}.noSixCardSuit`] === "true") {
    chips.push("No 6+ suit");
  }

  return chips;
}

function hasSuitPointValues(values: Record<string, string>, prefix: string) {
  return SUIT_POINT_RANGES.some(
    (field) =>
      values[`${prefix}.${field.key}Min`] ||
      values[`${prefix}.${field.key}Max`],
  );
}

function RestrictionBlock({
  title,
  prefix,
  values,
  onValueChange,
  defaultOpen = false,
}: {
  title: string;
  prefix: string;
  values: Record<string, string>;
  onValueChange: (name: string, value: string) => void;
  defaultOpen?: boolean;
}) {
  const shouldOpen = defaultOpen || hasSubmittedValues(values, prefix);
  const summary = restrictionSummary(values, prefix);

  return (
    <details
      open={shouldOpen}
      className="group rounded-lg border border-gray-200 bg-gray-50/80"
    >
      <summary className="cursor-pointer list-none p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {summary.length > 0 ? (
                summary.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">No restrictions</span>
              )}
            </div>
          </div>
          <span className="mt-0.5 text-sm text-gray-400 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </div>
      </summary>

      <div className="border-t border-gray-200 p-4 pt-3">
        <div className="space-y-2.5">
          {RESTRICTION_RANGES.map((field) => (
            <RangeRow
              key={field.key}
              prefix={prefix}
              field={field}
              minValue={values[`${prefix}.${field.key}Min`] ?? ""}
              maxValue={values[`${prefix}.${field.key}Max`] ?? ""}
              onValueChange={onValueChange}
            />
          ))}
        </div>

        <details
          open={hasSuitPointValues(values, prefix)}
          className="group/suit-points mt-4 rounded-md border border-gray-200 bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Points in suit
            <span className="text-sm text-gray-400 transition-transform group-open/suit-points:rotate-180">
              ⌄
            </span>
          </summary>
          <div className="space-y-2.5 border-t border-gray-200 p-3">
            {SUIT_POINT_RANGES.map((field) => (
              <RangeRow
                key={field.key}
                prefix={prefix}
                field={field}
                minValue={values[`${prefix}.${field.key}Min`] ?? ""}
                maxValue={values[`${prefix}.${field.key}Max`] ?? ""}
                onValueChange={onValueChange}
              />
            ))}
          </div>
        </details>

        <label className="mt-4 flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
          <input
            type="checkbox"
            name={`${prefix}.noSixCardSuit`}
            value="true"
            checked={values[`${prefix}.noSixCardSuit`] === "true"}
            onChange={(e) =>
              onValueChange(
                `${prefix}.noSixCardSuit`,
                e.target.checked ? "true" : "",
              )
            }
            className="rounded border-gray-300 text-blue-600"
          />
          No 6+ card suit
        </label>
      </div>
    </details>
  );
}

function LogsPanel({
  taskId,
  onStatusChange,
}: {
  taskId: string;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse>({
    status: TASK_STATUS.RUNNING,
  });
  const [requestError, setRequestError] = useState<string>();
  const [pollAttempt, setPollAttempt] = useState(0);

  useEffect(() => {
    if (!taskId) return;

    setTaskStatus({ status: TASK_STATUS.RUNNING });
    setRequestError(undefined);
    onStatusChange(taskId, TASK_STATUS.RUNNING);

    let intervalId: NodeJS.Timeout | null = null;
    let failedAttempts = 0;
    const MAX_FAILED_ATTEMPTS = 5;

    // Immediately check status on mount, then poll every 2 seconds
    const checkTaskStatus = async () => {
      setPollAttempt((currentAttempt) => currentAttempt + 1);
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        const data = (await res.json()) as
          | TaskStatusResponse
          | { error?: string };

        if (res.ok) {
          const status = data as TaskStatusResponse;
          failedAttempts = 0;
          setRequestError(undefined);
          setTaskStatus(status);
          onStatusChange(taskId, status.status);

          // Stop polling when the task reaches a terminal state
          if (status.status !== TASK_STATUS.RUNNING && intervalId) {
            console.log(`Task ${status.status}, stopping polling`);
            clearInterval(intervalId);
            intervalId = null;
          }
        } else {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Failed to fetch task status",
          );
        }
      } catch (e) {
        failedAttempts++;
        const errorMsg =
          e instanceof Error ? e.message : "Error fetching task status";

        setRequestError(errorMsg);

        // Stop polling after 5 failed attempts
        if (failedAttempts >= MAX_FAILED_ATTEMPTS && intervalId) {
          console.log(
            `Failed to connect ${MAX_FAILED_ATTEMPTS} times, stopping polling`,
          );
          clearInterval(intervalId);
          intervalId = null;
          setRequestError(
            `Connection lost after ${MAX_FAILED_ATTEMPTS} attempts`,
          );
        }
      }
    };

    checkTaskStatus();

    // Set up polling interval (2 seconds)
    intervalId = setInterval(checkTaskStatus, 2000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [onStatusChange, taskId]);

  return (
    <CollapsiblePanel
      title="Logs"
      defaultOpen={true}
      className="h-auto min-h-20 min-w-80 max-w-[calc(100vw-2rem)] resize overflow-hidden border-blue-200 bg-blue-50/50 open:h-96 open:min-h-64"
      contentClassName="h-[calc(100%-2rem)]"
    >
      <div className="flex h-full flex-col gap-4">
        <div className="rounded-md border border-blue-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-950">
              Board started
            </span>
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold",
                taskStatus.status === TASK_STATUS.COMPLETED
                  ? "border-green-200 bg-green-50 text-green-700"
                  : taskStatus.status === TASK_STATUS.FAILED
                    ? "border-red-200 bg-red-50 text-red-700"
                    : taskStatus.status === TASK_STATUS.CANCELLED
                      ? "border-gray-300 bg-gray-100 text-gray-700"
                      : "border-blue-200 bg-blue-50 text-blue-700",
              ].join(" ")}
            >
              {taskStatus.status === TASK_STATUS.RUNNING ? (
                <span
                  aria-hidden="true"
                  className="size-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700"
                />
              ) : null}
              {taskStatus.status === TASK_STATUS.COMPLETED
                ? "Completed"
                : taskStatus.status === TASK_STATUS.FAILED
                  ? "Failed"
                  : taskStatus.status === TASK_STATUS.CANCELLED
                    ? "Cancelled"
                    : "Running"}
            </span>
          </div>

          <div className="mt-3 grid gap-1 text-xs text-gray-600">
            <div className="flex items-center justify-between gap-3">
              <span>Task id</span>
              <span className="truncate font-mono text-gray-900">{taskId}</span>
            </div>
          </div>
        </div>

        <div className="min-h-24 flex-1 overflow-auto rounded-md border border-gray-200 bg-gray-950 p-3 font-mono text-xs text-gray-200">
          {requestError ? (
            <div className="text-red-400">Error: {requestError}</div>
          ) : taskStatus.status === TASK_STATUS.FAILED ? (
            <div className="text-red-400">Error: {taskStatus.error}</div>
          ) : taskStatus.status === TASK_STATUS.CANCELLED ? (
            <div className="text-gray-300">task cancelled</div>
          ) : taskStatus.status === TASK_STATUS.COMPLETED &&
            taskStatus.resultText ? (
            <pre className="whitespace-pre-wrap break-words text-green-300">
              {taskStatus.resultText}
            </pre>
          ) : (
            <>
              <div className="text-green-300">task accepted</div>
              <div className="mt-1 text-gray-400">
                checking task status
                {".".repeat(Math.max(1, pollAttempt))}
              </div>
            </>
          )}
        </div>
      </div>
    </CollapsiblePanel>
  );
}

export default function NewBoardForm() {
  const initialState: NewTaskState = { message: null, errors: {}, values: {} };
  const [state, formAction, pending] = useActionState(
    createBodealerTask,
    initialState,
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [reportedTask, setReportedTask] = useState<{
    taskId: string;
    status: TaskStatus;
  }>();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string>();

  const handleTaskStatusChange = useCallback(
    (taskId: string, status: TaskStatus) => {
      setReportedTask({ taskId, status });
    },
    [],
  );

  const currentTaskStatus =
    state?.taskId && reportedTask?.taskId === state.taskId
      ? reportedTask.status
      : state?.taskId
        ? TASK_STATUS.RUNNING
        : undefined;
  const isTaskRunning = currentTaskStatus === TASK_STATUS.RUNNING;

  async function handleCancelTask() {
    if (!state?.taskId || !isTaskRunning) return;

    setIsCancelling(true);
    setCancelError(undefined);

    try {
      const res = await fetch(`/api/tasks/${state.taskId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as
        | TaskStatusResponse
        | { error?: string };

      if (!res.ok) {
        throw new Error(
          "error" in data && data.error ? data.error : "Failed to cancel task",
        );
      }

      const status = data as TaskStatusResponse;
      setReportedTask({ taskId: state.taskId, status: status.status });
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : "Failed to cancel task",
      );
    } finally {
      setIsCancelling(false);
    }
  }

  function handleValueChange(name: string, value: string) {
    setValues((currentValues) => {
      if (value === "") {
        const nextValues = { ...currentValues };
        delete nextValues[name];
        return nextValues;
      }

      return { ...currentValues, [name]: value };
    });
  }

  const contractLevel = values.contractLevel ?? "4";
  const contractStrain = values.contractStrain ?? "S";
  const submittedBoardName = state?.values.name?.trim();
  const currentBoardName = values.name?.trim();
  const pageTitle =
    state?.taskId && submittedBoardName
      ? submittedBoardName
      : pending && currentBoardName
        ? currentBoardName
        : "New Board";

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-950">{pageTitle}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Build the hand, choose the calculation, and tune the deal filters.
          </p>
        </div>
      </div>

      <form action={formAction} className="mt-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
          <div className="space-y-5">
            <CollapsiblePanel title="Board setup" defaultOpen={true}>
              <div className="space-y-4">
                <TextField
                  id="name"
                  name="name"
                  value={values.name ?? ""}
                  onValueChange={handleValueChange}
                  label="Name"
                  placeholder="For example: 4H slam try after weak two"
                />
                <FieldError errors={state?.errors?.name} />

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-900"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={values.description ?? ""}
                    onChange={(e) =>
                      handleValueChange("description", e.target.value)
                    }
                    placeholder="Optional notes about bidding, lead problem, assumptions, etc."
                    className="mt-2 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <FieldError errors={state?.errors?.description} />
                </div>
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel title="Calculation" defaultOpen={true}>
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="taskType"
                    className="block text-sm font-medium text-gray-900"
                  >
                    Task type
                  </label>
                  <select
                    id="taskType"
                    name="taskType"
                    value={values.taskType ?? "ONE_SIDED_BIDDING_LEVEL"}
                    onChange={(e) =>
                      handleValueChange("taskType", e.target.value)
                    }
                    className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {TASK_TYPES.map((taskType) => (
                      <option
                        key={taskType.value}
                        value={taskType.value}
                        disabled={!taskType.enabled}
                      >
                        {taskType.label}
                        {taskType.enabled ? "" : " (not available yet)"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-sm font-medium text-gray-900">
                    Contract
                  </span>
                  <input
                    type="hidden"
                    name="contractLevel"
                    value={contractLevel}
                  />
                  <input
                    type="hidden"
                    name="contractStrain"
                    value={contractStrain}
                  />

                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="grid grid-cols-7 gap-1">
                      {CONTRACT_LEVELS.map((level) => {
                        const active = contractLevel === level;

                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() =>
                              handleValueChange("contractLevel", level)
                            }
                            className={[
                              "h-9 rounded-md border text-sm font-semibold transition",
                              active
                                ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                            ].join(" ")}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 grid grid-cols-5 gap-1">
                      {CONTRACT_STRAINS.map((strain) => {
                        const active = contractStrain === strain;

                        return (
                          <button
                            key={strain}
                            type="button"
                            onClick={() =>
                              handleValueChange("contractStrain", strain)
                            }
                            className={[
                              "h-10 rounded-md border bg-white text-sm font-semibold transition",
                              active
                                ? "border-blue-600 ring-2 ring-blue-100"
                                : "border-gray-200 hover:border-gray-300",
                              STRAIN_COLORS[strain],
                            ].join(" ")}
                          >
                            {STRAIN_LABELS[strain]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <FieldError errors={state?.errors?.calculation} />
            </CollapsiblePanel>

            <CollapsiblePanel title="Run" defaultOpen={true}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="boardsK"
                    className="block text-sm font-medium text-gray-900"
                  >
                    Boards
                  </label>

                  <div className="mt-2 flex items-center gap-3">
                    <input
                      id="boardsK"
                      name="boardsK"
                      type="number"
                      min={1}
                      max={200}
                      value={values.boardsK ?? "10"}
                      onChange={(e) =>
                        handleValueChange("boardsK", e.target.value)
                      }
                      className="h-10 w-28 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <span className="text-sm text-gray-600">thousands</span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="postmortem"
                    className="block text-sm font-medium text-gray-900"
                  >
                    Postmortem
                  </label>
                  <select
                    id="postmortem"
                    name="postmortem"
                    value={values.postmortem ?? "AUTO"}
                    onChange={(e) =>
                      handleValueChange("postmortem", e.target.value)
                    }
                    className="mt-2 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {POSTMORTEM_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <FieldError errors={state?.errors?.boardsK} />
            </CollapsiblePanel>
          </div>

          <div className="space-y-5">
            {state?.taskId ? (
              <LogsPanel
                taskId={state.taskId}
                onStatusChange={handleTaskStatusChange}
              />
            ) : null}
            <CollapsiblePanel
              title="Our hand"
              defaultOpen={true}
              className="border-gray-300 bg-gradient-to-b from-white to-gray-50"
            >
              <HandPicker
                key={values.hand ?? ""}
                defaultHandText={values.hand}
              />
              <FieldError errors={state?.errors?.hand} />
            </CollapsiblePanel>

            <CollapsibleSection
              title="Restrictions"
              defaultOpen={Boolean(state?.errors?.general)}
            >
              <div className="space-y-3">
                <RestrictionBlock
                  title="Partner"
                  prefix="partner"
                  values={values}
                  onValueChange={handleValueChange}
                  defaultOpen={Boolean(
                    state?.errors?.general?.some((error) =>
                      error.startsWith("Partner:"),
                    ),
                  )}
                />
                <RestrictionBlock
                  title="LHO"
                  prefix="lho"
                  values={values}
                  onValueChange={handleValueChange}
                  defaultOpen={Boolean(
                    state?.errors?.general?.some((error) =>
                      error.startsWith("LHO:"),
                    ),
                  )}
                />
                <RestrictionBlock
                  title="RHO"
                  prefix="rho"
                  values={values}
                  onValueChange={handleValueChange}
                  defaultOpen={Boolean(
                    state?.errors?.general?.some((error) =>
                      error.startsWith("RHO:"),
                    ),
                  )}
                />
              </div>
            </CollapsibleSection>
          </div>
        </div>

        {state?.message && !state.taskId ? (
          <div className="mt-5 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 shadow-sm">
            {state?.message}
            <FieldError errors={state?.errors?.general} />
          </div>
        ) : null}

        {cancelError ? (
          <p className="mt-3 text-sm text-red-700">{cancelError}</p>
        ) : null}

        <div className="sticky bottom-0 mt-5 flex items-center justify-end gap-3 border-t border-gray-200 bg-white/90 py-4 backdrop-blur">
          {state?.taskId && isTaskRunning ? (
            <Button
              type="button"
              variant={ButtonVariant.SECONDARY}
              disabled={isCancelling}
              onClick={handleCancelTask}
              className="rounded-md px-5 py-2.5"
            >
              {isCancelling ? "Cancelling…" : "Cancel task"}
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={pending || isTaskRunning || isCancelling}
            className="rounded-md px-5 py-2.5"
          >
            {pending ? "Starting…" : state?.taskId ? "Run again" : "Start"}
          </Button>
        </div>
      </form>
    </>
  );
}
