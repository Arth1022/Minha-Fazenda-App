import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { AgroColors, Radius, Spacing } from '@/constants/theme';
import Maquina from '@/entities/Maquina';

export interface MaquinaCardProps {
  maquina: Maquina;
  onPress?: () => void;
}

/**
 * Cartão de máquina/equipamento agrícola alinhado à Tela 5 do Figma
 * ("Trator JD - Status: 100% - Manutenção em dia" / "Caminhão - Status: 65% - Manutenção devida").
 */
export function MaquinaCard({ maquina, onPress }: MaquinaCardProps) {
  const isTruck =
    maquina.nome.toLowerCase().includes('caminhão') ||
    maquina.nome.toLowerCase().includes('caminhao');
  const statusPct = maquina.statusPercentual ?? 100;
  const needsMaintenance = Boolean(maquina.manutencaoDevida) || statusPct < 80;

  return (
    <Card padding="md" onPress={onPress}>
      <View style={styles.row}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: isTruck
                ? AgroColors.waterBlueBg
                : AgroColors.mintBg,
            },
          ]}>
          <Text style={styles.iconEmoji}>{isTruck ? '🚛' : '🚜'}</Text>
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.nameText}>{maquina.nome}</Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: needsMaintenance
                    ? AgroColors.wheatGold
                    : AgroColors.primaryLight,
                },
              ]}
            />
            <Text style={styles.statusText}>Status: {statusPct}%</Text>
          </View>

          <Text
            style={[
              styles.maintenanceText,
              needsMaintenance
                ? styles.maintenanceWarning
                : styles.maintenanceOk,
            ]}>
            {needsMaintenance ? 'Manutenção devida' : 'Manutenção em dia'}
          </Text>
        </View>

        <Text style={styles.chevron}>›</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 20,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: AgroColors.textSecondary,
  },
  maintenanceText: {
    fontSize: 11,
    marginTop: 1,
  },
  maintenanceOk: {
    color: AgroColors.textMuted,
    fontWeight: '500',
  },
  maintenanceWarning: {
    color: AgroColors.warning,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 20,
    color: AgroColors.textPlaceholder,
    fontWeight: '600',
  },
});
