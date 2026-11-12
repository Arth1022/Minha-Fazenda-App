import React, { createContext, useContext, useEffect, useMemo } from 'react';

import { useEstadoDaConta, useUsuarioAtual, type EstadoConta, type Usuario } from '@/services/usuario';
import {
  atualizarUsuarioDaSessao,
  entrar,
  entrarSemConta,
  iniciarConta,
  registrar,
  sair,
} from './servicoConta';

export interface ContaValor {
  /** `carregando` só na abertura; o estado volta igual ao reiniciar o app */
  estado: EstadoConta;
  usuario: Usuario;
  registrar: typeof registrar;
  entrar: typeof entrar;
  entrarSemConta: typeof entrarSemConta;
  sair: typeof sair;
  atualizarUsuario: typeof atualizarUsuarioDaSessao;
}

const AuthContext = createContext<ContaValor | null>(null);

/**
 * Estado da conta para as telas: `carregando`, `deslogado`, `sem-conta` ou
 * `logado`. A sessão fica no SecureStore, então o estado sobrevive ao reiniciar.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const estado = useEstadoDaConta();
  const usuario = useUsuarioAtual();

  useEffect(() => {
    iniciarConta().catch((erro: unknown) => {
      console.warn('[Conta] Não foi possível ler a sessão:', erro instanceof Error ? erro.message : erro);
    });
  }, []);

  const valor = useMemo<ContaValor>(
    () => ({
      estado,
      usuario,
      registrar,
      entrar,
      entrarSemConta,
      sair,
      atualizarUsuario: atualizarUsuarioDaSessao,
    }),
    [estado, usuario]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useConta(): ContaValor {
  const valor = useContext(AuthContext);
  if (!valor) throw new Error('useConta precisa do AuthProvider');
  return valor;
}
