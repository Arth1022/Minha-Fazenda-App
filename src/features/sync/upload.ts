import { isTable } from 'drizzle-orm';
import { getTableConfig, type SQLiteTable } from 'drizzle-orm/sqlite-core';

import { SCHEMA_VERSION, TABELAS_SO_LEITURA, tabelas } from '@/entities';

/**
 * Conversão da fila de upload do PowerSync para o contrato de
 * `POST /sync/upload`. Sem dependência do aparelho (testada em Node).
 */

export type TipoOperacao = 'PUT' | 'PATCH' | 'DELETE';

export interface OperacaoUpload {
  op: TipoOperacao;
  table: string;
  id: string;
  data?: Record<string, unknown>;
}

export interface CorpoUpload {
  schemaVersion: number;
  ops: OperacaoUpload[];
}

export interface Rejeicao {
  table: string;
  id: string;
  codigo: string;
  mensagem: string;
}

export interface RespostaUpload {
  aplicadas: number;
  rejeitadas: Rejeicao[];
}

/** O que o upload usa de cada item da fila (CrudEntry do PowerSync). */
export interface ItemDaFila {
  op: string;
  table: string;
  id: string;
  opData?: Record<string, unknown>;
}

const SO_LEITURA = new Set<string>(TABELAS_SO_LEITURA);

/** Colunas boolean de cada tabela: no SQLite são 0/1, na API vão como true/false. */
const COLUNAS_BOOLEANAS: ReadonlyMap<string, ReadonlySet<string>> = (() => {
  const mapa = new Map<string, Set<string>>();
  for (const entrada of Object.values(tabelas)) {
    if (!isTable(entrada)) continue;
    const config = getTableConfig(entrada as SQLiteTable);
    const booleanas = config.columns.filter((c) => c.columnType === 'SQLiteBoolean').map((c) => c.name);
    if (booleanas.length > 0) mapa.set(config.name, new Set(booleanas));
  }
  return mapa;
})();

function converterDados(tabela: string, dados: Record<string, unknown>): Record<string, unknown> {
  const booleanas = COLUNAS_BOOLEANAS.get(tabela);
  if (!booleanas) return { ...dados };
  const convertidos: Record<string, unknown> = {};
  for (const [coluna, valor] of Object.entries(dados)) {
    convertidos[coluna] = booleanas.has(coluna) && typeof valor === 'number' ? valor !== 0 : valor;
  }
  return convertidos;
}

/**
 * Monta o corpo do upload. Escritas locais em `fazendas`, `fazenda_membros` e
 * `usuarios` são descartadas (só leitura no celular: mudam pelos endpoints REST).
 */
export function montarUpload(fila: readonly ItemDaFila[]): { corpo: CorpoUpload; descartadas: number } {
  const ops: OperacaoUpload[] = [];
  let descartadas = 0;
  for (const item of fila) {
    if (SO_LEITURA.has(item.table)) {
      descartadas++;
      continue;
    }
    const op = item.op as TipoOperacao;
    ops.push(
      op === 'DELETE' || !item.opData
        ? { op, table: item.table, id: item.id }
        : { op, table: item.table, id: item.id, data: converterDados(item.table, item.opData) }
    );
  }
  return { corpo: { schemaVersion: SCHEMA_VERSION, ops }, descartadas };
}

/** Linha de log de uma rejeição (sem dados do registro). */
export function descreverRejeicao(r: Rejeicao): string {
  return `${r.table}/${r.id}: ${r.codigo} ${r.mensagem}`;
}
