import type { Papel } from '@/database';
import { api } from '@/shared/api';

/**
 * Convites e membros: tudo pela API (no celular `fazenda_membros` é só
 * leitura). A mudança chega aos celulares pelo sync. Quem garante as regras
 * (só o dono convida, último dono não sai) é a API.
 */

export interface Convite {
  id: string;
  url: string;
  token: string;
  /** ISO 8601 */
  expiraEm: string;
}

const caminhoFazenda = (fazendaId: string) => `/fazendas/${encodeURIComponent(fazendaId)}`;

export function criarConvite(fazendaId: string): Promise<Convite> {
  return api<Convite>(`${caminhoFazenda(fazendaId)}/convites`, { metodo: 'POST' });
}

export async function revogarConvite(conviteId: string): Promise<void> {
  await api(`/convites/${encodeURIComponent(conviteId)}`, { metodo: 'DELETE' });
}

/** Entra na fazenda do convite (como colaborador). */
export function aceitarConvite(token: string): Promise<{ fazendaId: string }> {
  return api<{ fazendaId: string }>('/convites/aceitar', { metodo: 'POST', corpo: { token } });
}

export async function mudarPapel(fazendaId: string, usuarioId: string, papel: Papel): Promise<void> {
  await api(`${caminhoFazenda(fazendaId)}/membros/${encodeURIComponent(usuarioId)}`, {
    metodo: 'PATCH',
    corpo: { papel },
  });
}

export async function removerMembro(fazendaId: string, usuarioId: string): Promise<void> {
  await api(`${caminhoFazenda(fazendaId)}/membros/${encodeURIComponent(usuarioId)}`, { metodo: 'DELETE' });
}

export async function sairDaFazenda(fazendaId: string): Promise<void> {
  await api(`${caminhoFazenda(fazendaId)}/membros/me`, { metodo: 'DELETE' });
}
