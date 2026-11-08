import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ChipSelector, FormModal } from '@/components/forms';
import { InfoBanner } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { ATIVIDADES_USO, useLiveQuery } from '@/database';
import type { AtividadeUso, Maquina, UsoMaquina } from '@/dtos';
import { ATIVIDADE_LABEL } from '../constants';
import { listarImplementos } from '../data/maquinas';
import { usosRecentes } from '../data/usos';
import type { EscolhasAoLigar } from '../hooks/useOperacaoMaquina';
import { sugestoesAoLigar, type CondicaoMaquina } from '../services/registros';
import { horaCurta } from '../services/uso';

const SEM_IMPLEMENTO = 'nenhum';

export interface LigarMaquinaModalProps {
  maquina: Maquina;
  condicao: CondicaoMaquina;
  /** Uso aberto por outra pessoa: o botão vira "Assumir" */
  usoDeOutraPessoa: UsoMaquina | null;
  ocupado: boolean;
  onLigar: (escolhas: EscolhasAoLigar) => void;
  onClose: () => void;
}

/**
 * Antes de ligar: implemento e atividade já vêm com os do último uso; um toque
 * em Ligar resolve. Avisa se há problema em aberto que impede o uso.
 */
export function LigarMaquinaModal(props: LigarMaquinaModalProps) {
  const { maquina, onClose } = props;
  const implementos = useLiveQuery(listarImplementos());
  const recentes = useLiveQuery(usosRecentes(maquina.id, 1), [maquina.id]);
  const carregou = implementos.updatedAt !== undefined && recentes.updatedAt !== undefined;

  if (!carregou) {
    return (
      <FormModal visible title={`Ligar ${maquina.nome}`} onClose={onClose}>
        <ActivityIndicator color={AgroColors.primary} />
      </FormModal>
    );
  }
  return <Formulario {...props} implementos={implementos.data} ultimoUso={recentes.data} />;
}

interface FormularioProps extends LigarMaquinaModalProps {
  implementos: Maquina[];
  ultimoUso: UsoMaquina[];
}

/** Montado com os dados prontos: a sugestão do último uso é o estado inicial. */
function Formulario({
  maquina,
  condicao,
  usoDeOutraPessoa,
  ocupado,
  onLigar,
  onClose,
  implementos,
  ultimoUso,
}: FormularioProps) {
  const [sugestao] = useState(() => sugestoesAoLigar(ultimoUso));
  const [implementoId, setImplementoId] = useState<string>(() =>
    sugestao.implementoId && implementos.some((i) => i.id === sugestao.implementoId)
      ? sugestao.implementoId
      : SEM_IMPLEMENTO
  );
  const [atividade, setAtividade] = useState<AtividadeUso>(sugestao.atividade ?? 'outro');

  const ligar = () =>
    onLigar({
      implementoId: implementoId === SEM_IMPLEMENTO ? null : implementoId,
      atividade,
      assumir: usoDeOutraPessoa !== null,
    });

  const rotulo = usoDeOutraPessoa
    ? 'Assumir e ligar'
    : condicao === 'paradaPorProblema'
      ? 'Ligar mesmo assim'
      : 'Ligar';

  return (
    <FormModal
      visible
      title={`Ligar ${maquina.nome}`}
      subtitle="Confira o implemento e a atividade"
      onClose={onClose}
      onSubmit={ligar}
      submitLabel={rotulo}
      loading={ocupado}>
      <View style={styles.conteudo}>
        {usoDeOutraPessoa ? (
          <InfoBanner
            variant="info"
            message={`Em uso por ${usoDeOutraPessoa.operador ?? 'outra pessoa'} desde ${horaCurta(usoDeOutraPessoa.inicio)}. Assumir encerra o uso dela agora.`}
          />
        ) : null}
        {condicao === 'paradaPorProblema' ? (
          <InfoBanner message="Há um problema em aberto que impede o uso. Se ligar mesmo assim, fica registrado." />
        ) : null}

        {implementos.length > 0 ? (
          <ChipSelector
            label="Implemento"
            value={implementoId}
            onChange={setImplementoId}
            options={[
              { label: 'Nenhum', value: SEM_IMPLEMENTO },
              ...implementos.map((i) => ({ label: i.nome, value: i.id })),
            ]}
          />
        ) : (
          <Text style={styles.dica}>
            Cadastre plantadeira, grade ou carreta como implemento para ver a área trabalhada.
          </Text>
        )}

        <ChipSelector
          label="Atividade"
          value={atividade}
          onChange={setAtividade}
          options={ATIVIDADES_USO.map((a) => ({ label: ATIVIDADE_LABEL[a], value: a }))}
        />
        <Text style={styles.dica}>O talhão vem do GPS, sem precisar escolher.</Text>
      </View>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    gap: Spacing.lg,
  },
  dica: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
});
