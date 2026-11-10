import React, { memo, useMemo } from 'react';
import Mapbox from '@rnmapbox/maps';

import type { Talhao } from '@/database';
import type { Coordenada } from '@/utils/geoMath';
import { colecaoDasAreas } from '../services/areas';

export interface CamadaTalhoesSalvosProps {
  talhoes: Talhao[];
  selecionadoId?: string | null;
  /** Mostra o nome (e o selo) de cada área no centro dela */
  mostrarNomes?: boolean;
  onPressTalhao?: (talhaoId: string, coordenada?: Coordenada) => void;
}

const HALO = 'rgba(17, 24, 39, 0.85)';

/**
 * Áreas salvas: preenchidas com a cor do tipo, contorno contínuo (em uso) ou
 * tracejado (vazia, colhida, em descanso), nome no centro e selo abaixo dele.
 * O tracejado é uma camada própria com filtro: `lineDasharray` por dado não
 * funciona nos SDKs nativos do Mapbox.
 */
export const CamadaTalhoesSalvos = memo(function CamadaTalhoesSalvos({
  talhoes,
  selecionadoId = null,
  mostrarNomes = true,
  onPressTalhao,
}: CamadaTalhoesSalvosProps) {
  const colecao = useMemo(() => colecaoDasAreas(talhoes), [talhoes]);

  // Expressões escritas dentro de cada `style`: fora dele o TypeScript perde o tipo de expressão do Mapbox
  const idAtivo = selecionadoId ?? '';
  const visibilidadeTexto = mostrarNomes ? 'visible' : 'none';

  return (
    <Mapbox.ShapeSource
      id="talhoes-salvos-source"
      shape={colecao}
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
          fillOpacity: [
            'case',
            ['==', ['get', 'talhaoId'], idAtivo],
            ['get', 'opacidadeAtiva'],
            ['get', 'opacidade'],
          ],
        }}
      />
      <Mapbox.LineLayer
        id="talhoes-salvos-border-layer"
        filter={['==', ['get', 'contorno'], 'continuo']}
        style={{
          lineColor: '#FFFFFF',
          lineWidth: ['case', ['==', ['get', 'talhaoId'], idAtivo], 3.5, 2],
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <Mapbox.LineLayer
        id="talhoes-salvos-border-tracejado-layer"
        filter={['==', ['get', 'contorno'], 'tracejado']}
        style={{
          lineColor: '#FFFFFF',
          lineWidth: ['case', ['==', ['get', 'talhaoId'], idAtivo], 3.5, 2],
          lineDasharray: [2, 1.5],
          lineJoin: 'round',
        }}
      />
      <Mapbox.SymbolLayer
        id="talhoes-salvos-label-layer"
        filter={['==', ['get', 'camada'], 'label']}
        style={{
          visibility: visibilidadeTexto,
          textField: ['get', 'nome'],
          textSize: 13,
          textColor: '#FFFFFF',
          textHaloColor: HALO,
          textHaloWidth: 1.5,
          textAllowOverlap: true,
        }}
      />
      <Mapbox.SymbolLayer
        id="talhoes-salvos-selo-layer"
        filter={['==', ['get', 'camada'], 'selo']}
        style={{
          visibility: visibilidadeTexto,
          textField: ['get', 'selo'],
          textSize: 11.5,
          textOffset: [0, 1.35],
          textColor: '#FFFFFF',
          textHaloColor: HALO,
          textHaloWidth: 1.5,
          textAllowOverlap: true,
        }}
      />
    </Mapbox.ShapeSource>
  );
});
