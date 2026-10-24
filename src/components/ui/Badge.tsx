import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AgroColors, Radius } from '@/constants/theme';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'overlayLight';

export interface BadgeProps {
  /** Texto do badge */
  label: string;
  /** Variante semântica de cor */
  variant?: BadgeVariant;
  /** Exibe ponto colorido indicador à esquerda */
  dot?: boolean;
  /** Cor customizada do ponto indicador */
  dotColor?: string;
  /** Ícone textual/emoji opcional à esquerda */
  icon?: string;
  /** Estilo customizado */
  style?: ViewStyle;
}

/**
 * Componente modular de Badge/Tag para status, alertas, contadores e indicadores.
 */
export function Badge({
  label,
  variant = 'neutral',
  dot = false,
  dotColor,
  icon,
  style,
}: BadgeProps) {
  const defaultDotColor = {
    success: AgroColors.primaryLight,
    warning: AgroColors.warning,
    danger: AgroColors.danger,
    info: AgroColors.waterBlue,
    neutral: AgroColors.textMuted,
    overlayLight: AgroColors.primary,
  }[variant];

  return (
    <View style={[styles.base, styles[`bg_${variant}`], style]}>
      {dot ? (
        <View
          style={[
            styles.dot,
            { backgroundColor: dotColor ?? defaultDotColor },
          ]}
        />
      ) : null}
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.text, styles[`text_${variant}`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  icon: {
    fontSize: 11,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  bg_success: {
    backgroundColor: AgroColors.mintBg,
  },
  text_success: {
    color: AgroColors.primaryDark,
  },
  bg_warning: {
    backgroundColor: AgroColors.warningBg,
  },
  text_warning: {
    color: AgroColors.warning,
  },
  bg_danger: {
    backgroundColor: AgroColors.dangerBg,
  },
  text_danger: {
    color: AgroColors.danger,
  },
  bg_info: {
    backgroundColor: AgroColors.waterBlueBg,
  },
  text_info: {
    color: AgroColors.waterBlue,
  },
  bg_neutral: {
    backgroundColor: '#F3F4F6',
  },
  text_neutral: {
    color: AgroColors.textSecondary,
  },
  bg_overlayLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: Radius.xs,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text_overlayLight: {
    color: AgroColors.textPrimary,
    fontWeight: '700',
    fontSize: 11,
  },
});
