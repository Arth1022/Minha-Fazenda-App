import { and, asc, count, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';

import { animais, db, lotes, movimentacoes, talhoes } from '@/database';
import { usuarioAtual, type Usuario } from '@/services/usuario';

/**
 * Rebanho no mapa: onde cada animal está e por onde passou (M2).
 *
 * O local atual do animal é a movimentação aberta (sem `saida_em`); mover fecha
 * a anterior e abre a nova (RN-006). As linhas nunca são apagadas nem
 * reescritas, só a saída é preenchida (RN-007).
 */

/** Ids num IN (...) de uma vez: bem abaixo do limite de variáveis do SQLite. */
const POR_VEZ = 400;

function emPartes<T>(itens: readonly T[]): T[][] {
  const partes: T[][] = [];
  for (let i = 0; i < itens.length; i += POR_VEZ) partes.push(itens.slice(i, i + POR_VEZ));
  return partes;
}

/** Ordem das listas de animais: pelo nome; sem nome, pelo brinco. */
const ORDEM_ANIMAL = sql`coalesce(${animais.nome}, ${animais.brinco})`;

export interface DadosMover {
  animalIds: readonly string[];
  /** Pasto de destino; null tira os animais do pasto ("sem local definido") */
  destinoId: string | null;
  /** Lote movido inteiro: fica em cada movimentação e passa a ser o pasto do lote */
  loteId?: string | null;
  quando?: Date;
  usuario?: Usuario;
}

export interface ResultadoMover {
  /** Animais que mudaram de lugar */
  movidos: number;
  /** Já estavam no destino ou não estão mais no rebanho: nada mudou para eles */
  ignorados: number;
}

/**
 * Move animais para um pasto (ou tira do pasto), numa transação: fecha a
 * movimentação aberta e abre a nova. Só área do tipo Pasto recebe animais
 * (RN-003); quem já está no destino ou saiu do rebanho fica como está.
 */
export async function moverAnimais(dados: DadosMover): Promise<ResultadoMover> {
  const ids = [...new Set(dados.animalIds)];
  const { destinoId } = dados;
  const quando = dados.quando ?? new Date();
  const usuario = dados.usuario ?? usuarioAtual();

  return db.transaction((tx) => {
    if (destinoId !== null) {
      const destino = tx
        .select({ tipo: talhoes.tipo })
        .from(talhoes)
        .where(and(eq(talhoes.id, destinoId), ne(talhoes.syncStatus, 'deleted')))
        .get();
      if (!destino) throw new Error('Pasto não encontrado.');
      if (destino.tipo !== 'pasto') throw new Error('Só área do tipo Pasto recebe animais.');
    }

    // Onde cada animal do rebanho está agora (pelo índice da movimentação aberta)
    const mover: string[] = [];
    for (const parte of emPartes(ids)) {
      const linhas = tx
        .select({ id: animais.id, areaId: movimentacoes.areaId })
        .from(animais)
        .leftJoin(
          movimentacoes,
          and(eq(movimentacoes.animalId, animais.id), isNull(movimentacoes.saidaEm))
        )
        .where(and(inArray(animais.id, parte), eq(animais.status, 'ativo')))
        .all();
      for (const linha of linhas) if ((linha.areaId ?? null) !== destinoId) mover.push(linha.id);
    }

    for (const parte of emPartes(mover)) {
      tx.update(movimentacoes)
        .set({ saidaEm: quando })
        .where(and(inArray(movimentacoes.animalId, parte), isNull(movimentacoes.saidaEm)))
        .run();
      if (destinoId !== null) {
        tx.insert(movimentacoes)
          .values(
            parte.map((animalId) => ({
              animalId,
              areaId: destinoId,
              loteId: dados.loteId ?? null,
              entradaEm: quando,
              registradoPor: usuario.nome,
              registradoPorId: usuario.id,
            }))
          )
          .run();
      }
    }

    // O lote movido inteiro fica naquele pasto, mesmo que todos já estivessem lá
    if (dados.loteId) {
      tx.update(lotes)
        .set({ areaId: destinoId, areaDesde: destinoId !== null ? quando : null })
        .where(eq(lotes.id, dados.loteId))
        .run();
    }

    return { movidos: mover.length, ignorados: ids.length - mover.length };
  });
}

/** "Mover lote para…": todos os animais do lote no rebanho, uma movimentação para cada (RN-005). */
export async function moverLote(
  loteId: string,
  destinoId: string,
  opcoes: { quando?: Date; usuario?: Usuario } = {}
): Promise<ResultadoMover> {
  const membros = await db
    .select({ id: animais.id })
    .from(animais)
    .where(and(eq(animais.loteId, loteId), eq(animais.status, 'ativo')));
  return moverAnimais({ animalIds: membros.map((m) => m.id), destinoId, loteId, ...opcoes });
}

/** Animais no pasto agora (RN-011: área com animais não é excluída nem troca de tipo). */
export async function contarAnimaisNaArea(areaId: string): Promise<number> {
  const [linha] = await db
    .select({ total: count() })
    .from(movimentacoes)
    .where(and(eq(movimentacoes.areaId, areaId), isNull(movimentacoes.saidaEm)));
  return linha?.total ?? 0;
}

/**
 * Ocupação de todas as áreas que já tiveram animais: cabeças agora, desde
 * quando (entrada mais antiga dos presentes) e a última saída. Uma leitura só
 * do índice (area_id, saida_em, entrada_em). Datas em milissegundos.
 */
export function ocupacaoDasAreas() {
  return db
    .select({
      areaId: movimentacoes.areaId,
      cabecas: sql<number>`sum(case when ${movimentacoes.saidaEm} is null then 1 else 0 end)`.mapWith(Number),
      desdeMs: sql<number | null>`min(case when ${movimentacoes.saidaEm} is null then ${movimentacoes.entradaEm} end)`,
      ultimaSaidaMs: sql<number | null>`max(${movimentacoes.saidaEm})`,
    })
    .from(movimentacoes)
    .groupBy(movimentacoes.areaId);
}
export const TABELAS_OCUPACAO = ['movimentacoes'] as const;

/** Animais no pasto agora, com o lote de cada um (painel do pasto). */
export function animaisNaArea(areaId: string) {
  return db
    .select({
      id: animais.id,
      nome: animais.nome,
      brinco: animais.brinco,
      loteId: animais.loteId,
      loteNome: lotes.nome,
      entradaEm: movimentacoes.entradaEm,
    })
    .from(movimentacoes)
    .innerJoin(animais, eq(animais.id, movimentacoes.animalId))
    .leftJoin(lotes, eq(lotes.id, animais.loteId))
    .where(and(eq(movimentacoes.areaId, areaId), isNull(movimentacoes.saidaEm)))
    .orderBy(asc(ORDEM_ANIMAL));
}
export const TABELAS_ANIMAIS_NA_AREA = ['movimentacoes', 'animais', 'lotes'] as const;

/** Rebanho ativo com o local e o lote de cada animal (colocar no pasto, lotes, busca). */
export function animaisComLocal(filtro: { loteId?: string } = {}) {
  return db
    .select({
      id: animais.id,
      nome: animais.nome,
      brinco: animais.brinco,
      raca: animais.raca,
      loteId: animais.loteId,
      loteNome: lotes.nome,
      areaId: movimentacoes.areaId,
      areaNome: talhoes.nome,
      entradaEm: movimentacoes.entradaEm,
    })
    .from(animais)
    .leftJoin(
      movimentacoes,
      and(eq(movimentacoes.animalId, animais.id), isNull(movimentacoes.saidaEm))
    )
    .leftJoin(talhoes, eq(talhoes.id, movimentacoes.areaId))
    .leftJoin(lotes, eq(lotes.id, animais.loteId))
    .where(
      filtro.loteId
        ? and(eq(animais.status, 'ativo'), eq(animais.loteId, filtro.loteId))
        : eq(animais.status, 'ativo')
    )
    .orderBy(asc(ORDEM_ANIMAL));
}
export const TABELAS_ANIMAIS_COM_LOCAL = ['animais', 'movimentacoes', 'talhoes', 'lotes'] as const;

/** Por onde o animal passou, do mais recente ("Onde está" na ficha). */
export function historicoDoAnimal(animalId: string) {
  return db
    .select({
      id: movimentacoes.id,
      areaId: movimentacoes.areaId,
      areaNome: talhoes.nome,
      areaTipo: talhoes.tipo,
      loteNome: lotes.nome,
      entradaEm: movimentacoes.entradaEm,
      saidaEm: movimentacoes.saidaEm,
      registradoPor: movimentacoes.registradoPor,
    })
    .from(movimentacoes)
    .innerJoin(talhoes, eq(talhoes.id, movimentacoes.areaId))
    .leftJoin(lotes, eq(lotes.id, movimentacoes.loteId))
    .where(eq(movimentacoes.animalId, animalId))
    .orderBy(desc(movimentacoes.entradaEm));
}
export const TABELAS_HISTORICO_ANIMAL = ['movimentacoes', 'talhoes', 'lotes'] as const;

/** Quem passou pelo pasto, do mais recente ("Histórico de ocupação"). */
export function historicoDaArea(areaId: string, limite = 300) {
  return db
    .select({
      id: movimentacoes.id,
      animalId: movimentacoes.animalId,
      nome: animais.nome,
      brinco: animais.brinco,
      loteId: movimentacoes.loteId,
      loteNome: lotes.nome,
      entradaEm: movimentacoes.entradaEm,
      saidaEm: movimentacoes.saidaEm,
    })
    .from(movimentacoes)
    .innerJoin(animais, eq(animais.id, movimentacoes.animalId))
    .leftJoin(lotes, eq(lotes.id, movimentacoes.loteId))
    .where(eq(movimentacoes.areaId, areaId))
    .orderBy(desc(movimentacoes.entradaEm))
    .limit(limite);
}
export const TABELAS_HISTORICO_AREA = ['movimentacoes', 'animais', 'lotes'] as const;
