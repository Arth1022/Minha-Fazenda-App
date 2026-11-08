import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';
import { extractTextFromImage, isSupported } from 'expo-text-extractor';
import { Platform } from 'react-native';

import { descartarFotoTemporaria } from './armazenamento';
import { areaNaFoto, larguraParaLeitura, type Retangulo, type Tamanho } from './recorte';

/**
 * Leitura de texto numa foto (OCR no próprio aparelho, offline).
 *
 * Ler a foto inteira erra muito: o número fica pequeno no meio de capim, cerca e
 * outras escritas, e o leitor reduz a imagem antes de ler. Por isso lê primeiro
 * só a área do visor, recortada em dois enquadramentos (justo e folgado) e na
 * resolução que o leitor lê melhor. Os dois resultados vão juntos: o que aparece
 * nas duas leituras é o mais confiável. A foto inteira fica só de reserva.
 */

/** O aparelho tem leitor de texto? (no web, não) */
export const leituraDeTextoDisponivel = isSupported;

/** Folgas ao redor do visor: justo (tira a sujeira em volta) e folgado (perdoa o enquadramento). */
const FOLGAS = [0.1, 0.35] as const;
/** Limite ao abrir a foto: corta o consumo de memória sem perder detalhe no recorte. */
const CARREGAR_ATE = { maxWidth: 3000, maxHeight: 4000 };

export interface EnquadramentoLeitura {
  /** Retângulo-guia, nas coordenadas da prévia da câmera */
  visor: Retangulo;
  /** Tamanho da prévia da câmera na tela */
  tela: Tamanho;
}

export interface OpcoesLeituraTexto {
  /** Onde estava o visor: lê primeiro só essa parte da foto */
  enquadramento?: EnquadramentoLeitura;
  /** A leitura do recorte serve? Se não, lê também a foto inteira. Padrão: leu algum texto. */
  serve?: (textos: string[]) => boolean;
}

const leuAlgo = (textos: string[]) => textos.some((texto) => texto.trim().length > 0);

/**
 * Textos lidos na foto, na ordem em que aparecem (recortes primeiro). Não apaga
 * a foto recebida. Falha do leitor de texto (ex.: modelo ainda não baixado) sobe
 * como erro, para quem chamou oferecer digitar.
 */
export async function lerTextoDaFoto(uri: string, opcoes: OpcoesLeituraTexto = {}): Promise<string[]> {
  const { enquadramento, serve = leuAlgo } = opcoes;
  const textos: string[] = [];

  if (enquadramento) {
    textos.push(...(await lerRecortes(uri, enquadramento)));
    if (serve(textos)) return textos;
  }

  textos.push(...(await lerArquivo(uri)));
  return textos;
}

/** Lê cada recorte do visor; se não der para recortar, volta vazio (fica a foto inteira). */
async function lerRecortes(uri: string, { visor, tela }: EnquadramentoLeitura): Promise<string[]> {
  let foto: ImageRef | null = null;
  try {
    // Abre uma vez já com o giro aplicado: as medidas são as da imagem de verdade
    foto = await ImageManipulator.manipulate(uri, CARREGAR_ATE).renderAsync();
    const textos: string[] = [];
    for (const folga of FOLGAS) {
      const area = areaNaFoto(foto, tela, visor, folga);
      if (!area) break;
      textos.push(...(await lerRecorte(foto, area)));
    }
    return textos;
  } catch (erro) {
    if (erro instanceof ErroDeLeitura) throw erro.causa;
    return [];
  } finally {
    foto?.release();
  }
}

async function lerRecorte(foto: ImageRef, area: Retangulo): Promise<string[]> {
  const contexto = ImageManipulator.manipulate(foto).crop({
    originX: area.x,
    originY: area.y,
    width: area.width,
    height: area.height,
  });
  const largura = larguraParaLeitura(area.width);
  if (largura) contexto.resize({ width: largura });
  const recorte = await contexto.renderAsync();
  contexto.release();
  const arquivo = await recorte.saveAsync({ format: SaveFormat.JPEG, compress: 1 }).finally(() => recorte.release());
  try {
    return await lerArquivo(arquivo.uri).catch((causa: unknown) => {
      throw new ErroDeLeitura(causa);
    });
  } finally {
    descartarFotoTemporaria(arquivo.uri);
  }
}

/** Erro do próprio leitor de texto (não do recorte): não adianta tentar a foto inteira. */
class ErroDeLeitura extends Error {
  constructor(readonly causa: unknown) {
    super('Falha ao ler o texto da foto');
  }
}

/** No Android o leitor de texto espera o caminho do arquivo; no iOS, a URL file://. */
function lerArquivo(uri: string): Promise<string[]> {
  const caminho = Platform.OS === 'android' ? uri.replace(/^file:\/\//, '') : uri;
  return extractTextFromImage(caminho);
}
