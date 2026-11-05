import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';

import '@/constants/mapbox';
import { AgroColors, Radius, Shadows, Spacing } from '@/constants/theme';
import type { Coordenada } from '@/utils/geoMath';

// Centro padrão no coração agrícola do Brasil caso o GPS ainda não tenha sido autorizado
const COORDENADA_INICIAL_PADRAO: Coordenada = [-47.9292, -15.7801];
const ZOOM_FAZENDA_PADRAO = 15;

export interface MapaBaseProps {
  nomeFazenda?: string;
  totalHectares?: number;
  coordenadaInicial?: Coordenada;
  zoomInicial?: number;
  onMapPress?: (coordenada: Coordenada) => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Ícone de camadas (satélite / mapa) fiel ao protótipo do Figma. */
function LayersIcon({ color = AgroColors.headerGreen }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L2 7L12 12L22 7L12 2Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 12L12 17L22 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Ícone de mira do GPS fiel ao protótipo do Figma. */
function GpsTargetIcon({ color = AgroColors.headerGreen }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="12" r="2" fill={color} />
      <Line x1="12" y1="2" x2="12" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="2" y1="12" x2="6" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="18" y1="12" x2="22" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function MapaBase({
  nomeFazenda = 'Fazenda Recanto Verde',
  totalHectares,
  coordenadaInicial = COORDENADA_INICIAL_PADRAO,
  zoomInicial = ZOOM_FAZENDA_PADRAO,
  onMapPress,
  style,
  children,
}: MapaBaseProps) {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [modoSatelite, setModoSatelite] = useState(true);
  const [buscandoGps, setBuscandoGps] = useState(false);
  const [permissaoGps, setPermissaoGps] = useState(false);

  const centralizarNoGps = useCallback(async (silencioso = false) => {
    try {
      if (!silencioso) setBuscandoGps(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissaoGps(false);
        return;
      }
      setPermissaoGps(true);

      const posicao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const novaCoordenada: Coordenada = [
        posicao.coords.longitude,
        posicao.coords.latitude,
      ];

      cameraRef.current?.setCamera({
        centerCoordinate: novaCoordenada,
        zoomLevel: 16,
        animationDuration: 900,
      });
    } catch {
      // Mantém a coordenada inicial caso o GPS esteja desligado no aparelho
    } finally {
      if (!silencioso) setBuscandoGps(false);
    }
  }, []);

  useEffect(() => {
    centralizarNoGps(true);
  }, [centralizarNoGps]);

  const handlePress = useCallback(
    (feature: GeoJSON.Feature) => {
      if (!onMapPress) return;
      if (feature.geometry?.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates;
        onMapPress([lng, lat]);
      }
    },
    [onMapPress],
  );

  const hectaresFormatados =
    totalHectares !== undefined
      ? `${Number(totalHectares.toFixed(1))} Ha`
      : null;

  return (
    <View style={[styles.container, style]}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={
          modoSatelite ? Mapbox.StyleURL.Satellite : Mapbox.StyleURL.Outdoors
        }
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
        onPress={handlePress}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: coordenadaInicial,
            zoomLevel: zoomInicial,
          }}
        />

        {permissaoGps && (
          <Mapbox.UserLocation visible={true} showsUserHeadingIndicator={true} />
        )}

        {children}
      </Mapbox.MapView>

      {/* Pílula com o nome da fazenda (canto superior esquerdo) */}
      {nomeFazenda ? (
        <View style={styles.farmBadge} pointerEvents="none">
          <Text style={styles.farmBadgeText} numberOfLines={1}>
            {nomeFazenda}
          </Text>
        </View>
      ) : null}

      {/* Botões flutuantes de Camada e GPS (canto superior direito) */}
      <View style={styles.controlsCol}>
        <Pressable
          style={({ pressed }) => [
            styles.controlBtn,
            pressed && styles.controlBtnPressed,
          ]}
          onPress={() => setModoSatelite((atual) => !atual)}
          accessibilityRole="button"
          accessibilityLabel="Alternar camada de satélite">
          <LayersIcon />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.controlBtn,
            pressed && styles.controlBtnPressed,
          ]}
          onPress={() => centralizarNoGps(false)}
          disabled={buscandoGps}
          accessibilityRole="button"
          accessibilityLabel="Centralizar na minha localização GPS">
          {buscandoGps ? (
            <ActivityIndicator size="small" color={AgroColors.headerGreen} />
          ) : (
            <GpsTargetIcon />
          )}
        </Pressable>
      </View>

      {/* Pílula totalizadora de Hectares (canto inferior direito) */}
      {hectaresFormatados ? (
        <View style={styles.totalHaBadge} pointerEvents="none">
          <Text style={styles.totalHaText}>{hectaresFormatados}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 220,
    backgroundColor: AgroColors.mapTerrainBg,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.sm,
  },
  map: {
    flex: 1,
  },
  farmBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    maxWidth: '68%',
    backgroundColor: AgroColors.cardBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  farmBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: AgroColors.headerGreen,
  },
  controlsCol: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    gap: Spacing.xs,
  },
  controlBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: AgroColors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  controlBtnPressed: {
    opacity: 0.8,
  },
  totalHaBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    ...Shadows.sm,
  },
  totalHaText: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
});
export default MapaBase;
