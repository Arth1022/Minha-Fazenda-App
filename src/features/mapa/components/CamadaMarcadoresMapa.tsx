import React, { memo, useMemo } from 'react';
import Mapbox from '@rnmapbox/maps';

import type { MarcadorMapa, TipoMarcadorMapa } from '@/database';
import type { Coordenada } from '@/utils/geoMath';

export const COR_POR_TIPO_MARCADOR: Record<TipoMarcadorMapa, string> = {
  praga: '#EF4444',
  daninha: '#EAB308',
  erosao: '#F97316',
  outro: '#0EA5E9',
};

export const ROTULO_TIPO_MARCADOR: Record<TipoMarcadorMapa, string> = {
  praga: 'Praga',
  daninha: 'Planta Daninha',
  erosao: 'Erosão',
  outro: 'Outro',
};

export interface CamadaMarcadoresMapaProps {
  marcadores: MarcadorMapa[];
  selecionadoId?: string | null;
  onPressMarcador?: (marcadorId: string, coordenada?: Coordenada) => void;
}

/** Pontos de atenção (pragas, daninhas, erosões) renderizados via camada GeoJSON vetorial. */
export const CamadaMarcadoresMapa = memo(function CamadaMarcadoresMapa({
  marcadores,
  selecionadoId = null,
  onPressMarcador,
}: CamadaMarcadoresMapaProps) {
  const shapeCollection = useMemo(
    (): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: marcadores.map((m): GeoJSON.Feature => ({
        type: 'Feature',
        id: `marcador-${m.id}`,
        properties: {
          marcadorId: m.id,
          titulo: m.titulo,
          cor: COR_POR_TIPO_MARCADOR[m.tipo] ?? COR_POR_TIPO_MARCADOR.outro,
        },
        geometry: {
          type: 'Point',
          coordinates: [m.lng, m.lat],
        },
      })),
    }),
    [marcadores],
  );

  const idAtivo = selecionadoId ?? '';

  return (
    <Mapbox.ShapeSource
      id="marcadores-mapa-source"
      shape={shapeCollection}
      onPress={
        onPressMarcador
          ? (e) => {
              const idClicado = e.features?.[0]?.properties?.marcadorId;
              const coord: Coordenada | undefined =
                typeof e.coordinates?.longitude === 'number' && typeof e.coordinates?.latitude === 'number'
                  ? [e.coordinates.longitude, e.coordinates.latitude]
                  : undefined;
              if (typeof idClicado === 'string') onPressMarcador(idClicado, coord);
            }
          : undefined
      }>
      <Mapbox.CircleLayer
        id="marcadores-mapa-circle-layer"
        style={{
          circleRadius: ['case', ['==', ['get', 'marcadorId'], idAtivo], 10, 7],
          circleColor: ['get', 'cor'],
          circleStrokeWidth: ['case', ['==', ['get', 'marcadorId'], idAtivo], 3, 2],
          circleStrokeColor: '#FFFFFF',
        }}
      />
      <Mapbox.SymbolLayer
        id="marcadores-mapa-label-layer"
        style={{
          textField: ['get', 'titulo'],
          textSize: 12,
          textOffset: [0, 1.3],
          textAnchor: 'top',
          textColor: '#FFFFFF',
          textHaloColor: 'rgba(17, 24, 39, 0.85)',
          textHaloWidth: 1.5,
          textOptional: true,
        }}
      />
    </Mapbox.ShapeSource>
  );
});
