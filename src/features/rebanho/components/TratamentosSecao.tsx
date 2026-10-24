import React, { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { TratamentoAtivo } from '@/dtos';
import { TratamentoAtivoCard } from './TratamentoAtivoCard';

export interface TratamentosSecaoProps {
  ativos: TratamentoAtivo[];
}

/**
 * Seção "Tratamentos" da ficha: título com a contagem e um bloco por
 * tratamento em andamento, separados por uma linha divisória.
 */
export function TratamentosSecao({ ativos }: TratamentosSecaoProps) {
  const contagem = ativos.length === 1 ? '1 em andamento' : `${ativos.length} em andamento`;

  return (
    <View style={styles.secao}>
      <SectionHeader
        title="Tratamentos"
        rightElement={ativos.length > 0 ? <Text style={styles.contagem}>{contagem}</Text> : undefined}
      />

      {ativos.length === 0 ? (
        <Text style={styles.vazio}>Nenhum tratamento em andamento.</Text>
      ) : (
        ativos.map((ativo, index) => (
          <Fragment key={ativo.tratamento.id}>
            {index > 0 ? <View style={styles.divisor} /> : null}
            <TratamentoAtivoCard ativo={ativo} />
          </Fragment>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    gap: Spacing.md,
  },
  contagem: {
    ...Typography.captionBold,
    color: AgroColors.warning,
  },
  divisor: {
    height: 1,
    backgroundColor: AgroColors.borderStrong,
    marginVertical: Spacing.sm,
  },
  vazio: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
});
