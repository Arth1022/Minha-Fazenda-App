import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { AgroColors, Spacing } from '@/constants/theme';
import Talhao from '@/entities/Talhao';
import { formatHectares } from '@/utils/formatters';

interface TalhaoCardProps {
  talhao: Talhao;
}

export function TalhaoCard({ talhao }: TalhaoCardProps) {
  const isLavoura = talhao.tipo === 'lavoura';
  const displayTipo =
    talhao.tipo === 'pastagem'
      ? 'Pastagem'
      : talhao.tipo === 'lavoura'
      ? 'Lavoura'
      : talhao.tipo === 'reserva'
      ? 'Reserva'
      : talhao.tipo === 'outro'
      ? 'Outro'
      : 'Área Rural';

  return (
    <View style={styles.talhaoRow}>
      <View style={styles.talhaoLeft}>
        <View
          style={[
            styles.colorIndicator,
            {
              backgroundColor: isLavoura
                ? AgroColors.wheatGold
                : AgroColors.primaryLight,
            },
          ]}
        />
        <View>
          <ThemedText style={styles.talhaoName}>{talhao.nome}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {displayTipo} • {talhao.possuiCerca ? 'Com cerca' : 'Sem cerca'}
          </ThemedText>
        </View>
      </View>
      <ThemedText style={styles.talhaoArea}>
        {formatHectares(talhao.areaHa)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  talhaoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  talhaoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  colorIndicator: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  talhaoName: {
    fontWeight: '700',
    fontSize: 16,
  },
  talhaoArea: {
    fontWeight: '800',
    fontSize: 17,
  },
});
