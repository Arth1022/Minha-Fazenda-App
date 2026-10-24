import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MilkAmount } from '@/components/ui/MilkAmount';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { AnimalComFase } from '@/dtos';
import { formatMedida } from '@/utils/formatters';

export interface ResumoAnimalCardProps {
  animal: AnimalComFase;
}

/**
 * Card de métricas do animal selecionado, abaixo da lista (Tela 2 do Figma):
 * peso, produção de leite, crias e ração concentrado.
 */
export function ResumoAnimalCard({ animal }: ResumoAnimalCardProps) {
  return (
    <Card padding="three">
      <View style={styles.list}>
        <ResumoLinha label="Peso">
          <Text style={styles.value}>{formatMedida(animal.pesoKg, 'kg', 0)}</Text>
        </ResumoLinha>
        <ResumoLinha label="Produção de Leite">
          <MilkAmount liters={animal.producaoLeiteL} />
        </ResumoLinha>
        <ResumoLinha label="Crias">
          <Text style={styles.value}>{animal.crias}</Text>
        </ResumoLinha>
        <ResumoLinha label="Ração Concentrado">
          <Text style={styles.value}>
            {formatMedida(animal.racaoKgDia, 'kg/dia')}
          </Text>
        </ResumoLinha>
      </View>
    </Card>
  );
}

function ResumoLinha({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...Typography.body,
    color: AgroColors.textSecondary,
  },
  value: {
    ...Typography.bodyBold,
  },
});
