import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';

export type InfoBannerVariant = 'warning' | 'info';

const CORES: Record<InfoBannerVariant, { texto: string; fundo: string; borda: string }> = {
  warning: {
    texto: AgroColors.warning,
    fundo: AgroColors.warningBg,
    borda: AgroColors.warningBorder,
  },
  info: {
    texto: AgroColors.waterBlue,
    fundo: AgroColors.waterBlueBg,
    borda: AgroColors.waterBlueBg,
  },
};

const ICONE: Record<InfoBannerVariant, string> = {
  warning: '⚠',
  info: 'ℹ',
};

export interface InfoBannerProps {
  message: string;
  variant?: InfoBannerVariant;
}

/** Faixa de aviso no topo de uma tela (ex.: "Limite de lembretes atingido"). */
export function InfoBanner({ message, variant = 'warning' }: InfoBannerProps) {
  const cores = CORES[variant];

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: cores.fundo, borderColor: cores.borda }]}>
      <Text style={[styles.text, { color: cores.texto }]}>{ICONE[variant]}</Text>
      <Text style={[styles.text, styles.message, { color: cores.texto }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  text: {
    ...Typography.captionBold,
  },
  message: {
    flex: 1,
  },
});
