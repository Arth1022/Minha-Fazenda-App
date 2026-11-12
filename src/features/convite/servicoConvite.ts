import type { Papel } from '@/database';
import { api, ehErroApi } from '@/shared/api';

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

/** Código que o colaborador digita: 6 caracteres, vale 24 horas e para uma pessoa só. */
export interface CodigoConvite {
  codigo: string;
  /** "Entre na minha fazenda: <código>" (texto do compartilhar) */
  mensagem: string;
  /** ISO 8601 */
  expiraEm: string;
}

const caminhoFazenda = (fazendaId: string) => `/fazendas/${encodeURIComponent(fazendaId)}`;

/** `POST /fazendas/{id}/convites/codigo` (só o dono): um código novo para uma pessoa. */
export function gerarCodigoConvite(fazendaId: string): Promise<CodigoConvite> {
  return api<CodigoConvite>(`${caminhoFazenda(fazendaId)}/convites/codigo`, { metodo: 'POST' });
}

/** O último código ainda válido e não usado (o dono voltou para a tela), ou null. */
export async function codigoConviteValido(fazendaId: string): Promise<CodigoConvite | null> {
  try {
    return await api<CodigoConvite>(`${caminhoFazenda(fazendaId)}/convites/codigo`);
  } catch (erro) {
    if (ehErroApi(erro) && erro.status === 404) return null;
    throw erro;
  }
}

/** "abc-23 4" → "ABC234" (a API também aceita do jeito que a pessoa digitou). */
export function normalizarCodigo(digitado: string): string {
  return digitado.replace(/[\s-]/g, '').toUpperCase();
}

/** O texto tem cara de código de convite (6 letras/números)? */
export function pareceCodigo(digitado: string): boolean {
  return /^[A-Z0-9]{6}$/.test(normalizarCodigo(digitado));
}

export function criarConvite(fazendaId: string): Promise<Convite> {
  return api<Convite>(`${caminhoFazenda(fazendaId)}/convites`, { metodo: 'POST' });
}

export async function revogarConvite(conviteId: string): Promise<void> {
  await api(`/convites/${encodeURIComponent(conviteId)}`, { metodo: 'DELETE' });
}

/**
 * Entra na fazenda do convite (como colaborador).
 * TODO(decisao): convite com aprovação do owner; padrão: entrada direta ao aceitar.
 */
export function aceitarConvite(tokenOuCodigo: string): Promise<{ fazendaId: string }> {
  // O mesmo campo serve para o código digitado e para o token do link antigo
  const token = pareceCodigo(tokenOuCodigo) ? normalizarCodigo(tokenOuCodigo) : tokenOuCodigo;
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
