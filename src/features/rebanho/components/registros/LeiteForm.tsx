import React, { useState } from 'react';

import { CustomInput, DateField, FormModal } from '@/components/forms';
import { parseDecimal } from '@/utils';
import { registrarControleLeiteiro } from '../../data/leite';
import { useEnvioRegistro } from '../../hooks/useEnvioRegistro';

export interface LeiteFormProps {
  animalId: string;
  onClose: () => void;
}

/** Mini-formulário "Registro de leite": litros do dia (soma das ordenhas) e a data (padrão hoje). */
export function LeiteForm({ animalId, onClose }: LeiteFormProps) {
  const [litros, setLitros] = useState('');
  const [data, setData] = useState(new Date());
  const [erro, setErro] = useState<string>();

  const { saving, submit } = useEnvioRegistro(
    () => registrarControleLeiteiro({ animalId, data, litros: parseDecimal(litros) }),
    onClose
  );

  const salvar = () => {
    if (!(parseDecimal(litros) > 0)) {
      setErro('Informe os litros do dia.');
      return;
    }
    submit();
  };

  return (
    <FormModal visible title="Registro de leite" onClose={onClose} onSubmit={salvar} loading={saving}>
      <CustomInput
        label="Leite no dia"
        required
        value={litros}
        onChangeText={setLitros}
        placeholder="18,5"
        keyboardType="numeric"
        suffix="L"
        helperText="Soma das ordenhas do dia"
        error={erro}
      />
      <DateField label="Data" value={data} onChange={setData} maximumDate={new Date()} />
    </FormModal>
  );
}
