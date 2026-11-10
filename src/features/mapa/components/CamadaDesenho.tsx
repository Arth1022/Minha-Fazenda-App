import React, { useMemo } from 'react';
import Mapbox from '@rnmapbox/maps';

import { AgroColors } from '@/constants/theme';
import { fecharAnelLinear, type Coordenada } from '@/utils/geoMath';

const COR_ERRO = '#EF4444';
const COR_BRANCA = '#FFFFFF';

export interface CamadaDesenhoProps {
  pontos: Coordenada[];
  erroTopologico: string | null;
}

export function CamadaDesenho({ pontos, erroTopologico }: CamadaDesenhoProps) {
  const temErro = Boolean(erroTopologico);

  const shapeCollection = useMemo((): GeoJSON.FeatureCollection => {
    const anel = pontos.length >= 3 ? fecharAnelLinear(pontos) : pontos;
    const features: GeoJSON.Feature[] = pontos.map((coordinates, indice) => ({
      type: 'Feature',
      id: `v-${indice}`,
      properties: { camada: 'vertice' },
      geometry: { type: 'Point', coordinates },
    }));

    if (pontos.length >= 2) {
      features.push({
        type: 'Feature',
        id: 'talhao-line',
        properties: { camada: 'line' },
        geometry: { type: 'LineString', coordinates: anel },
      });
    }

    if (pontos.length >= 3) {
      features.push({
        type: 'Feature',
        id: 'talhao-fill',
        properties: { camada: 'fill' },
        geometry: { type: 'Polygon', coordinates: [anel] },
      });
    }

    return { type: 'FeatureCollection', features };
  }, [pontos]);

  return (
    <Mapbox.ShapeSource id="desenho-talhao-source" shape={shapeCollection}>
      <Mapbox.FillLayer
        id="desenho-talhao-fill-layer"
        filter={['==', ['get', 'camada'], 'fill']}
        style={{
          fillColor: temErro ? COR_ERRO : AgroColors.forest,
          fillOpacity: 0.38,
        }}
      />
      <Mapbox.LineLayer
        id="desenho-talhao-line-layer"
        filter={['==', ['get', 'camada'], 'line']}
        style={{
          lineColor: temErro ? COR_ERRO : COR_BRANCA,
          lineWidth: temErro ? 3.5 : 2.5,
          lineDasharray: temErro ? undefined : [2, 2],
          lineCap: 'round',
          lineJoin: 'round',
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
