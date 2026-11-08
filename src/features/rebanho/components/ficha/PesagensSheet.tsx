import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button } from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { HistoricoDePeso } from '@/dtos';
import { formatDataBR } from '@/utils/date';
import { formatDecimal, formatMedida } from '@/utils/formatters';
import { textoDaVariacao } from '../../services/ficha';

export interface PesagensSheetProps {
  visible: boolean;
  historico: HistoricoDePeso;
  onClose: () => void;
  onRegistrar: () => void;
}

/** Histórico de pesagens com as métricas do período (ganho total e GMD). */
export function PesagensSheet({ visible, historico, onClose, onRegistrar }: PesagensSheetProps) {
  const { linhas, ganhoTotalKg, periodoDias, gmdKg } = historico;
  const atual = linhas[0]?.pesagem ?? null;

  return (
    <BottomSheet
      visible={visible}
      title="Pesagens"
      subtitle={linhas.length === 1 ? '1 pesagem registrada' : `${linhas.length} pesagens registradas`}
      onClose={onClose}>
      <View style={styles.metricas}>
        <Metrica rotulo="Peso atual" valor={atual ? formatMedida(atual.pesoKg, 'kg', 0) : '—'} />
        <Metrica
          rotulo="Ganho total"
          valor={
            ganhoTotalKg !== null && periodoDias !== null
              ? `${ganhoTotalKg > 0 ? '+' : ''}${formatDecimal(ganhoTotalKg)} kg`
              : '—'
          }
          detalhe={periodoDias !== null ? `em ${periodoDias} dias` : undefined}
        />
        <Metrica
          rotulo="GMD"
          valor={gmdKg !== null ? `${formatDecimal(gmdKg, 2)}` : '—'}
          detalhe="kg por dia"
        />
      </View>

      {linhas.map(({ pesagem, variacaoKg, dias }) => (
        <View key={pesagem.id} style={styles.linha}>
          <View style={styles.linhaTextos}>
            <Text style={styles.peso}>{formatMedida(pesagem.pesoKg, 'kg', 1)}</Text>
            <Text style={styles.data}>{formatDataBR(pesagem.data)}</Text>
          </View>
          <Text
            style={[
              styles.variacao,
              variacaoKg !== null && variacaoKg < 0 && styles.variacaoNegativa,
              variacaoKg === null && styles.variacaoNeutra,
            ]}>
            {variacaoKg !== null && dias !== null ? textoDaVariacao(variacaoKg, dias) : 'Primeira pesagem'}
          </Text>
        </View>
      ))}

      <Button label="Registrar peso" fullWidth onPress={onRegistrar} />
    </BottomSheet>
  );
}

function Metrica({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <View style={styles.metrica}>
      <Text style={styles.metricaRotulo}>{rotulo}</Text>
      <Text style={styles.metricaValor}>{valor}</Text>
      {detalhe ? <Text style={styles.metricaDetalhe}>{detalhe}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  metricas: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metrica: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: AgroColors.mintSurface,
    gap: Spacing.half,
  },
  metricaRotulo: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
  metricaValor: {
    ...Typography.metricValue,
    fontSize: 18,
    lineHeight: 24,
  },
  metricaDetalhe: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: AgroColors.subtleBg,
  },
  linhaTextos: {
    gap: Spacing.half,
  },
  peso: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
  data: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
  variacao: {
    ...Typography.captionBold,
    color: AgroColors.primary,
    flexShrink: 1,
    textAlign: 'right',
  },
  variacaoNegativa: {
    color: AgroColors.danger,
  },
  variacaoNeutra: {
    color: AgroColors.textMuted,
  },
});
