import { ConectorApi } from './connector';
import { powersync } from '@/features/sync/db';
import { estaDesatualizado } from './estadoSync';
import { iniciarEnvioDeMidias, limparCacheDeMidias, pararEnvioDeMidias } from '@/services/midia';

/**
 * Liga e desliga o sync. `connect()` só no modo logado (depois do login e na
 * abertura do app logado); no modo sem conta nunca é chamado. Nada aqui espera
 * a rede: a tela continua lendo o banco local.
 */

const conector = new ConectorApi(() => {
  // 426: para o sync (o app segue offline com os dados locais)
  setTimeout(() => {
    powersync.disconnect().catch(() => undefined);
  }, 0);
});

export function conectarSync(): void {
  if (estaDesatualizado()) return;
  powersync.connect(conector).catch((erro: unknown) => {
    console.warn('[Sync] Não foi possível iniciar o sync:', erro instanceof Error ? erro.message : erro);
  });
  // Fotos e áudios sobem para o Storage quando houver conexão
  iniciarEnvioDeMidias();
}

/** Para o sync sem apagar nada (sessão encerrada: a fila fica para o próximo login). */
export async function desconectarSync(): Promise<void> {
  pararEnvioDeMidias();
  await powersync.disconnect();
}

/** Logout: para o sync e apaga os dados locais (o próximo login baixa tudo de novo). */
export async function desconectarELimpar(): Promise<void> {
  pararEnvioDeMidias();
  await powersync.disconnectAndClear();
  limparCacheDeMidias();
}
