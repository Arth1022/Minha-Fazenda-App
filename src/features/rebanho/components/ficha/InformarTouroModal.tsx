import React, { useState } from 'react';

import { FormModal, OrigemAnimalField, type OrigemAnimalValue } from '@/components/forms';
import type { Animal } from '@/dtos';
import { informarTouro } from '../../data/reproducoes';
import { useEnvioRegistro } from '../../hooks/useEnvioRegistro';

export interface InformarTouroModalProps {
  coberturaId: string;
  /** Machos do rebanho que podem ser o touro */
  touros: Animal[];
  onClose: () => void;
}

/** "Informar" da linha do tempo: touro da fazenda ou de fora/sêmen. Renderize só aberto. */
export function InformarTouroModal({ coberturaId, touros, onClose }: InformarTouroModalProps) {
  const [touro, setTouro] = useState<OrigemAnimalValue>({ id: null, descricao: null });
  const { saving, submit } = useEnvioRegistro(() => informarTouro(coberturaId, touro), onClose);

  return (
    <FormModal
      visible
      title="Informar touro"
      subtitle="Touro da fazenda, de fora ou código do sêmen"
      onClose={onClose}
      onSubmit={submit}
      loading={saving}>
      <OrigemAnimalField label="Touro" animais={touros} value={touro} onChange={setTouro} />
    </FormModal>
  );
}
