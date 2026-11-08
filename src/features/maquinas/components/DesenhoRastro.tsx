import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { AgroColors, Radius } from '@/constants/theme';

export interface DesenhoRastroProps {
  /** Pontos em [longitude, latitude] */
  pontos: [number, number][];
  altura?: number;
}

const MARGEM = 10;
const LARGURA_VIEWBOX = 300;

/**
 * Desenho do caminho da máquina, sem mapa (funciona offline e não gasta dados).
 * Mantém a proporção real: norte para cima.
 */
export function DesenhoRastro({ pontos, altura = 160 }: DesenhoRastroProps) {
  const desenho = useMemo(() => {
    if (pontos.length < 2) return null;
    const lngs = pontos.map((p) => p[0]);
    const lats = pontos.map((p) => p[1]);
    const [minLng, maxLng, minLat, maxLat] = [Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats)];
    // Longitude encolhe com a latitude: corrige para não achatar o desenho
    const fatorLng = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
    const largura = Math.max((maxLng - minLng) * fatorLng, 1e-9);
    const alturaReal = Math.max(maxLat - minLat, 1e-9);
    const escala = Math.min((LARGURA_VIEWBOX - MARGEM * 2) / largura, (altura - MARGEM * 2) / alturaReal);
    const deslocX = (LARGURA_VIEWBOX - largura * escala) / 2;
    const deslocY = (altura - alturaReal * escala) / 2;
    const xy = pontos.map(([lng, lat]) => [
      deslocX + (lng - minLng) * fatorLng * escala,
      altura - (deslocY + (lat - minLat) * escala),
    ]);
    return { linha: xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), inicio: xy[0], fim: xy[xy.length - 1] };
  }, [pontos, altura]);

  if (!desenho) return null;
  return (
    <View style={[styles.moldura, { height: altura }]}>
      <Svg width="100%" height={altura} viewBox={`0 0 ${LARGURA_VIEWBOX} ${altura}`}>
        <Polyline points={desenho.linha} fill="none" stroke={AgroColors.primary} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={desenho.inicio[0]} cy={desenho.inicio[1]} r={5} fill={AgroColors.textMuted} />
        <Circle cx={desenho.fim[0]} cy={desenho.fim[1]} r={6} fill={AgroColors.primaryLight} stroke={AgroColors.cardBg} strokeWidth={2} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  moldura: {
    borderRadius: Radius.lg,
    backgroundColor: AgroColors.mintSurface,
    borderWidth: 1,
    borderColor: AgroColors.mintBorder,
    overflow: 'hidden',
  },
});
