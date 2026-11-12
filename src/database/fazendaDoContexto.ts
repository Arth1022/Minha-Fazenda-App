import { useSyncExternalStore } from 'react';

import { fazendaDoContexto, ouvirFazendaDoContexto } from '@/entities';

/**
 * Fazenda ativa usada nos filtros das consultas; o componente re-renderiza
 * quando ela muda (troca de fazenda, convite aceito, fazenda nova).
 */
export function useFazendaDoContexto(): string | null {
  return useSyncExternalStore(ouvirFazendaDoContexto, fazendaDoContexto, fazendaDoContexto);
}
