import { and, asc, count, desc, eq, isNotNull, isNull, max, or, sql } from 'drizzle-orm';

import {
  animais,
  atualizar,
  daFazenda,
  db,
  movimentacoes,
  novoRegistro,
  pesagens,
  reproducoes,
  type Executor,
} from '@/database';
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

/** Rebanho na ordem de cadastro; por padrão só os animais ativos. */
export function listarAnimais({ incluirInativos = false } = {}) {
  return db
    .select()
    .from(animais)
    .where(incluirInativos ? daFazenda(animais) : and(daFazenda(animais), eq(animais.status, 'ativo')))
    .orderBy(asc(animais.createdAt));
}

/**
 * Animal do QR Code lido: pelo id (link do app) ou pelo brinco. Brinco pode
 * repetir entre animais que já saíram: vale o ativo, e entre iguais o mais novo.
 */
export async function buscarAnimalPorReferencia(
  referencia: ReferenciaAnimal
): Promise<Animal | undefined> {
  if (referencia.tipo === 'id') {
    const [animal] = await db
      .select()
      .from(animais)
      .where(and(daFazenda(animais), eq(animais.id, referencia.id)))
      .limit(1);
    return animal;
  }
  const iguais = await db
    .select()
    .from(animais)
    .where(and(daFazenda(animais), eq(animais.brinco, referencia.brinco)))
    .orderBy(desc(animais.createdAt));
  return iguais.find((animal) => animal.status === 'ativo') ?? iguais[0];
}

/** Machos ativos do rebanho (touros para cobertura e parto). */
export function listarTouros() {
  return db
    .select()
    .from(animais)
    .where(and(daFazenda(animais), eq(animais.status, 'ativo'), eq(animais.sexo, 'M')))
    .orderBy(asc(animais.createdAt));
}

export function animalPorId(id: string) {
  return db.query.animais.findFirst({ where: and(daFazenda(animais), eq(animais.id, id)) });
}

/** Crias da vaca, da mais nova para a mais velha. */
export function criasDe(maeId: string) {
  return db
    .select()
    .from(animais)
    .where(and(daFazenda(animais), eq(animais.maeId, maeId)))
    .orderBy(desc(animais.dataNascimento));
}

/** Data do parto mais recente de cada mãe (nascimento da cria mais nova). */
export function ultimosPartos() {
  return db
    .select({ maeId: animais.maeId, data: max(animais.dataNascimento) })
    .from(animais)
    .where(and(daFazenda(animais), isNotNull(animais.maeId)))
    .groupBy(animais.maeId);
}

/** Quantidade de crias de cada mãe, numa consulta só (para a lista do rebanho). */
export function criasPorMae() {
  return db
    .select({ maeId: animais.maeId, total: count() })
    .from(animais)
    .where(and(daFazenda(animais), isNotNull(animais.maeId)))
    .groupBy(animais.maeId);
}

