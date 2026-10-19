/**
 * Serviço de operação Local-First (100% Offline)
 * Garante que o aplicativo não dependa de conexões de rede na inicialização
 * ou durante o uso no campo (modo avião).
 */

export interface OfflineEnvironmentInfo {
  mode: 'local-first';
  requiresNetworkOnBoot: false;
  storageEngine: 'WatermelonDB (SQLite / LokiJS)';
  syncStatus: 'offline-ready' | 'syncing' | 'synced';
}

export const offlineService = {
  getEnvironmentInfo(): OfflineEnvironmentInfo {
    return {
      mode: 'local-first',
      requiresNetworkOnBoot: false,
      storageEngine: 'WatermelonDB (SQLite / LokiJS)',
      syncStatus: 'offline-ready',
    };
  },

  /**
   * Verifica se o app pode operar normalmente sem sinal de rede.
   * No modelo Local-First, retorna sempre true pois a fonte primária da verdade é o banco local.
   */
  canOperateWithoutSignal(): boolean {
    return true;
  },
};
