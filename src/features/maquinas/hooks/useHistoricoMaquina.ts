import { useMemo } from 'react';

import { useLiveQuery } from '@/database';
import type { UsoMaquina } from '@/dtos';
import { abastecimentosDaMaquina } from '../data/abastecimentos';
import { leiturasDaMaquina } from '../data/horimetro';
import { problemasDaMaquina } from '../data/ocorrencias';
import { montarHistorico, type DiaHistorico } from '../services/historico';

/** Quantos registros de cada tipo a aba Histórico lê (consultas pelos índices máquina + data). */
const LIMITE_POR_TIPO = 10;
/** Quantos acontecimentos a aba mostra, juntando todos os tipos */
const LIMITE_HISTORICO = 20;

/**
 * Aba Histórico da ficha: usos (os já carregados pela ficha), abastecimentos,
 * leituras do horímetro e problemas, juntos e agrupados por dia.
 */
export function useHistoricoMaquina(maquinaId: string, usos: UsoMaquina[]): DiaHistorico[] {
  const { data: abastecimentos } = useLiveQuery(abastecimentosDaMaquina(maquinaId, LIMITE_POR_TIPO), [maquinaId]);
  const { data: leituras } = useLiveQuery(leiturasDaMaquina(maquinaId, LIMITE_POR_TIPO), [maquinaId]);
  const { data: problemas } = useLiveQuery(problemasDaMaquina(maquinaId, LIMITE_POR_TIPO), [maquinaId]);

  return useMemo(
    () => montarHistorico({ usos, abastecimentos, leituras, problemas }, LIMITE_HISTORICO),
    [usos, abastecimentos, leituras, problemas]
  );
}