/** Confere que o parente existe e tem o sexo esperado (mãe fêmea, pai macho). */
async function validarParente(tx: Executor, id: string | null | undefined, sexo: Sexo) {
  if (!id) return;
  const [parente] = await tx
    .select({ sexo: animais.sexo })
    .from(animais)
    .where(and(daFazenda(animais), eq(animais.id, id)))
    .limit(1);
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
  return db.transaction(async (tx) => {
    await validarParente(tx, novo.maeId, 'F');
    await validarParente(tx, novo.paiId, 'M');
    const [animal] = await tx.insert(animais).values(novoRegistro(novo)).returning();
    if (pesoInicialKg !== null) {
      await tx.insert(pesagens).values(
        novoRegistro({
          animalId: animal.id,
          pesoKg: pesoInicialKg,
          data: dataPesagem ?? novo.dataEntrada ?? new Date(),
        })
      );
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
  return db.transaction(async (tx) => {
    const [atual] = await tx
      .select()
      .from(animais)
      .where(and(daFazenda(animais), eq(animais.id, id)))
      .limit(1);
    if (!atual) throw new Error('Animal não encontrado');
    if (dados.maeId === id || dados.paiId === id) {
      throw new Error('O animal não pode ser mãe ou pai dele mesmo');
    }
    await validarParente(tx, dados.maeId, 'F');
    await validarParente(tx, dados.paiId, 'M');

    if (dados.sexo !== atual.sexo) {
      const [filho] = await tx
        .select({ id: animais.id })
        .from(animais)
        .where(and(daFazenda(animais), or(eq(animais.maeId, id), eq(animais.paiId, id))))
        .limit(1);
      const [cobertura] = await tx
        .select({ id: reproducoes.id })
        .from(reproducoes)
        .where(and(daFazenda(reproducoes), or(eq(reproducoes.animalId, id), eq(reproducoes.touroId, id))))
        .limit(1);
      if (filho || cobertura) {
        throw new Error('Não dá para trocar o sexo: o animal já tem crias ou coberturas registradas');
      }
    }

    const [atualizado] = await tx.update(animais).set(atualizar(dados)).where(eq(animais.id, id)).returning();
    return atualizado;
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
  return db.transaction(async (tx) => {
    const [mae] = await tx
      .select()
      .from(animais)
      .where(and(daFazenda(animais), eq(animais.id, maeId)))
      .limit(1);
    const [coberturaAberta] = await tx
      .select()
      .from(reproducoes)
      .where(and(daFazenda(reproducoes), eq(reproducoes.animalId, maeId), isNull(reproducoes.dataParto)))
      .orderBy(desc(reproducoes.data))
      .limit(1);

    const paiInformado = paiId !== undefined || paiDescricao !== undefined;
    const pai = paiInformado
      ? { paiId: paiId ?? null, paiDescricao: paiDescricao ?? null }
      : { paiId: coberturaAberta?.touroId ?? null, paiDescricao: coberturaAberta?.touroDescricao ?? null };
    await validarParente(tx, pai.paiId, 'M');

    const [cria] = await tx
      .insert(animais)
      .values(
        novoRegistro({
          brinco,
          sexo,
          maeId,
          ...pai,
          origem: 'nascido' as const,
          dataNascimento: data,
          dataEntrada: data,
          loteId: mae?.loteId,
          partoAssistido,
        })
      )
      .returning();

    // Peso ao nascer: a primeira pesagem da cria (base do ganho até o desmame)
    if (pesoNascerKg !== null) {
      await tx.insert(pesagens).values(novoRegistro({ animalId: cria.id, data, pesoKg: pesoNascerKg }));
    }

    if (coberturaAberta) {
      await tx
        .update(reproducoes)
        .set(atualizar({ dataParto: data, criaId: cria.id, prenhezConfirmada: true }))
        .where(eq(reproducoes.id, coberturaAberta.id));
    }

    return cria;
  });
}

/**
 * Saída do rebanho: só muda o status, o registro nunca é apagado. Na venda,
 * guarda o valor e o peso; o peso também vira a última pesagem do animal. O
 * animal sai também do pasto em que estava (a lotação do pasto cai).
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
  await db.transaction(async (tx) => {
    await tx
      .update(animais)
      .set(
        atualizar({
          status: saida.status,
          dataSaida: saida.data,
          motivoSaida: saida.motivo ?? null,
          valorVenda,
          pesoSaidaKg,
        })
      )
      .where(eq(animais.id, animalId));
    if (pesoSaidaKg !== null) {
      await tx.insert(pesagens).values(novoRegistro({ animalId, data: saida.data, pesoKg: pesoSaidaKg }));
    }
    // A saída do pasto é a data da saída do rebanho, nunca antes de ele ter
    // entrado no pasto (datas em texto ISO UTC: o max do SQLite compara como data)
    await tx
      .update(movimentacoes)
      .set(atualizar({ saidaEm: sql`max(${movimentacoes.entradaEm}, ${saida.data.toISOString()})` }))
      .where(and(daFazenda(movimentacoes), eq(movimentacoes.animalId, animalId), isNull(movimentacoes.saidaEm)));
  });
}

/** Desmame da cria: guarda a data e, se informado, o peso como pesagem do dia. */
export async function registrarDesmame(animalId: string, { data, pesoKg = null }: DadosDesmame): Promise<void> {
  if (pesoKg !== null && !(Number.isFinite(pesoKg) && pesoKg > 0)) {
    throw new Error('Peso ao desmame inválido');
  }
  await db.transaction(async (tx) => {
    await tx.update(animais).set(atualizar({ dataDesmame: data })).where(eq(animais.id, animalId));
    if (pesoKg !== null) await tx.insert(pesagens).values(novoRegistro({ animalId, data, pesoKg }));
  });
}
