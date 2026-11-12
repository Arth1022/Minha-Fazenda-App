import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { colunaId, colunasBase, dataHora, indiceFazenda } from './base';
import type { DadosNovos } from './escrita';

/**
 * Rebanho: lotes, animais e os registros de cada animal. Os registros guardam
 * `animal_id` sem chave estrangeira; apagar o animal apaga (soft delete) os
 * registros dele na mesma transação (ver features/rebanho/data).
 */

export const SEXOS = ['F', 'M'] as const;
export type Sexo = (typeof SEXOS)[number];

export const ORIGENS = ['nascido', 'comprado'] as const;
export type Origem = (typeof ORIGENS)[number];

export const STATUS_ANIMAL = ['ativo', 'vendido', 'morto', 'descarte'] as const;
export type StatusAnimal = (typeof STATUS_ANIMAL)[number];

export const TIPOS_REPRODUCAO = ['cobertura', 'inseminacao'] as const;
export type TipoReproducao = (typeof TIPOS_REPRODUCAO)[number];

export const METODOS_PESAGEM = ['balanca', 'fita'] as const;
export type MetodoPesagem = (typeof METODOS_PESAGEM)[number];

export const METODOS_DIAGNOSTICO = ['toque', 'ultrassom', 'outro'] as const;
export type MetodoDiagnostico = (typeof METODOS_DIAGNOSTICO)[number];

/** Tetos: anterior/posterior, esquerdo/direito */
export const TETOS = ['AE', 'AD', 'PE', 'PD'] as const;
export type Teto = (typeof TETOS)[number];

export const TIPOS_MASTITE = ['clinica', 'subclinica'] as const;
export type TipoMastite = (typeof TIPOS_MASTITE)[number];

export const TIPOS_EXAME = ['brucelose', 'tuberculose', 'outro'] as const;
export type TipoExame = (typeof TIPOS_EXAME)[number];

export const RESULTADOS_EXAME = ['negativo', 'positivo', 'inconclusivo'] as const;
export type ResultadoExame = (typeof RESULTADOS_EXAME)[number];

/**
 * Lotes: agrupamento opcional de animais, para mover vários de uma vez. O pasto
 * do lote é o da última vez que ele foi movido inteiro (ver `movimentacoes`).
 */
export const lotes = sqliteTable(
  'lotes',
  {
  id: colunaId(),
  nome: text('nome').notNull(),
  /** Para que serve o lote (opcional) */
  descricao: text('descricao'),
  /**
   * Pasto do lote: definido quando o lote é movido inteiro. Animal do lote em
   * outro lugar aparece como "fora do pasto do lote"; null = lote sem local.
   */
  areaId: text('area_id'),
  /** Desde quando o lote está nesse pasto */
  areaDesde: dataHora('area_desde'),
  ...colunasBase,
  },
  (table) => [indiceFazenda('lotes', table.fazendaId)]
);

