import { desc, eq } from 'drizzle-orm';

import { anotacoesAnimal, db, exames, tratamentos } from '@/database';
import type { NovoExame } from '@/dtos';

/** Exames do animal, do mais recente para o mais antigo. */
export function examesDoAnimal(animalId: string) {
  return db.select().from(exames).where(eq(exames.animalId, animalId)).orderBy(desc(exames.data));
}

export async function registrarExame(exame: NovoExame): Promise<void> {
  if (exame.tipo === 'outro' && !exame.descricao?.trim()) throw new Error('Informe qual é o exame');
  if (exame.validadeDias != null && !(Number.isInteger(exame.validadeDias) && exame.validadeDias > 0)) {
    throw new Error('Validade inválida');
  }
  await db.insert(exames).values({ ...exame, descricao: exame.descricao?.trim() || null });
}

/** Foto do comprovante (atestado de vacinação, nota) no tratamento; null tira. */
export async function anexarComprovanteTratamento(tratamentoId: string, uri: string | null): Promise<void> {
  await db.update(tratamentos).set({ comprovanteUri: uri }).where(eq(tratamentos.id, tratamentoId));
}

/** Anotações livres da ficha, da mais recente para a mais antiga. */
export function anotacoesDoAnimal(animalId: string) {
  return db
    .select()
    .from(anotacoesAnimal)
    .where(eq(anotacoesAnimal.animalId, animalId))
    .orderBy(desc(anotacoesAnimal.data), desc(anotacoesAnimal.createdAt));
}

export async function registrarAnotacao(animalId: string, texto: string, data = new Date()): Promise<void> {
  const limpo = texto.trim();
  if (!limpo) throw new Error('Escreva a anotação');
  await db.insert(anotacoesAnimal).values({ animalId, data, texto: limpo });
}

export async function apagarAnotacao(id: string): Promise<void> {
  await db.delete(anotacoesAnimal).where(eq(anotacoesAnimal.id, id));
}
