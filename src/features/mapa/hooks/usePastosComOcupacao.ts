import { useMemo } from 'react';

import { useConsultaAoVivo, useLiveQuery } from '@/database';
import { ocupacaoDasAreas, TABELAS_OCUPACAO } from '@/services/movimentacaoService';
import { listarTalhoesAtivos } from '@/services/talhaoService';
import { mapaDeOcupacao, type LinhaOcupacao } from '../services/ocupacao';

/** Pastos da fazenda e quantos animais há em cada um, ao vivo (mover lote, mover animal). */
export function usePastosComOcupacao() {
  const { data: areas } = useLiveQuery(listarTalhoesAtivos());
  const { dados: linhas } = useConsultaAoVivo<LinhaOcupacao[]>(
    () => ocupacaoDasAreas(),
    TABELAS_OCUPACAO,
    'ocupacao',
    []
  );
  const pastos = useMemo(() => areas.filter((a) => a.tipo === 'pasto'), [areas]);
  const ocupacoes = useMemo(() => mapaDeOcupacao(linhas), [linhas]);
  return { pastos, ocupacoes };
}
