import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import type { DatabaseAdapter } from '@nozbe/watermelondb/adapters/type';
import { migrations } from './migrations';
import { schema } from './schema';

export function createAdapter(): DatabaseAdapter {
  return new LokiJSAdapter({
    schema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
  });
}

export const adapter: DatabaseAdapter = createAdapter();
