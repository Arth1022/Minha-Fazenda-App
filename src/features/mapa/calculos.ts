/**
 * Regras de negócio e cálculos agrícolas do domínio de Mapa & Talhões (100% locais / offline)
 */

export interface FenceEstimate {
  perimeterMeters: number;
  postsNeeded: number;
  wireMetersNeeded: number;
  wireRolls500m: number;
}

/**
 * Calcula o perímetro em metros a partir de coordenadas GeoJSON (Polygon / MultiPolygon)
 * usando a fórmula de Haversine diretamente para cálculo preciso e 100% offline.
 */
function haversineDistanceMeters(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371000; // Raio da Terra em metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculatePerimeterFromGeoJson(geoJsonStr?: string): number | null {
  if (!geoJsonStr) return null;
  try {
    const parsed = JSON.parse(geoJsonStr);
    let rings: [number, number][][] = [];

    if (parsed.type === 'Feature' && parsed.geometry) {
      if (parsed.geometry.type === 'Polygon') {
        rings = parsed.geometry.coordinates;
      }
    } else if (parsed.type === 'Polygon') {
      rings = parsed.coordinates;
    }

    if (!rings || rings.length === 0) return null;

    let totalPerimeter = 0;
    // O anel externo (outer ring) é o índice 0
    const outerRing = rings[0];
    for (let i = 0; i < outerRing.length - 1; i++) {
      totalPerimeter += haversineDistanceMeters(outerRing[i], outerRing[i + 1]);
    }

    return Math.round(totalPerimeter);
  } catch {
    return null;
  }
}

export function calculatePerimeterFromTalhao(
  areaHa?: number,
  poligonoGeoJson?: string
): number {
  if (poligonoGeoJson) {
    const geoPerimeter = calculatePerimeterFromGeoJson(poligonoGeoJson);
    if (geoPerimeter !== null && geoPerimeter > 0) {
      return geoPerimeter;
    }
  }
  return estimatePerimeterFromHectares(areaHa || 0);
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
