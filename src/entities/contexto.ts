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

/** Quem precisa refazer o que leu quando a fazenda ativa muda (as consultas ao vivo). */
const ouvintesDaFazenda = new Set<() => void>();

export function definirFazendaDoContexto(fazendaId: string | null): void {
  if (contexto.fazendaId === fazendaId) return;
  contexto.fazendaId = fazendaId;
  ouvintesDaFazenda.forEach((ouvir) => ouvir());
}

/**
 * Avisa quando a fazenda ativa muda. As consultas filtram por `fazendaDoContexto()`
 * no momento em que são montadas: sem refazer, continuariam lendo a fazenda anterior.
 */
export function ouvirFazendaDoContexto(ouvir: () => void): () => void {
  ouvintesDaFazenda.add(ouvir);
  return () => {
    ouvintesDaFazenda.delete(ouvir);
  };
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
