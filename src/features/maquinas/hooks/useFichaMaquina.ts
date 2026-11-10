import { useMemo } from 'react';

import { useLiveQuery } from '@/database';
import type { AnotacaoMaquina, FichaMaquina, UsoMaquina } from '@/dtos';
import { adicionarDias, inicioDoDia } from '@/utils/date';
import { anotacoesDaMaquina } from '../data/anotacoes';
import { maquinaPorId } from '../data/maquinas';
import {
  tempoTotalRegistrado,
  usosDaMaquinaDesde,
  usosDoImplemento,
  usosDoImplementoDesde,
  usosRecentes,
} from '../data/usos';
import { DIAS_DA_SEMANA_DE_USO, somarDuracoes, usoPorDia } from '../services/uso';
import { useHorimetro } from './useHorimetro';
import { useRelogio } from './useRelogio';

/** Com a máquina ligada, o gráfico da semana é refeito uma vez por minuto. */
const ATUALIZACAO_COM_USO_MS = 60 * 1000;

/** Soma um total dos usos; null se nenhum uso tem o valor (ex.: nenhum teve GPS). */
function somaOuNull(usos: UsoMaquina[], valor: (uso: UsoMaquina) => number | null): number | null {
  const valores = usos.map(valor).filter((v): v is number => v !== null);
  return valores.length > 0 ? valores.reduce((a, b) => a + b, 0) : null;
}

/**
 * Tudo que a Ficha Máquina mostra, já calculado; null enquanto carrega ou se não
 * existe. Implemento usa os usos em que esteve engatado (o uso vem do trator).
 */
export function useFichaMaquina(id?: string): FichaMaquina | null {
  const chave = id ?? '';
  // Início da janela semanal: fixo enquanto a ficha está aberta
  const desde = useMemo(
    () => adicionarDias(inicioDoDia(new Date()), -(DIAS_DA_SEMANA_DE_USO - 1)),
    []
  );

  const { data: maquina } = useLiveQuery(maquinaPorId(chave), [chave]);
  const { data: semanaPropria } = useLiveQuery(usosDaMaquinaDesde(chave, desde), [chave, desde]);
  const { data: recentesProprios } = useLiveQuery(usosRecentes(chave), [chave]);
  const { data: semanaEngatado } = useLiveQuery(usosDoImplementoDesde(chave, desde), [chave, desde]);
  const { data: recentesEngatado } = useLiveQuery(usosDoImplemento(chave), [chave]);
  const { data: totais } = useLiveQuery(tempoTotalRegistrado(chave), [chave]);
  const { estimadoH } = useHorimetro(maquina ?? null);

  const implemento = maquina?.categoria === 'implemento';
  const semana = implemento ? semanaEngatado : semanaPropria;
  const recentes = implemento ? recentesEngatado : recentesProprios;

  // Os recentes vêm do mais novo: se há uso em aberto, é o primeiro
  const usoAtual = !implemento && recentes[0] && !recentes[0].fim ? recentes[0] : null;
  // Ligada, o uso em aberto cresce: o "agora" do gráfico anda de minuto em minuto
  const agora = useRelogio(usoAtual ? ATUALIZACAO_COM_USO_MS : null);

  return useMemo(() => {
    if (!maquina) return null;
    const usoSemanal = usoPorDia(semana, agora);
    const encerradosNaSemana = semana.filter((u) => u.fim !== null && u.inicio >= desde);
    return {
      maquina,
      usoAtual,
      usoSemanal,
      totalSemanaMs: somarDuracoes(usoSemanal),
      totalRegistradoMs: totais[0]?.totalMs ?? 0,
      horimetroAtual: maquina.possuiHorimetro ? estimadoH : null,
      kmSemana: somaOuNull(encerradosNaSemana, (u) => u.kmTotal),
      haSemana: somaOuNull(encerradosNaSemana, (u) => u.areaEstimadaHa),
      usosRecentes: recentes,
    };
  }, [maquina, semana, recentes, totais, usoAtual, agora, estimadoH, desde]);
}

export function useAnotacoesMaquina(maquinaId?: string): AnotacaoMaquina[] {
  return useLiveQuery(anotacoesDaMaquina(maquinaId ?? ''), [maquinaId]).data;
}
