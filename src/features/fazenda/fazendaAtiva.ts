import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { definirFazendaDoContexto } from '@/database';

/**
 * Fazenda aberta no celular: o id fica guardado e volta ao abrir o app.
 * `confirmada` = a fazenda já esteve no banco local; se ela sumir depois, a
 * pessoa foi removida (antes disso, só ainda não desceu pelo sync).
 */
export interface FazendaAtivaSalva {
  id: string;
  confirmada: boolean;
}

const CHAVE = 'minhafazenda.fazenda_ativa';

let salva: FazendaAtivaSalva | null = null;
const ouvintes = new Set<() => void>();

function gravar(nova: FazendaAtivaSalva | null) {
  salva = nova;
  definirFazendaDoContexto(nova?.id ?? null);
  try {
    if (nova) Storage.setItemSync(CHAVE, JSON.stringify(nova));
    else Storage.removeItemSync(CHAVE);
  } catch (erro) {
    console.warn('[Fazenda] Não foi possível guardar a fazenda ativa:', erro);
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}

/** Lê a fazenda guardada (abertura do app ou tarefa em segundo plano). */
export function carregarFazendaAtiva(): FazendaAtivaSalva | null {
  try {
    const bruto = Storage.getItemSync(CHAVE);
    const lida = bruto ? (JSON.parse(bruto) as Partial<FazendaAtivaSalva>) : null;
    salva = lida && typeof lida.id === 'string' ? { id: lida.id, confirmada: lida.confirmada === true } : null;
  } catch {
    salva = null;
  }
  definirFazendaDoContexto(salva?.id ?? null);
  ouvintes.forEach((ouvinte) => ouvinte());
  return salva;
}

export function fazendaAtivaSalva(): FazendaAtivaSalva | null {
  return salva;
}

/** Abre a fazenda (a lista, o convite aceito ou a fazenda devolvida no cadastro). */
export function definirFazendaAtiva(id: string): void {
  if (salva?.id === id) return;
  gravar({ id, confirmada: false });
}

/** A fazenda ativa já está no banco local. */
export function confirmarFazendaAtiva(): void {
  if (salva && !salva.confirmada) gravar({ ...salva, confirmada: true });
}

/** Volta para a lista de fazendas (trocar de fazenda, sair, removido). */
export function limparFazendaAtiva(): void {
  if (salva) gravar(null);
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function useFazendaAtivaSalva(): FazendaAtivaSalva | null {
  return useSyncExternalStore(inscrever, fazendaAtivaSalva);
}
