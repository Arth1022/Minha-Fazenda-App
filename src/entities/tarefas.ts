import { relations } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { colunaId, colunasBase, dataHora, indiceFazenda } from './base';
import { usuarios } from './conta';
import { talhoes } from './mapa';
import { maquinas } from './maquinas';
import { animais } from './rebanho';

export const CATEGORIAS_TAREFA = ['cerca', 'animal', 'maquina', 'agua', 'pasto', 'outro'] as const;
export type CategoriaTarefa = (typeof CATEGORIAS_TAREFA)[number];

export const STATUS_TAREFA = ['aberta', 'em_andamento', 'concluida', 'cancelada'] as const;
export type StatusTarefa = (typeof STATUS_TAREFA)[number];

export const ORIGENS_TAREFA = [
  'ocorrencia',
  'manual',
  'etapa_ciclo',
  'tratamento',
  'sugestao_trajeto',
] as const;
export type OrigemTarefa = (typeof ORIGENS_TAREFA)[number];

export const SYNC_STATUS_TAREFA = ['pendente', 'sincronizado'] as const;
export type SyncStatusTarefa = (typeof SYNC_STATUS_TAREFA)[number];

export const TIPOS_TAREFA_EVENTO = [
  'criada',
  'atribuida',
  'assumida',
  'liberada',
  'iniciada',
  'concluida',
  'cancelada',
  'reaberta',
  'observacao',
] as const;
export type TipoTarefaEvento = (typeof TIPOS_TAREFA_EVENTO)[number];

/**
 * Tabela única de tarefas e ocorrências da fazenda (RN-T01, RNF-T01).
 * O status e o responsável são caches do último evento válido (RF-T20).
 */
export const tarefas = sqliteTable(
  'tarefas',
  {
    id: colunaId(),
    titulo: text('titulo').notNull(),
    categoria: text('categoria', { enum: CATEGORIAS_TAREFA }).notNull(),
    origem: text('origem', { enum: ORIGENS_TAREFA }).notNull().default('ocorrencia'),
    descricao: text('descricao'),
    urgente: integer('urgente', { mode: 'boolean' }).notNull().default(false),
    status: text('status', { enum: STATUS_TAREFA }).notNull().default('aberta'),
    responsavelId: text('responsavel_id'),
    prazo: dataHora('prazo'),
    areaId: text('area_id'),
    animalId: text('animal_id'),
    maquinaId: text('maquina_id'),
    maquinaParada: integer('maquina_parada', { mode: 'boolean' }).notNull().default(false),
    audioUri: text('audio_uri'),
    pontoLat: real('ponto_lat'),
    pontoLng: real('ponto_lng'),
    syncStatus: text('sync_status', { enum: SYNC_STATUS_TAREFA }).notNull().default('pendente'),
    concluidaEm: dataHora('concluida_em'),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('tarefas', table.fazendaId),
    index('tarefas_status_responsavel_urgente_idx').on(table.status, table.responsavelId, table.urgente),
    index('tarefas_responsavel_urgente_prazo_idx').on(table.responsavelId, table.urgente, table.prazo),
    index('tarefas_animal_id_idx').on(table.animalId),
    index('tarefas_maquina_id_idx').on(table.maquinaId),
    index('tarefas_area_id_idx').on(table.areaId),
  ]
);

/**
 * Histórico append-only de eventos de cada tarefa (RN-T06, RF-T20).
 */
export const tarefaEventos = sqliteTable(
  'tarefa_eventos',
  {
    id: colunaId(),
    tarefaId: text('tarefa_id').notNull(),
    tipo: text('tipo', { enum: TIPOS_TAREFA_EVENTO }).notNull(),
    autorId: text('autor_id'),
    ocorridoEm: dataHora('ocorrido_em').notNull(),
    texto: text('texto'),
    dados: text('dados', { mode: 'json' }).$type<Record<string, unknown>>(),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('tarefa_eventos', table.fazendaId),
    index('tarefa_eventos_tarefa_ocorrido_idx').on(table.tarefaId, table.ocorridoEm),
    index('tarefa_eventos_ocorrido_em_idx').on(table.ocorridoEm),
  ]
);

/**
 * Avisos gerais / mural da fazenda exibidos no painel inicial (Home).
 */
export const avisosFazenda = sqliteTable(
  'avisos_fazenda',
  {
    id: colunaId(),
    mensagem: text('mensagem').notNull(),
    autorNome: text('autor_nome').notNull(),
    ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('avisos_fazenda', table.fazendaId),
    index('avisos_fazenda_ativo_created_idx').on(table.ativo, table.createdAt),
  ]
);

export const tarefasRelations = relations(tarefas, ({ many, one }) => ({
  eventos: many(tarefaEventos),
  area: one(talhoes, { fields: [tarefas.areaId], references: [talhoes.id] }),
  animal: one(animais, { fields: [tarefas.animalId], references: [animais.id] }),
  maquina: one(maquinas, { fields: [tarefas.maquinaId], references: [maquinas.id] }),
  responsavel: one(usuarios, { fields: [tarefas.responsavelId], references: [usuarios.id] }),
}));

export const tarefaEventosRelations = relations(tarefaEventos, ({ one }) => ({
  tarefa: one(tarefas, { fields: [tarefaEventos.tarefaId], references: [tarefas.id] }),
}));

export type TarefaOcorrencia = typeof tarefas.$inferSelect;
export type NovaTarefa = typeof tarefas.$inferInsert;
export type TarefaEvento = typeof tarefaEventos.$inferSelect;
export type NovoTarefaEvento = typeof tarefaEventos.$inferInsert;
export type AvisoFazenda = typeof avisosFazenda.$inferSelect;
export type NovoAvisoFazenda = typeof avisosFazenda.$inferInsert;
