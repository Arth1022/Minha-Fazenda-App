import { useMemo } from 'react';

import {
  type Animal,
  type Pesagem,
  type Reproducao,
  type Tratamento,
  useLiveQuery,
} from '@/database';
import { animalPorId, criasDe, listarAnimais, ultimosPartos } from '../data/animais';
import { pesagensDoAnimal } from '../data/pesagens';
import { reproducoesDoAnimal } from '../data/reproducoes';
import { useFazenda } from '@/providers/FazendaProvider';
import { formatDiaMes } from '@/utils/date';
import { tratamentosComCarencia, tratamentosDoAnimal } from '../data/tratamentos';
import { calcularFase, type Fase } from '../services/fase';
import { carenciaAte } from '../services/indicadores';

export interface AnimalComFase extends Animal {
  fase: Fase;
  /** Parto mais recente (nascimento da cria mais nova), null se nunca pariu */
  ultimoParto: Date | null;
  /** Alerta principal do animal (no máximo um) */
  alerta: string | null;
}

/** Animais ativos com fase e alerta já calculados (reativo). */
export function useRebanho(): AnimalComFase[] {
  const { produzLeite } = useFazenda();
  const { data: lista } = useLiveQuery(listarAnimais());
  const { data: partos } = useLiveQuery(ultimosPartos());
  const { data: comCarencia } = useLiveQuery(tratamentosComCarencia());

  return useMemo(() => {
    const partoPorMae = new Map(partos.map((p) => [p.maeId, p.data]));
    return lista.map((animal) => {
      const ultimoParto = partoPorMae.get(animal.id) ?? null;
      const carencia = carenciaAte(
        comCarencia.filter((t) => t.animalId === animal.id),
        produzLeite
      );
      return {
        ...animal,
        ultimoParto,
        alerta: carencia ? `Em carência até ${formatDiaMes(carencia)}` : null,
        fase: calcularFase({
          sexo: animal.sexo,
          dataNascimento: animal.dataNascimento,
          ultimoParto,
        }),
      };
    });
  }, [lista, partos, comCarencia, produzLeite]);
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
