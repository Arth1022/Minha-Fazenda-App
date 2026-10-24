import type { DiaSemana } from './notificacoes.dto';

/** Período e dias da agenda ainda sendo preenchida no formulário "Novo Tratamento" (entrada de `temDoseNoPeriodo`). */
export interface AgendaEmEdicao {
  /** Dias com dose, 1 = domingo ... 7 = sábado */
  diasSemana: DiaSemana[];
  comecaEm: Date;
  ate: Date;
  /** Tratamento contínuo: sem data de fim (`ate` é ignorado) */
  semFim: boolean;
}
