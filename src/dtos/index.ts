/**
 * Contratos entre as telas e as camadas de data/services. Telas, hooks, services
 * e testes importam os tipos daqui (`@/dtos`). Os tipos das tabelas continuam
 * inferidos pelo Drizzle em database/schema e são só reexportados.
 */
export * from './animal.dto';
export * from './fazenda.dto';
export * from './ficha.dto';
export * from './notificacoes.dto';
export * from './novoTratamento.dto';
export * from './ordenha.dto';
export * from './pesagem.dto';
export * from './reproducao.dto';
export * from './tratamento.dto';
