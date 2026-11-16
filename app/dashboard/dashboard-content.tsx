"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readTaskList,
  recentTasks,
  taskSummary,
  type ListedTask,
} from "../lib/task-list";
import DashboardIcon from "./dashboard-icon";
import styles from "./dashboard.module.css";

type State =
  | { phase: "loading" }
  | { phase: "error"; message: string; unauthorized: boolean }
  | { phase: "ready"; tasks: ListedTask[] };
const cards = [
  {
    key: "running",
    title: "Running",
    subtitle: "Calculations in progress",
    icon: "play",
  },
  {
    key: "queued",
    title: "Queued",
    subtitle: "Waiting to start",
    icon: "clock",
  },
  {
    key: "completed",
    title: "Completed",
    subtitle: "Finished analyses",
    icon: "check",
  },
] as const;

function creationTime(value: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function DashboardContent() {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const response = await fetch("/api/tasks", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setState({
            phase: "error",
            unauthorized: response.status === 401,
            message:
              response.status === 401
                ? "Sign in again to load your analyses."
                : "We couldn’t load your analyses. Please try again.",
          });
          return;
        }
        const tasks = readTaskList(await response.json());
        if (!tasks) throw new Error("Unsupported task list");
        setState({ phase: "ready", tasks });
        // Keep counts and statuses current without a long-lived server request.
        timer = setTimeout(load, 15000);
      } catch {
        if (!controller.signal.aborted)
          setState({
            phase: "error",
            unauthorized: false,
            message: "We couldn’t load your analyses. Please try again.",
          });
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [revision]);

  const counts = state.phase === "ready" ? taskSummary(state.tasks) : null;
  const recent = state.phase === "ready" ? recentTasks(state.tasks) : [];
  return (
    <>
      <section
        className={styles.summary}
        aria-label="Analysis summary"
        aria-busy={state.phase === "loading"}
      >
        {cards.map((card) => (
          <article
            className={styles.summaryCard}
            key={card.key}
            aria-labelledby={`summary-${card.key}`}
          >
            <span className={`${styles.summaryIcon} ${styles[card.key]}`}>
              <DashboardIcon kind={card.icon} size={27} />
            </span>
            <div>
              <h2 id={`summary-${card.key}`} className={styles.summaryTitle}>
                {card.title}
              </h2>
              <p
                className={styles.count}
                aria-label={
                  counts
                    ? `${card.title}: ${counts[card.key]}`
                    : `${card.title}: ${state.phase === "loading" ? "Loading" : "Unavailable"}`
                }
              >
                {counts
                  ? counts[card.key]
                  : state.phase === "loading"
                    ? "…"
                    : "—"}
              </p>
              <p className={styles.summaryDescription}>{card.subtitle}</p>
            </div>
          </article>
        ))}
      </section>
      <section
        className={styles.recent}
        aria-labelledby="recent-title"
        aria-busy={state.phase === "loading"}
      >
        <header className={styles.recentHeader}>
          <h2 id="recent-title">
            <DashboardIcon kind="layers" size={26} />
            Recent analyses
          </h2>
          <Link href="/boards/running" className={styles.textLink}>
            View all <span aria-hidden="true">→</span>
          </Link>
        </header>
        {state.phase === "loading" ? (
          <div className={styles.statePanel} role="status">
            <span className={styles.stateIcon}>
              <DashboardIcon kind="layers" size={48} />
            </span>
            <h3>Loading analyses…</h3>
            <p>Checking your latest calculations.</p>
          </div>
        ) : state.phase === "error" ? (
          <div className={styles.statePanel} role="alert">
            <span className={styles.stateIcon}>
              <DashboardIcon kind="warning" size={42} />
            </span>
            <h3>Analyses unavailable</h3>
            <p>{state.message}</p>
            {state.unauthorized ? (
              <Link href="/login" className={styles.secondaryAction}>
                Sign in
              </Link>
            ) : (
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => {
                  setState({ phase: "loading" });
                  setRevision((value) => value + 1);
                }}
              >
                Try again
              </button>
            )}
          </div>
        ) : recent.length === 0 ? (
          <div className={styles.statePanel}>
            <span className={styles.stateIcon}>
              <DashboardIcon kind="layers" size={54} />
            </span>
            <h3>No analyses yet</h3>
            <p>Create your first calculation to see it here.</p>
            <Link href="/boards/new" className={styles.secondaryAction}>
              <span className={styles.plusBubble} aria-hidden="true">
                +
              </span>
              Create a new analysis
            </Link>
          </div>
        ) : (
          <ul className={styles.taskList} aria-label="Recent analyses">
            {recent.map((task) => (
              <li key={task.id} className={styles.taskRow}>
                <div className={styles.taskName}>
                  <span className={styles.taskGlyph} aria-hidden="true">
                    ♠
                  </span>
                  <div>
                    <h3>Analysis {task.id.slice(0, 8)}</h3>
                    <time dateTime={task.createdAt ?? undefined}>
                      {creationTime(task.createdAt)}
                    </time>
                  </div>
                </div>
                <span className={`${styles.status} ${styles[task.status]}`}>
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
