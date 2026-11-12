import { DrizzleAppSchema, type DrizzleTableWithPowerSyncOptions } from '@powersync/drizzle-driver';
import { getTableConfig } from 'drizzle-orm/sqlite-core';

import { TABELAS_LOCAIS, tabelas } from '@/entities';

const locais = new Set<unknown>(TABELAS_LOCAIS);

/** As tabelas de `src/entities`, com as só do celular marcadas como local-only. */
function comOpcoesDoPowerSync() {
  const entradas: Record<string, (typeof tabelas)[keyof typeof tabelas] | DrizzleTableWithPowerSyncOptions> = {};
  for (const [nome, entrada] of Object.entries(tabelas)) {
    entradas[nome] = locais.has(entrada)
      ? { tableDefinition: entrada as DrizzleTableWithPowerSyncOptions['tableDefinition'], options: { localOnly: true } }
      : entrada;
  }
  return entradas;
}

/**
 * Schema do PowerSync gerado do Drizzle: o PowerSync cria as tabelas (views)
 * a partir dele ao abrir o banco, sem migration.
 */
export const AppSchema = new DrizzleAppSchema(comOpcoesDoPowerSync());

/** Nome das tabelas local-only, para quem precisa saber sem importar o Drizzle. */
export const NOMES_TABELAS_LOCAIS = TABELAS_LOCAIS.map((t) => getTableConfig(t).name);
