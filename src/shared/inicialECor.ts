/**
 * Avatar sem foto: a primeira letra do nome num círculo colorido. A cor sai de
 * um hash do id do usuário, então a mesma pessoa tem a mesma cor em todo celular.
 * Funções puras, sem dependência do aparelho (testadas em Node).
 */

/** 8 cores do tema, todas com contraste de pelo menos 4,5:1 com texto branco. */
export const CORES_AVATAR = [
  '#1D6B39', // verde floresta
  '#1E5AA8', // azul
  '#B45309', // âmbar escuro
  '#7C3AED', // roxo
  '#B91C1C', // vermelho
  '#0F766E', // verde-azulado
  '#4338CA', // anil
  '#9D174D', // vinho
] as const;

/** Bytes UTF-8 do texto (o hash é o mesmo em qualquer plataforma). */
function bytesUtf8(texto: string): number[] {
  const bytes: number[] = [];
  for (const caractere of texto) {
    const ponto = caractere.codePointAt(0) ?? 0;
    if (ponto < 0x80) bytes.push(ponto);
    else if (ponto < 0x800) bytes.push(0xc0 | (ponto >> 6), 0x80 | (ponto & 0x3f));
    else if (ponto < 0x10000) {
      bytes.push(0xe0 | (ponto >> 12), 0x80 | ((ponto >> 6) & 0x3f), 0x80 | (ponto & 0x3f));
    } else {
      bytes.push(
        0xf0 | (ponto >> 18),
        0x80 | ((ponto >> 12) & 0x3f),
        0x80 | ((ponto >> 6) & 0x3f),
        0x80 | (ponto & 0x3f)
      );
    }
  }
  return bytes;
}

/** FNV-1a de 32 bits. */
export function fnv1a(texto: string): number {
  let hash = 0x811c9dc5;
  for (const byte of bytesUtf8(texto)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Cor de fundo do avatar: FNV-1a do id, módulo 8. */
export function corDoAvatar(usuarioId: string | null | undefined): string {
  return CORES_AVATAR[fnv1a(usuarioId ?? '') % CORES_AVATAR.length];
}

/**
 * Primeira letra (ou número) visível do nome, em maiúsculo e com o acento
 * (Álvaro → Á). Nome vazio, só espaços ou sem letra mostra "?".
 */
export function inicialDoNome(nome: string | null | undefined): string {
  const texto = (nome ?? '').normalize('NFC');
  const achado = texto.match(/[\p{L}\p{N}]\p{M}*/u);
  if (!achado) return '?';
  return achado[0].toLocaleUpperCase('pt-BR').normalize('NFC');
}
