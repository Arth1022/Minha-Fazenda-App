import React from 'react';

import { ChipSelector, type ChipOption } from './ChipSelector';

/** Só divisores de 24: as doses caem sempre nos mesmos horários todo dia. */
export const INTERVALOS_HORAS = [4, 6, 8, 12, 24] as const;
export type IntervaloHoras = (typeof INTERVALOS_HORAS)[number];

const OPCOES: ChipOption<string>[] = INTERVALOS_HORAS.map((horas) => ({
  label: `${horas} h`,
  value: String(horas),
}));

export interface IntervalPickerProps {
  label?: string;
  value: IntervaloHoras;
  onChange: (horas: IntervaloHoras) => void;
}

/** "Repetir a cada N horas", para doses diárias. */
export function IntervalPicker({
  label = 'Repetir a cada',
  value,
  onChange,
}: IntervalPickerProps) {
  return (
    <ChipSelector
      label={label}
      options={OPCOES}
      value={String(value)}
      onChange={(v) => onChange(Number(v) as IntervaloHoras)}
    />
  );
}
