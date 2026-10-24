import type { AgendaEmEdicao, DiaSemana } from '@/dtos';
import { adicionarDias, diasEntre } from '@/utils/date';

/** Intervalo que significa uma dose só por dia (gravado como `intervalo_horas` null). */
export const UMA_VEZ_POR_DIA = 24;

/** Dia da semana da data no padrão do expo-notifications (1 = domingo). */
function diaSemanaDe(data: Date): DiaSemana {
  return (data.getDay() + 1) as DiaSemana;
}

/** Algum dos dias marcados cai entre o início e o fim? */
export function temDoseNoPeriodo({ diasSemana, comecaEm, ate, semFim }: AgendaEmEdicao): boolean {
  // Uma semana basta: depois disso os dias da semana se repetem
  const dias = semFim ? 6 : Math.min(diasEntre(comecaEm, ate), 6);
  for (let i = 0; i <= dias; i++) {
    if (diasSemana.includes(diaSemanaDe(adicionarDias(comecaEm, i)))) return true;
  }
  return false;
}
