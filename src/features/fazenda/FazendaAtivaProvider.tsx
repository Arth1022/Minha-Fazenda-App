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
  /** Lendo a fazenda guardada no banco (abertura do app) */
  carregando: boolean;
}

const Contexto = createContext<FazendaAtiva>({ fazenda: null, papel: null, aguardandoSync: false, carregando: false });

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

  const { dados: lida, carregado: algumaLida } = useConsultaAoVivo<{ chave: string; linha: FazendaDoUsuario | null }>(
    async () => ({
      chave,
      linha: salva && estado !== 'carregando' ? await fazendaComPapel(salva.id, usuario.id, estado) : null,
    }),
    TABELAS_FAZENDAS,
    chave,
    { chave: '', linha: null }
  );
  // Só vale a leitura desta chave (troca de fazenda ou de conta não usa a anterior)
  const carregado = algumaLida && lida.chave === chave && estado !== 'carregando';
  const linha = carregado ? lida.linha : null;
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
      aguardandoSync: salva !== null && carregado && atual === null,
      carregando: salva !== null && !carregado,
    }),
    [atual, salva, carregado]
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
