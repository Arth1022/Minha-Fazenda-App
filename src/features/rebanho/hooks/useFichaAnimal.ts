import { useMemo } from 'react';

import { useLiveQuery } from '@/database';
import type {
  DoseConfirmada,
  FichaAnimal,
  Reproducao,
  Tratamento,
  TratamentoAtivo,
} from '@/dtos';
import { useFazenda } from '@/providers/FazendaProvider';
import { inicioDoDia } from '@/utils/date';
import { animalPorId, criasDe } from '../data/animais';
import { diasConfirmadosDoAnimal } from '../data/doses';
import { pesagensDoAnimal } from '../data/pesagens';
import { reproducoesDoAnimal } from '../data/reproducoes';
import { tratamentosDoAnimal } from '../data/tratamentos';
import {
  calcularFase,
  calcularSituacaoLeite,
  emIdadeReprodutiva,
  formatarIdade,
} from '../services/fase';
import { diasComDose, proximaDosePendente, tratamentosAtivos } from '../services/doses';
import { calcularPesoAtual, calcularPrevisaoParto } from '../services/indicadores';

/** Cobertura mais recente que ainda espera o parto (a lista vem da mais recente). */
function coberturaEmAberto(reproducoes: Reproducao[]): Reproducao | null {
  return reproducoes.find((r) => !r.dataParto && r.prenhezConfirmada !== false) ?? null;
}

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

    return {
      animal,
      fase,
      idade: animal.dataNascimento ? formatarIdade(animal.dataNascimento) : null,
      situacaoLeite: calcularSituacaoLeite(fase, ultimoParto, produzLeite),
      ultimoParto,
      podeReproduzir: emIdadeReprodutiva(animal.sexo, fase),
      peso: calcularPesoAtual(pesagens),
      pesagens,
      crias,
      totalCrias: crias.length + animal.criasAnteriores,
      reproducao: {
        coberturaAberta,
        previsaoParto: coberturaAberta ? calcularPrevisaoParto(coberturaAberta.data) : null,
      },
      reproducoes,
      tratamentos,
      tratamentosAtivos: tratamentosAtivos(tratamentos, agora).map((t) =>
        montarTratamentoAtivo(t, confirmados.get(t.id) ?? [], agora)
      ),
    };
  }, [animal, crias, pesagens, reproducoes, tratamentos, doses, produzLeite]);
}
