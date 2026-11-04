/**
 * Thin blue outline hugging a node's symbol while it is selected, the same
 * look as the symbol outline in wire mode. Purely visual: it never takes
 * pointer events.
 */
export function SelectionFrame({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 ring-[1.5px] ring-blue-500"
    />
  );
}
