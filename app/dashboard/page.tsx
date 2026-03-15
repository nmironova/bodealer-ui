import DashboardTile from "../ui/dashboard-tile";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Bodealer</h1>
      <p className="mt-2 text-sm text-gray-600">
        Create a board task, track progress, and review results.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <DashboardTile
          href="/boards/new"
          title="New Board"
          description="Create a new calculation task."
          icon={{ src: "/hearts.png", alt: "Heart suit" }}
        />
        <DashboardTile
          href="/boards/running"
          title="Running Boards"
          description="See tasks in progress and queued."
          icon={{ src: "/diamonds.png", alt: "Diamonds suit" }}
        />
        <DashboardTile
          href="/boards/completed"
          title="Completed Boards"
          description="Browse finished tasks and results."
          icon={{ src: "/clubs.png", alt: "Clubs suit" }}
        />
      </div>
    </main>
  );
}
