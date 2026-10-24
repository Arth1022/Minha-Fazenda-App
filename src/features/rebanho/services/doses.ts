import type {
  AgendaDoTratamento,
  DiaDeDose,
  DoseAgendada,
  DosePendente,
} from '@/dtos';
import { parseHorario } from '@/services/notificacoes/gatilhos';
import { adicionarDias, diasEntre, inicioDoDia } from '@/utils/date';

/** Dias da semana no padrão do expo-notifications: 1 = domingo ... 7 = sábado. */
export const TODOS_OS_DIAS = [1, 2, 3, 4, 5, 6, 7];

const MINUTOS_NO_DIA = 24 * 60;

type Periodo = Pick<AgendaDoTratamento, 'dataInicio' | 'dataFim'>;
type Calendario = Pick<AgendaDoTratamento, 'dataInicio' | 'dataFim' | 'diasSemana'>;
type Horarios = Pick<AgendaDoTratamento, 'horario' | 'intervaloHoras'>;

/** Dia da semana da data no padrão 1 = domingo ... 7 = sábado. */
export function diaDaSemana(data: Date): number {
  return data.getDay() + 1;
}

/** Último dia do tratamento: `dataFim`, ou o próprio início quando é dose única. */
export function ultimoDia(agenda: Periodo): Date {
  return inicioDoDia(agenda.dataFim ?? agenda.dataInicio);
}

/** Problemas da agenda, em texto para o formulário. Lista vazia = agenda válida. */
export function errosDaAgenda(agenda: AgendaDoTratamento): string[] {
  const erros: string[] = [];
  const { diasSemana, horario, intervaloHoras, avisoMinutosAntes, dataInicio, dataFim } = agenda;

  const diasValidos = diasSemana.every((d) => Number.isInteger(d) && d >= 1 && d <= 7);
  if (diasSemana.length === 0 || !diasValidos || new Set(diasSemana).size !== diasSemana.length) {
    erros.push('Escolha os dias da semana da dose');
  }
  if (horario !== null && !parseHorario(horario)) {
    erros.push('Horário inválido');
  }
  if (intervaloHoras !== null) {
    const divideODia =
      Number.isInteger(intervaloHoras) && intervaloHoras >= 1 && intervaloHoras < 24 && 24 % intervaloHoras === 0;
    if (!divideODia) {
      erros.push('O intervalo precisa dividir o dia (1, 2, 3, 4, 6, 8 ou 12 horas)');
    } else if (horario === null) {
      erros.push('Informe o horário da primeira dose para repetir no dia');
    } else if (diasSemana.length !== 7) {
      erros.push('Repetir no dia só vale para tratamento todos os dias');
    }
  }
  if (!Number.isInteger(avisoMinutosAntes) || avisoMinutosAntes < 0) {
    erros.push('Antecedência do aviso inválida');
  }
  if (dataFim && inicioDoDia(dataFim).getTime() < inicioDoDia(dataInicio).getTime()) {
    erros.push('O fim do tratamento é antes do início');
  } else if (erros.length === 0 && diasComDose(agenda).length === 0) {
    erros.push('Nenhum dia de dose no período escolhido');
  }
  return erros;
}

/**
 * Dias com dose no período, na ordem. O índice é o "dia N" em dias corridos:
 * seg/qua/sex começando numa segunda → 1, 3, 5, 8, 10, 12.
 */
export function diasComDose(agenda: Calendario): DiaDeDose[] {
  const inicio = inicioDoDia(agenda.dataInicio);
  const total = diasEntre(inicio, ultimoDia(agenda));
  const dias: DiaDeDose[] = [];
  for (let i = 0; i <= total; i++) {
    const dia = adicionarDias(inicio, i);
    if (agenda.diasSemana.includes(diaDaSemana(dia))) dias.push({ indice: i + 1, dia });
  }
  return dias;
}

/** O dia é um dia de dose do tratamento? */
export function ehDiaDeDose(agenda: Calendario, data: Date): boolean {
  const dia = inicioDoDia(data).getTime();
  return diasComDose(agenda).some((d) => d.dia.getTime() === dia);
}

/**
 * Horários das doses num dia, em minutos desde a meia-noite, em ordem. Com
 * intervalo, são 24/intervalo doses a partir do horário, dando a volta no
 * relógio (20:00 de 8 em 8 h → 04:00, 12:00, 20:00). Sem horário: nenhum.
 */
export function minutosDasDoses(agenda: Horarios): number[] {
  const inicio = agenda.horario ? parseHorario(agenda.horario) : null;
  if (!inicio) return [];
  const base = inicio.hora * 60 + inicio.minuto;
  const passo = agenda.intervaloHoras ? agenda.intervaloHoras * 60 : MINUTOS_NO_DIA;
  const minutos: number[] = [];
  for (let m = 0; m < MINUTOS_NO_DIA; m += passo) minutos.push((base + m) % MINUTOS_NO_DIA);
  return minutos.sort((a, b) => a - b);
}

/** Momentos das doses no dia (vazio se o tratamento não tem horário). */
export function horariosDoDia(agenda: Horarios, dia: Date): Date[] {
  return minutosDasDoses(agenda).map(
    (m) => new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(m / 60), m % 60)
  );
}

/**
 * As próximas `n` doses a partir de `desde`, confirmadas ou não. Dose sem horário
 * vale pelo dia inteiro: a de hoje continua na lista depois da meia-noite.
 */
export function proximasDoses(agenda: AgendaDoTratamento, desde: Date, n: number): DoseAgendada[] {
  const doses: DoseAgendada[] = [];
  const hoje = inicioDoDia(desde).getTime();
  for (const { indice, dia } of diasComDose(agenda)) {
    if (doses.length >= n) break;
    if (dia.getTime() < hoje) continue;
    const horarios = horariosDoDia(agenda, dia);
    if (horarios.length === 0) {
      doses.push({ indice, dia, momento: dia, semHorario: true });
      continue;
    }
    for (const momento of horarios) {
      if (momento.getTime() >= desde.getTime() && doses.length < n) {
        doses.push({ indice, dia, momento, semHorario: false });
      }
    }
  }
  return doses;
}

/**
 * Próximo dia com dose ainda não confirmada, de hoje em diante (o dia de hoje
 * conta mesmo depois do horário). Null quando acabou ou está tudo confirmado.
 */
export function proximaDosePendente(
  agenda: AgendaDoTratamento,
  diasConfirmados: Date[],
  agora = new Date()
): DosePendente | null {
  const confirmados = new Set(diasConfirmados.map((d) => inicioDoDia(d).getTime()));
  const hoje = inicioDoDia(agora).getTime();
  const pendente = diasComDose(agenda).find(
    ({ dia }) => dia.getTime() >= hoje && !confirmados.has(dia.getTime())
  );
  if (!pendente) return null;
  return { ...pendente, horarios: horariosDoDia(agenda, pendente.dia) };
}

/** Tratamentos em andamento hoje (entre o início e o último dia, inclusive). */
export function tratamentosAtivos<T extends Periodo>(tratamentos: T[], hoje = new Date()): T[] {
  const dia = inicioDoDia(hoje).getTime();
  return tratamentos.filter(
    (t) => inicioDoDia(t.dataInicio).getTime() <= dia && dia <= ultimoDia(t).getTime()
  );
}
