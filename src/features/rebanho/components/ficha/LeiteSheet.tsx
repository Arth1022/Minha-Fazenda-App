import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button } from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { HistoricoDeLeite } from '@/dtos';
import { formatDataBR } from '@/utils/date';
import { formatDecimal, formatMedida } from '@/utils/formatters';
import { textoDaVariacao } from '../../services/ficha';

export interface LeiteSheetProps {
  visible: boolean;
  historico: HistoricoDeLeite;
  onClose: () => void;
  onRegistrar: () => void;
}

/** Histórico dos registros de leite (controle leiteiro): último, média de 30 dias e variação. */
export function LeiteSheet({ visible, historico, onClose, onRegistrar }: LeiteSheetProps) {
  const { linhas, ultimoLitros, media30Dias } = historico;
  const ultima = linhas[0] ?? null;
  const variacao = ultima !== null && ultima.variacaoL !== null ? ultima.variacaoL : null;

  return (
    <BottomSheet
      visible={visible}
      title="Produção de leite"
      subtitle={linhas.length === 1 ? '1 registro' : `${linhas.length} registros`}
      onClose={onClose}>
      <View style={styles.metricas}>
        <Metrica
          rotulo="Último"
          valor={ultimoLitros !== null ? formatMedida(ultimoLitros, 'L') : '—'}
          detalhe={ultima ? formatDataBR(ultima.controle.data) : undefined}
        />
        <Metrica
          rotulo="Média"
          valor={media30Dias !== null ? formatMedida(media30Dias, 'L') : '—'}
          detalhe="últimos 30 dias"
        />
        <Metrica
          rotulo="Variação"
          valor={variacao !== null ? `${variacao > 0 ? '+' : ''}${formatDecimal(variacao)} L` : '—'}
          detalhe={variacao !== null ? 'desde o anterior' : undefined}
        />
      </View>

      {linhas.map(({ controle, variacaoL, dias }) => (
        <View key={controle.id} style={styles.linha}>
          <View style={styles.linhaTextos}>
            <Text style={styles.litros}>{formatMedida(controle.litros, 'L')}</Text>
            <Text style={styles.data}>{formatDataBR(controle.data)}</Text>
          </View>
          <Text
            style={[
              styles.variacao,
              variacaoL !== null && variacaoL < 0 && styles.variacaoNegativa,
              variacaoL === null && styles.variacaoNeutra,
            ]}>
            {variacaoL !== null && dias !== null ? textoDaVariacao(variacaoL, dias, 'L') : 'Primeiro registro'}
          </Text>
        </View>
      ))}

      <Button label="Registrar leite" fullWidth onPress={onRegistrar} />
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
  litros: {
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
