import { eq, type SQL } from 'drizzle-orm';
import type { BaseSQLiteDatabase, SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { colunasBase } from './base';
import { fazendaDoContexto, usuarioDoContexto } from './contexto';
import { newId } from './id';

/**
 * Único lugar que preenche `id`, `fazenda_id`, `created_by` e as datas das
 * tabelas de domínio. Telas e serviços passam só os dados do registro.
 */

type ColunasBase = typeof colunasBase;
type CamposBase = 'id' | keyof ColunasBase;

/** Banco ou transação (as duas aceitam as mesmas consultas). */
export type Executor = BaseSQLiteDatabase<'async', any, any>;

/** Tabela de domínio: tem `id` e as colunas base. */
type TabelaDeDominio = SQLiteTable & { id: SQLiteColumn; deletedAt: SQLiteColumn; updatedAt: SQLiteColumn };

/** Dados de um registro novo de uma tabela de domínio, sem os campos que o helper preenche. */
export type DadosNovos<T extends { $inferInsert: object }> = Omit<T['$inferInsert'], CamposBase> & { id?: string };

export interface CamposDeRegistro {
  id: string;
  fazendaId: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function fazendaAtivaParaGravar(): string {
  const fazendaId = fazendaDoContexto();
  if (!fazendaId) throw new Error('Nenhuma fazenda ativa para gravar o registro.');
  return fazendaId;
}

/**
 * Registro novo da fazenda ativa. O `id` pode vir pronto quando outra linha
 * precisa dele antes (ex.: os registros filhos na mesma transação).
 */
export function novoRegistro<T extends object>(
  dados: T & { id?: string } & { [K in Exclude<CamposBase, 'id'>]?: never }
): Omit<T, 'id'> & CamposDeRegistro {
  const agora = new Date();
  return {
    ...dados,
    id: dados.id ?? newId(),
    fazendaId: fazendaAtivaParaGravar(),
    createdBy: usuarioDoContexto(),
    createdAt: agora,
    updatedAt: agora,
  };
}

/** Campos de um UPDATE, com `updated_at` renovado. */
export function atualizar<T extends object>(
  dados: T & { [K in Exclude<CamposBase, 'id'>]?: never }
): T & { updatedAt: Date } {
  return { ...dados, updatedAt: new Date() };
}

/** Campos que marcam um registro como apagado (soft delete). */
export function camposApagado(): { deletedAt: Date; updatedAt: Date } {
  const agora = new Date();
  return { deletedAt: agora, updatedAt: agora };
}

/**
 * Apaga (preenche `deleted_at`) o registro com esse id, ou os que atendem a
 * condição (ex.: os registros filhos de um animal). Nada sai do banco: a linha
 * fica para o sync levar a exclusão aos outros celulares.
 */
export async function apagar(
  executor: Executor,
  tabela: TabelaDeDominio,
  idOuCondicao: string | SQL
): Promise<void> {
  const condicao = typeof idOuCondicao === 'string' ? eq(tabela.id, idOuCondicao) : idOuCondicao;
  await executor.update(tabela as any).set(camposApagado()).where(condicao);
}

/**
 * Linha nova de `fazendas` (só no modo sem conta: a fazenda local). Mesmo papel
 * do `novoRegistro`, sem `fazenda_id`: a fazenda é a própria linha.
 */
export function novaFazendaLocal(nome: string): { id: string; nome: string } & Omit<CamposDeRegistro, 'fazendaId'> {
  const agora = new Date();
  return { id: newId(), nome, createdBy: usuarioDoContexto(), createdAt: agora, updatedAt: agora };
}
