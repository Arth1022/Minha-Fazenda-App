import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, SectionHeader } from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { UsoDoDia } from '@/dtos';
import { formatNumero } from '@/utils/formatters';
import { formatarDuracao } from '../services/uso';

/** Rótulo pelo índice de Date.getDay() (0 = domingo) */
const DIA_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ALTURA_GRAFICO = 96;
/** Barra mínima visível para o dia que teve algum uso */
const ALTURA_MINIMA = 4;

export interface UsoSemanalCardProps {
  dias: UsoDoDia[];
  totalMs: number;
  /** KM na semana (só usos com GPS) */
  km?: number | null;
  /** Hectares estimados na semana (com implemento) */
  ha?: number | null;
}

/**
 * Histórico de uso semanal: uma barra por dia dos últimos 7 dias (hoje à direita)
 * e o total da semana. Feito com Views, sem biblioteca de gráfico.
 */
export function UsoSemanalCard({ dias, totalMs, km = null, ha = null }: UsoSemanalCardProps) {
  const maior = Math.max(...dias.map((d) => d.duracaoMs), 1);
  const ultimo = dias.length - 1;

  return (
    <View style={styles.secao}>
      <SectionHeader
        title="Uso na semana"
        rightElement={
          <Text style={styles.total}>
            {[
              formatarDuracao(totalMs),
              km !== null ? `${formatNumero(km, 1)} km` : null,
              ha !== null ? `${formatNumero(ha, 1)} ha` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        }
      />
      <Card padding="three">
        <View
          style={styles.grafico}
          accessible
          accessibilityLabel={`Uso nos últimos 7 dias: ${formatarDuracao(totalMs)}`}>
          {dias.map((d, i) => {
            const altura =
              d.duracaoMs === 0 ? 0 : Math.max(ALTURA_MINIMA, (d.duracaoMs / maior) * ALTURA_GRAFICO);
            return (
              <View key={d.dia.getTime()} style={styles.coluna}>
                <Text style={styles.valor}>{formatarDuracao(d.duracaoMs, { curto: true })}</Text>
                <View style={styles.trilho}>
                  <View
                    style={[styles.barra, i === ultimo && styles.barraHoje, { height: altura }]}
                  />
                </View>
                <Text style={[styles.dia, i === ultimo && styles.diaHoje]}>
                  {i === ultimo ? 'Hoje' : DIA_DA_SEMANA[d.dia.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    gap: Spacing.md,
  },
  total: {
    ...Typography.captionBold,
    color: AgroColors.primary,
  },
  grafico: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  coluna: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  valor: {
    ...Typography.micro,
    minHeight: 14,
  },
  trilho: {
    width: '100%',
    height: ALTURA_GRAFICO,
    justifyContent: 'flex-end',
    backgroundColor: AgroColors.subtleBg,
    borderRadius: Radius.xs,
    overflow: 'hidden',
  },
  barra: {
    width: '100%',
    backgroundColor: AgroColors.mintBorder,
    borderRadius: Radius.xs,
  },
  barraHoje: {
    backgroundColor: AgroColors.primaryLight,
  },
  dia: {
    ...Typography.micro,
  },
  diaHoje: {
    color: AgroColors.primary,
    fontWeight: '700',
  },
});
