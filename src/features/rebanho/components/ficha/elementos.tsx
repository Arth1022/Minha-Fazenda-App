import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui';
import { AgroColors, Radius, Shadows, Spacing } from '@/constants/theme';

/** Card branco de borda arredondada usado nas abas da ficha. */
export function FichaCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export type TomFicha = 'saude' | 'reproducao' | 'sucesso' | 'neutro';

const TONS: Record<TomFicha, { fundo: string; texto: string }> = {
  saude: { fundo: AgroColors.healthBg, texto: AgroColors.health },
  reproducao: { fundo: AgroColors.breedingBg, texto: AgroColors.breeding },
  sucesso: { fundo: AgroColors.mintBg, texto: AgroColors.primary },
  neutro: { fundo: AgroColors.divider, texto: AgroColors.textSecondary },
};

/** Etiqueta arredondada ("2 pendentes", "Prenhez a confirmar"). */
export function Chip({ label, tom }: { label: string; tom: TomFicha }) {
  const { fundo, texto } = TONS[tom];
  return (
    <View style={[styles.chip, { backgroundColor: fundo }]}>
      <Text style={[styles.chipTexto, { color: texto }]}>{label}</Text>
    </View>
  );
}

/** Ícone dentro de um círculo colorido (seringa, balança, coração...). */
export function IconeRedondo({
  nome,
  tom,
  tamanho = 48,
}: {
  nome: AppIconName;
  tom: TomFicha;
  tamanho?: number;
}) {
  const { fundo, texto } = TONS[tom];
  return (
    <View
      style={[
        styles.icone,
        { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: fundo },
      ]}>
      <AppIcon name={nome} size={Math.round(tamanho * 0.46)} color={texto} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AgroColors.cardBg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: AgroColors.border,
    padding: Spacing.lg,
    gap: Spacing.three,
    ...Shadows.sm,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  chipTexto: {
    fontSize: 13,
    fontWeight: '700',
  },
  icone: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
