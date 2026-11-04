import { area } from '@turf/area';
import { bbox } from '@turf/bbox';
import { centroid } from '@turf/centroid';
import { polygon } from '@turf/helpers';
import { kinks } from '@turf/kinks';

import type { GeometriaPoligono } from '@/database/schema';

/** Coordenada GeoJSON no padrão [longitude, latitude]. */
export type Coordenada = [number, number];

export interface ValidacaoPoligono {
  isValid: boolean;
  error?: string;
}

export interface MetadadosEspaciais {
  geometriaJson: GeometriaPoligono;
  areaHectares: number;
  centroLat: number;
  centroLng: number;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Garante que o último ponto do anel seja idêntico ao primeiro, exigência do GeoJSON Polygon. */
export function fecharAnelLinear(coordenadas: Coordenada[]): Coordenada[] {
  if (coordenadas.length === 0) return [];
  const primeiro = coordenadas[0];
  const ultimo = coordenadas[coordenadas.length - 1];
  if (
    coordenadas.length > 1 &&
    primeiro[0] === ultimo[0] &&
    primeiro[1] === ultimo[1]
  ) {
    return [...coordenadas];
  }
  return [...coordenadas, [primeiro[0], primeiro[1]]];
}

/** Calcula a área geodésica em hectares (m² / 10.000) com 2 casas decimais. */
export function calcularAreaHectares(coordenadas: Coordenada[]): number {
  const anel = fecharAnelLinear(coordenadas);
  if (anel.length < 4) return 0;

  const metrosQuadrados = area(polygon([anel]));
  return Number((metrosQuadrados / 10000).toFixed(2));
}

/** Valida se o polígono possui vértices suficientes e não apresenta linhas cruzadas (autointerseção). */
export function validarPoligono(coordenadas: Coordenada[]): ValidacaoPoligono {
  const anel = fecharAnelLinear(coordenadas);
  if (anel.length < 4) {
    return {
      isValid: false,
      error: 'O talhão precisa de pelo menos 3 vértices.',
    };
  }

  const intersecoes = kinks(polygon([anel]));
  if (intersecoes.features.length > 0) {
    return {
      isValid: false,
      error: 'As linhas do talhão não podem se cruzar.',
    };
  }

  return { isValid: true };
}

/** Extrai o GeoJSON fechado, área em hectares, centróide e Bounding Box (BBOX) para indexação no SQLite. */
export function extrairMetadadosEspaciais(
  coordenadas: Coordenada[],
): MetadadosEspaciais {
  const validacao = validarPoligono(coordenadas);
  if (!validacao.isValid) {
    throw new Error(validacao.error);
  }

  const anel = fecharAnelLinear(coordenadas);
  const poly = polygon([anel]);
  const [minLng, minLat, maxLng, maxLat] = bbox(poly);
  const [centroLng, centroLat] = centroid(poly).geometry.coordinates;

  return {
    geometriaJson: {
      type: 'Polygon',
      coordinates: [anel],
    },
    areaHectares: calcularAreaHectares(anel),
    centroLat,
    centroLng,
    minLat,
    maxLat,
    minLng,
    maxLng,
  };
}
