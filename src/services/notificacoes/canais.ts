import { AndroidImportance, setNotificationChannelAsync } from 'expo-notifications';

import type { CanalId } from '@/dtos';

import { plataforma } from './plataforma';

/**
 * Canais de notificação do Android (no iOS não existem). O usuário liga/desliga
 * cada um nas configurações do aparelho. Depois de criado, o Android só deixa
 * mudar nome e descrição de um canal: para mudar importância, crie um id novo.
 */
export const CANAIS: Record<CanalId, { nome: string; descricao: string }> = {
  ordenha: {
    nome: 'Ordenha',
    descricao: 'Lembretes dos horários de ordenha',
  },
  saude: {
    nome: 'Saúde do rebanho',
    descricao: 'Doses de tratamento, vacinas e fim de carência',
  },
  reproducao: {
    nome: 'Reprodução',
    descricao: 'Partos previstos e acompanhamento reprodutivo',
  },
};

/** Cria (ou atualiza) os canais. Idempotente; no Android 13+ precisa vir antes do pedido de permissão. */
export async function registrarCanais(): Promise<void> {
  if (plataforma !== 'android') return;
  await Promise.all(
    Object.entries(CANAIS).map(([id, canal]) =>
      setNotificationChannelAsync(id, {
        name: canal.nome,
        description: canal.descricao,
        importance: AndroidImportance.HIGH,
      })
    )
  );
}
