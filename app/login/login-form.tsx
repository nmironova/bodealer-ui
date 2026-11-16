"use client";

import { useActionState, useState } from "react";
import { signIn } from "./actions";
import styles from "./login.module.css";

export default function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form
      action={action}
      className={styles.form}
      aria-busy={pending}
      onSubmit={() => setShowPassword(false)}
    >
      <label htmlFor="password" className={styles.label}>
        Beta password
      </label>
      <div className={styles.passwordField}>
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          maxLength={1024}
          aria-describedby={state.error ? "login-error" : undefined}
          aria-invalid={Boolean(state.error)}
          className={styles.input}
        />
        <button
          type="button"
          className={styles.visibility}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-controls="password"
          aria-pressed={showPassword}
          onClick={() => setShowPassword((visible) => !visible)}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {showPassword && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
      {state.error && (
        <p id="login-error" role="alert" className={styles.error}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="8" />
            <path d="M10 5v6m0 2v2" />
          </svg>
          <span>{state.error}</span>
        </p>
      )}
      <button type="submit" disabled={pending} className={styles.submit}>
        {pending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
