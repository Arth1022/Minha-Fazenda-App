import React, { useState } from 'react';

import {
  ChipSelector,
  CustomInput,
  DateField,
  FormModal,
  type ChipOption,
} from '@/components/forms';
import type { Sexo } from '@/dtos';
import { formatBrinco } from '@/utils';
import { registrarParto } from '../../data/animais';
import { useEnvioRegistro } from '../../hooks/useEnvioRegistro';

const SEXOS: ChipOption<Sexo>[] = [
  { label: 'Fêmea', value: 'F' },
  { label: 'Macho', value: 'M' },
];

export interface PartoFormProps {
  maeId: string;
  onClose: () => void;
}

/** Mini-formulário "Parto": já cadastra a cria ligada à mãe. */
export function PartoForm({ maeId, onClose }: PartoFormProps) {
  const [data, setData] = useState(new Date());
  const [sexo, setSexo] = useState<Sexo>('F');
  const [brinco, setBrinco] = useState('');
  const [erro, setErro] = useState<string>();

  const { saving, submit } = useEnvioRegistro(
    () => registrarParto(maeId, { data, sexo, brinco: formatBrinco(brinco) }),
    onClose
  );

  const salvar = () => {
    if (!brinco.trim()) {
      setErro('Informe o brinco da cria.');
      return;
    }
    submit();
  };

  return (
    <FormModal
      variant="sheet"
      visible
      title="Parto"
      subtitle="A cria entra no rebanho já ligada à mãe"
      onClose={onClose}
      onSubmit={salvar}
      submitLabel="Registrar parto"
      loading={saving}>
      <DateField label="Data do parto" value={data} onChange={setData} maximumDate={new Date()} />
      <ChipSelector label="Sexo da cria" options={SEXOS} value={sexo} onChange={setSexo} />
      <CustomInput
        label="Brinco da cria"
        required
        value={brinco}
        onChangeText={setBrinco}
        placeholder="Ex: #120"
        error={erro}
      />
    </FormModal>
  );
}
