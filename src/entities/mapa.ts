import { relations } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { colunaId, colunasBase, dataHora, indiceFazenda } from './base';
import type { DadosNovos } from './escrita';
import { animais, lotes } from './rebanho';

export const TIPOS_TALHAO = ['pasto', 'lavoura', 'reserva', 'outro'] as const;
export type TipoTalhao = (typeof TIPOS_TALHAO)[number];

export const FASES_LAVOURA = ['preparo', 'vegetativo', 'colheita', 'pousio'] as const;
export type FaseLavoura = (typeof FASES_LAVOURA)[number];

export const TIPOS_MARCADOR_MAPA = ['praga', 'daninha', 'erosao', 'outro'] as const;
export type TipoMarcadorMapa = (typeof TIPOS_MARCADOR_MAPA)[number];

export interface GeometriaPoligono {
  type: 'Polygon';
  coordinates: number[][][];
}

/**
 * Áreas do mapa (na tela, "área"; "Lavoura/Talhão" é um dos tipos). O tipo
 * decide as ações; a cor é a do tipo; excluir preenche `deleted_at`.
 */
export const talhoes = sqliteTable(
  'talhoes',
  {
    id: colunaId(),
    nome: text('nome').notNull(),
    tipo: text('tipo', { enum: TIPOS_TALHAO }).notNull().default('pasto'),
    /** Cor do tipo, gravada para o sync; a tela usa a do tipo */
    cor: text('cor').notNull(),
    areaHectares: real('area_hectares').notNull(),
    /** Perímetro (m), calculado junto com a área; null só em área antiga ainda não recalculada */
    perimetroM: real('perimetro_m'),
    geometriaJson: text('geometria_json', { mode: 'json' }).$type<GeometriaPoligono>().notNull(),
    centroLat: real('centro_lat').notNull(),
    centroLng: real('centro_lng').notNull(),
    minLat: real('min_lat').notNull(),
    maxLat: real('max_lat').notNull(),
    minLng: real('min_lng').notNull(),
    maxLng: real('max_lng').notNull(),
    cultura: text('cultura'),
    faseLavoura: text('fase_lavoura', { enum: FASES_LAVOURA }),
    dataPlantio: dataHora('data_plantio'),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('talhoes', table.fazendaId),
    index('talhoes_bbox_idx').on(table.minLat, table.maxLat, table.minLng, table.maxLng),
  ]
);

export const marcadoresMapa = sqliteTable(
  'marcadores_mapa',
  {
    id: colunaId(),
    talhaoId: text('talhao_id'),
    tipo: text('tipo', { enum: TIPOS_MARCADOR_MAPA }).notNull(),
    titulo: text('titulo').notNull(),
    descricao: text('descricao'),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    resolvido: integer('resolvido', { mode: 'boolean' }).notNull().default(false),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('marcadores_mapa', table.fazendaId),
    index('marcadores_mapa_lat_lng_idx').on(table.lat, table.lng),
    index('marcadores_mapa_talhao_idx').on(table.talhaoId),
  ]
);

/**
 * Movimentações de animais entre pastos (só acréscimo, RN-007): entrar num
 * pasto abre uma linha; sair dele preenche `saida_em`. O local atual do animal
 * é a linha aberta (no máximo uma por animal: mover fecha a anterior na mesma transação);
 * sem linha aberta, o animal está "sem local definido".
 */
export const movimentacoes = sqliteTable(
  'movimentacoes',
  {
    id: colunaId(),
    animalId: text('animal_id').notNull(),
    areaId: text('area_id').notNull(),
    /** Lote movido inteiro junto com o animal; null quando ele foi movido sozinho */
    loteId: text('lote_id'),
    entradaEm: dataHora('entrada_em').notNull(),
    saidaEm: dataHora('saida_em'),
    registradoPor: text('registrado_por'),
    registradoPorId: text('registrado_por_id'),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('movimentacoes', table.fazendaId),
    // Histórico do animal (ficha) e a linha aberta dele (RN-001)
    index('movimentacoes_animal_entrada_idx').on(table.animalId, table.entradaEm),
    // Ocupação de todas as áreas numa leitura só do índice (cabeças, desde, última saída)
    index('movimentacoes_area_idx').on(table.areaId, table.saidaEm, table.entradaEm),
    // Pasto do lote: a última vez que ele foi movido inteiro
    index('movimentacoes_lote_entrada_idx').on(table.loteId, table.entradaEm),
    // Feed da fazenda: movimentações do dia
    index('movimentacoes_entrada_em_idx').on(table.entradaEm),
  ]
);

export const TIPOS_DE_CERCA = ['arame4', 'arame5', 'eletrica1', 'eletrica2'] as const;
export type TipoDeCerca = (typeof TIPOS_DE_CERCA)[number];

/**
 * Cerca calculada para uma área (M3): uma por área, salva pela ação "Cercar
 * esta área". Guarda o perímetro e os cantos usados na conta; redesenhar a
 * área marca a conta como desatualizada (RN-010) até ser salva de novo.
 */
