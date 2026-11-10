/**
 * Contas das calculadoras do Mapa (sementes e cerca). Funções puras: a tela só
 * passa os números digitados e mostra o resultado.
 */

export type CulturaSemente = 'braquiaria' | 'mombaca' | 'milho' | 'outra';

export interface ConfigCultura {
  rotulo: string;
  /** Taxa sugerida; null em "Outra", que depende da embalagem */
  taxaKgHa: number | null;
  sacoKg: number;
}

export const CULTURAS: Record<CulturaSemente, ConfigCultura> = {
  braquiaria: { rotulo: 'Braquiária', taxaKgHa: 12, sacoKg: 20 },
  mombaca: { rotulo: 'Mombaça', taxaKgHa: 5, sacoKg: 5 },
  milho: { rotulo: 'Milho silagem', taxaKgHa: 20, sacoKg: 20 },
  outra: { rotulo: 'Outra', taxaKgHa: null, sacoKg: 20 },
};

export const ORDEM_CULTURAS: CulturaSemente[] = ['braquiaria', 'mombaca', 'milho', 'outra'];

export type TipoCerca = 'arame4' | 'arame5' | 'eletrica1' | 'eletrica2';

export const TIPOS_CERCA: Record<TipoCerca, { rotulo: string; fios: number }> = {
  arame4: { rotulo: 'Arame 4 fios', fios: 4 },
  arame5: { rotulo: 'Arame 5 fios', fios: 5 },
  eletrica1: { rotulo: 'Elétrica 1 fio', fios: 1 },
  eletrica2: { rotulo: 'Elétrica 2 fios', fios: 2 },
};

export const ORDEM_TIPOS_CERCA: TipoCerca[] = ['arame4', 'arame5', 'eletrica1', 'eletrica2'];

/** Distâncias entre mourões oferecidas, em metros */
export const ESPACAMENTOS_MOUROES = [2.5, 3, 4] as const;

export const METROS_POR_ROLO = 500;

/**
 * Lê o número digitado aceitando vírgula ("15,2") e milhar com ponto ("1.200,5").
 * Vazio ou inválido vira 0; negativo também.
 */
