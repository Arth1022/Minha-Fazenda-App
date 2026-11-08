import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { MaquinaComUso } from '@/dtos';
import { LinhaDado } from './LinhaDado';

export interface ResumoFrotaCardProps {
  maquinas: MaquinaComUso[];
}

/** Números da frota abaixo da lista: total, em uso, paradas e em manutenção. */
export function ResumoFrotaCard({ maquinas }: ResumoFrotaCardProps) {
  const emUso = maquinas.filter((m) => m.usoAtual).length;
  const manutencao = maquinas.filter((m) => m.status === 'manutencao').length;

  return (
    <Card padding="three">
      <View style={styles.lista}>
        <LinhaDado label="Máquinas cadastradas">{maquinas.length}</LinhaDado>
        <LinhaDado label="Em uso agora">{emUso}</LinhaDado>
        <LinhaDado label="Paradas">{maquinas.length - emUso}</LinhaDado>
        {manutencao > 0 ? <LinhaDado label="Em manutenção">{manutencao}</LinhaDado> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: Spacing.md,
  },
});
