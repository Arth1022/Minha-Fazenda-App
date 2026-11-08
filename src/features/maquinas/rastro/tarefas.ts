import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { ACOES_AVISO, TAREFA_RASTRO, TAREFA_RESPOSTA_AVISO, type AcaoAviso } from './constantes';
import { receberLocalizacoes, responderAviso } from './processar';

/**
 * Tarefas de segundo plano do uso da máquina. Precisam ser definidas no escopo de
 * topo, ao carregar o app (importado no começo de app/_layout.tsx): quando o
 * sistema acorda o app só para a tarefa, nenhuma tela é montada.
 * Doc: https://docs.expo.dev/versions/v58.0.0/sdk/task-manager/
 */

const ACOES = new Set<string>(Object.values(ACOES_AVISO));

// Na web não há tarefa de segundo plano
if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: LocationObject[] }>(TAREFA_RASTRO, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    await receberLocalizacoes(data.locations).catch(() => undefined);
  });

  // Botões do aviso de parada com o app em segundo plano ou fechado (Android)
  TaskManager.defineTask<Record<string, unknown>>(TAREFA_RESPOSTA_AVISO, async ({ data, error }) => {
    if (error || !data) return;
    const resposta = data as {
      actionIdentifier?: string;
      notification?: { request?: { identifier?: string; content?: { data?: { usoId?: string } } } };
    };
    const acao = resposta.actionIdentifier;
    const usoId = resposta.notification?.request?.content?.data?.usoId;
    if (!acao || !ACOES.has(acao) || !usoId) return;
    const chave = `${resposta.notification?.request?.identifier ?? usoId}:${acao}`;
    await responderAviso(acao as AcaoAviso, usoId, chave).catch(() => undefined);
  });
}
