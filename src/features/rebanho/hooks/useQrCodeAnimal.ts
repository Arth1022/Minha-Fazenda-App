import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { buscarAnimalPorReferencia } from '../data/animais';
import { lerQrAnimal } from '../services/qrCode';

/**
 * Trata um QR Code lido pelo leitor do app. `tratar` devolve true quando o QR é
 * de animal (e abre a ficha dele); false para o chamador seguir com outro fluxo.
 */
export function useQrCodeAnimal() {
  const router = useRouter();

  const tratar = useCallback(
    async (valor: string): Promise<boolean> => {
      const referencia = lerQrAnimal(valor);
      if (!referencia) return false;

      const animal = await buscarAnimalPorReferencia(referencia);
      if (animal) {
        router.push({ pathname: '/animal/[id]', params: { id: animal.id } });
        return true;
      }
      // Link de animal que não existe mais: é nosso, mas não há o que abrir
      if (referencia.tipo === 'id') {
        Alert.alert('Animal não encontrado', 'Este QR Code é de um animal que não está cadastrado.');
        return true;
      }
      // Texto curto que não é brinco do rebanho: pode ser de outro fluxo
      return false;
    },
    [router]
  );

  return { tratar };
}
