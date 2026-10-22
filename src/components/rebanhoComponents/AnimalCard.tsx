import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { AgroColors, Spacing } from '@/constants/theme';
import Animal from '@/entities/Animal';

export interface AnimalCardProps {
  animal: Animal;
  selected?: boolean;
  onPress: () => void;
}

/**
 * Cartão de animal na lista de "Gerenciamento Rebanho" (Tela 2 do Figma).
 * Exibe avatar circular, título/brinco, raça, peso e produção de leite em azul,
 * destacando com borda verde quando selecionado.
 */
export function AnimalCard({
  animal,
  selected = false,
  onPress,
}: AnimalCardProps) {
  // Sem nome informado, o cadastro já grava "Brinco #xxx" como nome
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
          <Text style={styles.titleText}>{displayTitle}</Text>
          <Text style={styles.breedText}>
            {animal.raca || 'Holandesa'}
          </Text>

          <View style={styles.metricsInline}>
            <View style={styles.metricBadge}>
              <Text style={styles.scaleIcon}>⚖</Text>
              <Text style={styles.weightText}>
                {animal.pesoKg ?? 0} kg
              </Text>
            </View>

            <View style={styles.metricBadge}>
              <Text style={styles.dropIcon}>💧</Text>
              <Text style={styles.milkText}>
                {(animal.producaoLeiteL ?? 0).toFixed(1)} L
              </Text>
            </View>
          </View>
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
    gap: 2,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  breedText: {
    fontSize: 12,
    fontWeight: '400',
    color: AgroColors.textMuted,
  },
  metricsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: 3,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scaleIcon: {
    fontSize: 11,
    color: AgroColors.textMuted,
  },
  weightText: {
    fontSize: 12,
    fontWeight: '600',
    color: AgroColors.textSecondary,
  },
  dropIcon: {
    fontSize: 11,
  },
  milkText: {
    fontSize: 12,
    fontWeight: '700',
    color: AgroColors.waterBlue,
  },
});
