import type { Animal, NovaReproducao } from '@/database';

// Linhas da tabela: inferidas pelo Drizzle no schema, só reexportadas
export type { NovaReproducao, Reproducao, TipoReproducao } from '@/database';

/** Entrada de `createReproducao`: a previsão de parto é calculada na gravação. */
export type NovaCobertura = Omit<NovaReproducao, 'previsaoParto'>;

/** Linha de `ultimosPartos`: o parto mais recente de cada mãe (nascimento da cria mais nova). */
export type UltimoParto = Pick<Animal, 'maeId'> & { data: Date | null };
