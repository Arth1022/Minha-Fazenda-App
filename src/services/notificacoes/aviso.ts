import { usuarioAtual } from '@/services/usuario';

import { agendarNotificacao } from './notificacoes';

/** Atraso do aviso local: o sistema só agenda data no futuro. */
const LOGO_MS = 2000;

export interface AvisoParaPessoa {
  titulo: string;
  mensagem: string;
  /** Rota aberta ao tocar */
  url?: string;
}

/**
 * Aviso para outra pessoa da fazenda (RF-070: push pelo Firebase). Ainda não
 * há API nem Firebase (SIMULADO): se a pessoa é quem está com este celular, o
 * aviso sai como notificação local; senão fica só no log, até o envio pela API
 * existir. Devolve como saiu.
 */
export async function avisarPessoa(
  paraId: string,
  aviso: AvisoParaPessoa,
  agora = new Date()
): Promise<'local' | 'semEnvio'> {
  if (paraId === usuarioAtual().id) {
    await agendarNotificacao(
      {
        titulo: aviso.titulo,
        mensagem: aviso.mensagem,
        url: aviso.url,
        canal: 'tarefas',
        quando: { tipo: 'data', data: new Date(agora.getTime() + LOGO_MS) },
      },
      agora
    );
    return 'local';
  }
  console.info(`[Push simulado, sem API] para ${paraId}: ${aviso.titulo} — ${aviso.mensagem}`);
  return 'semEnvio';
}
