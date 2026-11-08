import type { Maquina } from '@/dtos';
import { normalizarTexto } from '@/utils/formatters';
import { TIPO_MAQUINA_LABEL } from '../labels';

type MaquinaBuscavel = Pick<Maquina, 'codigo' | 'nome' | 'tipo' | 'marca' | 'modelo'>;

/** 0 = mais provável; null = não combina com o termo. */
function relevancia(maquina: MaquinaBuscavel, termo: string): number | null {
  const codigo = normalizarTexto(maquina.codigo);
  const nome = normalizarTexto(maquina.nome);
  if (codigo === termo || nome === termo) return 0;
  if (codigo.startsWith(termo) || nome.startsWith(termo)) return 1;
  if (codigo.includes(termo) || nome.includes(termo)) return 2;
  const outros = [maquina.marca, maquina.modelo, TIPO_MAQUINA_LABEL[maquina.tipo]]
    .map((campo) => normalizarTexto(campo ?? ''))
    .join(' ');
  return outros.includes(termo) ? 3 : null;
}

/**
 * Máquinas que combinam com o termo pelo ID, nome, marca, modelo ou tipo (sem
 * diferenciar acento e maiúsculas), as mais prováveis primeiro: ID ou nome exato,
 * depois os que começam com o termo, os que o contêm e, por último, marca/modelo/tipo.
 * Sem termo, devolve todas na ordem recebida.
 */
export function buscarMaquinas<T extends MaquinaBuscavel>(maquinas: readonly T[], termo: string): T[] {
  const alvo = normalizarTexto(termo);
  if (!alvo) return [...maquinas];

  return maquinas
    .map((maquina, ordem) => ({ maquina, ordem, nota: relevancia(maquina, alvo) }))
    .filter((item): item is { maquina: T; ordem: number; nota: number } => item.nota !== null)
    .sort((a, b) => a.nota - b.nota || a.ordem - b.ordem)
    .map(({ maquina }) => maquina);
}