export const calculosCerca = sqliteTable(
  'calculos_cerca',
  {
    id: colunaId(),
    areaId: text('area_id').notNull(),
    tipoCerca: text('tipo_cerca', { enum: TIPOS_DE_CERCA }).notNull(),
    fios: integer('fios').notNull(),
    /** Distância entre mourões (m) */
    espacamentoM: real('espacamento_m').notNull(),
    /** Perímetro da área quando a conta foi feita (m) */
    perimetroM: real('perimetro_m').notNull(),
    /** Cantos do contorno (esticadores = fios × cantos) */
    cantos: integer('cantos').notNull(),
    metrosArame: real('metros_arame').notNull(),
    rolos: integer('rolos').notNull(),
    mouroes: integer('mouroes').notNull(),
    esticadores: integer('esticadores').notNull(),
    /** Preços informados (R$ por unidade); sem preço, sem custo */
    precoRolo: real('preco_rolo'),
    precoMourao: real('preco_mourao'),
    precoEsticador: real('preco_esticador'),
    custo: real('custo'),
    /** A área foi redesenhada depois da conta (RF-032) */
    desatualizado: integer('desatualizado', { mode: 'boolean' }).notNull().default(false),
    ...colunasBase,
  },
  (table) => [indiceFazenda('calculos_cerca', table.fazendaId), index('calculos_cerca_area_idx').on(table.areaId)]
);

/** Etapas da linha do tempo do plantio (RF-038): o tipo diz o papel dela no ciclo. */
export const TIPOS_ETAPA = ['preparo', 'plantio', 'trato', 'colheita'] as const;
export type TipoEtapa = (typeof TIPOS_ETAPA)[number];

/** Ativo (no máximo um por área), encerrado pela colheita ou cancelado. */
export const STATUS_CICLO = ['ativo', 'encerrado', 'cancelado'] as const;
export type StatusCiclo = (typeof STATUS_CICLO)[number];

/** Etapa de um modelo de cultura: dias em relação ao plantio (negativo: antes dele). */
export interface EtapaModelo {
  nome: string;
  tipo: TipoEtapa;
  dias: number;
}

/**
 * Modelos de cultura criados pelo admin (RF-042). Os prontos (milho silagem,
 * braquiária, mombaça) ficam no código e não ocupam linha aqui. As etapas vão
 * em JSON: são lidas sempre junto com o modelo e nunca consultadas sozinhas.
 */
export const modelosCultura = sqliteTable(
  'modelos_cultura',
  {
  id: colunaId(),
  nome: text('nome').notNull(),
  /** Taxa de semeadura sugerida (kg/ha); null: informar ao plantar */
  taxaKgHa: real('taxa_kg_ha'),
  /** Embalagem da semente (kg) */
  sacoKg: real('saco_kg').notNull().default(20),
  etapas: text('etapas', { mode: 'json' }).$type<EtapaModelo[]>().notNull(),
  ...colunasBase,
  },
  (table) => [indiceFazenda('modelos_cultura', table.fazendaId)]
);

/**
 * Ciclo de plantio de uma lavoura (M4): uma cultura por ciclo e no máximo um
 * ativo por área (RN-009, conferido na transação que planta). Guarda a conta das
 * sementes feita ao plantar (RF-036). A colheita feita encerra o ciclo (RF-041).
 * O resumo do ciclo ativo (cultura, fase, plantio) é copiado para a área na
 * mesma transação: rótulo e selo do mapa saem da tabela de áreas, sem JOIN.
 */
export const ciclosPlantio = sqliteTable(
  'ciclos_plantio',
  {
    id: colunaId(),
    areaId: text('area_id').notNull(),
    /** Nome da cultura como aparece na tela ("Milho silagem") */
    cultura: text('cultura').notNull(),
    /**
     * Modelo que gerou a linha do tempo: chave de um pronto ou id de
     * `modelos_cultura`. Sem FK: os prontos vivem no código, e as etapas já
     * foram copiadas para `etapas_ciclo`.
     */
    modeloId: text('modelo_id'),
    dataPlantio: dataHora('data_plantio').notNull(),
    /** Conta das sementes no plantio (RF-036) */
    areaHa: real('area_ha').notNull(),
    taxaKgHa: real('taxa_kg_ha').notNull(),
    sacoKg: real('saco_kg').notNull(),
    sementesKg: real('sementes_kg').notNull(),
    sacos: integer('sacos').notNull(),
    /** A área foi redesenhada depois da conta (RN-010) */
    calculoDesatualizado: integer('calculo_desatualizado', { mode: 'boolean' }).notNull().default(false),
    status: text('status', { enum: STATUS_CICLO }).notNull().default('ativo'),
    /** Quando foi colhido ou cancelado */
    encerradoEm: dataHora('encerrado_em'),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('ciclos_plantio', table.fazendaId),
    // RN-009 / RF-037: o ciclo ativo da área
    index('ciclos_plantio_area_status_idx').on(table.areaId, table.status),
    // Ciclos anteriores da área, do mais recente para o mais antigo
    index('ciclos_plantio_area_plantio_idx').on(table.areaId, table.dataPlantio),
  ]
);

