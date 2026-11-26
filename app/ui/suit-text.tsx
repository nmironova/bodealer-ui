/** Color suit symbols inside summaries without changing their text. */
export default function SuitText({ children }: { children: string }) {
  return children.split(/([♠♥♦♣])/).map((part, index) =>
    /^[♠♥♦♣]$/.test(part) ? (
      <span
        key={index}
        className={part === "♥" || part === "♦" ? "suit-red" : "suit-black"}
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
}
