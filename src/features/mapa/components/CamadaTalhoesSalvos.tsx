import React, { memo, useMemo } from 'react';
import Mapbox from '@rnmapbox/maps';

import type { Talhao } from '@/database';
import type { Coordenada } from '@/utils/geoMath';

export interface CamadaTalhoesSalvosProps {
  talhoes: Talhao[];
  selecionadoId?: string | null;
  /** Mostra o nome de cada talhão no centro dele */
  mostrarNomes?: boolean;
  onPressTalhao?: (talhaoId: string, coordenada?: Coordenada) => void;
}

/** Polígonos dos talhões já salvos, na cor de cada um, com o nome no centro. */
export const CamadaTalhoesSalvos = memo(function CamadaTalhoesSalvos({
  talhoes,
  selecionadoId = null,
  mostrarNomes = true,
  onPressTalhao,
}: CamadaTalhoesSalvosProps) {
  const shapeCollection = useMemo(
    (): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: talhoes.flatMap((t): GeoJSON.Feature[] => [
        {
          type: 'Feature',
          id: `poly-${t.id}`,
          properties: { camada: 'poligono', talhaoId: t.id, cor: t.cor },
          geometry: t.geometriaJson,
        },
        {
          type: 'Feature',
          id: `label-${t.id}`,
          properties: { camada: 'label', talhaoId: t.id, nome: t.nome },
          geometry: { type: 'Point', coordinates: [t.centroLng, t.centroLat] },
        },
      ]),
    }),
    [talhoes],
  );

  const idAtivo = selecionadoId ?? '';

  return (
    <Mapbox.ShapeSource
      id="talhoes-salvos-source"
      shape={shapeCollection}
      onPress={
        onPressTalhao
          ? (e) => {
              const idClicado = e.features?.[0]?.properties?.talhaoId;
              const coord: Coordenada | undefined =
                typeof e.coordinates?.longitude === 'number' && typeof e.coordinates?.latitude === 'number'
                  ? [e.coordinates.longitude, e.coordinates.latitude]
                  : undefined;
              if (typeof idClicado === 'string') onPressTalhao(idClicado, coord);
            }
          : undefined
      }>
      <Mapbox.FillLayer
        id="talhoes-salvos-fill-layer"
        filter={['==', ['get', 'camada'], 'poligono']}
        style={{
          fillColor: ['get', 'cor'],
          fillOpacity: ['case', ['==', ['get', 'talhaoId'], idAtivo], 0.6, 0.4],
        }}
      />
      <Mapbox.LineLayer
        id="talhoes-salvos-border-layer"
        filter={['==', ['get', 'camada'], 'poligono']}
        style={{
          lineColor: '#FFFFFF',
          lineWidth: ['case', ['==', ['get', 'talhaoId'], idAtivo], 3.5, 2],
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <Mapbox.SymbolLayer
        id="talhoes-salvos-label-layer"
        filter={['==', ['get', 'camada'], 'label']}
        style={{
          visibility: mostrarNomes ? 'visible' : 'none',
          textField: ['get', 'nome'],
          textSize: 13,
          textColor: '#FFFFFF',
          textHaloColor: 'rgba(17, 24, 39, 0.85)',
          textHaloWidth: 1.5,
          textAllowOverlap: true,
        }}
      />
    </Mapbox.ShapeSource>
  );
});
