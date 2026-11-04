import { and, asc, count, desc, eq, isNotNull, isNull, max } from 'drizzle-orm';

import { animais, db, pesagens, reproducoes } from '@/database';
import type {
  Animal,
  DadosParto,
  DadosSaida,
  NovoAnimal,
  OpcoesCadastroAnimal,
  Sexo,
} from '@/dtos';

type Transacao = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Rebanho na ordem de cadastro; por padrão só os animais ativos. */
export function listarAnimais({ incluirInativos = false } = {}) {
  const query = db.select().from(animais).orderBy(asc(animais.createdAt));
  return incluirInativos ? query : query.where(eq(animais.status, 'ativo'));
}

/** Machos ativos do rebanho (touros para cobertura e parto). */
export function listarTouros() {
  return db
    .select()
    .from(animais)
    .where(and(eq(animais.status, 'ativo'), eq(animais.sexo, 'M')))
    .orderBy(asc(animais.createdAt));
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

/** Confere que o parente existe e tem o sexo esperado (mãe fêmea, pai macho). */
function validarParente(tx: Transacao, id: string | null | undefined, sexo: Sexo) {
  if (!id) return;
  const parente = tx.select({ sexo: animais.sexo }).from(animais).where(eq(animais.id, id)).get();
  if (!parente) throw new Error(sexo === 'F' ? 'A mãe informada não está no rebanho' : 'O pai informado não está no rebanho');
  if (parente.sexo !== sexo) throw new Error(sexo === 'F' ? 'A mãe precisa ser fêmea' : 'O pai precisa ser macho');
}

/**
 * Cadastra o animal e, se informado, o peso de entrada, numa transação só:
 * se a pesagem falhar, o animal também não é gravado. A pesagem usa
 * `dataPesagem`, ou a data de entrada, ou hoje.
 */
export async function cadastrarAnimal(
  novo: NovoAnimal,
  { pesoInicialKg = null, dataPesagem = null }: OpcoesCadastroAnimal = {}
): Promise<Animal> {
  if (pesoInicialKg !== null && !(Number.isFinite(pesoInicialKg) && pesoInicialKg > 0)) {
    throw new Error('Peso inicial inválido');
  }
  // Transação síncrona do driver expo-sqlite: as escritas usam .run()/.get()
  return db.transaction((tx) => {
    validarParente(tx, novo.maeId, 'F');
    validarParente(tx, novo.paiId, 'M');
    const animal = tx.insert(animais).values(novo).returning().get();
    if (pesoInicialKg !== null) {
      tx.insert(pesagens)
        .values({
          animalId: animal.id,
          pesoKg: pesoInicialKg,
          data: dataPesagem ?? novo.dataEntrada ?? new Date(),
        })
        .run();
    }
    return animal;
  });
}

/** Cadastro sem pesagem; prefira `cadastrarAnimal`. */
export function createAnimal(animal: NovoAnimal): Promise<Animal> {
  return cadastrarAnimal(animal);
}

/**
 * Registra o parto: cria o bezerro já ligado à mãe (origem "nascido", nascimento
 * na data do parto) e fecha a cobertura em aberto mais recente da vaca, se houver.
 * O pai da cria é o informado ou, sem informar, o touro dessa cobertura.
 */
export async function registrarParto(
  maeId: string,
  { data, sexo, brinco, paiId, paiDescricao }: DadosParto
): Promise<Animal> {
  // Transação síncrona do driver expo-sqlite: as escritas usam .run()/.get()
  return db.transaction((tx) => {
    const mae = tx.select().from(animais).where(eq(animais.id, maeId)).get();
    const coberturaAberta = tx
      .select()
      .from(reproducoes)
      .where(and(eq(reproducoes.animalId, maeId), isNull(reproducoes.dataParto)))
      .orderBy(desc(reproducoes.data))
      .limit(1)
      .get();

    const paiInformado = paiId !== undefined || paiDescricao !== undefined;
    const pai = paiInformado
      ? { paiId: paiId ?? null, paiDescricao: paiDescricao ?? null }
      : { paiId: coberturaAberta?.touroId ?? null, paiDescricao: coberturaAberta?.touroDescricao ?? null };
    validarParente(tx, pai.paiId, 'M');

    const cria = tx
      .insert(animais)
      .values({
        brinco,
        sexo,
        maeId,
        ...pai,
        origem: 'nascido',
        dataNascimento: data,
        dataEntrada: data,
        loteId: mae?.loteId,
      })
      .returning()
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

/** Saída do rebanho: só muda o status, o registro nunca é apagado. */
export async function registrarSaida(
  animalId: string,
  saida: DadosSaida
): Promise<void> {
  await db
    .update(animais)
    .set({ status: saida.status, dataSaida: saida.data, motivoSaida: saida.motivo ?? null })
    .where(eq(animais.id, animalId));
}
