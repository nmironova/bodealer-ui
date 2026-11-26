"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./results-panel.module.css";
import {
  TASK_STATUS,
  type TaskStatus,
  type TaskStatusResponse,
} from "@/app/lib/task-status";

type Props = {
  taskId?: string;
  starting: boolean;
  stale: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
};

export default function ResultsPanel({
  taskId,
  starting,
  stale,
  onStatusChange,
}: Props) {
  const [status, setStatus] = useState<TaskStatusResponse>();
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [copyMessage, setCopyMessage] = useState("");
  const observedTask = useRef<string>(undefined);
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!taskId || starting) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    if (observedTask.current !== taskId) {
      observedTask.current = taskId;
      setStatus({ status: TASK_STATUS.RUNNING });
      setOutput("");
    }
    setError("");
    setCopyMessage("");
    async function poll() {
      try {
        const response = await fetch(`/api/tasks/${taskId}`);
        if (response.status === 401) {
          if (active)
            setError("Your session has expired. Sign in again to continue.");
          return;
        }
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Could not fetch task status");
        if (!active) return;
        const next = data as TaskStatusResponse;
        setStatus(next);
        onStatusChange(taskId!, next.status);
        // These are server snapshots, not chunks. Never concatenate overlapping tails.
        if ("resultText" in next && next.resultText !== undefined)
          setOutput(next.resultText);
        else if ("logTail" in next && next.logTail !== undefined)
          setOutput(next.logTail);
        setError("");
        failures = 0;
        if (next.status === TASK_STATUS.RUNNING) timer = setTimeout(poll, 2000);
      } catch (cause) {
        if (!active) return;
        failures += 1;
        setError(cause instanceof Error ? cause.message : "Connection failed");
        if (failures < 5) timer = setTimeout(poll, 2000);
      }
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [taskId, starting, onStatusChange, retry]);

  const displayedOutput = starting ? "" : output;

  const lineCount = useMemo(() => {
    if (!displayedOutput) return 0;
    let count = 1;
    for (let i = 0; i < displayedOutput.length; i += 1)
      if (displayedOutput.charCodeAt(i) === 10) count += 1;
    return count;
  }, [displayedOutput]);

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(displayedOutput);
      setCopyMessage("Copied complete output");
    } catch {
      setCopyMessage("Copy failed. Select the output to copy it manually.");
    }
  }

  const label = starting ? "Starting…" : (status?.status ?? "Ready");
  const consoleView = (expanded = false) => (
    <pre
      tabIndex={0}
      aria-label="Original Walrus output"
      className={`walrus-console ${expanded ? "walrus-console-expanded" : ""}`}
    >
      {displayedOutput ||
        (starting || status?.status === TASK_STATUS.RUNNING
          ? "Waiting for Walrus output…"
          : "Output will appear here when available.")}
    </pre>
  );

  return (
    <section className="results-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
          Results
        </h2>
        <span
          role="status"
          className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${status?.status === "completed" ? "bg-green-100 text-green-700" : status?.status === "failed" ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700"}`}
        >
          {label}
        </span>
      </div>
      {stale && !starting && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <strong className="mb-1 block">Settings modified</strong>
          Settings have changed. These results are from the previous
          configuration. Run again to update.
        </p>
      )}
      <div
        className={`${styles.summary} my-4 rounded-lg border border-slate-200 p-4`}
      >
        <h3 className="font-semibold text-slate-900">
          {starting
            ? "Preparing your analysis"
            : !taskId
              ? "Ready to explore your hand"
              : status?.status === "running"
                ? "Analysis in progress"
                : status?.status === "completed"
                  ? "Analysis complete"
                  : status?.status === "cancelled"
                    ? "Analysis cancelled"
                    : "Analysis status"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {!taskId && !starting
            ? "Set your hand, add restrictions, and run an analysis. Your results will stay here as you adjust the setup."
            : "Original Walrus output. It updates while the analysis runs."}
        </p>
        {taskId && (
          <p className="mt-3 break-all font-mono text-xs text-slate-400">
            Task {taskId}
          </p>
        )}
      </div>
      {status?.status === "failed" && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {status.error}
        </p>
      )}
      {error && (
        <div role="alert" className="mb-3 text-sm text-red-700">
          {error}{" "}
          <a href="/login" className="mr-2 underline">
            Sign in
          </a>
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="underline"
          >
            Retry connection
          </button>
        </div>
      )}
      <section className="rounded-lg border border-slate-200 p-2">
        <div className="mb-2 flex items-center justify-end gap-3 px-2 text-sm">
          <span className="mr-auto text-xs text-slate-500">
            {displayedOutput ? `${lineCount} lines` : "No output yet"}
          </span>
          <button
            type="button"
            disabled={!displayedOutput}
            onClick={copyOutput}
            className="output-action"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
              dialog.current?.showModal();
            }}
            className="output-action"
          >
            ⤢ Expand
          </button>
        </div>
        <details open>
          <summary className="cursor-pointer px-2 pb-3 font-semibold text-slate-950">
            Raw output (Walrus)
          </summary>
          {consoleView()}
        </details>
      </section>
      <p role="status" className="mt-2 min-h-5 text-xs text-slate-500">
        {copyMessage}
      </p>
      <dialog
        ref={dialog}
        className="output-dialog"
        aria-labelledby="expanded-output-title"
        onClose={() => setExpanded(false)}
      >
        <div className="flex items-center justify-between gap-4 pb-4">
          <h2 id="expanded-output-title" className="text-lg font-semibold">
            Raw output (Walrus)
          </h2>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={copyOutput}
              className="output-action"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="output-action"
            >
              Close ✕
            </button>
          </div>
        </div>
        {expanded && consoleView(true)}
        <p role="status" className="mt-2 text-xs">
          {copyMessage}
        </p>
      </dialog>
    </section>
  );
}
