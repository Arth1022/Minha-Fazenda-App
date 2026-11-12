import { index, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { colunaId, colunaIdLocal, colunasBase, dataHora, indiceFazenda } from './base';

/**
 * Conta, fazendas e quem faz parte delas.
 *
 * `fazendas`, `fazenda_membros` e `usuarios` descem do servidor e são só leitura
 * no celular: mudanças passam pelos endpoints REST (o upload descarta qualquer
 * escrita local nelas). A única exceção é a fazenda do modo sem conta.
 */

export const PAPEIS = ['owner', 'collaborator'] as const;
export type Papel = (typeof PAPEIS)[number];

export const TIPOS_PRODUCAO = ['leite', 'corte', 'misto'] as const;
export type TipoProducao = (typeof TIPOS_PRODUCAO)[number];

export const fazendas = sqliteTable('fazendas', {
  id: colunaId(),
  nome: text('nome').notNull(),
  createdBy: text('created_by'),
  createdAt: dataHora('created_at'),
  updatedAt: dataHora('updated_at'),
  deletedAt: dataHora('deleted_at'),
});

/** Quem está em cada fazenda e com qual papel; `removed_at` preenchido = saiu ou foi removido. */
export const fazendaMembros = sqliteTable(
  'fazenda_membros',
  {
    id: colunaId(),
    fazendaId: text('fazenda_id').notNull(),
    usuarioId: text('usuario_id').notNull(),
    papel: text('papel', { enum: PAPEIS }).notNull(),
    createdAt: dataHora('created_at'),
    removedAt: dataHora('removed_at'),
  },
  (table) => [
    // Lista de fazendas do usuário logado e o papel dele na fazenda ativa
    index('fazenda_membros_usuario_idx').on(table.usuarioId, table.fazendaId),
    // Membros da fazenda ativa
    index('fazenda_membros_fazenda_idx').on(table.fazendaId),
  ]
);

/** Colegas de fazenda: só o que o stream `colegas` manda (nunca e-mail ou telefone). */
export const usuarios = sqliteTable('usuarios', {
  id: colunaId(),
  nome: text('nome').notNull(),
  avatarUrl: text('avatar_url'),
});

/** Perfil do modo sem conta: só neste celular (local-only, nunca sobe). */
export const perfilLocal = sqliteTable('perfil_local', {
  id: colunaIdLocal(),
  nome: text('nome').notNull(),
  /** Foto copiada para a pasta de documentos do app */
  fotoPath: text('foto_path'),
});

/**
 * Configuração da fazenda: uma linha por fazenda, com `id` igual ao `fazenda_id`
 * (dois celulares que criarem a configuração gravam a mesma linha).
 */
export const fazendaConfig = sqliteTable(
  'fazenda_config',
  {
    id: colunaId(),
    tipoProducao: text('tipo_producao', { enum: TIPOS_PRODUCAO }).notNull(),
    divisaJson: text('divisa_json', { mode: 'json' }).$type<[number, number][]>(),
    areaHectares: real('area_hectares'),
    minLat: real('min_lat'),
    maxLat: real('max_lat'),
    minLng: real('min_lng'),
    maxLng: real('max_lng'),
    ...colunasBase,
  },
  (table) => [indiceFazenda('fazenda_config', table.fazendaId)]
);

export type Fazenda = typeof fazendas.$inferSelect;
export type FazendaMembro = typeof fazendaMembros.$inferSelect;
export type UsuarioLinha = typeof usuarios.$inferSelect;
export type PerfilLocal = typeof perfilLocal.$inferSelect;
export type FazendaConfig = typeof fazendaConfig.$inferSelect;
