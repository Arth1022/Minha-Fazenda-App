import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { AgroColors, Shadows } from '@/constants/theme';

export interface FloatingActionButtonProps {
  /** Callback acionado ao clicar no botão central (Home) */
  onPress: () => void;
  /** Indica se a tela Home central está ativa no momento */
  isActive?: boolean;
  /** Elemento de Logo customizado (Image/SVG) a ser inserido futuramente */
  logo?: React.ReactNode;
  /** Ícone exibido enquanto a logo definitiva não for definida (padrão: "⌂") */
  icon?: string;
  /** Label de acessibilidade */
  accessibilityLabel?: string;
  /** Estilo customizado */
  style?: ViewStyle;
}

/**
 * Botão central flutuante da barra de navegação inferior (Home + Espaço reservado para Logo).
 * Quando a prop `logo` não é informada, renderiza o ícone de Home dentro do container
 * dimensionado para receber a futura logo do app.
 */
export function FloatingActionButton({
  onPress,
  isActive = false,
  logo,
  icon = '⌂',
  accessibilityLabel = 'Ir para a tela inicial (Home)',
  style,
}: FloatingActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.fab,
        isActive && styles.fabActive,
        pressed && styles.pressed,
        style,
      ]}>
      {/* Container dimensionado e reservado para a futura Logo */}
      <View style={styles.logoPlaceholderSlot}>
        {logo ? (
          logo
        ) : (
          <Text style={styles.homeIcon}>{icon}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AgroColors.fabGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: AgroColors.cardBg,
    ...Shadows.fab,
  },
  fabActive: {
    backgroundColor: AgroColors.primary,
    borderColor: '#DCFCE7',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  logoPlaceholderSlot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  homeIcon: {
    color: AgroColors.textInverse,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
  },
});
