import { chaveDaMarca } from './chave';
import { LOGOS_VETORIAIS } from './logosVetoriais';
import type { LogoMarca } from './tipos';

/** Marcas sem vetor livre: PNG pequeno e recortado (ver CREDITOS.md). */
const LOGOS_IMAGEM: Record<string, LogoMarca> = {
  masseyferguson: {
    formato: 'imagem',
    nome: 'Massey Ferguson',
    fonte: require('@/assets/images/marcas/masseyferguson.png'),
  },
  newholland: {
    formato: 'imagem',
    nome: 'New Holland',
    fonte: require('@/assets/images/marcas/newholland.png'),
  },
  valtra: { formato: 'imagem', nome: 'Valtra', fonte: require('@/assets/images/marcas/valtra.png') },
  caseih: { formato: 'imagem', nome: 'Case IH', fonte: require('@/assets/images/marcas/caseih.png') },
};

const LOGOS: Record<string, LogoMarca> = {
  ...Object.fromEntries(
    Object.entries(LOGOS_VETORIAIS).map(([chave, logo]) => [chave, { formato: 'vetor', ...logo }])
  ),
  ...LOGOS_IMAGEM,
};

/** Da maior para a menor: a busca por trecho acha o nome mais completo primeiro. */
const CHAVES = Object.keys(LOGOS).sort((a, b) => b.length - a.length);

/** Nomes das marcas com logo, para o autocompletar do cadastro. */
export const MARCAS_COM_LOGO: readonly string[] = Object.values(LOGOS)
  .map((logo) => logo.nome)
  .sort((a, b) => a.localeCompare(b));

/** Cache: a lista chama isto a cada card e o texto da marca quase nunca muda. */
const cache = new Map<string, LogoMarca | null>();

/** Logo da marca digitada, ou null para usar o ícone genérico do tipo. */
export function logoDaMarca(marca: string | null): LogoMarca | null {
  if (!marca) return null;
  if (!cache.has(marca)) {
    const chave = chaveDaMarca(marca, CHAVES);
    cache.set(marca, chave ? LOGOS[chave] : null);
  }
  return cache.get(marca) ?? null;
}
