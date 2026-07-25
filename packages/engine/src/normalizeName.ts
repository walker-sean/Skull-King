/** Trims a Player/Host name, returning null if nothing but whitespace is left. */
export function normalizeName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length === 0 ? null : trimmed;
}
