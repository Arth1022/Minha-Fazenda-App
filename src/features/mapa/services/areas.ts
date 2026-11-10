import type { ItemConfirmacao } from '@/components/ui/ConfirmacaoSheet';
import { COR_POR_TIPO_AREA, ROTULO_CURTO_TIPO_AREA, ROTULO_TIPO_AREA } from '@/constants/areas';
import type { Talhao, TipoTalhao } from '@/database';
import { normalizarTexto } from '@/utils/formatters';
import { calcularPerimetroM, type Coordenada } from '@/utils/geoMath';
import {
  diasDesdePlantio,
  formatarDistancia,
  formatarHectares,
  ROTULO_CULTURA_LAVOURA,
  ROTULO_FASE_LAVOURA,
} from './calculos';

/**
 * Regras das áreas do mapa (fase 1): o tipo decide a cor e o que o painel
 * mostra; o estado aparece no rótulo, no selo do painel e no contorno.
 * Funções puras — a tela só desenha o resultado.
 */

/** Estado mostrado no mapa: pasto (vem do rebanho) e lavoura (vem da safra). */
export type EstadoArea = 'ocupado' | 'descanso' | 'vazia' | 'plantada' | 'colhida';

/** Selo ao lado do nome, no painel da área */
export const ROTULO_ESTADO_AREA: Record<EstadoArea, string> = {
  ocupado: 'Ocupado',
  descanso: 'Descanso',
  vazia: 'Vazia',
  plantada: 'Plantada',
  colhida: 'Colhida',
};

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
  /** Segunda linha do rótulo no mapa (ex.: "Milho", "Vazia", "APP"); null mostra só o nome */
  legenda: string | null;
}

type DadosSafra = Pick<Talhao, 'tipo' | 'cultura' | 'faseLavoura' | 'dataPlantio'>;

/**
 * Situação da área para o rótulo, o selo e o contorno. Lavoura: pela safra
 * registrada (vazia, plantada, colhida). Pasto ocupado/em descanso chega com o
 * rebanho no mapa; reserva mostra "APP"; outro, só o nome.
 */
export function situacaoDaArea(area: DadosSafra): SituacaoArea {
  if (area.tipo === 'reserva') return { estado: null, legenda: 'APP' };
  if (area.tipo !== 'lavoura') return { estado: null, legenda: null };
  if (area.faseLavoura === 'pousio') return { estado: 'colhida', legenda: 'Colhida' };
  if (area.faseLavoura === 'preparo') return { estado: 'vazia', legenda: 'Em preparo' };
  if (!area.cultura) return { estado: 'vazia', legenda: 'Vazia' };
  return { estado: 'plantada', legenda: ROTULO_CULTURA_LAVOURA[area.cultura] ?? area.cultura };
}

export interface SafraResumo {
  cultura: string;
  /** Fase só quando diz mais que o selo (ex.: "Pronta p/ colher"; "Plantada" já está no selo) */
  fase: string | null;
  /** Dias desde o plantio (só plantada ou pronta para colher) */
  dias: number | null;
}

/** Card da safra no painel da lavoura; null se não há safra registrada. */
export function resumoDaSafra(area: DadosSafra, agora = new Date()): SafraResumo | null {
  if (area.tipo !== 'lavoura' || !area.cultura) return null;
  const { estado } = situacaoDaArea(area);
  const fase = area.faseLavoura ? ROTULO_FASE_LAVOURA[area.faseLavoura] : null;
  return {
    cultura: ROTULO_CULTURA_LAVOURA[area.cultura] ?? area.cultura,
    fase: fase && estado && fase === ROTULO_ESTADO_AREA[estado] ? null : fase,
    dias: diasDesdePlantio(area.dataPlantio, agora),
  };
}

