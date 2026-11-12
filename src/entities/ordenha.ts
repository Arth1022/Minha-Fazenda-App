import { index, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { colunaId, colunasBase, dataHora, indiceFazenda } from './base';
import type { DadosNovos } from './escrita';

export const PERIODOS_ORDENHA = ['manha', 'tarde', 'noite'] as const;
export type PeriodoOrdenha = (typeof PERIODOS_ORDENHA)[number];

export const ordenhas = sqliteTable(
  'ordenhas',
  {
    id: colunaId(),
    periodo: text('periodo', { enum: PERIODOS_ORDENHA }).notNull(),
    horarioPrevisto: text('horario_previsto'),
    horarioNotificacao: text('horario_notificacao'),
    volumeLitros: real('volume_litros'),
    dataRegistro: dataHora('data_registro').notNull(),
    ...colunasBase,
  },
  (table) => [indiceFazenda('ordenhas', table.fazendaId), index('ordenhas_data_registro_idx').on(table.dataRegistro)]
);

export type Ordenha = typeof ordenhas.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovaOrdenha = DadosNovos<typeof ordenhas>;
