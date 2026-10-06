/** Dia civil (AAAA-MM-DD) em America/Sao_Paulo. */
export function todayBR(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
