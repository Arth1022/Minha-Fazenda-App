import { and, asc, count, desc, eq, isNotNull, isNull, max, or } from 'drizzle-orm';

import { animais, db, pesagens, reproducoes } from '@/database';
import type { ReferenciaAnimal } from '../services/qrCode';
import type {
  Animal,
  DadosDesmame,
  DadosEdicaoAnimal,
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

/**
 * Animal do QR Code lido: pelo id (link do app) ou pelo brinco. Brinco pode
 * repetir entre animais que já saíram: vale o ativo, e entre iguais o mais novo.
 */
export async function buscarAnimalPorReferencia(
  referencia: ReferenciaAnimal
): Promise<Animal | undefined> {
  if (referencia.tipo === 'id') {
    const [animal] = await db.select().from(animais).where(eq(animais.id, referencia.id)).limit(1);
    return animal;
  }
  const iguais = await db
    .select()
    .from(animais)
    .where(eq(animais.brinco, referencia.brinco))
    .orderBy(desc(animais.createdAt));
  return iguais.find((animal) => animal.status === 'ativo') ?? iguais[0];
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

/**
 * Edição do cadastro (lápis da ficha). Valida mãe e pai como no cadastro e não
 * deixa o animal ser mãe/pai dele mesmo. O sexo só muda se ainda não há crias
 * nem coberturas ligadas a ele (senão a mãe viraria macho, o touro fêmea...).
 */
export async function atualizarAnimal(id: string, dados: DadosEdicaoAnimal): Promise<Animal> {
  return db.transaction((tx) => {
    const atual = tx.select().from(animais).where(eq(animais.id, id)).get();
    if (!atual) throw new Error('Animal não encontrado');
    if (dados.maeId === id || dados.paiId === id) {
      throw new Error('O animal não pode ser mãe ou pai dele mesmo');
    }
    validarParente(tx, dados.maeId, 'F');
    validarParente(tx, dados.paiId, 'M');

    if (dados.sexo !== atual.sexo) {
      const filho = tx
        .select({ id: animais.id })
        .from(animais)
        .where(or(eq(animais.maeId, id), eq(animais.paiId, id)))
        .limit(1)
        .get();
      const cobertura = tx
        .select({ id: reproducoes.id })
        .from(reproducoes)
        .where(or(eq(reproducoes.animalId, id), eq(reproducoes.touroId, id)))
        .limit(1)
        .get();
      if (filho || cobertura) {
        throw new Error('Não dá para trocar o sexo: o animal já tem crias ou coberturas registradas');
      }
    }

    return tx.update(animais).set(dados).where(eq(animais.id, id)).returning().get();
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
  { data, sexo, brinco, paiId, paiDescricao, partoAssistido = false, pesoNascerKg = null }: DadosParto
): Promise<Animal> {
  if (pesoNascerKg !== null && !(Number.isFinite(pesoNascerKg) && pesoNascerKg > 0)) {
    throw new Error('Peso ao nascer inválido');
  }
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
        partoAssistido,
      })
      .returning()
      .get();

    // Peso ao nascer: a primeira pesagem da cria (base do ganho até o desmame)
    if (pesoNascerKg !== null) {
      tx.insert(pesagens).values({ animalId: cria.id, data, pesoKg: pesoNascerKg }).run();
    }

    if (coberturaAberta) {
      tx.update(reproducoes)
        .set({ dataParto: data, criaId: cria.id, prenhezConfirmada: true })
        .where(eq(reproducoes.id, coberturaAberta.id))
        .run();
    }

    return cria;
  });
}

/**
 * Saída do rebanho: só muda o status, o registro nunca é apagado. Na venda,
 * guarda o valor e o peso; o peso também vira a última pesagem do animal.
 */
export async function registrarSaida(
  animalId: string,
  saida: DadosSaida
): Promise<void> {
  const { valorVenda = null, pesoSaidaKg = null } = saida;
  if (valorVenda !== null && !(Number.isFinite(valorVenda) && valorVenda >= 0)) {
    throw new Error('Valor de venda inválido');
  }
  if (pesoSaidaKg !== null && !(Number.isFinite(pesoSaidaKg) && pesoSaidaKg > 0)) {
    throw new Error('Peso de saída inválido');
  }
  db.transaction((tx) => {
    tx.update(animais)
      .set({
        status: saida.status,
        dataSaida: saida.data,
        motivoSaida: saida.motivo ?? null,
        valorVenda,
        pesoSaidaKg,
      })
      .where(eq(animais.id, animalId))
      .run();
    if (pesoSaidaKg !== null) {
      tx.insert(pesagens).values({ animalId, data: saida.data, pesoKg: pesoSaidaKg }).run();
    }
  });
}

/** Desmame da cria: guarda a data e, se informado, o peso como pesagem do dia. */
export async function registrarDesmame(animalId: string, { data, pesoKg = null }: DadosDesmame): Promise<void> {
  if (pesoKg !== null && !(Number.isFinite(pesoKg) && pesoKg > 0)) {
    throw new Error('Peso ao desmame inválido');
  }
  db.transaction((tx) => {
    tx.update(animais).set({ dataDesmame: data }).where(eq(animais.id, animalId)).run();
    if (pesoKg !== null) tx.insert(pesagens).values({ animalId, data, pesoKg }).run();
  });
}
