import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';

import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Texto exibido no botão */
  label: string;
  /** Callback acionado ao pressionar */
  onPress: () => void;
  /** Variante visual do botão */
  variant?: ButtonVariant;
  /** Tamanho do botão */
  size?: ButtonSize;
  /** Desabilita a interação */
  disabled?: boolean;
  /** Exibe indicador de carregamento */
  loading?: boolean;
  /** Ocupa 100% da largura disponível */
  fullWidth?: boolean;
  /** Ícone ou elemento à esquerda do texto */
  leftIcon?: React.ReactNode;
  /** Ícone ou elemento à direita do texto */
  rightIcon?: React.ReactNode;
  /** Estilo customizado do container */
  style?: ViewStyle;
  /** Estilo customizado do texto */
  textStyle?: TextStyle;
}

/**
 * Botão reutilizável alinhado ao Design System do Figma.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || variant === 'danger'
              ? AgroColors.textInverse
              : AgroColors.primary
          }
        />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon}
          <Text
            style={[
              styles.textBase,
              styles[`text_${size}`],
              styles[`text_${variant}`],
              textStyle,
            ]}>
            {label}
          </Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  size_sm: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    minHeight: 36,
  },
  size_md: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    minHeight: 46,
  },
  size_lg: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    minHeight: 50,
  },
  variant_primary: {
    backgroundColor: AgroColors.primary,
  },
  variant_secondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: AgroColors.borderStrong,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: AgroColors.primary,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_danger: {
    backgroundColor: AgroColors.danger,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  textBase: {
    ...Typography.button,
  },
  text_sm: {
    fontSize: 13,
    lineHeight: 18,
  },
  text_md: {
    fontSize: 15,
    lineHeight: 20,
  },
  text_lg: {
    fontSize: 16,
    lineHeight: 22,
  },
  text_primary: {
    color: AgroColors.textInverse,
  },
  text_secondary: {
    color: AgroColors.textPrimary,
  },
  text_outline: {
    color: AgroColors.primary,
  },
  text_ghost: {
    color: AgroColors.primary,
  },
  text_danger: {
    color: AgroColors.textInverse,
  },
});
