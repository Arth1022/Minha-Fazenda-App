/** Garante o prefixo "#" no número do brinco (ex.: "104" → "#104"). */
export function formatBrinco(brinco: string): string {
  const trimmed = brinco.trim();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

/** Remove acentos, caixa e espaços das pontas para comparar textos ("Guzerá" = "guzera"). */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Exibido no lugar de um valor que ainda não foi informado. */
export const SEM_VALOR = '—';

/** Número com vírgula decimal (ex.: 22.1 → "22,1"). */
export function formatDecimal(valor: number, casas = 1): string {
  return valor.toFixed(casas).replace('.', ',');
}

/** Valor com unidade ("22,1 L"), ou "—" quando não há valor. */
export function formatMedida(valor: number | null, unidade: string, casas = 1): string {
  return valor === null ? SEM_VALOR : `${formatDecimal(valor, casas)} ${unidade}`;
}
