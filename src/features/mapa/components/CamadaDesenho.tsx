import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import { AgroColors, Radius, Shadows, Spacing } from '@/constants/theme';
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
          fillColor: temErro ? COR_ERRO : AgroColors.mapPolygonPasto,
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
          circleRadius: 6,
          circleColor: temErro ? COR_ERRO : COR_BRANCA,
          circleStrokeWidth: 2.5,
          circleStrokeColor: temErro ? COR_BRANCA : AgroColors.primary,
        }}
      />
    </Mapbox.ShapeSource>
  );
}

export interface BarraControlesDesenhoProps {
  modoDesenho: boolean;
  quantidadePontos: number;
  areaAtualHa: number;
  erroTopologico: string | null;
  podeConcluir: boolean;
  onAlternarModo: () => void;
  onDesfazer: () => void;
  onLimpar: () => void;
  onConcluir: () => void;
}

export function BarraControlesDesenho({
  modoDesenho,
  quantidadePontos,
  areaAtualHa,
  erroTopologico,
  podeConcluir,
  onAlternarModo,
  onDesfazer,
  onLimpar,
  onConcluir,
}: BarraControlesDesenhoProps) {
  const temPontos = quantidadePontos > 0;
  const acoesSecundarias = [
    { label: 'Desfazer', onPress: onDesfazer },
    { label: 'Limpar', onPress: onLimpar },
  ];

  return (
    <View style={styles.wrapper}>
      {erroTopologico ? (
        <View style={[styles.banner, styles.errorBanner]}>
          <Text style={styles.errorText}>{erroTopologico}</Text>
        </View>
      ) : modoDesenho ? (
        <View style={[styles.banner, styles.hintBanner]}>
          <Text style={styles.hintText}>
            {!temPontos
              ? 'Toque no mapa para marcar os cantos do talhão'
              : `${quantidadePontos} ${quantidadePontos === 1 ? 'ponto marcado' : 'pontos marcados'} • ${areaAtualHa.toFixed(2)} Ha`}
          </Text>
        </View>
      ) : null}

      <View style={styles.toolbar}>
        <Pressable
          style={[styles.btn, styles.btnMode, modoDesenho && styles.btnModeActive]}
          onPress={onAlternarModo}
          accessibilityRole="button">
          <View
            style={[
              styles.dot,
              { backgroundColor: modoDesenho ? AgroColors.primaryLight : AgroColors.textMuted },
            ]}
          />
          <Text style={[styles.btnText, modoDesenho && styles.textInverse]}>
            {modoDesenho ? 'Desenhando' : 'Desenhar'}
          </Text>
        </Pressable>

        {acoesSecundarias.map(({ label, onPress }) => (
          <Pressable
            key={label}
            style={[styles.btn, styles.btnSecondary, !temPontos && styles.disabled]}
            onPress={onPress}
            disabled={!temPontos}
            accessibilityRole="button">
            <Text style={[styles.btnText, !temPontos && styles.textDisabled]}>
              {label}
            </Text>
          </Pressable>
        ))}

        <Pressable
          style={[styles.btn, styles.btnFinish, !podeConcluir && styles.btnFinishDisabled]}
          onPress={onConcluir}
          disabled={!podeConcluir}
          accessibilityRole="button">
          <Text style={[styles.btnText, styles.textInverse, !podeConcluir && styles.textDisabled]}>
            Concluir
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.xs },
  banner: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  errorBanner: { backgroundColor: AgroColors.dangerBg, borderColor: COR_ERRO },
  errorText: { fontSize: 12, fontWeight: '700', color: AgroColors.danger },
  hintBanner: { backgroundColor: AgroColors.mintBg, borderColor: AgroColors.mintBorder },
  hintText: { fontSize: 12, fontWeight: '600', color: AgroColors.headerGreen },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: AgroColors.border,
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
  },
  btnMode: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: AgroColors.subtleBg,
    borderWidth: 1,
    borderColor: AgroColors.border,
  },
  btnModeActive: {
    backgroundColor: AgroColors.headerGreen,
    borderColor: AgroColors.headerGreen,
  },
  dot: { width: 7, height: 7, borderRadius: Radius.full },
  btnSecondary: {
    flex: 1,
    backgroundColor: AgroColors.subtleBg,
    borderWidth: 1,
    borderColor: AgroColors.border,
  },
  btnFinish: { paddingHorizontal: 12, backgroundColor: AgroColors.primary },
  btnFinishDisabled: { backgroundColor: AgroColors.divider },
  btnText: { fontSize: 12, fontWeight: '700', color: AgroColors.textPrimary },
  textInverse: { color: AgroColors.textInverse },
  textDisabled: { color: AgroColors.textPlaceholder },
  disabled: { opacity: 0.5 },
});

export default CamadaDesenho;
