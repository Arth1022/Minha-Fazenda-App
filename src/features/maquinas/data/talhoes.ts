import { listarTalhoesAtivos } from '@/services/talhaoService';
import type { TalhaoDoRastro } from '../services/rastro';

/** Talhões do mapa offline, prontos para testar em qual a máquina está. */
export async function talhoesParaRastro(): Promise<TalhaoDoRastro[]> {
  const talhoes = await listarTalhoesAtivos();
  return talhoes
    .filter((t) => t.geometriaJson?.coordinates?.[0]?.length >= 4)
    .map((t) => ({
      id: t.id,
      nome: t.nome,
      anel: t.geometriaJson.coordinates[0],
      caixa: { minLat: t.minLat, maxLat: t.maxLat, minLng: t.minLng, maxLng: t.maxLng },
    }));
}
