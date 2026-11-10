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
  nome: text('nome'),
  divisaJson: text('divisa_json', { mode: 'json' }).$type<[number, number][]>(),
  areaHectares: real('area_hectares'),
  minLat: real('min_lat'),
  maxLat: real('max_lat'),
  minLng: real('min_lng'),
  maxLng: real('max_lng'),
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
    index('animais_status_idx').on(table.status),
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

export const ordenhas = sqliteTable(
  'ordenhas',
  {
    id: id(),
    periodo: text('periodo', { enum: PERIODOS_ORDENHA }).notNull(),
    horarioPrevisto: text('horario_previsto'),
    horarioNotificacao: text('horario_notificacao'),
    volumeLitros: real('volume_litros'),
    dataRegistro: integer('data_registro', { mode: 'timestamp_ms' }).notNull(),
    ...timestamps,
  },
  (table) => [index('ordenhas_data_registro_idx').on(table.dataRegistro)]
);

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

/** Motorizada anda e gasta combustível; implemento é puxado por uma motorizada. */
export const CATEGORIAS_MAQUINA = ['motorizada', 'implemento'] as const;
export type CategoriaMaquina = (typeof CATEGORIAS_MAQUINA)[number];

/** O que a máquina foi fazer (lista fixa; "parado" = trabalho estacionário pela TDP). */
export const ATIVIDADES_USO = [
  'plantio',
  'pulverizacao',
  'gradagem',
  'transporte',
  'trato',
  'parado',
  'outro',
] as const;
export type AtividadeUso = (typeof ATIVIDADES_USO)[number];

/** Como o uso terminou: pela pessoa ou por uma regra automática do app. */
export const MOTIVOS_FIM_USO = ['manual', 'parada', 'pausa', 'velocidade', 'assumida'] as const;
export type MotivoFimUso = (typeof MOTIVOS_FIM_USO)[number];

/** "app": ligado e desligado na hora; "manual": uso esquecido, informado depois. */
export const ORIGENS_USO = ['app', 'manual'] as const;
export type OrigemUso = (typeof ORIGENS_USO)[number];

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
    categoria: text('categoria', { enum: CATEGORIAS_MAQUINA }).notNull().default('motorizada'),
    marca: text('marca'),
    modelo: text('modelo'),
    anoFabricacao: integer('ano_fabricacao'),
    /** Chassi ou número de série */
    numeroSerie: text('numero_serie'),
    placa: text('placa'),
    potenciaCv: real('potencia_cv'),
    combustivel: text('combustivel', { enum: COMBUSTIVEIS }),
    /** Capacidade do tanque (L): abastecimento acima disso pede confirmação */
    tanqueLitros: real('tanque_litros'),
    /** Largura de trabalho do implemento (m): dá a área estimada pelo KM trabalhado */
    larguraTrabalhoM: real('largura_trabalho_m'),
    /** Horímetro quebrado ou inexistente: o app não pede leitura e usa as horas de uso */
    possuiHorimetro: integer('possui_horimetro', { mode: 'boolean' }).notNull().default(true),
    /** Velocidade máxima (km/h); null usa o padrão do tipo */
    velocidadeMaxKmh: real('velocidade_max_kmh'),
    /** Horímetro no cadastro; as horas de uso no app somam a partir dele */
    horimetroInicial: real('horimetro_inicial'),
    dataAquisicao: integer('data_aquisicao', { mode: 'timestamp_ms' }),
    status: text('status', { enum: STATUS_MAQUINA }).notNull().default('ativa'),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [uniqueIndex('maquinas_codigo_idx').on(table.codigo)]
);

/** Trecho do rastro guardado no uso: [longitude, latitude], já simplificado. */
export type PontoRastro = [number, number];

/** KM e tempo trabalhados num talhão durante o uso. */
export interface UsoNoTalhao {
  talhaoId: string;
  nome: string;
  km: number;
  segundos: number;
  areaHa: number | null;
}

