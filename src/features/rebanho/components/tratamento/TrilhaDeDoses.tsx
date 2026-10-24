import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { AgroColors, IconSize, Radius, Spacing } from '@/constants/theme';
import type { DiaDaTrilha } from '@/dtos';
import { formatDiaMes } from '@/utils/date';

export interface TrilhaDeDosesProps {
  trilha: DiaDaTrilha[];
  /** Bloqueia os toques enquanto uma dose está sendo gravada */
  salvando: boolean;
  /** Toque no círculo: marca ou desmarca a dose do dia */
  onAlternar: (dia: DiaDaTrilha) => void;
}

/** Dias com dose do tratamento, com o check verde dos confirmados. */
export function TrilhaDeDoses({ trilha, salvando, onAlternar }: TrilhaDeDosesProps) {
  return (
    <View style={styles.bloco}>
      <Text style={styles.label}>Dias</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.trilha}
        contentContainerStyle={styles.trilhaConteudo}>
        {trilha.map((d) => (
          <Pressable
            key={d.indice}
            onPress={() => onAlternar(d)}
            disabled={d.futuro || salvando}
            style={[styles.dia, d.futuro && styles.diaFuturo]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: d.confirmado, disabled: d.futuro }}
            accessibilityLabel={`Dia ${d.indice}, ${formatDiaMes(d.dia)}`}>
            <Text style={styles.numero}>{d.indice}</Text>
            <View style={[styles.circulo, d.confirmado ? styles.circuloAtivo : styles.circuloInativo]}>
              {d.confirmado && <AppIcon name="check" size={IconSize.sm} color={AgroColors.textInverse} />}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  trilha: {
    backgroundColor: AgroColors.mintBg,
    borderRadius: Radius.md,
  },
  trilhaConteudo: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  dia: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  diaFuturo: {
    opacity: 0.45,
  },
  numero: {
    fontSize: 12,
    fontWeight: '600',
    color: AgroColors.textSecondary,
  },
  circulo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuloAtivo: {
    backgroundColor: AgroColors.primaryLight,
  },
  circuloInativo: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: AgroColors.borderStrong,
  },
});
