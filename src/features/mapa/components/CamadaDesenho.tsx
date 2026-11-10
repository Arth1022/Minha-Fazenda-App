import React, { useMemo } from 'react';
import Mapbox from '@rnmapbox/maps';

import { AgroColors } from '@/constants/theme';
import type { Coordenada } from '@/utils/geoMath';

const COR_ERRO = '#EF4444';
const COR_BRANCA = '#FFFFFF';

export interface CamadaDesenhoProps {
  pontos: Coordenada[];
  erroTopologico: string | null;
}

/**
 * O contorno sendo desenhado: lados já marcados em linha branca contínua, o
 * lado que fecha a área (último canto → primeiro) tracejado, miolo branco
 * translúcido e os cantos brancos com borda verde. Com erro, tudo em vermelho.
 */
export function CamadaDesenho({ pontos, erroTopologico }: CamadaDesenhoProps) {
  const temErro = Boolean(erroTopologico);

  const shapeCollection = useMemo((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = pontos.map((coordinates, indice) => ({
      type: 'Feature',
      id: `v-${indice}`,
      properties: { camada: 'vertice' },
      geometry: { type: 'Point', coordinates },
    }));

    if (pontos.length >= 2) {
      features.push({
        type: 'Feature',
        id: 'desenho-lados',
        properties: { camada: 'lados' },
        geometry: { type: 'LineString', coordinates: pontos },
      });
    }

    if (pontos.length >= 3) {
      const primeiro = pontos[0];
      const ultimo = pontos[pontos.length - 1];
      features.push(
        {
          type: 'Feature',
          id: 'desenho-fechamento',
          properties: { camada: 'fechamento' },
          geometry: { type: 'LineString', coordinates: [ultimo, primeiro] },
        },
        {
          type: 'Feature',
          id: 'desenho-miolo',
          properties: { camada: 'miolo' },
          geometry: { type: 'Polygon', coordinates: [[...pontos, primeiro]] },
        },
      );
    }

    return { type: 'FeatureCollection', features };
  }, [pontos]);

  return (
    <Mapbox.ShapeSource id="desenho-talhao-source" shape={shapeCollection}>
      <Mapbox.FillLayer
        id="desenho-talhao-fill-layer"
        filter={['==', ['get', 'camada'], 'miolo']}
        style={{ fillColor: temErro ? COR_ERRO : COR_BRANCA, fillOpacity: temErro ? 0.3 : 0.25 }}
      />
      <Mapbox.LineLayer
        id="desenho-talhao-line-layer"
        filter={['==', ['get', 'camada'], 'lados']}
        style={{
          lineColor: temErro ? COR_ERRO : COR_BRANCA,
          lineWidth: temErro ? 3.5 : 2.5,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <Mapbox.LineLayer
        id="desenho-talhao-fechamento-layer"
        filter={['==', ['get', 'camada'], 'fechamento']}
        style={{
          lineColor: temErro ? COR_ERRO : COR_BRANCA,
          lineWidth: 2.5,
          lineDasharray: [2, 2],
        }}
      />
      <Mapbox.CircleLayer
        id="desenho-talhao-vertices-layer"
        filter={['==', ['get', 'camada'], 'vertice']}
        style={{
          circleRadius: 7,
          circleColor: temErro ? COR_ERRO : COR_BRANCA,
          circleStrokeWidth: 3.5,
          circleStrokeColor: temErro ? COR_BRANCA : AgroColors.forest,
        }}
      />
    </Mapbox.ShapeSource>
  );
}

export default CamadaDesenho;
