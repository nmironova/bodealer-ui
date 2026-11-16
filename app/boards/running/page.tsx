import { requireSession } from "../../lib/auth/request";
export default async function RunningBoardsPage() {
  await requireSession();
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Running Boards</h1>
      <p className="mt-2 text-sm text-gray-600">
        TODO: list running/queued tasks.
      </p>
    </main>
  );
}
