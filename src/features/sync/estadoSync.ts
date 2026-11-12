import { useEffect, useState, useSyncExternalStore } from 'react';

import { powersync } from '@/features/sync/db';

/**
 * Estado do sync para o indicador do cabeçalho e o banner de atualização.
 * "App desatualizado" vem do `426` do upload (ver connector.ts) e vale até o
 * app ser reaberto (depois de atualizar).
 */

export type EstadoSync = 'sincronizado' | 'pendente' | 'sem-internet' | 'app-desatualizado';

let appDesatualizado = false;
const ouvintes = new Set<() => void>();

export function marcarAppDesatualizado(): void {
  if (appDesatualizado) return;
  appDesatualizado = true;
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function estaDesatualizado(): boolean {
  return appDesatualizado;
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** O app recebeu `426 APP_DESATUALIZADO` (o sync parou). */
export function useAppDesatualizado(): boolean {
  return useSyncExternalStore(inscrever, estaDesatualizado);
}

/** Escritas na fila de upload do PowerSync, ainda não enviadas. */
export async function contarPendentes(): Promise<number> {
  const estatisticas = await powersync.getUploadQueueStats();
  return estatisticas.count;
}

/**
 * Situação do sync, atualizada quando o PowerSync muda de estado ou o banco
 * muda (uma escrita nova entra na fila).
 */
export function useEstadoSync(): EstadoSync {
  const desatualizado = useAppDesatualizado();
  const [conectado, setConectado] = useState(powersync.currentStatus.connected);
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    let ativo = true;
    const recontar = () => {
      contarPendentes().then(
        (total) => ativo && setPendentes(total),
        () => undefined
      );
    };
    recontar();
    const pararStatus = powersync.registerListener({
      statusChanged: (status) => {
        setConectado(status.connected);
        recontar();
      },
    });
    const pararMudancas = powersync.onChangeWithCallback({ onChange: recontar }, { throttleMs: 500 });
    return () => {
      ativo = false;
      pararStatus();
      pararMudancas();
    };
  }, []);

  if (desatualizado) return 'app-desatualizado';
  if (!conectado) return 'sem-internet';
  if (pendentes > 0) return 'pendente';
  return 'sincronizado';
}

/** O sync já terminou o primeiro download completo (com conta, depois do login). */
export function useJaSincronizou(): boolean {
  const [sincronizou, setSincronizou] = useState(powersync.currentStatus.hasSynced === true);
  useEffect(
    () =>
      powersync.registerListener({
        statusChanged: (status) => setSincronizou(status.hasSynced === true),
      }),
    []
  );
  return sincronizou;
}
