/** Nomes que o sistema guarda: não mudar depois de publicado (tarefas já registradas). */

/** Tarefa de localização em segundo plano: um ponto a cada 5 s com a máquina em uso */
export const TAREFA_RASTRO = 'rastro-maquina';
/** Tarefa que recebe os botões do aviso de parada com o app fechado (Android) */
export const TAREFA_RESPOSTA_AVISO = 'resposta-aviso-maquina';
/** Categoria do aviso "Parada há 20 min" (sem ":" nem "-", regra do expo-notifications) */
export const CATEGORIA_PARADA = 'parada_maquina';

export const ACOES_AVISO = {
  pausa: 'PAUSA',
  continua: 'CONTINUA',
  encerrar: 'ENCERRAR',
} as const;
export type AcaoAviso = (typeof ACOES_AVISO)[keyof typeof ACOES_AVISO];

/** Tela do uso em andamento (aberta pela notificação) */
export const ROTA_EM_USO = '/maquina/em-uso';
