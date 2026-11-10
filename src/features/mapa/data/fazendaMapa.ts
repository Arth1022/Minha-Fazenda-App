import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { db, fazendaConfig } from '@/database';
import { extrairMetadadosEspaciais, pontoDentroDoPoligono, type Coordenada } from '@/utils/geoMath';

/**
 * A fazenda no mapa: nome e divisa (contorno da propriedade inteira). É o
 * primeiro passo do mapa; os talhões são desenhados depois, dentro dela.
 *
 * Persistida na linha única de `fazenda_config` (Drizzle + SQLite) e mantida em
 * memória depois da primeira leitura. Se houver dado legado no `kv-store`, ele é
 * migrado de forma transparente na primeira leitura.
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

const CHAVE_LEGADA = 'mapa.fazenda';

let cache: FazendaMapa | null | undefined;
let bancoCache: unknown;
const ouvintes = new Set<() => void>();

function valida(valor: unknown): valor is FazendaMapa {
  const v = valor as FazendaMapa | null;
  return (
    typeof v?.nome === 'string' &&
    v.nome.trim().length > 0 &&
    Array.isArray(v.divisa) &&
    v.divisa.length >= 4 &&
    typeof v.areaHectares === 'number' &&
    [v.minLat, v.maxLat, v.minLng, v.maxLng].every((n) => typeof n === 'number')
  );
}

/**
 * Faz UPDATE direto na linha única de `fazenda_config`. Se a tabela ainda estiver
 * vazia (primeiro acesso antes do onboarding), insere a linha única.
 */
function persistirNoBanco(fazenda: FazendaMapa): void {
  const campos = {
    nome: fazenda.nome,
    divisaJson: fazenda.divisa,
    areaHectares: fazenda.areaHectares,
    minLat: fazenda.minLat,
    maxLat: fazenda.maxLat,
    minLng: fazenda.minLng,
    maxLng: fazenda.maxLng,
  };

  const atualizado = db
    .update(fazendaConfig)
    .set({ ...campos, updatedAt: new Date() })
    .returning({ id: fazendaConfig.id })
    .get();

  if (!atualizado) {
    db.insert(fazendaConfig)
      .values({ tipoProducao: 'misto', ...campos })
      .run();
  }
}

function lerLegadoKvStore(): FazendaMapa | null {
  try {
    const bruto = Storage.getItemSync(CHAVE_LEGADA);
    const lido: unknown = bruto ? JSON.parse(bruto) : null;
    return valida(lido) ? lido : null;
  } catch {
    return null;
  }
}

export function obterFazendaMapa(): FazendaMapa | null {
  if (bancoCache !== db) {
    cache = undefined;
    bancoCache = db;
  }
  if (cache !== undefined) {
    if (cache !== null) return cache;
    try {
      if (!Storage.getItemSync(CHAVE_LEGADA)) return null;
    } catch {
      return null;
    }
  }

  try {
    const linha = db.select().from(fazendaConfig).limit(1).get();
    const doBanco = linha
      ? {
          nome: linha.nome,
          divisa: linha.divisaJson,
          areaHectares: linha.areaHectares,
          minLat: linha.minLat,
          maxLat: linha.maxLat,
          minLng: linha.minLng,
          maxLng: linha.maxLng,
        }
      : null;

    if (valida(doBanco)) {
      cache = doBanco;
      return cache;
    }

    const legado = lerLegadoKvStore();
    if (legado) {
      persistirNoBanco(legado);
      try {
        Storage.removeItemSync(CHAVE_LEGADA);
      } catch {
        // Ignora falha ao remover chave antiga
      }
      cache = legado;
      return cache;
    }
  } catch {
    // Banco ainda não inicializado
  }

  cache = null;
  return null;
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

  persistirNoBanco(fazenda);
  bancoCache = db;
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
