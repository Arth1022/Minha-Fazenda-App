import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { AgroColors, Radius, Spacing } from '@/constants/theme';

export interface TimeWheelPickerProps {
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
 * Seletor de horário nativo do sistema operacional (@react-native-community/datetimepicker).
 */
export function TimeWheelPicker({ value, onChange }: TimeWheelPickerProps) {
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const dateValue = timeStringToDate(value);

  const handlePickerChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === 'android') {
      setShowAndroidPicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      const nextTime = `${pad2(selectedDate.getHours())}:${pad2(
        selectedDate.getMinutes()
      )}`;
      onChange(nextTime);
    }
  };

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.iosContainer}>
        <DateTimePicker
          value={dateValue}
          mode="time"
          is24Hour
          display="spinner"
          onChange={handlePickerChange}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.fieldLabel}>Horário</Text>

      <Pressable
        onPress={() => setShowAndroidPicker(true)}
        style={({ pressed }) => [
          styles.timeButton,
          pressed && styles.timeButtonPressed,
        ]}>
        <Text style={styles.timeValueText}>{value}</Text>
        <Text style={styles.changeHintText}>Selecionar horário</Text>
      </Pressable>

      {showAndroidPicker && (
        <DateTimePicker
          value={dateValue}
          mode="time"
          is24Hour
          display="spinner"
          onChange={handlePickerChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.xs,
  },
  iosContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AgroColors.textPrimary,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AgroColors.mintSurface,
    borderWidth: 1.5,
    borderColor: AgroColors.mintBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
  },
  timeButtonPressed: {
    opacity: 0.85,
  },
  timeValueText: {
    fontSize: 28,
    fontWeight: '800',
    color: AgroColors.primaryDark,
  },
  changeHintText: {
    fontSize: 13,
    fontWeight: '700',
    color: AgroColors.primary,
  },
});
