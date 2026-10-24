import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  EmptyState,
  Header,
  ScreenContainer,
  SectionHeader,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';

const SECOES = [
  { titulo: 'Insumos', vazio: 'Nenhum insumo cadastrado.' },
  { titulo: 'Medicamentos', vazio: 'Nenhum medicamento cadastrado.' },
  { titulo: 'Peças Máquinas', vazio: 'Nenhuma peça cadastrada.' },
];

/**
 * Tela de Estoque da Fazenda (somente front, sem persistência local).
 */
export default function EstoqueScreen() {
  return (
    <ScreenContainer header={<Header title="Estoque Fazenda" showBack />}>
      {SECOES.map((secao) => (
        <View key={secao.titulo} style={styles.sectionBlock}>
          <SectionHeader title={secao.titulo} />
          <EmptyState message={secao.vazio} />
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    gap: Spacing.sm,
  },
});
