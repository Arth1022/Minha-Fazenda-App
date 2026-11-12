import type {
  CommonPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/common';

import { api, ehErroApi } from '@/shared/api';
import { marcarAppDesatualizado } from './estadoSync';
import { descreverRejeicao, montarUpload, type RespostaUpload } from './upload';

interface TokenPowerSync {
  endpoint: string;
  token: string;
  expiresAt?: string | null;
}

/**
 * Liga o PowerSync à API: o token do PowerSync vem de `/auth/powersync-token`
 * (a URL do PowerSync também, nunca fixa no app) e a fila de escritas sobe
 * por `POST /sync/upload`, uma transação por vez.
 */
export class ConectorApi implements PowerSyncBackendConnector {
  constructor(private readonly aoAppDesatualizado: () => void = () => undefined) {}

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    try {
      const credenciais = await api<TokenPowerSync>('/auth/powersync-token');
      return {
        endpoint: credenciais.endpoint,
        token: credenciais.token,
        expiresAt: credenciais.expiresAt ? new Date(credenciais.expiresAt) : undefined,
      };
    } catch (erro) {
      // Sessão encerrada: sem credencial (a conta já voltou para o login)
      if (ehErroApi(erro, 'SESSAO_ENCERRADA')) return null;
      // Sem internet ou servidor fora: o PowerSync tenta de novo
      throw erro;
    }
  }

  async uploadData(database: CommonPowerSyncDatabase): Promise<void> {
    const transacao = await database.getNextCrudTransaction();
    if (!transacao) return;

    const { corpo } = montarUpload(transacao.crud);
    if (corpo.ops.length === 0) {
      // Só escritas em tabelas só leitura: descarta sem enviar
      await transacao.complete();
      return;
    }

    let resposta: RespostaUpload;
    try {
      resposta = await api<RespostaUpload>('/sync/upload', { metodo: 'POST', corpo });
    } catch (erro) {
      if (ehErroApi(erro) && erro.status === 426) {
        marcarAppDesatualizado();
        this.aoAppDesatualizado();
      }
      // 426, 5xx e rede: a transação fica na fila e o PowerSync tenta de novo.
      // TODO(decisao): outro 4xx no lote inteiro (fora do contrato) também fica
      // tentando; a API devolve as recusas de validação no 200 (`rejeitadas`).
      throw erro;
    }

    await transacao.complete();
    if (resposta?.rejeitadas?.length) {
      console.warn('[Sync] Operações recusadas pela API:', resposta.rejeitadas.map(descreverRejeicao));
    }
  }
}
