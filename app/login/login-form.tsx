"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="mt-7 space-y-5">
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-800"
        >
          Beta password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={1024}
          aria-describedby={state.error ? "login-error" : undefined}
          aria-invalid={Boolean(state.error)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      {state.error && (
        <p id="login-error" role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="w-full cursor-pointer rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-3 font-semibold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