/** "Milho · Plantada"; null se a lavoura não tem safra registrada. */
export function descreverSafra(area: DadosSafra): string | null {
  if (area.tipo !== 'lavoura' || (!area.cultura && !area.faseLavoura)) return null;
  return [
    area.cultura ? (ROTULO_CULTURA_LAVOURA[area.cultura] ?? area.cultura) : null,
    area.faseLavoura ? ROTULO_FASE_LAVOURA[area.faseLavoura] : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Itens do menu "⋮" do painel. */
export type OpcaoArea = 'editar' | 'redesenhar' | 'pontoAtencao' | 'excluir';

/** Mexer no polígono (redesenhar, excluir) é só do admin (RN-012). */
export function opcoesDaArea(podeEditarGeometria: boolean): OpcaoArea[] {
  return podeEditarGeometria
    ? ['editar', 'redesenhar', 'pontoAtencao', 'excluir']
    : ['editar', 'pontoAtencao'];
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

/**
 * "Redesenhar Pasto 1?" (RF-008): o que muda e o que continua. Lotação, cerca e
 * ciclo entram aqui quando esses módulos chegarem ao mapa.
 */
export function consequenciasRedesenho(): ItemConfirmacao[] {
  return [{ icone: 'check', texto: 'Nome, tipo e histórico continuam', tom: 'ok' }];
}

/** "Excluir Pasto 1?": os pontos de atenção saem junto; o registro fica guardado. */
export function consequenciasExclusao(pontosAbertos: number): ItemConfirmacao[] {
  const itens: ItemConfirmacao[] = [];
  if (pontosAbertos === 1) {
    itens.push({ icone: 'mapPin', texto: 'O ponto de atenção marcado nela sai do mapa' });
  } else if (pontosAbertos > 1) {
    itens.push({ icone: 'mapPin', texto: `Os ${pontosAbertos} pontos de atenção marcados nela saem do mapa` });
  }
  itens.push({ icone: 'check', texto: 'O histórico fica guardado', tom: 'ok' });
  return itens;
}

/** Perímetro gravado ou, em área antiga ainda sem ele, calculado do contorno. */
export function perimetroDaAreaM(area: Pick<Talhao, 'perimetroM' | 'geometriaJson'>): number {
  if (area.perimetroM !== null) return area.perimetroM;
  return calcularPerimetroM((area.geometriaJson.coordinates[0] ?? []) as Coordenada[]);
}

type AreaMedida = Pick<Talhao, 'tipo' | 'areaHectares' | 'perimetroM' | 'geometriaJson'>;

/** "Pasto · 28,4 ha · 2,14 km" (abaixo do nome, no painel). */
export function resumoDaArea(area: AreaMedida): string {
  return [
    ROTULO_CURTO_TIPO_AREA[area.tipo],
    formatarHectares(area.areaHectares),
    formatarDistancia(perimetroDaAreaM(area) / 1000),
  ].join(' · ');
}

/** Linha de detalhe da lista: "Lavoura · Milho". */
export function detalheDaArea(area: DadosSafra): string {
  return [ROTULO_CURTO_TIPO_AREA[area.tipo], situacaoDaArea(area).legenda]
    .filter(Boolean)
    .join(' · ');
}

/** 0 = mais provável; null = não combina com o termo. */
function relevancia(area: Pick<Talhao, 'nome' | 'tipo'>, termo: string): number | null {
  const nome = normalizarTexto(area.nome);
  if (nome === termo) return 0;
  if (nome.startsWith(termo)) return 1;
  if (nome.includes(termo)) return 2;
  if (normalizarTexto(ROTULO_TIPO_AREA[area.tipo]).includes(termo)) return 3;
  return null;
}

/**
 * Áreas que combinam com o termo pelo nome ou pelo tipo (sem diferenciar acento
 * e maiúscula), as mais prováveis primeiro. Sem termo, não sugere nada.
 */
export function buscarAreas<T extends Pick<Talhao, 'nome' | 'tipo'>>(areas: T[], termo: string): T[] {
  const alvo = normalizarTexto(termo);
  if (!alvo) return [];
  return areas
    .map((area, ordem) => ({ area, ordem, nota: relevancia(area, alvo) }))
    .filter((item): item is { area: T; ordem: number; nota: number } => item.nota !== null)
    .sort((a, b) => a.nota - b.nota || a.ordem - b.ordem)
    .map(({ area }) => area);
}

const OPACIDADE = { normal: 0.35, normalAtiva: 0.55, parada: 0.14, paradaAtiva: 0.3 } as const;

/**
 * GeoJSON dos polígonos das áreas: cor do tipo, contorno contínuo (em uso) ou
 * tracejado (parada) e a opacidade de cada um. Os rótulos ficam fora (MarkerView).
 */
export function colecaoDasAreas(areas: Talhao[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: areas.map((area): GeoJSON.Feature => {
      const parada = contornoTracejado(situacaoDaArea(area).estado);
      return {
        type: 'Feature',
        id: `poly-${area.id}`,
        properties: {
          talhaoId: area.id,
          cor: COR_POR_TIPO_AREA[area.tipo],
          contorno: parada ? 'tracejado' : 'continuo',
          opacidade: parada ? OPACIDADE.parada : OPACIDADE.normal,
          opacidadeAtiva: parada ? OPACIDADE.paradaAtiva : OPACIDADE.normalAtiva,
        },
        geometry: area.geometriaJson,
      };
    }),
  };
}
