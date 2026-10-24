import type { Pesagem } from '@/database';

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

/** Linha de `pesosAtuais`: a pesagem mais recente de cada animal. */
export type UltimaPesagem = Pick<Pesagem, 'animalId' | 'pesoKg'> & { data: Date | null };
