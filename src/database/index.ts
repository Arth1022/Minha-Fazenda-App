import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState } from 'react';

import { db, enableForeignKeys } from './client';
import migrations from './migrations/migrations';
import { devSeedHabilitado, runDevSeed } from './seed';

/**
 * Único ponto de acesso ao banco local (Drizzle + expo-sqlite).
 * Telas e features importam daqui; trocar o driver fica restrito a esta pasta.
 */
export { db };
export { useLiveQuery } from 'drizzle-orm/expo-sqlite';
export * from './schema';

interface MigrationState {
  success: boolean;
  error?: Error;
}

/**
 * Aplica as migrations geradas pelo drizzle-kit (src/database/migrations) e só
 * então liga as chaves estrangeiras: as migrations rodam numa transação, onde o
 * SQLite ignora PRAGMA foreign_keys, e a recriação de tabelas que o drizzle-kit
 * gera falharia com elas ligadas.
 */
export function useDatabaseMigrations(): MigrationState {
  const [state, setState] = useState<MigrationState>({ success: false });

  useEffect(() => {
    migrate(db, migrations)
      .then(() => {
        enableForeignKeys();
        if (devSeedHabilitado) runDevSeed();
        setState({ success: true });
      })
      .catch((error: Error) => setState({ success: false, error }));
  }, []);

  return state;
}
