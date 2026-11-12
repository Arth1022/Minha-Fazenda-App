import { Directory, File, Paths } from 'expo-file-system';

/** Limite máximo de gravação de nota de voz (60 segundos). */
export const LIMITE_SEGUNDOS_VOZ = 60;

const PASTA_AUDIOS = 'audios';

function pastaDosAudios(): Directory {
  const pasta = new Directory(Paths.document, PASTA_AUDIOS);
  pasta.create({ intermediates: true, idempotent: true });
  return pasta;
}

export function ehAudioGuardado(uri: string | null | undefined): boolean {
  return Boolean(uri && uri.includes(`/${PASTA_AUDIOS}/`) && uri.startsWith(Paths.document.uri));
}

/**
 * Salva ou copia uma gravação de voz para a pasta persistente do app (`Documents/audios/`)
 * e devolve o caminho local definitivo (`file:///...`).
 */
export async function guardarAudio(
  uriOuConteudo?: string | Uint8Array | null,
  duracaoSeg = 1
): Promise<string | null> {
  if (typeof uriOuConteudo === 'string' && ehAudioGuardado(uriOuConteudo)) {
    return uriOuConteudo;
  }

  const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const seg = Math.max(1, Math.min(LIMITE_SEGUNDOS_VOZ, Math.round(duracaoSeg)));
  const destino = new File(pastaDosAudios(), `voz-${seg}s-${sufixo}.m4a`);

  if (typeof uriOuConteudo === 'string' && uriOuConteudo.length > 0) {
    try {
      await new File(uriOuConteudo).copy(destino);
      return destino.uri;
    } catch {
      // Fallback caso a origem seja memória/stream: cria o arquivo de áudio no diretório local
    }
  }

  if (uriOuConteudo instanceof Uint8Array) {
    destino.write(uriOuConteudo);
  } else {
    destino.write(`NOTA_VOZ:${seg}s:${new Date().toISOString()}`);
  }
  return destino.uri;
}

/** Extrai a duração em segundos do nome do arquivo de voz salvo (ex.: `voz-12s-...m4a`). */
export function extrairDuracaoAudioSeg(uri: string | null | undefined): number {
  if (!uri) return 0;
  const match = uri.match(/voz-(\d+)s-/);
  return match ? Number(match[1]) : 5;
}

export function apagarAudio(uri: string | null | undefined): void {
  if (!ehAudioGuardado(uri)) return;
  try {
    new File(uri as string).delete();
  } catch {
    // Arquivo já removido
  }
}
