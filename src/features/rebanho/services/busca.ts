import type { Animal } from '@/dtos';
import { normalizarTexto } from '@/utils';

type AnimalBuscavel = Pick<Animal, 'brinco' | 'nome' | 'raca'>;

/** Na busca, "#104" e "104" são o mesmo brinco. */
function semCerquilha(texto: string): string {
  return texto.replace(/^#+/, '');
}

/** 0 = mais provável; null = não combina com o termo. */
function relevancia(animal: AnimalBuscavel, termo: string): number | null {
  const brinco = semCerquilha(normalizarTexto(animal.brinco));
  const nome = normalizarTexto(animal.nome ?? '');
  if (brinco === termo || nome === termo) return 0;
  if (brinco.startsWith(termo) || nome.startsWith(termo)) return 1;
  if (brinco.includes(termo) || nome.includes(termo)) return 2;
  if (normalizarTexto(animal.raca ?? '').includes(termo)) return 3;
  return null;
}

/**
 * Animais que combinam com o termo pelo brinco, nome ou raça (sem diferenciar
 * acentos e maiúsculas), os mais prováveis primeiro: brinco ou nome exato, depois
 * os que começam com o termo, os que o contêm e, por último, a raça. Sem termo,
 * devolve todos na ordem recebida.
 */
export function buscarAnimais<T extends AnimalBuscavel>(animais: T[], termo: string): T[] {
  const alvo = semCerquilha(normalizarTexto(termo));
  if (!alvo) return animais;

  return animais
    .map((animal, ordem) => ({ animal, ordem, nota: relevancia(animal, alvo) }))
    .filter((item): item is { animal: T; ordem: number; nota: number } => item.nota !== null)
    .sort((a, b) => a.nota - b.nota || a.ordem - b.ordem)
    .map(({ animal }) => animal);
}
