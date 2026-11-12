/** Substitui `expo-secure-store` nos testes (ver tsconfig.test.json): chave-valor em memória. */
export const memoria = new Map<string, string>();

export async function getItemAsync(chave: string): Promise<string | null> {
  return memoria.get(chave) ?? null;
}

export async function setItemAsync(chave: string, valor: string): Promise<void> {
  memoria.set(chave, valor);
}

export async function deleteItemAsync(chave: string): Promise<void> {
  memoria.delete(chave);
}
