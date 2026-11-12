import * as conta from './conta';
import * as mapa from './mapa';
import * as maquinas from './maquinas';
import * as notificacoes from './notificacoes';
import * as ordenha from './ordenha';
import * as rebanho from './rebanho';
import * as tarefas from './tarefas';

/**
 * Todas as tabelas e relações do banco local, para o Drizzle (consultas
 * relacionais) e para gerar o schema do PowerSync (ver features/sync/schema.ts).
 */
export const tabelas = {
  fazendas: conta.fazendas,
  fazendaMembros: conta.fazendaMembros,
  usuarios: conta.usuarios,
  perfilLocal: conta.perfilLocal,
  fazendaConfig: conta.fazendaConfig,

  lotes: rebanho.lotes,
  animais: rebanho.animais,
  pesagens: rebanho.pesagens,
  reproducoes: rebanho.reproducoes,
  tratamentos: rebanho.tratamentos,
  dosesAplicadas: rebanho.dosesAplicadas,
  avaliacoesCorporais: rebanho.avaliacoesCorporais,
  controlesLeiteiros: rebanho.controlesLeiteiros,
  secagens: rebanho.secagens,
  mastites: rebanho.mastites,
  cios: rebanho.cios,
  exames: rebanho.exames,
  anotacoesAnimal: rebanho.anotacoesAnimal,
  lotesRelations: rebanho.lotesRelations,
  animaisRelations: rebanho.animaisRelations,
  pesagensRelations: rebanho.pesagensRelations,
  reproducoesRelations: rebanho.reproducoesRelations,
  tratamentosRelations: rebanho.tratamentosRelations,
  dosesAplicadasRelations: rebanho.dosesAplicadasRelations,

  ordenhas: ordenha.ordenhas,
  notificacoesAgendadas: notificacoes.notificacoesAgendadas,

  maquinas: maquinas.maquinas,
  usosMaquina: maquinas.usosMaquina,
  pontosGps: maquinas.pontosGps,
  paradasUso: maquinas.paradasUso,
  abastecimentos: maquinas.abastecimentos,
  leiturasHorimetro: maquinas.leiturasHorimetro,
  ocorrenciasMaquina: maquinas.ocorrenciasMaquina,
  anotacoesMaquina: maquinas.anotacoesMaquina,

  talhoes: mapa.talhoes,
  marcadoresMapa: mapa.marcadoresMapa,
  movimentacoes: mapa.movimentacoes,
  calculosCerca: mapa.calculosCerca,
  modelosCultura: mapa.modelosCultura,
  ciclosPlantio: mapa.ciclosPlantio,
  etapasCiclo: mapa.etapasCiclo,
  usosArea: mapa.usosArea,
  talhoesRelations: mapa.talhoesRelations,
  ciclosPlantioRelations: mapa.ciclosPlantioRelations,
  etapasCicloRelations: mapa.etapasCicloRelations,
  movimentacoesRelations: mapa.movimentacoesRelations,
  marcadoresMapaRelations: mapa.marcadoresMapaRelations,

  tarefas: tarefas.tarefas,
  tarefaEventos: tarefas.tarefaEventos,
  avisosFazenda: tarefas.avisosFazenda,
  tarefasRelations: tarefas.tarefasRelations,
  tarefaEventosRelations: tarefas.tarefaEventosRelations,
};

/** Só no celular: nunca entram na fila de upload nem descem do servidor. */
export const TABELAS_LOCAIS = [
  conta.perfilLocal,
  notificacoes.notificacoesAgendadas,
  maquinas.pontosGps,
] as const;

/** Descem do servidor e só mudam pelos endpoints REST (o upload descarta escritas locais). */
export const TABELAS_SO_LEITURA = ['fazendas', 'fazenda_membros', 'usuarios'] as const;
