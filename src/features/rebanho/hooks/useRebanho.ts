import { type Animal, type Tratamento, useLiveQuery } from '@/database';
import { animalPorId, todosAnimais } from '../data/animais';
import { tratamentosDoAnimal } from '../data/tratamentos';

export function useAnimais(): Animal[] {
  return useLiveQuery(todosAnimais()).data;
}

export function useAnimal(id?: string): Animal | null {
  const { data } = useLiveQuery(animalPorId(id ?? ''), [id]);
  return data ?? null;
}

/** Tratamentos do animal, do mais recente para o mais antigo (reativo). */
export function useAnimalTratamentos(animalId?: string): Tratamento[] {
  const { data } = useLiveQuery(tratamentosDoAnimal(animalId ?? ''), [animalId]);
  return data;
}
