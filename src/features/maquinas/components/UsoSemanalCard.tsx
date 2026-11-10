import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FichaCard } from '@/components/ui';
import { AgroColors, Radius, Spacing, Typography } from '@/constants/theme';
import type { UsoDoDia } from '@/dtos';
import { formatNumero } from '@/utils/formatters';
import { formatarDuracao } from '../services/uso';

/** Rótulo pelo índice de Date.getDay() (0 = domingo) */
const DIA_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
/** Altura da barra do dia de maior uso */
const ALTURA_MAXIMA = 56;
/** Altura da pílula cinza do dia sem uso (e mínima do dia com uso) */
const ALTURA_MINIMA = 6;
const UMA_HORA_MS = 60 * 60 * 1000;

/** Texto acima da barra: "<1 min", "45 min" ou, de 1 hora para cima, "2,5h" (cabe na coluna). */
function rotuloDoDia(ms: number): string {
  if (ms === 0) return '';
  return ms < UMA_HORA_MS ? formatarDuracao(ms) : formatarDuracao(ms, { curto: true });
}

export interface UsoSemanalCardProps {
  dias: UsoDoDia[];
  totalMs: number;
  /** KM na semana (só usos com GPS) */
  km?: number | null;
  /** Hectares estimados na semana (com implemento) */
  ha?: number | null;
}

/**
 * Uso na semana: uma pílula por dia dos últimos 7 dias (hoje à direita), verde
 * e mais alta conforme o tempo de uso, e o total no canto. Feito com Views.
 */
export function UsoSemanalCard({ dias, totalMs, km = null, ha = null }: UsoSemanalCardProps) {
  const maior = Math.max(...dias.map((d) => d.duracaoMs), 1);
  const ultimo = dias.length - 1;
  const total = [
    formatarDuracao(totalMs),
    km !== null ? `${formatNumero(km, 1)} km` : null,
    ha !== null ? `${formatNumero(ha, 1)} ha` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <FichaCard>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Uso na semana</Text>
        <Text style={styles.totalRotulo}>
          Total <Text style={styles.totalValor}>{total}</Text>
        </Text>
      </View>

      <View
        style={styles.grafico}
        accessible
        accessibilityLabel={`Uso nos últimos 7 dias: ${formatarDuracao(totalMs)}`}>
        {dias.map((d, i) => {
          const usado = d.duracaoMs > 0;
          const altura = usado
            ? Math.max(ALTURA_MINIMA, (d.duracaoMs / maior) * ALTURA_MAXIMA)
            : ALTURA_MINIMA;
          const hoje = i === ultimo;
          return (
            <View key={d.dia.getTime()} style={styles.coluna}>
              <Text style={styles.valor} numberOfLines={1}>
                {rotuloDoDia(d.duracaoMs)}
              </Text>
              <View style={[styles.barra, usado && styles.barraUsada, { height: altura }]} />
              <Text style={[styles.dia, hoje && styles.diaHoje]}>
                {hoje ? 'Hoje' : DIA_DA_SEMANA[d.dia.getDay()]}
              </Text>
            </View>
          );
        })}
      </View>
    </FichaCard>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  titulo: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  totalRotulo: {
    ...Typography.bodyMedium,
    flexShrink: 1,
    textAlign: 'right',
  },
  totalValor: {
    fontWeight: '800',
    color: AgroColors.textPrimary,
  },
  grafico: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    paddingTop: Spacing.lg,
  },
  coluna: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  valor: {
    ...Typography.micro,
    color: AgroColors.textSecondary,
    fontWeight: '700',
    minHeight: 14,
  },
  barra: {
    width: '58%',
    borderRadius: Radius.full,
    backgroundColor: AgroColors.border,
  },
  barraUsada: {
    backgroundColor: AgroColors.forest,
  },
  dia: {
    ...Typography.bodyMedium,
    marginTop: Spacing.xs,
  },
  diaHoje: {
    fontWeight: '800',
    color: AgroColors.textPrimary,
  },
});
