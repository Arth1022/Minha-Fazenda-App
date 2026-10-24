import React from 'react';

import { ChipSelector, type ChipOption } from './ChipSelector';

/** Antecedência do aviso em minutos (coluna aviso_minutos_antes). */
export const AVISOS_MINUTOS = [0, 15, 60, 1440] as const;
export type AvisoMinutos = (typeof AVISOS_MINUTOS)[number];

const LABEL_DO_AVISO: Record<AvisoMinutos, string> = {
  0: 'Na hora',
  15: '15 min antes',
  60: '1 h antes',
  1440: '1 dia antes',
};

const OPCOES: ChipOption<string>[] = AVISOS_MINUTOS.map((minutos) => ({
  label: LABEL_DO_AVISO[minutos],
  value: String(minutos),
}));

export interface AvisoPickerProps {
  label?: string;
  value: AvisoMinutos;
  onChange: (minutos: AvisoMinutos) => void;
}

/** "Quando notificar": quanto tempo antes do horário da dose o celular avisa. */
export function AvisoPicker({
  label = 'Quando notificar',
  value,
  onChange,
}: AvisoPickerProps) {
  return (
    <ChipSelector
      label={label}
      options={OPCOES}
      value={String(value)}
      onChange={(v) => onChange(Number(v) as AvisoMinutos)}
    />
  );
}
