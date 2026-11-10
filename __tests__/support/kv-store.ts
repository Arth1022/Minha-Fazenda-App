/**
 * Substitui `expo-sqlite/kv-store` nos testes (ver tsconfig.test.json):
 * armazenamento chave-valor síncrono em memória para testar migração legada.
 */
const memoria = new Map<string, string>();

const Storage = {
  getItemSync(chave: string): string | null {
    return memoria.get(chave) ?? null;
  },
  setItemSync(chave: string, valor: string): void {
    memoria.set(chave, valor);
  },
  removeItemSync(chave: string): void {
    memoria.delete(chave);
  },
  clearSync(): void {
    memoria.clear();
  },
};

export default Storage;
