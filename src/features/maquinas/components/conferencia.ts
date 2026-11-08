import { Alert } from 'react-native';

import type { Conferencia } from '../services/registros';

/**
 * Aplica a conferência na tela: erro mostra no campo e para; "confirmar"
 * pergunta (ex.: "O tanque tem 150 L — confirmar 210 L?"). Devolve se pode seguir.
 */
export function passarPelaConferencia(
  conferencia: Conferencia,
  mostrarErro: (mensagem: string) => void
): Promise<boolean> {
  if (conferencia.tipo === 'ok') return Promise.resolve(true);
  if (conferencia.tipo === 'erro') {
    mostrarErro(conferencia.mensagem);
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    Alert.alert('Confere?', conferencia.mensagem, [
      { text: 'Corrigir', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirmar', onPress: () => resolve(true) },
    ]);
  });
}

export function avisarFalha(erro: unknown) {
  Alert.alert('Não foi possível salvar', erro instanceof Error ? erro.message : 'Tente novamente.');
}
