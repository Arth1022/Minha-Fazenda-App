import { and, asc, eq, gte, lte, ne, sql } from 'drizzle-orm';

import { db, talhoes, type Talhao, type TipoTalhao } from '@/database';
import { type Coordenada, extrairMetadadosEspaciais } from '@/utils/geoMath';

export interface DadosCriarTalhao {
  nome: string;
  tipo?: TipoTalhao;
  cor: string;
  coordenadas: Coordenada[];
  criadoPor?: string | null;
}

export interface LimitesViewport {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Cria um talhão validando a topologia e preenchendo automaticamente área, centróide e BBOX. */
export async function criarTalhao(dados: DadosCriarTalhao): Promise<Talhao> {
  const nomeLimpo = dados.nome.trim();
  if (!nomeLimpo) {
    throw new Error('O nome do talhão é obrigatório.');
  }

  const metadados = extrairMetadadosEspaciais(dados.coordenadas);

  const [criado] = await db
    .insert(talhoes)
    .values({
      nome: nomeLimpo,
      tipo: dados.tipo ?? 'pasto',
      cor: dados.cor,
      areaHectares: metadados.areaHectares,
      geometriaJson: metadados.geometriaJson,
      centroLat: metadados.centroLat,
      centroLng: metadados.centroLng,
      minLat: metadados.minLat,
      maxLat: metadados.maxLat,
      minLng: metadados.minLng,
      maxLng: metadados.maxLng,
      criadoPor: dados.criadoPor ?? null,
    })
    .returning();

  return criado;
}

/** Lista todos os talhões não excluídos na ordem de criação. */
export function listarTalhoesAtivos() {
  return db
    .select()
    .from(talhoes)
    .where(ne(talhoes.syncStatus, 'deleted'))
    .orderBy(asc(talhoes.createdAt));
}

/** Filtra talhões visíveis na tela usando o índice composto de BBOX sem fazer parse do GeoJSON. */
export function listarTalhoesNoViewport(limites: LimitesViewport) {
  return db
    .select()
    .from(talhoes)
    .where(
      and(
        ne(talhoes.syncStatus, 'deleted'),
        lte(talhoes.minLat, limites.maxLat),
        gte(talhoes.maxLat, limites.minLat),
        lte(talhoes.minLng, limites.maxLng),
        gte(talhoes.maxLng, limites.minLng),
      ),
    )
    .orderBy(asc(talhoes.createdAt));
}

export interface DadosAtualizarTalhao {
  nome?: string;
  tipo?: TipoTalhao;
  cor?: string;
  /** Novo contorno: recalcula área, centróide e BBOX */
  coordenadas?: Coordenada[];
}

/**
 * Edita um talhão num único UPDATE (sem ler antes). Trocar o contorno recalcula os
 * metadados espaciais. Quem ainda não subiu fica 'created'; o resto vira 'updated'.
 */
export async function atualizarTalhao(id: string, dados: DadosAtualizarTalhao): Promise<void> {
  const mudancas: Partial<typeof talhoes.$inferInsert> = {};

  if (dados.nome !== undefined) {
    const nomeLimpo = dados.nome.trim();
    if (!nomeLimpo) throw new Error('O nome do talhão é obrigatório.');
    mudancas.nome = nomeLimpo;
  }
  if (dados.tipo !== undefined) mudancas.tipo = dados.tipo;
  if (dados.cor !== undefined) mudancas.cor = dados.cor;
  if (dados.coordenadas !== undefined) {
    const meta = extrairMetadadosEspaciais(dados.coordenadas);
    Object.assign(mudancas, {
      areaHectares: meta.areaHectares,
      geometriaJson: meta.geometriaJson,
      centroLat: meta.centroLat,
      centroLng: meta.centroLng,
      minLat: meta.minLat,
      maxLat: meta.maxLat,
      minLng: meta.minLng,
      maxLng: meta.maxLng,
    });
  }

  await db
    .update(talhoes)
    .set({
      ...mudancas,
      syncStatus: sql`CASE WHEN ${talhoes.syncStatus} = 'created' THEN 'created' ELSE 'updated' END`,
    })
    .where(eq(talhoes.id, id));
}

/** Exclusão lógica (soft delete) para manter o registro na fila de sincronização com o PostGIS. */
export async function deletarTalhao(id: string): Promise<void> {
  await db
    .update(talhoes)
    .set({ syncStatus: 'deleted' })
    .where(eq(talhoes.id, id));
}
