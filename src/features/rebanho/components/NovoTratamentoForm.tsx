import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller } from 'react-hook-form';

import {
  AutocompleteInput,
  CollapsibleSection,
  ControlledInput,
  DateField,
  FormModal,
  IntervalPicker,
  SwitchField,
  TimeWheelPicker,
  WeekdayPicker,
} from '@/components/forms';
import { Spacing } from '@/constants/theme';
import { useNovoTratamentoForm } from '../hooks/useNovoTratamentoForm';

export interface NovoTratamentoFormProps {
  visible: boolean;
  animalId: string | undefined;
  /** Identificação mostrada no subtítulo (ex.: "Brinco #104") */
  identificacao: string;
  onClose: () => void;
}

/**
 * Modal "Novo Tratamento": o único formulário de dose (remédio ou vacina).
 * À vista ficam remédio, dose, dias, horário e carência; período e observações
 * vão em "Mais detalhes". O aviso é fixo (15 min antes), não aparece aqui.
 */
export function NovoTratamentoForm({
  visible,
  animalId,
  identificacao,
  onClose,
}: NovoTratamentoFormProps) {
  const {
    control,
    submit,
    reset,
    saving,
    todoDia,
    comecaEm,
    semFim,
    placeholderCarencia,
    sugestoes,
  } = useNovoTratamentoForm(animalId, onClose);

  useEffect(() => {
    if (visible) reset();
    // Só ao abrir: o reset recria os padrões (hoje, 08:00)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <FormModal
      visible={visible}
      title="Novo Tratamento"
      subtitle={`Remédio ou vacina para ${identificacao}`}
      onClose={onClose}
      onSubmit={submit}
      submitLabel="SALVAR"
      loading={saving}>
      <Controller
        control={control}
        name="medicamento"
        render={({ field, fieldState }) => (
          <AutocompleteInput
            label="Remédio ou vacina"
            required
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="Ex: Brucelose"
            suggestions={sugestoes}
            error={fieldState.error?.message}
          />
        )}
      />

      <ControlledInput control={control} name="dose" label="Dose" placeholder="Ex: 2 ml" />

      <Controller
        control={control}
        name="diasSemana"
        render={({ field, fieldState }) => (
          <WeekdayPicker
            label="Dias"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      {todoDia ? (
        <Controller
          control={control}
          name="intervaloHoras"
          render={({ field }) => (
            <IntervalPicker label="Repetir a cada" value={field.value} onChange={field.onChange} />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="horario"
        render={({ field }) => (
          <TimeWheelPicker label="Horário" value={field.value} onChange={field.onChange} />
        )}
      />

      <ControlledInput
        control={control}
        name="carenciaDias"
        label="Carência"
        placeholder={placeholderCarencia}
        keyboardType="number-pad"
        suffix="dias"
      />

      <CollapsibleSection title="Mais detalhes">
        <View style={styles.duasColunas}>
          <View style={styles.coluna}>
            <Controller
              control={control}
              name="comecaEm"
              render={({ field }) => (
                <DateField label="Começa em" value={field.value} onChange={field.onChange} />
              )}
            />
          </View>
          {semFim ? null : (
            <View style={styles.coluna}>
              <Controller
                control={control}
                name="ate"
                render={({ field }) => (
                  <DateField
                    label="Até"
                    value={field.value}
                    onChange={field.onChange}
                    minimumDate={comecaEm}
                  />
                )}
              />
            </View>
          )}
        </View>

        <Controller
          control={control}
          name="semFim"
          render={({ field }) => (
            <SwitchField
              label="Sem data de fim"
              helperText="Uso contínuo: segue até você encerrar"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <ControlledInput
          control={control}
          name="observacoes"
          label="Observações"
          placeholder="Ex: aplicar no pescoço, lote do frasco"
          multiline
          numberOfLines={3}
          style={styles.observacoes}
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
  observacoes: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
