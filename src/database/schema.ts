import { relations } from 'drizzle-orm';
import {
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
 * - arrays: JSON em coluna de texto.
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

export const TIPOS_COBERTURA = ['monta_natural', 'inseminacao'] as const;
export type TipoCobertura = (typeof TIPOS_COBERTURA)[number];

export const PERIODOS_ORDENHA = ['manha', 'tarde', 'noite'] as const;
export type PeriodoOrdenha = (typeof PERIODOS_ORDENHA)[number];

export const animais = sqliteTable(
  'animais',
  {
    id: id(),
    brinco: text('brinco').notNull(),
    nome: text('nome'),
    raca: text('raca'),
    pesoKg: real('peso_kg'),
    producaoLeiteL: real('producao_leite_l'),
    crias: integer('crias').notNull().default(0),
    racaoKgDia: real('racao_kg_dia'),
    paiBrinco: text('pai_brinco'),
    maeBrinco: text('mae_brinco'),
    dataNascimento: integer('data_nascimento', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (table) => [index('animais_brinco_idx').on(table.brinco)]
);

export const coberturas = sqliteTable(
  'coberturas',
  {
    id: id(),
    animalId: text('animal_id')
      .notNull()
      .references(() => animais.id, { onDelete: 'cascade' }),
    data: integer('data', { mode: 'timestamp_ms' }).notNull(),
    tipo: text('tipo', { enum: TIPOS_COBERTURA }).notNull(),
    touroSemen: text('touro_semen'),
    ...timestamps,
  },
  (table) => [index('coberturas_animal_id_idx').on(table.animalId)]
);

export const tratamentos = sqliteTable(
  'tratamentos',
  {
    id: id(),
    animalId: text('animal_id')
      .notNull()
      .references(() => animais.id, { onDelete: 'cascade' }),
    medicamento: text('medicamento').notNull(),
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
    ...timestamps,
  },
  (table) => [index('tratamentos_animal_id_idx').on(table.animalId)]
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

export const animaisRelations = relations(animais, ({ many }) => ({
  coberturas: many(coberturas),
  tratamentos: many(tratamentos),
}));

export const coberturasRelations = relations(coberturas, ({ one }) => ({
  animal: one(animais, {
    fields: [coberturas.animalId],
    references: [animais.id],
  }),
}));

export const tratamentosRelations = relations(tratamentos, ({ one }) => ({
  animal: one(animais, {
    fields: [tratamentos.animalId],
    references: [animais.id],
  }),
}));

export type Animal = typeof animais.$inferSelect;
export type NovoAnimal = typeof animais.$inferInsert;
export type Cobertura = typeof coberturas.$inferSelect;
export type NovaCobertura = typeof coberturas.$inferInsert;
export type Tratamento = typeof tratamentos.$inferSelect;
export type NovoTratamento = typeof tratamentos.$inferInsert;
export type Ordenha = typeof ordenhas.$inferSelect;
export type NovaOrdenha = typeof ordenhas.$inferInsert;
