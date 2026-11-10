import { asc, eq } from 'drizzle-orm';

import {
  db,
  marcadoresMapa,
  type MarcadorMapa,
  type TipoMarcadorMapa,
} from '@/database';
import { pontoDentroDoPoligono, type Coordenada } from '@/utils/geoMath';
import { listarTalhoesAtivos } from './talhaoService';

export interface DadosCriarMarcador {
  tipo: TipoMarcadorMapa;
  titulo: string;
  descricao?: string | null;
  lat: number;
  lng: number;
  talhaoId?: string | null;
}

/**
 * Cria um marcador georreferenciado no mapa (praga, daninha, erosão ou outro).
 * Se `talhaoId` não for informado, detecta automaticamente se o ponto cai dentro
 * de algum talhão ativo usando BBOX + ray casting.
 */
export async function criarMarcador(dados: DadosCriarMarcador): Promise<MarcadorMapa> {
  const tituloLimpo = dados.titulo.trim();
  if (!tituloLimpo) {
    throw new Error('Informe o título do ponto de atenção.');
  }

  let talhaoId = dados.talhaoId;
  if (talhaoId === undefined) {
    const ativos = await listarTalhoesAtivos();
    const encontrado = ativos.find(
      (t) =>
        dados.lat >= t.minLat &&
        dados.lat <= t.maxLat &&
        dados.lng >= t.minLng &&
        dados.lng <= t.maxLng &&
        pontoDentroDoPoligono(
          [dados.lng, dados.lat],
          (t.geometriaJson.coordinates[0] ?? []) as Coordenada[],
        ),
    );
    talhaoId = encontrado?.id ?? null;
  }

  const [criado] = await db
    .insert(marcadoresMapa)
    .values({
      talhaoId: talhaoId ?? null,
      tipo: dados.tipo,
      titulo: tituloLimpo,
      descricao: dados.descricao?.trim() || null,
      lat: dados.lat,
      lng: dados.lng,
      resolvido: false,
    })
    .returning();

  return criado;
}

/** Lista todos os marcadores pendentes (`resolvido = false`) para renderização no mapa. */
export function listarMarcadoresAtivos() {
  return db
    .select()
    .from(marcadoresMapa)
    .where(eq(marcadoresMapa.resolvido, false))
    .orderBy(asc(marcadoresMapa.createdAt));
}

/** Marca uma ocorrência/ponto de atenção como resolvido num único UPDATE. */
export async function resolverMarcador(id: string): Promise<void> {
  await db
    .update(marcadoresMapa)
    .set({ resolvido: true, updatedAt: new Date() })
    .where(eq(marcadoresMapa.id, id));
}
