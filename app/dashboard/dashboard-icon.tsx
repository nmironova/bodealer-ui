export default function DashboardIcon({
  kind,
  size = 24,
}: {
  kind: "play" | "clock" | "check" | "layers" | "warning";
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "play" && <path d="m7 4 14 8-14 8V4Z" />}
      {kind === "clock" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6v6l4 3" />
        </>
      )}
      {kind === "check" && <path d="m4 12 5 5L20 6" />}
      {kind === "layers" && (
        <>
          <path d="m12 3 10 5-10 5L2 8l10-5Z" />
          <path d="m2 12 10 5 10-5M2 16l10 5 10-5" />
        </>
      )}
      {kind === "warning" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6m0 3h.01" />
        </>
      )}
    </svg>
  );
}
