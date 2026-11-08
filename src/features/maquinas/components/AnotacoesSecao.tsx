import React, { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, SectionHeader } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { AnotacaoMaquina } from '@/dtos';
import { formatDataBR } from '@/utils/date';

export interface AnotacoesSecaoProps {
  anotacoes: AnotacaoMaquina[];
  onAdicionar: () => void;
}

/** Anotações livres da máquina (revisões, defeitos, observações), da mais recente. */
export function AnotacoesSecao({ anotacoes, onAdicionar }: AnotacoesSecaoProps) {
  return (
    <View style={styles.secao}>
      <SectionHeader
        title="Anotações"
        rightElement={
          <Pressable onPress={onAdicionar} hitSlop={8} accessibilityRole="button">
            <Text style={styles.adicionar}>+ Adicionar</Text>
          </Pressable>
        }
      />
      {anotacoes.length === 0 ? (
        <Text style={styles.vazio}>Nenhuma anotação.</Text>
      ) : (
        <Card padding="three">
          {anotacoes.map((anotacao, index) => (
            <Fragment key={anotacao.id}>
              {index > 0 ? <View style={styles.divisor} /> : null}
              <View style={styles.item}>
                <Text style={styles.data}>{formatDataBR(anotacao.createdAt)}</Text>
                <Text style={styles.texto}>{anotacao.texto}</Text>
              </View>
            </Fragment>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    gap: Spacing.md,
  },
  adicionar: {
    ...Typography.captionBold,
    color: AgroColors.primary,
  },
  item: {
    gap: Spacing.half,
  },
  data: {
    ...Typography.micro,
  },
  texto: {
    ...Typography.body,
  },
  divisor: {
    height: 1,
    backgroundColor: AgroColors.divider,
  },
  vazio: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
});
