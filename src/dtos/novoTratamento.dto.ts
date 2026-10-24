import type { DiaSemana } from './notificacoes.dto';

/** Agenda de doses ainda sendo preenchida no formulário "Novo Tratamento" (entrada de `resumoDaAgenda`). */
export interface AgendaEmEdicao {
  medicamento: string;
  dose: string;
  /** Dias com dose, 1 = domingo ... 7 = sábado */
  diasSemana: DiaSemana[];
  /** Horário da (primeira) dose do dia, "HH:mm" */
  horario: string;
  /** De quantas em quantas horas repetir no dia; 24 = uma vez por dia */
  intervaloHoras: number;
  /** Antecedência do aviso, em minutos (0 = na hora da dose) */
  avisoMinutosAntes: number;
  comecaEm: Date;
  ate: Date;
  /** Tratamento contínuo: sem data de fim (`ate` é ignorado) */
  semFim: boolean;
}
