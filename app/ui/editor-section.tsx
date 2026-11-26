"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p role="alert" className="field-error">
      {errors.join(" ")}
    </p>
  );
}

type Props = {
  title: string;
  compact: boolean;
  editLabel: string;
  className?: string;
  badge?: ReactNode;
  summary?: (
    open: () => void,
    expanded: boolean,
    editorId: string,
  ) => ReactNode;
  keepSummaryInline?: boolean;
  collapseOnLeave?: boolean;
  collapsible?: boolean;
  initiallyCollapsed?: boolean;
  hideLabel?: string;
  children: ReactNode;
};

export default function EditorSection({
  title,
  compact,
  editLabel,
  className = "",
  badge,
  summary,
  keepSummaryInline = false,
  collapseOnLeave = false,
  collapsible = false,
  initiallyCollapsed = false,
  hideLabel = "Hide editor",
  children,
}: Props) {
  const section = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const pointerDown = useRef(false);
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const inlineCollapsed =
    !compact && (collapsible || collapseOnLeave) && collapsed;
  useEffect(() => {
    if (compact || !collapseOnLeave) return;
    function startPointer() {
      pointerDown.current = true;
    }
    function endPointer() {
      pointerDown.current = false;
    }
    function leave(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !section.current?.contains(event.target)
      )
        setCollapsed(true);
    }
    document.addEventListener("pointerdown", startPointer, true);
    document.addEventListener("pointerup", endPointer, true);
    document.addEventListener("pointercancel", endPointer, true);
    document.addEventListener("click", leave);
    return () => {
      document.removeEventListener("pointerdown", startPointer, true);
      document.removeEventListener("pointerup", endPointer, true);
      document.removeEventListener("pointercancel", endPointer, true);
      document.removeEventListener("click", leave);
      pointerDown.current = false;
    };
  }, [compact, collapseOnLeave]);
  const id = useId();
  const titleId = useId();
  const [expanded, setExpanded] = useState(false);
  function open() {
    const element = document.getElementById(id) as HTMLDialogElement | null;
    if (!element) return;
    if (compact) {
      if (element.open) element.close();
      element.showModal();
      setExpanded(true);
      element
        .querySelector<HTMLElement>(
          "input:not([type=hidden]), select, textarea",
        )
        ?.focus();
    } else {
      setCollapsed(false);
      element.open = true;
      element
        .querySelector<HTMLElement>(
          "input:not([type=hidden]), select, textarea",
        )
        ?.focus();
    }
  }
  return (
    <section
      ref={section}
      className={`work-section ${className}`}
      data-collapsed={compact ? !expanded : inlineCollapsed}
      aria-labelledby={titleId}
      onBlur={(event) => {
        if (
          !compact &&
          collapseOnLeave &&
          !pointerDown.current &&
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setCollapsed(true);
      }}
    >
      <header className="section-heading">
        <h2 id={titleId}>{title}</h2>
        <div className="section-heading-actions">
          {badge}
          {(compact || collapsible || collapseOnLeave) && (
            <button
              type="button"
              className="edit-action"
              onClick={() => {
                if (!compact && !inlineCollapsed) setCollapsed(true);
                else open();
              }}
              aria-controls={id}
              aria-expanded={compact ? expanded : !inlineCollapsed}
            >
              {!compact && !inlineCollapsed ? hideLabel : editLabel}
            </button>
          )}
        </div>
      </header>
      <div
        className={
          keepSummaryInline ? "hand-layout hand-editor-content" : undefined
        }
      >
        {(compact || inlineCollapsed || keepSummaryInline) &&
          summary?.(open, compact ? expanded : !inlineCollapsed, id)}
        <dialog
          ref={dialog}
          id={id}
          open={!compact && !inlineCollapsed}
          role={compact ? "dialog" : "group"}
          className={`section-editor ${compact ? "editor-drawer" : "editor-inline"}`}
          aria-label={editLabel}
          onClose={() => setExpanded(false)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              event.target instanceof HTMLInputElement
            )
              event.preventDefault();
          }}
        >
          {compact && (
            <header className="drawer-heading">
              <div>
                <span>Analysis setup</span>
                <h2>{title}</h2>
              </div>
              <button
                type="button"
                className="edit-action"
                onClick={() => dialog.current?.close()}
                aria-label={`Close ${editLabel}`}
              >
                Done <span aria-hidden="true">✕</span>
              </button>
            </header>
          )}
          <div className="editor-fields">{children}</div>
        </dialog>
      </div>
    </section>
  );
}
