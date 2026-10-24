import { desc, eq } from 'drizzle-orm';

import { db, pesagens, type NovaPesagem } from '@/database';

/** Pesagens do animal, da mais recente para a mais antiga. */
export function pesagensDoAnimal(animalId: string) {
  return db
    .select()
    .from(pesagens)
    .where(eq(pesagens.animalId, animalId))
    .orderBy(desc(pesagens.data));
}

export async function createPesagem(input: NovaPesagem): Promise<void> {
  await db.insert(pesagens).values(input);
}
