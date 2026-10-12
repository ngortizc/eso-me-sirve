export function DemoBadge({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <span className="demo-badge" title="Esta vista utiliza datos ficticios">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-amber" />
      {compact ? "Demo" : "Datos de demostración"}
    </span>
  );
}
