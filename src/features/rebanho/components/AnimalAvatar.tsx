import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AgroColors } from '@/constants/theme';

export interface AnimalAvatarProps {
  /** Diâmetro do círculo (padrão 44) */
  size?: number;
  /**
   * Fundo: 'neutro' (cinza, lista), 'mint' (verde claro) ou 'translucido'
   * (branco transparente, sobre o topo verde da ficha)
   */
  variant?: 'neutro' | 'mint' | 'translucido';
}

/** Círculo com a vaquinha que identifica o animal na lista e na ficha. */
export function AnimalAvatar({ size = 44, variant = 'neutro' }: AnimalAvatarProps) {
  return (
    <View
      style={[
        styles.circulo,
        variant === 'mint' && styles.mint,
        variant === 'translucido' && styles.translucido,
        { width: size, height: size, borderRadius: size / 2 },
      ]}>
      <Text style={{ fontSize: size / 2 }}>🐮</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mint: {
    backgroundColor: AgroColors.mintBg,
  },
  translucido: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
});
