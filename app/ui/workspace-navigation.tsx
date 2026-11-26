import Link from "next/link";
import ThemeSelector from "./theme-selector";

const destinations = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard" },
  { key: "analysis", href: "/boards/new", label: "New analysis" },
  { key: "tasks", href: "/boards/running", label: "Tasks" },
  { key: "completed", href: "/boards/completed", label: "Completed" },
] as const;

type Props = {
  active: (typeof destinations)[number]["key"];
  className?: string;
  includeDashboard?: boolean;
};

export default function WorkspaceNavigation({
  active,
  className,
  includeDashboard = true,
}: Props) {
  return (
    <header className={["analysis-nav", className].filter(Boolean).join(" ")}>
      <Link href="/dashboard" className="text-2xl font-semibold tracking-tight">
        ♠ Bodealer
      </Link>
      <nav
        aria-label="Main navigation"
        className="flex items-center gap-2 sm:gap-5"
      >
        {destinations
          .filter((item) => includeDashboard || item.key !== "dashboard")
          .map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active === item.key ? "page" : undefined}
              className={
                active === item.key
                  ? "rounded-lg bg-slate-700 px-4 py-2"
                  : "px-3 py-2"
              }
            >
              {item.label}
            </Link>
          ))}
      </nav>
      <div className="navigation-account">
        <ThemeSelector />
        <form action="/logout" method="post">
          <button className="cursor-pointer rounded-lg px-3 py-2 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
