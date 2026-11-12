/**
 * Compara as colunas das tabelas do Drizzle (src/entities) com as do Postgres
 * (`contracts/schema-colunas.json`, gerado pelo CI do back com
 * `SELECT table_name, column_name, data_type FROM information_schema.columns`).
 * Tipos compatíveis pela tabela "Tipos equivalentes" da arquitetura.
 */
import { isTable } from 'drizzle-orm';
import { getTableConfig, type SQLiteColumn, type SQLiteTable } from 'drizzle-orm/sqlite-core';

import { TABELAS_LOCAIS, tabelas } from '../../src/entities';

export interface ColunaPostgres {
  table_name: string;
  column_name: string;
  data_type: string;
}

/** Colunas que só o servidor tem (preenchidas pela API). */
const SO_NO_SERVIDOR = new Set(['server_updated_at']);
/** `usuarios`: o celular só recebe id, nome e avatar_url (nunca e-mail ou telefone). */
const COLUNAS_USUARIOS_NO_CELULAR = new Set(['id', 'nome', 'avatar_url']);

/** Tipos do Postgres aceitos para cada tipo de coluna do Drizzle. */
function tiposAceitos(coluna: SQLiteColumn): readonly string[] {
  switch (coluna.columnType) {
    case 'SQLiteBoolean':
      return ['boolean'];
    case 'SQLiteInteger':
      return ['integer', 'bigint', 'smallint'];
    case 'SQLiteReal':
      return ['numeric', 'real', 'double precision'];
    case 'SQLiteTextJson':
      return ['text', 'character varying'];
    case 'SQLiteCustomColumn':
      // dataHora: texto ISO 8601 no celular, timestamptz no Postgres
      return ['timestamp with time zone'];
    default:
      // text: uuid (ids), text/varchar e enums gravados como texto
      return ['uuid', 'text', 'character varying'];
  }
}

/** Tabelas do Drizzle que sincronizam (as local-only ficam de fora). */
export function tabelasSincronizadas(): SQLiteTable[] {
  const locais = new Set<unknown>(TABELAS_LOCAIS);
  return (Object.values(tabelas) as unknown[]).filter((t): t is SQLiteTable => isTable(t) && !locais.has(t));
}

/** Lista de divergências; vazia = os dois lados batem. Cada uma cita a tabela e a coluna. */
export function conferirSchema(postgres: readonly ColunaPostgres[], drizzle = tabelasSincronizadas()): string[] {
  const erros: string[] = [];
  const doPostgres = new Map<string, Map<string, string>>();
  for (const c of postgres) {
    if (!doPostgres.has(c.table_name)) doPostgres.set(c.table_name, new Map());
    doPostgres.get(c.table_name)!.set(c.column_name, c.data_type.toLowerCase());
  }

  for (const tabela of drizzle) {
    const { name, columns } = getTableConfig(tabela);
    const colunasPg = doPostgres.get(name);
    if (!colunasPg) {
      erros.push(`${name}: tabela não existe no Postgres`);
      continue;
    }
    // Toda coluna do Drizzle existe no Postgres, com tipo compatível
    for (const coluna of columns) {
      const tipoPg = colunasPg.get(coluna.name);
      if (tipoPg === undefined) {
        erros.push(`${name}.${coluna.name}: coluna do Drizzle não existe no Postgres`);
      } else if (!tiposAceitos(coluna).includes(tipoPg)) {
        erros.push(`${name}.${coluna.name}: tipo incompatível (Drizzle ${coluna.getSQLType()} × Postgres ${tipoPg})`);
      }
    }
    // Toda coluna do Postgres existe no Drizzle (menos as só do servidor)
    const noDrizzle = new Set(columns.map((c) => c.name));
    for (const colunaPg of colunasPg.keys()) {
      if (SO_NO_SERVIDOR.has(colunaPg) || noDrizzle.has(colunaPg)) continue;
      if (name === 'usuarios' && !COLUNAS_USUARIOS_NO_CELULAR.has(colunaPg)) continue;
      erros.push(`${name}.${colunaPg}: coluna do Postgres não existe no Drizzle`);
    }
  }
  return erros;
}

/** O Postgres que corresponde exatamente ao Drizzle de hoje (para testar a própria conferência). */
export function postgresEspelhado(): ColunaPostgres[] {
  const linhas: ColunaPostgres[] = [];
  for (const tabela of tabelasSincronizadas()) {
    const { name, columns } = getTableConfig(tabela);
    for (const coluna of columns) {
      linhas.push({ table_name: name, column_name: coluna.name, data_type: tiposAceitos(coluna)[0] });
    }
    linhas.push({ table_name: name, column_name: 'server_updated_at', data_type: 'timestamp with time zone' });
  }
  return linhas;
}
