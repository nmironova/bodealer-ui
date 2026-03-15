import NewBoardForm from './new-board.form';

export default function NewBoardPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-gray-900">New Board</h1>
      <p className="mt-2 text-sm text-gray-600">
        Enter your hand and set the settings.
      </p>

      <NewBoardForm />
    </main>
  );
}
