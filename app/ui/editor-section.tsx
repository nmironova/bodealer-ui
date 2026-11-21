"use client";

import { useId, useRef, useState, type ReactNode } from "react";

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
  children,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
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
      element
        .querySelector<HTMLInputElement>("input:not([type=hidden])")
        ?.focus();
    }
  }
  return (
    <section className={`work-section ${className}`} aria-labelledby={titleId}>
      <header className="section-heading">
        <h2 id={titleId}>{title}</h2>
        <div className="section-heading-actions">
          {badge}
          {compact && (
            <button
              type="button"
              className="edit-action"
              onClick={open}
              aria-controls={id}
              aria-expanded={expanded}
            >
              {editLabel}
            </button>
          )}
        </div>
      </header>
      <div className={keepSummaryInline ? "hand-layout" : undefined}>
        {(compact || keepSummaryInline) &&
          summary?.(open, !compact || expanded, id)}
        <dialog
          ref={dialog}
          id={id}
          open={!compact}
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
