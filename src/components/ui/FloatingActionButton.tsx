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
  /** Logo do app (Image/SVG): troca o fundo verde por branco para as cores aparecerem */
  logo?: React.ReactNode;
  /** Ícone exibido quando não há logo (padrão: "⌂") */
  icon?: string;
  /** Label de acessibilidade */
  accessibilityLabel?: string;
  /** Estilo customizado */
  style?: ViewStyle;
}

/**
 * Botão central flutuante da barra de navegação inferior (Home).
 * Com `logo`, mostra a logo do app num círculo branco (borda verde quando ativo);
 * sem ela, o ícone de Home sobre o verde.
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
        logo ? styles.fabLogo : isActive && styles.fabActive,
        Boolean(logo) && isActive && styles.fabLogoActive,
        pressed && styles.pressed,
        style,
      ]}>
      {logo ? (
        <View style={styles.logoSlot}>{logo}</View>
      ) : (
        <View style={styles.iconSlot}>
          <Text style={styles.homeIcon}>{icon}</Text>
        </View>
      )}
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
  fabLogo: {
    backgroundColor: AgroColors.cardBg,
    borderColor: AgroColors.mintBorder,
  },
  fabLogoActive: {
    borderColor: AgroColors.primaryLight,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  logoSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIcon: {
    color: AgroColors.textInverse,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
  },
});