/**
 * Etapas da linha do tempo de um ciclo (RF-038/RF-039): geradas do modelo com
 * as datas previstas a partir do plantio. Dá para mudar a data prevista, marcar
 * feita (só acréscimo, RN-007: não há "desfazer") e anotar. Atribuída a um
 * colaborador, a etapa vira tarefa dele (M6, RF-067).
 */
export const etapasCiclo = sqliteTable(
  'etapas_ciclo',
  {
    id: colunaId(),
    cicloId: text('ciclo_id').notNull(),
    ordem: integer('ordem').notNull(),
    nome: text('nome').notNull(),
    tipo: text('tipo', { enum: TIPOS_ETAPA }).notNull(),
    previstaEm: dataHora('prevista_em').notNull(),
    realizadaEm: dataHora('realizada_em'),
    observacao: text('observacao'),
    /** Colaborador responsável (tarefa, M6). Sem FK: as pessoas vêm do login/API, não de tabela local */
    responsavelId: text('responsavel_id'),
    /** Nome do responsável copiado: a tela mostra "João" sem depender da lista online */
    responsavelNome: text('responsavel_nome'),
    atribuidaEm: dataHora('atribuida_em'),
    /** Quem atribuiu (recebe o aviso quando a tarefa for concluída, RF-070) */
    atribuidaPor: text('atribuida_por'),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('etapas_ciclo', table.fazendaId),
    index('etapas_ciclo_ciclo_ordem_idx').on(table.cicloId, table.ordem),
    // "Minhas tarefas" (RF-068): as etapas da pessoa, por data
    index('etapas_ciclo_responsavel_idx').on(table.responsavelId, table.previstaEm),
  ]
);

/**
 * Tempo e KM de cada uso de máquina por área (M5, RF-057): a interseção do
 * rastro com as áreas, gravada ao encerrar o uso. O painel da área ("Horas de
 * máquina", usos que passaram nela, RF-066) lê daqui pelo índice, sem abrir o
 * JSON de todos os usos. O início do uso é copiado para filtrar "hoje" sem JOIN.
 */
export const usosArea = sqliteTable(
  'usos_area',
  {
    id: colunaId(),
    usoId: text('uso_id').notNull(),
    areaId: text('area_id').notNull(),
    inicio: dataHora('inicio').notNull(),
    segundos: integer('segundos').notNull(),
    km: real('km').notNull(),
    ...colunasBase,
  },
  (table) => [
    indiceFazenda('usos_area', table.fazendaId),
    index('usos_area_uso_area_idx').on(table.usoId, table.areaId),
    index('usos_area_area_inicio_idx').on(table.areaId, table.inicio),
  ]
);

export const talhoesRelations = relations(talhoes, ({ many }) => ({
  marcadores: many(marcadoresMapa),
  movimentacoes: many(movimentacoes),
  ciclos: many(ciclosPlantio),
}));

export const ciclosPlantioRelations = relations(ciclosPlantio, ({ one, many }) => ({
  area: one(talhoes, { fields: [ciclosPlantio.areaId], references: [talhoes.id] }),
  etapas: many(etapasCiclo),
}));

export const etapasCicloRelations = relations(etapasCiclo, ({ one }) => ({
  ciclo: one(ciclosPlantio, { fields: [etapasCiclo.cicloId], references: [ciclosPlantio.id] }),
}));

export const movimentacoesRelations = relations(movimentacoes, ({ one }) => ({
  animal: one(animais, { fields: [movimentacoes.animalId], references: [animais.id] }),
  area: one(talhoes, { fields: [movimentacoes.areaId], references: [talhoes.id] }),
  lote: one(lotes, { fields: [movimentacoes.loteId], references: [lotes.id] }),
}));

export const marcadoresMapaRelations = relations(marcadoresMapa, ({ one }) => ({
  talhao: one(talhoes, { fields: [marcadoresMapa.talhaoId], references: [talhoes.id] }),
}));

export type Talhao = typeof talhoes.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovoTalhao = DadosNovos<typeof talhoes>;
export type MarcadorMapa = typeof marcadoresMapa.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovoMarcadorMapa = DadosNovos<typeof marcadoresMapa>;
export type Movimentacao = typeof movimentacoes.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovaMovimentacao = DadosNovos<typeof movimentacoes>;
export type CalculoCerca = typeof calculosCerca.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovoCalculoCerca = DadosNovos<typeof calculosCerca>;
export type ModeloCultura = typeof modelosCultura.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovoModeloCultura = DadosNovos<typeof modelosCultura>;
export type CicloPlantio = typeof ciclosPlantio.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovoCicloPlantio = DadosNovos<typeof ciclosPlantio>;
export type EtapaCiclo = typeof etapasCiclo.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovaEtapaCiclo = DadosNovos<typeof etapasCiclo>;
export type UsoArea = typeof usosArea.$inferSelect;
/** Dados para `novoRegistro` (sem id, fazenda, autor e datas) */
export type NovoUsoArea = DadosNovos<typeof usosArea>;
