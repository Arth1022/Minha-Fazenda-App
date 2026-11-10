import type { TipoTalhao } from '@/database/schema';

/**
 * Tipos de área do mapa. No banco a área é uma linha de `talhoes` (nome
 * histórico); na tela ela é sempre "área", e "Lavoura/Talhão" é um dos tipos.
 */
export const ORDEM_TIPOS_AREA: TipoTalhao[] = ['pasto', 'lavoura', 'reserva', 'outro'];

/** Nome completo do tipo, para escolher (ex.: folha "Salvar área"). */
export const ROTULO_TIPO_AREA: Record<TipoTalhao, string> = {
  pasto: 'Pasto',
  lavoura: 'Lavoura/Talhão',
  reserva: 'Reserva/APP',
  outro: 'Outro',
};

/** Nome curto do tipo, nos resumos ("Pasto · 28,4 ha · 2,14 km"). */
export const ROTULO_CURTO_TIPO_AREA: Record<TipoTalhao, string> = {
  pasto: 'Pasto',
  lavoura: 'Lavoura',
  reserva: 'Reserva',
  outro: 'Outro',
};

/**
 * A cor de preenchimento e do contorno vem do tipo (protótipo "Minha Fazenda");
 * o estado aparece por selo e contorno tracejado.
 */
export const COR_POR_TIPO_AREA: Record<TipoTalhao, string> = {
  pasto: '#E9C46A',
  lavoura: '#E76F51',
  reserva: '#2A9D8F',
  outro: '#8E9AAF',
};
