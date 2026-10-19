import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import { schema } from './schema';
import { migrations } from './migrations';

import Talhao from './models/Talhao';
import Animal from './models/Animal';
import Tratamento from './models/Tratamento';
import EstoqueItem from './models/EstoqueItem';
import Maquina from './models/Maquina';
import Ordenha from './models/Ordenha';

export const modelClasses = [
  Talhao,
  Animal,
  Tratamento,
  EstoqueItem,
  Maquina,
  Ordenha,
];

function getPlatformOS(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-exports, @typescript-eslint/no-require-imports
    const RN = require('react-native');
    return RN?.Platform?.OS || 'web';
  } catch {
    return 'web';
  }
}

function createAdapter() {
  const os = getPlatformOS();
  const isNative = os === 'ios' || os === 'android';

  if (isNative) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-exports, @typescript-eslint/no-require-imports
      const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default;
      return new SQLiteAdapter({
        schema,
        migrations,
        dbName: 'minha_fazenda',
        jsi: os === 'ios',
        onSetUpError: (error: any) => {
          console.error('Erro ao configurar SQLite nativo:', error);
        },
      });
    } catch (e) {
      console.warn('Fallback para LokiJSAdapter:', e);
    }
  }

  return new LokiJSAdapter({
    schema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: typeof window !== 'undefined' && !!(window as any).indexedDB,
    onSetUpError: (error: any) => {
      console.error('Erro ao configurar LokiJS/Web:', error);
    },
  });
}

export const adapter = createAdapter();

export const database = new Database({
  adapter,
  modelClasses,
});

export * from './schema';
export * from './migrations';
export * from './models';
export * from './repositories';
export * from './tests/persistenceTest';
export * from './sync';
