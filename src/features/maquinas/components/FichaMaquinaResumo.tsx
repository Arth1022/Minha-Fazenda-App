import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import type { BadgeVariant } from '@/components/ui';
import type { Maquina, UsoMaquina } from '@/dtos';
import { CONDICAO_LABEL, TIPO_MAQUINA_LABEL } from '../constants';
import type { CondicaoMaquina } from '../services/registros';
import { horaCurta } from '../services/uso';
import { MaquinaAvatar } from './MaquinaAvatar';
import { TempoDecorrido } from './TempoDecorrido';

export interface FichaMaquinaResumoProps {
  maquina: Maquina;
  usoAtual: UsoMaquina | null;
  condicao: CondicaoMaquina;
  /** Implemento: a máquina em que está engatado agora */
  engatadoEm?: string | null;
}

const VARIANTE_CONDICAO: Record<CondicaoMaquina, BadgeVariant> = {
  ok: 'neutral',
  atencao: 'warning',
  paradaPorProblema: 'danger',
  manutencao: 'warning',
  inativa: 'neutral',
};

/** Topo da Ficha Máquina: perfil (nome, tipo e marca), situação e o cronômetro em uso. */
export function FichaMaquinaResumo({ maquina, usoAtual, condicao, engatadoEm = null }: FichaMaquinaResumoProps) {
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
        {usoAtual || engatadoEm ? (
          <Badge label="Em uso" variant="success" dot />
        ) : (
          <Badge
            label={condicao === 'ok' ? 'Parada' : CONDICAO_LABEL[condicao]}
            variant={VARIANTE_CONDICAO[condicao]}
          />
        )}
      </View>
      {engatadoEm ? <Text style={styles.operador}>Engatado em {engatadoEm}</Text> : null}

      {usoAtual ? (
        <Card variant="mint" padding="three">
          <View style={styles.cronometro}>
            <Text style={styles.cronometroLabel}>Em uso há</Text>
            <TempoDecorrido desde={usoAtual.inicio} style={styles.cronometroValor} />
          </View>
          {usoAtual.operador ? (
            <Text style={styles.operador}>
              Em uso por {usoAtual.operador} desde {horaCurta(usoAtual.inicio)}
            </Text>
          ) : null}
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
  operador: {
    ...Typography.caption,
    color: AgroColors.primaryDark,
  },
});
