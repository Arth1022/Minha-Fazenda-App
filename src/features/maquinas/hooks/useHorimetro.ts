import { useMemo } from 'react';

import { useLiveQuery } from '@/database';
import type { LeituraHorimetro, Maquina } from '@/dtos';
import { leiturasDaMaquina } from '../data/horimetro';
import { usosDaMaquinaDesde } from '../data/usos';
import { horimetroEstimado } from '../services/registros';

export interface SituacaoHorimetro {
  /** Última leitura digitada; null se nunca leu */
  ultima: LeituraHorimetro | null;
  /** Esperado agora: última leitura (ou o do cadastro) + horas de uso no app */
  estimadoH: number | null;
}

const NUNCA = new Date(0);

/** Horímetro da máquina: a última leitura e o que o app espera agora. */
export function useHorimetro(maquina: Pick<Maquina, 'id' | 'horimetroInicial' | 'createdAt'> | null): SituacaoHorimetro {
  const id = maquina?.id ?? '';
  const { data: leituras } = useLiveQuery(leiturasDaMaquina(id, 1), [id]);
  const ultima = leituras[0] ?? null;

  const referencia = useMemo(() => {
    if (ultima) return { valorH: ultima.valorH, em: ultima.lidoEm };
    if (maquina && maquina.horimetroInicial !== null) {
      return { valorH: maquina.horimetroInicial, em: maquina.createdAt ?? NUNCA };
    }
    return null;
  }, [ultima, maquina]);

  const desde = referencia?.em ?? NUNCA;
  const { data: usos } = useLiveQuery(usosDaMaquinaDesde(id, desde), [id, desde.getTime()]);

  return useMemo(
    () => ({ ultima, estimadoH: horimetroEstimado(referencia, usos, new Date()) }),
    [ultima, referencia, usos]
  );
}
