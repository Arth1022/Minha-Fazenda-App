import { index, customType, text, type SQLiteColumn } from 'drizzle-orm/sqlite-core';

import { newId } from './id';

/**
 * Peças comuns das tabelas do banco local (PowerSync + Drizzle).
 *
 * Convenções:
 * - nomes de tabela e coluna em `snake_case`, iguais aos do Postgres;
 * - `id`: UUID em texto gerado no app (ver `novoRegistro`); o sync nunca troca o id;
 * - datas: texto ISO 8601 em UTC (`timestamptz` no Postgres), lidas como `Date`;
 * - booleanos: `integer` 0/1 (`boolean` no Postgres); listas: JSON em `text`;
 * - sem chave estrangeira, `UNIQUE` ou `ON DELETE`: o PowerSync guarda as tabelas
 *   como views. Unicidade e "apagar junto" são feitos no código que grava.
 */

/** Data e hora em texto ISO 8601 (UTC). No app o valor é `Date`. */
export const dataHora = customType<{ data: Date; driverData: string }>({
  dataType: () => 'text',
  toDriver: (valor) => valor.toISOString(),
  fromDriver: (valor) => new Date(valor),
});

/** Chave primária em texto; o valor vem de `novoRegistro` (randomUUID). */
export const colunaId = () => text('id').primaryKey();

/** Chave das tabelas local-only (sem `novoRegistro`): gerada ao inserir. */
export const colunaIdLocal = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => newId());

/**
 * Colunas de toda tabela de domínio (sincronizada por fazenda). Quem preenche é
 * o helper de `escrita.ts`; nenhuma tela monta esses campos à mão.
 */
export const colunasBase = {
  fazendaId: text('fazenda_id').notNull(),
  createdBy: text('created_by'),
  createdAt: dataHora('created_at'),
  updatedAt: dataHora('updated_at'),
  /** Preenchido = apagado (soft delete); toda consulta filtra `deleted_at IS NULL` */
  deletedAt: dataHora('deleted_at'),
};

/** Índice em `fazenda_id`, que toda consulta de domínio filtra. */
export const indiceFazenda = (nomeTabela: string, coluna: SQLiteColumn) =>
  index(`${nomeTabela}_fazenda_idx`).on(coluna);
