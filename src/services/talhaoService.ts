import { and, asc, count, eq, gte, isNull, lte, ne, sql } from 'drizzle-orm';

import { COR_POR_TIPO_AREA } from '@/constants/areas';
import {
  db,
  marcadoresMapa,
  movimentacoes,
  talhoes,
  type FaseLavoura,
  type Talhao,
  type TipoTalhao,
} from '@/database';
import { calcularPerimetroM, type Coordenada, extrairMetadadosEspaciais } from '@/utils/geoMath';

export interface DadosCriarTalhao {
  nome: string;
  tipo?: TipoTalhao;
  coordenadas: Coordenada[];
  cultura?: string | null;
  faseLavoura?: FaseLavoura | null;
  dataPlantio?: Date | null;
  criadoPor?: string | null;
}

export interface LimitesViewport {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Cria uma área validando a topologia e preenchendo sozinho área, perímetro,
 * centróide e BBOX. A cor é a do tipo.
 */
export async function criarTalhao(dados: DadosCriarTalhao): Promise<Talhao> {
  const nomeLimpo = dados.nome.trim();
  if (!nomeLimpo) {
    throw new Error('Dê um nome à área.');
  }

  const metadados = extrairMetadadosEspaciais(dados.coordenadas);
  const tipo = dados.tipo ?? 'pasto';
  const ehLavoura = tipo === 'lavoura';

  const [criado] = await db
    .insert(talhoes)
    .values({
      nome: nomeLimpo,
      tipo,
      cor: COR_POR_TIPO_AREA[tipo],
      areaHectares: metadados.areaHectares,
      perimetroM: metadados.perimetroM,
      geometriaJson: metadados.geometriaJson,
      centroLat: metadados.centroLat,
      centroLng: metadados.centroLng,
      minLat: metadados.minLat,
      maxLat: metadados.maxLat,
      minLng: metadados.minLng,
      maxLng: metadados.maxLng,
      cultura: ehLavoura ? (dados.cultura?.trim() || null) : null,
      faseLavoura: ehLavoura ? (dados.faseLavoura ?? null) : null,
      dataPlantio: ehLavoura ? (dados.dataPlantio ?? null) : null,
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

/** Animais no pasto agora (movimentações abertas, pelo índice da área). */
async function animaisPresentes(areaId: string): Promise<number> {
  const [linha] = await db
    .select({ total: count() })
    .from(movimentacoes)
    .where(and(eq(movimentacoes.areaId, areaId), isNull(movimentacoes.saidaEm)));
  return linha?.total ?? 0;
}

/** RN-011: pasto com animais não é excluído nem troca de tipo antes de eles saírem. */
async function exigirPastoVazio(areaId: string, acao: string): Promise<void> {
  const presentes = await animaisPresentes(areaId);
  if (presentes > 0) {
    const quantos = presentes === 1 ? 'o animal' : `os ${presentes} animais`;
    throw new Error(`Mova ${quantos} para outro pasto antes de ${acao}.`);
  }
}

export interface DadosAtualizarTalhao {
  nome?: string;
  /** Trocar o tipo troca a cor; sair de lavoura apaga a safra */
  tipo?: TipoTalhao;
  cultura?: string | null;
  faseLavoura?: FaseLavoura | null;
  dataPlantio?: Date | null;
  /** Novo contorno (redesenhar): recalcula área, perímetro, centróide e BBOX */
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
    if (!nomeLimpo) throw new Error('Dê um nome à área.');
    mudancas.nome = nomeLimpo;
  }
  if (dados.tipo !== undefined) {
    if (dados.tipo !== 'pasto') await exigirPastoVazio(id, 'trocar o tipo');
    mudancas.tipo = dados.tipo;
    mudancas.cor = COR_POR_TIPO_AREA[dados.tipo];
    if (dados.tipo !== 'lavoura') {
      mudancas.cultura = null;
      mudancas.faseLavoura = null;
      mudancas.dataPlantio = null;
    }
  }
  if (dados.tipo === undefined || dados.tipo === 'lavoura') {
    if (dados.cultura !== undefined) mudancas.cultura = dados.cultura?.trim() || null;
    if (dados.faseLavoura !== undefined) mudancas.faseLavoura = dados.faseLavoura;
    if (dados.dataPlantio !== undefined) mudancas.dataPlantio = dados.dataPlantio;
  }
  if (dados.coordenadas !== undefined) {
    const meta = extrairMetadadosEspaciais(dados.coordenadas);
    Object.assign(mudancas, {
      areaHectares: meta.areaHectares,
      perimetroM: meta.perimetroM,
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
  await exigirPastoVazio(id, 'excluir a área');
  await db
    .update(talhoes)
    .set({ syncStatus: 'deleted' })
    .where(eq(talhoes.id, id));
  await db.delete(marcadoresMapa).where(eq(marcadoresMapa.talhaoId, id));
}

/**
 * Áreas gravadas antes de o perímetro ir para o banco: calcula uma vez e grava.
 * Roda na abertura do app; depois da primeira vez a consulta não acha nada.
 */
export async function preencherPerimetrosPendentes(): Promise<number> {
  const pendentes = await db
    .select({ id: talhoes.id, geometriaJson: talhoes.geometriaJson })
    .from(talhoes)
    .where(isNull(talhoes.perimetroM));
  for (const area of pendentes) {
    const anel = (area.geometriaJson.coordinates[0] ?? []) as Coordenada[];
    await db
      .update(talhoes)
      .set({ perimetroM: calcularPerimetroM(anel) })
      .where(eq(talhoes.id, area.id));
  }
  return pendentes.length;
}
