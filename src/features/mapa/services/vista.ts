import type { Talhao } from '@/database';
import { VISTA_BRASIL, type VistaMapa } from '../components/MapaBase';
import type { FazendaMapa } from '../data/fazendaMapa';
import { formatarHectares } from './calculos';

/**
 * Onde o mapa abre: enquadrando a divisa da fazenda; sem ela, os talhões (pela
 * BBOX já gravada em cada um, sem ler o GeoJSON); senão, o Brasil inteiro.
 */
export function vistaDaFazenda(fazenda: FazendaMapa | null, talhoes: Talhao[]): VistaMapa {
  if (fazenda) {
    return {
      tipo: 'area',
      ne: [fazenda.maxLng, fazenda.maxLat],
      sw: [fazenda.minLng, fazenda.minLat],
    };
  }
  if (talhoes.length === 0) return VISTA_BRASIL;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const t of talhoes) {
    minLat = Math.min(minLat, t.minLat);
    maxLat = Math.max(maxLat, t.maxLat);
    minLng = Math.min(minLng, t.minLng);
    maxLng = Math.max(maxLng, t.maxLng);
  }
  return { tipo: 'area', ne: [maxLng, maxLat], sw: [minLng, minLat] };
}

/** Legenda abaixo do título: "Fazenda X · 120 ha · 3 talhões". */
export function resumoFazenda(fazenda: FazendaMapa | null, talhoes: Talhao[]): string {
  const qtd =
    talhoes.length === 0
      ? 'nenhum talhão'
      : `${talhoes.length} ${talhoes.length === 1 ? 'talhão' : 'talhões'}`;
  if (!fazenda) return `divisa não marcada · ${qtd}`;
  return `${fazenda.nome} · ${formatarHectares(fazenda.areaHectares)} · ${qtd}`;
}
