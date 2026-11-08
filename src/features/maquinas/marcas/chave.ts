import { normalizarTexto } from '@/utils/formatters';

/** Apelidos comuns no campo para as marcas com logo. */
const APELIDOS: Record<string, string> = {
  jd: 'johndeere',
  deere: 'johndeere',
  mf: 'masseyferguson',
  massey: 'masseyferguson',
  nh: 'newholland',
  case: 'caseih',
  vw: 'volkswagen',
  cat: 'caterpillar',
  gm: 'chevrolet',
  chevy: 'chevrolet',
};

/** "John Deere " → "johndeere": sem acento, caixa, espaços nem pontuação. */
export function compactarMarca(marca: string): string {
  return normalizarTexto(marca).replace(/[^a-z0-9]/g, '');
}

/**
 * Chave do logo para o que o produtor digitou em "Marca": nome exato, apelido
 * ("MF", "VW") ou nome contido no texto ("Massey Ferguson 4275"). Null se nenhuma.
 * `chaves` deve vir da maior para a menor, para "caseih" ganhar de "case".
 */
export function chaveDaMarca(marca: string | null, chaves: readonly string[]): string | null {
  if (!marca) return null;
  const texto = compactarMarca(marca);
  if (!texto) return null;
  if (chaves.includes(texto)) return texto;
  if (APELIDOS[texto]) return APELIDOS[texto];
  return chaves.find((chave) => texto.includes(chave)) ?? null;
}
