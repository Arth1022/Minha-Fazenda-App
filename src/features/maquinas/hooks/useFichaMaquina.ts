import { useMemo } from 'react';

import { useLiveQuery } from '@/database';
import type { AnotacaoMaquina, FichaMaquina } from '@/dtos';
import { adicionarDias, inicioDoDia } from '@/utils/date';
import { anotacoesDaMaquina } from '../data/anotacoes';
import { maquinaPorId } from '../data/maquinas';
import { tempoTotalRegistrado, usosDaMaquinaDesde, usosRecentes } from '../data/usos';
import { DIAS_DA_SEMANA_DE_USO, msParaHoras, somarDuracoes, usoPorDia } from '../services/uso';
import { useRelogio } from './useRelogio';

/** Com a máquina ligada, o gráfico da semana é refeito uma vez por minuto. */
const ATUALIZACAO_COM_USO_MS = 60 * 1000;

/** Tudo que a Ficha Máquina mostra, já calculado; null enquanto carrega ou se não existe. */
export function useFichaMaquina(id?: string): FichaMaquina | null {
  const chave = id ?? '';
  // Início da janela semanal: fixo enquanto a ficha está aberta
  const desde = useMemo(
    () => adicionarDias(inicioDoDia(new Date()), -(DIAS_DA_SEMANA_DE_USO - 1)),
    []
  );

  const { data: maquina } = useLiveQuery(maquinaPorId(chave), [chave]);
  const { data: semana } = useLiveQuery(usosDaMaquinaDesde(chave, desde), [chave, desde]);
  const { data: recentes } = useLiveQuery(usosRecentes(chave), [chave]);
  const { data: totais } = useLiveQuery(tempoTotalRegistrado(chave), [chave]);

  // Os recentes vêm do mais novo: se há uso em aberto, é o primeiro
  const usoAtual = recentes[0] && !recentes[0].fim ? recentes[0] : null;
  // Ligada, o uso em aberto cresce: o "agora" do gráfico anda de minuto em minuto
  const agora = useRelogio(usoAtual ? ATUALIZACAO_COM_USO_MS : null);

  return useMemo(() => {
    if (!maquina) return null;
    const usoSemanal = usoPorDia(semana, agora);
    const totalRegistradoMs = totais[0]?.totalMs ?? 0;
    return {
      maquina,
      usoAtual,
      usoSemanal,
      totalSemanaMs: somarDuracoes(usoSemanal),
      totalRegistradoMs,
      horimetroAtual:
        maquina.horimetroInicial === null
          ? null
          : maquina.horimetroInicial + msParaHoras(totalRegistradoMs),
      usosRecentes: recentes,
    };
  }, [maquina, semana, recentes, totais, usoAtual, agora]);
}

export function useAnotacoesMaquina(maquinaId?: string): AnotacaoMaquina[] {
  return useLiveQuery(anotacoesDaMaquina(maquinaId ?? ''), [maquinaId]).data;
}
