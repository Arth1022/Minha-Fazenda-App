import type { DoseConfirmada, Pesagem, PesoAtual, Tratamento } from '@/dtos';
import { adicionarDias, diasEntre, inicioDoDia } from '@/utils/date';
import { diasComDose, minutosDasDoses } from './doses';

/** Gestação média da vaca, em dias. */
export const GESTACAO_DIAS = 283;

/** Última pesagem e o ganho de peso desde a anterior. */
export function calcularPesoAtual(pesagens: Pesagem[]): PesoAtual | null {
  if (pesagens.length === 0) return null;
  const ordenadas = [...pesagens].sort((a, b) => b.data.getTime() - a.data.getTime());
  const [atual, anterior] = ordenadas;
  return {
    pesoKg: atual.pesoKg,
    data: atual.data,
    ganhoKg: anterior ? Number((atual.pesoKg - anterior.pesoKg).toFixed(1)) : null,
    diasDesdeAnterior: anterior ? diasEntre(anterior.data, atual.data) : null,
  };
}

/** Previsão de parto: data da cobertura + 283 dias. */
export function calcularPrevisaoParto(dataCobertura: Date): Date {
  return adicionarDias(dataCobertura, GESTACAO_DIAS);
}

/**
 * Dia da última aplicação: o último dia confirmado; sem confirmação, o último
 * dia agendado (com fim: o fim; sem fim: até hoje). Null se ainda não começou.
 */
function ultimaAplicacao(tratamento: Tratamento, diasConfirmados: Date[], hoje: Date): Date | null {
  if (diasConfirmados.length > 0) {
    return new Date(Math.max(...diasConfirmados.map((d) => inicioDoDia(d).getTime())));
  }
  const agendados = diasComDose(tratamento, hoje);
  return agendados.length > 0 ? agendados[agendados.length - 1].dia : null;
}

/**
 * Fim da carência de um tratamento: dia da última aplicação, no horário da
 * última dose daquele dia (meia-noite se não tem horário), + dias de carência.
 * A carência no leite só conta se a fazenda produz leite. Null se o tratamento
 * não tem carência ou ainda não começou.
 */
export function fimDaCarencia(
  tratamento: Tratamento,
  produzLeite: boolean,
  diasConfirmados: Date[] = [],
  hoje = new Date()
): Date | null {
  const dias = Math.max(
    tratamento.carenciaCarneDias ?? 0,
    produzLeite ? tratamento.carenciaLeiteDias ?? 0 : 0
  );
  if (dias <= 0) return null;
  const ultima = ultimaAplicacao(tratamento, diasConfirmados, hoje);
  if (!ultima) return null;
  const fim = adicionarDias(ultima, dias);
  const minutos = minutosDasDoses(tratamento).at(-1) ?? 0;
  fim.setHours(Math.floor(minutos / 60), minutos % 60);
  return fim;
}

/**
 * Até quando o animal está em carência (null se não está em carência hoje).
 * `dosesConfirmadas` são os dias aplicados (de `diasConfirmadosDoAnimal`).
 */
export function carenciaAte(
  tratamentos: Tratamento[],
  produzLeite: boolean,
  hoje = new Date(),
  dosesConfirmadas: DoseConfirmada[] = []
): Date | null {
  let ate: Date | null = null;
  for (const tratamento of tratamentos) {
    const dias = dosesConfirmadas.filter((d) => d.tratamentoId === tratamento.id).map((d) => d.dia);
    const fim = fimDaCarencia(tratamento, produzLeite, dias, hoje);
    if (fim && fim.getTime() >= inicioDoDia(hoje).getTime()) {
      if (!ate || fim.getTime() > ate.getTime()) ate = fim;
    }
  }
  return ate;
}
