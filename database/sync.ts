import { synchronize, SyncDatabaseChangeSet } from '@nozbe/watermelondb/sync';
import { database } from './index';

export interface SyncOptions {
  apiBaseUrl?: string;
  authToken?: string;
  onProgress?: (status: string) => void;
}

export async function syncDatabase(options?: SyncOptions): Promise<void> {
  const { apiBaseUrl = 'http://localhost:8080/api/v1/sync', authToken, onProgress } = options || {};

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      onProgress?.('Baixando atualizações da nuvem...');

      const url = new URL(`${apiBaseUrl}/pull`);
      if (lastPulledAt) {
        url.searchParams.set('last_pulled_at', String(lastPulledAt));
      }
      url.searchParams.set('schema_version', String(schemaVersion));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Falha no pull do sync: ${response.status} ${response.statusText}`);
      }

      const { changes, timestamp } = await response.json();
      return { changes, timestamp };
    },

    pushChanges: async ({ changes, lastPulledAt }) => {
      onProgress?.('Enviando alterações locais para a nuvem...');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/push?last_pulled_at=${lastPulledAt || 0}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        throw new Error(`Falha no push do sync: ${response.status} ${response.statusText}`);
      }
    },

    sendCreatedAsUpdated: false,
  });

  onProgress?.('Sincronização concluída com sucesso.');
}
