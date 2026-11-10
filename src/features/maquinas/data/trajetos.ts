import { and, desc, eq, gte, isNotNull, lt, sql } from 'drizzle-orm';

import { db, maquinas, pontosGps, talhoes, usosArea, usosMaquina } from '@/database';
import type { Maquina, UsoMaquina } from '@/dtos';
import type { TipoTalhao } from '@/database';

/**
 * Trajetos das máquinas para o mapa (M5): os usos com rastro de um período, um
 * uso inteiro com o tempo em cada área, os usos que passaram numa área e a
 * última posição conhecida de cada máquina. Consultas pelos índices de início.
 */

/** O que a camada Trajetos desenha e lista de cada uso. */
const camposTrajeto = {
  id: usosMaquina.id,
  maquinaId: usosMaquina.maquinaId,
  maquinaNome: maquinas.nome,
  operador: usosMaquina.operador,
  inicio: usosMaquina.inicio,
  fim: usosMaquina.fim,
  kmTotal: usosMaquina.kmTotal,
  rastro: usosMaquina.rastro,
};

/** Trajetos (usos encerrados com rastro) que começaram no período, do mais recente (RF-060/RF-061). */
export function trajetosDoPeriodo(desde: Date, ate: Date) {
  return db
    .select(camposTrajeto)
    .from(usosMaquina)
    .innerJoin(maquinas, eq(maquinas.id, usosMaquina.maquinaId))
    .where(
      and(
        gte(usosMaquina.inicio, desde),
        lt(usosMaquina.inicio, ate),
        isNotNull(usosMaquina.fim),
        isNotNull(usosMaquina.rastro)
      )
    )
    .orderBy(desc(usosMaquina.inicio));
}
export type TrajetoDoPeriodo = Awaited<ReturnType<typeof trajetosDoPeriodo>>[number];
export const TABELAS_TRAJETOS = ['usos_maquina', 'maquinas'] as const;

export interface AreaDaSessao {
  areaId: string;
  nome: string;
  tipo: TipoTalhao;
  segundos: number;
  km: number;
}

export interface SessaoCompleta {
  uso: UsoMaquina;
  maquina: Maquina;
  implemento: Maquina | null;
  /** Tempo e KM em cada área, da que teve mais tempo */
  areas: AreaDaSessao[];
}

/** Um uso com a máquina, o implemento e o tempo em cada área (resumo da sessão, tela 25). */
export async function sessaoCompleta(usoId: string): Promise<SessaoCompleta | null> {
  const [linha] = await db
    .select({ uso: usosMaquina, maquina: maquinas })
    .from(usosMaquina)
    .innerJoin(maquinas, eq(maquinas.id, usosMaquina.maquinaId))
    .where(eq(usosMaquina.id, usoId))
    .limit(1);
  if (!linha) return null;
  const [areas, implemento] = await Promise.all([
    db
      .select({
        areaId: usosArea.areaId,
        nome: talhoes.nome,
        tipo: talhoes.tipo,
        segundos: usosArea.segundos,
        km: usosArea.km,
      })
      .from(usosArea)
      .innerJoin(talhoes, eq(talhoes.id, usosArea.areaId))
      .where(eq(usosArea.usoId, usoId))
      .orderBy(desc(usosArea.segundos)),
    linha.uso.implementoId
      ? db.select().from(maquinas).where(eq(maquinas.id, linha.uso.implementoId)).limit(1)
      : Promise.resolve([]),
  ]);
  return { ...linha, implemento: implemento[0] ?? null, areas };
}
export const TABELAS_SESSAO = ['usos_maquina', 'usos_area'] as const;

/** Usos que passaram na área, do mais recente, com o tempo e o KM dentro dela (RF-066). */
export function usosDaArea(areaId: string, limite = 30) {
  return db
    .select({
      id: usosMaquina.id,
      maquinaId: usosMaquina.maquinaId,
      maquinaNome: maquinas.nome,
      operador: usosMaquina.operador,
      inicio: usosArea.inicio,
      segundos: usosArea.segundos,
      km: usosArea.km,
    })
    .from(usosArea)
    .innerJoin(usosMaquina, eq(usosMaquina.id, usosArea.usoId))
    .innerJoin(maquinas, eq(maquinas.id, usosMaquina.maquinaId))
    .where(eq(usosArea.areaId, areaId))
    .orderBy(desc(usosArea.inicio))
    .limit(limite);
}
export type UsoNaArea = Awaited<ReturnType<typeof usosDaArea>>[number];
export const TABELAS_USOS_AREA = ['usos_area', 'usos_maquina'] as const;

/** Segundos de máquina na área desde `desde` ("Horas de máquina: 52 min hoje"), somados no SQLite. */
export async function segundosNaAreaDesde(areaId: string, desde: Date): Promise<number> {
  const [linha] = await db
    .select({ total: sql<number>`coalesce(sum(${usosArea.segundos}), 0)` })
    .from(usosArea)
    .where(and(eq(usosArea.areaId, areaId), gte(usosArea.inicio, desde)));
  return Number(linha?.total ?? 0);
}

export interface PosicaoDaMaquina {
  maquinaId: string;
  maquinaNome: string;
  usoId: string;
  lat: number;
  lng: number;
  /** Quando a máquina estava ali (fim do uso, ou o ponto mais novo do uso aberto) */
  em: Date;
  emUso: boolean;
}

/**
 * Última posição conhecida de cada máquina (RF-064): o fim do último uso, ou o
 * ponto mais novo do uso aberto (só existe no celular de quem opera). O último
 * uso de cada máquina sai pelo índice (máquina, início). Com o sync, as posições
 * dos outros celulares chegam pelas mesmas tabelas.
 */
export async function ultimasPosicoes(): Promise<PosicaoDaMaquina[]> {
  const ultimos = await db
    .select({
      usoId: usosMaquina.id,
      maquinaId: usosMaquina.maquinaId,
      maquinaNome: maquinas.nome,
      fim: usosMaquina.fim,
      fimLat: usosMaquina.fimLat,
      fimLng: usosMaquina.fimLng,
    })
    .from(usosMaquina)
    .innerJoin(maquinas, eq(maquinas.id, usosMaquina.maquinaId))
    .where(
      eq(
        usosMaquina.inicio,
        sql`(select max(u2.inicio) from usos_maquina u2 where u2.maquina_id = ${usosMaquina.maquinaId})`
      )
    );
  const posicoes: PosicaoDaMaquina[] = [];
  for (const u of ultimos) {
    if (u.fim) {
      if (u.fimLat !== null && u.fimLng !== null) {
        posicoes.push({ ...u, lat: u.fimLat, lng: u.fimLng, em: u.fim, emUso: false });
      }
      continue;
    }
    const [ponto] = await db
      .select({ lat: pontosGps.lat, lng: pontosGps.lng, em: pontosGps.registradoEm })
      .from(pontosGps)
      .where(eq(pontosGps.usoId, u.usoId))
      .orderBy(desc(pontosGps.registradoEm))
      .limit(1);
    if (ponto) posicoes.push({ ...u, lat: ponto.lat, lng: ponto.lng, em: ponto.em, emUso: true });
  }
  return posicoes.map(({ usoId, maquinaId, maquinaNome, lat, lng, em, emUso }) => ({
    usoId,
    maquinaId,
    maquinaNome,
    lat,
    lng,
    em,
    emUso,
  }));
}
export const TABELAS_POSICOES = ['usos_maquina', 'pontos_gps'] as const;
