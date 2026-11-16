import type { ControleLeiteiro } from '@/database';

// Linhas das tabelas de registros do animal: inferidas pelo Drizzle no schema, só reexportadas
export type {
  AnotacaoAnimal,
  AvaliacaoCorporal,
  Cio,
  ControleLeiteiro,
  Exame,
  Mastite,
  MetodoDiagnostico,
  MetodoPesagem,
  NovaMastite,
  NovoControleLeiteiro,
  NovoExame,
  ResultadoExame,
  Secagem,
  Teto,
  TipoExame,
  TipoMastite,
} from '@/database';

/** Saída de `resumoDoLeite`: a lactação atual da vaca. */
export interface ResumoLeite {
  /** Litros do controle leiteiro mais recente (null sem controle) */
  ultimoLitros: number | null;
  ultimoControle: Date | null;
  /** Média dos controles dos últimos 30 dias (null sem controle no período) */
  media30Dias: number | null;
  /** Lactação atual: 1ª, 2ª... (número de partos); null se nunca pariu */
  numeroLactacao: number | null;
  /** Dias em lactação desde o último parto (null se seca ou sem parto no app) */
  diasEmLactacao: number | null;
  /** Secagem depois do último parto (null se está em lactação) */
  secaDesde: Date | null;
}

/** Um controle leiteiro no histórico, com a diferença para o anterior. */
export interface LinhaDoHistoricoDeLeite {
  controle: ControleLeiteiro;
  /** Litros a mais (ou a menos) que no controle anterior (null no primeiro) */
  variacaoL: number | null;
  /** Dias desde o controle anterior (null no primeiro) */
  dias: number | null;
}

/** Saída de `historicoDeLeite`: todos os controles e as métricas da folha "Leite". */
export interface HistoricoDeLeite {
  /** Do mais recente para o mais antigo */
  linhas: LinhaDoHistoricoDeLeite[];
  /** Litros do controle mais recente (null sem controle) */
  ultimoLitros: number | null;
  /** Média dos controles dos últimos 30 dias (null sem controle no período) */
  media30Dias: number | null;
}

/** Saída de `indicesReprodutivos`: números da vida reprodutiva da fêmea. */
export interface IndicesReprodutivos {
  /** Idade ao primeiro parto registrado no app, em meses (null sem nascimento ou parto) */
  idadePrimeiroPartoMeses: number | null;
  /** Média de dias entre partos (IEP; null com menos de dois partos) */
  intervaloEntrePartosDias: number | null;
  /** Coberturas/inseminações por prenhez confirmada (null sem prenhez) */
  coberturasPorPrenhez: number | null;
}

export type StatusExame = 'emDia' | 'venceLogo' | 'vencido' | 'semValidade';

/** Saída de `situacaoDoExame`. */
export interface SituacaoExame {
  status: StatusExame;
  /** Dia em que o exame vence (null se não tem validade) */
  venceEm: Date | null;
}
