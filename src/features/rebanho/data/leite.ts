import { and, desc, eq, gt } from 'drizzle-orm';

import { animais, controlesLeiteiros, db, mastites, secagens } from '@/database';
import type { NovaMastite, NovoControleLeiteiro } from '@/dtos';

/** Controles leiteiros da vaca, do mais recente para o mais antigo. */
export function controlesDoAnimal(animalId: string) {
  return db
    .select()
    .from(controlesLeiteiros)
    .where(eq(controlesLeiteiros.animalId, animalId))
    .orderBy(desc(controlesLeiteiros.data));
}

export function secagensDoAnimal(animalId: string) {
  return db.select().from(secagens).where(eq(secagens.animalId, animalId)).orderBy(desc(secagens.data));
}

export function mastitesDoAnimal(animalId: string) {
  return db.select().from(mastites).where(eq(mastites.animalId, animalId)).orderBy(desc(mastites.data));
}

/**
 * Controle leiteiro do dia. Se for o mais recente da vaca, vira também a
 * "produção de leite" do cadastro (lista do rebanho e filtro de alta produção).
 */
export async function registrarControleLeiteiro({ animalId, data, litros }: NovoControleLeiteiro): Promise<void> {
  if (!(Number.isFinite(litros) && litros >= 0)) throw new Error('Informe os litros do dia');
  db.transaction((tx) => {
    tx.insert(controlesLeiteiros).values({ animalId, data, litros }).run();
    // Lançamento atrasado (há controle mais novo da vaca): não mexe no cadastro
    const maisNovo = tx
      .select({ id: controlesLeiteiros.id })
      .from(controlesLeiteiros)
      .where(and(eq(controlesLeiteiros.animalId, animalId), gt(controlesLeiteiros.data, data)))
      .limit(1)
      .get();
    if (!maisNovo) {
      tx.update(animais).set({ producaoLeiteL: litros }).where(eq(animais.id, animalId)).run();
    }
  });
}

export async function registrarSecagem(animalId: string, data: Date): Promise<void> {
  await db.insert(secagens).values({ animalId, data });
}

export async function registrarMastite(mastite: NovaMastite): Promise<void> {
  if (!mastite.tetos || mastite.tetos.length === 0) throw new Error('Marque ao menos um teto');
  await db.insert(mastites).values(mastite);
}
