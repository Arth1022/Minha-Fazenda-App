import React, { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card, SectionHeader } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { UsoMaquina } from '@/dtos';
import { formatDataBR } from '@/utils/date';
import { formatNumero } from '@/utils/formatters';
import { ATIVIDADE_LABEL } from '../constants';
import { marcasDoUso } from '../services/marcas';
import { duracaoDoUso, formatarDuracao, horaCurta } from '../services/uso';

export interface HistoricoUsoSecaoProps {
  /** Usos do mais recente para o mais antigo (o aberto aparece como "em uso") */
  usos: UsoMaquina[];
  /** Texto quando não há uso (o implemento tem um próprio: o uso vem do trator) */
  vazio?: string;
}

/** Detalhe de uma linha: operador, atividade, KM e o talhão onde mais trabalhou. */
function detalheDoUso(uso: UsoMaquina): string {
  return [
    uso.operador,
    uso.atividade ? ATIVIDADE_LABEL[uso.atividade] : null,
    uso.kmTotal !== null ? `${formatNumero(uso.kmTotal, 1)} km` : null,
    uso.areaEstimadaHa !== null ? `${formatNumero(uso.areaEstimadaHa, 1)} ha` : null,
    uso.talhoes?.[0]?.nome,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Auditoria: últimos usos com data, horário, duração, quem operou, KM e talhão,
 * e as marcas que o dono precisa ver ("manual", "encerrada pelo app", "sem sinal").
 */
export function HistoricoUsoSecao({ usos, vazio = 'Nenhum uso registrado. Toque em ligar para começar.' }: HistoricoUsoSecaoProps) {
  return (
    <View style={styles.secao}>
      <SectionHeader title="Últimos usos" />
      {usos.length === 0 ? (
        <Text style={styles.vazio}>{vazio}</Text>
      ) : (
        <Card padding="three">
          {usos.map((uso, index) => {
            const detalhe = detalheDoUso(uso);
            const marcas = marcasDoUso(uso);
            return (
              <Fragment key={uso.id}>
                {index > 0 ? <View style={styles.divisor} /> : null}
                <View style={styles.item}>
                  <View style={styles.linha}>
                    <View>
                      <Text style={styles.data}>{formatDataBR(uso.inicio)}</Text>
                      <Text style={styles.horario}>
                        {horaCurta(uso.inicio)} → {uso.fim ? horaCurta(uso.fim) : 'agora'}
                      </Text>
                    </View>
                    {uso.fim ? (
                      <Text style={styles.duracao}>{formatarDuracao(duracaoDoUso(uso, uso.fim))}</Text>
                    ) : (
                      <Text style={[styles.duracao, styles.emUso]}>Em uso</Text>
                    )}
                  </View>
                  {detalhe ? <Text style={styles.detalhe}>{detalhe}</Text> : null}
                  {marcas.length > 0 ? (
                    <View style={styles.marcas}>
                      {marcas.map((m) => (
                        <Badge key={m.texto} label={m.texto} variant={m.tom === 'atencao' ? 'warning' : 'neutral'} />
                      ))}
                    </View>
                  ) : null}
                </View>
              </Fragment>
            );
          })}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    gap: Spacing.md,
  },
  item: {
    gap: Spacing.xs,
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
  detalhe: {
    ...Typography.caption,
    color: AgroColors.textSecondary,
  },
  marcas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  divisor: {
    height: 1,
    backgroundColor: AgroColors.divider,
    marginVertical: Spacing.sm,
  },
  vazio: {
    ...Typography.caption,
    color: AgroColors.textMuted,
  },
});
