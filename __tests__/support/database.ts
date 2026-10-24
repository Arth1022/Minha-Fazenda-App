/**
 * Substitui `@/database` nos testes (ver tsconfig.test.json): mesmo schema e
 * mesmas migrations do app, com o SQLite do sql.js (wasm) no lugar do expo-sqlite.
 */
import { drizzle, type SQLJsDatabase } from 'drizzle-orm/sql-js';
import { migrate } from 'drizzle-orm/sql-js/migrator';
import { PreparedQuery, SQLJsSession } from 'drizzle-orm/sql-js/session';
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';

import * as schema from '../../src/database/schema';

export * from '../../src/database/schema';

// drizzle-orm 0.45: a sessão do driver sql-js descarta o customResultMapper, que
// monta o resultado das consultas relacionais (db.query... with). O driver
// expo-sqlite do app repassa; aqui repassamos também para o teste se comportar igual.
(SQLJsSession.prototype as any).prepareQuery = function (
  this: any,
  ...[query, fields, executeMethod, isResponseInArrayMode, customResultMapper]: any[]
) {
  return new PreparedQuery(
    this.client,
    query,
    this.logger,
    fields,
    executeMethod,
    isResponseInArrayMode,
    customResultMapper
  );
};

export let sqlite: SqlJsDatabase;
export let db: SQLJsDatabase<typeof schema>;

/** Abre um banco vazio em memória e aplica as migrations, como o app faz ao iniciar. */
export async function initTestDatabase(): Promise<void> {
  const SQL = await initSqlJs();
  sqlite = new SQL.Database();
  db = drizzle(sqlite, { schema });
  // Caminho relativo à raiz do projeto, de onde o `npm run test:db` roda
  migrate(db, { migrationsFolder: 'src/database/migrations' });
  sqlite.run('PRAGMA foreign_keys = ON;');
}
