import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { extrairMetadadosEspaciais, pontoDentroDoPoligono, type Coordenada } from '@/utils/geoMath';

/**
 * A fazenda no mapa: nome e divisa (contorno da propriedade inteira). É o
 * primeiro passo do mapa; os talhões são desenhados depois, dentro dela.
 *
 * Um único registro pequeno, guardado no armazenamento chave-valor do
 * expo-sqlite (sem tabela nem migração) e mantido em memória depois da primeira
 * leitura. A BBOX fica gravada junto para enquadrar o mapa sem recalcular.
 */
export interface FazendaMapa {
  nome: string;
  /** Anel fechado da divisa, em [lng, lat] */
  divisa: Coordenada[];
  areaHectares: number;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const CHAVE = 'mapa.fazenda';

let cache: FazendaMapa | null | undefined;
const ouvintes = new Set<() => void>();

function valida(valor: unknown): valor is FazendaMapa {
  const v = valor as FazendaMapa | null;
  return (
    typeof v?.nome === 'string' &&
    Array.isArray(v.divisa) &&
    v.divisa.length >= 4 &&
    typeof v.areaHectares === 'number' &&
    [v.minLat, v.maxLat, v.minLng, v.maxLng].every((n) => typeof n === 'number')
  );
}

export function obterFazendaMapa(): FazendaMapa | null {
  if (cache !== undefined) return cache;
  try {
    const bruto = Storage.getItemSync(CHAVE);
    const lido: unknown = bruto ? JSON.parse(bruto) : null;
    cache = valida(lido) ? lido : null;
  } catch {
    cache = null;
  }
  return cache;
}

/** Grava (ou redesenha) a divisa da fazenda. Lança erro se as linhas se cruzarem. */
export function salvarFazendaMapa(nome: string, pontos: Coordenada[]): FazendaMapa {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) throw new Error('Dê um nome à fazenda.');

  const meta = extrairMetadadosEspaciais(pontos);
  const fazenda: FazendaMapa = {
    nome: nomeLimpo,
    divisa: meta.geometriaJson.coordinates[0] as Coordenada[],
    areaHectares: meta.areaHectares,
    minLat: meta.minLat,
    maxLat: meta.maxLat,
    minLng: meta.minLng,
    maxLng: meta.maxLng,
  };

  Storage.setItemSync(CHAVE, JSON.stringify(fazenda));
  cache = fazenda;
  ouvintes.forEach((avisar) => avisar());
  return fazenda;
}

/** Cantos que caem fora da divisa (testa a BBOX antes, que é barata). */
export function pontosForaDaFazenda(fazenda: FazendaMapa, pontos: Coordenada[]): number {
  return pontos.filter(
    ([lng, lat]) =>
      lat < fazenda.minLat ||
      lat > fazenda.maxLat ||
      lng < fazenda.minLng ||
      lng > fazenda.maxLng ||
      !pontoDentroDoPoligono([lng, lat], fazenda.divisa),
  ).length;
}

function inscrever(avisar: () => void) {
  ouvintes.add(avisar);
  return () => {
    ouvintes.delete(avisar);
  };
}

/** Fazenda salva no mapa (ou null); a tela re-renderiza quando ela muda. */
export function useFazendaMapa(): FazendaMapa | null {
  return useSyncExternalStore(inscrever, obterFazendaMapa);
}
