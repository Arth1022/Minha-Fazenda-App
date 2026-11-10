import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState } from 'react';

import { db, enableForeignKeys } from './client';
import migrations from './migrations/migrations';
import { aplicarMigracoesPuladas, lerMigracoes } from './reparoMigracoes';
import { devSeedHabilitado, runDevSeed } from './seed';

interface MigrationState {
  success: boolean;
  error?: Error;
}

/**
 * Aplica as migrations geradas pelo drizzle-kit (src/database/migrations) e só
 * então liga as chaves estrangeiras: as migrations rodam numa transação, onde o
 * SQLite ignora PRAGMA foreign_keys, e a recriação de tabelas que o drizzle-kit
 * gera falharia com elas ligadas. Antes, aplica as que o migrator pularia por
 * terem data anterior à última aplicada (merge de branches; ver reparoMigracoes).
 */
export function useDatabaseMigrations(): MigrationState {
  const [state, setState] = useState<MigrationState>({ success: false });

  useEffect(() => {
    Promise.resolve()
      .then(() => {
        const reparadas = aplicarMigracoesPuladas(db, lerMigracoes(migrations));
        if (reparadas.length > 0) console.warn('[Banco] Migrations aplicadas fora de ordem:', reparadas.join(', '));
      })
      .then(() => migrate(db, migrations))
      .then(() => {
        enableForeignKeys();
        if (devSeedHabilitado) runDevSeed();
        setState({ success: true });
      })
      .catch((error: Error) => setState({ success: false, error }));
  }, []);

  return state;
}
