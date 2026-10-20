import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import type { DatabaseAdapter } from '@nozbe/watermelondb/adapters/type';
import { migrations } from './migrations';
import { schema } from './schema';

export function createAdapter(): DatabaseAdapter {
  return new SQLiteAdapter({
    schema,
    migrations,
    dbName: 'minha_fazenda',
    jsi: true,
    onSetUpError: (error) => {
      console.error('Falha crítica ao inicializar o banco de dados nativo SQLite:', error);
      throw new Error(
        `[WatermelonDB] Falha crítica ao inicializar o SQLite no aparelho: ${error.message || String(error)}. Operação offline interrompida para evitar perda de dados.`
      );
    },
  });
}

export const adapter: DatabaseAdapter = createAdapter();
