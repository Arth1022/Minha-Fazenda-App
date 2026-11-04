import { desc, eq, max, sql } from 'drizzle-orm';

import { db, ordenhas } from '@/database';
import type { NovaOrdenha } from '@/dtos';

/**
 * Registro mais recente de cada turno (manhã, tarde, noite), numa consulta só.
 * No SQLite, com max() as colunas fora do agregado vêm da linha do máximo.
 */
export function todasOrdenhas() {
  return db
    .select({
      id: ordenhas.id,
      periodo: ordenhas.periodo,
      horarioPrevisto: ordenhas.horarioPrevisto,
      horarioNotificacao: ordenhas.horarioNotificacao,
      volumeLitros: ordenhas.volumeLitros,
      dataRegistro: sql<Date>`max(${ordenhas.dataRegistro})`.mapWith(ordenhas.dataRegistro),
      createdAt: ordenhas.createdAt,
      updatedAt: ordenhas.updatedAt,
    })
    .from(ordenhas)
    .groupBy(ordenhas.periodo)
    .orderBy(desc(max(ordenhas.dataRegistro)));
}

/** Grava o horário do turno: atualiza o registro existente ou cria um novo. */
export async function salvarOrdenha(
  dados: NovaOrdenha,
  existenteId?: string
): Promise<void> {
  if (existenteId) {
    await db.update(ordenhas).set(dados).where(eq(ordenhas.id, existenteId));
  } else {
    await db.insert(ordenhas).values(dados);
  }
}
