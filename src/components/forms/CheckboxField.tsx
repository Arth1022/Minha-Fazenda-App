import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';

export interface CheckboxFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  /** Texto auxiliar abaixo do rótulo */
  helperText?: string;
}

/** Caixa de marcar à esquerda do rótulo; a linha inteira é tocável. */
export function CheckboxField({ label, value, onChange, helperText }: CheckboxFieldProps) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      style={styles.row}>
      <View style={[styles.caixa, value && styles.caixaMarcada]}>
        {value ? <AppIcon name="check" size={16} color={AgroColors.textInverse} /> : null}
      </View>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 44,
  },
  caixa: {
    width: 24,
    height: 24,
    borderRadius: Radius.xs,
    borderWidth: 2,
    borderColor: AgroColors.borderStrong,
    backgroundColor: AgroColors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaMarcada: {
    borderColor: AgroColors.forest,
    backgroundColor: AgroColors.forest,
  },
  textCol: {
    flex: 1,
    gap: Spacing.half,
  },
  label: {
    ...Typography.bodyBold,
  },
  helper: {
    ...Typography.caption,
  },
});
