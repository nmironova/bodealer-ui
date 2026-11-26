"use client";

import { useRef, useState } from "react";
import styles from "./config-preview.module.css";

export default function ConfigPreview({
  configText,
  fileName,
  errors,
}: {
  configText?: string;
  fileName?: string;
  errors: string[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function copy() {
    if (configText === undefined) return;
    try {
      await navigator.clipboard.writeText(configText);
      setMessage("Config copied.");
    } catch {
      setMessage("Could not copy. Select the text and copy it manually.");
    }
  }

  function download() {
    if (configText === undefined || !fileName) return;
    const url = URL.createObjectURL(
      new Blob([configText], { type: "text/plain" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="config-preview"
        onClick={() => {
          if (dialog.current?.open) dialog.current.close();
          else {
            setMessage("");
            if (window.matchMedia("(max-width: 767px)").matches)
              dialog.current?.showModal();
            else dialog.current?.show();
            setOpen(true);
          }
        }}
      >
        {open ? "Hide config" : "View config"}
      </button>
      <dialog
        ref={dialog}
        id="config-preview"
        onKeyDown={(event) => {
          if (event.key === "Escape") dialog.current?.close();
        }}
        aria-labelledby="config-preview-title"
        className={styles.drawer}
        onClose={() => {
          setOpen(false);
          setMessage("");
        }}
      >
        <header className={styles.heading}>
          <div>
            <h2 id="config-preview-title">Configuration preview</h2>
            <p>Read-only · Exact Walrus text uploaded as configFile</p>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close config preview"
          >
            Close ✕
          </button>
        </header>
        {configText === undefined ? (
          <div role="alert">
            <p>Fix these settings to generate the upload:</p>
            <ul>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        ) : (
          <pre
            className={styles.code}
            tabIndex={0}
            aria-label="Server config payload"
          >
            {configText}
          </pre>
        )}
        <footer className={styles.actions}>
          <button
            type="button"
            disabled={configText === undefined}
            onClick={() => void copy()}
          >
            Copy config
          </button>
          <button
            type="button"
            disabled={configText === undefined}
            onClick={download}
          >
            Download .txt
          </button>
        </footer>
        <p role="status">{message}</p>
      </dialog>
    </>
  );
}
