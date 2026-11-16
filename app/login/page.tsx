import { redirect } from "next/navigation";
import { currentSession } from "../lib/auth/request";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";
export default async function LoginPage() {
  let configured = true;
  let authenticated = false;
  try {
    authenticated = Boolean(await currentSession());
  } catch {
    configured = false;
  }
  if (authenticated) redirect("/boards/new");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-5">
      <section
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"
        aria-labelledby="login-title"
      >
        <div className="mb-8 flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-950">
          <span aria-hidden="true">♠</span>Bodealer
          <span className="ml-auto rounded-full bg-blue-50 px-3 py-1 text-xs font-medium tracking-normal text-blue-700">
            Private beta
          </span>
        </div>
        <h1
          id="login-title"
          className="text-2xl font-semibold tracking-tight text-slate-950"
        >
          Welcome to the table
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Enter your invitation password to set up hands and explore your next
          analysis.
        </p>
        {configured ? (
          <LoginForm />
        ) : (
          <p role="alert" className="mt-6 text-sm text-red-700">
            Sign in is not configured. Contact the beta administrator.
          </p>
        )}
      </section>
    </main>
  );
}
