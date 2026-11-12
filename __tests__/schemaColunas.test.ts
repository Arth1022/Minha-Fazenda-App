import { existsSync, readFileSync } from 'node:fs';

import { conferirSchema, postgresEspelhado, type ColunaPostgres } from './support/conferirSchema';

/**
 * Teste de schema do CI (Tarefa 10): as colunas do Drizzle e as do Postgres
 * precisam bater. O arquivo do Postgres vem do CI do back-end
 * (`contracts/schema-colunas.json`, ou o caminho em SCHEMA_COLUNAS).
 */

function check(condicao: boolean, mensagem: string) {
  if (!condicao) throw new Error(mensagem);
  console.log(`✅ ${mensagem}`);
}

/** A conferência em si: acusa coluna a mais de qualquer lado, com a tabela e a coluna na mensagem. */
function conferenciaFunciona() {
  const espelho = postgresEspelhado();
  check(conferirSchema(espelho).length === 0, 'Postgres igual ao Drizzle: nenhuma divergência');

  const comColunaNova = [...espelho, { table_name: 'animais', column_name: 'peso', data_type: 'numeric' }];
  const [aMais] = conferirSchema(comColunaNova);
  check(aMais === 'animais.peso: coluna do Postgres não existe no Drizzle', `coluna só no Postgres acusa a tabela e a coluna (${aMais})`);

  const semColuna = espelho.filter((c) => !(c.table_name === 'maquinas' && c.column_name === 'placa'));
  const [aMenos] = conferirSchema(semColuna);
  check(aMenos === 'maquinas.placa: coluna do Drizzle não existe no Postgres', `coluna só no Drizzle acusa a tabela e a coluna (${aMenos})`);

  const tipoErrado = espelho.map((c) =>
    c.table_name === 'animais' && c.column_name === 'data_nascimento' ? { ...c, data_type: 'bigint' } : c
  );
  check(conferirSchema(tipoErrado)[0]?.startsWith('animais.data_nascimento: tipo incompatível') === true, 'data guardada como bigint no Postgres é tipo incompatível');

  const comExtrasDoUsuario = [...espelho, { table_name: 'usuarios', column_name: 'email', data_type: 'text' }];
  check(conferirSchema(comExtrasDoUsuario).length === 0, 'colunas de usuarios fora de id, nome e avatar_url são ignoradas');
  check(!espelho.some((c) => c.table_name === 'perfil_local' || c.table_name === 'pontos_gps'), 'tabelas local-only ficam de fora');
}

function lerColunasDoPostgres(caminho: string): ColunaPostgres[] {
  const lido: unknown = JSON.parse(readFileSync(caminho, 'utf8'));
  const linhas = Array.isArray(lido) ? lido : (lido as { colunas?: unknown }).colunas;
  if (!Array.isArray(linhas)) throw new Error(`${caminho}: esperado uma lista de { table_name, column_name, data_type }`);
  return linhas as ColunaPostgres[];
}

function runSchemaTest() {
  console.log('🧩 MINHA FAZENDA - SCHEMA DRIZZLE × POSTGRES\n');
  conferenciaFunciona();

  const caminho = process.env.SCHEMA_COLUNAS ?? 'contracts/schema-colunas.json';
  if (!existsSync(caminho)) {
    const mensagem = `${caminho} não encontrado (gerado pelo CI do back-end).`;
    // No CI o arquivo é obrigatório; na máquina do dev, só avisa
    if (process.env.CI) throw new Error(mensagem);
    console.warn(`⚠️  ${mensagem} Comparação com o Postgres pulada.`);
    return;
  }
  const divergencias = conferirSchema(lerColunasDoPostgres(caminho));
  if (divergencias.length > 0) {
    throw new Error(`Drizzle e Postgres divergem:\n  - ${divergencias.join('\n  - ')}`);
  }
  console.log(`✅ ${caminho}: Drizzle e Postgres batem`);
}

try {
  runSchemaTest();
  console.log('\n🎉 SCHEMA OK!');
} catch (erro) {
  console.error('❌', erro instanceof Error ? erro.message : erro);
  process.exit(1);
}
