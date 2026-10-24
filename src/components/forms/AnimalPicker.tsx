import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { Animal } from '@/dtos';
import { normalizarTexto } from '@/utils';
import { CustomInput } from './CustomInput';

const MAX_SUGESTOES = 5;

/** "Mimosa · #104", ou só o brinco quando não há nome. */
function nomeDoAnimal(animal: Animal): string {
  return animal.nome ? `${animal.nome} · ${animal.brinco}` : animal.brinco;
}

export interface AnimalPickerProps {
  label?: string;
  /** Animais que podem ser escolhidos (quem chama já filtra, ex.: só fêmeas) */
  animais: Animal[];
  /** id do animal escolhido */
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}

/** Busca um animal do rebanho pelo brinco ou nome e devolve o id dele. */
export function AnimalPicker({
  label,
  animais,
  value,
  onChange,
  placeholder = 'Buscar por brinco ou nome',
}: AnimalPickerProps) {
  const [busca, setBusca] = useState('');
  const escolhido = animais.find((animal) => animal.id === value);

  if (escolhido) {
    return (
      <View style={styles.container}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Pressable
          onPress={() => onChange(null)}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${nomeDoAnimal(escolhido)}`}
          style={styles.escolhido}>
          <Text style={styles.escolhidoText}>🐮 {nomeDoAnimal(escolhido)}</Text>
          <Text style={styles.remover}>✕</Text>
        </Pressable>
      </View>
    );
  }

  const termo = normalizarTexto(busca);
  const sugestoes = termo
    ? animais
        .filter((animal) => normalizarTexto(nomeDoAnimal(animal)).includes(termo))
        .slice(0, MAX_SUGESTOES)
    : [];

  return (
    <View style={styles.container}>
      <CustomInput
        label={label}
        value={busca}
        onChangeText={setBusca}
        placeholder={placeholder}
        autoCorrect={false}
      />
      {sugestoes.length > 0 ? (
        <View style={styles.lista}>
          {sugestoes.map((animal) => (
            <Pressable
              key={animal.id}
              onPress={() => {
                onChange(animal.id);
                setBusca('');
              }}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
              <Text style={styles.itemText}>{nomeDoAnimal(animal)}</Text>
            </Pressable>
          ))}
        </View>
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
  escolhido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: AgroColors.primary,
    backgroundColor: AgroColors.mintBg,
  },
  escolhidoText: {
    ...Typography.bodyBold,
    color: AgroColors.primaryDark,
  },
  remover: {
    ...Typography.bodyBold,
    color: AgroColors.textMuted,
  },
  lista: {
    borderWidth: 1,
    borderColor: AgroColors.border,
    borderRadius: Radius.md,
    backgroundColor: AgroColors.cardBg,
    overflow: 'hidden',
  },
  item: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AgroColors.divider,
  },
  itemPressed: {
    backgroundColor: AgroColors.mintSurface,
  },
  itemText: {
    ...Typography.body,
  },
});
