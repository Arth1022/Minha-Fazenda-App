import type { AgendaEmEdicao, DiaSemana } from '@/dtos';
import { adicionarDias, diasEntre, formatDiaMes } from '@/utils/date';

/** Intervalo que significa uma dose só por dia (gravado como `intervalo_horas` null). */
export const UMA_VEZ_POR_DIA = 24;

const DIA_CURTO: Record<DiaSemana, string> = {
  1: 'dom',
  2: 'seg',
  3: 'ter',
  4: 'qua',
  5: 'qui',
  6: 'sex',
  7: 'sáb',
};

/** "a", "a e b", "a, b e c". */
function listar(itens: string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

/** "hoje", "amanhã" ou "DD/MM". */
function textoDoDia(data: Date, hoje: Date): string {
  const dias = diasEntre(hoje, data);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return formatDiaMes(data);
}

/** "às 08:00" / "das 08:00", no singular para 01:xx ("à 01:00" / "da 01:00"). */
function horas(horario: string, preposicao: 'a' | 'de'): string {
  const singular = horario.startsWith('01:');
  if (preposicao === 'a') return `${singular ? 'à' : 'às'} ${horario}`;
  return `${singular ? 'da' : 'das'} ${horario}`;
}

/** "todo dia" ou os dias marcados ("seg, qua e sex"). */
function textoDosDias(diasSemana: DiaSemana[]): string {
  if (diasSemana.length === 7) return 'todo dia';
  return listar([...diasSemana].sort((a, b) => a - b).map((d) => DIA_CURTO[d]));
}

/** Dia da semana da data no padrão do expo-notifications (1 = domingo). */
function diaSemanaDe(data: Date): DiaSemana {
  return (data.getDay() + 1) as DiaSemana;
}

/** Começa e termina no mesmo dia: uma dose só. */
export function ehDoseUnica({ comecaEm, ate }: Pick<AgendaEmEdicao, 'comecaEm' | 'ate'>): boolean {
  return diasEntre(comecaEm, ate) <= 0;
}

/** Algum dos dias marcados cai entre o início e o fim? */
export function temDoseNoPeriodo({
  diasSemana,
  comecaEm,
  ate,
}: Pick<AgendaEmEdicao, 'diasSemana' | 'comecaEm' | 'ate'>): boolean {
  // Uma semana basta: depois disso os dias da semana se repetem
  const dias = Math.min(diasEntre(comecaEm, ate), 6);
  for (let i = 0; i <= dias; i++) {
    if (diasSemana.includes(diaSemanaDe(adicionarDias(comecaEm, i)))) return true;
  }
  return false;
}

/** "Aviso na hora da dose.", "Aviso 15 min antes.", "Aviso 1 h antes.", "Aviso 1 dia antes." */
export function textoDoAviso(minutos: number): string {
  if (minutos <= 0) return 'Aviso na hora da dose.';
  if (minutos % 1440 === 0) {
    const dias = minutos / 1440;
    return `Aviso ${dias === 1 ? '1 dia' : `${dias} dias`} antes.`;
  }
  if (minutos % 60 === 0) return `Aviso ${minutos / 60} h antes.`;
  return `Aviso ${minutos} min antes.`;
}

/**
 * Frase que resume a agenda enquanto o produtor preenche, por exemplo
 * "Brucelose, 2 ml: dose única hoje às 08:00. Aviso na hora da dose." ou
 * "Oxitetraciclina: a cada 12 h a partir das 08:00, de hoje até 30/10. Aviso 15 min antes."
 */
export function resumoDaAgenda(agenda: AgendaEmEdicao, hoje = new Date()): string {
  const nome = [agenda.medicamento.trim() || 'Tratamento', agenda.dose.trim()]
    .filter(Boolean)
    .join(', ');
  const inicio = textoDoDia(agenda.comecaEm, hoje);

  let quando: string;
  if (ehDoseUnica(agenda)) {
    const dia = inicio.includes('/') ? `em ${inicio}` : inicio;
    quando = `dose única ${dia} ${horas(agenda.horario, 'a')}`;
  } else {
    const repete =
      agenda.diasSemana.length === 7 && agenda.intervaloHoras < UMA_VEZ_POR_DIA;
    const vezes = repete
      ? `a cada ${agenda.intervaloHoras} h a partir ${horas(agenda.horario, 'de')}`
      : `${textoDosDias(agenda.diasSemana)} ${horas(agenda.horario, 'a')}`;
    quando = `${vezes}, de ${inicio} até ${textoDoDia(agenda.ate, hoje)}`;
  }

  return `${nome}: ${quando}. ${textoDoAviso(agenda.avisoMinutosAntes)}`;
}
