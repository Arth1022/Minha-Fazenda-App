import { and, asc, count, desc, eq, isNotNull, isNull, max } from 'drizzle-orm';

import {
  animais,
  db,
  reproducoes,
  type Animal,
  type NovoAnimal,
  type Sexo,
  type StatusAnimal,
} from '@/database';

/** Rebanho na ordem de cadastro; por padrão só os animais ativos. */
export function listarAnimais({ incluirInativos = false } = {}) {
  const query = db.select().from(animais).orderBy(asc(animais.createdAt));
  return incluirInativos ? query : query.where(eq(animais.status, 'ativo'));
}

export function animalPorId(id: string) {
  return db.query.animais.findFirst({ where: eq(animais.id, id) });
}

/** Crias da vaca, da mais nova para a mais velha. */
export function criasDe(maeId: string) {
  return db
    .select()
    .from(animais)
    .where(eq(animais.maeId, maeId))
    .orderBy(desc(animais.dataNascimento));
}

/** Data do parto mais recente de cada mãe (nascimento da cria mais nova). */
export function ultimosPartos() {
  return db
    .select({ maeId: animais.maeId, data: max(animais.dataNascimento) })
    .from(animais)
    .where(isNotNull(animais.maeId))
    .groupBy(animais.maeId);
}

/** Quantidade de crias de cada mãe, numa consulta só (para a lista do rebanho). */
export function criasPorMae() {
  return db
    .select({ maeId: animais.maeId, total: count() })
    .from(animais)
    .where(isNotNull(animais.maeId))
    .groupBy(animais.maeId);
}

export async function createAnimal(animal: NovoAnimal): Promise<Animal> {
  const [created] = await db.insert(animais).values(animal).returning();
  return created;
}

export interface DadosParto {
  data: Date;
  sexo: Sexo;
  brinco: string;
}

/**
 * Registra o parto: cria o bezerro já ligado à mãe (origem "nascido", nascimento
 * na data do parto) e fecha a cobertura em aberto mais recente da vaca, se houver.
 */
export async function registrarParto(
  maeId: string,
  { data, sexo, brinco }: DadosParto
): Promise<Animal> {
  // Transação síncrona do driver expo-sqlite: as escritas usam .run()/.get()
  return db.transaction((tx) => {
    const mae = tx.select().from(animais).where(eq(animais.id, maeId)).get();
    const cria = tx
      .insert(animais)
      .values({
        brinco,
        sexo,
        maeId,
        origem: 'nascido',
        dataNascimento: data,
        dataEntrada: data,
        loteId: mae?.loteId,
      })
      .returning()
      .get();

    const coberturaAberta = tx
      .select()
      .from(reproducoes)
      .where(and(eq(reproducoes.animalId, maeId), isNull(reproducoes.dataParto)))
      .orderBy(desc(reproducoes.data))
      .limit(1)
      .get();
    if (coberturaAberta) {
      tx.update(reproducoes)
        .set({ dataParto: data, criaId: cria.id, prenhezConfirmada: true })
        .where(eq(reproducoes.id, coberturaAberta.id))
        .run();
    }

    return cria;
  });
}

export type StatusSaida = Exclude<StatusAnimal, 'ativo'>;

/** Saída do rebanho: só muda o status, o registro nunca é apagado. */
export async function registrarSaida(
  animalId: string,
  saida: { status: StatusSaida; data: Date; motivo?: string }
): Promise<void> {
  await db
    .update(animais)
    .set({ status: saida.status, dataSaida: saida.data, motivoSaida: saida.motivo ?? null })
    .where(eq(animais.id, animalId));
}
