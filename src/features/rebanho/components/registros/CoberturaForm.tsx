import React, { useState } from 'react';

import {
  ChipSelector,
  DateField,
  FormModal,
  OrigemAnimalField,
  type ChipOption,
  type OrigemAnimalValue,
} from '@/components/forms';
import type { Animal, TipoReproducao } from '@/dtos';
import { createReproducao } from '../../data/reproducoes';
import { useEnvioRegistro } from '../../hooks/useEnvioRegistro';

const TIPOS: ChipOption<TipoReproducao>[] = [
  { label: 'Monta natural', value: 'cobertura' },
  { label: 'Inseminação', value: 'inseminacao' },
];

export interface CoberturaFormProps {
  animalId: string;
  /** Machos do rebanho que podem ser o touro */
  touros: Animal[];
  onClose: () => void;
}

/** Mini-formulário "Cobertura": tipo, data e touro (da fazenda ou de fora/sêmen). */
export function CoberturaForm({ animalId, touros, onClose }: CoberturaFormProps) {
  const [tipo, setTipo] = useState<TipoReproducao>('cobertura');
  const [data, setData] = useState(new Date());
  const [touro, setTouro] = useState<OrigemAnimalValue>({ id: null, descricao: null });

  const { saving, submit } = useEnvioRegistro(
    () =>
      createReproducao({
        animalId,
        tipo,
        data,
        touroId: touro.id,
        touroDescricao: touro.descricao,
      }),
    onClose
  );

  return (
    <FormModal
      variant="sheet"
      visible
      title="Cobertura"
      subtitle="A previsão de parto é calculada automaticamente"
      onClose={onClose}
      onSubmit={submit}
      loading={saving}>
      <ChipSelector label="Tipo" options={TIPOS} value={tipo} onChange={setTipo} />
      <DateField label="Data" value={data} onChange={setData} maximumDate={new Date()} />
      <OrigemAnimalField
        label={tipo === 'inseminacao' ? 'Sêmen / touro' : 'Touro'}
        animais={touros}
        value={touro}
        onChange={setTouro}
      />
    </FormModal>
  );
}
