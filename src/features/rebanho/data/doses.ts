import { and, asc, eq, gte, lt } from 'drizzle-orm';

import { apagar, daFazenda, db, dosesAplicadas, naoApagado, novoRegistro, tratamentos } from '@/database';
import { adicionarDias, inicioDoDia } from '@/utils/date';
import { ehDiaDeDose } from '../services/doses';

/** Dias confirmados do tratamento, do primeiro ao último (consulta para o useLiveQuery). */
export function diasConfirmados(tratamentoId: string) {
  return db
    .select()
    .from(dosesAplicadas)
    .where(and(daFazenda(dosesAplicadas), eq(dosesAplicadas.tratamentoId, tratamentoId)))
    .orderBy(asc(dosesAplicadas.dia));
}

/** Dias confirmados de todos os tratamentos do animal, numa consulta só (ficha). */
export function diasConfirmadosDoAnimal(animalId: string) {
  return db
    .select({ tratamentoId: dosesAplicadas.tratamentoId, dia: dosesAplicadas.dia })
    .from(dosesAplicadas)
    .innerJoin(tratamentos, and(eq(tratamentos.id, dosesAplicadas.tratamentoId), naoApagado(tratamentos)))
    .where(and(daFazenda(dosesAplicadas), eq(tratamentos.animalId, animalId)))
    .orderBy(asc(dosesAplicadas.dia));
}

/** Todos os dias confirmados do rebanho, numa consulta só (cálculo de carência na lista). */
export function todasDosesConfirmadas() {
  return db
    .select({ tratamentoId: dosesAplicadas.tratamentoId, dia: dosesAplicadas.dia })
    .from(dosesAplicadas)
    .where(daFazenda(dosesAplicadas))
    .orderBy(asc(dosesAplicadas.dia));
}

/**
 * Doses do tratamento no dia (de meia-noite a meia-noite). Compara por faixa e
 * não por igualdade: a data que volta do servidor pode vir com outra precisão.
 */
function doDia(tratamentoId: string, dia: Date) {
  const inicio = inicioDoDia(dia);
  return and(
    daFazenda(dosesAplicadas),
    eq(dosesAplicadas.tratamentoId, tratamentoId),
    gte(dosesAplicadas.dia, inicio),
    lt(dosesAplicadas.dia, adicionarDias(inicio, 1))
  );
}

/**
 * "Dei a dose de hoje": grava o dia como aplicado. Idempotente (dia já
 * confirmado não grava de novo). Recusa dia que não é dia de dose.
 */
export async function confirmarDia(tratamentoId: string, dia: Date): Promise<void> {
  const tratamento = await db.query.tratamentos.findFirst({
    where: and(daFazenda(tratamentos), eq(tratamentos.id, tratamentoId)),
  });
  if (!tratamento) throw new Error('Tratamento não encontrado');
  if (!ehDiaDeDose(tratamento, dia)) throw new Error('Este dia não tem dose no tratamento');

  await db.transaction(async (tx) => {
    const [jaConfirmado] = await tx
      .select({ id: dosesAplicadas.id })
      .from(dosesAplicadas)
      .where(doDia(tratamentoId, dia))
      .limit(1);
    if (!jaConfirmado) {
      await tx.insert(dosesAplicadas).values(novoRegistro({ tratamentoId, dia: inicioDoDia(dia) }));
    }
  });
}

/** Desfaz a confirmação do dia. Idempotente: sem confirmação, não faz nada. */
export async function desfazerDia(tratamentoId: string, dia: Date): Promise<void> {
  await apagar(db, dosesAplicadas, doDia(tratamentoId, dia)!);
}
