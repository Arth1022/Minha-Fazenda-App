import type { MetodoPesagem, Pesagem } from '@/database';

/** Entrada de `registrarPesagem`: peso e/ou escore corporal do dia. */
export interface DadosPesagem {
  animalId: string;
  data: Date;
  /** Null: só o escore (sem balança nem fita) */
  pesoKg?: number | null;
  metodo?: MetodoPesagem;
  /** Escore de condição corporal, 1 a 5 de meio em meio ponto */
  escore?: number | null;
}

// Linhas da tabela: inferidas pelo Drizzle no schema, só reexportadas
export type { NovaPesagem, Pesagem } from '@/database';

/** Saída de `calcularPesoAtual`: última pesagem e o ganho desde a anterior. */
export interface PesoAtual {
  pesoKg: number;
  data: Date;
  /** Diferença para a pesagem anterior (null se é a primeira) */
  ganhoKg: number | null;
  /** Dias desde a pesagem anterior (null se é a primeira) */
  diasDesdeAnterior: number | null;
}

/** Uma pesagem do histórico com a variação desde a anterior. */
export interface LinhaDoHistoricoDePeso {
  pesagem: Pesagem;
  /** Diferença para a pesagem anterior (null na primeira) */
  variacaoKg: number | null;
  /** Dias desde a pesagem anterior (null na primeira) */
  dias: number | null;
}

/** Saída de `historicoDePeso`: todas as pesagens e as métricas do período. */
export interface HistoricoDePeso {
  /** Da mais recente para a mais antiga */
  linhas: LinhaDoHistoricoDePeso[];
  /** Ganho da primeira até a última pesagem (null com menos de duas) */
  ganhoTotalKg: number | null;
  /** Dias entre a primeira e a última pesagem (null com menos de duas) */
  periodoDias: number | null;
  /** Ganho médio diário no período, kg/dia (null sem pelo menos um dia entre as pesagens) */
  gmdKg: number | null;
}

/** Linha de `pesosAtuais`: a pesagem mais recente de cada animal. */
export type UltimaPesagem = Pick<Pesagem, 'animalId' | 'pesoKg'> & { data: Date | null };
