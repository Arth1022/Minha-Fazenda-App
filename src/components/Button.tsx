import React from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { AgroColors, Spacing } from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', style }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        style,
      ]}>
      <Text style={isPrimary ? styles.primaryText : styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: AgroColors.primary,
  },
  secondary: {
    backgroundColor: '#E5E7EB',
  },
  pressed: {
    opacity: 0.8,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryText: {
    color: '#1F2937',
    fontWeight: '700',
    fontSize: 15,
  },
});
