import React, { useState } from 'react';
import { Alert } from 'react-native';

import { DateField, FormModal } from '@/components/forms';
import type { Tratamento } from '@/dtos';
import { alterarFimDoTratamento } from '../../data/tratamentos';

export interface EditarTratamentoModalProps {
  tratamento: Tratamento;
  onClose: () => void;
}

/**
 * Lápis do tratamento: muda o último dia (estender ou encerrar antes).
 * Renderize só enquanto estiver aberto.
 */
export function EditarTratamentoModal({ tratamento, onClose }: EditarTratamentoModalProps) {
  const [fim, setFim] = useState<Date | null>(tratamento.dataFim);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!fim) {
      onClose();
      return;
    }
    setSalvando(true);
    try {
      await alterarFimDoTratamento(tratamento, fim);
      onClose();
    } catch (error) {
      Alert.alert(
        'Não foi possível alterar o fim',
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <FormModal
      visible
      title="Editar tratamento"
      subtitle={tratamento.medicamento}
      onClose={onClose}
      onSubmit={salvar}
      loading={salvando}>
      <DateField label="Início" value={tratamento.dataInicio} onChange={() => {}} disabled />
      <DateField
        label="Fim"
        value={fim}
        placeholder="Contínuo"
        minimumDate={tratamento.dataInicio}
        onChange={setFim}
      />
    </FormModal>
  );
}
