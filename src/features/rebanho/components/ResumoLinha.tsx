import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AgroColors, Typography } from '@/constants/theme';

export interface ResumoLinhaProps {
  label: string;
  /** Texto simples, ou um elemento (ex.: MilkAmount) */
  children: React.ReactNode;
}

/** Linha "rótulo ........ valor" dos cards de resumo do animal. */
export function ResumoLinha({ label, children }: ResumoLinhaProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text style={styles.value}>{children}</Text>
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
  },
  label: {
    ...Typography.body,
    color: AgroColors.textSecondary,
  },
  value: {
    ...Typography.bodyBold,
  },
});
