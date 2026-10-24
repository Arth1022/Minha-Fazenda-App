/** Garante o prefixo "#" no número do brinco (ex.: "104" → "#104"). */
export function formatBrinco(brinco: string): string {
  const trimmed = brinco.trim();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

/** Remove acentos, caixa e espaços das pontas para comparar textos ("Guzerá" = "guzera"). */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
