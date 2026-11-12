import React, { Fragment } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, SectionHeader } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { OcorrenciaMaquina } from '@/dtos';
import { formatDataBR } from '@/utils/date';
import { CATEGORIA_PROBLEMA_LABEL } from '../constants';
import { resolverProblema } from '../data/ocorrencias';
import { horaCurta } from '../services/uso';

export interface ProblemasSecaoProps {
  /** Problemas em aberto, do mais recente para o mais antigo */
  problemas: OcorrenciaMaquina[];
}

function confirmarResolvido(problema: OcorrenciaMaquina) {
  Alert.alert(
    'Problema resolvido?',
    `${CATEGORIA_PROBLEMA_LABEL[problema.categoria]}: a máquina volta a ficar liberada e a tarefa do conserto é concluída. O registro do problema fica no histórico.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Resolvido', onPress: () => resolverProblema(problema.id).catch(() => undefined) },
    ]
  );
}

/** Problemas em aberto: mudam a situação da máquina até alguém marcar como resolvido. */
export function ProblemasSecao({ problemas }: ProblemasSecaoProps) {
  if (problemas.length === 0) return null;
  return (
    <View style={styles.secao}>
      <SectionHeader title="Problemas em aberto" />
      <Card variant="warning" padding="three">
        {problemas.map((p, index) => (
          <Fragment key={p.id}>
            {index > 0 ? <View style={styles.divisor} /> : null}
            <View style={styles.item}>
              <View style={styles.linha}>
                <Text style={styles.titulo}>{CATEGORIA_PROBLEMA_LABEL[p.categoria]}</Text>
                <Badge
                  label={p.podeUsar ? 'Dá para usar' : 'Não dá para usar'}
                  variant={p.podeUsar ? 'warning' : 'danger'}
                />
              </View>
              {p.descricao ? <Text style={styles.texto}>{p.descricao}</Text> : null}
              <Text style={styles.quando}>
                {[p.operador, `${formatDataBR(p.registradoEm)} ${horaCurta(p.registradoEm)}`].filter(Boolean).join(' · ')}
                {p.fotoUri ? ' · com foto' : ''}
              </Text>
              <Button label="Marcar como resolvido" variant="ghost" size="sm" onPress={() => confirmarResolvido(p)} />
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
    gap: Spacing.xs,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titulo: {
    ...Typography.bodyBold,
  },
  texto: {
    ...Typography.body,
  },
  quando: {
    ...Typography.caption,
  },
  divisor: {
    height: 1,
    backgroundColor: AgroColors.warningBorder,
    marginVertical: Spacing.sm,
  },
});
