import { useMemo } from 'react';

import { useLiveQuery } from '@/database';
import type { MaquinaComUso } from '@/dtos';
import { listarMaquinas } from '../data/maquinas';
import { usosEmAberto } from '../data/usos';

/** Frota com o uso em andamento de cada máquina (reativo, duas consultas no total). */
export function useMaquinas(): MaquinaComUso[] {
  const { data: lista } = useLiveQuery(listarMaquinas());
  const { data: abertos } = useLiveQuery(usosEmAberto());

  return useMemo(() => {
    const usoPor = new Map(abertos.map((uso) => [uso.maquinaId, uso]));
    return lista.map((maquina) => ({ ...maquina, usoAtual: usoPor.get(maquina.id) ?? null }));
  }, [lista, abertos]);
}
