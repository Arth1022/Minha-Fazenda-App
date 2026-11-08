import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AgroColors, Spacing, Typography } from '@/constants/theme';

export interface LinhaDadoProps {
  label: string;
  /** Texto simples ou um elemento */
  children: React.ReactNode;
}

/** Linha "rótulo ........ valor" dos cards da ficha da máquina. */
export function LinhaDado({ label, children }: LinhaDadoProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text style={styles.value} numberOfLines={1}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  label: {
    ...Typography.body,
    color: AgroColors.textSecondary,
  },
  value: {
    ...Typography.bodyBold,
    flexShrink: 1,
    textAlign: 'right',
  },
});
