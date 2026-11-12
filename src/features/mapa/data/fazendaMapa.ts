import { and, eq, isNull } from 'drizzle-orm';
import { useEffect, useSyncExternalStore } from 'react';

import {
  atualizar,
  daFazenda,
  db,
  fazendaConfig,
  fazendaDoContexto,
  fazendas,
  novoRegistro,
  powersync,
} from '@/database';
import { extrairMetadadosEspaciais, pontoDentroDoPoligono, type Coordenada } from '@/utils/geoMath';

/**
 * A fazenda no mapa: nome e divisa (contorno da propriedade inteira). É o
 * primeiro passo do mapa; os talhões são desenhados depois, dentro dela.
 *
 * A divisa fica na linha da fazenda ativa em `fazenda_config` (id = id da
 * fazenda) e o nome vem de `fazendas`. Fica em memória depois da primeira
 * leitura e é relida quando o banco muda (inclusive pelo sync).
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

const TABELAS = ['fazenda_config', 'fazendas'];

let cache: { fazendaId: string; valor: FazendaMapa | null } | null = null;
let leitura: { fazendaId: string; promessa: Promise<FazendaMapa | null> } | null = null;
const ouvintes = new Set<() => void>();

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

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

async function lerDoBanco(fazendaId: string): Promise<FazendaMapa | null> {
  const [config] = await db
    .select()
    .from(fazendaConfig)
    .where(and(daFazenda(fazendaConfig), eq(fazendaConfig.id, fazendaId)))
    .limit(1);
  const [fazenda] = await db
    .select({ nome: fazendas.nome })
    .from(fazendas)
    .where(and(eq(fazendas.id, fazendaId), isNull(fazendas.deletedAt)))
    .limit(1);
  const lida = config
    ? {
        nome: fazenda?.nome ?? '',
        divisa: config.divisaJson,
        areaHectares: config.areaHectares,
        minLat: config.minLat,
        maxLat: config.maxLat,
        minLng: config.minLng,
        maxLng: config.maxLng,
      }
    : null;
  return valida(lida) ? lida : null;
}

/**
 * Lê do banco a fazenda ativa e guarda em memória (para quem não é tela, ex.: o
 * GPS). `reler`: o banco mudou, não aproveita uma leitura em andamento.
 */
export function carregarFazendaMapa(reler = false): Promise<FazendaMapa | null> {
  const fazendaId = fazendaDoContexto();
  if (!fazendaId) return Promise.resolve(null);
  if (!reler && leitura?.fazendaId === fazendaId) return leitura.promessa;
  const promessa = lerDoBanco(fazendaId)
    .catch(() => null)
    .then((valor) => {
      if (leitura?.promessa === promessa) leitura = null;
      if (fazendaDoContexto() === fazendaId) {
        cache = { fazendaId, valor };
        avisar();
      }
      return valor;
    });
  leitura = { fazendaId, promessa };
  return promessa;
}

/** Fazenda ativa no mapa, da memória; na primeira chamada começa a leitura e devolve null. */
export function obterFazendaMapa(): FazendaMapa | null {
  const fazendaId = fazendaDoContexto();
  if (!fazendaId) return null;
  if (cache?.fazendaId === fazendaId) return cache.valor;
  void carregarFazendaMapa();
  return null;
}

/**
 * Grava (ou redesenha) a divisa da fazenda ativa. Lança erro se as linhas se
 * cruzarem. O nome é o da fazenda (muda só pela edição da fazenda, online).
 */
export async function salvarFazendaMapa(pontos: Coordenada[]): Promise<FazendaMapa> {
  const fazendaId = fazendaDoContexto();
  if (!fazendaId) throw new Error('Nenhuma fazenda aberta.');

  const meta = extrairMetadadosEspaciais(pontos);
  const campos = {
    divisaJson: meta.geometriaJson.coordinates[0] as Coordenada[],
    areaHectares: meta.areaHectares,
    minLat: meta.minLat,
    maxLat: meta.maxLat,
    minLng: meta.minLng,
    maxLng: meta.maxLng,
  };

  await db.transaction(async (tx) => {
    const [existente] = await tx
      .select({ id: fazendaConfig.id })
      .from(fazendaConfig)
      .where(eq(fazendaConfig.id, fazendaId))
      .limit(1);
    if (existente) {
      await tx
        .update(fazendaConfig)
        .set(atualizar(campos))
        .where(eq(fazendaConfig.id, fazendaId));
    } else {
      await tx.insert(fazendaConfig).values(novoRegistro({ id: fazendaId, tipoProducao: 'misto' as const, ...campos }));
    }
  });

  const [fazenda] = await db.select({ nome: fazendas.nome }).from(fazendas).where(eq(fazendas.id, fazendaId)).limit(1);
  const salva: FazendaMapa = {
    nome: fazenda?.nome ?? '',
    divisa: campos.divisaJson,
    areaHectares: campos.areaHectares,
    minLat: campos.minLat,
    maxLat: campos.maxLat,
    minLng: campos.minLng,
    maxLng: campos.maxLng,
  };
  cache = { fazendaId, valor: salva };
  avisar();
  return salva;
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

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** Fazenda salva no mapa (ou null); a tela re-renderiza quando ela muda (aqui ou pelo sync). */
export function useFazendaMapa(): FazendaMapa | null {
  useEffect(
    () =>
      powersync.onChangeWithCallback(
        { onChange: () => void carregarFazendaMapa(true) },
        { tables: TABELAS, throttleMs: 100 }
      ),
    []
  );
  return useSyncExternalStore(inscrever, obterFazendaMapa);
}
