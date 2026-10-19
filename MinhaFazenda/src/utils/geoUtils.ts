/**
 * Utilitários de cálculos agrícolas e geométricos (100% locais / offline)
 */

export interface FenceEstimate {
  perimeterMeters: number;
  postsNeeded: number;
  wireMetersNeeded: number;
  wireRolls500m: number;
}

/**
 * Estima o perímetro aproximado em metros a partir da área em hectares
 * (assumindo formato aproximadamente retangular/quadrado caso não haja polígono detalhado)
 * 1 hectare = 10.000 m²
 */
export function estimatePerimeterFromHectares(areaHa: number): number {
  if (areaHa <= 0) return 0;
  const areaSqMeters = areaHa * 10000;
  const sideMeters = Math.sqrt(areaSqMeters);
  return Math.round(sideMeters * 4);
}

/**
 * Calcula estimativa de mourões e arame para cercamento de talhões
 * @param lengthMeters Comprimento total da cerca em metros
 * @param postSpacingMeters Espaçamento entre mourões (padrão: 2.5m)
 * @param wireStrands Número de fios de arame (padrão: 5 fios)
 */
export function calculateFenceMaterials(
  lengthMeters: number,
  postSpacingMeters: number = 2.5,
  wireStrands: number = 5
): FenceEstimate {
  if (lengthMeters <= 0) {
    return { perimeterMeters: 0, postsNeeded: 0, wireMetersNeeded: 0, wireRolls500m: 0 };
  }
  const postsNeeded = Math.ceil(lengthMeters / postSpacingMeters) + 1;
  const wireMetersNeeded = Math.ceil(lengthMeters * wireStrands);
  const wireRolls500m = Math.ceil(wireMetersNeeded / 500);

  return {
    perimeterMeters: Math.round(lengthMeters),
    postsNeeded,
    wireMetersNeeded,
    wireRolls500m,
  };
}

/**
 * Calcula a quantidade necessária de sementes/mudas pela área do talhão em hectares
 * @param areaHa Área do talhão em hectares
 * @param rateKgPerHa Taxa de semeadura em kg por hectare (ex: 20 kg/ha para milho)
 */
export function calculateSeedRequirementKg(areaHa: number, rateKgPerHa: number = 20): number {
  if (areaHa <= 0 || rateKgPerHa <= 0) return 0;
  return Number((areaHa * rateKgPerHa).toFixed(1));
}
