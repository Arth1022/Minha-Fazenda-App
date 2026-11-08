import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card } from '@/components/ui';
import { AgroColors, Spacing, Typography } from '@/constants/theme';
import { formatNumero } from '@/utils/formatters';
import { useUsoAtual } from '../hooks/useUsoAtual';
import { TempoDecorrido } from './TempoDecorrido';

/**
 * "Seu uso agora" no Início: a máquina em uso por quem está com o celular, com
 * tempo e KM. Some quando não há uso aberto. Toque abre a tela Em uso.
 */
export function CardUsoAtual() {
  const router = useRouter();
  const atual = useUsoAtual();
  if (!atual) return null;

  const { maquina, km, pausaDesde } = atual;
  return (
    <Card variant="mint" padding="three" onPress={() => router.push('/maquina/em-uso')}>
      <View style={styles.linha}>
        <View style={styles.textos}>
          <Text style={styles.rotulo}>Seu uso agora</Text>
          <Text style={styles.nome} numberOfLines={1}>
            {maquina.nome}
          </Text>
          <View style={styles.linha}>
            <TempoDecorrido desde={atual.uso.inicio} style={styles.valor} />
            {km !== null ? <Text style={styles.valor}> · {formatNumero(km, 1)} km</Text> : null}
          </View>
        </View>
        <Badge label={pausaDesde ? 'Em pausa' : 'Abrir'} variant={pausaDesde ? 'warning' : 'success'} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textos: {
    flex: 1,
    gap: Spacing.half,
  },
  rotulo: {
    ...Typography.captionBold,
    color: AgroColors.primaryDark,
  },
  nome: {
    ...Typography.cardTitle,
  },
  valor: {
    ...Typography.bodyBold,
    color: AgroColors.primary,
  },
});
