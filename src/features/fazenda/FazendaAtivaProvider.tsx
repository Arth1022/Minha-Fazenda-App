import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';

import { useConsultaAoVivo, type Papel } from '@/database';
import { definirPapelAtual, useEstadoDaConta, useUsuarioAtual } from '@/services/usuario';
import { fazendaComPapel, TABELAS_FAZENDAS, type FazendaDoUsuario } from './consultas';
import { confirmarFazendaAtiva, limparFazendaAtiva, useFazendaAtivaSalva } from './fazendaAtiva';

export interface FazendaAtiva {
  /** A fazenda aberta, já no banco local; null sem fazenda ou enquanto não desce */
  fazenda: { id: string; nome: string } | null;
  /** Papel do usuário na fazenda aberta */
  papel: Papel | null;
  /** Há uma fazenda escolhida que ainda não chegou pelo sync */
  aguardandoSync: boolean;
}

const Contexto = createContext<FazendaAtiva>({ fazenda: null, papel: null, aguardandoSync: false });

/**
 * Acompanha a fazenda ativa no banco local: guarda o papel do usuário nela e,
 * se ela sumir depois de já ter aparecido (a pessoa foi removida), volta para
 * a lista com o aviso.
 */
export function FazendaAtivaProvider({ children }: { children: React.ReactNode }) {
  const salva = useFazendaAtivaSalva();
  const estado = useEstadoDaConta();
  const usuario = useUsuarioAtual();
  const chave = `${salva?.id ?? ''}:${usuario.id}:${estado}`;

  const { dados: linha, carregado } = useConsultaAoVivo<FazendaDoUsuario | null>(
    () => (salva ? fazendaComPapel(salva.id, usuario.id, estado) : Promise.resolve(null)),
    TABELAS_FAZENDAS,
    chave,
    null
  );
  // A leitura é da chave atual (troca de fazenda não usa a linha da anterior)
  const atual = linha && salva && linha.id === salva.id ? linha : null;

  useEffect(() => {
    if (!salva || !carregado) return;
    if (atual) {
      confirmarFazendaAtiva();
      definirPapelAtual(atual.papel);
    } else if (salva.confirmada && estado === 'logado') {
      limparFazendaAtiva();
      definirPapelAtual(undefined);
      Alert.alert('Fazenda', 'Você não faz mais parte desta fazenda');
    }
  }, [salva, carregado, atual, estado]);

  const valor = useMemo<FazendaAtiva>(
    () => ({
      fazenda: atual ? { id: atual.id, nome: atual.nome } : null,
      papel: atual?.papel ?? null,
      aguardandoSync: salva !== null && atual === null,
    }),
    [atual, salva]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** `{ fazenda, papel }` da fazenda aberta. */
export function useFazendaAtiva(): FazendaAtiva {
  return useContext(Contexto);
}

/** Papel do usuário na fazenda aberta: `owner` ou `collaborator`. */
export function usePapel(): Papel | null {
  return useContext(Contexto).papel;
}
