import type { Talhao } from '@/database';
import type { OcorrenciaNoMapa } from '@/services/ocorrenciaService';

/**
 * Rótulos das áreas no mapa (nome, situação e cabeças) e o que fica por cima
 * deles. Rótulos e pinos são MarkerViews: o Mapbox some com o que encosta em
 * outro (ou no ponto azul do GPS) se ele não puder sobrepor, e desenha por
 * cima o de maior prioridade. Funções puras — a tela só desenha o resultado.
 */

/** Ordem de desenho dos MarkerViews do mapa: o de número maior fica por cima. */
export const PRIORIDADE_NO_MAPA = {
  rotulo: 0,
  /** Área aberta no painel (ou com a ocorrência aberta): por cima das vizinhas */
  rotuloAtivo: 1,
  /** Pinos com lugar próprio (ocorrência com GPS, máquina): pequenos e tocáveis, sobre os rótulos */
  pino: 2,
  pinoAtivo: 3,
} as const;

/** Lado (dp) que a área precisa ocupar na tela para o rótulo aparecer */
const LADO_MINIMO_DP = 28;
/**
 * Lado (dp) da área na tela em que o rótulo some (zoom alto): ela já toma a
 * largura da tela e o cartão só cobriria o satélite. Passa do tamanho da área
 * enquadrada ao tocar nela (~313 dp), para o rótulo não sumir ao abrir o painel.
 */
const LADO_MAXIMO_DP = 360;
/** Deste zoom para dentro todo rótulo aparece, mesmo o de uma área pequena (curral, sede) */
export const ZOOM_TODOS_OS_ROTULOS = 16;
/** Maior zoom do mapa (o padrão do Mapbox) */
export const ZOOM_MAXIMO_MAPA = 22;
/** Área sem medida (não deveria existir): o rótulo some a partir deste zoom */
const ZOOM_SOME_SEM_MEDIDA = 18;
/** Metros por dp no zoom 0, no equador: no Mapbox o mundo tem 512 dp de largura no zoom 0 */
const METROS_POR_DP_ZOOM_0 = 40_075_016.686 / 512;

/** Zoom em que o lado da área ocupa `ladoDp` na tela; null se ela não tem medida. */
function zoomComLado(area: Pick<Talhao, 'areaHectares' | 'centroLat'>, ladoDp: number): number | null {
  const ladoM = Math.sqrt(Math.max(area.areaHectares, 0) * 10_000);
  if (!Number.isFinite(ladoM) || ladoM <= 0) return null;
  const metrosPorDp = METROS_POR_DP_ZOOM_0 * Math.cos((area.centroLat * Math.PI) / 180);
  const zoom = Math.log2((ladoDp * metrosPorDp) / ladoM);
  return Number.isFinite(zoom) ? zoom : null;
}

const limitar = (valor: number, minimo: number, maximo: number) => Math.min(Math.max(valor, minimo), maximo);

export interface FaixaDoRotulo {
  /** Mais longe que isso o rótulo some: os das vizinhas se empilhariam num ponto só */
  zoomMinimo: number;
  /** Deste zoom para dentro o rótulo some: a área já toma a tela (zoom alto) */
  zoomMaximo: number;
}

/**
 * Zooms em que o rótulo da área aparece, pelo tamanho dela na tela: a partir
 * de uns 28 dp (na vista da fazenda inteira as áreas comuns já passam disso;
 * só uma área bem pequena espera chegar mais perto, no máximo até o zoom 16)
 * e até ela ocupar uns 360 dp, a largura da tela.
 */
export function faixaDoRotulo(area: Pick<Talhao, 'areaHectares' | 'centroLat'>): FaixaDoRotulo {
  const longe = zoomComLado(area, LADO_MINIMO_DP);
  const perto = zoomComLado(area, LADO_MAXIMO_DP);
  if (longe === null || perto === null) {
    return { zoomMinimo: ZOOM_TODOS_OS_ROTULOS, zoomMaximo: ZOOM_SOME_SEM_MEDIDA };
  }
  const zoomMinimo = limitar(longe, 0, ZOOM_TODOS_OS_ROTULOS);
  return { zoomMinimo, zoomMaximo: limitar(perto, zoomMinimo, ZOOM_MAXIMO_MAPA) };
}

/**
 * ~1 m. A ocorrência relatada numa área sem GPS ganha o centro dela (ver
 * `ocorrenciaService`); a folga cobre o arredondamento do sync.
 */
const TOLERANCIA_CENTRO_GRAUS = 1e-5;

export interface OcorrenciasNasAreas {
  /** Ocorrências no centro de cada área: presas no canto do rótulo dela, na ordem recebida */
  porArea: Map<string, OcorrenciaNoMapa[]>;
  /** As que têm ponto próprio (ou caem fora de qualquer centro): pino solto no lugar marcado */
  soltas: OcorrenciaNoMapa[];
}

/**
 * Separa as ocorrências que estão no centro de uma área. No centro fica o
 * rótulo: um pino solto ali cobriria o nome e as cabeças (ou o Mapbox
 * esconderia um dos dois), então ele vai preso no canto do rótulo. Fora da
 * faixa de zoom do rótulo (ver `faixaDoRotulo`) ele volta a ser pino no centro.
 */
export function ocorrenciasNosRotulos(
  ocorrencias: readonly OcorrenciaNoMapa[],
  areas: readonly Pick<Talhao, 'id' | 'centroLat' | 'centroLng'>[],
): OcorrenciasNasAreas {
  const porArea = new Map<string, OcorrenciaNoMapa[]>();
  const soltas: OcorrenciaNoMapa[] = [];
  for (const ocorrencia of ocorrencias) {
    const { pontoLat, pontoLng } = ocorrencia;
    const area =
      pontoLat === null || pontoLng === null
        ? undefined
        : areas.find(
            (a) =>
              Math.abs(a.centroLat - pontoLat) <= TOLERANCIA_CENTRO_GRAUS &&
              Math.abs(a.centroLng - pontoLng) <= TOLERANCIA_CENTRO_GRAUS,
          );
    if (!area) {
      soltas.push(ocorrencia);
      continue;
    }
    const daArea = porArea.get(area.id);
    if (daArea) daArea.push(ocorrencia);
    else porArea.set(area.id, [ocorrencia]);
  }
  return { porArea, soltas };
}
