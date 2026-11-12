import { db, fazendas, newId, novaFazendaLocal } from '@/database';
import { api } from '@/shared/api';

/**
 * `fazendas` é só leitura no celular: criar e renomear passam pela API e a
 * mudança chega pelo sync. A exceção é a fazenda do modo sem conta.
 */

export function validarNomeFazenda(nome: string): string | null {
  return nome.trim() ? null : 'Informe o nome da fazenda.';
}

/** Cria a fazenda na nuvem (precisa de internet) com id gerado no app; ela aparece quando o sync descer. */
export async function criarFazenda(nome: string): Promise<{ id: string; nome: string }> {
  const erro = validarNomeFazenda(nome);
  if (erro) throw new Error(erro);
  return api<{ id: string; nome: string }>('/fazendas', {
    metodo: 'POST',
    corpo: { id: newId(), nome: nome.trim() },
  });
}

/** Só o dono: muda o nome na nuvem; o nome novo desce pelo sync. */
export async function renomearFazenda(fazendaId: string, nome: string): Promise<void> {
  const erro = validarNomeFazenda(nome);
  if (erro) throw new Error(erro);
  await api(`/fazendas/${encodeURIComponent(fazendaId)}`, { metodo: 'PATCH', corpo: { nome: nome.trim() } });
}

/**
 * Modo sem conta: a primeira fazenda é criada no banco local. É a única vez
 * que o app grava em `fazendas` (essa escrita nunca sobe: o sync não conecta).
 */
export async function criarFazendaLocal(nome: string): Promise<string> {
  const erro = validarNomeFazenda(nome);
  if (erro) throw new Error(erro);
  const linha = novaFazendaLocal(nome.trim());
  await db.insert(fazendas).values(linha);
  return linha.id;
}
