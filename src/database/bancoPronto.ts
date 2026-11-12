import { useEffect, useState } from 'react';

import { powersync } from '@/features/sync/db';

interface EstadoBanco {
  pronto: boolean;
  erro?: Error;
}

/**
 * Abre o banco local do PowerSync. As tabelas (views) saem do schema do
 * Drizzle a cada abertura, sem migration.
 */
export function useBancoPronto(): EstadoBanco {
  const [estado, setEstado] = useState<EstadoBanco>({ pronto: false });
  useEffect(() => {
    powersync.init().then(
      () => setEstado({ pronto: true }),
      (erro: unknown) => setEstado({ pronto: false, erro: erro instanceof Error ? erro : new Error(String(erro)) })
    );
  }, []);
  return estado;
}
