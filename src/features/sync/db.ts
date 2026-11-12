import { wrapPowerSyncWithDrizzle } from '@powersync/drizzle-driver';
import { PowerSyncDatabase } from '@powersync/react-native';

import { tabelas } from '@/entities';
import { AppSchema } from './schema';

/**
 * Instância única do banco local. Telas e serviços leem e gravam aqui (sempre
 * no SQLite do celular); o PowerSync sobe a fila e desce os dados das fazendas
 * do usuário quando está conectado (ver conexao.ts).
 */
export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'minha-fazenda-sync.db' },
});

export const db = wrapPowerSyncWithDrizzle(powersync, { schema: tabelas });

export type BancoLocal = typeof db;
