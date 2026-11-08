import { MARCAS_COM_LOGO } from './marcas';

export * from './labels';

/** Marcas comuns no campo que ainda não têm logo (aparecem só no autocompletar). */
const MARCAS_SEM_LOGO = [
  'Agrale',
  'Baldan',
  'Claas',
  'DeLaval',
  'Deutz-Fahr',
  'Fendt',
  'GEA',
  'Jacto',
  'Kuhn',
  'LS Tractor',
  'Mercedes-Benz',
  'Semeato',
  'Stara',
  'Tatu Marchesan',
];

/** Sugestões do campo Marca no cadastro: as com logo e as mais comuns sem logo. */
export const MARCAS_MAQUINAS: readonly string[] = [...MARCAS_COM_LOGO, ...MARCAS_SEM_LOGO].sort(
  (a, b) => a.localeCompare(b)
);
