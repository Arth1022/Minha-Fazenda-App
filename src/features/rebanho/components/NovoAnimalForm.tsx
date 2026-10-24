import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller } from 'react-hook-form';

import {
  AutocompleteInput,
  ControlledInput,
  FormModal,
} from '@/components/forms';
import { RACAS_BOVINAS } from '@/constants/racas';
import { Spacing } from '@/constants/theme';
import type { Animal } from '@/database';
import { useNovoAnimalForm } from '../hooks/useNovoAnimalForm';

export interface NovoAnimalFormProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (animal: Animal) => void;
}

/**
 * Modal de cadastro de um novo animal no rebanho.
 */
export function NovoAnimalForm({
  visible,
  onClose,
  onCreated,
}: NovoAnimalFormProps) {
  const { control, clearErrors, submit, saving } =
    useNovoAnimalForm(onCreated);

  useEffect(() => {
    if (visible) clearErrors();
  }, [visible, clearErrors]);

  return (
    <FormModal
      visible={visible}
      title="Novo Animal"
      subtitle="Cadastre um novo animal no rebanho local"
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Salvar Animal"
      loading={saving}>
      <ControlledInput
        control={control}
        name="brinco"
        label="Identificação (Brinco)"
        required
        placeholder="Ex: #104"
      />

      <ControlledInput
        control={control}
        name="nome"
        label="Nome do Animal (Opcional)"
        placeholder="Ex: Mimosa"
      />

      <View style={styles.twoColInputs}>
        <ControlledInput
          control={control}
          name="idadeAnos"
          containerStyle={{ flex: 1 }}
          label="Idade"
          placeholder="0"
          keyboardType="number-pad"
          suffix="anos"
        />

        <ControlledInput
          control={control}
          name="idadeMeses"
          containerStyle={{ flex: 1 }}
          label=" "
          placeholder="0"
          keyboardType="number-pad"
          suffix="meses"
        />
      </View>

      <Controller
        control={control}
        name="raca"
        render={({ field }) => (
          <AutocompleteInput
            label="Raça"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="Digite para buscar (ex: Nelore)"
            suggestions={RACAS_BOVINAS}
          />
        )}
      />
    </FormModal>
  );
}

const styles = StyleSheet.create({
  twoColInputs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
