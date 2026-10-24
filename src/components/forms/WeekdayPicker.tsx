import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { DiaSemana } from '@/dtos';

export const TODOS_OS_DIAS: DiaSemana[] = [1, 2, 3, 4, 5, 6, 7];

const LETRA_DO_DIA: Record<DiaSemana, string> = {
  1: 'D',
  2: 'S',
  3: 'T',
  4: 'Q',
  5: 'Q',
  6: 'S',
  7: 'S',
};

const NOME_DO_DIA: Record<DiaSemana, string> = {
  1: 'Domingo',
  2: 'Segunda',
  3: 'Terça',
  4: 'Quarta',
  5: 'Quinta',
  6: 'Sexta',
  7: 'Sábado',
};

export interface WeekdayPickerProps {
  label?: string;
  /** Dias marcados, de 1 (domingo) a 7 (sábado), como no expo-notifications */
  value: DiaSemana[];
  onChange: (dias: DiaSemana[]) => void;
  error?: string;
}

/**
 * Dias da semana no estilo do alarme do celular (D S T Q Q S S), com atalho
 * "Todos os dias".
 */
export function WeekdayPicker({ label, value, onChange, error }: WeekdayPickerProps) {
  const todosMarcados = value.length === TODOS_OS_DIAS.length;

  const alternar = (dia: DiaSemana) =>
    onChange(
      value.includes(dia)
        ? value.filter((d) => d !== dia)
        : [...value, dia].sort((a, b) => a - b)
    );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Pressable onPress={() => onChange(todosMarcados ? [] : TODOS_OS_DIAS)}>
          <Text style={styles.todosText}>
            {todosMarcados ? 'Limpar' : 'Todos os dias'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.diasRow}>
        {TODOS_OS_DIAS.map((dia) => {
          const marcado = value.includes(dia);
          return (
            <Pressable
              key={dia}
              onPress={() => alternar(dia)}
              accessibilityRole="checkbox"
              accessibilityLabel={NOME_DO_DIA[dia]}
              accessibilityState={{ checked: marcado }}
              style={[styles.dia, marcado && styles.diaMarcado]}>
              <Text style={[styles.diaText, marcado && styles.diaTextMarcado]}>
                {LETRA_DO_DIA[dia]}
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
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...Typography.caption,
    color: AgroColors.textSecondary,
    fontWeight: '600',
  },
  todosText: {
    ...Typography.captionBold,
    color: AgroColors.primary,
  },
  diasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dia: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: AgroColors.borderStrong,
    backgroundColor: AgroColors.subtleBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaMarcado: {
    backgroundColor: AgroColors.primary,
    borderColor: AgroColors.primary,
  },
  diaText: {
    ...Typography.captionBold,
    color: AgroColors.textSecondary,
  },
  diaTextMarcado: {
    color: AgroColors.textInverse,
  },
  errorText: {
    ...Typography.captionBold,
    color: AgroColors.danger,
  },
});
