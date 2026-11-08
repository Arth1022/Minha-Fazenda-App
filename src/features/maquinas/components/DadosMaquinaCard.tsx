import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, SectionHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { FichaMaquina } from '@/dtos';
import { formatDataBR } from '@/utils/date';
import { formatMedida } from '@/utils/formatters';
import { COMBUSTIVEL_LABEL } from '../constants';
import { formatarDuracao } from '../services/uso';
import { LinhaDado } from './LinhaDado';

export interface DadosMaquinaCardProps {
  ficha: FichaMaquina;
}

/** Dados de cadastro da máquina; só mostra o que foi informado. */
export function DadosMaquinaCard({ ficha }: DadosMaquinaCardProps) {
  const { maquina, horimetroAtual, totalRegistradoMs } = ficha;

  return (
    <View style={styles.secao}>
      <SectionHeader title="Dados da máquina" />
      <Card padding="three">
        <View style={styles.lista}>
          <LinhaDado label="Marca">{maquina.marca ?? '—'}</LinhaDado>
          <LinhaDado label="Modelo">{maquina.modelo ?? '—'}</LinhaDado>
          {maquina.anoFabricacao !== null ? (
            <LinhaDado label="Ano">{maquina.anoFabricacao}</LinhaDado>
          ) : null}
          {maquina.potenciaCv !== null ? (
            <LinhaDado label="Potência">{formatMedida(maquina.potenciaCv, 'cv', 0)}</LinhaDado>
          ) : null}
          {maquina.combustivel ? (
            <LinhaDado label="Combustível">{COMBUSTIVEL_LABEL[maquina.combustivel]}</LinhaDado>
          ) : null}
          {maquina.numeroSerie ? (
            <LinhaDado label="Nº de série">{maquina.numeroSerie}</LinhaDado>
          ) : null}
          {maquina.placa ? <LinhaDado label="Placa">{maquina.placa}</LinhaDado> : null}
          {maquina.dataAquisicao ? (
            <LinhaDado label="Aquisição">{formatDataBR(maquina.dataAquisicao)}</LinhaDado>
          ) : null}
          {maquina.tanqueLitros !== null ? (
            <LinhaDado label="Tanque">{formatMedida(maquina.tanqueLitros, 'L', 0)}</LinhaDado>
          ) : null}
          {maquina.larguraTrabalhoM !== null ? (
            <LinhaDado label="Largura de trabalho">{formatMedida(maquina.larguraTrabalhoM, 'm')}</LinhaDado>
          ) : null}
          {maquina.categoria === 'motorizada' && !maquina.possuiHorimetro ? (
            <LinhaDado label="Horímetro">Sem horímetro (usa as horas do app)</LinhaDado>
          ) : null}
          {horimetroAtual !== null ? (
            <LinhaDado label="Horímetro (estimado)">{formatMedida(horimetroAtual, 'h')}</LinhaDado>
          ) : null}
          <LinhaDado label="Uso registrado no app">{formatarDuracao(totalRegistradoMs)}</LinhaDado>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    gap: Spacing.md,
  },
  lista: {
    gap: Spacing.md,
  },
});
