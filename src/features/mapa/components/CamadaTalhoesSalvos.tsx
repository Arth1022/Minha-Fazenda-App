import React, { memo, useMemo } from 'react';
import Mapbox from '@rnmapbox/maps';

import type { Talhao } from '@/database';
import type { Coordenada } from '@/utils/geoMath';
import { colecaoDasAreas, situacaoDaArea } from '../services/areas';
import { RotuloArea } from './RotuloArea';

export interface CamadaTalhoesSalvosProps {
  talhoes: Talhao[];
  selecionadoId?: string | null;
  /** Mostra o rótulo (nome e situação) no centro de cada área */
  mostrarNomes?: boolean;
  onPressTalhao?: (talhaoId: string, coordenada?: Coordenada) => void;
}

/**
 * Áreas salvas: preenchidas e contornadas com a cor do tipo, contorno contínuo
 * (em uso) ou tracejado (vazia, colhida, em descanso), borda branca na escolhida
 * e o rótulo branco no centro. O tracejado é uma camada própria com filtro:
 * `line-dasharray` por dado não funciona nos SDKs nativos do Mapbox.
 */
export const CamadaTalhoesSalvos = memo(function CamadaTalhoesSalvos({
  talhoes,
  selecionadoId = null,
  mostrarNomes = true,
  onPressTalhao,
}: CamadaTalhoesSalvosProps) {
  const colecao = useMemo(() => colecaoDasAreas(talhoes), [talhoes]);
  const rotulos = useMemo(
    () =>
      mostrarNomes
        ? talhoes.map((t) => ({
            id: t.id,
            nome: t.nome,
            legenda: situacaoDaArea(t).legenda,
            centro: [t.centroLng, t.centroLat] as Coordenada,
          }))
        : [],
    [talhoes, mostrarNomes],
  );

  // Expressões escritas dentro de cada `style`: fora dele o TypeScript perde o tipo de expressão do Mapbox
  const idAtivo = selecionadoId ?? '';

  return (
    <>
      <Mapbox.ShapeSource
        id="talhoes-salvos-source"
        shape={colecao}
        onPress={
          onPressTalhao
            ? (e) => {
                const idClicado = e.features?.[0]?.properties?.talhaoId;
                const coord: Coordenada | undefined =
                  typeof e.coordinates?.longitude === 'number' &&
                  typeof e.coordinates?.latitude === 'number'
                    ? [e.coordinates.longitude, e.coordinates.latitude]
                    : undefined;
                if (typeof idClicado === 'string') onPressTalhao(idClicado, coord);
              }
            : undefined
        }>
        <Mapbox.FillLayer
          id="talhoes-salvos-fill-layer"
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
          style={{ lineColor: ['get', 'cor'], lineWidth: 2, lineJoin: 'round' }}
        />
        <Mapbox.LineLayer
          id="talhoes-salvos-border-tracejado-layer"
          filter={['==', ['get', 'contorno'], 'tracejado']}
          style={{ lineColor: ['get', 'cor'], lineWidth: 2, lineDasharray: [3, 2], lineJoin: 'round' }}
        />
        <Mapbox.LineLayer
          id="talhoes-salvos-selecao-layer"
          filter={['==', ['get', 'talhaoId'], idAtivo]}
          style={{ lineColor: '#FFFFFF', lineWidth: 3.5, lineJoin: 'round' }}
        />
      </Mapbox.ShapeSource>

      {rotulos.map((r) => (
        <Mapbox.MarkerView
          key={`rotulo-${r.id}`}
          coordinate={r.centro}
          anchor={{ x: 0.5, y: 0.5 }}
          priority={r.id === idAtivo ? 1 : 0}>
          <RotuloArea
            nome={r.nome}
            legenda={r.legenda}
            onPress={onPressTalhao ? () => onPressTalhao(r.id) : undefined}
          />
        </Mapbox.MarkerView>
      ))}
    </>
  );
});
