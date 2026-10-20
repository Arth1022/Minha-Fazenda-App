import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { modelClasses } from '@/entities';
import { migrations } from './migrations';
import { schema } from './schema';

let _database: Database | null = null;
let _adapter: SQLiteAdapter | null = null;

export function getAdapter(): SQLiteAdapter {
  if (!_adapter) {
    _adapter = new SQLiteAdapter({
      schema,
      migrations,
      dbName: 'minha_fazenda',
      jsi: true,
      onSetUpError: (error) => {
        console.error('Erro fatal ao inicializar o SQLiteAdapter do WatermelonDB:', error);
      },
    });
  }
  return _adapter;
}

export function getDatabase(): Database {
  if (!_database) {
    _database = new Database({
      adapter: getAdapter(),
      modelClasses,
    });
  }
  return _database;
}

export const adapter = new Proxy({} as SQLiteAdapter, {
  get(_target, prop) {
    return (getAdapter() as unknown as Record<string, unknown>)[prop as string];
  },
});

export const database = new Proxy({} as Database, {
  get(_target, prop) {
    return (getDatabase() as unknown as Record<string, unknown>)[prop as string];
  },
});
