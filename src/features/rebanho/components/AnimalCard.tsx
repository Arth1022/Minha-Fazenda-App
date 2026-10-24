import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { AgroColors, Spacing } from '@/constants/theme';
import type { Animal } from '@/database';
import { FASE_LABEL, type Fase } from '../services/fase';

export interface AnimalCardProps {
  animal: Animal;
  fase: Fase;
  /** No máximo um alerta (ex.: "Em carência até 12/10") */
  alerta?: string | null;
  selected?: boolean;
  onPress: () => void;
}

/**
 * Cartão enxuto da lista do rebanho: brinco ou nome, fase e no máximo 1 alerta.
 */
export function AnimalCard({
  animal,
  fase,
  alerta,
  selected = false,
  onPress,
}: AnimalCardProps) {
  const titulo = animal.nome ? `${animal.nome} · ${animal.brinco}` : animal.brinco;

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
            {titulo}
          </Text>
          <View style={styles.tagsRow}>
            <Badge label={FASE_LABEL[fase]} variant="success" />
            {alerta ? <Badge label={alerta} icon="⚠️" variant="warning" /> : null}
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
    gap: 6,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: AgroColors.textPrimary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
