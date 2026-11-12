/**
 * Links que abrem o app. O convite da API vem como
 * `minhafazenda://app/convite/<token>`; a rota é `convite/[token]`, então o
 * `app/` (ou qualquer prefixo antes de `convite/`) sai. Nunca lança: o que não
 * for convite segue como veio.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const convite = /(?:^|\/)convite\/([^/?#]+)/.exec(path ?? '');
    return convite ? `/convite/${convite[1]}` : path;
  } catch {
    return path;
  }
}
