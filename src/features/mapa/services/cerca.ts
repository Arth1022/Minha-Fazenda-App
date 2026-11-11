import type { CalculoCerca } from '@/database';
import {
  calcularCerca,
  formatarNumero,
  METROS_POR_ROLO,
  TIPOS_CERCA,
  type TipoCerca,
} from './calculos';

/**
 * Cerca da área (M3, protótipo tela 21): perímetro da área × fios → arame e
 * rolos; um mourão a cada espaçamento; um esticador por fio em cada canto; e o
 * custo quando há preço. Funções puras.
 */

export interface PrecosCerca {
  /** R$ por rolo de arame */
  rolo: number | null;
  /** R$ por mourão */
  mourao: number | null;
  /** R$ por esticador */
  esticador: number | null;
}

export interface ContaCerca {
  fios: number;
  metrosArame: number;
  rolos: number;
  mouroes: number;
  esticadores: number;
  /** null sem nenhum preço informado */
  custo: number | null;
}

/** Soma o que tem preço; sem nenhum preço, não há custo. */
export function custoDaCerca(
  quantidades: Pick<ContaCerca, 'rolos' | 'mouroes' | 'esticadores'>,
  precos: PrecosCerca | null
): number | null {
  if (!precos) return null;
  const partes: [number, number | null][] = [
    [quantidades.rolos, precos.rolo],
    [quantidades.mouroes, precos.mourao],
    [quantidades.esticadores, precos.esticador],
  ];
  const comPreco = partes.filter((parte): parte is [number, number] => parte[1] !== null && parte[1] > 0);
  if (comPreco.length === 0) return null;
  return Math.round(comPreco.reduce((soma, [qtd, preco]) => soma + qtd * preco, 0) * 100) / 100;
}

/** A conta da cerca a partir do perímetro (m) e dos cantos da área. */
export function calcularCercaDaArea(
  perimetroM: number,
  cantos: number,
  tipo: TipoCerca,
  espacamentoM: number,
  precos: PrecosCerca | null = null
): ContaCerca {
  const fios = TIPOS_CERCA[tipo].fios;
  const { metrosArame, rolos, mouroes } = calcularCerca(perimetroM / 1000, fios, espacamentoM);
  // Um esticador por fio em cada canto (contorno sem canto: pelo menos no começo da cerca)
  const esticadores = perimetroM > 0 ? fios * Math.max(1, cantos) : 0;
  return {
    fios,
    metrosArame,
    rolos,
    mouroes,
    esticadores,
    custo: custoDaCerca({ rolos, mouroes, esticadores }, precos),
  };
}

/** "10.700 m · rolos de 500 m" */
export function detalheDoArame(metrosArame: number): string {
  return `${formatarNumero(metrosArame, 0)} m · rolos de ${METROS_POR_ROLO} m`;
}

/** "5 fios × 4 cantos" */
export function detalheDosEsticadores(fios: number, cantos: number): string {
  const nCantos = Math.max(1, cantos);
  return `${fios === 1 ? '1 fio' : `${fios} fios`} × ${nCantos === 1 ? '1 canto' : `${nCantos} cantos`}`;
}

/** Linha "Cerca" do painel: "22 rolos · 715 mourões". */
export function resumoDaCerca(calculo: Pick<CalculoCerca, 'rolos' | 'mouroes'>): string {
  return `${calculo.rolos === 1 ? '1 rolo' : `${calculo.rolos} rolos`} · ${
    calculo.mouroes === 1 ? '1 mourão' : `${calculo.mouroes} mourões`
  }`;
}
