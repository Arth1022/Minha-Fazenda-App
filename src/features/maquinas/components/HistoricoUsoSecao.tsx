import React, { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, SectionHeader } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { UsoMaquina } from '@/dtos';
import { formatDataBR } from '@/utils/date';
import { duracaoDoUso, formatarDuracao } from '../services/uso';

const hora = (data: Date) =>
  `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;

export interface HistoricoUsoSecaoProps {
  /** Usos do mais recente para o mais antigo (o aberto aparece como "em uso") */
  usos: UsoMaquina[];
}

/** Auditoria: últimos usos com data, horário de ligar/desligar e duração. */
export function HistoricoUsoSecao({ usos }: HistoricoUsoSecaoProps) {
  return (
    <View style={styles.secao}>
      <SectionHeader title="Últimos usos" />
      {usos.length === 0 ? (
        <Text style={styles.vazio}>Nenhum uso registrado. Toque em ligar para começar.</Text>
      ) : (
        <Card padding="three">
          {usos.map((uso, index) => (
            <Fragment key={uso.id}>
              {index > 0 ? <View style={styles.divisor} /> : null}
              <View style={styles.linha}>
                <View>
                  <Text style={styles.data}>{formatDataBR(uso.inicio)}</Text>
                  <Text style={styles.horario}>
                    {hora(uso.inicio)} → {uso.fim ? hora(uso.fim) : 'agora'}
                  </Text>
                </View>
                {uso.fim ? (
                  <Text style={styles.duracao}>{formatarDuracao(duracaoDoUso(uso, uso.fim))}</Text>
                ) : (
                  <Text style={[styles.duracao, styles.emUso]}>Em uso</Text>
                )}
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
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  data: {
    ...Typography.bodyBold,
  },
  horario: {
    ...Typography.caption,
  },
  duracao: {
    ...Typography.bodyBold,
  },
  emUso: {
    color: AgroColors.primary,
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