export function lerNumero(texto: string): number {
  const limpo = texto.trim();
  if (!limpo) return 0;
  const normalizado =
    limpo.includes(',') && limpo.includes('.')
      ? limpo.replace(/\./g, '').replace(',', '.')
      : limpo.replace(',', '.');
  const valor = Number(normalizado);
  return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

/** Número no padrão brasileiro, sem casas sobrando: 12000 → "12.000", 182.4 → "182,4". */
export function formatarNumero(valor: number, casasMax = 1): string {
  const fator = 10 ** casasMax;
  const arredondado = Math.round(valor * fator) / fator;
  const [inteiro, decimais] = Math.abs(arredondado).toFixed(casasMax).split('.');
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const casas = decimais?.replace(/0+$/, '');
  return `${arredondado < 0 ? '-' : ''}${comMilhar}${casas ? `,${casas}` : ''}`;
}

/** Distância curta em metros, longa em km: 0.42 → "420 m", 2.4 → "2,4 km". */
export function formatarDistancia(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${formatarNumero(km, 2)} km`;
}

/** Área em hectares com até 2 casas: 15.2 → "15,2 ha". */
export function formatarHectares(ha: number): string {
  return `${formatarNumero(ha, 2)} ha`;
}

/** Texto para preencher um campo numérico a partir de um valor (ex.: 15.234 → "15,2"). */
export function paraCampo(valor: number, casasMax = 1): string {
  return valor > 0 ? formatarNumero(valor, casasMax).replace(/\./g, '') : '';
}

export interface ResultadoSementes {
  totalKg: number;
  sacos: number;
  sacoKg: number;
}

export function calcularSementes(
  areaHa: number,
  taxaKgHa: number,
  sacoKg: number,
): ResultadoSementes {
  const totalKg = Math.round(areaHa * taxaKgHa * 10) / 10;
  return { totalKg, sacos: totalKg > 0 ? Math.ceil(totalKg / sacoKg) : 0, sacoKg };
}

export interface ResultadoCerca {
  metrosCerca: number;
  metrosArame: number;
  rolos: number;
  mouroes: number;
}

/** Arame: um fio por volta inteira. Mourões: um a cada espaçamento, mais o do fim da linha. */
export function calcularCerca(km: number, fios: number, espacamentoM: number): ResultadoCerca {
  const metrosCerca = Math.round(km * 1000);
  const metrosArame = metrosCerca * fios;
  return {
    metrosCerca,
    metrosArame,
    rolos: metrosArame > 0 ? Math.ceil(metrosArame / METROS_POR_ROLO) : 0,
    mouroes: metrosCerca > 0 ? Math.ceil(metrosCerca / espacamentoM) + 1 : 0,
  };
}

export type InsumoAdubacao = 'npk' | 'ureia' | 'calcario' | 'outro';

export interface ConfigInsumoAdubacao {
  rotulo: string;
  doseKgHa: number | null;
  embalagemKg: number;
}

export const INSUMOS_ADUBACAO: Record<InsumoAdubacao, ConfigInsumoAdubacao> = {
  npk: { rotulo: 'Adubo NPK', doseKgHa: 300, embalagemKg: 50 },
  ureia: { rotulo: 'Ureia (cobertura)', doseKgHa: 150, embalagemKg: 50 },
  calcario: { rotulo: 'Calcário', doseKgHa: 2000, embalagemKg: 50 },
  outro: { rotulo: 'Outro insumo', doseKgHa: null, embalagemKg: 50 },
};

export const ORDEM_INSUMOS_ADUBACAO: InsumoAdubacao[] = ['npk', 'ureia', 'calcario', 'outro'];

export interface ResultadoAdubacao {
  totalKg: number;
  sacos: number;
  toneladas: number;
  embalagemKg: number;
}

/** Adubação e calagem: área × dose (kg/ha) → kg totais, sacos e toneladas. */
export function calcularAdubacao(
  areaHa: number,
  doseKgHa: number,
  embalagemKg = 50,
): ResultadoAdubacao {
  const totalKg = areaHa > 0 && doseKgHa > 0 ? Math.round(areaHa * doseKgHa * 10) / 10 : 0;
  return {
    totalKg,
    sacos: totalKg > 0 && embalagemKg > 0 ? Math.ceil(totalKg / embalagemKg) : 0,
    toneladas: Math.round((totalKg / 1000) * 100) / 100,
    embalagemKg,
  };
}

export const OPCOES_CULTURA_LAVOURA: { valor: string; rotulo: string }[] = [
  { valor: 'milho', rotulo: 'Milho' },
  { valor: 'soja', rotulo: 'Soja' },
  { valor: 'sorgo', rotulo: 'Sorgo' },
  { valor: 'silagem', rotulo: 'Silagem' },
  { valor: 'feijao', rotulo: 'Feijão' },
  { valor: 'outro', rotulo: 'Outra' },
];

export const ROTULO_CULTURA_LAVOURA: Record<string, string> = {
  milho: 'Milho',
  soja: 'Soja',
  sorgo: 'Sorgo',
  silagem: 'Silagem',
  feijao: 'Feijão',
  outro: 'Outra cultura',
};

export const ROTULO_FASE_LAVOURA: Record<string, string> = {
  preparo: 'Em Preparo',
  vegetativo: 'Vegetativo',
  colheita: 'Pronto p/ Colheita',
  pousio: 'Pousio / Colhido',
};

export function diasDesdePlantio(dataPlantio: Date | null | undefined, agora = new Date()): number | null {
  if (!dataPlantio) return null;
  const diffMs = agora.getTime() - dataPlantio.getTime();
  return diffMs >= 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
}
