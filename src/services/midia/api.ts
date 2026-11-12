import { File } from 'expo-file-system';

import { api } from '@/shared/api';
import type { TipoMidia } from './valor';

/**
 * Rotas de mídia da API (`/fazendas/{fazendaId}/midias`). O arquivo vai para o bucket privado
 * `midias` do Supabase Storage, na pasta da fazenda e do tipo.
 */

export interface MidiaEnviada {
  /** `<fazendaId>/<pasta>/<id>.<ext>` */
  caminho: string;
  /** Leitura temporária (URL assinada) */
  url: string;
  expiraEm: string;
}

/** Um áudio de 20 MB numa rede 3G rural leva bem mais que os 20 s padrão. */
const TEMPO_ENVIO_MS = 120_000;

/**
 * `POST /fazendas/{fazendaId}/midias` (multipart: arquivo, tipo, id). O mesmo `id` cai no mesmo
 * caminho: repetir o envio depois de uma queda de rede não duplica o arquivo.
 */
export async function enviarMidia(
  fazendaId: string,
  tipo: TipoMidia,
  uriLocal: string,
  id: string
): Promise<MidiaEnviada> {
  const formulario = new FormData();
  formulario.append('tipo', tipo);
  formulario.append('id', id);
  // expo/fetch só aceita o arquivo como File do expo-file-system (nome e tipo vêm dele;
  // a API confere o formato pelos bytes)
  formulario.append('arquivo', new File(uriLocal));
  return api<MidiaEnviada>(`/fazendas/${fazendaId}/midias`, {
    metodo: 'POST',
    formulario,
    tempoLimiteMs: TEMPO_ENVIO_MS,
  });
}

/** `GET /fazendas/{fazendaId}/midias/url?caminho=` — URL assinada para baixar ou tocar. */
export function urlDaMidia(fazendaId: string, caminho: string): Promise<MidiaEnviada> {
  return api<MidiaEnviada>(`/fazendas/${fazendaId}/midias/url?caminho=${encodeURIComponent(caminho)}`);
}

/** `DELETE /fazendas/{fazendaId}/midias?caminho=` */
export async function apagarMidia(fazendaId: string, caminho: string): Promise<void> {
  await api(`/fazendas/${fazendaId}/midias?caminho=${encodeURIComponent(caminho)}`, { metodo: 'DELETE' });
}
