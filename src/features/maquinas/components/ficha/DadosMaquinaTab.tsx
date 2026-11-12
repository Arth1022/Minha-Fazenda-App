import React, { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, FichaCard } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { AnotacaoMaquina, FichaMaquina } from '@/dtos';
import { formatDataBR } from '@/utils/date';
import { formatMedida } from '@/utils/formatters';
import { COMBUSTIVEL_LABEL } from '../../constants';
import { formatarDuracao } from '../../services/uso';

/** "+ Adicionar" verde (campo vazio, nova anotação). */
function LinkAdicionar({ onPress, rotulo }: { onPress: () => void; rotulo: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.adicionar, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={rotulo}>
      <AppIcon name="plus" size={18} color={AgroColors.forest} />
      <Text style={styles.adicionarTexto}>Adicionar</Text>
    </Pressable>
  );
}

interface Dado {
  label: string;
  /** null: campo vazio, mostra "+ Adicionar" (abre a edição) */
  valor: string | null;
}

/** Linhas do cadastro: marca e modelo sempre (para completar); o resto só se informado. */
function dadosDa({ maquina, horimetroAtual, totalRegistradoMs }: FichaMaquina): Dado[] {
  const opcionais: (Dado | false)[] = [
    maquina.anoFabricacao !== null && { label: 'Ano', valor: String(maquina.anoFabricacao) },
    maquina.potenciaCv !== null && { label: 'Potência', valor: formatMedida(maquina.potenciaCv, 'cv', 0) },
    !!maquina.combustivel && { label: 'Combustível', valor: COMBUSTIVEL_LABEL[maquina.combustivel] },
    !!maquina.numeroSerie && { label: 'Nº de série', valor: maquina.numeroSerie },
    !!maquina.placa && { label: 'Placa', valor: maquina.placa },
    !!maquina.dataAquisicao && { label: 'Aquisição', valor: formatDataBR(maquina.dataAquisicao) },
    maquina.tanqueLitros !== null && { label: 'Tanque', valor: formatMedida(maquina.tanqueLitros, 'L', 0) },
    maquina.larguraTrabalhoM !== null && {
      label: 'Largura de trabalho',
      valor: formatMedida(maquina.larguraTrabalhoM, 'm'),
    },
    maquina.categoria === 'motorizada' &&
      !maquina.possuiHorimetro && { label: 'Horímetro', valor: 'Usa as horas do app' },
    horimetroAtual !== null && { label: 'Horímetro (estimado)', valor: formatMedida(horimetroAtual, 'h') },
  ];
  return [
    { label: 'Marca', valor: maquina.marca },
    { label: 'Modelo', valor: maquina.modelo },
    ...opcionais.filter((d): d is Dado => d !== false),
    { label: 'Uso registrado no app', valor: formatarDuracao(totalRegistradoMs) },
  ];
}

export interface DadosMaquinaTabProps {
  ficha: FichaMaquina;
  anotacoes: AnotacaoMaquina[];
  /** Completar um campo vazio do cadastro (abre a edição) */
  onEditar: () => void;
  onAdicionarAnotacao: () => void;
}

/** Aba Dados da Ficha da máquina: o cadastro e as anotações livres. */
export function DadosMaquinaTab({ ficha, anotacoes, onEditar, onAdicionarAnotacao }: DadosMaquinaTabProps) {
  const dados = dadosDa(ficha);

  return (
    <>
      <FichaCard style={styles.cardLista}>
        <Text style={[styles.cardTitulo, styles.tituloLista]}>Dados da máquina</Text>
        {dados.map((dado, index) => (
          <Fragment key={dado.label}>
            {index > 0 ? <View style={styles.divisor} /> : null}
            <View style={styles.linha}>
              <Text style={styles.rotulo}>{dado.label}</Text>
              {dado.valor !== null ? (
                <Text style={styles.valor} numberOfLines={1}>
                  {dado.valor}
                </Text>
              ) : (
                <LinkAdicionar onPress={onEditar} rotulo={`Adicionar ${dado.label.toLowerCase()}`} />
              )}
            </View>
          </Fragment>
        ))}
      </FichaCard>

      <FichaCard>
        <View style={styles.cabecalho}>
          <Text style={styles.cardTitulo}>Anotações</Text>
          <LinkAdicionar onPress={onAdicionarAnotacao} rotulo="Adicionar anotação" />
        </View>
        {anotacoes.length === 0 ? (
          <Text style={styles.vazio}>
            Nenhuma anotação ainda. Use para lembrar de peças, revisões ou cuidados com a máquina.
          </Text>
        ) : (
          anotacoes.map((anotacao, index) => (
            <Fragment key={anotacao.id}>
              {index > 0 ? <View style={styles.divisor} /> : null}
              <View style={styles.anotacao}>
                <Text style={styles.anotacaoData}>{anotacao.createdAt ? formatDataBR(anotacao.createdAt) : ''}</Text>
                <Text style={styles.anotacaoTexto}>{anotacao.texto}</Text>
              </View>
            </Fragment>
          ))
        )}
      </FichaCard>
    </>
  );
}

const styles = StyleSheet.create({
  // As linhas cuidam do próprio espaço (divisor entre elas)
  cardLista: {
    gap: 0,
    paddingBottom: Spacing.sm,
  },
  tituloLista: {
    marginBottom: Spacing.sm,
  },
  cardTitulo: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.three,
  },
  divisor: {
    height: 1,
    backgroundColor: AgroColors.border,
  },
  rotulo: {
    ...Typography.body,
    fontSize: 15,
    color: AgroColors.textSecondary,
  },
  valor: {
    ...Typography.bodyBold,
    fontSize: 15,
    flexShrink: 1,
    textAlign: 'right',
  },
  adicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  adicionarTexto: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: AgroColors.forest,
  },
  pressed: {
    opacity: 0.6,
  },
  vazio: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: AgroColors.textSecondary,
  },
  anotacao: {
    gap: Spacing.half,
    paddingVertical: Spacing.xs,
  },
  anotacaoData: {
    ...Typography.micro,
  },
  anotacaoTexto: {
    ...Typography.body,
  },
});
