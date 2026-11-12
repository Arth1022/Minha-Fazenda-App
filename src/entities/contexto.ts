/**
 * Quem está gravando e em qual fazenda: lido pelos helpers de escrita e pelos
 * filtros de consulta. Quem define é a conta (usuário logado ou perfil local)
 * e a escolha da fazenda ativa; aqui só fica guardado, sem regra.
 */
interface ContextoDeEscrita {
  fazendaId: string | null;
  usuarioId: string | null;
}

const contexto: ContextoDeEscrita = { fazendaId: null, usuarioId: null };

export function definirFazendaDoContexto(fazendaId: string | null): void {
  contexto.fazendaId = fazendaId;
}

export function definirUsuarioDoContexto(usuarioId: string | null): void {
  contexto.usuarioId = usuarioId;
}

/** Fazenda ativa, ou null antes de escolher uma. */
export function fazendaDoContexto(): string | null {
  return contexto.fazendaId;
}

/** Usuário logado (ou perfil local no modo sem conta). */
export function usuarioDoContexto(): string | null {
  return contexto.usuarioId;
}
