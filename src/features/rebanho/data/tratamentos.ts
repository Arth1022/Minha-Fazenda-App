import { desc, eq, isNotNull, max, or } from 'drizzle-orm';

import { db, tratamentos } from '@/database';
import type { NovoTratamento, Tratamento, UltimoUsoMedicamento } from '@/dtos';
import { normalizarTexto } from '@/utils';
import { errosDaAgenda, TODOS_OS_DIAS } from '../services/doses';

/** Tratamentos do animal, do início mais recente para o mais antigo. */
export function tratamentosDoAnimal(animalId: string) {
  return db
    .select()
    .from(tratamentos)
    .where(eq(tratamentos.animalId, animalId))
    .orderBy(desc(tratamentos.dataInicio));
}

/** Tratamentos com carência informada (para os alertas da lista do rebanho). */
export function tratamentosComCarencia() {
  return db
    .select()
    .from(tratamentos)
    .where(
      or(
        isNotNull(tratamentos.carenciaLeiteDias),
        isNotNull(tratamentos.carenciaCarneDias)
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

  // O lower() do SQLite ignora acentos fora do ASCII; por isso a comparação é feita aqui
  const usos = await db
    .select({
      medicamento: tratamentos.medicamento,
      dose: tratamentos.dose,
      carenciaLeiteDias: tratamentos.carenciaLeiteDias,
      carenciaCarneDias: tratamentos.carenciaCarneDias,
    })
    .from(tratamentos)
    .orderBy(desc(tratamentos.dataInicio), desc(tratamentos.createdAt));

  const ultimo = usos.find((uso) => normalizarTexto(uso.medicamento) === alvo);
  if (!ultimo) return null;
  return {
    dose: ultimo.dose,
    carenciaLeiteDias: ultimo.carenciaLeiteDias,
    carenciaCarneDias: ultimo.carenciaCarneDias,
  };
}

/** Grava o tratamento. Recusa agenda inválida (ver `errosDaAgenda`). */
export async function createTratamento(
  input: NovoTratamento
): Promise<Tratamento> {
  const erros = errosDaAgenda({
    dataInicio: input.dataInicio,
    dataFim: input.dataFim ?? null,
    diasSemana: input.diasSemana ?? TODOS_OS_DIAS,
    horario: input.horario ?? null,
    intervaloHoras: input.intervaloHoras ?? null,
    avisoMinutosAntes: input.avisoMinutosAntes ?? 0,
  });
  if (erros.length > 0) throw new Error(erros.join('; '));

  const [created] = await db.insert(tratamentos).values(input).returning();
  return created;
}

/**
 * Marca ou desmarca a dose de um dia, mantendo os dias ordenados.
 * @deprecated use `confirmarDia` / `desfazerDia` (data/doses), que gravam em doses_aplicadas.
 */
export async function toggleDiaConfirmado(
  tratamento: Tratamento,
  dia: number
): Promise<void> {
  const atuais = tratamento.diasConfirmados;
  const diasConfirmados = atuais.includes(dia)
    ? atuais.filter((d) => d !== dia)
    : [...atuais, dia].sort((a, b) => a - b);

  await db
    .update(tratamentos)
    .set({ diasConfirmados })
    .where(eq(tratamentos.id, tratamento.id));
}
