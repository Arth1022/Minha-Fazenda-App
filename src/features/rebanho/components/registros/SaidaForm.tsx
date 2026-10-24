import React, { useState } from 'react';

import {
  ChipSelector,
  CustomInput,
  DateField,
  FormModal,
  type ChipOption,
} from '@/components/forms';
import type { StatusSaida } from '@/dtos';
import { registrarSaida } from '../../data/animais';
import { useEnvioRegistro } from '../../hooks/useEnvioRegistro';

const MOTIVOS: ChipOption<StatusSaida>[] = [
  { label: 'Venda', value: 'vendido' },
  { label: 'Morte', value: 'morto' },
  { label: 'Descarte', value: 'descarte' },
];

export interface SaidaFormProps {
  animalId: string;
  onClose: () => void;
}

/** Mini-formulário "Saída": o animal sai da lista, mas o histórico fica guardado. */
export function SaidaForm({ animalId, onClose }: SaidaFormProps) {
  const [status, setStatus] = useState<StatusSaida>('vendido');
  const [data, setData] = useState(new Date());
  const [motivo, setMotivo] = useState('');

  const { saving, submit } = useEnvioRegistro(
    () => registrarSaida(animalId, { status, data, motivo: motivo.trim() || undefined }),
    onClose
  );

  return (
    <FormModal
      visible
      title="Saída do rebanho"
      subtitle="O animal sai da lista, mas o histórico fica guardado"
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Registrar saída"
      loading={saving}>
      <ChipSelector label="Tipo de saída" options={MOTIVOS} value={status} onChange={setStatus} />
      <DateField label="Data" value={data} onChange={setData} maximumDate={new Date()} />
      <CustomInput
        label="Observação (opcional)"
        value={motivo}
        onChangeText={setMotivo}
        placeholder="Ex: vendida para a Fazenda Boa Vista"
      />
    </FormModal>
  );
}
