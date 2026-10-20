import React from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { AgroColors, Shadows } from '@/constants/theme';

export interface FloatingActionButtonProps {
  /** Callback acionado ao clicar no botão (+) */
  onPress: () => void;
  /** Símbolo central (padrão: "+") */
  icon?: string;
  /** Label de acessibilidade */
  accessibilityLabel?: string;
  /** Estilo customizado */
  style?: ViewStyle;
}

/**
 * Botão flutuante circular verde (+) posicionado no centro da barra inferior
 * conforme o protótipo do Figma.
 */
export function FloatingActionButton({
  onPress,
  icon = '+',
  accessibilityLabel = 'Adicionar novo registro',
  style,
}: FloatingActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.fab,
        pressed && styles.pressed,
        style,
      ]}>
      <Text style={styles.fabIcon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AgroColors.fabGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: AgroColors.cardBg,
    ...Shadows.fab,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  fabIcon: {
    color: AgroColors.textInverse,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '400',
    marginTop: -1,
  },
});
