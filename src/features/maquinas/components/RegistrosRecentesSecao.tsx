import React, { Fragment, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, SectionHeader } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { useLiveQuery } from '@/database';
import { formatDataBR } from '@/utils/date';
import { formatNumero } from '@/utils/formatters';
import { ORIGEM_ABASTECIMENTO_LABEL } from '../constants';
import { abastecimentosDaMaquina } from '../data/abastecimentos';
import { leiturasDaMaquina } from '../data/horimetro';
import { horaCurta } from '../services/uso';

const LIMITE = 6;

interface Linha {
  id: string;
  em: Date;
  titulo: string;
  detalhe: string;
}

export interface RegistrosRecentesSecaoProps {
  maquinaId: string;
}

/** Abastecimentos e leituras de horímetro recentes, juntos e na ordem do tempo. */
export function RegistrosRecentesSecao({ maquinaId }: RegistrosRecentesSecaoProps) {
  const { data: abastecimentos } = useLiveQuery(abastecimentosDaMaquina(maquinaId, LIMITE), [maquinaId]);
  const { data: leituras } = useLiveQuery(leiturasDaMaquina(maquinaId, LIMITE), [maquinaId]);

  const linhas = useMemo<Linha[]>(() => {
    const deAbastecimento: Linha[] = abastecimentos.map((a) => ({
      id: a.id,
      em: a.abastecidoEm,
      titulo: `Abasteceu ${formatNumero(a.litros)} L${a.tanqueCheio ? ' (cheio)' : ''}`,
      detalhe: [
        ORIGEM_ABASTECIMENTO_LABEL[a.origem],
        a.horimetroH !== null ? `horímetro ${formatNumero(a.horimetroH)} h` : null,
        a.operador,
        a.fotoUri ? 'com foto' : null,
      ]
        .filter(Boolean)
        .join(' · '),
    }));
    // A leitura feita no abastecimento já aparece na linha dele
    const avulsas: Linha[] = leituras
      .filter((l) => l.origem === 'avulsa')
      .map((l) => ({
        id: l.id,
        em: l.lidoEm,
        titulo: `Horímetro ${formatNumero(l.valorH)} h`,
        detalhe: [
          l.estimadoH !== null ? `esperado ${formatNumero(l.estimadoH, 0)} h` : null,
          l.operador,
          l.fotoUri ? 'com foto' : null,
        ]
          .filter(Boolean)
          .join(' · '),
      }));
    return [...deAbastecimento, ...avulsas].sort((a, b) => b.em.getTime() - a.em.getTime()).slice(0, LIMITE);
  }, [abastecimentos, leituras]);

  if (linhas.length === 0) return null;
  return (
    <View style={styles.secao}>
      <SectionHeader title="Abastecimentos e horímetro" />
      <Card padding="three">
        {linhas.map((l, index) => (
          <Fragment key={l.id}>
            {index > 0 ? <View style={styles.divisor} /> : null}
            <View style={styles.item}>
              <View style={styles.linha}>
                <Text style={styles.titulo}>{l.titulo}</Text>
                <Text style={styles.quando}>
                  {formatDataBR(l.em)} {horaCurta(l.em)}
                </Text>
              </View>
              {l.detalhe ? <Text style={styles.detalhe}>{l.detalhe}</Text> : null}
            </View>
          </Fragment>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: {
    gap: Spacing.md,
  },
  item: {
    gap: Spacing.half,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  titulo: {
    ...Typography.bodyBold,
    flexShrink: 1,
  },
  quando: {
    ...Typography.caption,
  },
  detalhe: {
    ...Typography.caption,
    color: AgroColors.textSecondary,
  },
  divisor: {
    height: 1,
    backgroundColor: AgroColors.divider,
    marginVertical: Spacing.sm,
  },
});
