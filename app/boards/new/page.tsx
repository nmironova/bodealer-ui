import Link from "next/link";
import NewBoardForm from "./new-board.form";

export default function NewBoardPage() {
  return (
    <>
      <header className="analysis-nav">
        <Link
          href="/dashboard"
          className="text-2xl font-semibold tracking-tight"
        >
          ♠ Bodealer
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-2 sm:gap-5"
        >
          <Link
            href="/boards/new"
            aria-current="page"
            className="rounded-lg bg-slate-700 px-4 py-2"
          >
            New analysis
          </Link>
          <Link href="/boards/running" className="px-3 py-2">
            Tasks
          </Link>
          <Link href="/boards/completed" className="px-3 py-2">
            Completed
          </Link>
        </nav>
      </header>
      <main className="analysis-page mx-auto max-w-[1600px] p-4 sm:p-6">
        <NewBoardForm />
      </main>
    </>
  );
}
