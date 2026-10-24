import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { formatMedida } from '@/utils/formatters';
import { AppIcon } from './AppIcon';

export interface MilkAmountProps {
  /** Litros de leite; null mostra "—" */
  liters: number | null;
  /** 'pill' = selo creme (padrão); 'plain' = só ícone e volume, sem fundo */
  variant?: 'pill' | 'plain';
}

/**
 * Ícone de garrafa de leite e o volume em litros, em selo creme ou sem fundo.
 */
export function MilkAmount({ liters, variant = 'pill' }: MilkAmountProps) {
  return (
    <View style={[styles.base, variant === 'pill' && styles.pill]}>
      <AppIcon name="milk" size={IconSize.sm} color={AgroColors.milk} />
      <Text style={styles.text}>{formatMedida(liters, 'L')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pill: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.half,
    borderRadius: Radius.full,
    backgroundColor: AgroColors.milkBg,
  },
  text: {
    ...Typography.captionBold,
    color: AgroColors.milk,
  },
});
