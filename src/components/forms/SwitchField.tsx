import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AgroColors, Spacing, Typography } from '@/constants/theme';

export interface SwitchFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  /** Texto auxiliar abaixo do rótulo */
  helperText?: string;
}

/** Pergunta de sim/não com um Switch à direita (ex.: "Já pariu?"). */
export function SwitchField({ label, value, onChange, helperText }: SwitchFieldProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: AgroColors.borderStrong, true: AgroColors.primaryLight }}
        thumbColor={AgroColors.cardBg}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
