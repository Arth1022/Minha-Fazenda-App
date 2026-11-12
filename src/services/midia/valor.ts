/**
 * Como uma mídia aparece na coluna do registro (foto_uri, comprovante_uri, audio_uri e as
 * fotos de tarefa_eventos.dados):
 *
 * - `file:///.../fotos/x.jpg` — só existe neste celular (ainda não subiu);
 * - `midia:<fazendaId>/<pasta>/<id>.<ext>` — está no Storage do Supabase; qualquer membro da
 *   fazenda baixa por URL assinada (ver `api.ts`).
 *
 * Sem dependência do aparelho (testado em Node).
 */

export const PREFIXO_MIDIA = 'midia:';

export type TipoMidia = 'imagem' | 'audio' | 'documento';

export function ehMidiaRemota(valor: string | null | undefined): valor is string {
  return typeof valor === 'string' && valor.startsWith(PREFIXO_MIDIA);
}

export function ehArquivoLocal(valor: string | null | undefined): valor is string {
  return typeof valor === 'string' && valor.startsWith('file:');
}

/** `midia:abc/imagens/x.jpg` → `abc/imagens/x.jpg` */
export function caminhoDaMidia(valor: string): string {
  return valor.slice(PREFIXO_MIDIA.length);
}

export function valorDaMidia(caminho: string): string {
  return `${PREFIXO_MIDIA}${caminho}`;
}

/** Fazenda dona do arquivo (primeira parte do caminho). */
export function fazendaDaMidia(valor: string): string {
  return caminhoDaMidia(valor).split('/')[0];
}

/** Tipo pelo nome do arquivo local, para o campo `tipo` do envio. */
export function tipoPeloArquivo(uri: string): TipoMidia {
  const extensao = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (['m4a', 'mp3', 'aac', 'ogg', 'webm', 'wav', 'caf', '3gp'].includes(extensao)) return 'audio';
  if (extensao === 'pdf') return 'documento';
  return 'imagem';
}

/** Content-Type do multipart (a API confere pelos bytes; isto só ajuda o servidor HTTP). */
export function tipoDoConteudo(uri: string): string {
  const extensao = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  const tipos: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    webm: 'audio/webm',
    wav: 'audio/wav',
    pdf: 'application/pdf',
  };
  return tipos[extensao] ?? 'application/octet-stream';
}

/**
 * Troca, numa lista de fotos (tarefa_eventos.dados.fotos), o arquivo local pelo valor remoto.
 * Devolve null se nada mudou.
 */
export function trocarNaLista(lista: unknown, local: string, remoto: string): string[] | null {
  if (!Array.isArray(lista)) return null;
  let mudou = false;
  const nova = lista.map((item) => {
    if (item === local) {
      mudou = true;
      return remoto;
    }
    return item;
  });
  return mudou ? (nova as string[]) : null;
}
