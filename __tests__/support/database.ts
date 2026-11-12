/**
 * Substitui `@/features/sync/db` nos testes (ver tsconfig.test.json): o mesmo
 * schema do app, com o PowerSync de verdade em Node (@powersync/node) no lugar
 * do de React Native. As tabelas são as mesmas views do celular (sem FK, sem
 * UNIQUE, fila de upload), então os testes valem para o app.
 */
import { wrapPowerSyncWithDrizzle } from '@powersync/drizzle-driver';
import { PowerSyncDatabase } from '@powersync/node';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { definirFazendaDoContexto, tabelas } from '../../src/entities';
import { AppSchema } from '../../src/features/sync/schema';
import { definirPapelAtual, definirUsuarioAtual } from '../../src/services/usuario/usuarioAtual';

export * from '../../src/entities';

/** Fazenda e usuário dos testes (o mesmo "Beta" que o app usava antes do login). */
export const FAZENDA_TESTE = 'fazenda-teste';
export const USUARIO_TESTE = { id: 'usuario-beta', nome: 'Beta' };

function abrir(pasta: string) {
  const banco = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: 'teste.db', dbLocation: pasta },
  });
  return { banco, drizzle: wrapPowerSyncWithDrizzle(banco, { schema: tabelas }) };
}

let pasta = mkdtempSync(join(tmpdir(), 'minha-fazenda-teste-'));
let aberto = abrir(pasta);

export let powersync = aberto.banco;
export let db = aberto.drizzle;

/**
 * Banco vazio para o teste, com a fazenda ativa e o usuário (dono) definidos,
 * como o app fica depois de entrar e abrir a fazenda.
 */
export async function initTestDatabase(): Promise<void> {
  await powersync.close().catch(() => undefined);
  rmSync(pasta, { recursive: true, force: true });
  pasta = mkdtempSync(join(tmpdir(), 'minha-fazenda-teste-'));
  aberto = abrir(pasta);
  powersync = aberto.banco;
  db = aberto.drizzle;
  await powersync.init();
  definirFazendaDoContexto(FAZENDA_TESTE);
  definirUsuarioAtual(USUARIO_TESTE);
  definirPapelAtual('owner');
}

/** Fecha o banco no fim do teste (o worker do SQLite não deixa o processo sair sozinho). */
export async function fecharTestDatabase(): Promise<void> {
  await powersync.close().catch(() => undefined);
  rmSync(pasta, { recursive: true, force: true });
}

// Ao terminar o teste, fecha o banco (uma vez) para o processo sair
let fechado = false;
process.on('beforeExit', () => {
  if (fechado) return;
  fechado = true;
  void fecharTestDatabase();
});
