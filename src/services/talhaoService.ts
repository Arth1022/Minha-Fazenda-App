import { and, asc, count, eq, gte, isNull, lte } from 'drizzle-orm';

import { COR_POR_TIPO_AREA } from '@/constants/areas';
import {
  apagar,
  atualizar,
  calculosCerca,
  ciclosPlantio,
  daFazenda,
  db,
  marcadoresMapa,
  movimentacoes,
  novoRegistro,
  talhoes,
  type FaseLavoura,
  type Talhao,
  type TipoTalhao,
} from '@/database';
import { cancelarLembretesDoCiclo } from '@/services/notificacoes';
import { type Coordenada, extrairMetadadosEspaciais } from '@/utils/geoMath';

export interface DadosCriarTalhao {
  nome: string;
  tipo?: TipoTalhao;
  coordenadas: Coordenada[];
  cultura?: string | null;
  faseLavoura?: FaseLavoura | null;
  dataPlantio?: Date | null;
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
    .values(novoRegistro({
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
    }))
    .returning();

  return criado;
}

/** Lista todos os talhões não excluídos na ordem de criação. */
export function listarTalhoesAtivos() {
  return db
    .select()
    .from(talhoes)
    .where(daFazenda(talhoes))
    .orderBy(asc(talhoes.createdAt));
}

/** Filtra talhões visíveis na tela usando o índice composto de BBOX sem fazer parse do GeoJSON. */
export function listarTalhoesNoViewport(limites: LimitesViewport) {
  return db
    .select()
    .from(talhoes)
    .where(
      and(
        daFazenda(talhoes),
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
    .where(and(daFazenda(movimentacoes), eq(movimentacoes.areaId, areaId), isNull(movimentacoes.saidaEm)));
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

/** Ciclo de plantio ativo da área (só lavoura tem). */
async function cicloAtivoId(areaId: string): Promise<string | null> {
  const [ciclo] = await db
    .select({ id: ciclosPlantio.id })
    .from(ciclosPlantio)
    .where(and(daFazenda(ciclosPlantio), eq(ciclosPlantio.areaId, areaId), eq(ciclosPlantio.status, 'ativo')))
    .limit(1);
  return ciclo?.id ?? null;
}

/** O ciclo deixa de valer (área saiu de lavoura ou do mapa): cancelado, fica no histórico. */
const cancelarCicloAtivo = (areaId: string) =>
  db
    .update(ciclosPlantio)
    .set(atualizar({ status: 'cancelado' as const, encerradoEm: new Date() }))
    .where(and(daFazenda(ciclosPlantio), eq(ciclosPlantio.areaId, areaId), eq(ciclosPlantio.status, 'ativo')));

export interface DadosAtualizarTalhao {
  nome?: string;
  /** Trocar o tipo troca a cor; sair de lavoura encerra a safra e cancela o ciclo ativo */
  tipo?: TipoTalhao;
  cultura?: string | null;
  faseLavoura?: FaseLavoura | null;
  dataPlantio?: Date | null;
  /** Novo contorno (redesenhar): recalcula área, perímetro, centróide e BBOX */
  coordenadas?: Coordenada[];
}

/**
 * Edita um talhão num único UPDATE (sem ler antes). Trocar o contorno recalcula os
 * metadados espaciais.
 */
export async function atualizarTalhao(id: string, dados: DadosAtualizarTalhao): Promise<void> {
  const mudancas: Partial<Omit<typeof talhoes.$inferInsert, 'id' | 'fazendaId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'deletedAt'>> = {};

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

  // Saiu de lavoura: o ciclo ativo é cancelado junto (RN-004) e os avisos dele saem
  const cicloCancelado = dados.tipo !== undefined && dados.tipo !== 'lavoura' ? await cicloAtivoId(id) : null;

  await db.transaction(async (tx) => {
    await tx.update(talhoes).set(atualizar(mudancas)).where(eq(talhoes.id, id));
    // Contorno novo: a cerca e as sementes foram calculadas com o contorno antigo (RF-032, RN-010)
    if (dados.coordenadas !== undefined) {
      await tx
        .update(calculosCerca)
        .set(atualizar({ desatualizado: true }))
        .where(and(daFazenda(calculosCerca), eq(calculosCerca.areaId, id)));
      await tx
        .update(ciclosPlantio)
        .set(atualizar({ calculoDesatualizado: true }))
        .where(and(daFazenda(ciclosPlantio), eq(ciclosPlantio.areaId, id), eq(ciclosPlantio.status, 'ativo')));
    }
    if (cicloCancelado) {
      await tx
        .update(ciclosPlantio)
        .set(atualizar({ status: 'cancelado' as const, encerradoEm: new Date() }))
        .where(eq(ciclosPlantio.id, cicloCancelado));
    }
  });
  if (cicloCancelado) await cancelarLembretesDoCiclo(cicloCancelado).catch(() => undefined);
}

/**
 * Exclusão lógica (soft delete): a linha fica para o sync levar a exclusão aos
 * outros celulares. Os marcadores da área e a cerca saem junto.
 */
export async function deletarTalhao(id: string): Promise<void> {
  await exigirPastoVazio(id, 'excluir a área');
  const ciclo = await cicloAtivoId(id);
  await db.transaction(async (tx) => {
    await apagar(tx, talhoes, id);
    await apagar(tx, marcadoresMapa, eq(marcadoresMapa.talhaoId, id));
    await apagar(tx, calculosCerca, eq(calculosCerca.areaId, id));
  });
  // Lavoura que sai do mapa: o ciclo ativo vira cancelado (o histórico fica) e os avisos saem
  if (ciclo) {
    await cancelarCicloAtivo(id);
    await cancelarLembretesDoCiclo(ciclo).catch(() => undefined);
  }
}

