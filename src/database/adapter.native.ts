import { NativeModules } from 'react-native';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import type { DatabaseAdapter } from '@nozbe/watermelondb/adapters/type';
import { migrations } from './migrations';
import { schema } from './schema';

export function createAdapter(): DatabaseAdapter {
  const hasNativeSQLiteBridge = Boolean(
    NativeModules?.WMDatabaseBridge || NativeModules?.DatabaseBridge
  );

  if (hasNativeSQLiteBridge) {
    try {
      return new SQLiteAdapter({
        schema,
        migrations,
        dbName: 'minha_fazenda',
        jsi: true,
        onSetUpError: (error) => {
          console.error(
            'Falha ao inicializar o banco de dados nativo SQLite:',
            error
          );
        },
      });
    } catch (error) {
      console.warn(
        '[WatermelonDB] Módulo nativo SQLite indisponível, utilizando LokiJSAdapter como fallback:',
        error
      );
    }
  }

  return new LokiJSAdapter({
    schema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });
}

export const adapter: DatabaseAdapter = createAdapter();
