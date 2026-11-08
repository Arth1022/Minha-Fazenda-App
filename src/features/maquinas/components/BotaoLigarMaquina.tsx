import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AgroColors } from '@/constants/theme';

const TAMANHO = 44;
const TAMANHO_ICONE = 22;

/** Símbolo de liga/desliga (Lucide "power", ISC). */
function IconeLigar({ cor }: { cor: string }) {
  return (
    <Svg
      width={TAMANHO_ICONE}
      height={TAMANHO_ICONE}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Path d="M12 2v10" />
      <Path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
    </Svg>
  );
}

export interface BotaoLigarMaquinaProps {
  /** Nome da máquina, para o leitor de tela */
  nome: string;
  emUso: boolean;
  onPress: () => void;
  /** Máquina inativa: botão cinza, sem ação */
  disabled?: boolean;
  /** Gravando o uso: mostra o carregamento */
  loading?: boolean;
}

/** Botão redondo de liga/desliga: verde com a máquina parada, vermelho em uso. */
export function BotaoLigarMaquina({
  nome,
  emUso,
  onPress,
  disabled = false,
  loading = false,
}: BotaoLigarMaquinaProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`${emUso ? 'Desligar' : 'Ligar'} ${nome}`}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        emUso ? styles.emUso : styles.parada,
        disabled && styles.desabilitado,
        pressed && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={AgroColors.textInverse} />
      ) : (
        <IconeLigar cor={AgroColors.textInverse} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: TAMANHO,
    height: TAMANHO,
    borderRadius: TAMANHO / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parada: {
    backgroundColor: AgroColors.primary,
  },
  emUso: {
    backgroundColor: AgroColors.danger,
  },
  desabilitado: {
    backgroundColor: AgroColors.textPlaceholder,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
