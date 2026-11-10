/**
 * Geometria do rastro, sem dependências: distância entre pontos, ponto dentro de
 * talhão e simplificação da linha. Coordenadas em graus (lat/lng).
 */

const RAIO_TERRA_M = 6_371_000;
const rad = (graus: number) => (graus * Math.PI) / 180;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Distância em metros (haversine): boa para os poucos metros entre pontos de GPS. */
export function distanciaM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Caixa {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Polígono do talhão: anel externo em [lng, lat] (GeoJSON) e a caixa para filtrar rápido. */
export interface Poligono {
  anel: number[][];
  caixa: Caixa;
}

function dentroDaCaixa(p: LatLng, c: Caixa): boolean {
  return p.lat >= c.minLat && p.lat <= c.maxLat && p.lng >= c.minLng && p.lng <= c.maxLng;
}

/** Ponto dentro do polígono (raio cruzando as arestas). */
export function dentroDoPoligono(p: LatLng, { anel, caixa }: Poligono): boolean {
  if (!dentroDaCaixa(p, caixa)) return false;
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    const cruza = yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

/** Projeção local em metros (boa para a área de uma fazenda). */
function emMetros(p: LatLng, origem: LatLng): [number, number] {
  return [
    rad(p.lng - origem.lng) * RAIO_TERRA_M * Math.cos(rad(origem.lat)),
    rad(p.lat - origem.lat) * RAIO_TERRA_M,
  ];
}

function distanciaAoSegmento(p: [number, number], a: [number, number], b: [number, number]): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const comprimento2 = dx * dx + dy * dy;
  const t = comprimento2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / comprimento2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Simplifica a linha (Douglas-Peucker): tira os pontos que quase não mudam o
 * desenho (reta), mantendo o formato com erro de até `toleranciaM` metros.
 */
export function simplificarLinha<T extends LatLng>(pontos: T[], toleranciaM: number): T[] {
  if (pontos.length <= 2) return pontos;
  const origem = pontos[0];
  const xy = pontos.map((p) => emMetros(p, origem));
  const manter = new Array<boolean>(pontos.length).fill(false);
  manter[0] = true;
  manter[pontos.length - 1] = true;
  // Pilha em vez de recursão: rastro longo não estoura a pilha
  const pilha: [number, number][] = [[0, pontos.length - 1]];
  while (pilha.length > 0) {
    const [de, ate] = pilha.pop()!;
    let maior = 0;
    let indice = -1;
    for (let i = de + 1; i < ate; i++) {
      const d = distanciaAoSegmento(xy[i], xy[de], xy[ate]);
      if (d > maior) {
        maior = d;
        indice = i;
      }
    }
    if (indice !== -1 && maior > toleranciaM) {
      manter[indice] = true;
      pilha.push([de, indice], [indice, ate]);
    }
  }
  return pontos.filter((_, i) => manter[i]);
}
