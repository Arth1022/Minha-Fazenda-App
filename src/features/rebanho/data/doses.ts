import { and, asc, eq } from 'drizzle-orm';

import { db, dosesAplicadas, tratamentos } from '@/database';
import { inicioDoDia } from '@/utils/date';
import { ehDiaDeDose } from '../services/doses';

/** Dias confirmados do tratamento, do primeiro ao último (consulta para o useLiveQuery). */
export function diasConfirmados(tratamentoId: string) {
  return db
    .select()
    .from(dosesAplicadas)
    .where(eq(dosesAplicadas.tratamentoId, tratamentoId))
    .orderBy(asc(dosesAplicadas.dia));
}

/** Dias confirmados de todos os tratamentos do animal, numa consulta só (ficha). */
export function diasConfirmadosDoAnimal(animalId: string) {
  return db
    .select({ tratamentoId: dosesAplicadas.tratamentoId, dia: dosesAplicadas.dia })
    .from(dosesAplicadas)
    .innerJoin(tratamentos, eq(tratamentos.id, dosesAplicadas.tratamentoId))
    .where(eq(tratamentos.animalId, animalId))
    .orderBy(asc(dosesAplicadas.dia));
}

/** Todos os dias confirmados do rebanho, numa consulta só (cálculo de carência na lista). */
export function todasDosesConfirmadas() {
  return db
    .select({ tratamentoId: dosesAplicadas.tratamentoId, dia: dosesAplicadas.dia })
    .from(dosesAplicadas)
    .orderBy(asc(dosesAplicadas.dia));
}

/**
 * "Dei a dose de hoje": grava o dia como aplicado. Idempotente (o índice único
 * tratamento + dia ignora a repetição). Recusa dia que não é dia de dose.
 */
export async function confirmarDia(tratamentoId: string, dia: Date): Promise<void> {
  const tratamento = await db.query.tratamentos.findFirst({
    where: eq(tratamentos.id, tratamentoId),
  });
  if (!tratamento) throw new Error('Tratamento não encontrado');
  if (!ehDiaDeDose(tratamento, dia)) throw new Error('Este dia não tem dose no tratamento');

  await db
    .insert(dosesAplicadas)
    .values({ tratamentoId, dia: inicioDoDia(dia) })
    .onConflictDoNothing();
}

/** Desfaz a confirmação do dia. Idempotente: sem confirmação, não faz nada. */
export async function desfazerDia(tratamentoId: string, dia: Date): Promise<void> {
  await db
    .delete(dosesAplicadas)
    .where(
      and(eq(dosesAplicadas.tratamentoId, tratamentoId), eq(dosesAplicadas.dia, inicioDoDia(dia)))
    );
}
