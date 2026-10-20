import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { AgroColors, Radius, Shadows, Spacing } from '@/constants/theme';

export type CardVariant =
  | 'default'
  | 'elevated'
  | 'outlined'
  | 'selected'
  | 'mint'
  | 'warning';

export interface CardProps extends ViewProps {
  /** Variante visual do cartão conforme o Figma */
  variant?: CardVariant;
  /** Espaçamento interno customizado */
  padding?: keyof typeof Spacing | number;
  /** Torna o cartão clicável quando definido */
  onPress?: () => void;
  /** Estilo adicional */
  style?: ViewStyle | ViewStyle[];
}

/**
 * Componente de Cartão modular e reutilizável.
 * Suporta estados selecionado (borda verde), mint, alerta e interatividade.
 */
export function Card({
  variant = 'default',
  padding = 'three',
  onPress,
  style,
  children,
  ...rest
}: CardProps) {
  const resolvedPadding =
    typeof padding === 'number' ? padding : Spacing[padding];

  const cardStyles = [
    styles.base,
    { padding: resolvedPadding },
    styles[`variant_${variant}`],
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...cardStyles,
          pressed && styles.pressed,
        ]}
        {...rest}>
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyles} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    gap: Spacing.two,
  },
  variant_default: {
    backgroundColor: AgroColors.cardBg,
    borderWidth: 1,
    borderColor: AgroColors.border,
    ...Shadows.sm,
  },
  variant_elevated: {
    backgroundColor: AgroColors.cardBg,
    borderWidth: 1,
    borderColor: AgroColors.border,
    ...Shadows.md,
  },
  variant_outlined: {
    backgroundColor: AgroColors.cardBg,
    borderWidth: 1,
    borderColor: AgroColors.borderStrong,
  },
  variant_selected: {
    backgroundColor: AgroColors.mintSurface,
    borderWidth: 1.5,
    borderColor: AgroColors.primaryLight,
    ...Shadows.sm,
  },
  variant_mint: {
    backgroundColor: AgroColors.mintBg,
    borderWidth: 1,
    borderColor: AgroColors.mintBorder,
  },
  variant_warning: {
    backgroundColor: AgroColors.warningBg,
    borderWidth: 1,
    borderColor: AgroColors.warningBorder,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
});
