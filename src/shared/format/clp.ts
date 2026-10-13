export function formatClp(amount: number): string {
  return `$${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(amount)} CLP`;
}
