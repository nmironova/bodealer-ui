import { redirect } from "next/navigation";
import { currentSession } from "../lib/auth/request";
import LoginForm from "./login-form";
import styles from "./login.module.css";

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
    <main className={styles.page}>
      <span className={styles.backgroundSuit} aria-hidden="true">
        ♠
      </span>
      <span className={styles.backgroundSuit} aria-hidden="true">
        ♠
      </span>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.branding}>
          <div className={styles.brand}>
            <span className={styles.brandSuit} aria-hidden="true">
              ♠
            </span>
            Bodealer
          </div>
          <span className={styles.badge}>Private beta</span>
        </div>
        <div className={styles.cards} aria-hidden="true">
          {["♠", "♥", "♦", "♣"].map((suit) => (
            <span key={suit} className={styles.playingCard}>
              {suit}
            </span>
          ))}
        </div>
        <div className={styles.welcome}>
          <h1 id="login-title" className={styles.title}>
            Welcome to the table
          </h1>
          <p className={styles.description}>
            Enter your invitation password to set up hands and explore your next
            analysis.
          </p>
        </div>
        {configured ? (
          <LoginForm />
        ) : (
          <p role="alert" className={styles.configurationError}>
            Sign in is not configured. Contact the beta administrator.
          </p>
        )}
      </section>
    </main>
  );
}
