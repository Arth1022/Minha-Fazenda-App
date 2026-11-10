import { Alert } from 'react-native';

import type { Talhao } from '@/database';
import { contarPontosAbertos } from '@/services/marcadorService';
import { deletarTalhao } from '@/services/talhaoService';

/**
 * Pergunta antes de excluir a área. A exclusão é lógica: o registro fica
 * guardado (sync e histórico), mas some do mapa junto com os pontos de atenção dela.
 */
export async function confirmarExclusaoArea(area: Pick<Talhao, 'id' | 'nome'>, aoExcluir?: () => void) {
  const pontos = await contarPontosAbertos(area.id).catch(() => 0);
  const extra =
    pontos === 0
      ? ''
      : pontos === 1
        ? ' O ponto de atenção marcado nela também sai do mapa.'
        : ` Os ${pontos} pontos de atenção marcados nela também saem do mapa.`;
  Alert.alert('Excluir área', `Excluir "${area.nome}" do mapa?${extra}`, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Excluir',
      style: 'destructive',
      onPress: () => {
        aoExcluir?.();
        deletarTalhao(area.id).catch((erro: unknown) =>
          Alert.alert('Não foi possível excluir', erro instanceof Error ? erro.message : String(erro))
        );
      },
    },
  ]);
}
