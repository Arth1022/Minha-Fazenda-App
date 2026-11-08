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
  /** Animal a editar (lápis da ficha); sem ele, cadastra um novo */
  animal?: Animal | null;
  onClose: () => void;
  /** Animal gravado (o novo ou o editado) */
  onSaved: (animal: Animal) => void;
}

/**
 * Modal de cadastro (ou edição) de animal: o essencial à vista e o resto
 * (peso, leite, ração, mãe e pai) em "Mais detalhes", recolhido. Na edição o
 * peso fica de fora: ele muda pela pesagem.
 */
export function NovoAnimalForm({
  visible,
  animais,
  animal,
  onClose,
  onSaved,
}: NovoAnimalFormProps) {
  const { control, clearErrors, submit, saving, femea, mostrarCrias } =
    useNovoAnimalForm(onSaved, animal);
  const editando = Boolean(animal);

  // Na edição, o próprio animal não pode ser escolhido como mãe ou pai
  const outros = animais.filter((a) => a.id !== animal?.id);
  const femeas = outros.filter((a) => a.sexo === 'F');
  const machos = outros.filter((a) => a.sexo === 'M');

  useEffect(() => {
    if (visible) clearErrors();
  }, [visible, clearErrors]);

  return (
    <FormModal
      visible={visible}
      title={editando ? 'Editar animal' : 'Novo Animal'}
      subtitle={
        editando ? 'Corrija os dados do cadastro' : 'Cadastre um novo animal no rebanho local'
      }
      onClose={onClose}
      onSubmit={submit}
      submitLabel={editando ? 'Salvar alterações' : 'Salvar Animal'}
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
        {editando ? null : (
          <ControlledInput
            control={control}
            name="pesoKg"
            label="Peso atual"
            placeholder="450"
            keyboardType="numeric"
            suffix="kg"
          />
        )}

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
