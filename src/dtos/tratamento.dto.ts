import type { Tratamento } from '@/database';

// Linhas da tabela: inferidas pelo Drizzle no schema, só reexportadas
export type { NovoTratamento, Tratamento } from '@/database';

/** Saída de `ultimoUsoDoMedicamento`: o que preenche o formulário do remédio já usado. */
export type UltimoUsoMedicamento = Pick<
  Tratamento,
  'dose' | 'carenciaLeiteDias' | 'carenciaCarneDias'
>;
