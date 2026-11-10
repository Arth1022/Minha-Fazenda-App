import { COR_POR_TIPO_AREA, ROTULO_TIPO_AREA } from '@/constants/areas';
import type { Talhao, TipoTalhao } from '@/database';
import { calcularPerimetroM, type Coordenada } from '@/utils/geoMath';
import {
  diasDesdePlantio,
  formatarDistancia,
  formatarHectares,
  ROTULO_CULTURA_LAVOURA,
  ROTULO_FASE_LAVOURA,
} from './calculos';

/**
 * Regras das áreas do mapa (fase 1): o tipo decide as ações e a cor; o estado
 * aparece por selo e contorno. Funções puras — a tela só desenha o resultado.
 */

/** Estado mostrado no mapa: pasto (vem do rebanho) e lavoura (vem da safra). */
export type EstadoArea = 'ocupado' | 'descanso' | 'vazia' | 'plantada' | 'colhida';

/** Área parada no momento: contorno tracejado e preenchimento mais claro. */
const ESTADOS_TRACEJADOS: ReadonlySet<EstadoArea> = new Set<EstadoArea>([
  'descanso',
  'vazia',
  'colhida',
]);

export function contornoTracejado(estado: EstadoArea | null): boolean {
  return estado !== null && ESTADOS_TRACEJADOS.has(estado);
}

export interface SituacaoArea {
  estado: EstadoArea | null;
  /** Texto curto do selo no mapa e no painel (ex.: "Milho · 32 d") */
  selo: string | null;
}

type DadosSafra = Pick<Talhao, 'tipo' | 'cultura' | 'faseLavoura' | 'dataPlantio'>;

/**
 * Situação da área para o selo e o contorno. Lavoura: pela safra registrada
 * (vazia, plantada, colhida). Pasto ocupado/em descanso chega com o rebanho no
 * mapa; até lá, pasto, reserva e outro não têm selo.
 */
export function situacaoDaArea(area: DadosSafra, agora = new Date()): SituacaoArea {
  if (area.tipo !== 'lavoura') return { estado: null, selo: null };
  if (area.faseLavoura === 'pousio') return { estado: 'colhida', selo: 'Colhida' };
  if (area.faseLavoura === 'preparo') return { estado: 'vazia', selo: 'Em preparo' };
  if (!area.cultura) return { estado: 'vazia', selo: 'Vazia' };

  const cultura = ROTULO_CULTURA_LAVOURA[area.cultura] ?? area.cultura;
  if (area.faseLavoura === 'colheita') return { estado: 'plantada', selo: `${cultura} · colher` };
  const dias = diasDesdePlantio(area.dataPlantio, agora);
  return { estado: 'plantada', selo: dias !== null ? `${cultura} · ${dias} d` : cultura };
}

/** "Milho · Vegetativo"; null se a lavoura não tem safra registrada. */
export function descreverSafra(area: DadosSafra): string | null {
  if (area.tipo !== 'lavoura' || (!area.cultura && !area.faseLavoura)) return null;
  return [
    area.cultura ? (ROTULO_CULTURA_LAVOURA[area.cultura] ?? area.cultura) : null,
    area.faseLavoura ? ROTULO_FASE_LAVOURA[area.faseLavoura] : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Ações do painel inferior. As de outros módulos (rebanho, cerca, plantio) chegam nas próximas fases. */
export type AcaoArea = 'safra' | 'pontoAtencao' | 'editar' | 'redesenhar' | 'excluir';

/** O que aparece no painel da área, na ordem: primeiro o do tipo, depois o comum. */
export function acoesDaArea(tipo: TipoTalhao, podeEditarGeometria: boolean): AcaoArea[] {
  const acoes: AcaoArea[] = [];
  if (tipo === 'lavoura') acoes.push('safra');
  acoes.push('pontoAtencao', 'editar');
  // Mexer no polígono é só do admin (RN-012)
  if (podeEditarGeometria) acoes.push('redesenhar', 'excluir');
  return acoes;
}

/**
 * O que deixa de valer ao trocar o tipo da área (RF-006). Vazio: troca sem
 * aviso. Os pontos de atenção e o histórico das máquinas continuam valendo.
 */
export function avisosTrocaDeTipo(area: DadosSafra, novoTipo: TipoTalhao): string[] {
  if (novoTipo === area.tipo) return [];
  const avisos: string[] = [];
  const safra = descreverSafra(area);
  if (safra) avisos.push(`A safra registrada (${safra}) será apagada.`);
  return avisos;
}

/** Perímetro gravado ou, em área antiga ainda sem ele, calculado do contorno. */
export function perimetroDaAreaM(area: Pick<Talhao, 'perimetroM' | 'geometriaJson'>): number {
  if (area.perimetroM !== null) return area.perimetroM;
  return calcularPerimetroM((area.geometriaJson.coordinates[0] ?? []) as Coordenada[]);
}

/** "15,2 ha" e "1,8 km" (ou "420 m"). */
export function medidasDaArea(area: Pick<Talhao, 'areaHectares' | 'perimetroM' | 'geometriaJson'>) {
  return {
    area: formatarHectares(area.areaHectares),
    perimetro: formatarDistancia(perimetroDaAreaM(area) / 1000),
  };
}

/** Linha de detalhe da lista: "Lavoura/Talhão · Milho · 32 d". */
export function detalheDaArea(area: DadosSafra, agora = new Date()): string {
  return [ROTULO_TIPO_AREA[area.tipo], situacaoDaArea(area, agora).selo].filter(Boolean).join(' · ');
}

const OPACIDADE = { normal: 0.4, normalAtiva: 0.6, parada: 0.22, paradaAtiva: 0.42 } as const;

/**
 * GeoJSON da camada de áreas: o polígono (cor do tipo, contorno contínuo ou
 * tracejado), o nome no centro e, quando houver, o selo logo abaixo. O nome e o
 * selo são pontos separados para não depender de quebra de linha no rótulo.
 */
export function colecaoDasAreas(
  areas: Talhao[],
  agora = new Date()
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const area of areas) {
    const { estado, selo } = situacaoDaArea(area, agora);
    const parada = contornoTracejado(estado);
    const centro: GeoJSON.Point = { type: 'Point', coordinates: [area.centroLng, area.centroLat] };
    features.push(
      {
        type: 'Feature',
        id: `poly-${area.id}`,
        properties: {
          camada: 'poligono',
          talhaoId: area.id,
          cor: COR_POR_TIPO_AREA[area.tipo],
          contorno: parada ? 'tracejado' : 'continuo',
          opacidade: parada ? OPACIDADE.parada : OPACIDADE.normal,
          opacidadeAtiva: parada ? OPACIDADE.paradaAtiva : OPACIDADE.normalAtiva,
        },
        geometry: area.geometriaJson,
      },
      {
        type: 'Feature',
        id: `label-${area.id}`,
        properties: { camada: 'label', talhaoId: area.id, nome: area.nome },
        geometry: centro,
      }
    );
    if (selo) {
      features.push({
        type: 'Feature',
        id: `selo-${area.id}`,
        properties: { camada: 'selo', talhaoId: area.id, selo },
        geometry: centro,
      });
    }
  }
  return { type: 'FeatureCollection', features };
}
