import React, { memo, useMemo } from 'react';
import Mapbox from '@rnmapbox/maps';

import type { Talhao } from '@/database';
import type { OcorrenciaNoMapa } from '@/services/ocorrenciaService';
import type { Coordenada } from '@/utils/geoMath';
import { colecaoDasAreas, situacaoDaArea } from '../services/areas';
import type { OcupacaoArea } from '../services/ocupacao';
import { faixaDoRotulo, PRIORIDADE_NO_MAPA } from '../services/rotulos';
import { PinosNoMapa } from './CamadaOcorrenciasMapa';
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
  /** Ocorrências abertas no centro de cada área (ver `ocorrenciasNosRotulos`): presas no rótulo */
  ocorrenciasPorArea?: ReadonlyMap<string, readonly OcorrenciaNoMapa[]>;
  ocorrenciaSelecionadaId?: string | null;
  onPressOcorrencia?: (ocorrenciaId: string) => void;
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
  ocorrenciasPorArea,
  ocorrenciaSelecionadaId = null,
  onPressOcorrencia,
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
              ...faixaDoRotulo(t),
              ocorrencias: ocorrenciasPorArea?.get(t.id),
            };
          })
        : [],
    [talhoes, ocupacoes, mostrarNomes, mostrarRebanho, ocorrenciasPorArea],
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

      {rotulos.map((r) => {
        const ativo =
          r.id === idAtivo ||
          (ocorrenciaSelecionadaId !== null && r.ocorrencias?.some((oc) => oc.id === ocorrenciaSelecionadaId) === true);
        // A área aberta no painel (ou com a ocorrência aberta) mostra o rótulo também de longe
        const zoomMinimo = ativo ? 0 : r.zoomMinimo;
        return (
          <React.Fragment key={`rotulo-${r.id}`}>
            <Mapbox.MarkerView
              coordinate={r.centro}
              anchor={{ x: 0.5, y: 0.5 }}
              // Sem sobrepor, o Mapbox some com o rótulo que encosta em outro, num pino ou no ponto
              // azul do GPS: ele só aparecia em alguns zooms. Quem esconde é a faixa de zoom: longe
              // demais (as vizinhas se empilhariam) e perto demais (a área já toma a tela).
              allowOverlap
              allowOverlapWithPuck
              // Sempre número: o Mapbox só atualiza o que vem preenchido (null manteria o anterior)
              minZoom={zoomMinimo}
              maxZoom={r.zoomMaximo}
              priority={ativo ? PRIORIDADE_NO_MAPA.rotuloAtivo : PRIORIDADE_NO_MAPA.rotulo}>
              <RotuloArea
                nome={r.nome}
                legenda={r.legenda}
                cabecas={r.cabecas}
                ocorrencias={r.ocorrencias}
                ocorrenciaSelecionadaId={ocorrenciaSelecionadaId}
                onPressOcorrencia={onPressOcorrencia}
                onPress={onPressTalhao ? () => onPressTalhao(r.id) : undefined}
              />
            </Mapbox.MarkerView>

            {/* Fora da faixa do rótulo, as ocorrências presas nele voltam a ser pinos no centro da área */}
            {r.ocorrencias && r.ocorrencias.length > 0 ? (
              <>
                {zoomMinimo > 0 ? (
                  <PinosNoMapa
                    coordenada={r.centro}
                    ocorrencias={r.ocorrencias}
                    selecionadaId={ocorrenciaSelecionadaId}
                    zoomMinimo={0}
                    zoomMaximo={zoomMinimo}
                    onPress={onPressOcorrencia}
                  />
                ) : null}
                <PinosNoMapa
                  coordenada={r.centro}
                  ocorrencias={r.ocorrencias}
                  selecionadaId={ocorrenciaSelecionadaId}
                  zoomMinimo={r.zoomMaximo}
                  onPress={onPressOcorrencia}
                />
              </>
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
});
