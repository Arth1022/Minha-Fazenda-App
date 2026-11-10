import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { MotivoFimUso } from '@/dtos';
import { CATEGORIA_PARADA, ACOES_AVISO, ROTA_EM_USO, rotaDoResumoNoMapa } from './constantes';

/**
 * Notificações do uso da máquina: a pergunta "Parada há 20 min" (com os botões
 * Pausa, Continua e Encerrar) e o aviso de uso encerrado pelo app.
 */

const CANAL = 'maquinas';
const disponivel = Platform.OS !== 'web';
const idDoAviso = (usoId: string) => `parada_${usoId}`;

/** Registra os botões do aviso de parada. Idempotente; chamar na inicialização. */
export async function registrarCategoriaParada(): Promise<void> {
  if (!disponivel) return;
  await Notifications.setNotificationCategoryAsync(CATEGORIA_PARADA, [
    { identifier: ACOES_AVISO.pausa, buttonTitle: 'Pausa', options: { opensAppToForeground: false } },
    { identifier: ACOES_AVISO.continua, buttonTitle: 'Continua', options: { opensAppToForeground: false } },
    {
      identifier: ACOES_AVISO.encerrar,
      buttonTitle: 'Encerrar',
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}

export async function avisarParada(usoId: string, nomeMaquina: string, minutos: number): Promise<void> {
  if (!disponivel) return;
  await Notifications.scheduleNotificationAsync({
    identifier: idDoAviso(usoId),
    content: {
      title: `${nomeMaquina} parada há ${minutos} min`,
      body: 'Pausa, continua trabalhando ou encerrar o uso? Toque para abrir.',
      categoryIdentifier: CATEGORIA_PARADA,
      data: { url: ROTA_EM_USO, usoId },
    },
    trigger: { channelId: CANAL },
  });
}

/** Tira o aviso de parada da bandeja (respondido, ou o uso acabou). */
export async function limparAvisoParada(usoId: string): Promise<void> {
  if (!disponivel) return;
  await Notifications.dismissNotificationAsync(idDoAviso(usoId)).catch(() => undefined);
}

const TEXTO_FIM: Partial<Record<MotivoFimUso, string>> = {
  parada: 'Ficou parada sem resposta: o uso foi encerrado na hora do último movimento.',
  pausa: 'A pausa passou de 3 horas: o uso foi encerrado.',
  velocidade: 'O celular passou da velocidade da máquina: o uso foi encerrado no último ponto compatível.',
  fora: 'Saiu da divisa da fazenda: o uso foi encerrado no último ponto dentro dela.',
};

/** Aviso do fim automático; tocar abre o resumo no mapa, com o "Desfazer" (RF-050). */
export async function avisarEncerradoPeloApp(nomeMaquina: string, motivo: MotivoFimUso, usoId: string): Promise<void> {
  if (!disponivel) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Uso de ${nomeMaquina} encerrado pelo app`,
      body: `${TEXTO_FIM[motivo] ?? 'O uso foi encerrado.'} Toque para ver ou desfazer.`,
      data: { url: rotaDoResumoNoMapa(usoId), usoId },
    },
    trigger: { channelId: CANAL },
  });
}
