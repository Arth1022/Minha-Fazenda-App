import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import { diasEntre, formatDataBR } from '@/utils/date';

/** "Hoje", "Ontem" ou a data "DD/MM/AAAA". */
function textoDaData(data: Date): string {
  const dias = diasEntre(data, new Date());
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  return formatDataBR(data);
}

export interface DateFieldProps {
  label?: string;
  value: Date;
  onChange: (data: Date) => void;
  /** Data máxima permitida (ex.: hoje, para registros que já aconteceram) */
  maximumDate?: Date;
  minimumDate?: Date;
}

/** Campo de data que já começa em "Hoje ▾" e abre o calendário nativo ao tocar. */
export function DateField({
  label,
  value,
  onChange,
  maximumDate,
  minimumDate,
}: DateFieldProps) {
  const [aberto, setAberto] = useState(false);

  const handleChange = (event: DateTimePickerEvent, data?: Date) => {
    setAberto(Platform.OS === 'ios');
    if (event.type === 'set' && data) onChange(data);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={() => setAberto((prev) => !prev)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.botao, pressed && styles.pressed]}>
        <Text style={styles.valor}>{textoDaData(value)}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      {aberto ? (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    color: AgroColors.textSecondary,
    fontWeight: '600',
  },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AgroColors.borderStrong,
    backgroundColor: AgroColors.inputBg,
  },
  pressed: {
    opacity: 0.8,
  },
  valor: {
    ...Typography.bodyBold,
  },
  chevron: {
    ...Typography.bodyBold,
    color: AgroColors.textMuted,
  },
});
