import { readFileSync } from 'node:fs';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { drizzle } from 'drizzle-orm/sql-js';
import { migrate } from 'drizzle-orm/sql-js/migrator';
import initSqlJs, { type Database } from 'sql.js';

import {
  aplicarMigracoesPuladas,
  lerMigracoes,
  migracoesPuladas,
  type PacoteMigracoes,
} from '@/database/reparoMigracoes';
import journal from '../src/database/migrations/meta/_journal.json';

const PASTA = 'src/database/migrations';

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✅ ${message}`);
}

function valores(banco: Database, sql: string): unknown[][] {
  return banco.exec(sql)[0]?.values ?? [];
}

const temTabela = (banco: Database, nome: string) =>
  valores(banco, `select name from sqlite_master where type = 'table' and name = '${nome}'`).length > 0;
const temIndice = (banco: Database, nome: string) =>
  valores(banco, `select name from sqlite_master where type = 'index' and name = '${nome}'`).length > 0;
const colunas = (banco: Database, tabela: string) =>
  valores(banco, `pragma table_info(${tabela})`).map((linha) => String(linha[1]));

/** O mesmo pacote que o drizzle-kit gera para o expo, montado a partir dos .sql. */
const PACOTE: PacoteMigracoes = {
  journal,
  migrations: Object.fromEntries(
    journal.entries.map((e) => [
      `m${String(e.idx).padStart(4, '0')}`,
      readFileSync(`${PASTA}/${e.tag}.sql`, 'utf8'),
    ])
  ),
};

async function runReparoMigracoesTest() {
  console.log('🧰 MINHA FAZENDA - REPARO DE MIGRATIONS PULADAS\n');
  const SQL = await initSqlJs();
  const lidas = lerMigracoes(PACOTE);

  // A leitura do pacote do expo bate com a do migrator do Drizzle
  const doDrizzle = readMigrationFiles({ migrationsFolder: PASTA });
  check(
    lidas.length === doDrizzle.length &&
      lidas.every(
        (m, i) =>
          m.quando === doDrizzle[i].folderMillis &&
          m.comandos.join() === doDrizzle[i].sql.filter((c) => c.trim()).join()
      ),
    `lerMigracoes lê as ${lidas.length} migrations como o migrator do Drizzle`
  );

  // Aparelho que rodou a branch de máquinas (até a 0015) antes do merge da 0011 e da 0012
  const pular = new Set(['0011_indices_status_ordenha', '0012_talhoes']);
  const ate = lidas.findIndex((m) => m.tag === '0015_auditoria_maquinas');
  const aparelho = new SQL.Database();
  aparelho.run(
    'CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)'
  );
  for (const m of lidas.slice(0, ate + 1)) {
    if (pular.has(m.tag)) continue;
    for (const comando of m.comandos) aparelho.run(comando);
    aparelho.run(`INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES ('', ${m.quando})`);
  }
  check(!temTabela(aparelho, 'talhoes'), 'aparelho reproduzido: sem a tabela talhoes (0012 pulada)');

  const aplicadas = valores(aparelho, 'select created_at from __drizzle_migrations').map((l) => Number(l[0]));
  check(
    migracoesPuladas(lidas, aplicadas).map((m) => m.tag).join() === '0011_indices_status_ordenha,0012_talhoes',
    'detecta as migrations com data anterior à última aplicada e sem registro'
  );

  // Sem o reparo, o migrator do Drizzle pula a 0012 e quebra na 0017 (o erro do emulador)
  const semReparo = new SQL.Database(aparelho.export());
  let erroSemReparo = '';
  try {
    migrate(drizzle(semReparo), { migrationsFolder: PASTA });
  } catch (erro) {
    erroSemReparo = String((erro as { cause?: unknown }).cause ?? erro);
  }
  check(erroSemReparo.includes('no such table: talhoes'), 'sem reparo: a 0017 falha com "no such table: talhoes"');

  // Com o reparo antes do migrate, tudo fica no lugar
  const db = drizzle(aparelho);
  check(
    aplicarMigracoesPuladas(db, lidas).join() === '0011_indices_status_ordenha,0012_talhoes',
    'reparo aplica a 0011 e a 0012'
  );
  migrate(db, { migrationsFolder: PASTA });
  check(
    temTabela(aparelho, 'talhoes') && temTabela(aparelho, 'marcadores_mapa'),
    'depois do reparo, o migrate aplica a 0016 em diante (talhoes e marcadores_mapa existem)'
  );
  check(
    ['cultura', 'fase_lavoura', 'data_plantio', 'perimetro_m'].every((c) => colunas(aparelho, 'talhoes').includes(c)),
    'talhoes tem as colunas da 0017 e da 0018'
  );
  check(
    temIndice(aparelho, 'animais_status_idx') && temIndice(aparelho, 'ordenhas_data_registro_idx'),
    'os índices da 0011 também foram criados'
  );
  check(
    valores(aparelho, 'select count(*) from __drizzle_migrations')[0][0] === journal.entries.length,
    'todas as migrations do journal ficam registradas'
  );
  check(aplicarMigracoesPuladas(db, lidas).length === 0, 'abrir de novo não reaplica nada');

  // Primeira abertura (banco vazio): nada a reparar, o migrate faz tudo em ordem
  const novo = new SQL.Database();
  const dbNovo = drizzle(novo);
  check(aplicarMigracoesPuladas(dbNovo, lidas).length === 0, 'banco novo: nada a reparar');
  migrate(dbNovo, { migrationsFolder: PASTA });
  check(temTabela(novo, 'talhoes'), 'banco novo: migrate cria tudo');

  console.log('\n🎉 REPARO DE MIGRATIONS OK!');
}

runReparoMigracoesTest().catch((erro) => {
  console.error('❌', erro);
  process.exit(1);
});