export const animais = sqliteTable(
  'animais',
  {
    id: colunaId(),
    brinco: text('brinco').notNull(),
    nome: text('nome'),
    raca: text('raca'),
    // Rebanhos cadastrados antes deste campo eram só de fêmeas (vacas/novilhas)
    sexo: text('sexo', { enum: SEXOS }).notNull().default('F'),
    dataNascimento: dataHora('data_nascimento'),
    /** true quando o produtor informou só a idade aproximada */
    nascimentoAproximado: integer('nascimento_aproximado', { mode: 'boolean' })
      .notNull()
      .default(false),
    /**
     * Já pariu antes de entrar no app (ex.: vaca comprada adulta). Sem isso, uma
     * fêmea sem cria registrada ficaria novilha para sempre.
     */
    jaPariu: integer('ja_pariu', { mode: 'boolean' }).notNull().default(false),
    /**
     * Crias que ela teve antes de entrar no app (não cadastradas como animal).
     * O total de crias é este número mais as cadastradas com ela como mãe.
     */
    criasAnteriores: integer('crias_anteriores').notNull().default(0),
    maeId: text('mae_id'),
    /** Pai cadastrado no rebanho (touro da fazenda) */
    paiId: text('pai_id'),
    /** Pai fora do rebanho (touro emprestado, sêmen de inseminação), em texto livre */
    paiDescricao: text('pai_descricao'),
    origem: text('origem', { enum: ORIGENS }),
    dataEntrada: dataHora('data_entrada'),
    status: text('status', { enum: STATUS_ANIMAL }).notNull().default('ativo'),
    dataSaida: dataHora('data_saida'),
    motivoSaida: text('motivo_saida'),
    loteId: text('lote_id'),
    /** Leite estimado por dia (litros), informado pelo produtor; opcional */
    producaoLeiteL: real('producao_leite_l'),
    /** Ração por dia (kg), informada pelo produtor; opcional */
    racaoKgDia: real('racao_kg_dia'),
    /** Quanto pagou (R$), quando a origem é compra */
    valorCompra: real('valor_compra'),
    /** Venda: quanto recebeu (R$) e o peso na saída */
    valorVenda: real('valor_venda'),
    pesoSaidaKg: real('peso_saida_kg'),
    /** Número SISBOV ou do brinco eletrônico */
    sisbov: text('sisbov'),
    /** Grau de sangue em texto ("1/2 Gir 1/2 Holandês", "PO") */
    grauSangue: text('grau_sangue'),
    /** Foto do animal (arquivo local do app) */
    fotoUri: text('foto_uri'),
    /** Desmame da cria; o peso vai em pesagens */
    dataDesmame: dataHora('data_desmame'),
    /** Nasceu de parto difícil (precisou de ajuda) */
    partoAssistido: integer('parto_assistido', { mode: 'boolean' }).notNull().default(false),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('animais', table.fazendaId),
    index('animais_brinco_idx').on(table.brinco),
    index('animais_mae_id_idx').on(table.maeId),
    index('animais_pai_id_idx').on(table.paiId),
    index('animais_lote_id_idx').on(table.loteId),
    index('animais_status_idx').on(table.status),
  ]
);

export const pesagens = sqliteTable(
  'pesagens',
  {
    id: colunaId(),
    animalId: text('animal_id').notNull(),
    data: dataHora('data').notNull(),
    pesoKg: real('peso_kg').notNull(),
    /** Balança ou fita de pesagem (o kg marcado na fita, peso estimado) */
    metodo: text('metodo', { enum: METODOS_PESAGEM }).notNull().default('balanca'),
    ...colunasBase,
  },
  (table) => [indiceFazenda('pesagens', table.fazendaId), index('pesagens_animal_id_idx').on(table.animalId)]
);

export const reproducoes = sqliteTable(
  'reproducoes',
  {
    id: colunaId(),
    animalId: text('animal_id').notNull(),
    tipo: text('tipo', { enum: TIPOS_REPRODUCAO }).notNull(),
    data: dataHora('data').notNull(),
    prenhezConfirmada: integer('prenhez_confirmada', { mode: 'boolean' }),
    previsaoParto: dataHora('previsao_parto'),
    dataParto: dataHora('data_parto'),
    criaId: text('cria_id'),
    /** Touro do rebanho usado na cobertura */
    touroId: text('touro_id'),
    /** Touro de fora ou sêmen (nome, código da palheta), em texto livre */
    touroDescricao: text('touro_descricao'),
    /** Quando e como a prenhez foi diagnosticada */
    dataDiagnostico: dataHora('data_diagnostico'),
    metodoDiagnostico: text('metodo_diagnostico', { enum: METODOS_DIAGNOSTICO }),
    /** Perdeu a prenhez: encerra a cobertura sem parto */
    dataAborto: dataHora('data_aborto'),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('reproducoes', table.fazendaId),
    index('reproducoes_animal_id_idx').on(table.animalId),
    index('reproducoes_touro_id_idx').on(table.touroId),
  ]
);

