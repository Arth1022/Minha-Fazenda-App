import { desc, eq, max } from 'drizzle-orm';

import { db, pesagens, type NovaPesagem } from '@/database';

/** Pesagens do animal, da mais recente para a mais antiga. */
export function pesagensDoAnimal(animalId: string) {
  return db
    .select()
    .from(pesagens)
    .where(eq(pesagens.animalId, animalId))
    .orderBy(desc(pesagens.data));
}

/**
 * Última pesagem de cada animal, numa consulta só (para a lista do rebanho).
 * No SQLite, com max() as colunas fora do agregado vêm da linha que tem o
 * máximo, então o peso é o da pesagem mais recente
 * (https://www.sqlite.org/lang_select.html#bareagg).
 */
export function pesosAtuais() {
  return db
    .select({ animalId: pesagens.animalId, pesoKg: pesagens.pesoKg, data: max(pesagens.data) })
    .from(pesagens)
    .groupBy(pesagens.animalId);
}

export async function createPesagem(input: NovaPesagem): Promise<void> {
  await db.insert(pesagens).values(input);
}
