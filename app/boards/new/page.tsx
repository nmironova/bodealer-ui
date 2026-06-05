import NewBoardForm from "./new-board.form";

export default function NewBoardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-950">New Board</h1>
          <p className="mt-1 text-sm text-gray-600">
            Build the hand, choose the calculation, and tune the deal filters.
          </p>
        </div>
      </div>

      <NewBoardForm />
    </main>
  );
}
