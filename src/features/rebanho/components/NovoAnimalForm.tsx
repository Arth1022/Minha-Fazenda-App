import { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import {
  AnimalPicker,
  AutocompleteInput,
  ChipSelector,
  CollapsibleSection,
  ControlledInput,
  FormModal,
  OrigemAnimalField,
  type ChipOption
} from '@/components/forms';
import { RACAS_BOVINAS } from '@/constants/racas';
import { Spacing } from '@/constants/theme';
import type { Animal, Sexo } from '@/dtos';
import { useNovoAnimalForm } from '../hooks/useNovoAnimalForm';

const SEXOS: ChipOption<Sexo>[] = [
  { label: 'Fêmea', value: 'F' },
  { label: 'Macho', value: 'M' },
];

export interface NovoAnimalFormProps {
  visible: boolean;
  /** Rebanho, para escolher a mãe (fêmeas) e o pai (machos) */
  animais: Animal[];
  onClose: () => void;
  onCreated: (animal: Animal) => void;
}

/**
 * Modal de cadastro de um novo animal no rebanho: o essencial à vista e o
 * resto (peso, leite, ração, mãe e pai) em "Mais detalhes", recolhido.
 */
export function NovoAnimalForm({
  visible,
  animais,
  onClose,
  onCreated,
}: NovoAnimalFormProps) {
  const { control, clearErrors, submit, saving, femea, mostrarCrias } =
    useNovoAnimalForm(onCreated);

  const femeas = animais.filter((animal) => animal.sexo === 'F');
  const machos = animais.filter((animal) => animal.sexo === 'M');

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

      <Controller
        control={control}
        name="sexo"
        render={({ field }) => (
          <ChipSelector
            label="Sexo"
            options={SEXOS}
            value={field.value}
            onChange={field.onChange}
          />
        )}
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

      {mostrarCrias ? (
        <ControlledInput
          control={control}
          name="crias"
          label="Crias"
          placeholder="0"
          keyboardType="number-pad"
          helperText="Quantas crias ela já teve antes de entrar no app"
        />
      ) : null}

      <CollapsibleSection title="Mais detalhes">
        <ControlledInput
          control={control}
          name="pesoKg"
          label="Peso atual"
          placeholder="450"
          keyboardType="numeric"
          suffix="kg"
        />

        {femea ? (
          <View style={styles.twoColInputs}>
            <ControlledInput
              control={control}
              name="producaoLeiteL"
              containerStyle={{ flex: 1 }}
              label="Produção de Leite"
              placeholder="22,1"
              keyboardType="numeric"
              suffix="L/dia"
            />

            <ControlledInput
              control={control}
              name="racaoKgDia"
              containerStyle={{ flex: 1 }}
              label="Ração Concentrado"
              placeholder="6,5"
              keyboardType="numeric"
              suffix="kg/dia"
            />
          </View>
        ) : null}

        <Controller
          control={control}
          name="maeId"
          render={({ field }) => (
            <AnimalPicker
              label="Mãe"
              animais={femeas}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="pai"
          render={({ field }) => (
            <OrigemAnimalField
              label="Pai"
              animais={machos}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </CollapsibleSection>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  twoColInputs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
