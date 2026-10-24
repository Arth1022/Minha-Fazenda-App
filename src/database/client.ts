import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

const DATABASE_NAME = 'minha-fazenda.db';

// enableChangeListener: necessário para o useLiveQuery reagir às escritas.
const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

export const db = drizzle(expoDb, { schema });

/** Liga as chaves estrangeiras (ON DELETE CASCADE) nesta conexão. */
export function enableForeignKeys() {
  expoDb.execSync('PRAGMA foreign_keys = ON;');
}
