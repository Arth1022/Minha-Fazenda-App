import { and, asc, eq, isNull } from 'drizzle-orm';

import { db, fazendaDoContexto, fazendaMembros, usuarios, type Papel } from '@/database';
import { usuarioAtual, type Usuario } from './usuarioAtual';

export interface MembroDaFazenda extends Usuario {
  papel: Papel;
  avatarUrl: string | null;
}

/** Tabelas lidas por `listarMembros` (para a consulta ao vivo). */
export const TABELAS_MEMBROS = ['fazenda_membros', 'usuarios'] as const;

/**
 * Pessoas da fazenda ativa (membros ativos, com nome e foto que descem pelo
 * sync). Sem conta não há membros: só quem está com o celular.
 */
export async function listarMembros(): Promise<MembroDaFazenda[]> {
  const fazendaId = fazendaDoContexto();
  if (!fazendaId) return [];
  const linhas = await db
    .select({
      id: fazendaMembros.usuarioId,
      papel: fazendaMembros.papel,
      nome: usuarios.nome,
      avatarUrl: usuarios.avatarUrl,
    })
    .from(fazendaMembros)
    .leftJoin(usuarios, eq(usuarios.id, fazendaMembros.usuarioId))
    .where(and(eq(fazendaMembros.fazendaId, fazendaId), isNull(fazendaMembros.removedAt)))
    .orderBy(asc(usuarios.nome));
  return linhas.map((l) => ({ id: l.id, papel: l.papel, nome: l.nome ?? '', avatarUrl: l.avatarUrl ?? null }));
}

/**
 * Pessoas que recebem tarefas (M6): os membros da fazenda, com quem está com o
 * celular primeiro.
 */
export async function listarColaboradores(): Promise<Usuario[]> {
  const eu = usuarioAtual();
  const membros = await listarMembros();
  const euNaLista = membros.find((m) => m.id === eu.id);
  return [euNaLista ?? eu, ...membros.filter((m) => m.id !== eu.id)];
}
