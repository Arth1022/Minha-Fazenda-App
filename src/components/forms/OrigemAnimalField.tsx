import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { Animal } from '@/dtos';
import { AnimalPicker } from './AnimalPicker';
import { ChipSelector, type ChipOption } from './ChipSelector';
import { CustomInput } from './CustomInput';

type Origem = 'fazenda' | 'fora';

const OPCOES: ChipOption<Origem>[] = [
  { label: 'Da fazenda', value: 'fazenda' },
  { label: 'De fora / sêmen', value: 'fora' },
];

/** Valor do campo: o id de um animal do rebanho OU a descrição de um de fora. */
export interface OrigemAnimalValue {
  id: string | null;
  descricao: string | null;
}

export interface OrigemAnimalFieldProps {
  label: string;
  /** Animais do rebanho que podem ser escolhidos (ex.: só machos) */
  animais: Animal[];
  value: OrigemAnimalValue;
  onChange: (value: OrigemAnimalValue) => void;
  /** Placeholder do texto livre (ex.: "Nome do touro ou código do sêmen") */
  placeholderFora?: string;
}

/**
 * Pai ou touro: escolhe um animal do rebanho ("Da fazenda") ou descreve um de
 * fora/sêmen ("De fora"). Trocar de opção limpa a outra, então nunca vão os dois.
 */
export function OrigemAnimalField({
  label,
  animais,
  value,
  onChange,
  placeholderFora = 'Nome do touro ou código do sêmen',
}: OrigemAnimalFieldProps) {
  const [origem, setOrigem] = useState<Origem>(value.descricao ? 'fora' : 'fazenda');

  const trocarOrigem = (nova: Origem) => {
    setOrigem(nova);
    onChange({ id: null, descricao: null });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ChipSelector options={OPCOES} value={origem} onChange={trocarOrigem} />

      {origem === 'fazenda' ? (
        <AnimalPicker
          animais={animais}
          value={value.id}
          onChange={(id) => onChange({ id, descricao: null })}
        />
      ) : (
        <CustomInput
          value={value.descricao ?? ''}
          onChangeText={(texto) => onChange({ id: null, descricao: texto || null })}
          placeholder={placeholderFora}
        />
      )}
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
});
