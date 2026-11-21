import { requireSession } from "../../lib/auth/request";
import WorkspaceNavigation from "../../ui/workspace-navigation";
import NewBoardForm from "./new-board.form";
import styles from "./workbench.module.css";

export default async function NewBoardPage() {
  await requireSession();
  return (
    <>
      <WorkspaceNavigation
        active="analysis"
        includeDashboard={false}
        className={styles.navigation}
      />
      <main className="analysis-page mx-auto max-w-[1600px] p-4 sm:p-6">
        <NewBoardForm />
      </main>
    </>
  );
}
