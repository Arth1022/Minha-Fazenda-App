import { useMemo } from 'react';

import { useLiveQuery } from '@/database';
import type {
  Animal,
  AnimalComFase,
  Pesagem,
  Reproducao,
  Tratamento,
} from '@/dtos';
import {
  animalPorId,
  criasDe,
  criasPorMae,
  listarAnimais,
  listarTouros,
  ultimosPartos,
} from '../data/animais';
import { todasDosesConfirmadas } from '../data/doses';
import { pesagensDoAnimal, pesosAtuais } from '../data/pesagens';
import { reproducoesDoAnimal } from '../data/reproducoes';
import { useFazenda } from '@/providers/FazendaProvider';
import { formatDiaMes } from '@/utils/date';
import { tratamentosComCarencia, tratamentosDoAnimal } from '../data/tratamentos';
import { calcularFase } from '../services/fase';
import { carenciaAte } from '../services/indicadores';

/** Animais ativos com fase, alerta, peso atual e crias já calculados (reativo). */
export function useRebanho(): AnimalComFase[] {
  const { produzLeite } = useFazenda();
  const { data: lista } = useLiveQuery(listarAnimais());
  const { data: partos } = useLiveQuery(ultimosPartos());
  const { data: comCarencia } = useLiveQuery(tratamentosComCarencia());
  const { data: doses } = useLiveQuery(todasDosesConfirmadas());
  const { data: crias } = useLiveQuery(criasPorMae());
  const { data: pesos } = useLiveQuery(pesosAtuais());

  return useMemo(() => {
    const hoje = new Date();
    const partoPorMae = new Map(partos.map((p) => [p.maeId, p.data]));
    const criasPor = new Map(crias.map((c) => [c.maeId, c.total]));
    const pesoPor = new Map(pesos.map((p) => [p.animalId, p.pesoKg]));
    return lista.map((animal) => {
      const ultimoParto = partoPorMae.get(animal.id) ?? null;
      const carencia = carenciaAte(
        comCarencia.filter((t) => t.animalId === animal.id),
        produzLeite,
        hoje,
        doses
      );
      return {
        ...animal,
        ultimoParto,
        alerta: carencia ? `Em carência até ${formatDiaMes(carencia)}` : null,
        pesoKg: pesoPor.get(animal.id) ?? null,
        // Cadastradas com ela como mãe + as que teve antes de entrar no app
        crias: (criasPor.get(animal.id) ?? 0) + animal.criasAnteriores,
        fase: calcularFase({
          sexo: animal.sexo,
          dataNascimento: animal.dataNascimento,
          ultimoParto,
          jaPariu: animal.jaPariu,
        }),
      };
    });
  }, [lista, partos, comCarencia, doses, crias, pesos, produzLeite]);
}

/** Machos ativos do rebanho (touros para cobertura e parto), numa consulta só. */
export function useTouros(): Animal[] {
  return useLiveQuery(listarTouros()).data;
}

export function useAnimal(id?: string): Animal | null {
  const { data } = useLiveQuery(animalPorId(id ?? ''), [id]);
  return data ?? null;
}

/** Crias do animal (filhos com mae_id igual ao dele). */
export function useCrias(maeId?: string): Animal[] {
  return useLiveQuery(criasDe(maeId ?? ''), [maeId]).data;
}

/** Tratamentos do animal, do mais recente para o mais antigo (reativo). */
export function useAnimalTratamentos(animalId?: string): Tratamento[] {
  return useLiveQuery(tratamentosDoAnimal(animalId ?? ''), [animalId]).data;
}

export function usePesagens(animalId?: string): Pesagem[] {
  return useLiveQuery(pesagensDoAnimal(animalId ?? ''), [animalId]).data;
}

export function useReproducoes(animalId?: string): Reproducao[] {
  return useLiveQuery(reproducoesDoAnimal(animalId ?? ''), [animalId]).data;
}
