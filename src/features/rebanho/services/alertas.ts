import type { AlertaAnimal, DadosAlerta } from '@/dtos';
import { diasEntre, formatDiaMes, inicioDoDia } from '@/utils/date';
import { ehDiaDeDose, horariosDoDia, tratamentosAtivos } from './doses';
import { idadeEmMeses } from './fase';
import { carenciaAte } from './indicadores';

/** Previsão de parto a até tantos dias de hoje vira alerta. */
export const DIAS_ALERTA_PARTO = 15;
/** Novilha acima desta idade sem parto vira alerta (revisável com o produtor). */
export const IDADE_ALERTA_NOVILHA_MESES = 30;

const hhmm = (data: Date) =>
  `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;

/** Dose de hoje ainda não confirmada; o horário mostrado é o próximo do dia (ou o primeiro, se já passaram). */
function alertaDeDose({ tratamentos, dosesConfirmadas }: DadosAlerta, hoje: Date): AlertaAnimal | null {
  const dia = inicioDoDia(hoje).getTime();
  const pendente = tratamentosAtivos(tratamentos, hoje).find(
    (t) =>
      ehDiaDeDose(t, hoje) &&
      !dosesConfirmadas.some((d) => d.tratamentoId === t.id && inicioDoDia(d.dia).getTime() === dia)
  );
  if (!pendente) return null;
  const horarios = horariosDoDia(pendente, hoje);
  if (horarios.length === 0) {
    return { tipo: 'dose', texto: `Dose de hoje: ${pendente.medicamento}`, data: inicioDoDia(hoje) };
  }
  const horario = horarios.find((h) => h.getTime() >= hoje.getTime()) ?? horarios[0];
  return { tipo: 'dose', texto: `Dose pendente: ${pendente.medicamento} ${hhmm(horario)}`, data: horario };
}

/**
 * O alerta mais importante do animal (só um), por prioridade:
 * 1. carência; 2. dose de hoje pendente; 3. parto previsto em até 15 dias ou
 * atrasado; 4. novilha com mais de 30 meses sem parto.
 */
export function alertaPrincipal(dados: DadosAlerta, hoje = new Date()): AlertaAnimal | null {
  const carencia = carenciaAte(dados.tratamentos, dados.produzLeite, hoje, dados.dosesConfirmadas);
  if (carencia) {
    return { tipo: 'carencia', texto: `Em carência até ${formatDiaMes(carencia)}`, data: carencia };
  }

  const dose = alertaDeDose(dados, hoje);
  if (dose) return dose;

  const previsao = dados.coberturaAberta?.previsaoParto;
  if (previsao) {
    const faltam = diasEntre(hoje, previsao);
    if (faltam < 0) return { tipo: 'parto', texto: 'Parto atrasado', data: previsao };
    if (faltam <= DIAS_ALERTA_PARTO) {
      return { tipo: 'parto', texto: `Parto previsto ${formatDiaMes(previsao)}`, data: previsao };
    }
  }

  const nascimento = dados.animal.dataNascimento;
  if (dados.fase === 'novilha' && nascimento && idadeEmMeses(nascimento, hoje) > IDADE_ALERTA_NOVILHA_MESES) {
    return {
      tipo: 'novilha',
      texto: `Novilha com mais de ${IDADE_ALERTA_NOVILHA_MESES} meses sem parto`,
      data: null,
    };
  }
  return null;
}
