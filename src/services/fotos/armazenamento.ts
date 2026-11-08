import { Directory, File, Paths } from 'expo-file-system';

/**
 * Fotos do app (animal, comprovantes de vacina e exame) guardadas numa pasta do
 * próprio app. Assim continuam existindo mesmo se a pessoa apagar da galeria, e
 * funcionam offline.
 */

const PASTA = 'fotos';

function pastaDasFotos(): Directory {
  const pasta = new Directory(Paths.document, PASTA);
  pasta.create({ intermediates: true, idempotent: true });
  return pasta;
}

/** A foto já está guardada na pasta do app? (ex.: edição sem trocar a foto) */
export function ehFotoGuardada(uri: string | null | undefined): boolean {
  return Boolean(uri && uri.includes(`/${PASTA}/`) && uri.startsWith(Paths.document.uri));
}

/**
 * Copia a foto temporária para a pasta do app e devolve o endereço definitivo.
 * Foto que já está guardada volta como está; null continua null.
 */
export async function guardarFoto(uri: string | null): Promise<string | null> {
  if (!uri || ehFotoGuardada(uri)) return uri;
  const extensao = uri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const nome = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;
  const destino = new File(pastaDasFotos(), nome);
  await new File(uri).copy(destino);
  return destino.uri;
}

/** Apaga uma foto guardada (ex.: trocou ou tirou a foto). Ignora o que não é do app. */
export function apagarFoto(uri: string | null | undefined): void {
  if (!ehFotoGuardada(uri)) return;
  descartarArquivo(uri as string);
}

/** Apaga um arquivo de cache (foto que só serviu para leitura). */
export function descartarFotoTemporaria(uri: string): void {
  descartarArquivo(uri);
}

function descartarArquivo(uri: string): void {
  try {
    new File(uri).delete();
  } catch {
    // Já não existe, ou é cache que o sistema limpa depois: nada a fazer
  }
}
