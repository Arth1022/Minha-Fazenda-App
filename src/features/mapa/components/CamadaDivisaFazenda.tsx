import React, { memo, useMemo } from 'react';
import Mapbox from '@rnmapbox/maps';

import type { Coordenada } from '@/utils/geoMath';

const COR_DIVISA = '#FACC15';

/** Contorno amarelo da divisa da fazenda, com um véu claro por dentro. */
export const CamadaDivisaFazenda = memo(function CamadaDivisaFazenda({
  divisa,
}: {
  divisa: Coordenada[];
}) {
  const forma = useMemo(
    (): GeoJSON.Feature => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [divisa] },
    }),
    [divisa],
  );

  return (
    <Mapbox.ShapeSource id="divisa-fazenda-source" shape={forma}>
      <Mapbox.FillLayer
        id="divisa-fazenda-fill-layer"
        style={{ fillColor: '#FFFFFF', fillOpacity: 0.08 }}
      />
      <Mapbox.LineLayer
        id="divisa-fazenda-line-layer"
        style={{ lineColor: COR_DIVISA, lineWidth: 3, lineCap: 'round', lineJoin: 'round' }}
      />
    </Mapbox.ShapeSource>
  );
});
