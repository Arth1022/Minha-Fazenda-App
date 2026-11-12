import { and, eq, isNull, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

import { fazendaDoContexto } from './contexto';

interface ColunasFiltradas {
  fazendaId: SQLiteColumn;
  deletedAt: SQLiteColumn;
}

/**
 * Filtro de toda consulta de domínio: registros da fazenda ativa que não foram
 * apagados. Sem fazenda ativa, não devolve nada (nunca mistura fazendas).
 */
export function daFazenda(tabela: ColunasFiltradas): SQL {
  const fazendaId = fazendaDoContexto();
  if (!fazendaId) return sql`0`;
  return and(eq(tabela.fazendaId, fazendaId), isNull(tabela.deletedAt)) as SQL;
}

/** Só o "não apagado", para o ON de um JOIN (a fazenda já vem da tabela principal). */
export function naoApagado(tabela: Pick<ColunasFiltradas, 'deletedAt'>): SQL {
  return isNull(tabela.deletedAt);
}
