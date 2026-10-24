import type { Pesagem, Tratamento } from '@/database';
import { adicionarDias, diasEntre, inicioDoDia } from '@/utils/date';

/** Gestação média da vaca, em dias. */
export const GESTACAO_DIAS = 283;

export interface PesoAtual {
  pesoKg: number;
  data: Date;
  /** Diferença para a pesagem anterior (null se é a primeira) */
  ganhoKg: number | null;
  /** Dias desde a pesagem anterior (null se é a primeira) */
  diasDesdeAnterior: number | null;
}

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
 * Último dia de carência de um tratamento: data da última aplicação (fim, ou
 * início quando não há fim) + dias de carência. A carência no leite só conta
 * se a fazenda produz leite. Retorna null se o tratamento não tem carência.
 */
export function fimDaCarencia(tratamento: Tratamento, produzLeite: boolean): Date | null {
  const dias = Math.max(
    tratamento.carenciaCarneDias ?? 0,
    produzLeite ? tratamento.carenciaLeiteDias ?? 0 : 0
  );
  if (dias <= 0) return null;
  return adicionarDias(tratamento.dataFim ?? tratamento.dataInicio, dias);
}

/** Até quando o animal está em carência (null se não está em carência hoje). */
export function carenciaAte(
  tratamentos: Tratamento[],
  produzLeite: boolean,
  hoje = new Date()
): Date | null {
  let ate: Date | null = null;
  for (const tratamento of tratamentos) {
    const fim = fimDaCarencia(tratamento, produzLeite);
    if (fim && fim.getTime() >= inicioDoDia(hoje).getTime()) {
      if (!ate || fim.getTime() > ate.getTime()) ate = fim;
    }
  }
  return ate;
}
