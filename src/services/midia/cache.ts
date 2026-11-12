import { Directory, File, Paths } from 'expo-file-system';

import { urlDaMidia } from './api';

/**
 * Cópia local das mídias que já estão no Storage, em `Documents/midias/<caminho>`. Quem enviou
 * já fica com o arquivo aqui; quem recebe pelo sync baixa uma vez e depois abre offline.
 */

const PASTA = 'midias';

function arquivoDoCaminho(caminho: string): File {
  const partes = caminho.split('/');
  const nome = partes.pop() as string;
  const pasta = new Directory(Paths.document, PASTA, ...partes);
  pasta.create({ intermediates: true, idempotent: true });
  return new File(pasta, nome);
}

/** URI local do arquivo, se já estiver no celular. */
export function midiaNoCelular(caminho: string): string | null {
  try {
    const arquivo = arquivoDoCaminho(caminho);
    return arquivo.exists ? arquivo.uri : null;
  } catch {
    return null;
  }
}

/** Depois do envio: o arquivo local passa a morar no cache com o nome do caminho remoto. */
export async function guardarEnviada(caminho: string, uriLocal: string): Promise<string> {
  const destino = arquivoDoCaminho(caminho);
  if (!destino.exists) await new File(uriLocal).copy(destino);
  return destino.uri;
}

const baixando = new Map<string, Promise<string>>();

/** Baixa pela URL assinada (uma vez por caminho, mesmo com várias telas pedindo juntas). */
export function baixarMidia(fazendaId: string, caminho: string): Promise<string> {
  const local = midiaNoCelular(caminho);
  if (local) return Promise.resolve(local);
  let pendente = baixando.get(caminho);
  if (!pendente) {
    pendente = (async () => {
      const { url } = await urlDaMidia(fazendaId, caminho);
      const arquivo = await File.downloadFileAsync(url, arquivoDoCaminho(caminho), { idempotent: true });
      return arquivo.uri;
    })().finally(() => baixando.delete(caminho));
    baixando.set(caminho, pendente);
  }
  return pendente;
}

/** Logout: as mídias de outra conta não ficam no celular. */
export function limparCacheDeMidias(): void {
  try {
    const pasta = new Directory(Paths.document, PASTA);
    if (pasta.exists) pasta.delete();
  } catch {
    // Nada para apagar
  }
}
