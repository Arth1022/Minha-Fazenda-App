import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';

export interface ChipOption<T extends string> {
  label: string;
  value: T;
  icon?: React.ReactNode;
  renderIcon?: (isSelected: boolean) => React.ReactNode;
}

export interface ChipSelectorProps<T extends string> {
  label?: string;
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * Seletor de opções em formato de chips para formulários rurais
 * (ex.: Tipo de Talhão, Categoria de Estoque, Período de Ordenha).
 */
export function ChipSelector<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  disabled = false,
  containerStyle,
}: ChipSelectorProps<T>) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.chipsRow}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipSelected,
                disabled && styles.chipDisabled,
                pressed && !disabled && styles.chipPressed,
              ]}>
              {option.renderIcon ? (
                option.renderIcon(isSelected)
              ) : option.icon ? (
                typeof option.icon === 'string' ? (
                  <Text style={styles.chipIcon}>{option.icon}</Text>
                ) : (
                  option.icon
                )
              ) : null}
              <Text
                style={[
                  styles.chipLabel,
                  isSelected && styles.chipLabelSelected,
                ]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 6,
  },
  label: {
    ...Typography.caption,
    color: AgroColors.textSecondary,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: AgroColors.borderStrong,
    backgroundColor: AgroColors.subtleBg,
  },
  chipSelected: {
    backgroundColor: AgroColors.mintBg,
    borderColor: AgroColors.primary,
    borderWidth: 1.5,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipIcon: {
    fontSize: 13,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AgroColors.textSecondary,
  },
  chipLabelSelected: {
    color: AgroColors.primaryDark,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: AgroColors.danger,
  },
});
