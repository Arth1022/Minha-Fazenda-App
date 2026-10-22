/**
 * Utilitários de data no formato brasileiro (DD/MM/AAAA)
 */

/** Converte "DD/MM/AAAA" em Date; retorna null se inválida. */
export function parseDataBR(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match.map(Number);
  const parsed = new Date(y, m - 1, d);
  if (parsed.getDate() !== d || parsed.getMonth() !== m - 1) return null;
  return parsed;
}

/** Formata uma Date como "DD/MM/AAAA". */
export function formatDataBR(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}
