import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { DateField } from '@/components/forms';
import { Spacing } from '@/constants/theme';
import type { Tratamento } from '@/dtos';
import { alterarFimDoTratamento } from '../../data/tratamentos';

export interface PeriodoDoTratamentoProps {
  tratamento: Tratamento;
}

/**
 * Início (só leitura) e Fim do tratamento. Tocar no Fim abre o calendário para
 * estender ou encerrar antes; sem fim (uso contínuo) aparece "Contínuo".
 */
export function PeriodoDoTratamento({ tratamento }: PeriodoDoTratamentoProps) {
  const alterarFim = async (dataFim: Date) => {
    try {
      await alterarFimDoTratamento(tratamento, dataFim);
    } catch (error) {
      Alert.alert(
        'Não foi possível alterar o fim',
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  return (
    <View style={styles.linha}>
      <View style={styles.coluna}>
        <DateField label="Início" value={tratamento.dataInicio} onChange={() => {}} disabled />
      </View>
      <View style={styles.coluna}>
        <DateField
          label="Fim"
          value={tratamento.dataFim}
          placeholder="Contínuo"
          minimumDate={tratamento.dataInicio}
          onChange={alterarFim}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  coluna: {
    flex: 1,
  },
});
