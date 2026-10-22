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
import Animal from '@/entities/Animal';
import { CoberturasField } from './CoberturasField';
import { useNovoAnimalForm } from '@/features/rebanho/useNovoAnimalForm';

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
  const { control, clearErrors, coberturas, submit, saving } =
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

      <View style={styles.twoColInputs}>
        <ControlledInput
          control={control}
          name="pesoKg"
          containerStyle={{ flex: 1 }}
          label="Peso"
          required
          placeholder="512"
          keyboardType="numeric"
          suffix="kg"
        />

        <ControlledInput
          control={control}
          name="producaoLeiteL"
          containerStyle={{ flex: 1 }}
          label="Produção de Leite"
          placeholder="22.1"
          keyboardType="numeric"
          suffix="L"
        />
      </View>

      <View style={styles.twoColInputs}>
        <ControlledInput
          control={control}
          name="crias"
          containerStyle={{ flex: 1 }}
          label="Crias"
          placeholder="3"
          keyboardType="numeric"
        />

        <ControlledInput
          control={control}
          name="racaoKgDia"
          containerStyle={{ flex: 1 }}
          label="Ração Concentrado"
          placeholder="6.5"
          keyboardType="numeric"
          suffix="kg/dia"
        />
      </View>

      <View style={styles.twoColInputs}>
        <ControlledInput
          control={control}
          name="paiBrinco"
          containerStyle={{ flex: 1 }}
          label="Brinco do Pai"
          placeholder="Ex: #050"
        />

        <ControlledInput
          control={control}
          name="maeBrinco"
          containerStyle={{ flex: 1 }}
          label="Brinco da Mãe"
          placeholder="Ex: #101"
        />
      </View>

      <CoberturasField
        coberturas={coberturas.fields}
        onAdd={(nova) => {
          // Mantém a lista ordenada da mais recente para a mais antiga
          const index = coberturas.fields.findIndex(
            (c) => c.data.getTime() < nova.data.getTime()
          );
          coberturas.insert(
            index === -1 ? coberturas.fields.length : index,
            nova
          );
        }}
        onRemove={coberturas.remove}
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
