import { area } from '@turf/area';
import { bbox } from '@turf/bbox';
import { centroid } from '@turf/centroid';
import { polygon } from '@turf/helpers';
import { kinks } from '@turf/kinks';

import type { GeometriaPoligono } from '@/database';

/** Coordenada GeoJSON no padrão [longitude, latitude]. */
export type Coordenada = [number, number];

export interface ValidacaoPoligono {
  isValid: boolean;
  error?: string;
}

export interface MetadadosEspaciais {
  geometriaJson: GeometriaPoligono;
  areaHectares: number;
  /** Perímetro geodésico do anel fechado, em metros inteiros */
  perimetroM: number;
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

const RAIO_TERRA_KM = 6371.0088;
const paraRad = (graus: number) => (graus * Math.PI) / 180;

/** Soma geodésica (Haversine) dos lados, sem arredondar; fecha o anel a partir de 3 pontos. */
function somarLadosKm(coordenadas: Coordenada[]): number {
  if (coordenadas.length < 2) return 0;
  const anel =
    coordenadas.length >= 3 ? fecharAnelLinear(coordenadas) : coordenadas;
  let totalKm = 0;

  for (let i = 0; i < anel.length - 1; i++) {
    const [lng1, lat1] = anel[i];
    const [lng2, lat2] = anel[i + 1];
    const dLat = paraRad(lat2 - lat1);
    const dLng = paraRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(paraRad(lat1)) *
        Math.cos(paraRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    totalKm += 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(a));
  }
  return totalKm;
}

/** Calcula o perímetro geodésico (Haversine) do anel fechado em quilômetros com 2 casas decimais. */
export function calcularPerimetroKm(coordenadas: Coordenada[]): number {
  return Number(somarLadosKm(coordenadas).toFixed(2));
}

/** Perímetro geodésico do anel fechado em metros inteiros (o que a cerca precisa). */
export function calcularPerimetroM(coordenadas: Coordenada[]): number {
  return Math.round(somarLadosKm(coordenadas) * 1000);
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
    perimetroM: calcularPerimetroM(anel),
    centroLat,
    centroLng,
    minLat,
    maxLat,
    minLng,
    maxLng,
  };
}

/**
 * Diz se o ponto está dentro do polígono (ray casting no plano lng/lat). Serve para
 * conferir se os cantos de um talhão ficam dentro da divisa da fazenda; em áreas
 * do tamanho de uma fazenda a curvatura da Terra não muda o resultado.
 */
export function pontoDentroDoPoligono(ponto: Coordenada, poligono: Coordenada[]): boolean {
  const [x, y] = ponto;
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    const cruza = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

/**
 * Cantos do contorno: vértices onde o rumo vira pelo menos `anguloMinimo`
 * graus (onde a cerca precisa de esticador). Um ponto tocado no meio de um
 * lado reto não conta. Plano local com a longitude encolhida por cos(lat).
 */
export function contarCantos(coordenadas: Coordenada[], anguloMinimo = 30): number {
  const pontos = fecharAnelLinear(coordenadas).slice(0, -1);
  const n = pontos.length;
  if (n < 3) return 0;
  const escala = Math.cos(paraRad(pontos.reduce((soma, p) => soma + p[1], 0) / n));
  const rumo = (de: Coordenada, para: Coordenada) =>
    Math.atan2(para[1] - de[1], (para[0] - de[0]) * escala);
  let cantos = 0;
  for (let i = 0; i < n; i++) {
    const anterior = pontos[(i - 1 + n) % n];
    const atual = pontos[i];
    const proximo = pontos[(i + 1) % n];
    let giro = (Math.abs(rumo(atual, proximo) - rumo(anterior, atual)) * 180) / Math.PI;
    if (giro > 180) giro = 360 - giro;
    if (giro >= anguloMinimo) cantos += 1;
  }
  return cantos;
}
