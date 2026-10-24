import { desc, eq } from 'drizzle-orm';

import { db, ordenhas } from '@/database';
import type { NovaOrdenha } from '@/dtos';

/** Registros de ordenha, do mais recente para o mais antigo. */
export function todasOrdenhas() {
  return db.select().from(ordenhas).orderBy(desc(ordenhas.dataRegistro));
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
