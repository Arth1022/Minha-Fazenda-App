import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Controller } from "react-hook-form";

import {
  AutocompleteInput,
  AvisoPicker,
  CollapsibleSection,
  ControlledInput,
  DateField,
  FormModal,
  IntervalPicker,
  SwitchField,
  TimeWheelPicker,
  WeekdayPicker,
} from "@/components/forms";
import { MEDICAMENTOS_SUGERIDOS } from "@/constants/medicamentos";
import { AgroColors, Radius, Spacing, Typography } from "@/constants/theme";
import { useNovoTratamentoForm } from "../hooks/useNovoTratamentoForm";

export interface NovoTratamentoFormProps {
  visible: boolean;
  animalId: string | undefined;
  /** Identificação mostrada no subtítulo (ex.: "Brinco #104") */
  identificacao: string;
  onClose: () => void;
}

/**
 * Modal "Novo Tratamento": o único formulário de dose (remédio ou vacina).
 * À vista ficam remédio, dose, dias e horário; aviso, período e carência vão
 * em "Mais detalhes". A frase no fim resume a agenda enquanto se preenche.
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
    produzLeite,
    todoDia,
    comecaEm,
    semFim,
    resumo,
    placeholderCarencia,
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
      submitLabel="Salvar Tratamento"
      loading={saving}
    >
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
            suggestions={MEDICAMENTOS_SUGERIDOS}
            error={fieldState.error?.message}
          />
        )}
      />

      <ControlledInput
        control={control}
        name="dose"
        label="Dose"
        placeholder="Ex: 2 ml"
      />

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
            <IntervalPicker
              label="Repetir a cada"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      ) : null}

      <View style={styles.campo}>
        <Text style={styles.label}>Horário</Text>
        <Controller
          control={control}
          name="horario"
          render={({ field }) => (
            <TimeWheelPicker value={field.value} onChange={field.onChange} />
          )}
        />
      </View>

      <CollapsibleSection title="Mais detalhes">
        <Controller
          control={control}
          name="avisoMinutosAntes"
          render={({ field }) => (
            <AvisoPicker
              label="Avisar"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <View style={styles.duasColunas}>
          <View style={styles.coluna}>
            <Controller
              control={control}
              name="comecaEm"
              render={({ field }) => (
                <DateField
                  label="Começa em"
                  value={field.value}
                  onChange={field.onChange}
                />
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

        <View style={styles.duasColunas}>
          {produzLeite ? (
            <ControlledInput
              control={control}
              name="carenciaLeiteDias"
              containerStyle={styles.coluna}
              label="Carência no leite"
              placeholder={placeholderCarencia}
              keyboardType="number-pad"
              suffix="dias"
            />
          ) : null}
          <ControlledInput
            control={control}
            name="carenciaCarneDias"
            containerStyle={styles.coluna}
            label="Carência na carne"
            placeholder={placeholderCarencia}
            keyboardType="number-pad"
            suffix="dias"
          />
        </View>
      </CollapsibleSection>

      <View style={styles.resumo}>
        <Text style={styles.resumoTexto}>{resumo}</Text>
      </View>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  campo: {
    gap: 5,
  },
  label: {
    ...Typography.caption,
    color: AgroColors.textSecondary,
    fontWeight: "600",
  },
  duasColunas: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  coluna: {
    flex: 1,
  },
  resumo: {
    backgroundColor: AgroColors.mintBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  resumoTexto: {
    ...Typography.bodyMedium,
    color: AgroColors.primaryDark,
  },
});
