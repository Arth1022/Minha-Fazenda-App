import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AgroColors, Radius, Spacing } from '@/constants/theme';
import { AppIcon } from './AppIcon';

export interface MilkAmountProps {
  liters: number;
}

/**
 * Selo creme com ícone de garrafa de leite e o volume em litros.
 */
export function MilkAmount({ liters }: MilkAmountProps) {
  return (
    <View style={styles.pill}>
      <AppIcon name="milk" size={12} color={AgroColors.milk} />
      <Text style={styles.text}>{liters.toFixed(1)} L</Text>
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
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.milk,
  },
});
