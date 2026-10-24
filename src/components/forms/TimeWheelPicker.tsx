import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { AppIcon } from '@/components/ui/AppIcon';
import { AgroColors, IconSize, Radius, Spacing, Typography } from '@/constants/theme';

export interface TimeWheelPickerProps {
  /** Rótulo exibido acima do campo */
  label?: string;
  /** Valor atual no formato "HH:MM" (ex.: "05:30") */
  value: string;
  /** Callback disparado sempre que hora ou minuto mudam ("HH:MM") */
  onChange: (newTime: string) => void;
}

function pad2(num: number): string {
  return String(num).padStart(2, '0');
}

function timeStringToDate(value: string): Date {
  const parts = value.trim().split(':');
  const h = Math.min(23, Math.max(0, parseInt(parts[0] ?? '5', 10) || 0));
  const m = Math.min(59, Math.max(0, parseInt(parts[1] ?? '30', 10) || 0));
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Campo compacto de horário (mesmo visual do DateField): mostra "08:00" e abre o
 * seletor nativo ao tocar (diálogo no Android, roda abaixo do campo no iOS).
 */
export function TimeWheelPicker({ label, value, onChange }: TimeWheelPickerProps) {
  const [aberto, setAberto] = useState(false);

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setAberto(Platform.OS === 'ios');
    if (event.type === 'set' && selectedDate) {
      onChange(`${pad2(selectedDate.getHours())}:${pad2(selectedDate.getMinutes())}`);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={() => setAberto((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${value}` : value}
        style={({ pressed }) => [styles.botao, pressed && styles.pressed]}>
        <Text style={styles.valor}>{value}</Text>
        <AppIcon name="clock" size={IconSize.sm} color={AgroColors.textMuted} />
      </Pressable>

      {aberto ? (
        <DateTimePicker
          value={timeStringToDate(value)}
          mode="time"
          is24Hour
          display="spinner"
          onChange={handlePickerChange}
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
});
