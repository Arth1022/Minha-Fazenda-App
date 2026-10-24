import { desc, eq, isNotNull, or } from 'drizzle-orm';

import {
  db,
  tratamentos,
  type NovoTratamento,
  type Tratamento,
} from '@/database';
import { normalizarTexto } from '@/utils';

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

export type UltimoUsoMedicamento = Pick<
  Tratamento,
  'dose' | 'carenciaLeiteDias' | 'carenciaCarneDias'
>;

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

export async function createTratamento(
  input: NovoTratamento
): Promise<Tratamento> {
  const [created] = await db.insert(tratamentos).values(input).returning();
  return created;
}

/** Marca ou desmarca a dose de um dia, mantendo os dias ordenados. */
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
