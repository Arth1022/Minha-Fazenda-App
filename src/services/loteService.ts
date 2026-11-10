import { and, asc, count, eq, inArray, ne, sql } from 'drizzle-orm';

import { animais, db, lotes, talhoes, type Lote } from '@/database';

/**
 * Lotes (M2): agrupamento opcional de animais (RF-016). Um animal está em no
 * máximo um lote (RN-001); o lote guarda o pasto em que foi colocado inteiro.
 */

const POR_VEZ = 400;

export interface DadosLote {
  nome: string;
  descricao?: string | null;
}

function limpar(dados: DadosLote) {
  const nome = dados.nome.trim();
  if (!nome) throw new Error('Dê um nome ao lote (ex.: Novilhas).');
  return { nome, descricao: dados.descricao?.trim() || null };
}

/** Nome repetido confunde na hora de mover: recusa, sem diferenciar maiúsculas. */
async function conferirNomeLivre(nome: string, ignorarId?: string) {
  const [igual] = await db
    .select({ id: lotes.id })
    .from(lotes)
    .where(
      ignorarId
        ? and(sql`lower(${lotes.nome}) = lower(${nome})`, ne(lotes.id, ignorarId))
        : sql`lower(${lotes.nome}) = lower(${nome})`
    )
    .limit(1);
  if (igual) throw new Error(`Já existe um lote chamado "${nome}".`);
}

export async function criarLote(dados: DadosLote): Promise<Lote> {
  const limpo = limpar(dados);
  await conferirNomeLivre(limpo.nome);
  const [criado] = await db.insert(lotes).values(limpo).returning();
  return criado;
}

export async function atualizarLote(id: string, dados: DadosLote): Promise<void> {
  const limpo = limpar(dados);
  await conferirNomeLivre(limpo.nome, id);
  await db.update(lotes).set(limpo).where(eq(lotes.id, id));
}

/** Os animais ficam sem lote (o histórico de movimentações continua). */
export async function excluirLote(id: string): Promise<void> {
  db.transaction((tx) => {
    tx.update(animais).set({ loteId: null }).where(eq(animais.loteId, id)).run();
    tx.delete(lotes).where(eq(lotes.id, id)).run();
  });
}

/** Põe os animais no lote (ou tira, com `loteId` null). Quem estava em outro lote sai dele. */
export async function definirLote(animalIds: readonly string[], loteId: string | null): Promise<void> {
  const ids = [...new Set(animalIds)];
  db.transaction((tx) => {
    for (let i = 0; i < ids.length; i += POR_VEZ) {
      tx.update(animais)
        .set({ loteId })
        .where(inArray(animais.id, ids.slice(i, i + POR_VEZ)))
        .run();
    }
  });
}

/**
 * Deixa no lote exatamente estes animais: os marcados entram, os desmarcados
 * saem (tela do lote → "Adicionar").
 */
export async function salvarAnimaisDoLote(loteId: string, animalIds: readonly string[]): Promise<void> {
  const marcados = new Set(animalIds);
  const atuais = await db
    .select({ id: animais.id })
    .from(animais)
    .where(and(eq(animais.loteId, loteId), eq(animais.status, 'ativo')));
  const saem = atuais.map((a) => a.id).filter((id) => !marcados.has(id));
  db.transaction((tx) => {
    for (let i = 0; i < saem.length; i += POR_VEZ) {
      tx.update(animais).set({ loteId: null }).where(inArray(animais.id, saem.slice(i, i + POR_VEZ))).run();
    }
    const entram = [...marcados];
    for (let i = 0; i < entram.length; i += POR_VEZ) {
      tx.update(animais).set({ loteId }).where(inArray(animais.id, entram.slice(i, i + POR_VEZ))).run();
    }
  });
}

/** Lotes com quantos animais (do rebanho) têm e o pasto onde estão, por nome. */
export function listarLotes() {
  return db
    .select({
      id: lotes.id,
      nome: lotes.nome,
      descricao: lotes.descricao,
      areaId: talhoes.id,
      areaNome: talhoes.nome,
      areaHectares: talhoes.areaHectares,
      areaDesde: lotes.areaDesde,
      animais: count(animais.id),
    })
    .from(lotes)
    .leftJoin(animais, and(eq(animais.loteId, lotes.id), eq(animais.status, 'ativo')))
    // Pasto excluído não conta: o lote aparece sem local
    .leftJoin(talhoes, and(eq(talhoes.id, lotes.areaId), ne(talhoes.syncStatus, 'deleted')))
    .groupBy(lotes.id)
    .orderBy(asc(lotes.nome));
}
export const TABELAS_LOTES = ['lotes', 'animais', 'talhoes'] as const;

export type LoteResumo = Awaited<ReturnType<typeof listarLotes>>[number];
