import type {
  DoseConfirmada,
  HistoricoDePeso,
  IndicesReprodutivos,
  Pesagem,
  PesoAtual,
  Reproducao,
  Tratamento,
} from '@/dtos';
import { adicionarDias, diasEntre, inicioDoDia } from '@/utils/date';
import { diasComDose, minutosDasDoses } from './doses';
import { idadeEmMeses } from './fase';

/** Gestação média da vaca, em dias. */
export const GESTACAO_DIAS = 283;

/** Ciclo do cio da vaca, em dias. */
export const CICLO_CIO_DIAS = 21;
/** Cio mais antigo que isso não serve para prever o próximo (a vaca pode ter emprenhado). */
const CIO_VALIDO_DIAS = 90;

type CoberturaParaFicha = Pick<Reproducao, 'dataParto' | 'prenhezConfirmada' | 'dataAborto'>;

/**
 * Cobertura mais recente que ainda espera o parto (a lista vem da mais
 * recente): sem parto, sem "não pegou" e sem aborto.
 */
export function coberturaEmAberto<T extends CoberturaParaFicha>(reproducoes: T[]): T | null {
  return (
    reproducoes.find((r) => !r.dataParto && r.prenhezConfirmada !== false && !r.dataAborto) ?? null
  );
}

export interface DadosIndicesReprodutivos {
  dataNascimento: Date | null;
  /** Datas dos partos registrados no app (nascimento das crias) */
  partos: Date[];
  /** Crias de antes do app: o primeiro parto real é desconhecido */
  criasAnteriores: number;
  reproducoes: Pick<Reproducao, 'prenhezConfirmada' | 'dataParto'>[];
}

/**
 * Índices da vida reprodutiva da fêmea: idade ao primeiro parto, intervalo
 * médio entre partos (IEP) e coberturas por prenhez.
 */
export function indicesReprodutivos({
  dataNascimento,
  partos,
  criasAnteriores,
  reproducoes,
}: DadosIndicesReprodutivos): IndicesReprodutivos {
  const ordenados = [...partos].sort((a, b) => a.getTime() - b.getTime());
  const intervalos = ordenados.slice(1).map((parto, i) => diasEntre(ordenados[i], parto));
  const prenhezes = reproducoes.filter((r) => r.prenhezConfirmada === true || r.dataParto).length;

  return {
    idadePrimeiroPartoMeses:
      dataNascimento && ordenados.length > 0 && criasAnteriores === 0
        ? idadeEmMeses(dataNascimento, ordenados[0])
        : null,
    intervaloEntrePartosDias:
      intervalos.length > 0
        ? Math.round(intervalos.reduce((soma, d) => soma + d, 0) / intervalos.length)
        : null,
    coberturasPorPrenhez:
      prenhezes > 0 ? Number((reproducoes.length / prenhezes).toFixed(1)) : null,
  };
}

/**
 * Próximo cio previsto (ciclo de 21 dias) a partir do último observado, de hoje
 * em diante. Null sem cio ou com o último cio velho demais para prever.
 */
export function proximoCio(cios: Date[], hoje = new Date()): Date | null {
  if (cios.length === 0) return null;
  const ultimo = new Date(Math.max(...cios.map((d) => d.getTime())));
  if (diasEntre(ultimo, hoje) > CIO_VALIDO_DIAS) return null;
  let proximo = adicionarDias(inicioDoDia(ultimo), CICLO_CIO_DIAS);
  while (proximo.getTime() < inicioDoDia(hoje).getTime()) {
    proximo = adicionarDias(proximo, CICLO_CIO_DIAS);
  }
  return proximo;
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

/**
 * Histórico do peso com as métricas do período inteiro (não só a última
 * variação): ganho total da primeira à última pesagem e o GMD (ganho médio
 * diário = ganho total / dias entre elas).
 */
export function historicoDePeso(pesagens: Pesagem[]): HistoricoDePeso {
  const ordenadas = [...pesagens].sort((a, b) => b.data.getTime() - a.data.getTime());
  const linhas = ordenadas.map((pesagem, i) => {
    const anterior = ordenadas[i + 1];
    return {
      pesagem,
      variacaoKg: anterior ? Number((pesagem.pesoKg - anterior.pesoKg).toFixed(1)) : null,
      dias: anterior ? diasEntre(anterior.data, pesagem.data) : null,
    };
  });

  const ultima = ordenadas[0];
  const primeira = ordenadas[ordenadas.length - 1];
  if (ordenadas.length < 2) {
    return { linhas, ganhoTotalKg: null, periodoDias: null, gmdKg: null };
  }
  const ganhoTotalKg = Number((ultima.pesoKg - primeira.pesoKg).toFixed(1));
  const periodoDias = diasEntre(primeira.data, ultima.data);
  return {
    linhas,
    ganhoTotalKg,
    periodoDias,
    gmdKg: periodoDias > 0 ? Number((ganhoTotalKg / periodoDias).toFixed(2)) : null,
  };
}

/** Escore de condição corporal válido: de 1 a 5, de meio em meio ponto. */
export function escoreValido(escore: number): boolean {
  return escore >= 1 && escore <= 5 && Number.isInteger(escore * 2);
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
