import { desc, eq, max } from 'drizzle-orm';

import { avaliacoesCorporais, db, pesagens } from '@/database';
import type { DadosPesagem, NovaPesagem } from '@/dtos';
import { escoreValido } from '../services/indicadores';

/** Pesagens do animal, da mais recente para a mais antiga. */
export function pesagensDoAnimal(animalId: string) {
  return db
    .select()
    .from(pesagens)
    .where(eq(pesagens.animalId, animalId))
    .orderBy(desc(pesagens.data));
}

/**
 * Última pesagem de cada animal, numa consulta só (para a lista do rebanho).
 * No SQLite, com max() as colunas fora do agregado vêm da linha que tem o
 * máximo, então o peso é o da pesagem mais recente
 * (https://www.sqlite.org/lang_select.html#bareagg).
 */
export function pesosAtuais() {
  return db
    .select({ animalId: pesagens.animalId, pesoKg: pesagens.pesoKg, data: max(pesagens.data) })
    .from(pesagens)
    .groupBy(pesagens.animalId);
}

export async function createPesagem(input: NovaPesagem): Promise<void> {
  await db.insert(pesagens).values(input);
}

/** Escores corporais do animal, do mais recente para o mais antigo. */
export function avaliacoesDoAnimal(animalId: string) {
  return db
    .select()
    .from(avaliacoesCorporais)
    .where(eq(avaliacoesCorporais.animalId, animalId))
    .orderBy(desc(avaliacoesCorporais.data));
}

/**
 * Pesagem da ficha: o peso (balança ou fita) e/ou o escore corporal, numa
 * transação só. Sem balança nem fita, dá para lançar só o escore.
 */
export async function registrarPesagem({
  animalId,
  data,
  pesoKg = null,
  metodo = 'balanca',
  escore = null,
}: DadosPesagem): Promise<void> {
  if (pesoKg === null && escore === null) throw new Error('Informe o peso ou o escore corporal');
  if (pesoKg !== null && !(Number.isFinite(pesoKg) && pesoKg > 0)) throw new Error('Peso inválido');
  if (escore !== null && !escoreValido(escore)) throw new Error('Escore corporal vai de 1 a 5');

  db.transaction((tx) => {
    if (pesoKg !== null) tx.insert(pesagens).values({ animalId, data, pesoKg, metodo }).run();
    if (escore !== null) tx.insert(avaliacoesCorporais).values({ animalId, data, escore }).run();
  });
}
