import { useMemo } from 'react';

import { useLiveQuery } from '@/database';
import type { MaquinaComUso } from '@/dtos';
import { maquinaPorId } from '../data/maquinas';
import { usosRecentes } from '../data/usos';

/** Uma máquina com o uso em aberto (reativo); null enquanto carrega ou sem id. */
export function useMaquinaComUso(id: string | null): MaquinaComUso | null {
  const chave = id ?? '';
  const { data: maquina } = useLiveQuery(maquinaPorId(chave), [chave]);
  // O uso mais recente: se não tem fim, a máquina está ligada
  const { data: ultimos } = useLiveQuery(usosRecentes(chave, 1), [chave]);

  return useMemo(() => {
    if (!id || !maquina) return null;
    const ultimo = ultimos[0];
    return { ...maquina, usoAtual: ultimo && !ultimo.fim ? ultimo : null };
  }, [id, maquina, ultimos]);
}
