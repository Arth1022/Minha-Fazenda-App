// Fuso com horário de verão (8/3/2026, 2h → 3h), para provar que a cópia dos dias
// confirmados acha a meia-noite local e não soma 24h fixas. Antes de qualquer Date.
process.env.TZ = 'America/New_York';

import { readMigrationFiles } from 'drizzle-orm/migrator';
import initSqlJs, { type Database } from 'sql.js';

import journal from '../src/database/migrations/meta/_journal.json';

// A mesma leitura que o migrator do Drizzle faz: journal + .sql divididos nos breakpoints
const MIGRATIONS = readMigrationFiles({ migrationsFolder: 'src/database/migrations' });

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✅ ${message}`);
}

/** Aplica as migrations do journal de `de` até `ate` (inclusive), como o migrator faz. */
function migrar(banco: Database, de: number, ate: number) {
  for (const migration of MIGRATIONS.slice(de, ate + 1)) {
    for (const comando of migration.sql) {
      if (comando.trim()) banco.run(comando);
    }
  }
}

function valores(banco: Database, sql: string): unknown[][] {
  return banco.exec(sql)[0]?.values ?? [];
}

const dia = (d: number, m: number, a = 2026) => new Date(a, m - 1, d).getTime();

async function runMigrationsTest() {
  console.log('=========================================================');
  console.log('🗄️  MINHA FAZENDA - MIGRATIONS DA SPRINT 2');
  console.log('=========================================================\n');

  const SQL = await initSqlJs();
  const banco = new SQL.Database();
  const ultima = journal.entries.at(-1)!.idx;
  const copia = journal.entries.find((e) => e.tag.endsWith('copia_dias_confirmados'))!.idx;

  // Banco como estava antes da cópia, com tratamentos já confirmados na tela antiga
  migrar(banco, 0, copia - 1);
  banco.run(`insert into animais (id, brinco, created_at, updated_at) values ('vaca', '#1', 0, 0)`);
  const tratamento = (id: string, inicio: number, dias: string) =>
    banco.run(
      `insert into tratamentos (id, animal_id, medicamento, data_inicio, dias_confirmados, criado_por, created_at, updated_at)
       values ('${id}', 'vaca', 'Antibiótico', ${inicio}, '${dias}', 'joao', 100, 200)`
    );
  tratamento('t1', dia(20, 10), '[1,3]');
  tratamento('t2', dia(7, 3), '[1,2,3]');
  tratamento('t3', dia(1, 9), '[0,"x",2,2]');
  tratamento('t4', dia(1, 9), '[]');

  const padrao = valores(banco, `select dias_semana, horario, intervalo_horas, aviso_minutos_antes from tratamentos where id = 't1'`);
  check(
    padrao[0][0] === '[1,2,3,4,5,6,7]' && padrao[0][1] === null && padrao[0][2] === null && padrao[0][3] === 0,
    'tratamento antigo ganha agenda padrão: todos os dias, sem horário, aviso na hora'
  );

  migrar(banco, copia, ultima);
  banco.run('PRAGMA foreign_keys = ON;');
  const doses = (id: string) =>
    valores(banco, `select dia from doses_aplicadas where tratamento_id = '${id}' order by dia`).map((l) => l[0]);

  check(doses('t1').join() === [dia(20, 10), dia(22, 10)].join(), 'dias 1 e 3 viram as datas de 20/10 e 22/10 (meia-noite local)');
  check(
    doses('t2').join() === [dia(7, 3), dia(8, 3), dia(9, 3)].join(),
    'cópia atravessa o horário de verão sem errar a meia-noite (9/3 não vira 01:00)'
  );
  check(doses('t3').join() === String(dia(2, 9)), 'índices inválidos (0, texto) são ignorados e repetidos viram uma linha só');
  check(doses('t4').length === 0, 'tratamento sem dias confirmados não gera doses');

  const [linha] = valores(banco, `select id, criado_por, created_at, updated_at from doses_aplicadas where tratamento_id = 't1' limit 1`);
  check(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(String(linha[0])),
    `id da dose copiada é UUID v4 (${linha[0]})`
  );
  check(linha[1] === 'joao' && linha[2] === 200 && linha[3] === 200, 'dose copiada herda criado_por e a data da última alteração do tratamento');

  migrar(banco, copia, copia);
  check(doses('t1').length === 2, 'rodar a cópia de novo não duplica (índice único tratamento + dia)');

  let duplicouNaMao = false;
  try {
    banco.run(`insert into doses_aplicadas (id, tratamento_id, dia, created_at, updated_at) values ('x', 't1', ${dia(20, 10)}, 0, 0)`);
    duplicouNaMao = true;
  } catch {
    // esperado: UNIQUE(tratamento_id, dia)
  }
  check(!duplicouNaMao, 'o banco recusa confirmar o mesmo dia duas vezes');

  // Pai e touro: apagar o touro limpa a referência (ON DELETE SET NULL corrigido à mão na 0007)
  banco.run(`insert into animais (id, brinco, sexo, created_at, updated_at) values ('touro', '#900', 'M', 0, 0)`);
  banco.run(`insert into animais (id, brinco, pai_id, mae_id, created_at, updated_at) values ('cria', '#2', 'touro', 'vaca', 0, 0)`);
  banco.run(`insert into reproducoes (id, animal_id, tipo, data, touro_id, created_at, updated_at) values ('r1', 'vaca', 'cobertura', 0, 'touro', 0, 0)`);
  banco.run(`delete from animais where id = 'touro'`);
  check(valores(banco, `select pai_id from animais where id = 'cria'`)[0][0] === null, 'apagar o touro deixa a cria sem pai_id');
  check(valores(banco, `select touro_id from reproducoes where id = 'r1'`)[0][0] === null, 'apagar o touro deixa a cobertura sem touro_id');

  banco.run(`delete from tratamentos where id = 't1'`);
  check(doses('t1').length === 0, 'apagar o tratamento apaga as doses dele');

  console.log('\n🎉 MIGRATIONS OK!\n');
}

runMigrationsTest().catch((error) => {
  console.error('❌ Falha nos testes de migrations:', error);
  process.exit(1);
});
