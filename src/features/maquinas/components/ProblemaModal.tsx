import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChipSelector, CustomInput, FormModal } from '@/components/forms';
import { Spacing } from '@/constants/theme';
import { CATEGORIAS_PROBLEMA } from '@/database';
import type { CategoriaProblema, Maquina } from '@/dtos';
import { guardarFoto } from '@/services/fotos';
import { CATEGORIA_PROBLEMA_LABEL } from '../constants';
import { registrarProblema } from '../data/ocorrencias';
import { posicaoRapida } from '../rastro/localizacao';
import { CampoFoto } from './CampoFoto';
import { avisarFalha } from './conferencia';

type DaParaUsar = 'sim' | 'nao';

export interface ProblemaModalProps {
  maquina: Maquina;
  usoId: string | null;
  onClose: () => void;
}

/**
 * Problema na máquina: categoria, se dá para continuar usando, foto e descrição.
 * "Não" deixa a máquina parada por problema (o QR avisa antes de ligar).
 */
export function ProblemaModal({ maquina, usoId, onClose }: ProblemaModalProps) {
  const [categoria, setCategoria] = useState<CategoriaProblema>('motor');
  const [daParaUsar, setDaParaUsar] = useState<DaParaUsar>('sim');
  const [descricao, setDescricao] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    try {
      await registrarProblema({
        maquinaId: maquina.id,
        usoId,
        categoria,
        podeUsar: daParaUsar === 'sim',
        descricao,
        fotoUri: await guardarFoto(foto),
        posicao: await posicaoRapida(),
      });
      onClose();
    } catch (erro) {
      avisarFalha(erro);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <FormModal
      visible
      title="Problema"
      subtitle={maquina.nome}
      onClose={onClose}
      onSubmit={salvar}
      submitLabel="Registrar"
      loading={salvando}>
      <View style={styles.conteudo}>
        <ChipSelector
          label="O que aconteceu"
          value={categoria}
          onChange={setCategoria}
          options={CATEGORIAS_PROBLEMA.map((c) => ({ label: CATEGORIA_PROBLEMA_LABEL[c], value: c }))}
        />
        <ChipSelector
          label="Dá para continuar usando?"
          value={daParaUsar}
          onChange={setDaParaUsar}
          options={[
            { label: 'Sim, com atenção', value: 'sim' },
            { label: 'Não, parou', value: 'nao' },
          ]}
        />
        <CampoFoto label="Foto (opcional)" uri={foto} onChange={setFoto} />
        <CustomInput
          label="Descrição (opcional)"
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Ex: vazando óleo na mangueira do hidráulico"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={styles.texto}
        />
      </View>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    gap: Spacing.lg,
  },
  texto: {
    minHeight: 80,
  },
});
