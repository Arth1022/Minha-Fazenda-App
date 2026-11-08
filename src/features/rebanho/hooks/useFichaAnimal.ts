import { useMemo } from 'react';

import { useLiveQuery } from '@/database';
import type { DoseConfirmada, FichaAnimal, Tratamento, TratamentoAtivo } from '@/dtos';
import { useFazenda } from '@/providers/FazendaProvider';
import { inicioDoDia } from '@/utils/date';
import { animalPorId, criasDe } from '../data/animais';
import { diasConfirmadosDoAnimal } from '../data/doses';
import { controlesDoAnimal, mastitesDoAnimal, secagensDoAnimal } from '../data/leite';
import { avaliacoesDoAnimal, pesagensDoAnimal } from '../data/pesagens';
import { ciosDoAnimal, reproducoesDoAnimal } from '../data/reproducoes';
import { anotacoesDoAnimal, examesDoAnimal } from '../data/saude';
import { tratamentosDoAnimal } from '../data/tratamentos';
import {
  calcularFase,
  calcularSituacaoLeite,
  emIdadeReprodutiva,
  formatarIdade,
} from '../services/fase';
import { alertaPrincipal } from '../services/alertas';
import { diasComDose, proximaDosePendente, tratamentosAtivos } from '../services/doses';
import {
  calcularPesoAtual,
  calcularPrevisaoParto,
  coberturaEmAberto,
  indicesReprodutivos,
  proximoCio,
} from '../services/indicadores';
import { resumoDoLeite } from '../services/leite';

/** Trilha de dias com dose do tratamento, cruzada com os dias já confirmados. */
function montarTratamentoAtivo(
  tratamento: Tratamento,
  confirmados: Date[],
  agora: Date
): TratamentoAtivo {
  const dias = new Set(confirmados.map((d) => d.getTime()));
  const hoje = inicioDoDia(agora).getTime();
  const trilha = diasComDose(tratamento).map((d) => ({
    ...d,
    confirmado: dias.has(d.dia.getTime()),
    futuro: d.dia.getTime() > hoje,
  }));
  return {
    tratamento,
    trilha,
    hoje: trilha.find((d) => d.dia.getTime() === hoje) ?? null,
    proximaDose: proximaDosePendente(tratamento, confirmados, agora),
  };
}

/** Dias confirmados agrupados por tratamento. */
function confirmadosPorTratamento(doses: DoseConfirmada[]): Map<string, Date[]> {
  const mapa = new Map<string, Date[]>();
  for (const { tratamentoId, dia } of doses) {
    mapa.set(tratamentoId, [...(mapa.get(tratamentoId) ?? []), dia]);
  }
  return mapa;
}

/**
 * Dados da Ficha Animal, reativos ao banco. Null enquanto carrega ou se o animal
 * não existe.
 *
 * TODO(back-end): ligar quando forem entregues — alertaPrincipal,
 * montarLinhaDoTempo, calcularLembretes e contagemNotificacoes.
 */
export function useFichaAnimal(id?: string): FichaAnimal | null {
  const { produzLeite } = useFazenda();
  const animalId = id ?? '';
  const { data: animal } = useLiveQuery(animalPorId(animalId), [animalId]);
  const { data: crias } = useLiveQuery(criasDe(animalId), [animalId]);
  const { data: pesagens } = useLiveQuery(pesagensDoAnimal(animalId), [animalId]);
  const { data: reproducoes } = useLiveQuery(reproducoesDoAnimal(animalId), [animalId]);
  const { data: tratamentos } = useLiveQuery(tratamentosDoAnimal(animalId), [animalId]);
  const { data: doses } = useLiveQuery(diasConfirmadosDoAnimal(animalId), [animalId]);
  const { data: avaliacoes } = useLiveQuery(avaliacoesDoAnimal(animalId), [animalId]);
  const { data: controles } = useLiveQuery(controlesDoAnimal(animalId), [animalId]);
  const { data: secagens } = useLiveQuery(secagensDoAnimal(animalId), [animalId]);
  const { data: mastites } = useLiveQuery(mastitesDoAnimal(animalId), [animalId]);
  const { data: cios } = useLiveQuery(ciosDoAnimal(animalId), [animalId]);
  const { data: exames } = useLiveQuery(examesDoAnimal(animalId), [animalId]);
  const { data: anotacoes } = useLiveQuery(anotacoesDoAnimal(animalId), [animalId]);

  return useMemo(() => {
    if (!animal) return null;

    // No DESC do SQLite os nulos vêm por último: a primeira cria com data é a mais nova
    const ultimoParto = crias.find((c) => c.dataNascimento)?.dataNascimento ?? null;
    const fase = calcularFase({
      sexo: animal.sexo,
      dataNascimento: animal.dataNascimento,
      ultimoParto,
      jaPariu: animal.jaPariu,
    });
    const coberturaAberta = coberturaEmAberto(reproducoes);
    const agora = new Date();
    const confirmados = confirmadosPorTratamento(doses);
    const totalCrias = crias.length + animal.criasAnteriores;
    const podeReproduzir = emIdadeReprodutiva(animal.sexo, fase);
    const ehVacaDeLeite = produzLeite && fase === 'vaca';
    const leite = ehVacaDeLeite
      ? resumoDoLeite({ controles, secagens, ultimoParto, totalPartos: totalCrias }, agora)
      : null;

    return {
      animal,
      fase,
      idade: animal.dataNascimento ? formatarIdade(animal.dataNascimento) : null,
      situacaoLeite: calcularSituacaoLeite(fase, ultimoParto, produzLeite, agora, leite?.secaDesde ?? null),
      ultimoParto,
      podeReproduzir,
      peso: calcularPesoAtual(pesagens),
      pesagens,
      crias,
      totalCrias,
      reproducao: {
        coberturaAberta,
        previsaoParto: coberturaAberta ? calcularPrevisaoParto(coberturaAberta.data) : null,
      },
      reproducoes,
      tratamentos,
      tratamentosAtivos: tratamentosAtivos(tratamentos, agora).map((t) =>
        montarTratamentoAtivo(t, confirmados.get(t.id) ?? [], agora)
      ),
      avaliacoes,
      controlesLeiteiros: controles,
      leite,
      mastites,
      cios,
      // Prever o cio só faz sentido em fêmea vazia
      proximoCio: podeReproduzir && !coberturaAberta ? proximoCio(cios.map((c) => c.data), agora) : null,
      indices: podeReproduzir
        ? indicesReprodutivos({
            dataNascimento: animal.dataNascimento,
            partos: crias.map((c) => c.dataNascimento).filter((d): d is Date => d !== null),
            criasAnteriores: animal.criasAnteriores,
            reproducoes,
          })
        : null,
      exames,
      anotacoes,
      alerta: alertaPrincipal(
        {
          animal,
          fase,
          tratamentos,
          dosesConfirmadas: doses,
          coberturaAberta,
          produzLeite,
        },
        agora
      ),
    };
  }, [
    animal,
    crias,
    pesagens,
    reproducoes,
    tratamentos,
    doses,
    avaliacoes,
    controles,
    secagens,
    mastites,
    cios,
    exames,
    anotacoes,
    produzLeite,
  ]);
}
