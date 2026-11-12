import { useSyncExternalStore } from 'react';

import { definirUsuarioDoContexto, type Papel } from '@/database';

/**
 * Quem está usando o app neste celular: o usuário logado (ou o perfil local no
 * modo sem conta) com o papel dele na fazenda ativa, e o estado da conta.
 * Quem preenche é a conta (features/conta) e a fazenda ativa (features/fazenda);
 * aqui só fica guardado, para serviços e telas de outras features lerem.
 */

/** Dono (mexe em pessoas, áreas e na fazenda) ou colaborador. */
export type PapelUsuario = Papel;

export interface Usuario {
  id: string;
  nome: string;
  /** Sem papel (ex.: operador registrado num uso antigo): tratado como colaborador */
  papel?: PapelUsuario;
  avatarUrl?: string | null;
}

/** `carregando` só na abertura, enquanto a sessão salva é lida. */
export type EstadoConta = 'carregando' | 'deslogado' | 'sem-conta' | 'logado';

let atual: Usuario = { id: '', nome: '' };
let estado: EstadoConta = 'carregando';
const ouvintes = new Set<() => void>();

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function usuarioAtual(): Usuario {
  return atual;
}

/** Troca quem está no celular (login, perfil local ou saída). */
export function definirUsuarioAtual(usuario: Omit<Usuario, 'papel'> | null): void {
  atual = usuario ? { ...usuario, papel: atual.id === usuario.id ? atual.papel : undefined } : { id: '', nome: '' };
  definirUsuarioDoContexto(usuario?.id || null);
  avisar();
}

/** Papel na fazenda ativa (muda ao trocar de fazenda ou quando o dono muda o papel). */
export function definirPapelAtual(papel: PapelUsuario | undefined): void {
  if (atual.papel === papel) return;
  atual = { ...atual, papel };
  avisar();
}

export function estadoDaConta(): EstadoConta {
  return estado;
}

export function definirEstadoDaConta(novo: EstadoConta): void {
  if (estado === novo) return;
  estado = novo;
  avisar();
}

/** Usuário atual numa tela (re-renderiza quando muda nome, foto ou papel). */
export function useUsuarioAtual(): Usuario {
  return useSyncExternalStore(inscrever, usuarioAtual);
}

export function useEstadoDaConta(): EstadoConta {
  return useSyncExternalStore(inscrever, estadoDaConta);
}
