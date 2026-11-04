import { and, asc, eq, gte, lte, ne } from 'drizzle-orm';

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

/** Exclusão lógica (soft delete) para manter o registro na fila de sincronização com o PostGIS. */
export async function deletarTalhao(id: string): Promise<void> {
  await db
    .update(talhoes)
    .set({ syncStatus: 'deleted' })
    .where(eq(talhoes.id, id));
}
