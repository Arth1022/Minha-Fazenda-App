import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';
import { formatMedida } from '@/utils/formatters';
import { AppIcon } from './AppIcon';

export interface MilkAmountProps {
  /** Litros de leite; null mostra "—" */
  liters: number | null;
}

/**
 * Selo creme com ícone de garrafa de leite e o volume em litros.
 */
export function MilkAmount({ liters }: MilkAmountProps) {
  return (
    <View style={styles.pill}>
      <AppIcon name="milk" size={IconSize.sm} color={AgroColors.milk} />
      <Text style={styles.text}>{formatMedida(liters, 'L')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
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
