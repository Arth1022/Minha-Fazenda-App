import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { colunaId, colunaIdLocal, colunasBase, dataHora, indiceFazenda } from './base';
import type { DadosNovos } from './escrita';

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

/** Como o uso terminou: pela pessoa ou por uma regra automática do app ("fora": saiu da divisa da fazenda). */
export const MOTIVOS_FIM_USO = ['manual', 'parada', 'pausa', 'velocidade', 'assumida', 'fora'] as const;
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
    id: colunaId(),
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
    dataAquisicao: dataHora('data_aquisicao'),
    status: text('status', { enum: STATUS_MAQUINA }).notNull().default('ativa'),
    ...colunasBase,
  },
  (table) => [indiceFazenda('maquinas', table.fazendaId), index('maquinas_codigo_idx').on(table.codigo)]
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
 * Ligar confere, na mesma transação, que não há outro uso aberto na máquina. Os totais do
 * rastro (KM, tempos, talhões) são gravados ao encerrar, para a ficha não recalcular.
 */
export const usosMaquina = sqliteTable(
  'usos_maquina',
  {
    id: colunaId(),
    maquinaId: text('maquina_id').notNull(),
    inicio: dataHora('inicio').notNull(),
    fim: dataHora('fim'),
    /** Nome de quem operou, como aparece na tela ("Em uso por Beta") */
    operador: text('operador'),
    /** Id de quem operou (do login) */
    operadorId: text('operador_id'),
    /** Implemento engatado (plantadeira, grade...): o uso dele vem deste uso */
    implementoId: text('implemento_id'),
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
    paradaAvisadaEm: dataHora('parada_avisada_em'),
    /** Respondeu "Continua": não pergunta de novo até esta hora */
    continuaAte: dataHora('continua_ate'),
    /**
     * Uso reaberto pelo "Desfazer" (RF-050): as regras automáticas só olham os
     * pontos daqui em diante, para não encerrar de novo pelo mesmo motivo.
     */
    regrasDesde: dataHora('regras_desde'),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('usos_maquina', table.fazendaId),
    index('usos_maquina_maquina_inicio_idx').on(table.maquinaId, table.inicio),
    // Camada Trajetos: os usos do período, de todas as máquinas (RF-060/RF-061)
    index('usos_maquina_inicio_idx').on(table.inicio),
    // Uso em andamento de quem está com o celular
    index('usos_maquina_operador_fim_idx').on(table.operadorId, table.fim),
    index('usos_maquina_implemento_idx').on(table.implementoId),
  ]
);

/**
 * Pontos de GPS do uso em andamento (um a cada 5 s, inclusive parado). Só no
 * celular: apagados ao encerrar, quando o rastro simplificado vai para o uso.
 * Tabela local-only (nunca sobe), sem as colunas base: grava muito.
 */
export const pontosGps = sqliteTable(
  'pontos_gps',
  {
    id: colunaIdLocal(),
    usoId: text('uso_id').notNull(),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    precisaoM: real('precisao_m'),
    velocidadeMs: real('velocidade_ms'),
    simulado: integer('simulado', { mode: 'boolean' }).notNull().default(false),
    registradoEm: dataHora('registrado_em').notNull(),
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
    id: colunaId(),
    usoId: text('uso_id').notNull(),
    motivo: text('motivo', { enum: MOTIVOS_PARADA }).notNull(),
    inicio: dataHora('inicio').notNull(),
    fim: dataHora('fim'),
    ...colunasBase,
  },
  (table) => [indiceFazenda('paradas_uso', table.fazendaId), index('paradas_uso_uso_id_idx').on(table.usoId)]
);

export const ORIGENS_ABASTECIMENTO = ['fazenda', 'posto'] as const;
export type OrigemAbastecimento = (typeof ORIGENS_ABASTECIMENTO)[number];

/** Abastecimentos: o consumo é calculado de tanque cheio a tanque cheio. */
export const abastecimentos = sqliteTable(
  'abastecimentos',
  {
    id: colunaId(),
    maquinaId: text('maquina_id').notNull(),
    /** Uso em andamento quando abasteceu (abastece sem encerrar) */
    usoId: text('uso_id'),
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
    abastecidoEm: dataHora('abastecido_em').notNull(),
    ...colunasBase,
  },
  (table) => [indiceFazenda('abastecimentos', table.fazendaId), index('abastecimentos_maquina_data_idx').on(table.maquinaId, table.abastecidoEm)]
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
    id: colunaId(),
    maquinaId: text('maquina_id').notNull(),
    usoId: text('uso_id'),
    operador: text('operador'),
    operadorId: text('operador_id'),
    valorH: real('valor_h').notNull(),
    estimadoH: real('estimado_h'),
    origem: text('origem', { enum: ORIGENS_HORIMETRO }).notNull().default('avulsa'),
    fotoUri: text('foto_uri'),
    lidoEm: dataHora('lido_em').notNull(),
    ...colunasBase,
  },
  (table) => [indiceFazenda('leituras_horimetro', table.fazendaId), index('leituras_horimetro_maquina_data_idx').on(table.maquinaId, table.lidoEm)]
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
    id: colunaId(),
    maquinaId: text('maquina_id').notNull(),
    usoId: text('uso_id'),
    operador: text('operador'),
    operadorId: text('operador_id'),
    categoria: text('categoria', { enum: CATEGORIAS_PROBLEMA }).notNull(),
    podeUsar: integer('pode_usar', { mode: 'boolean' }).notNull(),
    descricao: text('descricao'),
    fotoUri: text('foto_uri'),
    lat: real('lat'),
    lng: real('lng'),
    registradoEm: dataHora('registrado_em').notNull(),
    resolvidaEm: dataHora('resolvida_em'),
    ...colunasBase,
  },
  (table) => [indiceFazenda('ocorrencias_maquina', table.fazendaId), index('ocorrencias_maquina_maquina_idx').on(table.maquinaId, table.resolvidaEm)]
);

/** Anotações livres da máquina (revisões, defeitos, observações). */
export const anotacoesMaquina = sqliteTable(
  'anotacoes_maquina',
  {
    id: colunaId(),
    maquinaId: text('maquina_id').notNull(),
    /** Uso em andamento quando foi anotada */
    usoId: text('uso_id'),
    texto: text('texto').notNull(),
    ...colunasBase,
  },
  (table) => [indiceFazenda('anotacoes_maquina', table.fazendaId), index('anotacoes_maquina_maquina_id_idx').on(table.maquinaId)]
);

export type Maquina = typeof maquinas.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovaMaquina = DadosNovos<typeof maquinas>;
export type UsoMaquina = typeof usosMaquina.$inferSelect;
export type AnotacaoMaquina = typeof anotacoesMaquina.$inferSelect;
export type PontoGps = typeof pontosGps.$inferSelect;
export type NovoPontoGps = typeof pontosGps.$inferInsert;
export type ParadaUso = typeof paradasUso.$inferSelect;
export type Abastecimento = typeof abastecimentos.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovoAbastecimento = DadosNovos<typeof abastecimentos>;
export type LeituraHorimetro = typeof leiturasHorimetro.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovaLeituraHorimetro = DadosNovos<typeof leiturasHorimetro>;
export type OcorrenciaMaquina = typeof ocorrenciasMaquina.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovaOcorrenciaMaquina = DadosNovos<typeof ocorrenciasMaquina>;
