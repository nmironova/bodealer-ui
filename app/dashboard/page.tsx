import Link from "next/link";
import { requireSession } from "../lib/auth/request";
import WorkspaceNavigation from "../ui/workspace-navigation";
import DashboardContent from "./dashboard-content";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  await requireSession();
  return (
    <>
      <WorkspaceNavigation active="dashboard" className={styles.navigation} />
      <main className={styles.page}>
        <header className={styles.welcome}>
          <div>
            <h1>Your bridge workspace</h1>
            <p>
              Analyze hands, test bidding and play restrictions, and explore
              results with Walrus/Oscar.
            </p>
          </div>
          <Link href="/boards/new" className={styles.primaryAction}>
            <span aria-hidden="true">+</span> New analysis
          </Link>
        </header>
        <DashboardContent />
      </main>
    </>
  );
}
