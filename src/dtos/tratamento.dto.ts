import type { DoseAplicada, Tratamento } from '@/database';

// Linhas da tabela: inferidas pelo Drizzle no schema, só reexportadas
export type { DoseAplicada, NovaDoseAplicada, NovoTratamento, Tratamento } from '@/database';

/** Saída de `ultimoUsoDoMedicamento`: o que preenche o formulário do remédio já usado. */
export type UltimoUsoMedicamento = Pick<
  Tratamento,
  'dose' | 'carenciaLeiteDias' | 'carenciaCarneDias'
>;

/**
 * Agenda do tratamento: período, dias da semana (1 = domingo ... 7 = sábado),
 * horário "HH:mm" da primeira dose do dia e repetição em horas.
 */
export type AgendaDoTratamento = Pick<
  Tratamento,
  'dataInicio' | 'dataFim' | 'diasSemana' | 'horario' | 'intervaloHoras' | 'avisoMinutosAntes'
>;

/** Um dia com dose: `indice` é o "dia N" contado em dias corridos desde o início (1 = primeiro). */
export interface DiaDeDose {
  indice: number;
  /** Meia-noite local do dia */
  dia: Date;
}

/** Uma dose no tempo (saída de `proximasDoses`). */
export interface DoseAgendada extends DiaDeDose {
  /** Momento da dose; sem horário definido, é a meia-noite do dia */
  momento: Date;
  semHorario: boolean;
}

/** Saída de `proximaDosePendente`: o próximo dia com dose ainda não confirmada. */
export interface DosePendente extends DiaDeDose {
  /** Horários das doses do dia (vazio se o tratamento não tem horário) */
  horarios: Date[];
}

/** Linha de `diasConfirmadosDoAnimal`. */
export type DoseConfirmada = Pick<DoseAplicada, 'tratamentoId' | 'dia'>;
