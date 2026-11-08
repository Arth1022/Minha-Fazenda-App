import { relations, sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
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
    /**
     * Crias que ela teve antes de entrar no app (não cadastradas como animal).
     * O total de crias é este número mais as cadastradas com ela como mãe.
     */
    criasAnteriores: integer('crias_anteriores').notNull().default(0),
    maeId: text('mae_id').references((): AnySQLiteColumn => animais.id, {
      onDelete: 'set null',
    }),
    /** Pai cadastrado no rebanho (touro da fazenda) */
    paiId: text('pai_id').references((): AnySQLiteColumn => animais.id, {
      onDelete: 'set null',
    }),
    /** Pai fora do rebanho (touro emprestado, sêmen de inseminação), em texto livre */
    paiDescricao: text('pai_descricao'),
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
    dataDesmame: integer('data_desmame', { mode: 'timestamp_ms' }),
    /** Nasceu de parto difícil (precisou de ajuda) */
    partoAssistido: integer('parto_assistido', { mode: 'boolean' }).notNull().default(false),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [
    index('animais_brinco_idx').on(table.brinco),
    index('animais_mae_id_idx').on(table.maeId),
    index('animais_pai_id_idx').on(table.paiId),
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
    /** Balança ou fita de pesagem (o kg marcado na fita, peso estimado) */
    metodo: text('metodo', { enum: METODOS_PESAGEM }).notNull().default('balanca'),
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
    /** Touro do rebanho usado na cobertura */
    touroId: text('touro_id').references(() => animais.id, { onDelete: 'set null' }),
    /** Touro de fora ou sêmen (nome, código da palheta), em texto livre */
    touroDescricao: text('touro_descricao'),
    /** Quando e como a prenhez foi diagnosticada */
    dataDiagnostico: integer('data_diagnostico', { mode: 'timestamp_ms' }),
    metodoDiagnostico: text('metodo_diagnostico', { enum: METODOS_DIAGNOSTICO }),
    /** Perdeu a prenhez: encerra a cobertura sem parto */
    dataAborto: integer('data_aborto', { mode: 'timestamp_ms' }),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [
    index('reproducoes_animal_id_idx').on(table.animalId),
    index('reproducoes_touro_id_idx').on(table.touroId),
  ]
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
    /**
     * Legado: índices (1 = primeiro dia) dos dias confirmados. Copiado para
     * `doses_aplicadas` na migration 0008; sai quando a tela deixar de usar.
     */
    diasConfirmados: text('dias_confirmados', { mode: 'json' })
      .$type<number[]>()
      .notNull()
      .$defaultFn(() => []),
    /** Legado: substituído pela agenda (dias_semana, horario, intervalo_horas) */
    proximaDoseEm: integer('proxima_dose_em', { mode: 'timestamp_ms' }),
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
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [
    index('tratamentos_animal_id_idx').on(table.animalId),
    index('tratamentos_grupo_aplicacao_id_idx').on(table.grupoAplicacaoId),
  ]
);

/**
 * Uma linha por dia de dose dada ("Dei a dose de hoje"). Guarda a DATA do dia
 * (epoch da meia-noite local), não o índice: o "dia N" é calculado a partir de
 * data_inicio. O índice único impede confirmar o mesmo dia duas vezes.
 */
export const dosesAplicadas = sqliteTable(
  'doses_aplicadas',
  {
    id: id(),
    tratamentoId: text('tratamento_id')
      .notNull()
      .references(() => tratamentos.id, { onDelete: 'cascade' }),
    /** Meia-noite local do dia da dose */
    dia: integer('dia', { mode: 'timestamp_ms' }).notNull(),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('doses_aplicadas_tratamento_dia_idx').on(table.tratamentoId, table.dia),
  ]
);

/** Colunas comuns dos registros datados de um animal (apagados junto com ele). */
const registroDoAnimal = () => ({
  id: id(),
  animalId: text('animal_id')
    .notNull()
    .references(() => animais.id, { onDelete: 'cascade' }),
  data: integer('data', { mode: 'timestamp_ms' }).notNull(),
  criadoPor: criadoPor(),
  ...timestamps,
});

/** Escore de condição corporal (1 = muito magra ... 5 = gorda), avaliado no olho. */
export const avaliacoesCorporais = sqliteTable(
  'avaliacoes_corporais',
  {
    ...registroDoAnimal(),
    escore: real('escore').notNull(),
  },
  (table) => [index('avaliacoes_corporais_animal_id_idx').on(table.animalId)]
);

/** Controle leiteiro: litros da vaca num dia (soma das ordenhas do dia). */
export const controlesLeiteiros = sqliteTable(
  'controles_leiteiros',
  {
    ...registroDoAnimal(),
    litros: real('litros').notNull(),
  },
  (table) => [index('controles_leiteiros_animal_id_idx').on(table.animalId)]
);

/** Secagem da vaca: encerra a lactação antes do próximo parto. */
export const secagens = sqliteTable(
  'secagens',
  registroDoAnimal(),
  (table) => [index('secagens_animal_id_idx').on(table.animalId)]
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
  (table) => [index('mastites_animal_id_idx').on(table.animalId)]
);

/** Cio observado (o próximo é previsto 21 dias depois). */
export const cios = sqliteTable(
  'cios',
  {
    ...registroDoAnimal(),
    observacoes: text('observacoes'),
  },
  (table) => [index('cios_animal_id_idx').on(table.animalId)]
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
  (table) => [index('exames_animal_id_idx').on(table.animalId)]
);

/** Anotação livre na ficha ("mancando da pata traseira"). */
export const anotacoesAnimal = sqliteTable(
  'anotacoes_animal',
  {
    ...registroDoAnimal(),
    texto: text('texto').notNull(),
  },
  (table) => [index('anotacoes_animal_animal_id_idx').on(table.animalId)]
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

export const TIPOS_MAQUINA = [
  'trator',
  'colheitadeira',
  'pulverizador',
  'plantadeira',
  'implemento',
  'caminhao',
  'utilitario',
  'ordenhadeira',
  'outro',
] as const;
export type TipoMaquina = (typeof TIPOS_MAQUINA)[number];

export const COMBUSTIVEIS = ['diesel', 'gasolina', 'etanol', 'flex', 'eletrico', 'nenhum'] as const;
export type Combustivel = (typeof COMBUSTIVEIS)[number];

export const STATUS_MAQUINA = ['ativa', 'manutencao', 'inativa'] as const;
export type StatusMaquina = (typeof STATUS_MAQUINA)[number];

/**
 * Máquinas e veículos da fazenda. `codigo` é a identificação curta usada no dia a
 * dia (ex.: "TR-01"); estar "em uso" não é coluna: é ter um uso sem `fim`.
 */
export const maquinas = sqliteTable(
  'maquinas',
  {
    id: id(),
    codigo: text('codigo').notNull(),
    nome: text('nome').notNull(),
    tipo: text('tipo', { enum: TIPOS_MAQUINA }).notNull().default('outro'),
    marca: text('marca'),
    modelo: text('modelo'),
    anoFabricacao: integer('ano_fabricacao'),
    /** Chassi ou número de série */
    numeroSerie: text('numero_serie'),
    placa: text('placa'),
    potenciaCv: real('potencia_cv'),
    combustivel: text('combustivel', { enum: COMBUSTIVEIS }),
    /** Horímetro no cadastro; as horas de uso no app somam a partir dele */
    horimetroInicial: real('horimetro_inicial'),
    dataAquisicao: integer('data_aquisicao', { mode: 'timestamp_ms' }),
    status: text('status', { enum: STATUS_MAQUINA }).notNull().default('ativa'),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [uniqueIndex('maquinas_codigo_idx').on(table.codigo)]
);

/**
 * Auditoria de uso: uma linha por vez que a máquina foi ligada. `fim` null = em uso.
 * O índice único parcial impede dois usos abertos na mesma máquina.
 */
export const usosMaquina = sqliteTable(
  'usos_maquina',
  {
    id: id(),
    maquinaId: text('maquina_id')
      .notNull()
      .references(() => maquinas.id, { onDelete: 'cascade' }),
    inicio: integer('inicio', { mode: 'timestamp_ms' }).notNull(),
    fim: integer('fim', { mode: 'timestamp_ms' }),
    /** Quem operou (preenchido quando o login existir) */
    operador: text('operador'),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [
    index('usos_maquina_maquina_inicio_idx').on(table.maquinaId, table.inicio),
    uniqueIndex('usos_maquina_aberto_idx')
      .on(table.maquinaId)
      .where(sql`${table.fim} is null`),
  ]
);

/** Anotações livres da máquina (revisões, defeitos, observações). */
export const anotacoesMaquina = sqliteTable(
  'anotacoes_maquina',
  {
    id: id(),
    maquinaId: text('maquina_id')
      .notNull()
      .references(() => maquinas.id, { onDelete: 'cascade' }),
    texto: text('texto').notNull(),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [index('anotacoes_maquina_maquina_id_idx').on(table.maquinaId)]
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
export type DoseAplicada = typeof dosesAplicadas.$inferSelect;
export type NovaDoseAplicada = typeof dosesAplicadas.$inferInsert;
export type Ordenha = typeof ordenhas.$inferSelect;
export type NovaOrdenha = typeof ordenhas.$inferInsert;
export type NotificacaoAgendadaRow = typeof notificacoesAgendadas.$inferSelect;
export type Maquina = typeof maquinas.$inferSelect;
export type NovaMaquina = typeof maquinas.$inferInsert;
export type UsoMaquina = typeof usosMaquina.$inferSelect;
export type AnotacaoMaquina = typeof anotacoesMaquina.$inferSelect;
export type AvaliacaoCorporal = typeof avaliacoesCorporais.$inferSelect;
export type ControleLeiteiro = typeof controlesLeiteiros.$inferSelect;
export type NovoControleLeiteiro = typeof controlesLeiteiros.$inferInsert;
export type Secagem = typeof secagens.$inferSelect;
export type Mastite = typeof mastites.$inferSelect;
export type NovaMastite = typeof mastites.$inferInsert;
export type Cio = typeof cios.$inferSelect;
export type Exame = typeof exames.$inferSelect;
export type NovoExame = typeof exames.$inferInsert;
export type AnotacaoAnimal = typeof anotacoesAnimal.$inferSelect;