export const tratamentos = sqliteTable(
  'tratamentos',
  {
    id: colunaId(),
    animalId: text('animal_id').notNull(),
    medicamento: text('medicamento').notNull(),
    dose: text('dose'),
    dataInicio: dataHora('data_inicio').notNull(),
    dataFim: dataHora('data_fim'),
    /** Dias da semana com dose, no padrão do expo-notifications: 1 = domingo ... 7 = sábado */
    diasSemana: text('dias_semana', { mode: 'json' })
      .$type<number[]>()
      .notNull()
      .default(sql`'[1,2,3,4,5,6,7]'`),
    /** Horário da (primeira) dose do dia, "HH:mm"; null = sem horário */
    horario: text('horario'),
    /** De quantas em quantas horas repetir no dia (só com todos os dias; divisor de 24) */
    intervaloHoras: integer('intervalo_horas'),
    /** Antecedência do aviso, em minutos (0 = na hora da dose) */
    avisoMinutosAntes: integer('aviso_minutos_antes').notNull().default(0),
    notificacaoAtiva: integer('notificacao_ativa', { mode: 'boolean' })
      .notNull()
      .default(true),
    carenciaLeiteDias: integer('carencia_leite_dias'),
    carenciaCarneDias: integer('carencia_carne_dias'),
    /** Anotação livre do produtor (via de aplicação, lote, veterinário...) */
    observacoes: text('observacoes'),
    /** Liga os tratamentos aplicados em vários animais de uma vez */
    grupoAplicacaoId: text('grupo_aplicacao_id'),
    /** Foto do comprovante (nota, atestado de vacinação), arquivo local do app */
    comprovanteUri: text('comprovante_uri'),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('tratamentos', table.fazendaId),
    index('tratamentos_animal_id_idx').on(table.animalId),
    index('tratamentos_grupo_aplicacao_id_idx').on(table.grupoAplicacaoId),
    index('tratamentos_datas_idx').on(table.dataFim, table.dataInicio),
  ]
);

/**
 * Uma linha por dia de dose dada ("Dei a dose de hoje"). Guarda a DATA do dia
 * (meia-noite local), não o índice: o "dia N" é calculado a partir de
 * data_inicio. Confirmar o mesmo dia duas vezes é barrado ao gravar.
 */
export const dosesAplicadas = sqliteTable(
  'doses_aplicadas',
  {
    id: colunaId(),
    tratamentoId: text('tratamento_id').notNull(),
    /** Meia-noite local do dia da dose */
    dia: dataHora('dia').notNull(),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('doses_aplicadas', table.fazendaId),
    index('doses_aplicadas_tratamento_dia_idx').on(table.tratamentoId, table.dia),
  ]
);

/** Colunas comuns dos registros datados de um animal (apagados junto com ele). */
const registroDoAnimal = () => ({
  id: colunaId(),
  animalId: text('animal_id').notNull(),
  data: dataHora('data').notNull(),
  ...colunasBase,
});

/** Escore de condição corporal (1 = muito magra ... 5 = gorda), avaliado no olho. */
export const avaliacoesCorporais = sqliteTable(
  'avaliacoes_corporais',
  {
    ...registroDoAnimal(),
    escore: real('escore').notNull(),
  },
  (table) => [indiceFazenda('avaliacoes_corporais', table.fazendaId), index('avaliacoes_corporais_animal_id_idx').on(table.animalId)]
);

/** Controle leiteiro: litros da vaca num dia (soma das ordenhas do dia). */
export const controlesLeiteiros = sqliteTable(
  'controles_leiteiros',
  {
    ...registroDoAnimal(),
    litros: real('litros').notNull(),
  },
  (table) => [indiceFazenda('controles_leiteiros', table.fazendaId), index('controles_leiteiros_animal_id_idx').on(table.animalId)]
);

/** Secagem da vaca: encerra a lactação antes do próximo parto. */
export const secagens = sqliteTable(
  'secagens',
  registroDoAnimal(),
  (table) => [indiceFazenda('secagens', table.fazendaId), index('secagens_animal_id_idx').on(table.animalId)]
);