/**
 * Auditoria de uso: uma linha por vez que a máquina foi ligada. `fim` null = em uso.
 * O índice único parcial impede dois usos abertos na mesma máquina. Os totais do
 * rastro (KM, tempos, talhões) são gravados ao encerrar, para a ficha não recalcular.
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
    /** Nome de quem operou, como aparece na tela ("Em uso por Beta") */
    operador: text('operador'),
    /** Id de quem operou (do login) */
    operadorId: text('operador_id'),
    /** Implemento engatado (plantadeira, grade...): o uso dele vem deste uso */
    implementoId: text('implemento_id').references((): AnySQLiteColumn => maquinas.id, {
      onDelete: 'set null',
    }),
    atividade: text('atividade', { enum: ATIVIDADES_USO }),
    origem: text('origem', { enum: ORIGENS_USO }).notNull().default('app'),
    fimMotivo: text('fim_motivo', { enum: MOTIVOS_FIM_USO }),
    /** O GPS acompanhou o uso (com permissão de localização) */
    rastreado: integer('rastreado', { mode: 'boolean' }).notNull().default(false),
    inicioLat: real('inicio_lat'),
    inicioLng: real('inicio_lng'),
    fimLat: real('fim_lat'),
    fimLng: real('fim_lng'),
    kmTotal: real('km_total'),
    kmTrabalhando: real('km_trabalhando'),
    segTrabalhando: integer('seg_trabalhando'),
    segDeslocando: integer('seg_deslocando'),
    segParada: integer('seg_parada'),
    segPausa: integer('seg_pausa'),
    segSemSinal: integer('seg_sem_sinal'),
    areaEstimadaHa: real('area_estimada_ha'),
    /** Fração do tempo coberta por pontos de GPS válidos (0 a 1) */
    qualidade: real('qualidade'),
    /** Algum ponto veio de localização simulada (app de GPS falso) */
    localizacaoSimulada: integer('localizacao_simulada', { mode: 'boolean' }).notNull().default(false),
    rastro: text('rastro', { mode: 'json' }).$type<PontoRastro[]>(),
    talhoes: text('talhoes', { mode: 'json' }).$type<UsoNoTalhao[]>(),
    /** Automação de parada: quando o aviso "Parada há 20 min" saiu (null = sem aviso pendente) */
    paradaAvisadaEm: integer('parada_avisada_em', { mode: 'timestamp_ms' }),
    /** Respondeu "Continua": não pergunta de novo até esta hora */
    continuaAte: integer('continua_ate', { mode: 'timestamp_ms' }),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [
    index('usos_maquina_maquina_inicio_idx').on(table.maquinaId, table.inicio),
    uniqueIndex('usos_maquina_aberto_idx')
      .on(table.maquinaId)
      .where(sql`${table.fim} is null`),
    index('usos_maquina_operador_aberto_idx')
      .on(table.operadorId)
      .where(sql`${table.fim} is null`),
    index('usos_maquina_implemento_idx').on(table.implementoId),
  ]
);

/**
 * Pontos de GPS do uso em andamento (um a cada 5 s, inclusive parado). Só no
 * celular: apagados ao encerrar, quando o rastro simplificado vai para o uso.
 * Sem created_at/updated_at de propósito: nunca sincroniza e grava muito.
 */
