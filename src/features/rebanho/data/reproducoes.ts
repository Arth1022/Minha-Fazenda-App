import { and, desc, eq } from 'drizzle-orm';

import { atualizar, cios, daFazenda, db, novoRegistro, reproducoes } from '@/database';
import type { MetodoDiagnostico, NovaCobertura, Reproducao } from '@/dtos';
import { calcularPrevisaoParto } from '../services/indicadores';

/** Coberturas e inseminações do animal, da mais recente para a mais antiga. */
export function reproducoesDoAnimal(animalId: string) {
  return db
    .select()
    .from(reproducoes)
    .where(and(daFazenda(reproducoes), eq(reproducoes.animalId, animalId)))
    .orderBy(desc(reproducoes.data));
}

/** Registra a cobertura/inseminação já com a previsão de parto calculada. */
export async function createReproducao(
  input: NovaCobertura
): Promise<Reproducao> {
  const [created] = await db
    .insert(reproducoes)
    .values(novoRegistro({ ...input, previsaoParto: calcularPrevisaoParto(input.data) }))
    .returning();
  return created;
}

/** Informa o touro da cobertura depois de registrada: do rebanho (id) ou de fora/sêmen (texto). */
export async function informarTouro(
  id: string,
  touro: { id: string | null; descricao: string | null }
): Promise<void> {
  await db
    .update(reproducoes)
    .set(atualizar({ touroId: touro.id, touroDescricao: touro.id ? null : touro.descricao }))
    .where(eq(reproducoes.id, id));
}

/** Resultado do diagnóstico de prenhez, com quando e como foi feito (padrão: hoje). */
export async function confirmarPrenhez(
  id: string,
  confirmada: boolean,
  { data = new Date(), metodo = null }: { data?: Date; metodo?: MetodoDiagnostico | null } = {}
): Promise<void> {
  await db
    .update(reproducoes)
    .set(atualizar({ prenhezConfirmada: confirmada, dataDiagnostico: data, metodoDiagnostico: metodo }))
    .where(eq(reproducoes.id, id));
}

/** Perdeu a prenhez: a cobertura sai de "em aberto" sem parto (a vaca volta a ficar vazia). */
export async function registrarAborto(id: string, data: Date): Promise<void> {
  await db.update(reproducoes).set(atualizar({ dataAborto: data })).where(eq(reproducoes.id, id));
}

/** Cios observados, do mais recente para o mais antigo. */
export function ciosDoAnimal(animalId: string) {
  return db
    .select()
    .from(cios)
    .where(and(daFazenda(cios), eq(cios.animalId, animalId)))
    .orderBy(desc(cios.data));
}

export async function registrarCio(animalId: string, data: Date, observacoes?: string): Promise<void> {
  await db.insert(cios).values(novoRegistro({ animalId, data, observacoes: observacoes?.trim() || null }));
}
