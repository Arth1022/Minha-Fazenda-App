import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { MilkAmount } from '@/components/ui/MilkAmount';
import { AgroColors, IconSize, Spacing, Typography } from '@/constants/theme';
import type { AnimalComFase } from '@/dtos';
import { formatMedida } from '@/utils/formatters';
import { AnimalAvatar } from './AnimalAvatar';

export interface AnimalCardProps {
  animal: AnimalComFase;
  onPress: () => void;
}

/**
 * Cartão de animal na lista de "Gerenciamento Rebanho" (Tela 2 do Figma).
 * Exibe avatar circular, título/brinco, raça, peso e produção de leite.
 */
export function AnimalCard({ animal, onPress }: AnimalCardProps) {
  const displayTitle = animal.nome || `Brinco ${animal.brinco}`;

  return (
    <Card padding="md" onPress={onPress}>
      <View style={styles.row}>
        <AnimalAvatar />

        <View style={styles.infoCol}>
          <Text style={styles.titleText} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={styles.breedText}>
            {animal.raca || 'Raça não informada'}
          </Text>

          <View style={styles.metricsInline}>
            <View style={styles.metricBadge}>
              <AppIcon name="weight" size={IconSize.sm} color={AgroColors.textSecondary} />
              <Text style={styles.weightText}>
                {formatMedida(animal.pesoKg, 'kg', 0)}
              </Text>
            </View>

            <MilkAmount liters={animal.producaoLeiteL} variant="plain" />
          </View>

          {animal.alerta ? (
            <View style={styles.metricBadge}>
              <AppIcon name="alert" size={IconSize.sm} color={AgroColors.warning} />
              <Text style={styles.alertText}>{animal.alerta}</Text>
            </View>
          ) : null}
        </View>
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
  infoCol: {
    flex: 1,
    gap: Spacing.half,
  },
  titleText: {
    ...Typography.bodyBold,
  },
  breedText: {
    ...Typography.caption,
    fontWeight: '400',
  },
  metricsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.half,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  weightText: {
    ...Typography.captionBold,
    color: AgroColors.textSecondary,
  },
  alertText: {
    ...Typography.micro,
    color: AgroColors.warning,
  },
});