export const pontosGps = sqliteTable(
  'pontos_gps',
  {
    id: id(),
    usoId: text('uso_id')
      .notNull()
      .references(() => usosMaquina.id, { onDelete: 'cascade' }),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    precisaoM: real('precisao_m'),
    velocidadeMs: real('velocidade_ms'),
    simulado: integer('simulado', { mode: 'boolean' }).notNull().default(false),
    registradoEm: integer('registrado_em', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('pontos_gps_uso_registrado_idx').on(table.usoId, table.registradoEm)]
);

/** "pausa": não conta como uso; "continua": respondeu que segue trabalhando parado. */
export const MOTIVOS_PARADA = ['pausa', 'continua'] as const;
export type MotivoParada = (typeof MOTIVOS_PARADA)[number];

/** Pausas e respostas ao aviso de parada. Pausa com `fim` null = em pausa agora. */
export const paradasUso = sqliteTable(
  'paradas_uso',
  {
    id: id(),
    usoId: text('uso_id')
      .notNull()
      .references(() => usosMaquina.id, { onDelete: 'cascade' }),
    motivo: text('motivo', { enum: MOTIVOS_PARADA }).notNull(),
    inicio: integer('inicio', { mode: 'timestamp_ms' }).notNull(),
    fim: integer('fim', { mode: 'timestamp_ms' }),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [index('paradas_uso_uso_id_idx').on(table.usoId)]
);

export const ORIGENS_ABASTECIMENTO = ['fazenda', 'posto'] as const;
export type OrigemAbastecimento = (typeof ORIGENS_ABASTECIMENTO)[number];

/** Abastecimentos: o consumo é calculado de tanque cheio a tanque cheio. */
export const abastecimentos = sqliteTable(
  'abastecimentos',
  {
    id: id(),
    maquinaId: text('maquina_id')
      .notNull()
      .references(() => maquinas.id, { onDelete: 'cascade' }),
    /** Uso em andamento quando abasteceu (abastece sem encerrar) */
    usoId: text('uso_id').references(() => usosMaquina.id, { onDelete: 'set null' }),
    operador: text('operador'),
    operadorId: text('operador_id'),
    litros: real('litros').notNull(),
    tanqueCheio: integer('tanque_cheio', { mode: 'boolean' }).notNull().default(true),
    origem: text('origem', { enum: ORIGENS_ABASTECIMENTO }).notNull().default('fazenda'),
    /** Horímetro lido no abastecimento (a leitura também vai para leituras_horimetro) */
    horimetroH: real('horimetro_h'),
    lat: real('lat'),
    lng: real('lng'),
    fotoUri: text('foto_uri'),
    abastecidoEm: integer('abastecido_em', { mode: 'timestamp_ms' }).notNull(),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [index('abastecimentos_maquina_data_idx').on(table.maquinaId, table.abastecidoEm)]
);

export const ORIGENS_HORIMETRO = ['abastecimento', 'avulsa'] as const;
export type OrigemHorimetro = (typeof ORIGENS_HORIMETRO)[number];

/**
 * Leituras do horímetro, sempre digitadas (nunca preenchidas pelo app): servem
 * de conferência. `estimadoH` guarda o que o app esperava no momento.
 */
export const leiturasHorimetro = sqliteTable(
  'leituras_horimetro',
  {
    id: id(),
    maquinaId: text('maquina_id')
      .notNull()
      .references(() => maquinas.id, { onDelete: 'cascade' }),
    usoId: text('uso_id').references(() => usosMaquina.id, { onDelete: 'set null' }),
    operador: text('operador'),
    operadorId: text('operador_id'),
    valorH: real('valor_h').notNull(),
    estimadoH: real('estimado_h'),
    origem: text('origem', { enum: ORIGENS_HORIMETRO }).notNull().default('avulsa'),
    fotoUri: text('foto_uri'),
    lidoEm: integer('lido_em', { mode: 'timestamp_ms' }).notNull(),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [index('leituras_horimetro_maquina_data_idx').on(table.maquinaId, table.lidoEm)]
);

export const CATEGORIAS_PROBLEMA = [
  'motor',
  'hidraulico',
  'pneu',
  'eletrico',
  'vazamento',
  'outro',
] as const;
export type CategoriaProblema = (typeof CATEGORIAS_PROBLEMA)[number];

/**
 * Problemas relatados na máquina. Em aberto (`resolvidaEm` null), mudam a situação
 * dela: "não dá para usar" deixa parada por problema; "dá" deixa em atenção.
 */
export const ocorrenciasMaquina = sqliteTable(
  'ocorrencias_maquina',
  {
    id: id(),
    maquinaId: text('maquina_id')
      .notNull()
      .references(() => maquinas.id, { onDelete: 'cascade' }),
    usoId: text('uso_id').references(() => usosMaquina.id, { onDelete: 'set null' }),
    operador: text('operador'),
    operadorId: text('operador_id'),
    categoria: text('categoria', { enum: CATEGORIAS_PROBLEMA }).notNull(),
    podeUsar: integer('pode_usar', { mode: 'boolean' }).notNull(),
    descricao: text('descricao'),
    fotoUri: text('foto_uri'),
    lat: real('lat'),
    lng: real('lng'),
    registradoEm: integer('registrado_em', { mode: 'timestamp_ms' }).notNull(),
    resolvidaEm: integer('resolvida_em', { mode: 'timestamp_ms' }),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [index('ocorrencias_maquina_maquina_idx').on(table.maquinaId, table.resolvidaEm)]
);

/** Anotações livres da máquina (revisões, defeitos, observações). */
export const anotacoesMaquina = sqliteTable(
  'anotacoes_maquina',
  {
    id: id(),
    maquinaId: text('maquina_id')
      .notNull()
      .references(() => maquinas.id, { onDelete: 'cascade' }),
    /** Uso em andamento quando foi anotada */
    usoId: text('uso_id').references(() => usosMaquina.id, { onDelete: 'set null' }),
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
export type PontoGps = typeof pontosGps.$inferSelect;
export type NovoPontoGps = typeof pontosGps.$inferInsert;
export type ParadaUso = typeof paradasUso.$inferSelect;
export type Abastecimento = typeof abastecimentos.$inferSelect;
export type NovoAbastecimento = typeof abastecimentos.$inferInsert;
export type LeituraHorimetro = typeof leiturasHorimetro.$inferSelect;
export type NovaLeituraHorimetro = typeof leiturasHorimetro.$inferInsert;
export type OcorrenciaMaquina = typeof ocorrenciasMaquina.$inferSelect;
export type NovaOcorrenciaMaquina = typeof ocorrenciasMaquina.$inferInsert;
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

export const TIPOS_TALHAO = ['pasto', 'lavoura', 'reserva', 'outro'] as const;
export type TipoTalhao = (typeof TIPOS_TALHAO)[number];

export const FASES_LAVOURA = ['preparo', 'vegetativo', 'colheita', 'pousio'] as const;
export type FaseLavoura = (typeof FASES_LAVOURA)[number];

export const TIPOS_MARCADOR_MAPA = ['praga', 'daninha', 'erosao', 'outro'] as const;
export type TipoMarcadorMapa = (typeof TIPOS_MARCADOR_MAPA)[number];

export const STATUS_SYNC = ['created', 'updated', 'synced', 'deleted'] as const;
export type StatusSync = (typeof STATUS_SYNC)[number];

export interface GeometriaPoligono {
  type: 'Polygon';
  coordinates: number[][][];
}

export const talhoes = sqliteTable(
  'talhoes',
  {
    id: id(),
    nome: text('nome').notNull(),
    tipo: text('tipo', { enum: TIPOS_TALHAO }).notNull().default('pasto'),
    cor: text('cor').notNull(),
    areaHectares: real('area_hectares').notNull(),
    geometriaJson: text('geometria_json', { mode: 'json' }).$type<GeometriaPoligono>().notNull(),
    centroLat: real('centro_lat').notNull(),
    centroLng: real('centro_lng').notNull(),
    minLat: real('min_lat').notNull(),
    maxLat: real('max_lat').notNull(),
    minLng: real('min_lng').notNull(),
    maxLng: real('max_lng').notNull(),
    cultura: text('cultura'),
    faseLavoura: text('fase_lavoura', { enum: FASES_LAVOURA }),
    dataPlantio: integer('data_plantio', { mode: 'timestamp_ms' }),
    syncStatus: text('sync_status', { enum: STATUS_SYNC }).notNull().default('created'),
    criadoPor: criadoPor(),
    ...timestamps,
  },
  (table) => [
    index('talhoes_bbox_idx').on(table.minLat, table.maxLat, table.minLng, table.maxLng),
    index('talhoes_sync_status_idx').on(table.syncStatus),
  ]
);

export const marcadoresMapa = sqliteTable(
  'marcadores_mapa',
  {
    id: id(),
    talhaoId: text('talhao_id').references(() => talhoes.id, { onDelete: 'cascade' }),
    tipo: text('tipo', { enum: TIPOS_MARCADOR_MAPA }).notNull(),
    titulo: text('titulo').notNull(),
    descricao: text('descricao'),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    resolvido: integer('resolvido', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index('marcadores_mapa_lat_lng_idx').on(table.lat, table.lng),
    index('marcadores_mapa_talhao_idx').on(table.talhaoId),
  ]
);

export const talhoesRelations = relations(talhoes, ({ many }) => ({
  marcadores: many(marcadoresMapa),
}));

export const marcadoresMapaRelations = relations(marcadoresMapa, ({ one }) => ({
  talhao: one(talhoes, { fields: [marcadoresMapa.talhaoId], references: [talhoes.id] }),
}));

export type Talhao = typeof talhoes.$inferSelect;
export type NovoTalhao = typeof talhoes.$inferInsert;
export type MarcadorMapa = typeof marcadoresMapa.$inferSelect;
export type NovoMarcadorMapa = typeof marcadoresMapa.$inferInsert;
