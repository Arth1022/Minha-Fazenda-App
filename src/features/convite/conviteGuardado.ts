import Storage from 'expo-sqlite/kv-store';

/**
 * Token do convite que chegou com a pessoa deslogada: fica guardado até ela
 * criar a conta (vai no `conviteToken` do cadastro) ou entrar (vai no
 * `POST /convites/aceitar` depois do login).
 */
const CHAVE = 'minhafazenda.convite_pendente';

export function guardarConvite(token: string): void {
  try {
    Storage.setItemSync(CHAVE, token);
  } catch (erro) {
    console.warn('[Convite] Não foi possível guardar o convite:', erro);
  }
}

export function conviteGuardado(): string | null {
  try {
    return Storage.getItemSync(CHAVE);
  } catch {
    return null;
  }
}

export function esquecerConvite(): void {
  try {
    Storage.removeItemSync(CHAVE);
  } catch {
    // Nada guardado
  }
}
