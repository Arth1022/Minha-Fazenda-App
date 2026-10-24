import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  EmptyState,
  Header,
  ScreenContainer,
  SectionHeader,
  StatActionCard,
} from '@/components/ui';
import { APP_NAME } from '@/constants/app';
import { AgroColors, Radius, Shadows, Spacing } from '@/constants/theme';

const SEM_DADOS = '—';

/**
 * Tela de Mapeamento & Áreas (somente front, sem persistência local).
 */
export default function MapaScreen() {
  return (
    <ScreenContainer
      header={<Header title={APP_NAME} showMenu showNotification />}>
      <SectionHeader title="Mapeamento & Áreas" size="lg" />

      {/* Área reservada para o mapa satélite dos talhões */}
      <View style={styles.mapCard}>
        <View style={styles.terrainBandTop} />
        <View style={styles.terrainBandBottom} />

        <View style={styles.mapControlsCol}>
          <View style={styles.mapControlBtn}>
            <Text style={styles.mapControlIcon}>❖</Text>
          </View>
          <View style={styles.mapControlBtn}>
            <Text style={styles.mapControlIcon}>⊕</Text>
          </View>
        </View>

        <Text style={styles.mapEmptyText}>Nenhuma área mapeada</Text>
      </View>

      <EmptyState message="Nenhum talhão cadastrado." />

      {/* Ferramentas de cálculo rápido (Calcular Área | Cercas | Kg Sementes) */}
      <View style={styles.quickCardsRow}>
        <StatActionCard
          icon={<View style={styles.areaDashedIcon} />}
          title="Calcular Área"
          subtitle={SEM_DADOS}
        />
        <StatActionCard
          icon={<Text style={styles.greenIconText}>#</Text>}
          title="Cercas"
          subtitle={SEM_DADOS}
        />
        <StatActionCard
          icon={<Text style={styles.greenIconText}>🌱</Text>}
          title="Kg Sementes"
          subtitle={SEM_DADOS}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    width: '100%',
    height: 190,
    backgroundColor: AgroColors.mapTerrainBg,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    position: 'relative',
    ...Shadows.sm,
  },
  terrainBandTop: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 220,
    height: 110,
    borderRadius: 60,
    backgroundColor: 'rgba(110, 145, 85, 0.35)',
    transform: [{ rotate: '-12deg' }],
  },
  terrainBandBottom: {
    position: 'absolute',
    bottom: -35,
    left: -20,
    width: 260,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(55, 82, 46, 0.45)',
    transform: [{ rotate: '8deg' }],
  },
  mapControlsCol: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    gap: 6,
  },
  mapControlBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  mapControlIcon: {
    fontSize: 14,
    color: AgroColors.textPrimary,
    fontWeight: '700',
  },
  mapEmptyText: {
    color: AgroColors.textInverse,
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  quickCardsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  areaDashedIcon: {
    width: 16,
    height: 16,
    borderWidth: 1.8,
    borderStyle: 'dashed',
    borderColor: AgroColors.primary,
    borderRadius: 3,
  },
  greenIconText: {
    fontSize: 16,
    fontWeight: '800',
    color: AgroColors.primary,
  },
});
