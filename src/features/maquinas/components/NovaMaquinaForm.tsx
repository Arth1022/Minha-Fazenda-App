import { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import {
  AutocompleteInput,
  ChipSelector,
  CollapsibleSection,
  ControlledInput,
  DateField,
  FormModal,
  type ChipOption,
} from '@/components/forms';
import { COMBUSTIVEIS, TIPOS_MAQUINA } from '@/database';
import { Spacing } from '@/constants/theme';
import type { Combustivel, Maquina, TipoMaquina } from '@/dtos';
import { COMBUSTIVEL_LABEL, MARCAS_MAQUINAS, TIPO_MAQUINA_LABEL } from '../constants';
import { useNovaMaquinaForm } from '../hooks/useNovaMaquinaForm';

const TIPOS: ChipOption<TipoMaquina>[] = TIPOS_MAQUINA.map((tipo) => ({
  value: tipo,
  label: TIPO_MAQUINA_LABEL[tipo],
}));

const COMBUSTIVEL_OPCOES: ChipOption<Combustivel>[] = COMBUSTIVEIS.map((c) => ({
  value: c,
  label: COMBUSTIVEL_LABEL[c],
}));

export interface NovaMaquinaFormProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (maquina: Maquina) => void;
}

/**
 * Modal de cadastro de máquina: nome, tipo, marca e modelo à vista;
 * ano, série, placa, potência, combustível, horímetro e aquisição em "Mais detalhes".
 */
export function NovaMaquinaForm({ visible, onClose, onCreated }: NovaMaquinaFormProps) {
  const { control, clearErrors, submit, saving } = useNovaMaquinaForm(onCreated);

  useEffect(() => {
    if (visible) clearErrors();
  }, [visible, clearErrors]);

  return (
    <FormModal
      visible={visible}
      title="Nova Máquina"
      subtitle="Cadastre um equipamento ou veículo da fazenda"
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Salvar Máquina"
      loading={saving}>
      <ControlledInput
        control={control}
        name="nome"
        label="Nome"
        required
        placeholder="Ex: Trator do curral"
      />

      <Controller
        control={control}
        name="tipo"
        render={({ field }) => (
          <ChipSelector label="Tipo" options={TIPOS} value={field.value} onChange={field.onChange} />
        )}
      />

      <Controller
        control={control}
        name="marca"
        render={({ field }) => (
          <AutocompleteInput
            label="Marca"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="Digite para buscar (ex: Valtra)"
            suggestions={MARCAS_MAQUINAS}
          />
        )}
      />

      <ControlledInput control={control} name="modelo" label="Modelo" placeholder="Ex: MF 4275" />

      <CollapsibleSection title="Mais detalhes">
        <View style={styles.duasColunas}>
          <ControlledInput
            control={control}
            name="anoFabricacao"
            containerStyle={styles.coluna}
            label="Ano"
            placeholder="2018"
            keyboardType="number-pad"
            maxLength={4}
          />
          <ControlledInput
            control={control}
            name="potenciaCv"
            containerStyle={styles.coluna}
            label="Potência"
            placeholder="75"
            keyboardType="numeric"
            suffix="cv"
          />
        </View>

        <ControlledInput
          control={control}
          name="numeroSerie"
          label="Nº de série / chassi"
          placeholder="Ex: 9BM..."
          autoCapitalize="characters"
        />

        <View style={styles.duasColunas}>
          <ControlledInput
            control={control}
            name="placa"
            containerStyle={styles.coluna}
            label="Placa"
            placeholder="ABC1D23"
            autoCapitalize="characters"
          />
          <ControlledInput
            control={control}
            name="horimetro"
            containerStyle={styles.coluna}
            label="Horímetro atual"
            placeholder="1250"
            keyboardType="numeric"
            suffix="h"
          />
        </View>

        <Controller
          control={control}
          name="combustivel"
          render={({ field }) => (
            <ChipSelector
              label="Combustível"
              options={COMBUSTIVEL_OPCOES}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="dataAquisicao"
          render={({ field }) => (
            <DateField
              label="Data de aquisição"
              value={field.value}
              onChange={field.onChange}
              placeholder="Não informada"
              maximumDate={new Date()}
            />
          )}
        />
      </CollapsibleSection>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  duasColunas: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  coluna: {
    flex: 1,
  },
});
