import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MilkAmount } from '@/components/ui/MilkAmount';
import { Spacing } from '@/constants/theme';
import type { AnimalComFase } from '@/dtos';
import { formatMedida } from '@/utils/formatters';
import { ResumoLinha } from './ResumoLinha';

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
        <ResumoLinha label="Peso">{formatMedida(animal.pesoKg, 'kg', 0)}</ResumoLinha>
        <ResumoLinha label="Produção de Leite">
          <MilkAmount liters={animal.producaoLeiteL} />
        </ResumoLinha>
        <ResumoLinha label="Crias">{animal.crias}</ResumoLinha>
        <ResumoLinha label="Ração Concentrado">
          {formatMedida(animal.racaoKgDia, 'kg/dia')}
        </ResumoLinha>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
});
