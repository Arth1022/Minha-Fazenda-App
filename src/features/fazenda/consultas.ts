import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { db, fazendaMembros, fazendas, type Papel } from '@/database';
import type { EstadoConta } from '@/services/usuario';

export interface FazendaDoUsuario {
  id: string;
  nome: string;
  papel: Papel;
}

/** Tabelas lidas pela lista e pela fazenda ativa (consulta ao vivo). */
export const TABELAS_FAZENDAS = ['fazendas', 'fazenda_membros'] as const;

/**
 * Fazendas do usuário logado (membro ativo) com o papel dele em cada uma. No
 * modo sem conta não há membros: a fazenda local é do dono do celular.
 */
export async function minhasFazendas(usuarioId: string, estado: EstadoConta): Promise<FazendaDoUsuario[]> {
  if (estado === 'sem-conta') {
    return db
      .select({ id: fazendas.id, nome: fazendas.nome, papel: sql<Papel>`'owner'` })
      .from(fazendas)
      .where(isNull(fazendas.deletedAt))
      .orderBy(asc(fazendas.nome));
  }
  if (estado !== 'logado' || !usuarioId) return [];
  return db
    .select({ id: fazendas.id, nome: fazendas.nome, papel: fazendaMembros.papel })
    .from(fazendaMembros)
    .innerJoin(fazendas, and(eq(fazendas.id, fazendaMembros.fazendaId), isNull(fazendas.deletedAt)))
    .where(and(eq(fazendaMembros.usuarioId, usuarioId), isNull(fazendaMembros.removedAt)))
    .orderBy(asc(fazendas.nome));
}

/** A fazenda ativa com o papel do usuário; null se ela não está (ou não está mais) no celular. */
export async function fazendaComPapel(
  fazendaId: string,
  usuarioId: string,
  estado: EstadoConta
): Promise<FazendaDoUsuario | null> {
  const lista = await minhasFazendas(usuarioId, estado);
  return lista.find((f) => f.id === fazendaId) ?? null;
}
