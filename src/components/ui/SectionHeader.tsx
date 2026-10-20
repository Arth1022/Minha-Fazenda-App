import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { AgroColors, Typography } from '@/constants/theme';

export interface SectionHeaderProps {
  /** Título da seção */
  title: string;
  /** Tamanho do título: 'lg' (ex.: "Mapeamento & Áreas") ou 'md' (ex.: "Insumos", "Ordenha") */
  size?: 'md' | 'lg';
  /** Exibe seta chevron (›) à direita conforme o Figma */
  showChevron?: boolean;
  /** Elemento customizado à direita */
  rightElement?: React.ReactNode;
  /** Callback ao pressionar o cabeçalho ou chevron */
  onPress?: () => void;
  /** Estilo customizado */
  style?: ViewStyle;
}

/**
 * Cabeçalho de seção padronizado conforme o Figma
 * (ex.: "Mapeamento & Áreas", "Insumos ›", "Medicamentos ›", "Peças Máquinas ›", "Ordenha").
 */
export function SectionHeader({
  title,
  size = 'md',
  showChevron = false,
  rightElement,
  onPress,
  style,
}: SectionHeaderProps) {
  const content = (
    <View style={[styles.container, style]}>
      <Text style={size === 'lg' ? styles.titleLg : styles.titleMd}>
        {title}
      </Text>
      {rightElement ? (
        rightElement
      ) : showChevron ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={6}
        style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleLg: {
    ...Typography.screenTitle,
  },
  titleMd: {
    ...Typography.sectionTitle,
  },
  chevron: {
    fontSize: 20,
    lineHeight: 20,
    color: AgroColors.textMuted,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
