import * as Location from 'expo-location';

import { MAPBOX_PUBLIC_TOKEN } from '@/constants/mapbox';
import type { Coordenada } from '@/utils/geoMath';

export interface ResultadoBusca {
  id: string;
  nome: string;
  detalhe: string | null;
  coordenada: Coordenada;
}

const LIMITE_RESULTADOS = 5;
const TEMPO_LIMITE_MS = 8000;

/**
 * Reconhece "lat, lng" digitado ou colado do Google Maps ("-15.78, -47.93",
 * "-15,78 -47,93"). Devolve [lng, lat], a ordem usada pelo Mapbox, ou null.
 */
export function interpretarCoordenada(texto: string): Coordenada | null {
  const casou = texto
    .trim()
    .match(/^(-?\d{1,3}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/);
  if (!casou) return null;
  const lat = Number(casou[1].replace(',', '.'));
  const lng = Number(casou[2].replace(',', '.'));
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lng, lat];
}

interface FeatureGeocodificacao {
  id?: string;
  geometry?: { coordinates?: number[] };
  properties?: { name?: string; full_address?: string; place_formatted?: string };
}

async function buscarNoMapbox(texto: string): Promise<ResultadoBusca[]> {
  const url =
    'https://api.mapbox.com/search/geocode/v6/forward' +
    `?q=${encodeURIComponent(texto)}&country=br&language=pt&limit=${LIMITE_RESULTADOS}` +
    `&access_token=${MAPBOX_PUBLIC_TOKEN}`;

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(url, { signal: controle.signal });
    if (!resposta.ok) throw new Error(`Busca falhou (${resposta.status})`);
    const json = (await resposta.json()) as { features?: FeatureGeocodificacao[] };

    return (json.features ?? []).flatMap((f, indice): ResultadoBusca[] => {
      const [lng, lat] = f.geometry?.coordinates ?? [];
      if (typeof lng !== 'number' || typeof lat !== 'number') return [];
      return [
        {
          id: f.id ?? `mapbox-${indice}`,
          nome: f.properties?.name ?? texto,
          detalhe: f.properties?.place_formatted ?? f.properties?.full_address ?? null,
          coordenada: [lng, lat],
        },
      ];
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Geocodificação do aparelho: só usada se o Mapbox não responder. */
async function buscarNoAparelho(texto: string): Promise<ResultadoBusca[]> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) return [];
  const locais = await Location.geocodeAsync(texto);
  return locais.slice(0, LIMITE_RESULTADOS).map((l, indice) => ({
    id: `aparelho-${indice}`,
    nome: texto,
    detalhe: `${l.latitude.toFixed(5)}, ${l.longitude.toFixed(5)}`,
    coordenada: [l.longitude, l.latitude],
  }));
}

/** Busca por cidade, endereço ou coordenada. Lança erro só se nada funcionar (ex.: sem internet). */
export async function buscarLocais(texto: string): Promise<ResultadoBusca[]> {
  const termo = texto.trim();
  if (!termo) return [];

  const coordenada = interpretarCoordenada(termo);
  if (coordenada) {
    return [
      {
        id: 'coordenada',
        nome: 'Coordenada digitada',
        detalhe: `${coordenada[1]}, ${coordenada[0]}`,
        coordenada,
      },
    ];
  }

  try {
    return await buscarNoMapbox(termo);
  } catch {
    return buscarNoAparelho(termo);
  }
}
