import { useMemo } from 'react';

import { useLiveQuery } from '@/database';
import type { FichaAnimal, Reproducao } from '@/dtos';
import { useFazenda } from '@/providers/FazendaProvider';
import { animalPorId, criasDe } from '../data/animais';
import { pesagensDoAnimal } from '../data/pesagens';
import { reproducoesDoAnimal } from '../data/reproducoes';
import { tratamentosDoAnimal } from '../data/tratamentos';
import {
  calcularFase,
  calcularSituacaoLeite,
  emIdadeReprodutiva,
  formatarIdade,
} from '../services/fase';
import { calcularPesoAtual, calcularPrevisaoParto } from '../services/indicadores';

/** Cobertura mais recente que ainda espera o parto (a lista vem da mais recente). */
function coberturaEmAberto(reproducoes: Reproducao[]): Reproducao | null {
  return reproducoes.find((r) => !r.dataParto && r.prenhezConfirmada !== false) ?? null;
}

/**
 * Dados da Ficha Animal, reativos ao banco. Null enquanto carrega ou se o animal
 * não existe.
 *
 * TODO(back-end): ligar quando forem entregues — tratamentosAtivos e proximaDose
 * (tratamento em andamento), diasComDose (trilha de dias), alertaPrincipal,
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
      reproducao: {
        coberturaAberta,
        previsaoParto: coberturaAberta ? calcularPrevisaoParto(coberturaAberta.data) : null,
      },
      reproducoes,
      tratamentos,
    };
  }, [animal, crias, pesagens, reproducoes, tratamentos, produzLeite]);
}
