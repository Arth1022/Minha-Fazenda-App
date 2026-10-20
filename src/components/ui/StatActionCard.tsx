import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { AgroColors, Radius, Shadows, Spacing } from '@/constants/theme';

export interface StatActionCardProps {
  /** Ícone ou elemento visual do card */
  icon: React.ReactNode | string;
  /** Cor de fundo suave do container do ícone */
  iconBgColor?: string;
  /** Título principal do card (ex.: "Calcular Área", "Ração", "Vacinas") */
  title: string;
  /** Subtítulo ou métrica (ex.: "15.2 Ha Total", "4.2 Ton", "50 doses") */
  subtitle: string;
  /** Alinhamento interno: 'left' (Mapa: Calcular Área/Cercas) ou 'center' (Estoque: Ração/Sementes) */
  align?: 'left' | 'center';
  /** Estado ativo/selecionado */
  active?: boolean;
  /** Callback ao tocar no card */
  onPress?: () => void;
  /** Estilo adicional */
  style?: ViewStyle;
}

/**
 * Cartão compacto reutilizável para métricas e ações rápidas em grade
 * (usado em "Calcular Área / Cercas / Kg Sementes" e "Insumos / Medicamentos").
 */
export function StatActionCard({
  icon,
  iconBgColor = AgroColors.mintBg,
  title,
  subtitle,
  align = 'left',
  active = false,
  onPress,
  style,
}: StatActionCardProps) {
  const isCentered = align === 'center';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        isCentered && styles.cardCentered,
        active && styles.cardActive,
        pressed && onPress && styles.pressed,
        style,
      ]}>
      <View
        style={[
          styles.iconBox,
          { backgroundColor: iconBgColor },
        ]}>
        {typeof icon === 'string' ? (
          <Text style={styles.iconText}>{icon}</Text>
        ) : (
          icon
        )}
      </View>

      <Text
        style={[styles.title, isCentered && styles.textCentered]}
        numberOfLines={1}>
        {title}
      </Text>
      <Text
        style={[styles.subtitle, isCentered && styles.textCentered]}
        numberOfLines={1}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AgroColors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
    ...Shadows.sm,
  },
  cardCentered: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cardActive: {
    borderColor: AgroColors.primaryLight,
    borderWidth: 1.5,
    backgroundColor: AgroColors.mintSurface,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconText: {
    fontSize: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: AgroColors.textMuted,
  },
  textCentered: {
    textAlign: 'center',
  },
});
