import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { Maquina, UsoMaquina } from '@/dtos';
import { STATUS_MAQUINA_LABEL, TIPO_MAQUINA_LABEL } from '../constants';
import { MaquinaAvatar } from './MaquinaAvatar';
import { TempoDecorrido } from './TempoDecorrido';

export interface FichaMaquinaResumoProps {
  maquina: Maquina;
  usoAtual: UsoMaquina | null;
}

/** Topo da Ficha Máquina: perfil (nome, tipo e marca), situação e o cronômetro em uso. */
export function FichaMaquinaResumo({ maquina, usoAtual }: FichaMaquinaResumoProps) {
  const subtitulo = [TIPO_MAQUINA_LABEL[maquina.tipo], maquina.marca, maquina.modelo]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.container}>
      <View style={styles.perfil}>
        <MaquinaAvatar tipo={maquina.tipo} marca={maquina.marca} size={52} variant="mint" />
        <View style={styles.textos}>
          <Text style={styles.titulo} numberOfLines={1}>
            {maquina.nome}
          </Text>
          <Text style={styles.subtitulo} numberOfLines={1}>
            {subtitulo}
          </Text>
        </View>
        {usoAtual ? (
          <Badge label="Em uso" variant="success" dot />
        ) : (
          <Badge
            label={maquina.status === 'ativa' ? 'Parada' : STATUS_MAQUINA_LABEL[maquina.status]}
            variant={maquina.status === 'manutencao' ? 'warning' : 'neutral'}
          />
        )}
      </View>

      {usoAtual ? (
        <Card variant="mint" padding="three">
          <View style={styles.cronometro}>
            <Text style={styles.cronometroLabel}>Em uso há</Text>
            <TempoDecorrido desde={usoAtual.inicio} style={styles.cronometroValor} />
          </View>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  perfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  textos: {
    flex: 1,
    gap: Spacing.half,
  },
  titulo: {
    ...Typography.screenTitle,
  },
  subtitulo: {
    ...Typography.caption,
  },
  cronometro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cronometroLabel: {
    ...Typography.bodyMedium,
    color: AgroColors.primaryDark,
  },
  cronometroValor: {
    ...Typography.metricLarge,
    color: AgroColors.primaryDark,
  },
});
