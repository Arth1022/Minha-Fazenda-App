import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import {
  EmptyState,
  Header,
  ScreenContainer,
  SectionHeader,
  StatActionCard,
} from '@/components/ui';
import { APP_NAME } from '@/constants/app';
import { AgroColors, Spacing } from '@/constants/theme';
import { MapaBase } from './components/MapaBase';

function CalcularAreaIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke={AgroColors.primary}
        strokeWidth={2}
        strokeDasharray="3 3"
      />
      <Path
        d="M8 14L12 10L16 14"
        stroke={AgroColors.primary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CercasIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Line x1="8" y1="3" x2="8" y2="21" stroke={AgroColors.primary} strokeWidth={2} strokeLinecap="round" />
      <Line x1="16" y1="3" x2="16" y2="21" stroke={AgroColors.primary} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="8" x2="21" y2="8" stroke={AgroColors.primary} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="16" x2="21" y2="16" stroke={AgroColors.primary} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function SementesIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 7C7 5.34315 8.34315 4 10 4H14C15.6569 4 17 5.34315 17 7L19 18C19 19.6569 17.6569 21 16 21H8C6.34315 21 5 19.6569 5 18L7 7Z"
        stroke={AgroColors.primary}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="14" r="2" fill={AgroColors.primary} />
    </Svg>
  );
}

export default function MapaScreen() {
  return (
    <ScreenContainer
      header={<Header title={APP_NAME} showMenu showNotification />}>
      <SectionHeader title="Mapeamento & Áreas" size="lg" />

      <MapaBase nomeFazenda="Fazenda Recanto Verde" totalHectares={0} />

      <EmptyState message="Nenhum talhão cadastrado." />

      <View style={styles.quickCardsRow}>
        <StatActionCard
          icon={<CalcularAreaIcon />}
          title="Calcular Área"
          subtitle="Medir talhão"
        />
        <StatActionCard
          icon={<CercasIcon />}
          title="Cercas"
          subtitle="3,5 km planejados"
        />
        <StatActionCard
          icon={<SementesIcon />}
          title="Kg Sementes"
          subtitle="820 kg necessários"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  quickCardsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
