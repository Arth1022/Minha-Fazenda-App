import React from 'react';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

import { CustomInput, type CustomInputProps } from './CustomInput';

export interface ControlledInputProps<T extends FieldValues> extends Omit<
  CustomInputProps,
  'value' | 'onChangeText' | 'error'
> {
  control: Control<T>;
  name: FieldPath<T>;
}

/**
 * CustomInput ligado a um campo do react-hook-form
 * (valor, onChange/onBlur e mensagem de erro de validação).
 */
export function ControlledInput<T extends FieldValues>({
  control,
  name,
  onBlur,
  ...inputProps
}: ControlledInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <CustomInput
          {...inputProps}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={(e) => {
            field.onBlur();
            onBlur?.(e);
          }}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
