import { desc, eq } from 'drizzle-orm';

import { db, reproducoes } from '@/database';
import type { NovaCobertura, Reproducao } from '@/dtos';
import { calcularPrevisaoParto } from '../services/indicadores';

/** Coberturas e inseminações do animal, da mais recente para a mais antiga. */
export function reproducoesDoAnimal(animalId: string) {
  return db
    .select()
    .from(reproducoes)
    .where(eq(reproducoes.animalId, animalId))
    .orderBy(desc(reproducoes.data));
}

/** Registra a cobertura/inseminação já com a previsão de parto calculada. */
export async function createReproducao(
  input: NovaCobertura
): Promise<Reproducao> {
  const [created] = await db
    .insert(reproducoes)
    .values({ ...input, previsaoParto: calcularPrevisaoParto(input.data) })
    .returning();
  return created;
}

export async function confirmarPrenhez(id: string, confirmada: boolean): Promise<void> {
  await db
    .update(reproducoes)
    .set({ prenhezConfirmada: confirmada })
    .where(eq(reproducoes.id, id));
}