/** Caso de mastite, com os tetos afetados. */
export const mastites = sqliteTable(
  'mastites',
  {
    ...registroDoAnimal(),
    tetos: text('tetos', { mode: 'json' })
      .$type<Teto[]>()
      .notNull()
      .$defaultFn(() => []),
    tipo: text('tipo', { enum: TIPOS_MASTITE }).notNull(),
    observacoes: text('observacoes'),
  },
  (table) => [indiceFazenda('mastites', table.fazendaId), index('mastites_animal_id_idx').on(table.animalId)]
);

/** Cio observado (o próximo é previsto 21 dias depois). */
export const cios = sqliteTable(
  'cios',
  {
    ...registroDoAnimal(),
    observacoes: text('observacoes'),
  },
  (table) => [indiceFazenda('cios', table.fazendaId), index('cios_animal_id_idx').on(table.animalId)]
);

/** Exame (brucelose, tuberculose...) com validade e foto do laudo. */
export const exames = sqliteTable(
  'exames',
  {
    ...registroDoAnimal(),
    tipo: text('tipo', { enum: TIPOS_EXAME }).notNull(),
    /** Nome do exame quando o tipo é "outro" */
    descricao: text('descricao'),
    resultado: text('resultado', { enum: RESULTADOS_EXAME }).notNull(),
    /** Vale por quantos dias (brucelose e tuberculose: 1 ano) */
    validadeDias: integer('validade_dias'),
    comprovanteUri: text('comprovante_uri'),
  },
  (table) => [indiceFazenda('exames', table.fazendaId), index('exames_animal_id_idx').on(table.animalId)]
);

/** Anotação livre na ficha ("mancando da pata traseira"). */
export const anotacoesAnimal = sqliteTable(
  'anotacoes_animal',
  {
    ...registroDoAnimal(),
    texto: text('texto').notNull(),
  },
  (table) => [indiceFazenda('anotacoes_animal', table.fazendaId), index('anotacoes_animal_animal_id_idx').on(table.animalId)]
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
  pai: one(animais, {
    fields: [animais.paiId],
    references: [animais.id],
    relationName: 'pai_filhos',
  }),
  filhos: many(animais, { relationName: 'pai_filhos' }),
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
  touro: one(animais, { fields: [reproducoes.touroId], references: [animais.id] }),
}));

export const tratamentosRelations = relations(tratamentos, ({ one, many }) => ({
  animal: one(animais, {
    fields: [tratamentos.animalId],
    references: [animais.id],
  }),
  doses: many(dosesAplicadas),
}));

export const dosesAplicadasRelations = relations(dosesAplicadas, ({ one }) => ({
  tratamento: one(tratamentos, {
    fields: [dosesAplicadas.tratamentoId],
    references: [tratamentos.id],
  }),
}));

export type Lote = typeof lotes.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovoLote = DadosNovos<typeof lotes>;
export type Animal = typeof animais.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovoAnimal = DadosNovos<typeof animais>;
export type Pesagem = typeof pesagens.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovaPesagem = DadosNovos<typeof pesagens>;
export type Reproducao = typeof reproducoes.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovaReproducao = DadosNovos<typeof reproducoes>;
export type Tratamento = typeof tratamentos.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovoTratamento = DadosNovos<typeof tratamentos>;
export type DoseAplicada = typeof dosesAplicadas.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovaDoseAplicada = DadosNovos<typeof dosesAplicadas>;
export type AvaliacaoCorporal = typeof avaliacoesCorporais.$inferSelect;
export type ControleLeiteiro = typeof controlesLeiteiros.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovoControleLeiteiro = DadosNovos<typeof controlesLeiteiros>;
export type Secagem = typeof secagens.$inferSelect;
export type Mastite = typeof mastites.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovaMastite = DadosNovos<typeof mastites>;
export type Cio = typeof cios.$inferSelect;
export type Exame = typeof exames.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovoExame = DadosNovos<typeof exames>;
export type AnotacaoAnimal = typeof anotacoesAnimal.$inferSelect;
