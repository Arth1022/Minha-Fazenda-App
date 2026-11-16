import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import { AppIcon } from '@/components/ui';
import { AgroColors, Radius, Shadows } from '@/constants/theme';
import { ICONE_CATEGORIA_TAREFA } from '@/features/tarefas';
import { ROTULO_CATEGORIA_TAREFA, type OcorrenciaNoMapa } from '@/services/ocorrenciaService';
import type { Coordenada } from '@/utils/geoMath';
import { PRIORIDADE_NO_MAPA, ZOOM_MAXIMO_MAPA } from '../services/rotulos';

/** Pinos lado a lado num mesmo lugar; as outras ocorrências viram "+N" */
const MAXIMO_PINOS = 3;

export interface PinoOcorrenciaProps {
  ocorrencia: OcorrenciaNoMapa;
  selecionada?: boolean;
  /** Menor: o pino preso no canto do rótulo da área */
  compacto?: boolean;
  onPress?: (ocorrenciaId: string) => void;
}

/** Bolinha laranja (vermelha se urgente) com o ícone da categoria da ocorrência. */
export function PinoOcorrencia({ ocorrencia: oc, selecionada = false, compacto = false, onPress }: PinoOcorrenciaProps) {
  const medida = compacto ? MEDIDAS.compacto : MEDIDAS.normal;
  const tamanho = selecionada ? medida.selecionado : medida.tamanho;
  return (
    <Pressable
      onPress={onPress ? () => onPress(oc.id) : undefined}
      hitSlop={compacto ? 4 : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${oc.urgente ? 'Urgente: ' : ''}${oc.titulo} (${ROTULO_CATEGORIA_TAREFA[oc.categoria]})`}
      style={[
        estilos.pino,
        {
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          borderWidth: selecionada ? medida.bordaSelecionado : medida.borda,
          backgroundColor: oc.urgente ? AgroColors.danger : AgroColors.warning,
        },
        selecionada && Shadows.md,
      ]}>
      <AppIcon
        name={ICONE_CATEGORIA_TAREFA[oc.categoria]}
        size={selecionada ? medida.iconeSelecionado : medida.icone}
        color={AgroColors.textInverse}
      />
    </Pressable>
  );
}

export interface LinhaDePinosProps {
  /** Na ordem de importância (urgentes primeiro): as primeiras viram pino, o resto "+N" */
  ocorrencias: readonly OcorrenciaNoMapa[];
  selecionadaId?: string | null;
  compacto?: boolean;
  onPress?: (ocorrenciaId: string) => void;
}

/** Ocorrências que dividem o mesmo lugar, lado a lado, cada uma tocável. */
export function LinhaDePinos({ ocorrencias, selecionadaId = null, compacto = false, onPress }: LinhaDePinosProps) {
  const pinos = ocorrencias.slice(0, MAXIMO_PINOS);
  const outras = ocorrencias.length - pinos.length;
  const medida = compacto ? MEDIDAS.compacto : MEDIDAS.normal;
  return (
    <View style={estilos.linha}>
      {pinos.map((ocorrencia) => (
        <PinoOcorrencia
          key={ocorrencia.id}
          ocorrencia={ocorrencia}
          compacto={compacto}
          selecionada={ocorrencia.id === selecionadaId}
          onPress={onPress}
        />
      ))}
      {outras > 0 ? (
        <View
          style={[estilos.outras, { minWidth: medida.tamanho, height: medida.tamanho - 4 }]}
          accessible
          accessibilityLabel={outras === 1 ? 'Mais 1 ocorrência' : `Mais ${outras} ocorrências`}>
          <Text style={estilos.outrasTexto}>+{outras}</Text>
        </View>
      ) : null}
    </View>
  );
}

export interface PinosNoMapaProps {
  coordenada: Coordenada;
  ocorrencias: readonly OcorrenciaNoMapa[];
  selecionadaId?: string | null;
  /** Faixa de zoom em que aparecem; sempre número: o Mapbox só atualiza o que vem preenchido */
  zoomMinimo?: number;
  zoomMaximo?: number;
  onPress?: (ocorrenciaId: string) => void;
}

/** Pino (ou pinos do mesmo lugar) solto no mapa, por cima dos rótulos das áreas. */
export function PinosNoMapa({
  coordenada,
  ocorrencias,
  selecionadaId = null,
  zoomMinimo = 0,
  zoomMaximo = ZOOM_MAXIMO_MAPA,
  onPress,
}: PinosNoMapaProps) {
  const temSelecionada = selecionadaId !== null && ocorrencias.some((oc) => oc.id === selecionadaId);
  return (
    <Mapbox.MarkerView
      coordinate={coordenada}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap
      allowOverlapWithPuck
      minZoom={zoomMinimo}
      maxZoom={zoomMaximo}
      priority={temSelecionada ? PRIORIDADE_NO_MAPA.pinoAtivo : PRIORIDADE_NO_MAPA.pino}>
      <LinhaDePinos ocorrencias={ocorrencias} selecionadaId={selecionadaId} onPress={onPress} />
    </Mapbox.MarkerView>
  );
}

export interface CamadaOcorrenciasMapaProps {
  ocorrencias: OcorrenciaNoMapa[];
  selecionadaId?: string | null;
  onPressOcorrencia?: (ocorrenciaId: string) => void;
}

/**
 * Camada de "Ocorrências Abertas" no mapa (RF-T13): um pino no ponto de cada
 * ocorrência, por cima dos rótulos das áreas. As que estão no centro de uma
 * área vão presas no rótulo dela (ver `ocorrenciasNosRotulos`).
 */
export const CamadaOcorrenciasMapa = React.memo(function CamadaOcorrenciasMapa({
  ocorrencias,
  selecionadaId = null,
  onPressOcorrencia,
}: CamadaOcorrenciasMapaProps) {
  return (
    <>
      {ocorrencias.map((oc) =>
        oc.pontoLat === null || oc.pontoLng === null ? null : (
          <PinosNoMapa
            key={`ocorrencia-${oc.id}`}
            coordenada={[oc.pontoLng, oc.pontoLat]}
            ocorrencias={[oc]}
            selecionadaId={selecionadaId}
            onPress={onPressOcorrencia}
          />
        ),
      )}
    </>
  );
});

const MEDIDAS = {
  normal: { tamanho: 32, selecionado: 38, borda: 2.5, bordaSelecionado: 3.5, icone: 15, iconeSelecionado: 18 },
  compacto: { tamanho: 26, selecionado: 30, borda: 2, bordaSelecionado: 3, icone: 13, iconeSelecionado: 15 },
} as const;

const estilos = StyleSheet.create({
  pino: {
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  outras: {
    paddingHorizontal: 6,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
  },
  outrasTexto: { fontSize: 11.5, lineHeight: 15, fontWeight: '800', color: AgroColors.textInverse },
});
