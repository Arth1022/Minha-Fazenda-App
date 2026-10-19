/**
 * Formatadores de unidades rurais (hectares, peso, litros, datas)
 */

export function formatHectares(areaHa?: number | null): string {
  if (areaHa === undefined || areaHa === null) return '0 Ha';
  return `${Number(areaHa.toFixed(1))} Ha`;
}

export function formatWeightKg(pesoKg?: number | null): string {
  if (pesoKg === undefined || pesoKg === null) return '0 kg';
  if (pesoKg >= 1000) {
    return `${(pesoKg / 1000).toFixed(1)} Ton`;
  }
  return `${Number(pesoKg.toFixed(1))} kg`;
}

export function formatLiters(liters?: number | null): string {
  if (liters === undefined || liters === null) return '0 L';
  return `${Number(liters.toFixed(1))} L`;
}
