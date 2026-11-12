import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, Shadows } from '@/constants/theme';
import { useRelatarProblema } from './RelatarProblemaProvider';

export interface BotaoRelatarProblemaProps {
  /** Posição/tamanho extra (ex.: absoluto num canto da tela) */
  style?: ViewStyle;
}

/** Botão redondo com o símbolo de alerta: abre o formulário "Relatar problema". */
export function BotaoRelatarProblema({ style }: BotaoRelatarProblemaProps) {
  const relatarProblema = useRelatarProblema();

  return (
    <Pressable
      onPress={() => relatarProblema()}
      accessibilityRole="button"
      accessibilityLabel="Relatar problema"
      style={({ pressed }) => [styles.botao, pressed && styles.pressed, style]}>
      <AppIcon name="alert" size={26} color={AgroColors.textInverse} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AgroColors.reportOrange,
    ...Shadows.fab,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
