import { eq } from 'drizzle-orm';
import React, { createContext, useContext } from 'react';

import { db, fazendaConfig, useLiveQuery } from '@/database';
import type { TipoProducao } from '@/dtos';

interface FazendaContextValue {
  /** null enquanto o produtor não respondeu a pergunta inicial */
  tipoProducao: TipoProducao | null;
  /** Leite ou misto: libera ordenha, cobertura e carência no leite */
  produzLeite: boolean;
}

const FazendaContext = createContext<FazendaContextValue>({
  tipoProducao: null,
  produzLeite: false,
});

export const produzLeite = (tipo: TipoProducao | null) =>
  tipo === 'leite' || tipo === 'misto';

function configDaFazenda() {
  return db.select().from(fazendaConfig).limit(1);
}

/** Grava (ou altera) o tipo de produção da fazenda. */
export async function salvarTipoProducao(tipoProducao: TipoProducao): Promise<void> {
  const [atual] = await configDaFazenda();
  if (atual) {
    await db
      .update(fazendaConfig)
      .set({ tipoProducao })
      .where(eq(fazendaConfig.id, atual.id));
  } else {
    await db.insert(fazendaConfig).values({ tipoProducao });
  }
}

export function FazendaProvider({ children }: { children: React.ReactNode }) {
  const { data } = useLiveQuery(configDaFazenda());
  const tipoProducao = data[0]?.tipoProducao ?? null;

  return (
    <FazendaContext.Provider
      value={{ tipoProducao, produzLeite: produzLeite(tipoProducao) }}>
      {children}
    </FazendaContext.Provider>
  );
}

export function useFazenda(): FazendaContextValue {
  return useContext(FazendaContext);
}
