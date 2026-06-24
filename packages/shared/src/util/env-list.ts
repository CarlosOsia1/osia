/** Parsea una env CSV ('a, b ,c') a lista limpia (['a','b','c']). Reusado por las allowlists de CORS. */
export function parseCsvList(value: string | undefined | null): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
