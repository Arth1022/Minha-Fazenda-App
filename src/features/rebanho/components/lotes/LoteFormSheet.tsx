import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { CustomInput, FormModal } from '@/components/forms';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { Lote } from '@/database';
import { atualizarLote, criarLote } from '@/services/loteService';

export interface LoteFormSheetProps {
  /** Com `lote`, edita; sem, cria um novo */
  lote?: Pick<Lote, 'id' | 'nome' | 'descricao'> | null;
  onSalvo: (lote: Pick<Lote, 'id' | 'nome'>) => void;
  /** Só na edição: pede para excluir (quem chama confirma) */
  onExcluir?: () => void;
  onClose: () => void;
}

/** Novo lote ou editar lote: só o nome (obrigatório) e para que serve. Monte só quando abrir. */
export function LoteFormSheet({ lote = null, onSalvo, onExcluir, onClose }: LoteFormSheetProps) {
  const editando = lote !== null;
  const [nome, setNome] = useState(lote?.nome ?? '');
  const [descricao, setDescricao] = useState(lote?.descricao ?? '');
  const [erro, setErro] = useState<string | undefined>();
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    setErro(undefined);
    try {
      if (lote) {
        await atualizarLote(lote.id, { nome, descricao });
        onSalvo({ id: lote.id, nome: nome.trim() });
      } else {
        const criado = await criarLote({ nome, descricao });
        onSalvo(criado);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o lote.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <FormModal
      visible
      title={editando ? 'Editar lote' : 'Novo lote'}
      subtitle={editando ? lote.nome : 'Agrupe animais para mover vários de uma vez'}
      onClose={onClose}
      onSubmit={salvar}
      submitLabel={editando ? 'Salvar' : 'Criar lote'}
      loading={salvando}>
      <CustomInput
        label="Nome do lote"
        required
        value={nome}
        onChangeText={(texto) => {
          setNome(texto);
          if (erro) setErro(undefined);
        }}
        placeholder="Ex.: Novilhas"
        error={erro}
        autoFocus={!editando}
      />
      <CustomInput
        label="Para que serve (opcional)"
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Ex.: novilhas para a próxima estação de monta"
        multiline
      />
      {editando && onExcluir ? (
        <Pressable onPress={onExcluir} hitSlop={8} accessibilityRole="button" style={estilos.excluir}>
          <Text style={estilos.excluirTexto}>Excluir lote</Text>
        </Pressable>
      ) : null}
    </FormModal>
  );
}

const estilos = StyleSheet.create({
  excluir: { alignSelf: 'flex-start', paddingVertical: Spacing.xs },
  excluirTexto: { ...Typography.bodyBold, color: AgroColors.danger },
});
