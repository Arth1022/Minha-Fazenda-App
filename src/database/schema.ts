import { relations } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  index,
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

import { newId } from './id';

/**
 * Fonte única das tabelas e dos tipos do banco local.
 *
 * Convenções (preparadas para um sync futuro):
 * - `id`: UUID em texto gerado no app (sem autoincrement);
 * - datas: epoch em milissegundos (integer), lidas como `Date`;
 * - `created_at` / `updated_at` em todas as tabelas; `updated_at` é renovado em todo update;
 * - arrays: JSON em coluna de texto;
 * - `criado_por`: preenchido quando o login existir (sprint de sincronização).
 */

const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => newId());

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};

const criadoPor = () => text('criado_por');

export const TIPOS_PRODUCAO = ['leite', 'corte', 'misto'] as const;
export type TipoProducao = (typeof TIPOS_PRODUCAO)[number];

export const SEXOS = ['F', 'M'] as const;
export type Sexo = (typeof SEXOS)[number];

export const ORIGENS = ['nascido', 'comprado'] as const;
export type Origem = (typeof ORIGENS)[number];

export const STATUS_ANIMAL = ['ativo', 'vendido', 'morto', 'descarte'] as const;
export type StatusAnimal = (typeof STATUS_ANIMAL)[number];

export const TIPOS_REPRODUCAO = ['cobertura', 'inseminacao'] as const;
export type TipoReproducao = (typeof TIPOS_REPRODUCAO)[number];

export const PERIODOS_ORDENHA = ['manha', 'tarde', 'noite'] as const;
export type PeriodoOrdenha = (typeof PERIODOS_ORDENHA)[number];

/** Configuração única da fazenda (uma linha). */
export const fazendaConfig = sqliteTable('fazenda_config', {
  id: id(),
  tipoProducao: text('tipo_producao', { enum: TIPOS_PRODUCAO }).notNull(),
  ...timestamps,
});

export const lotes = sqliteTable('lotes', {
  id: id(),
  nome: text('nome').notNull(),
  ...timestamps,
});

