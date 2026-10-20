import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { modelClasses } from '@/entities';
import { migrations } from './migrations';
import { schema } from './schema';

export const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'minha_fazenda',
  jsi: true,
  onSetUpError: (error) => {
    console.error('Erro fatal ao inicializar o SQLiteAdapter do WatermelonDB:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses,
});
