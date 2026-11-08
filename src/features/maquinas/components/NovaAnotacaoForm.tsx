import React from 'react';

import { CustomInput, FormModal } from '@/components/forms';
import { useNovaAnotacao } from '../hooks/useNovaAnotacao';

export interface NovaAnotacaoFormProps {
  visible: boolean;
  maquinaId: string;
  /** Nome da máquina, mostrado no subtítulo */
  nome: string;
  onClose: () => void;
}

/** Modal com um campo de texto para anotar algo na ficha da máquina. */
export function NovaAnotacaoForm({ visible, maquinaId, nome, onClose }: NovaAnotacaoFormProps) {
  const { texto, alterarTexto, erro, saving, submit, limpar } = useNovaAnotacao(maquinaId, onClose);

  const fechar = () => {
    limpar();
    onClose();
  };

  return (
    <FormModal
      visible={visible}
      title="Nova Anotação"
      subtitle={nome}
      onClose={fechar}
      onSubmit={submit}
      submitLabel="Salvar"
      loading={saving}>
      <CustomInput
        label="Anotação"
        value={texto}
        onChangeText={alterarTexto}
        error={erro}
        placeholder="Ex: Troca de óleo feita, filtro de ar sujo..."
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        style={{ minHeight: 96 }}
        autoFocus
      />
    </FormModal>
  );
}
