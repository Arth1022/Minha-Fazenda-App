/**
 * Regras de negócio e cálculos agrícolas do domínio de Mapa & Talhões (100% locais / offline)
 */

export interface FenceEstimate {
  perimeterMeters: number;
  postsNeeded: number;
  wireMetersNeeded: number;
  wireRolls500m: number;
}

export function estimatePerimeterFromHectares(areaHa: number): number {
  if (areaHa <= 0) return 0;
  const areaSqMeters = areaHa * 10000;
  const sideMeters = Math.sqrt(areaSqMeters);
  return Math.round(sideMeters * 4);
}

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

export function calculateSeedRequirementKg(areaHa: number, rateKgPerHa: number = 20): number {
  if (areaHa <= 0 || rateKgPerHa <= 0) return 0;
  return Number((areaHa * rateKgPerHa).toFixed(1));
}
