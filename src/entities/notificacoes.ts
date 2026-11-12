import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { colunaId, dataHora } from './base';

export const ENTIDADES_NOTIFICACAO = ['animal', 'ordenha', 'ciclo'] as const;
export type EntidadeNotificacao = (typeof ENTIDADES_NOTIFICACAO)[number];

/**
 * Vínculo entre uma notificação agendada no aparelho e o registro que a gerou,
 * para reagendar ou cancelar tudo de um animal (ou de um turno de ordenha) de uma vez.
 * Sem chave estrangeira: a entidade varia e, ao apagar o registro, as notificações
 * precisam ser canceladas no aparelho antes (ver src/services/notificacoes).
 */
export const notificacoesAgendadas = sqliteTable(
  'notificacoes_agendadas',
  {
    /** O mesmo identificador usado no agendamento do expo-notifications */
    id: colunaId(),
    entidade: text('entidade', { enum: ENTIDADES_NOTIFICACAO }).notNull(),
    /** Id do animal ou período da ordenha ('manha', 'tarde', 'noite') */
    entidadeId: text('entidade_id').notNull(),
    /** Data do disparo; null nas recorrentes (ex.: ordenha diária) */
    disparaEm: dataHora('dispara_em'),
    criadaEm: dataHora('created_at').$defaultFn(() => new Date()),
  },
  (table) => [
    index('notificacoes_agendadas_entidade_idx').on(table.entidade, table.entidadeId),
  ]
);

export type NotificacaoAgendadaRow = typeof notificacoesAgendadas.$inferSelect;
