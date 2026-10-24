import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MilkAmount } from '@/components/ui/MilkAmount';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { formatMedida } from '@/utils/formatters';
import type { AnimalComFase } from '../hooks/useRebanho';

export interface AnimalCardProps {
  animal: AnimalComFase;
  selected?: boolean;
  onPress: () => void;
}

/**
 * Cartão de animal na lista de "Gerenciamento Rebanho" (Tela 2 do Figma).
 * Exibe avatar circular, título/brinco, raça, peso e produção de leite,
 * destacando com borda verde quando selecionado.
 */
export function AnimalCard({
  animal,
  selected = false,
  onPress,
}: AnimalCardProps) {
  const displayTitle = animal.nome || `Brinco ${animal.brinco}`;

  return (
    <Card
      variant={selected ? 'selected' : 'default'}
      padding="md"
      onPress={onPress}>
      <View style={styles.row}>
        <View
          style={[
            styles.avatarCircle,
            selected && styles.avatarCircleSelected,
          ]}>
          <Text style={styles.avatarEmoji}>🐮</Text>
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.titleText} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={styles.breedText}>
            {animal.raca || 'Raça não informada'}
          </Text>

          <View style={styles.metricsInline}>
            <View style={styles.metricBadge}>
              <Text style={styles.scaleIcon}>⚖</Text>
              <Text style={styles.weightText}>
                {formatMedida(animal.pesoKg, 'kg', 0)}
              </Text>
            </View>

            <MilkAmount liters={animal.producaoLeiteL} />
          </View>

          {animal.alerta ? (
            <Text style={styles.alertText}>⚠ {animal.alerta}</Text>
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
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleSelected: {
    backgroundColor: '#DCFCE7',
  },
  avatarEmoji: {
    fontSize: 22,
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
  scaleIcon: {
    ...Typography.micro,
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
