import { and, desc, eq, gt } from 'drizzle-orm';

import { animais, atualizar, controlesLeiteiros, daFazenda, db, mastites, novoRegistro, secagens } from '@/database';
import type { NovaMastite, NovoControleLeiteiro } from '@/dtos';

/** Controles leiteiros da vaca, do mais recente para o mais antigo. */
export function controlesDoAnimal(animalId: string) {
  return db
    .select()
    .from(controlesLeiteiros)
    .where(and(daFazenda(controlesLeiteiros), eq(controlesLeiteiros.animalId, animalId)))
    .orderBy(desc(controlesLeiteiros.data));
}

export function secagensDoAnimal(animalId: string) {
  return db
    .select()
    .from(secagens)
    .where(and(daFazenda(secagens), eq(secagens.animalId, animalId)))
    .orderBy(desc(secagens.data));
}

export function mastitesDoAnimal(animalId: string) {
  return db
    .select()
    .from(mastites)
    .where(and(daFazenda(mastites), eq(mastites.animalId, animalId)))
    .orderBy(desc(mastites.data));
}

/**
 * Controle leiteiro do dia. Se for o mais recente da vaca, vira também a
 * "produção de leite" do cadastro (lista do rebanho e filtro de alta produção).
 */
export async function registrarControleLeiteiro({ animalId, data, litros }: NovoControleLeiteiro): Promise<void> {
  if (!(Number.isFinite(litros) && litros >= 0)) throw new Error('Informe os litros do dia');
  await db.transaction(async (tx) => {
    await tx.insert(controlesLeiteiros).values(novoRegistro({ animalId, data, litros }));
    // Lançamento atrasado (há controle mais novo da vaca): não mexe no cadastro
    const [maisNovo] = await tx
      .select({ id: controlesLeiteiros.id })
      .from(controlesLeiteiros)
      .where(and(daFazenda(controlesLeiteiros), eq(controlesLeiteiros.animalId, animalId), gt(controlesLeiteiros.data, data)))
      .limit(1);
    if (!maisNovo) {
      await tx.update(animais).set(atualizar({ producaoLeiteL: litros })).where(eq(animais.id, animalId));
    }
  });
}

export async function registrarSecagem(animalId: string, data: Date): Promise<void> {
  await db.insert(secagens).values(novoRegistro({ animalId, data }));
}

export async function registrarMastite(mastite: NovaMastite): Promise<void> {
  if (!mastite.tetos || mastite.tetos.length === 0) throw new Error('Marque ao menos um teto');
  await db.insert(mastites).values(novoRegistro(mastite));
}
