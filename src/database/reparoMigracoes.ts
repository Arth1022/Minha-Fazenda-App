import { sql, type SQL } from 'drizzle-orm';

/**
 * Reparo de migrations puladas.
 *
 * O migrator do Drizzle só aplica as migrations com data (`when` do journal)
 * MAIOR que a última já aplicada no aparelho. Quando duas branches geram
 * migrations em paralelo, a que entra no merge depois pode ter data menor e
 * nunca roda em quem já tinha aplicado a outra (foi o que deixou um aparelho sem
 * a tabela `talhoes`: a 0012 é anterior à 0015 das máquinas). Antes do
 * `migrate`, este passo aplica, na ordem do journal, as que ficaram para trás.
 */

const TABELA_MIGRACOES = '__drizzle_migrations';
const QUEBRA = '--> statement-breakpoint';

/** O pacote que o drizzle-kit gera para o expo (`migrations/migrations.js`). */
export interface PacoteMigracoes {
  journal: { entries: { idx: number; when: number; tag: string }[] };
  migrations: Record<string, string>;
}

/** Uma migration como o migrator a lê: a data e os comandos SQL. */
export interface MigracaoLida {
  tag: string;
  quando: number;
  comandos: string[];
}

/** O que o reparo usa do banco do Drizzle (driver síncrono, como o expo-sqlite). */
export interface BancoMigravel {
  values<T extends unknown[] = unknown[]>(query: SQL): T[];
  run(query: SQL): unknown;
  transaction<T>(transacao: (tx: BancoMigravel) => T): T;
}

/** Mesma leitura do migrator do expo: `m0000`, `m0001`... cortados nas quebras. */
export function lerMigracoes(pacote: PacoteMigracoes): MigracaoLida[] {
  return pacote.journal.entries.map((entrada) => {
    const texto = pacote.migrations[`m${entrada.idx.toString().padStart(4, '0')}`];
    if (texto === undefined) throw new Error(`Migration ausente: ${entrada.tag}`);
    return {
      tag: entrada.tag,
      quando: entrada.when,
      comandos: texto.split(QUEBRA).filter((comando) => comando.trim().length > 0),
    };
  });
}

/**
 * As que o migrator nunca vai aplicar: data menor que a última aplicada e sem
 * registro próprio. Sem nada aplicado (primeira abertura), não há o que reparar.
 */
export function migracoesPuladas(migracoes: MigracaoLida[], aplicadas: number[]): MigracaoLida[] {
  if (aplicadas.length === 0) return [];
  const ultima = Math.max(...aplicadas);
  const registradas = new Set(aplicadas);
  return migracoes.filter((m) => m.quando < ultima && !registradas.has(m.quando));
}

/**
 * Aplica as migrations puladas numa transação e as registra como o migrator
 * faria (hash vazio, como o do expo). Devolve as tags aplicadas.
 */
export function aplicarMigracoesPuladas(db: BancoMigravel, migracoes: MigracaoLida[]): string[] {
  const tabela = db.values<[string]>(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${TABELA_MIGRACOES}`
  );
  if (tabela.length === 0) return [];

  const aplicadas = db
    .values<[number]>(sql`SELECT created_at FROM ${sql.identifier(TABELA_MIGRACOES)}`)
    .map(([quando]) => Number(quando));
  const puladas = migracoesPuladas(migracoes, aplicadas);
  if (puladas.length === 0) return [];

  db.transaction((tx) => {
    for (const migracao of puladas) {
      for (const comando of migracao.comandos) tx.run(sql.raw(comando));
      tx.run(
        sql`INSERT INTO ${sql.identifier(TABELA_MIGRACOES)} ("hash", "created_at") VALUES ('', ${migracao.quando})`
      );
    }
  });
  return puladas.map((m) => m.tag);
}
