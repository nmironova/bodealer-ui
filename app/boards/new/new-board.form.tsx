"use client";

import {
  useActionState,
  useCallback,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { NewTaskState } from "@/app/lib/actions";
import { createBodealerTask } from "@/app/lib/actions";
import {
  boardFileName,
  createBoardFile,
  parseBoardFile,
} from "@/app/lib/board-config-file";
import {
  buildRestrictions,
  validatePlayerRestrictions,
  readCombinations,
  validateCombinations,
} from "@/app/lib/bodealer-form";
import {
  TASK_STATUS,
  type TaskStatus,
  type TaskStatusResponse,
} from "@/app/lib/task-status";
import HandPicker, { isCompleteHandText } from "@/app/ui/hand-picker";
import EditorSection, { FieldError } from "../../ui/editor-section";
import RestrictionsPanel from "./restrictions-panel";
import CalculationEditor, { calculationSummary } from "./calculation-editor";
import ResultsPanel from "./results-panel";
import styles from "./workbench.module.css";

function configurationSnapshot(values: Record<string, string>) {
  const normalized = {
    taskType: "ONE_SIDED_BIDDING_LEVEL",
    contractLevel: "4",
    contractStrain: "S",
    contractDeclarer: "S",
    boardsK: "10",
    postmortem: "AUTO",
    hand: "- - - -",
    ...values,
  };
  return JSON.stringify(
    Object.entries(normalized)
      .filter(([, value]) => value !== "")
      .sort(([a], [b]) => a.localeCompare(b)),
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
  const [fileMessage, setFileMessage] = useState<{
    kind: "success" | "error";
    text: string;
  }>();
  const [submittedConfiguration, setSubmittedConfiguration] =
    useState<string>();
  const [lastRun, setLastRun] = useState<{
    taskId: string;
    configuration?: string;
  }>();
  if (state?.taskId && state.taskId !== lastRun?.taskId) {
    setLastRun({ taskId: state.taskId, configuration: submittedConfiguration });
  }
  const [handRevision, setHandRevision] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"setup" | "results">("setup");
  const [clientErrors, setClientErrors] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function clearRestrictions(prefix: string) {
    setValues((currentValues) =>
      Object.fromEntries(
        Object.entries(currentValues).filter(
          ([key]) => !key.startsWith(`${prefix}.`),
        ),
      ),
    );
  }

  function swapOpponentRestrictions() {
    setValues((currentValues) => {
      const nextValues = Object.fromEntries(
        Object.entries(currentValues).filter(
          ([key]) => !key.startsWith("lho.") && !key.startsWith("rho."),
        ),
      );

      for (const [key, value] of Object.entries(currentValues)) {
        if (key.startsWith("lho.")) {
          nextValues[`rho.${key.slice("lho.".length)}`] = value;
        } else if (key.startsWith("rho.")) {
          nextValues[`lho.${key.slice("rho.".length)}`] = value;
        }
      }

      return nextValues;
    });
  }

  function saveBoardFile() {
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const formValues = Object.fromEntries(
      [...formData.entries()].flatMap(([name, value]) =>
        typeof value === "string" ? [[name, value]] : [],
      ),
    );
    const contents = JSON.stringify(createBoardFile(formValues), null, 2);
    const url = URL.createObjectURL(
      new Blob([contents], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = boardFileName(formValues.name);
    link.click();
    URL.revokeObjectURL(url);
    setFileMessage({ kind: "success", text: "Board settings saved." });
  }

  async function loadBoardFile(file: File) {
    try {
      const loadedValues = parseBoardFile(await file.text());
      setValues(loadedValues);
      setHandRevision((revision) => revision + 1);
      setFileMessage({
        kind: "success",
        text: `Loaded settings from ${file.name}.`,
      });
    } catch (error) {
      setFileMessage({
        kind: "error",
        text:
          error instanceof Error ? error.message : "Could not load the file.",
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const compact = hasSubmitted || Boolean(lastRun);
  const stale = Boolean(
    lastRun && lastRun.configuration !== configurationSnapshot(values),
  );
  const errors = [
    ...clientErrors,
    ...(state?.message && !state.taskId
      ? [
          state.message,
          ...Object.values(state.errors ?? {}).flatMap((items) => items ?? []),
        ]
      : []),
  ];

  function beforeSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const restrictions = buildRestrictions(formData);
    const errors = [
      ...validatePlayerRestrictions(restrictions?.partner, "Partner"),
      ...validatePlayerRestrictions(restrictions?.lho, "LHO"),
      ...validatePlayerRestrictions(restrictions?.rho, "RHO"),
      ...validateCombinations(readCombinations(formData)),
    ];
    if (!values.name?.trim()) errors.unshift("Name is required.");
    else if (values.name.trim().length > 100)
      errors.push("Name must be at most 100 characters.");
    if ((values.description ?? "").length > 1000)
      errors.push("Description must be at most 1000 characters.");
    if (!isCompleteHandText(String(formData.get("hand") ?? "")))
      errors.push("Your hand must contain exactly 13 valid, distinct cards.");
    const boards = Number(formData.get("boardsK"));
    if (!Number.isInteger(boards) || boards < 1 || boards > 200)
      errors.push("Boards must be a whole number between 1 and 200 thousands.");
    if (
      Object.entries(values).some(
        ([key, value]) =>
          /(?:Min|Max)$/.test(key) &&
          value !== "" &&
          !Number.isInteger(Number(value)),
      )
    )
      errors.push("Restriction ranges must use whole numbers.");
    if (errors.length) {
      event.preventDefault();
      setClientErrors(errors);
      setActiveTab("setup");
      return;
    }
    setClientErrors([]);
    setSubmittedConfiguration(configurationSnapshot(values));
    setFileMessage(undefined);
    setHasSubmitted(true);
    setActiveTab("results");
  }

  return (
    <div
      className={`${styles.workspace} ${compact ? styles.workbench : styles.initial}`}
      data-mode={compact ? "workbench" : "setup"}
    >
      <header className={styles.toolbar}>
        <div>
          <h1>
            {compact
              ? values.name?.trim() || "Untitled analysis"
              : "Analysis setup"}
          </h1>
          <p>
            {compact
              ? calculationSummary(values)
              : "Configure the hand, restrictions and calculation, then run your analysis."}
          </p>
        </div>
        <div className={styles.fileActions}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.bodealer.json,application/json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadBoardFile(file);
            }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Load
          </button>
          <button type="button" onClick={saveBoardFile}>
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setValues({});
              setHandRevision((revision) => revision + 1);
              setFileMessage(undefined);
              setClientErrors([]);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            Clear
          </button>
          {state?.taskId && isTaskRunning && (
            <button
              type="button"
              onClick={handleCancelTask}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling…" : "Cancel task"}
            </button>
          )}
        </div>
      </header>
      {fileMessage && (
        <p
          role={fileMessage.kind === "error" ? "alert" : "status"}
          className={
            fileMessage.kind === "error" ? "field-error" : styles.fileMessage
          }
        >
          {fileMessage.text}
        </p>
      )}
      {errors.length > 0 && (
        <div role="alert" className={styles.validation}>
          <strong>Check your setup</strong>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {cancelError && (
        <p role="alert" className="field-error">
          {cancelError}
        </p>
      )}
      <div
        className={styles.mobileTabs}
        role="tablist"
        aria-label="Analysis workspace"
        onKeyDown={(event) => {
          if (
            event.key === "ArrowLeft" ||
            event.key === "ArrowRight" ||
            event.key === "Home" ||
            event.key === "End"
          ) {
            event.preventDefault();
            const next =
              event.key === "Home"
                ? "setup"
                : event.key === "End"
                  ? "results"
                  : activeTab === "setup"
                    ? "results"
                    : "setup";
            setActiveTab(next);
            document.getElementById(`workspace-tab-${next}`)?.focus();
          }
        }}
      >
        <button
          id="workspace-tab-setup"
          role="tab"
          type="button"
          tabIndex={activeTab === "setup" ? 0 : -1}
          aria-selected={activeTab === "setup"}
          aria-controls="workspace-setup"
          onClick={() => setActiveTab("setup")}
        >
          Setup
        </button>
        <button
          id="workspace-tab-results"
          role="tab"
          type="button"
          tabIndex={activeTab === "results" ? 0 : -1}
          aria-selected={activeTab === "results"}
          aria-controls="workspace-results"
          onClick={() => setActiveTab("results")}
        >
          Results
        </button>
      </div>
      <form
        ref={formRef}
        action={formAction}
        noValidate
        onSubmit={beforeSubmit}
        className={styles.layout}
      >
        <section
          id="workspace-setup"
          className={`analysis-setup ${styles.setup}`}
          data-active={activeTab === "setup"}
          aria-label="Analysis setup"
        >
          <div className={styles.metadata}>
            <div>
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                value={values.name ?? ""}
                onChange={(event) =>
                  handleValueChange("name", event.target.value)
                }
                placeholder="Give this analysis a name"
                maxLength={100}
              />
              <FieldError errors={state?.errors?.name} />
            </div>
            <div>
              <label htmlFor="description">
                Description <span>optional</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={1}
                value={values.description ?? ""}
                onChange={(event) =>
                  handleValueChange("description", event.target.value)
                }
                placeholder="Bidding notes or assumptions…"
                maxLength={1000}
              />
              <FieldError errors={state?.errors?.description} />
            </div>
          </div>
          <div className={styles.sections}>
            <HandPicker
              key={handRevision}
              compact={compact}
              defaultHandText={values.hand}
              onHandChange={(hand) => handleValueChange("hand", hand)}
            />
            <RestrictionsPanel
              compact={compact}
              values={values}
              onValueChange={handleValueChange}
              onClear={clearRestrictions}
              onSwap={swapOpponentRestrictions}
              errors={state?.errors?.general}
            />
            <EditorSection
              title="Calculation"
              compact={compact}
              editLabel="Edit calculation"
              className="calculation-section"
              summary={(open) => (
                <button
                  type="button"
                  onClick={open}
                  className="calculation-summary"
                  aria-label="Edit calculation settings"
                >
                  <strong>{calculationSummary(values).split(" · ")[0]}</strong>
                  <span>
                    {calculationSummary(values)
                      .split(" · ")
                      .slice(1)
                      .join(" · ")}
                    <small>
                      {(values.taskType ?? "ONE_SIDED_BIDDING_LEVEL") ===
                      "SEEK_OPENING_LEAD"
                        ? "Seek opening lead"
                        : "One-sided bidding level"}
                    </small>
                  </span>
                </button>
              )}
            >
              <CalculationEditor
                values={values}
                onValueChange={handleValueChange}
                errors={state?.errors}
              />
            </EditorSection>
          </div>
          <div className={styles.runBar}>
            {compact && stale && (
              <p className={styles.modified}>Settings modified</p>
            )}
            <button
              type="submit"
              disabled={pending || isTaskRunning || isCancelling}
              className={styles.runButton}
            >
              {pending ? "Starting…" : compact ? "Run again" : "Run analysis"}
              <span aria-hidden="true">{compact ? "↻" : "▶"}</span>
            </button>
            {!compact && (
              <p className={styles.runHint}>
                Select 13 cards and give your analysis a name to get started.
              </p>
            )}
          </div>
        </section>
        <aside
          id="workspace-results"
          className={`results-column ${styles.results}`}
          data-active={activeTab === "results"}
          aria-label="Analysis results"
        >
          <ResultsPanel
            taskId={lastRun?.taskId}
            starting={pending}
            onStatusChange={handleTaskStatusChange}
            stale={stale}
          />
          <button
            type="button"
            className={styles.mobileEdit}
            onClick={() => setActiveTab("setup")}
          >
            Edit &amp; run again
          </button>
        </aside>
      </form>
    </div>
  );
}
