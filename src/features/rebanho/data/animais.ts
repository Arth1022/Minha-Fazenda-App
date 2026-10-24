import { asc, eq } from 'drizzle-orm';

import {
  animais,
  coberturas,
  db,
  type Animal,
  type NovaCobertura,
  type NovoAnimal,
} from '@/database';

/** Rebanho completo, na ordem de cadastro. */
export function todosAnimais() {
  return db.select().from(animais).orderBy(asc(animais.createdAt));
}

export function animalPorId(id: string) {
  return db.query.animais.findFirst({ where: eq(animais.id, id) });
}

/** Cadastra o animal e suas coberturas numa única transação. */
export async function createAnimal(
  animal: NovoAnimal,
  novasCoberturas: Omit<NovaCobertura, 'animalId'>[] = []
): Promise<Animal> {
  // Transação síncrona do driver expo-sqlite: as escritas usam .run()/.get()
  return db.transaction((tx) => {
    const created = tx.insert(animais).values(animal).returning().get();
    for (const cobertura of novasCoberturas) {
      tx.insert(coberturas)
        .values({ ...cobertura, animalId: created.id })
        .run();
    }
    return created;
  });
}
