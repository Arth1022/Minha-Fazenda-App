import type { TipoTalhao } from '@/database/schema';

/**
 * Tipos de área do mapa. No banco a área é uma linha de `talhoes` (nome
 * histórico); na tela ela é sempre "área", e "Lavoura/Talhão" é um dos tipos.
 */
export const ORDEM_TIPOS_AREA: TipoTalhao[] = ['pasto', 'lavoura', 'reserva', 'outro'];

export const ROTULO_TIPO_AREA: Record<TipoTalhao, string> = {
  pasto: 'Pasto',
  lavoura: 'Lavoura/Talhão',
  reserva: 'Reserva/APP',
  outro: 'Outro',
};

/** A cor de preenchimento vem do tipo; o estado aparece por selo e contorno. */
export const COR_POR_TIPO_AREA: Record<TipoTalhao, string> = {
  pasto: '#22C55E',
  lavoura: '#EAB308',
  reserva: '#166534',
  outro: '#0EA5E9',
};
