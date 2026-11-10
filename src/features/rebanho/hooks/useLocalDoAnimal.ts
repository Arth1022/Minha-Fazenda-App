import { useConsultaAoVivo } from '@/database';
import { listarLotes, TABELAS_LOTES, type LoteResumo } from '@/services/loteService';
import { historicoDoAnimal, TABELAS_HISTORICO_ANIMAL } from '@/services/movimentacaoService';
import type { PassagemDoAnimal } from '../services/local';

/**
 * Onde o animal está, por onde passou e o lote dele, ao vivo (ficha → "Onde
 * está"). O local atual é a passagem sem saída.
 */
export function useLocalDoAnimal(animalId: string, loteId: string | null) {
  const { dados: historico } = useConsultaAoVivo<PassagemDoAnimal[]>(
    () => historicoDoAnimal(animalId),
    TABELAS_HISTORICO_ANIMAL,
    animalId,
    []
  );
  const { dados: lotes } = useConsultaAoVivo<LoteResumo[]>(() => listarLotes(), TABELAS_LOTES, 'lotes', []);
  const atual = historico[0] && historico[0].saidaEm === null ? historico[0] : null;
  const lote = lotes.find((l) => l.id === loteId) ?? null;
  return { historico, atual, lote, lotes };
}