export const animais = sqliteTable(
  'animais',
  {
    id: id(),
    brinco: text('brinco').notNull(),
    nome: text('nome'),
    raca: text('raca'),
    // Rebanhos cadastrados antes deste campo eram só de fêmeas (vacas/novilhas)
    sexo: text('sexo', { enum: SEXOS }).notNull().default('F'),
    dataNascimento: integer('data_nascimento', { mode: 'timestamp_ms' }),
    /** true quando o produtor informou só a idade aproximada */
    nascimentoAproximado: integer('nascimento_aproximado', { mode: 'boolean' })
      .notNull()
      .default(false),
    /**
     * Já pariu antes de entrar no app (ex.: vaca comprada adulta). Sem isso, uma
     * fêmea sem cria registrada ficaria novilha para sempre.
     */
    jaPariu: integer('ja_pariu', { mode: 'boolean' }).notNull().default(false),
    maeId: text('mae_id').references((): AnySQLiteColumn => animais.id, {
      onDelete: 'set null',
    }),
    origem: text('origem', { enum: ORIGENS }),
    dataEntrada: integer('data_entrada', { mode: 'timestamp_ms' }),
    status: text('status', { enum: STATUS_ANIMAL }).notNull().default('ativo'),
    dataSaida: integer('data_saida', { mode: 'timestamp_ms' }),
    motivoSaida: text('motivo_saida'),
    loteId: text('lote_id').references(() => lotes.id, { onDelete: 'set null' }),
    /** Leite estimado por dia (litros), informado pelo produtor; opcional */
    producaoLeiteL: real('producao_leite_l'),
    /** Ração por dia (kg), informada pelo produtor; opcional */
    racaoKgDia: real('racao_kg_dia'),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [
    index('animais_brinco_idx').on(table.brinco),
    index('animais_mae_id_idx').on(table.maeId),
    index('animais_lote_id_idx').on(table.loteId),
  ]
);

export const pesagens = sqliteTable(
  'pesagens',
  {
    id: id(),
    animalId: text('animal_id')
      .notNull()
      .references(() => animais.id, { onDelete: 'cascade' }),
    data: integer('data', { mode: 'timestamp_ms' }).notNull(),
    pesoKg: real('peso_kg').notNull(),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [index('pesagens_animal_id_idx').on(table.animalId)]
);

export const reproducoes = sqliteTable(
  'reproducoes',
  {
    id: id(),
    animalId: text('animal_id')
      .notNull()
      .references(() => animais.id, { onDelete: 'cascade' }),
    tipo: text('tipo', { enum: TIPOS_REPRODUCAO }).notNull(),
    data: integer('data', { mode: 'timestamp_ms' }).notNull(),
    prenhezConfirmada: integer('prenhez_confirmada', { mode: 'boolean' }),
    previsaoParto: integer('previsao_parto', { mode: 'timestamp_ms' }),
    dataParto: integer('data_parto', { mode: 'timestamp_ms' }),
    criaId: text('cria_id').references(() => animais.id, { onDelete: 'set null' }),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [index('reproducoes_animal_id_idx').on(table.animalId)]
);

export const tratamentos = sqliteTable(
  'tratamentos',
  {
    id: id(),
    animalId: text('animal_id')
      .notNull()
      .references(() => animais.id, { onDelete: 'cascade' }),
    medicamento: text('medicamento').notNull(),
    dose: text('dose'),
    dataInicio: integer('data_inicio', { mode: 'timestamp_ms' }).notNull(),
    dataFim: integer('data_fim', { mode: 'timestamp_ms' }),
    diasConfirmados: text('dias_confirmados', { mode: 'json' })
      .$type<number[]>()
      .notNull()
      .$defaultFn(() => []),
    proximaDoseEm: integer('proxima_dose_em', { mode: 'timestamp_ms' }),
    notificacaoAtiva: integer('notificacao_ativa', { mode: 'boolean' })
      .notNull()
      .default(true),
    carenciaLeiteDias: integer('carencia_leite_dias'),
    carenciaCarneDias: integer('carencia_carne_dias'),
    /** Liga os tratamentos aplicados em vários animais de uma vez */
    grupoAplicacaoId: text('grupo_aplicacao_id'),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [
    index('tratamentos_animal_id_idx').on(table.animalId),
    index('tratamentos_grupo_aplicacao_id_idx').on(table.grupoAplicacaoId),
  ]
);

export const ordenhas = sqliteTable('ordenhas', {
  id: id(),
  periodo: text('periodo', { enum: PERIODOS_ORDENHA }).notNull(),
  horarioPrevisto: text('horario_previsto'),
  horarioNotificacao: text('horario_notificacao'),
  volumeLitros: real('volume_litros'),
  dataRegistro: integer('data_registro', { mode: 'timestamp_ms' }).notNull(),
  ...timestamps,
});

export const ENTIDADES_NOTIFICACAO = ['animal', 'ordenha'] as const;
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
    id: id(),
    entidade: text('entidade', { enum: ENTIDADES_NOTIFICACAO }).notNull(),
    /** Id do animal ou período da ordenha ('manha', 'tarde', 'noite') */
    entidadeId: text('entidade_id').notNull(),
    /** Data do disparo; null nas recorrentes (ex.: ordenha diária) */
    disparaEm: integer('dispara_em', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (table) => [
    index('notificacoes_agendadas_entidade_idx').on(table.entidade, table.entidadeId),
  ]
);

export const lotesRelations = relations(lotes, ({ many }) => ({
  animais: many(animais),
}));

export const animaisRelations = relations(animais, ({ one, many }) => ({
  mae: one(animais, {
    fields: [animais.maeId],
    references: [animais.id],
    relationName: 'mae_crias',
  }),
  crias: many(animais, { relationName: 'mae_crias' }),
  lote: one(lotes, { fields: [animais.loteId], references: [lotes.id] }),
  pesagens: many(pesagens),
  reproducoes: many(reproducoes, { relationName: 'reproducoes_da_mae' }),
  tratamentos: many(tratamentos),
}));

export const pesagensRelations = relations(pesagens, ({ one }) => ({
  animal: one(animais, { fields: [pesagens.animalId], references: [animais.id] }),
}));

export const reproducoesRelations = relations(reproducoes, ({ one }) => ({
  animal: one(animais, {
    fields: [reproducoes.animalId],
    references: [animais.id],
    relationName: 'reproducoes_da_mae',
  }),
  cria: one(animais, { fields: [reproducoes.criaId], references: [animais.id] }),
}));

export const tratamentosRelations = relations(tratamentos, ({ one }) => ({
  animal: one(animais, {
    fields: [tratamentos.animalId],
    references: [animais.id],
  }),
}));

export type FazendaConfig = typeof fazendaConfig.$inferSelect;
export type Lote = typeof lotes.$inferSelect;
export type NovoLote = typeof lotes.$inferInsert;
export type Animal = typeof animais.$inferSelect;
export type NovoAnimal = typeof animais.$inferInsert;
export type Pesagem = typeof pesagens.$inferSelect;
export type NovaPesagem = typeof pesagens.$inferInsert;
export type Reproducao = typeof reproducoes.$inferSelect;
export type NovaReproducao = typeof reproducoes.$inferInsert;
export type Tratamento = typeof tratamentos.$inferSelect;
export type NovoTratamento = typeof tratamentos.$inferInsert;
export type Ordenha = typeof ordenhas.$inferSelect;
export type NovaOrdenha = typeof ordenhas.$inferInsert;
export type NotificacaoAgendadaRow = typeof notificacoesAgendadas.$inferSelect;
