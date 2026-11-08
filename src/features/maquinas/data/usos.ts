import { and, desc, eq, gte, isNotNull, isNull, or, sql } from 'drizzle-orm';

import { db, maquinas, usosMaquina } from '@/database';
import type { UsoMaquina } from '@/dtos';

/** Usos em andamento de toda a frota (as máquinas ligadas agora). */
export function usosEmAberto() {
  return db.select().from(usosMaquina).where(isNull(usosMaquina.fim));
}

/** Usos que tocam o período a partir de `desde` (inclui o que começou antes e ainda corria). */
export function usosDaMaquinaDesde(maquinaId: string, desde: Date) {
  return db
    .select()
    .from(usosMaquina)
    .where(
      and(
        eq(usosMaquina.maquinaId, maquinaId),
        or(isNull(usosMaquina.fim), gte(usosMaquina.fim, desde))
      )
    );
}

/** Últimos usos da máquina, do mais recente para o mais antigo. */
export function usosRecentes(maquinaId: string, limite = 10) {
  return db
    .select()
    .from(usosMaquina)
    .where(eq(usosMaquina.maquinaId, maquinaId))
    .orderBy(desc(usosMaquina.inicio))
    .limit(limite);
}

/** Soma (ms) dos usos encerrados da máquina, calculada no próprio SQLite. */
export function tempoTotalRegistrado(maquinaId: string) {
  return db
    .select({
      totalMs: sql<number>`coalesce(sum(${usosMaquina.fim} - ${usosMaquina.inicio}), 0)`,
    })
    .from(usosMaquina)
    .where(and(eq(usosMaquina.maquinaId, maquinaId), isNotNull(usosMaquina.fim)));
}

/**
 * Liga a máquina: abre um uso a partir de `agora`. Recusa máquina inativa ou já
 * ligada (o índice único parcial também garante isso no banco).
 */
export async function iniciarUso(maquinaId: string, agora = new Date()): Promise<UsoMaquina> {
  return db.transaction((tx) => {
    const maquina = tx
      .select({ status: maquinas.status })
      .from(maquinas)
      .where(eq(maquinas.id, maquinaId))
      .get();
    if (!maquina) throw new Error('Máquina não encontrada');
    if (maquina.status === 'inativa') throw new Error('Máquina inativa não pode ser ligada');

    const aberto = tx
      .select({ id: usosMaquina.id })
      .from(usosMaquina)
      .where(and(eq(usosMaquina.maquinaId, maquinaId), isNull(usosMaquina.fim)))
      .get();
    if (aberto) throw new Error('A máquina já está em uso');

    return tx.insert(usosMaquina).values({ maquinaId, inicio: agora }).returning().get();
  });
}

/** Desliga a máquina: fecha o uso em aberto em `agora` e devolve o uso encerrado. */
export async function encerrarUso(maquinaId: string, agora = new Date()): Promise<UsoMaquina> {
  const [encerrado] = await db
    .update(usosMaquina)
    .set({ fim: agora })
    .where(and(eq(usosMaquina.maquinaId, maquinaId), isNull(usosMaquina.fim)))
    .returning();
  if (!encerrado) throw new Error('A máquina não está em uso');
  return encerrado;
}
