import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { ChipOption } from './ChipSelector';

/** Altura da lista aberta antes de rolar (~5 opções) */
const ALTURA_LISTA = 240;

export interface SelectFieldProps<T extends string> {
  label?: string;
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
}

/**
 * Combobox: mostra a opção escolhida e, ao tocar, abre a lista logo abaixo
 * (sem modal por cima, então funciona dentro de folhas e formulários).
 */
export function SelectField<T extends string>({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione',
}: SelectFieldProps<T>) {
  const [aberto, setAberto] = useState(false);
  const escolhida = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => setAberto((a) => !a)}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: aberto }}
        accessibilityLabel={label}
        style={[styles.campo, aberto && styles.campoAberto]}>
        <Text
          style={[styles.valor, !escolhida && styles.placeholder]}
          numberOfLines={1}>
          {escolhida?.label ?? placeholder}
        </Text>
        <AppIcon
          name={aberto ? 'chevronUp' : 'chevronDown'}
          size={20}
          color={AgroColors.textSecondary}
        />
      </Pressable>

      {aberto ? (
        <ScrollView
          style={styles.lista}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled">
          {options.map((opcao, indice) => {
            const selecionada = opcao.value === value;
            return (
              <Pressable
                key={opcao.value}
                onPress={() => {
                  onChange(opcao.value);
                  setAberto(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: selecionada }}
                style={({ pressed }) => [
                  styles.item,
                  indice > 0 && styles.itemDivisor,
                  selecionada && styles.itemSelecionado,
                  pressed && styles.itemPressionado,
                ]}>
                <Text
                  style={[styles.itemTexto, selecionada && styles.itemTextoSelecionado]}
                  numberOfLines={1}>
                  {opcao.label}
                </Text>
                {selecionada ? (
                  <AppIcon name="check" size={18} color={AgroColors.forest} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    color: AgroColors.textSecondary,
    fontWeight: '600',
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AgroColors.borderStrong,
    backgroundColor: AgroColors.inputBg,
  },
  campoAberto: {
    borderColor: AgroColors.forest,
  },
  valor: {
    flex: 1,
    ...Typography.bodyMedium,
    color: AgroColors.textPrimary,
  },
  placeholder: {
    color: AgroColors.textPlaceholder,
  },
  lista: {
    maxHeight: ALTURA_LISTA,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AgroColors.border,
    backgroundColor: AgroColors.cardBg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 46,
    paddingHorizontal: Spacing.md,
  },
  itemDivisor: {
    borderTopWidth: 1,
    borderTopColor: AgroColors.divider,
  },
  itemSelecionado: {
    backgroundColor: AgroColors.mintSurface,
  },
  itemPressionado: {
    backgroundColor: AgroColors.subtleBg,
  },
  itemTexto: {
    flex: 1,
    ...Typography.bodyMedium,
    color: AgroColors.textPrimary,
  },
  itemTextoSelecionado: {
    color: AgroColors.forest,
    fontWeight: '700',
  },
});
