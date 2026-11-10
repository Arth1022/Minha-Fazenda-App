import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Mapbox, { type MapState } from '@rnmapbox/maps';
import * as Location from 'expo-location';

import '@/constants/mapbox';
import { AgroColors } from '@/constants/theme';
import type { Coordenada } from '@/utils/geoMath';

export const ZOOM_TALHAO = 16;

/** Onde a câmera abre: um ponto com zoom ou uma área a enquadrar. */
export type VistaMapa =
  | { tipo: 'ponto'; coordenada: Coordenada; zoom: number }
  | { tipo: 'area'; ne: Coordenada; sw: Coordenada };

/** Brasil inteiro: usado enquanto não há local salvo, talhão nem GPS. */
export const VISTA_BRASIL: VistaMapa = { tipo: 'ponto', coordenada: [-51.9, -14.2], zoom: 3.6 };

export type EstiloMapa = 'satelite' | 'mapa';

/** Folga (pt) de cada borda ao enquadrar, para a área não ficar sob os cartões. */
export interface FolgaMapa {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface MapaBaseHandle {
  voarPara: (coordenada: Coordenada, zoom?: number) => void;
  /** Move a câmera para mostrar a caixa inteira (ex.: a área escolhida acima do painel) */
  enquadrar: (ne: Coordenada, sw: Coordenada, folga?: FolgaMapa) => void;
  /** Pede o GPS e centraliza; devolve false sem permissão ou sem sinal */
  centralizarNoGps: () => Promise<boolean>;
  /** Centro e zoom atuais da câmera */
  obterCentro: () => { coordenada: Coordenada; zoom: number };
}

export interface MapaBaseProps {
  ref?: React.Ref<MapaBaseHandle>;
  vistaInicial: VistaMapa;
  estilo?: EstiloMapa;
  /** false: mapa só de vitrine (sem arrastar, zoom ou toque) */
  interativo?: boolean;
  /** Ao abrir, centraliza no GPS sem perguntar de novo se já houver permissão */
  centralizarNoGpsAoAbrir?: boolean;
  /** Folga (pt) das bordas ao enquadrar uma área, para não ficar sob os cartões */
  folga?: FolgaMapa;
  onMapPress?: (coordenada: Coordenada) => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const FOLGA_PADRAO: FolgaMapa = { top: 24, bottom: 24, left: 24, right: 24 };

/**
 * Mapa Mapbox da fazenda (satélite por padrão). Só desenha o mapa e as camadas
 * filhas; botões e cartões ficam na tela que o usa, que comanda a câmera pela ref.
 */
export function MapaBase({
  ref,
  vistaInicial,
  estilo = 'satelite',
  interativo = true,
  centralizarNoGpsAoAbrir = false,
  folga = FOLGA_PADRAO,
  onMapPress,
  style,
  children,
}: MapaBaseProps) {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const centroRef = useRef<{ coordenada: Coordenada; zoom: number }>(
    vistaInicial.tipo === 'ponto'
      ? { coordenada: vistaInicial.coordenada, zoom: vistaInicial.zoom }
      : {
          coordenada: [
            (vistaInicial.ne[0] + vistaInicial.sw[0]) / 2,
            (vistaInicial.ne[1] + vistaInicial.sw[1]) / 2,
          ],
          zoom: ZOOM_TALHAO,
        },
  );
  const [mostrarUsuario, setMostrarUsuario] = useState(false);

  const voarPara = useCallback((coordenada: Coordenada, zoom?: number) => {
    const zoomFinal = zoom ?? Math.max(centroRef.current.zoom, ZOOM_TALHAO);
    centroRef.current = { coordenada, zoom: zoomFinal };
    cameraRef.current?.setCamera({
      centerCoordinate: coordenada,
      zoomLevel: zoomFinal,
      animationDuration: 800,
    });
  }, []);

  // `padding` na raiz do setCamera: a doc do Camera marca o padding dentro de `bounds` como legado
  const enquadrar = useCallback((ne: Coordenada, sw: Coordenada, margens: FolgaMapa = FOLGA_PADRAO) => {
    centroRef.current = { coordenada: [(ne[0] + sw[0]) / 2, (ne[1] + sw[1]) / 2], zoom: centroRef.current.zoom };
    cameraRef.current?.setCamera({
      bounds: { ne, sw },
      padding: {
        paddingTop: margens.top,
        paddingBottom: margens.bottom,
        paddingLeft: margens.left,
        paddingRight: margens.right,
      },
      animationDuration: 700,
    });
  }, []);

  const centralizarNoGps = useCallback(async () => {
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return false;
      setMostrarUsuario(true);
      const posicao =
        (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      voarPara([posicao.coords.longitude, posicao.coords.latitude], ZOOM_TALHAO);
      return true;
    } catch {
      // GPS desligado no aparelho: a câmera fica onde está
      return false;
    }
  }, [voarPara]);

  useImperativeHandle(
    ref,
    () => ({ voarPara, enquadrar, centralizarNoGps, obterCentro: () => centroRef.current }),
    [voarPara, enquadrar, centralizarNoGps],
  );

  useEffect(() => {
    let ativo = true;
    // Mostra o ponto azul se a permissão já foi dada, sem abrir o pedido
    Location.getForegroundPermissionsAsync()
      .then(({ granted }) => {
        if (!ativo || !granted) return;
        setMostrarUsuario(true);
        if (centralizarNoGpsAoAbrir) centralizarNoGps();
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [centralizarNoGpsAoAbrir, centralizarNoGps]);

  const handleCameraChanged = useCallback((estado: MapState) => {
    const { center, zoom } = estado.properties;
    if (Array.isArray(center) && typeof zoom === 'number') {
      centroRef.current = { coordenada: [center[0], center[1]], zoom };
    }
  }, []);

  const handlePress = useCallback(
    (feature: GeoJSON.Feature) => {
      if (onMapPress && feature.geometry?.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates;
        onMapPress([lng, lat]);
      }
    },
    [onMapPress],
  );

  return (
    <View style={[styles.container, style]} pointerEvents={interativo ? 'auto' : 'none'}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={estilo === 'satelite' ? Mapbox.StyleURL.SatelliteStreet : Mapbox.StyleURL.Outdoors}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
        scrollEnabled={interativo}
        zoomEnabled={interativo}
        rotateEnabled={false}
        pitchEnabled={false}
        onCameraChanged={handleCameraChanged}
        onPress={interativo ? handlePress : undefined}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={
            vistaInicial.tipo === 'ponto'
              ? { centerCoordinate: vistaInicial.coordenada, zoomLevel: vistaInicial.zoom }
              : {
                  bounds: { ne: vistaInicial.ne, sw: vistaInicial.sw },
                  padding: {
                    paddingTop: folga.top,
                    paddingBottom: folga.bottom,
                    paddingLeft: folga.left,
                    paddingRight: folga.right,
                  },
                }
          }
        />

        {mostrarUsuario && <Mapbox.UserLocation visible showsUserHeadingIndicator />}

        {children}
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: AgroColors.mapTerrainBg,
  },
  map: {
    flex: 1,
  },
});

export default MapaBase;
