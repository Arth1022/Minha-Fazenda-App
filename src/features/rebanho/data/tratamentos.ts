import { desc, eq } from 'drizzle-orm';

import {
  db,
  tratamentos,
  type NovoTratamento,
  type Tratamento,
} from '@/database';

/** Tratamentos do animal, do início mais recente para o mais antigo. */
export function tratamentosDoAnimal(animalId: string) {
  return db
    .select()
    .from(tratamentos)
    .where(eq(tratamentos.animalId, animalId))
    .orderBy(desc(tratamentos.dataInicio));
}

export async function createTratamento(
  input: NovoTratamento
): Promise<Tratamento> {
  const [created] = await db.insert(tratamentos).values(input).returning();
  return created;
}

/** Marca ou desmarca a dose de um dia, mantendo os dias ordenados. */
export async function toggleDiaConfirmado(
  tratamento: Tratamento,
  dia: number
): Promise<void> {
  const atuais = tratamento.diasConfirmados;
  const diasConfirmados = atuais.includes(dia)
    ? atuais.filter((d) => d !== dia)
    : [...atuais, dia].sort((a, b) => a - b);

  await db
    .update(tratamentos)
    .set({ diasConfirmados })
    .where(eq(tratamentos.id, tratamento.id));
}
