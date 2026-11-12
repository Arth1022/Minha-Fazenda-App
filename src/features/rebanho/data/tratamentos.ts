import { and, desc, eq, isNotNull, max, or } from 'drizzle-orm';

import { animais, atualizar, daFazenda, db, novoRegistro, tratamentos } from '@/database';
import type { NovoTratamento, Tratamento, UltimoUsoMedicamento } from '@/dtos';
import { normalizarTexto } from '@/utils';
import { inicioDoDia } from '@/utils/date';
import { AVISO_DOSE_MINUTOS_ANTES, errosDaAgenda, TODOS_OS_DIAS } from '../services/doses';

/** Tratamentos do animal, do início mais recente para o mais antigo. */
export function tratamentosDoAnimal(animalId: string) {
  return db
    .select()
    .from(tratamentos)
    .where(and(daFazenda(tratamentos), eq(tratamentos.animalId, animalId)))
    .orderBy(desc(tratamentos.dataInicio));
}

/** Tratamentos com carência informada (para os alertas da lista do rebanho). */
export function tratamentosComCarencia() {
  return db
    .select()
    .from(tratamentos)
    .where(
      and(
        daFazenda(tratamentos),
        or(isNotNull(tratamentos.carenciaLeiteDias), isNotNull(tratamentos.carenciaCarneDias))
      )
    );
}

/** Sugestões que aparecem sempre, mesmo sem uso anterior. */
export const MEDICAMENTOS_FIXOS = ['Brucelose'];

/**
 * Nomes para sugerir no campo do remédio: os já usados na fazenda (do uso mais
 * recente para o mais antigo), depois `sugestoes` que ainda não apareceram.
 * Nomes iguais sem acento/maiúsculas aparecem uma vez só, na grafia mais recente.
 */
export async function nomesDeMedicamentos(
  sugestoes: readonly string[] = MEDICAMENTOS_FIXOS
): Promise<string[]> {
  const usados = await db
    .select({ medicamento: tratamentos.medicamento, ultimoUso: max(tratamentos.dataInicio) })
    .from(tratamentos)
    .where(daFazenda(tratamentos))
    .groupBy(tratamentos.medicamento)
    .orderBy(desc(max(tratamentos.dataInicio)));

  const vistos = new Set<string>();
  const nomes: string[] = [];
  for (const nome of [...usados.map((u) => u.medicamento.trim()), ...sugestoes, ...MEDICAMENTOS_FIXOS]) {
    const chave = normalizarTexto(nome);
    if (!chave || vistos.has(chave)) continue;
    vistos.add(chave);
    nomes.push(nome);
  }
  return nomes;
}

/**
 * Dose e carências usadas da última vez com este remédio, para preencher o
 * formulário. Null se o remédio nunca foi usado.
 */
export async function ultimoUsoDoMedicamento(
  medicamento: string
): Promise<UltimoUsoMedicamento | null> {
  const alvo = normalizarTexto(medicamento);
  if (!alvo) return null;

  // O lower() do SQLite ignora acentos fora do ASCII; agrupa por grafia para ler só uma linha por nome
  const usos = await db
    .select({
      medicamento: tratamentos.medicamento,
      dose: tratamentos.dose,
      carenciaLeiteDias: tratamentos.carenciaLeiteDias,
      carenciaCarneDias: tratamentos.carenciaCarneDias,
      ultimoInicio: max(tratamentos.dataInicio),
    })
    .from(tratamentos)
    .where(daFazenda(tratamentos))
    .groupBy(tratamentos.medicamento)
    .orderBy(desc(max(tratamentos.dataInicio)), desc(max(tratamentos.createdAt)));

  const ultimo = usos.find((uso) => normalizarTexto(uso.medicamento) === alvo);
  if (!ultimo) return null;
  return {
    dose: ultimo.dose,
    carenciaLeiteDias: ultimo.carenciaLeiteDias,
    carenciaCarneDias: ultimo.carenciaCarneDias,
  };
}

/**
 * Grava o tratamento com o aviso fixo de AVISO_DOSE_MINUTOS_ANTES. Recusa agenda
 * inválida (ver `errosDaAgenda`).
 */
export async function createTratamento(
  input: Omit<NovoTratamento, 'avisoMinutosAntes'>
): Promise<Tratamento> {
  const valores = { ...input, avisoMinutosAntes: AVISO_DOSE_MINUTOS_ANTES };
  const erros = errosDaAgenda({
    dataInicio: valores.dataInicio,
    dataFim: valores.dataFim ?? null,
    diasSemana: valores.diasSemana ?? TODOS_OS_DIAS,
    horario: valores.horario ?? null,
    intervaloHoras: valores.intervaloHoras ?? null,
    avisoMinutosAntes: valores.avisoMinutosAntes,
  });
  if (erros.length > 0) throw new Error(erros.join('; '));
  // Sem chave estrangeira no banco do sync: confere o animal na fazenda
  const [animal] = await db
    .select({ id: animais.id })
    .from(animais)
    .where(and(daFazenda(animais), eq(animais.id, valores.animalId)))
    .limit(1);
  if (!animal) throw new Error('Animal não encontrado');

  const [created] = await db.insert(tratamentos).values(novoRegistro(valores)).returning();
  return created;
}

/**
 * Muda o último dia do tratamento (estender ou encerrar antes). Recusa fim antes
 * do início ou período sem nenhum dia de dose.
 */
export async function alterarFimDoTratamento(
  tratamento: Tratamento,
  dataFim: Date
): Promise<void> {
  const fim = inicioDoDia(dataFim);
  const erros = errosDaAgenda({ ...tratamento, dataFim: fim });
  if (erros.length > 0) throw new Error(erros.join('; '));

  await db.update(tratamentos).set(atualizar({ dataFim: fim })).where(eq(tratamentos.id, tratamento.id));
}
