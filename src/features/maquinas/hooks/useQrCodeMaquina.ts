import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { buscarMaquinaPorReferencia } from '../data/maquinas';
import { lerQrMaquina } from '../services/qrCode';

/**
 * Trata um QR Code lido pelo leitor do app. `tratar` devolve true quando o QR é
 * de máquina (e abre as opções dela); false para o chamador seguir com outro fluxo.
 */
export function useQrCodeMaquina() {
  const [maquinaId, setMaquinaId] = useState<string | null>(null);

  const tratar = useCallback(async (valor: string): Promise<boolean> => {
    const referencia = lerQrMaquina(valor);
    if (!referencia) return false;

    const maquina = await buscarMaquinaPorReferencia(referencia);
    if (maquina) {
      setMaquinaId(maquina.id);
      return true;
    }
    // Link de máquina que não existe mais: é nosso, mas não há o que abrir
    if (referencia.tipo === 'id') {
      Alert.alert('Máquina não encontrada', 'Este QR Code é de uma máquina que não está cadastrada.');
      return true;
    }
    // Texto curto que não é ID de máquina: pode ser de outro fluxo
    return false;
  }, []);

  const fechar = useCallback(() => setMaquinaId(null), []);

  return { maquinaId, tratar, fechar };
}
