/** Garante o prefixo "#" no número do brinco (ex.: "104" → "#104"). */
export function formatBrinco(brinco: string): string {
  const trimmed = brinco.trim();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}
