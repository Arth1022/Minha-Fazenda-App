import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors } from '@/constants/theme';

export interface AnimalAvatarProps {
  /** Diâmetro do círculo (padrão 44) */
  size?: number;
}

/** Círculo com o ícone de brinco que identifica o animal na lista e na ficha. */
export function AnimalAvatar({ size = 44 }: AnimalAvatarProps) {
  return (
    <View style={[styles.circulo, { width: size, height: size, borderRadius: size / 2 }]}>
      <AppIcon name="tag" size={Math.round(size * 0.45)} color={AgroColors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: {
    backgroundColor: AgroColors.mintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
