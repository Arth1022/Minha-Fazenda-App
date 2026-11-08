import React, { useState } from 'react';

import { CustomInput, DateField, FormModal } from '@/components/forms';
import { parseDecimal } from '@/utils';
import { createPesagem } from '../../data/pesagens';
import { useEnvioRegistro } from '../../hooks/useEnvioRegistro';

export interface PesagemFormProps {
  animalId: string;
  onClose: () => void;
}

/** Mini-formulário "Pesagem": peso e data (padrão hoje). */
export function PesagemForm({ animalId, onClose }: PesagemFormProps) {
  const [peso, setPeso] = useState('');
  const [data, setData] = useState(new Date());
  const [erro, setErro] = useState<string>();

  const { saving, submit } = useEnvioRegistro(
    () => createPesagem({ animalId, data, pesoKg: parseDecimal(peso) }),
    onClose
  );

  const salvar = () => {
    if (!(parseDecimal(peso) > 0)) {
      setErro('Informe o peso em kg.');
      return;
    }
    submit();
  };

  return (
    <FormModal
      variant="sheet"
      visible
      title="Pesagem"
      onClose={onClose}
      onSubmit={salvar}
      loading={saving}>
      <CustomInput
        label="Peso"
        required
        value={peso}
        onChangeText={setPeso}
        placeholder="450"
        keyboardType="numeric"
        suffix="kg"
        error={erro}
      />
      <DateField label="Data" value={data} onChange={setData} maximumDate={new Date()} />
    </FormModal>
  );
}
