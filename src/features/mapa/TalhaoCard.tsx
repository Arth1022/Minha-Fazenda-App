import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AgroColors, Spacing } from '@/constants/theme';
import Talhao from '@/entities/Talhao';
import { formatHectares } from '@/utils/formatters';

export interface TalhaoCardProps {
  talhao: Talhao;
  showDivider?: boolean;
}

/**
 * Linha de item de talhão alinhada ao card de áreas da Tela 1 do Figma
 * (ex.: ● Pasto 1 ........ 15.2 Ha).
 */
export function TalhaoCard({ talhao, showDivider = false }: TalhaoCardProps) {
  const isLavoura = talhao.tipo === 'lavoura';
  const dotColor = isLavoura ? AgroColors.wheatGold : AgroColors.primaryLight;

  return (
    <View style={[styles.row, showDivider && styles.rowDivider]}>
      <View style={styles.leftGroup}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.nameText}>{talhao.nome}</Text>
      </View>
      <Text style={styles.areaText}>{formatHectares(talhao.areaHa)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: AgroColors.divider,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nameText: {
    fontSize: 13,
    fontWeight: '500',
    color: AgroColors.textSecondary,
  },
  areaText: {
    fontSize: 13,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
});
