/**
 * Fotos, áudios e documentos no Supabase Storage (bucket privado `midias`, pela API).
 *
 * - `valor.ts`: formato do valor gravado nas colunas (`file://` local ou `midia:<caminho>`)
 * - `api.ts`: rotas `/fazendas/{fazendaId}/midias` (enviar, URL assinada, apagar)
 * - `envio.ts`: envio em segundo plano do que ainda está só no celular
 * - `cache.ts`: cópia local das mídias já enviadas ou baixadas
 * - `useMidia.ts`: hook que entrega um arquivo local para `<Image>` e o player de áudio
 */
export { apagarMidia, enviarMidia, urlDaMidia, type MidiaEnviada } from './api';
export { baixarMidia, limparCacheDeMidias, midiaNoCelular } from './cache';
export { COLUNAS_DE_MIDIA, enviarMidiasPendentes, iniciarEnvioDeMidias, pararEnvioDeMidias } from './envio';
export { useMidia, type MidiaParaExibir } from './useMidia';
export {
  caminhoDaMidia,
  ehArquivoLocal,
  ehMidiaRemota,
  fazendaDaMidia,
  PREFIXO_MIDIA,
  tipoPeloArquivo,
  valorDaMidia,
  type TipoMidia,
} from './valor';
