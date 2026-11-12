import React, { createContext, useContext } from 'react';

import { useLiveQuery } from '@/database';
import type { TipoProducao } from '@/dtos';
import { configDaFazenda, useFazendaAtiva } from '@/features/fazenda';

export { salvarTipoProducao } from '@/features/fazenda';

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

/** Tipo de produção da fazenda aberta (`fazenda_config`). */
export function FazendaProvider({ children }: { children: React.ReactNode }) {
  const fazendaId = useFazendaAtiva().fazenda?.id ?? '';
  const { data } = useLiveQuery(configDaFazenda(fazendaId), [fazendaId]);
  const tipoProducao = (fazendaId && data[0]?.tipoProducao) || null;

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
