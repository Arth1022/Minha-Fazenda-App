import React, { memo, useMemo } from 'react';
import Mapbox from '@rnmapbox/maps';

import type { Talhao } from '@/database';
import type { Coordenada } from '@/utils/geoMath';
import { colecaoDasAreas, situacaoDaArea } from '../services/areas';
import type { OcupacaoArea } from '../services/ocupacao';
import { RotuloArea } from './RotuloArea';

export interface CamadaTalhoesSalvosProps {
  talhoes: Talhao[];
  /** Animais em cada pasto (estado ocupado/descanso e o selo de cabeças) */
  ocupacoes?: ReadonlyMap<string, OcupacaoArea>;
  selecionadoId?: string | null;
  /** Pasto destacado com tracejado branco (ex.: o destino escolhido ao mover animais) */
  destacadoId?: string | null;
  /** Mostra o rótulo (nome e situação) no centro de cada área */
  mostrarNomes?: boolean;
  /** Camada "Rebanho": o selo de cabeças nos pastos ocupados */
  mostrarRebanho?: boolean;
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
  ocupacoes,
  selecionadoId = null,
  destacadoId = null,
  mostrarNomes = true,
  mostrarRebanho = true,
  onPressTalhao,
}: CamadaTalhoesSalvosProps) {
  const colecao = useMemo(() => colecaoDasAreas(talhoes, ocupacoes), [talhoes, ocupacoes]);
  const rotulos = useMemo(
    () =>
      mostrarNomes
        ? talhoes.map((t) => {
            const ocupacao = ocupacoes?.get(t.id);
            return {
              id: t.id,
              nome: t.nome,
              legenda: situacaoDaArea(t, ocupacao).legenda,
              cabecas: mostrarRebanho && t.tipo === 'pasto' ? (ocupacao?.cabecas ?? 0) : 0,
              centro: [t.centroLng, t.centroLat] as Coordenada,
            };
          })
        : [],
    [talhoes, ocupacoes, mostrarNomes, mostrarRebanho],
  );

  // Expressões escritas dentro de cada `style`: fora dele o TypeScript perde o tipo de expressão do Mapbox
  const idAtivo = selecionadoId ?? '';
  const idDestacado = destacadoId ?? '';

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
        <Mapbox.LineLayer
          id="talhoes-salvos-destaque-layer"
          filter={['==', ['get', 'talhaoId'], idDestacado]}
          style={{ lineColor: '#FFFFFF', lineWidth: 3.5, lineDasharray: [2, 1.5], lineJoin: 'round' }}
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
            cabecas={r.cabecas}
            onPress={onPressTalhao ? () => onPressTalhao(r.id) : undefined}
          />
        </Mapbox.MarkerView>
      ))}
    </>
  );
});
