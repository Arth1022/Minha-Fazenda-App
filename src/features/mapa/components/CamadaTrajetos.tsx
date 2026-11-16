import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import { Radius, Shadows, Spacing } from '@/constants/theme';
import type { PontoRastro } from '@/database';
import { PRIORIDADE_NO_MAPA } from '../services/rotulos';
import { CoresTexto } from './elementos';

/** Um trajeto desenhado: o rastro simplificado do uso, na cor fixa da máquina. */
export interface TrajetoNoMapa {
  /** Id do uso (tocar abre o resumo dele) */
  id: string;
  cor: string;
  rastro: readonly PontoRastro[];
}

/** Etiqueta na ponta do trajeto ou na última posição: "Pulverizador · há 20 min". */
export interface MarcaDeMaquina {
  /** Id do uso que a etiqueta abre */
  id: string;
  cor: string;
  coordenada: PontoRastro;
  texto: string;
}

export interface CamadaTrajetosProps {
  /** Nome da camada no mapa (há a dos trajetos, a do resumo e a do uso ao vivo) */
  id: string;
  trajetos: readonly TrajetoNoMapa[];
  marcas?: readonly MarcaDeMaquina[];
  /** Trajeto em destaque (mais grosso) */
  destaqueId?: string | null;
  /** Onde a máquina está agora (uso ao vivo): bolinha com halo */
  ponta?: { coordenada: PontoRastro; cor: string } | null;
  onPress?: (usoId: string) => void;
}

/**
 * Trajetos das máquinas no mapa (telas 24 a 26): linha na cor da máquina com
 * borda branca para aparecer no satélite, etiqueta na ponta com o nome e há
 * quanto tempo, e a posição de agora no uso ao vivo.
 */
export function CamadaTrajetos({ id, trajetos, marcas = [], destaqueId = null, ponta = null, onPress }: CamadaTrajetosProps) {
  const colecao = useMemo(
    (): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: trajetos
        .filter((t) => t.rastro.length >= 2)
        .map((t) => ({
          type: 'Feature',
          id: t.id,
          properties: { usoId: t.id, cor: t.cor, destaque: t.id === destaqueId ? 1 : 0 },
          geometry: { type: 'LineString', coordinates: t.rastro.map(([lng, lat]) => [lng, lat]) },
        })),
    }),
    [trajetos, destaqueId]
  );

  return (
    <>
      <Mapbox.ShapeSource
        id={`${id}-source`}
        shape={colecao}
        hitbox={{ width: 28, height: 28 }}
        onPress={
          onPress
            ? (e) => {
                const usoId = e.features?.[0]?.properties?.usoId;
                if (typeof usoId === 'string') onPress(usoId);
              }
            : undefined
        }>
        <Mapbox.LineLayer
          id={`${id}-borda-layer`}
          style={{
            lineColor: '#FFFFFF',
            lineOpacity: 0.85,
            lineWidth: ['case', ['==', ['get', 'destaque'], 1], 9, 6.5],
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
        <Mapbox.LineLayer
          id={`${id}-linha-layer`}
          style={{
            lineColor: ['get', 'cor'],
            lineWidth: ['case', ['==', ['get', 'destaque'], 1], 5.5, 4],
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </Mapbox.ShapeSource>

      {marcas.map((marca) => (
        <Mapbox.MarkerView
          key={`${id}-marca-${marca.id}`}
          coordinate={[marca.coordenada[0], marca.coordenada[1]]}
          anchor={{ x: 1, y: 0.5 }}
          allowOverlap
          // Quem está na máquina fica com o ponto azul do GPS em cima da etiqueta dela
          allowOverlapWithPuck
          priority={PRIORIDADE_NO_MAPA.pino}>
          <Pressable
            onPress={onPress ? () => onPress(marca.id) : undefined}
            accessibilityRole="button"
            accessibilityLabel={marca.texto}
            style={estilos.marca}>
            <View style={estilos.etiqueta}>
              <Text style={estilos.etiquetaTexto} numberOfLines={1}>
                {marca.texto}
              </Text>
            </View>
            <View style={[estilos.ponto, { backgroundColor: marca.cor }]} />
          </Pressable>
        </Mapbox.MarkerView>
      ))}

      {ponta ? (
        <Mapbox.MarkerView
          coordinate={[ponta.coordenada[0], ponta.coordenada[1]]}
          anchor={{ x: 0.5, y: 0.5 }}
          allowOverlap
          priority={PRIORIDADE_NO_MAPA.pino}>
          <View style={[estilos.halo, { backgroundColor: `${ponta.cor}40` }]} pointerEvents="none">
            <View style={[estilos.pontaPonto, { backgroundColor: ponta.cor }]} />
          </View>
        </Mapbox.MarkerView>
      ) : null}
    </>
  );
}

const estilos = StyleSheet.create({
  marca: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  etiqueta: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    maxWidth: 200,
    ...Shadows.sm,
  },
  etiquetaTexto: { fontSize: 12.5, lineHeight: 16, fontWeight: '700', color: CoresTexto.escuro },
  ponto: { width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: '#FFFFFF' },
  halo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pontaPonto: { width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: '#FFFFFF' },
});
