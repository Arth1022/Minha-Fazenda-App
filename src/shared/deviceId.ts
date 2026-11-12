import * as SecureStore from 'expo-secure-store';

import { newId } from '@/entities/id';

const CHAVE = 'minhafazenda.device_id';

let emMemoria: string | null = null;

/**
 * Id deste celular: gerado uma vez e guardado no SecureStore. Vai no login e no
 * refresh para a API ligar a sessão ao aparelho (nunca serve para autenticar).
 */
export async function obterDeviceId(): Promise<string> {
  if (emMemoria) return emMemoria;
  const salvo = await SecureStore.getItemAsync(CHAVE);
  if (salvo) {
    emMemoria = salvo;
    return salvo;
  }
  const novo = newId();
  await SecureStore.setItemAsync(CHAVE, novo);
  emMemoria = novo;
  return novo;
}
