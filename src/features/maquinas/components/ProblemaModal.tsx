import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CheckboxField, ChipSelector, CustomInput, FormModal, SwitchField, type ChipOption } from '@/components/forms';
import { Spacing } from '@/constants/theme';
import { CATEGORIAS_PROBLEMA, useConsultaAoVivo } from '@/database';
import type { CategoriaProblema, Maquina } from '@/dtos';
import { guardarFoto } from '@/services/fotos';
import {
  listarColaboradores,
  podeAtribuirTarefas,
  TABELAS_MEMBROS,
  useUsuarioAtual,
  type Usuario,
} from '@/services/usuario';
import { CATEGORIA_PROBLEMA_LABEL } from '../constants';
import { registrarProblema } from '../data/ocorrencias';
import { posicaoRapida } from '../rastro/localizacao';
import { CampoFoto } from './CampoFoto';
import { avisarFalha } from './conferencia';

type DaParaUsar = 'sim' | 'nao';

const OPCOES_CATEGORIA = CATEGORIAS_PROBLEMA.map((c) => ({ label: CATEGORIA_PROBLEMA_LABEL[c], value: c }));

export interface ProblemaModalProps {
  maquina: Maquina;
  usoId: string | null;
  onClose: () => void;
}

/**
 * Problema na máquina: categoria, se dá para continuar usando, foto e descrição.
 * "Não" deixa a máquina parada por problema (o QR avisa antes de ligar). O
 * problema também vira uma tarefa em Tarefas (urgente e responsável como no relato).
 */
export function ProblemaModal({ maquina, usoId, onClose }: ProblemaModalProps) {
  const eu = useUsuarioAtual();
  const ehAdmin = podeAtribuirTarefas(eu);
  const { dados: colaboradores } = useConsultaAoVivo<Usuario[]>(listarColaboradores, TABELAS_MEMBROS, eu.id, [eu]);
  const temEquipe = colaboradores.length > 1;

  const [categoria, setCategoria] = useState<CategoriaProblema>('motor');
  const [daParaUsar, setDaParaUsar] = useState<DaParaUsar>('sim');
  const [descricao, setDescricao] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  /** Escolha da pessoa; enquanto for null, é urgente quando a máquina parou */
  const [urgenteManual, setUrgenteManual] = useState<boolean | null>(null);
  // Nasce sem responsável: o admin escolhe alguém ou a própria pessoa assume
  const [responsavelId, setResponsavelId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const urgente = urgenteManual ?? daParaUsar === 'nao';

  const opcoesResponsavel = useMemo<ChipOption<string>[]>(
    () => [
      { label: 'Sem responsável', value: 'nenhum' },
      ...colaboradores.map((c) => ({ label: c.id === eu.id ? `${c.nome} (você)` : c.nome, value: c.id })),
    ],
    [colaboradores, eu.id]
  );

  const salvar = async () => {
    setSalvando(true);
    try {
      // Uma cópia para a máquina e outra para a tarefa: cada uma sobe e é apagada à parte
      const [fotoUri, fotoTarefaUri] = await Promise.all([guardarFoto(foto), guardarFoto(foto)]);
      await registrarProblema({
        maquinaId: maquina.id,
        usoId,
        categoria,
        podeUsar: daParaUsar === 'sim',
        descricao,
        fotoUri,
        fotoTarefaUri,
        posicao: await posicaoRapida(),
        urgente,
        responsavelId,
        operador: eu,
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
        <ChipSelector label="O que aconteceu" value={categoria} onChange={setCategoria} options={OPCOES_CATEGORIA} />
        <ChipSelector
          label="Dá para continuar usando?"
          value={daParaUsar}
          onChange={setDaParaUsar}
          options={[
            { label: 'Sim, com atenção', value: 'sim' },
            { label: 'Não, parou', value: 'nao' },
          ]}
        />
        <SwitchField
          label="Urgente"
          helperText="Destaca no topo da lista de tarefas e em vermelho no mapa"
          value={urgente}
          onChange={setUrgenteManual}
        />
        {ehAdmin && temEquipe ? (
          <ChipSelector
            label="Responsável pelo conserto (opcional)"
            options={opcoesResponsavel}
            value={responsavelId ?? 'nenhum'}
            onChange={(valor) => setResponsavelId(valor === 'nenhum' ? null : valor)}
          />
        ) : (
          <CheckboxField
            label="Atribuir a mim mesmo"
            helperText="Sem isso, a tarefa do conserto fica livre para alguém pegar"
            value={responsavelId === eu.id}
            onChange={(assumir) => setResponsavelId(assumir ? eu.id : null)}
          />
        )}
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
